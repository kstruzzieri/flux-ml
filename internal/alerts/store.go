package alerts

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Store provides alert persistence operations.
type Store struct {
	db *database.DB
}

// NewStore creates an alert store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// UpsertAlert persists a non-clear alert, refreshing the current unresolved
// episode for the same experiment and alert type.
func (s *Store) UpsertAlert(alert Alert) (*Alert, error) {
	if alert.ExperimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}
	if alert.Type == "" {
		return nil, fmt.Errorf("alert type cannot be empty")
	}
	if alert.Step <= 0 {
		return nil, fmt.Errorf("alert step must be positive")
	}
	if alert.Confidence <= 0 {
		return nil, fmt.Errorf("alert confidence must be positive")
	}
	if alert.CreatedAt == 0 {
		alert.CreatedAt = time.Now().Unix()
	}

	_, err := s.db.Exec(
		`INSERT INTO alerts (experiment_id, type, step, confidence, data, acknowledged, created_at, resolved_at)
		 VALUES (?, ?, ?, ?, ?, 0, ?, NULL)
		 ON CONFLICT(experiment_id, type) WHERE acknowledged = 0 AND resolved_at IS NULL DO UPDATE SET
		   step = excluded.step,
		   confidence = excluded.confidence,
		   data = excluded.data`,
		alert.ExperimentID, alert.Type, alert.Step, alert.Confidence, nullableString(alert.Data), alert.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("upserting alert: %w", err)
	}

	return s.GetOpenByType(alert.ExperimentID, alert.Type)
}

// ResolveOpenAlert marks the current unresolved alert episode as resolved. It is
// intentionally a no-op when no open alert exists.
func (s *Store) ResolveOpenAlert(experimentID, alertType string, resolvedAt int64) error {
	if experimentID == "" {
		return fmt.Errorf("experiment ID cannot be empty")
	}
	if alertType == "" {
		return fmt.Errorf("alert type cannot be empty")
	}
	if resolvedAt == 0 {
		resolvedAt = time.Now().Unix()
	}

	if _, err := s.db.Exec(
		`UPDATE alerts
		 SET resolved_at = ?
		 WHERE experiment_id = ? AND type = ? AND acknowledged = 0 AND resolved_at IS NULL`,
		resolvedAt, experimentID, alertType,
	); err != nil {
		return fmt.Errorf("resolving alert: %w", err)
	}
	return nil
}

// GetOpenByType returns the current unresolved alert for an experiment/type.
func (s *Store) GetOpenByType(experimentID, alertType string) (*Alert, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}
	if alertType == "" {
		return nil, fmt.Errorf("alert type cannot be empty")
	}

	row := s.db.QueryRow(
		`SELECT id, experiment_id, type, step, confidence, data, acknowledged, created_at, resolved_at
		 FROM alerts
		 WHERE experiment_id = ? AND type = ? AND acknowledged = 0 AND resolved_at IS NULL
		 ORDER BY id DESC
		 LIMIT 1`,
		experimentID, alertType,
	)
	alert, err := scanAlert(row)
	if err != nil {
		return nil, err
	}
	return alert, nil
}

// GetByKey returns the latest alert for an experiment/type/step tuple.
func (s *Store) GetByKey(experimentID, alertType string, step int64) (*Alert, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}
	if alertType == "" {
		return nil, fmt.Errorf("alert type cannot be empty")
	}

	row := s.db.QueryRow(
		`SELECT id, experiment_id, type, step, confidence, data, acknowledged, created_at, resolved_at
		 FROM alerts
		 WHERE experiment_id = ? AND type = ? AND step = ?
		 ORDER BY id DESC
		 LIMIT 1`,
		experimentID, alertType, step,
	)
	alert, err := scanAlert(row)
	if err != nil {
		return nil, err
	}
	return alert, nil
}

// ListByExperiment returns persisted alerts for an experiment, newest first.
func (s *Store) ListByExperiment(experimentID string) ([]Alert, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}

	rows, err := s.db.Query(
		`SELECT id, experiment_id, type, step, confidence, data, acknowledged, created_at, resolved_at
		 FROM alerts
		 WHERE experiment_id = ?
		 ORDER BY step DESC, created_at DESC, id DESC`,
		experimentID,
	)
	if err != nil {
		return nil, fmt.Errorf("querying alerts: %w", err)
	}
	defer rows.Close()

	results := []Alert{}
	for rows.Next() {
		alert, err := scanAlert(rows)
		if err != nil {
			return nil, err
		}
		results = append(results, *alert)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating alerts: %w", err)
	}

	return results, nil
}

type alertScanner interface {
	Scan(dest ...any) error
}

func scanAlert(scanner alertScanner) (*Alert, error) {
	var alert Alert
	var data sql.NullString
	var resolvedAt sql.NullInt64
	var acknowledged int
	if err := scanner.Scan(
		&alert.ID,
		&alert.ExperimentID,
		&alert.Type,
		&alert.Step,
		&alert.Confidence,
		&data,
		&acknowledged,
		&alert.CreatedAt,
		&resolvedAt,
	); err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("alert not found")
		}
		return nil, fmt.Errorf("scanning alert: %w", err)
	}
	if data.Valid {
		alert.Data = data.String
	}
	alert.Pattern = patternForType(alert.Type)
	alert.Status = levelForConfidence(alert.Confidence)
	alert.ScoreKind = ScoreKindHeuristicV1
	alert.Acknowledged = acknowledged != 0
	if resolvedAt.Valid {
		alert.ResolvedAt = &resolvedAt.Int64
	}
	return &alert, nil
}

func nullableString(value string) any {
	if value == "" {
		return nil
	}
	return value
}
