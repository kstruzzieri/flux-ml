package alerts

const (
	TypeLengthGaming   = "length_gaming"
	TypeSycophancy     = "sycophancy"
	TypeKLDrift        = "kl_drift"
	TypeRewardCollapse = "reward_collapse"
)

const (
	PatternLengthGaming   = "Length Gaming"
	PatternSycophancy     = "Sycophancy"
	PatternKLDrift        = "KL Drift"
	PatternRewardCollapse = "Reward Collapse"
)

const ScoreKindHeuristicV1 = "heuristic_v1"

type DetectionLevel string

const (
	LevelClear      DetectionLevel = "clear"
	LevelMonitoring DetectionLevel = "monitoring"
	LevelElevated   DetectionLevel = "elevated"
	LevelDetected   DetectionLevel = "detected"
)

// DetectionResult mirrors the frontend reward-hack status shape while adding
// backend fields used for persistence and evidence display.
type DetectionResult struct {
	Type       string         `json:"type"`
	Pattern    string         `json:"pattern"`
	Status     DetectionLevel `json:"status"`
	Confidence *float64       `json:"confidence"`
	ScoreKind  string         `json:"score_kind"`
	Step       int64          `json:"step"`
	Data       string         `json:"data"`
}

// Alert is a persisted non-clear detection.
type Alert struct {
	ID           int64          `json:"id"`
	ExperimentID string         `json:"experiment_id"`
	Type         string         `json:"type"`
	Pattern      string         `json:"pattern"`
	Step         int64          `json:"step"`
	Confidence   float64        `json:"confidence"`
	ScoreKind    string         `json:"score_kind"`
	Status       DetectionLevel `json:"status"`
	Data         string         `json:"data"`
	Acknowledged bool           `json:"acknowledged"`
	CreatedAt    int64          `json:"created_at"`
}

func patternForType(alertType string) string {
	switch alertType {
	case TypeLengthGaming:
		return PatternLengthGaming
	case TypeSycophancy:
		return PatternSycophancy
	case TypeKLDrift:
		return PatternKLDrift
	case TypeRewardCollapse:
		return PatternRewardCollapse
	default:
		return alertType
	}
}

func levelForConfidence(confidence float64) DetectionLevel {
	switch {
	case confidence >= 0.85:
		return LevelDetected
	case confidence >= 0.65:
		return LevelElevated
	default:
		return LevelMonitoring
	}
}
