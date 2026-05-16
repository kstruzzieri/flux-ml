package alerts

import (
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"time"

	"github.com/kstruzzieri/flux-ml/internal/metrics"
)

const (
	flatThreshold       = 0.01
	minTrendPoints      = 4
	alertMetricWindow   = 200
	divergenceRatio     = 2.0
	divergenceMinSpread = 0.1
)

type Trend string

const (
	TrendUp           Trend = "up"
	TrendDown         Trend = "down"
	TrendFlat         Trend = "flat"
	TrendInsufficient Trend = "insufficient"
)

// Detector evaluates one alert pattern against an experiment snapshot.
type Detector interface {
	Type() string
	Pattern() string
	Detect(Snapshot) DetectionResult
}

// Engine evaluates all configured detectors and persists non-clear results.
type Engine struct {
	metrics   *metrics.Store
	store     *Store
	detectors []Detector
}

// NewEngine creates the default reward-hack detection engine.
func NewEngine(metricsStore *metrics.Store, alertStore *Store) *Engine {
	return &Engine{
		metrics: metricsStore,
		store:   alertStore,
		detectors: []Detector{
			lengthGamingDetector{},
			sycophancyDetector{},
			klDriftDetector{},
			rewardCollapseDetector{},
		},
	}
}

// MetricPoint is a normalized metric sample used by detectors.
type MetricPoint struct {
	Step  int64   `json:"step"`
	Value float64 `json:"value"`
}

// TrendStats captures the split-window trend evidence for a metric.
type TrendStats struct {
	Trend          Trend   `json:"trend"`
	PrevAvg        float64 `json:"prev_avg"`
	RecentAvg      float64 `json:"recent_avg"`
	RelativeChange float64 `json:"relative_change"`
	PointCount     int     `json:"point_count"`
	LatestStep     int64   `json:"latest_step"`
}

// RewardComponent captures the latest value for a reward signal component.
type RewardComponent struct {
	Name  string  `json:"name"`
	Value float64 `json:"value"`
	Step  int64   `json:"step"`
}

// DivergenceStats captures reward component imbalance evidence.
type DivergenceStats struct {
	Status string  `json:"status"`
	MaxAbs float64 `json:"max_abs"`
	MinAbs float64 `json:"min_abs"`
	Spread float64 `json:"spread"`
	Ratio  float64 `json:"ratio"`
}

// Snapshot is the detector input for one experiment.
type Snapshot struct {
	ExperimentID     string
	Series           map[string][]MetricPoint
	Trends           map[string]TrendStats
	RewardComponents []RewardComponent
	RewardDivergence DivergenceStats
	LatestStep       int64
	EvaluatedAtUnix  int64
}

// DetectExperiment evaluates all detectors without writing alert rows.
func (e *Engine) DetectExperiment(experimentID string) ([]DetectionResult, error) {
	if e == nil || e.metrics == nil {
		return nil, fmt.Errorf("metrics store cannot be nil")
	}
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}

	snapshot, err := e.loadSnapshot(experimentID)
	if err != nil {
		return nil, err
	}

	return e.detectSnapshot(snapshot), nil
}

// EvaluateExperiment evaluates all detectors for an experiment and persists
// non-clear results.
func (e *Engine) EvaluateExperiment(experimentID string) ([]DetectionResult, error) {
	if e == nil || e.metrics == nil {
		return nil, fmt.Errorf("metrics store cannot be nil")
	}
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}

	snapshot, err := e.loadSnapshot(experimentID)
	if err != nil {
		return nil, err
	}
	results := e.detectSnapshot(snapshot)

	for _, result := range results {
		if e.store == nil {
			continue
		}
		if result.Status == LevelClear {
			if err := e.store.ResolveOpenAlert(experimentID, result.Type, snapshot.EvaluatedAtUnix); err != nil {
				return nil, err
			}
			continue
		}
		if result.Confidence == nil {
			continue
		}
		if _, err := e.store.UpsertAlert(Alert{
			ExperimentID: experimentID,
			Type:         result.Type,
			Step:         result.Step,
			Confidence:   *result.Confidence,
			ScoreKind:    result.ScoreKind,
			Data:         result.Data,
			CreatedAt:    snapshot.EvaluatedAtUnix,
		}); err != nil {
			return nil, err
		}
	}

	return results, nil
}

func (e *Engine) detectSnapshot(snapshot Snapshot) []DetectionResult {
	results := make([]DetectionResult, 0, len(e.detectors))
	for _, detector := range e.detectors {
		result := detector.Detect(snapshot)
		results = append(results, result)
	}
	return results
}

func (e *Engine) loadSnapshot(experimentID string) (Snapshot, error) {
	metricNames := []string{"reward", "kl", "reward_variance", "policy_entropy", "response_length"}
	snapshot := Snapshot{
		ExperimentID:    experimentID,
		Series:          make(map[string][]MetricPoint, len(metricNames)),
		Trends:          make(map[string]TrendStats, len(metricNames)),
		EvaluatedAtUnix: time.Now().Unix(),
	}

	for _, name := range metricNames {
		rows, err := e.metrics.QueryRecentMetrics(experimentID, name, alertMetricWindow)
		if err != nil {
			return Snapshot{}, err
		}
		points := normalizeMetrics(rows)
		snapshot.Series[name] = points
		stats := computeTrend(points)
		snapshot.Trends[name] = stats
		if stats.LatestStep > snapshot.LatestStep {
			snapshot.LatestStep = stats.LatestStep
		}
	}

	signals, err := e.metrics.LatestRewardSignals(experimentID)
	if err != nil {
		return Snapshot{}, err
	}
	snapshot.RewardComponents = latestRewardComponents(signals)
	for _, component := range snapshot.RewardComponents {
		if component.Step > snapshot.LatestStep {
			snapshot.LatestStep = component.Step
		}
	}
	snapshot.RewardDivergence = computeRewardDivergence(snapshot.RewardComponents)

	return snapshot, nil
}

func normalizeMetrics(rows []metrics.Metric) []MetricPoint {
	points := make([]MetricPoint, 0, len(rows))
	for _, row := range rows {
		points = append(points, MetricPoint{Step: row.Step, Value: row.Value})
	}
	sort.Slice(points, func(i, j int) bool {
		return points[i].Step < points[j].Step
	})
	return points
}

func computeTrend(points []MetricPoint) TrendStats {
	stats := TrendStats{Trend: TrendInsufficient, PointCount: len(points)}
	if len(points) > 0 {
		stats.LatestStep = points[len(points)-1].Step
	}
	if len(points) < minTrendPoints {
		return stats
	}

	mid := len(points) / 2
	prevSlice := points[:mid]
	recentSlice := points[mid:]
	stats.PrevAvg = average(prevSlice)
	stats.RecentAvg = average(recentSlice)

	denom := math.Abs(stats.PrevAvg)
	if denom <= 1e-10 {
		denom = 1
	}
	stats.RelativeChange = (stats.RecentAvg - stats.PrevAvg) / denom

	if math.Abs(stats.RelativeChange) <= flatThreshold {
		stats.Trend = TrendFlat
	} else if stats.RelativeChange > 0 {
		stats.Trend = TrendUp
	} else {
		stats.Trend = TrendDown
	}
	return stats
}

func average(points []MetricPoint) float64 {
	if len(points) == 0 {
		return 0
	}
	sum := 0.0
	for _, point := range points {
		sum += point.Value
	}
	return sum / float64(len(points))
}

func latestRewardComponents(signals []metrics.RewardSignal) []RewardComponent {
	latest := map[string]RewardComponent{}
	for _, signal := range signals {
		existing, ok := latest[signal.Component]
		if !ok || signal.Step > existing.Step {
			latest[signal.Component] = RewardComponent{
				Name:  signal.Component,
				Value: signal.Value,
				Step:  signal.Step,
			}
		}
	}

	components := make([]RewardComponent, 0, len(latest))
	for _, component := range latest {
		components = append(components, component)
	}
	sort.Slice(components, func(i, j int) bool {
		return components[i].Name < components[j].Name
	})
	return components
}

func computeRewardDivergence(components []RewardComponent) DivergenceStats {
	if len(components) == 0 {
		return DivergenceStats{Status: "none"}
	}

	minAbs := math.Inf(1)
	maxAbs := 0.0
	for _, component := range components {
		value := math.Abs(component.Value)
		if value < minAbs {
			minAbs = value
		}
		if value > maxAbs {
			maxAbs = value
		}
	}

	spread := maxAbs - minAbs
	ratio := 0.0
	if minAbs > 1e-10 {
		ratio = maxAbs / minAbs
	}
	status := "healthy"
	if spread >= divergenceMinSpread && ratio > divergenceRatio {
		status = "warning"
	}

	return DivergenceStats{
		Status: status,
		MaxAbs: maxAbs,
		MinAbs: minAbs,
		Spread: spread,
		Ratio:  ratio,
	}
}

func result(alertType, pattern string, status DetectionLevel, confidence *float64, step int64, data any) DetectionResult {
	payload := ""
	if data != nil {
		if evidence, ok := data.(map[string]any); ok {
			evidence["score_kind"] = ScoreKindHeuristicV1
			evidence["score_note"] = "Heuristic score for triage, not a calibrated probability."
		}
		if encoded, err := json.Marshal(data); err == nil {
			payload = string(encoded)
		}
	}
	return DetectionResult{
		Type:       alertType,
		Pattern:    pattern,
		Status:     status,
		Confidence: confidence,
		ScoreKind:  ScoreKindHeuristicV1,
		Step:       step,
		Data:       payload,
	}
}

func clearResult(alertType, pattern string, step int64, data any) DetectionResult {
	return result(alertType, pattern, LevelClear, nil, step, data)
}

func confidence(value float64) *float64 {
	v := clamp(value, 0.01, 0.99)
	return &v
}

func confidenceFromChange(base float64, stats ...TrendStats) *float64 {
	score := base
	for _, stat := range stats {
		score += math.Min(math.Abs(stat.RelativeChange), 1.0) * 0.18
	}
	return confidence(score)
}

func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}

func trendEvidence(snapshot Snapshot, names ...string) map[string]any {
	evidence := map[string]any{
		"evaluated_at": snapshot.EvaluatedAtUnix,
	}
	for _, name := range names {
		evidence[name] = snapshot.Trends[name]
	}
	return evidence
}
