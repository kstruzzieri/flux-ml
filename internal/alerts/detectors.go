package alerts

import "math"

const (
	recentCorrelationPoints = 20
	minCorrelationDeltas    = 4
)

type lengthGamingDetector struct{}

func (lengthGamingDetector) Type() string    { return TypeLengthGaming }
func (lengthGamingDetector) Pattern() string { return PatternLengthGaming }

func (d lengthGamingDetector) Detect(snapshot Snapshot) DetectionResult {
	reward := snapshot.Trends["reward"]
	length := snapshot.Trends["response_length"]
	evidence := trendEvidence(snapshot, "reward", "response_length")
	correlation, paired, deltas := recentDeltaCorrelationByStep(
		snapshot.Series["reward"],
		snapshot.Series["response_length"],
		recentCorrelationPoints,
	)
	evidence["correlation"] = correlation
	evidence["paired_points"] = paired
	evidence["delta_points"] = deltas
	evidence["correlation_method"] = "recent_first_difference_pearson"

	if reward.Trend == TrendInsufficient || length.Trend == TrendInsufficient || deltas < minCorrelationDeltas {
		return clearResult(d.Type(), d.Pattern(), snapshot.LatestStep, evidence)
	}

	if reward.Trend == TrendUp && length.Trend == TrendUp && correlation >= 0.85 {
		return result(d.Type(), d.Pattern(), LevelDetected, confidence(correlation), snapshot.LatestStep, evidence)
	}
	if reward.Trend == TrendUp && length.Trend == TrendUp && correlation >= 0.70 {
		return result(d.Type(), d.Pattern(), LevelElevated, confidence(correlation), snapshot.LatestStep, evidence)
	}
	if reward.Trend == TrendUp && length.Trend == TrendUp && correlation >= 0.50 {
		return result(
			d.Type(),
			d.Pattern(),
			LevelMonitoring,
			confidenceFromChange(0.42, reward, length),
			snapshot.LatestStep,
			evidence,
		)
	}

	return clearResult(d.Type(), d.Pattern(), snapshot.LatestStep, evidence)
}

type sycophancyDetector struct{}

func (sycophancyDetector) Type() string    { return TypeSycophancy }
func (sycophancyDetector) Pattern() string { return PatternSycophancy }

func (d sycophancyDetector) Detect(snapshot Snapshot) DetectionResult {
	kl := snapshot.Trends["kl"]
	entropy := snapshot.Trends["policy_entropy"]
	evidence := trendEvidence(snapshot, "kl", "policy_entropy")

	if kl.Trend == TrendUp && entropy.Trend == TrendDown {
		return result(
			d.Type(),
			d.Pattern(),
			LevelElevated,
			confidenceFromChange(0.68, kl, entropy),
			snapshot.LatestStep,
			evidence,
		)
	}
	if entropy.Trend == TrendDown {
		return result(
			d.Type(),
			d.Pattern(),
			LevelMonitoring,
			confidenceFromChange(0.43, entropy),
			snapshot.LatestStep,
			evidence,
		)
	}

	return clearResult(d.Type(), d.Pattern(), snapshot.LatestStep, evidence)
}

type klDriftDetector struct{}

func (klDriftDetector) Type() string    { return TypeKLDrift }
func (klDriftDetector) Pattern() string { return PatternKLDrift }

func (d klDriftDetector) Detect(snapshot Snapshot) DetectionResult {
	kl := snapshot.Trends["kl"]
	reward := snapshot.Trends["reward"]
	evidence := trendEvidence(snapshot, "kl", "reward")
	evidence["rule"] = "reward_up_plus_kl_up_is_probable_reward_hacking"

	if kl.Trend == TrendUp && reward.Trend == TrendUp {
		return result(
			d.Type(),
			d.Pattern(),
			LevelElevated,
			confidenceFromChange(0.66, kl, reward),
			snapshot.LatestStep,
			evidence,
		)
	}
	if kl.Trend == TrendUp {
		return result(
			d.Type(),
			d.Pattern(),
			LevelMonitoring,
			confidenceFromChange(0.46, kl),
			snapshot.LatestStep,
			evidence,
		)
	}

	return clearResult(d.Type(), d.Pattern(), snapshot.LatestStep, evidence)
}

type rewardCollapseDetector struct{}

func (rewardCollapseDetector) Type() string    { return TypeRewardCollapse }
func (rewardCollapseDetector) Pattern() string { return PatternRewardCollapse }

func (d rewardCollapseDetector) Detect(snapshot Snapshot) DetectionResult {
	variance := snapshot.Trends["reward_variance"]
	evidence := trendEvidence(snapshot, "reward_variance")
	evidence["reward_components"] = snapshot.RewardComponents
	evidence["component_divergence"] = snapshot.RewardDivergence

	hasDivergence := snapshot.RewardDivergence.Status == "warning"
	if variance.Trend == TrendDown && hasDivergence {
		return result(
			d.Type(),
			d.Pattern(),
			LevelElevated,
			confidenceFromChange(0.69, variance),
			snapshot.LatestStep,
			evidence,
		)
	}
	if variance.Trend == TrendDown || hasDivergence {
		base := 0.44
		if hasDivergence {
			base = 0.50
		}
		return result(
			d.Type(),
			d.Pattern(),
			LevelMonitoring,
			confidenceFromChange(base, variance),
			snapshot.LatestStep,
			evidence,
		)
	}

	return clearResult(d.Type(), d.Pattern(), snapshot.LatestStep, evidence)
}

type pairedMetricPoint struct {
	Step  int64
	Left  float64
	Right float64
}

func recentDeltaCorrelationByStep(left, right []MetricPoint, maxPairs int) (float64, int, int) {
	rightByStep := make(map[int64]float64, len(right))
	for _, point := range right {
		rightByStep[point.Step] = point.Value
	}

	pairs := make([]pairedMetricPoint, 0, len(left))
	for _, point := range left {
		value, ok := rightByStep[point.Step]
		if !ok {
			continue
		}
		pairs = append(pairs, pairedMetricPoint{
			Step:  point.Step,
			Left:  point.Value,
			Right: value,
		})
	}

	if maxPairs > 1 && len(pairs) > maxPairs {
		pairs = pairs[len(pairs)-maxPairs:]
	}

	if len(pairs) < minCorrelationDeltas+1 {
		return 0, len(pairs), 0
	}

	xs := make([]float64, 0, len(pairs)-1)
	ys := make([]float64, 0, len(pairs)-1)
	for i := 1; i < len(pairs); i++ {
		xs = append(xs, pairs[i].Left-pairs[i-1].Left)
		ys = append(ys, pairs[i].Right-pairs[i-1].Right)
	}

	correlation := correlation(xs, ys)
	return correlation, len(pairs), len(xs)
}

func correlation(xs, ys []float64) float64 {
	if len(xs) == 0 || len(xs) != len(ys) {
		return 0
	}
	xAvg := avgFloat(xs)
	yAvg := avgFloat(ys)
	var numerator, xSquares, ySquares float64
	for i := range xs {
		xDelta := xs[i] - xAvg
		yDelta := ys[i] - yAvg
		numerator += xDelta * yDelta
		xSquares += xDelta * xDelta
		ySquares += yDelta * yDelta
	}
	denom := math.Sqrt(xSquares * ySquares)
	if denom <= 1e-10 {
		return 0
	}
	return numerator / denom
}

func avgFloat(values []float64) float64 {
	if len(values) == 0 {
		return 0
	}
	sum := 0.0
	for _, value := range values {
		sum += value
	}
	return sum / float64(len(values))
}
