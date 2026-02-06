package metrics

import (
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Metric represents a single training metric data point.
type Metric struct {
	ExperimentID string  `json:"experiment_id"`
	Step         int64   `json:"step"`
	Name         string  `json:"name"`
	Value        float64 `json:"value"`
	Timestamp    int64   `json:"timestamp"`
}

// RewardSignal represents a reward component measurement at a training step.
type RewardSignal struct {
	ExperimentID string  `json:"experiment_id"`
	Step         int64   `json:"step"`
	Component    string  `json:"component"`
	Value        float64 `json:"value"`
	Distribution string  `json:"distribution"`
}

// Store provides metrics and reward signal storage operations.
type Store struct {
	db *database.DB
}

// NewStore creates a new metrics store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// RecordMetrics inserts a batch of metrics in a single transaction.
func (s *Store) RecordMetrics(experimentID string, metrics []Metric) error {
	return nil
}

// QueryMetrics returns metrics matching the given filters, ordered by step ASC.
func (s *Store) QueryMetrics(experimentID, name string, startStep, endStep int64) ([]Metric, error) {
	return nil, nil
}

// RecordRewardSignals inserts a batch of reward signals in a single transaction.
func (s *Store) RecordRewardSignals(experimentID string, signals []RewardSignal) error {
	return nil
}

// QueryRewardSignals returns reward signals matching the given filters, ordered by step ASC.
func (s *Store) QueryRewardSignals(experimentID, component string, startStep, endStep int64) ([]RewardSignal, error) {
	return nil, nil
}
