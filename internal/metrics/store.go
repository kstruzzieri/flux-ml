package metrics

import (
	"database/sql"
	"fmt"
	"strings"

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
	if experimentID == "" {
		return fmt.Errorf("experiment ID cannot be empty")
	}
	if len(metrics) == 0 {
		return fmt.Errorf("metrics slice cannot be empty")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(
		`INSERT INTO metrics (experiment_id, step, name, value, timestamp) VALUES (?, ?, ?, ?, ?)`,
	)
	if err != nil {
		return fmt.Errorf("preparing statement: %w", err)
	}
	defer stmt.Close()

	for _, m := range metrics {
		if _, err := stmt.Exec(experimentID, m.Step, m.Name, m.Value, m.Timestamp); err != nil {
			return fmt.Errorf("inserting metric: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}
	return nil
}

// QueryMetrics returns metrics matching the given filters, ordered by step ASC.
// experimentID is required. name is optional (empty = no filter).
// startStep and endStep are optional (zero = no filter; step 0 is treated as "from the beginning"
// which is equivalent since steps are non-negative).
func (s *Store) QueryMetrics(experimentID, name string, startStep, endStep int64) ([]Metric, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}
	// Safety: conditions are hardcoded strings only; user values go through
	// parameterized args. Do not interpolate user input into conditions.
	query := `SELECT experiment_id, step, name, value, timestamp FROM metrics`
	conditions := []string{"experiment_id = ?"}
	args := []any{experimentID}

	if name != "" {
		conditions = append(conditions, "name = ?")
		args = append(args, name)
	}
	if startStep > 0 {
		conditions = append(conditions, "step >= ?")
		args = append(args, startStep)
	}
	if endStep > 0 {
		conditions = append(conditions, "step <= ?")
		args = append(args, endStep)
	}

	query += " WHERE " + strings.Join(conditions, " AND ")
	query += " ORDER BY step ASC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying metrics: %w", err)
	}
	defer rows.Close()

	results := []Metric{}
	for rows.Next() {
		var m Metric
		if err := rows.Scan(&m.ExperimentID, &m.Step, &m.Name, &m.Value, &m.Timestamp); err != nil {
			return nil, fmt.Errorf("scanning metric: %w", err)
		}
		results = append(results, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating metrics: %w", err)
	}

	return results, nil
}

// RecordRewardSignals inserts a batch of reward signals in a single transaction.
func (s *Store) RecordRewardSignals(experimentID string, signals []RewardSignal) error {
	if experimentID == "" {
		return fmt.Errorf("experiment ID cannot be empty")
	}
	if len(signals) == 0 {
		return fmt.Errorf("signals slice cannot be empty")
	}

	tx, err := s.db.Begin()
	if err != nil {
		return fmt.Errorf("beginning transaction: %w", err)
	}
	defer tx.Rollback()

	stmt, err := tx.Prepare(
		`INSERT INTO reward_signals (experiment_id, step, component, value, distribution) VALUES (?, ?, ?, ?, ?)`,
	)
	if err != nil {
		return fmt.Errorf("preparing statement: %w", err)
	}
	defer stmt.Close()

	for _, sig := range signals {
		var dist any
		if sig.Distribution != "" {
			dist = sig.Distribution
		}
		if _, err := stmt.Exec(experimentID, sig.Step, sig.Component, sig.Value, dist); err != nil {
			return fmt.Errorf("inserting reward signal: %w", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("committing transaction: %w", err)
	}
	return nil
}

// QueryRewardSignals returns reward signals matching the given filters, ordered by step ASC.
// experimentID is required. component is optional (empty = no filter).
// startStep and endStep are optional (zero = no filter; step 0 is treated as "from the beginning"
// which is equivalent since steps are non-negative).
func (s *Store) QueryRewardSignals(experimentID, component string, startStep, endStep int64) ([]RewardSignal, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}
	// Safety: conditions are hardcoded strings only; user values go through
	// parameterized args. Do not interpolate user input into conditions.
	query := `SELECT experiment_id, step, component, value, distribution FROM reward_signals`
	conditions := []string{"experiment_id = ?"}
	args := []any{experimentID}

	if component != "" {
		conditions = append(conditions, "component = ?")
		args = append(args, component)
	}
	if startStep > 0 {
		conditions = append(conditions, "step >= ?")
		args = append(args, startStep)
	}
	if endStep > 0 {
		conditions = append(conditions, "step <= ?")
		args = append(args, endStep)
	}

	query += " WHERE " + strings.Join(conditions, " AND ")
	query += " ORDER BY step ASC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying reward signals: %w", err)
	}
	defer rows.Close()

	results := []RewardSignal{}
	for rows.Next() {
		var sig RewardSignal
		var dist sql.NullString
		if err := rows.Scan(&sig.ExperimentID, &sig.Step, &sig.Component, &sig.Value, &dist); err != nil {
			return nil, fmt.Errorf("scanning reward signal: %w", err)
		}
		if dist.Valid {
			sig.Distribution = dist.String
		}
		results = append(results, sig)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating reward signals: %w", err)
	}

	return results, nil
}

// LatestMetrics returns the most recent metric (highest step) per metric name
// for the given experiment. Returns an empty slice if no metrics exist.
func (s *Store) LatestMetrics(experimentID string) ([]Metric, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}

	query := `SELECT m.experiment_id, m.step, m.name, m.value, m.timestamp
		FROM metrics m
		INNER JOIN (
			SELECT name, MAX(step) AS max_step
			FROM metrics
			WHERE experiment_id = ?
			GROUP BY name
		) latest ON m.name = latest.name AND m.step = latest.max_step
		WHERE m.experiment_id = ?
		ORDER BY m.name ASC`

	rows, err := s.db.Query(query, experimentID, experimentID)
	if err != nil {
		return nil, fmt.Errorf("querying latest metrics: %w", err)
	}
	defer rows.Close()

	results := []Metric{}
	for rows.Next() {
		var m Metric
		if err := rows.Scan(&m.ExperimentID, &m.Step, &m.Name, &m.Value, &m.Timestamp); err != nil {
			return nil, fmt.Errorf("scanning latest metric: %w", err)
		}
		results = append(results, m)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating latest metrics: %w", err)
	}

	return results, nil
}
