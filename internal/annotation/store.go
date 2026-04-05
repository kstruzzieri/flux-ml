package annotation

import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Annotation represents a chart annotation at a specific training step.
type Annotation struct {
	ID           int64  `json:"id"`
	ExperimentID string `json:"experiment_id"`
	Step         int64  `json:"step"`
	Type         string `json:"type"`
	Label        string `json:"label"`
	Data         string `json:"data"`
	CreatedAt    int64  `json:"created_at"`
}

// Store provides annotation storage operations.
type Store struct {
	db *database.DB
}

// NewStore creates a new annotation store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// Create inserts a single annotation and returns it with the generated ID.
func (s *Store) Create(experimentID string, step int64, annType, label, data string) (*Annotation, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}
	if annType == "" {
		return nil, fmt.Errorf("annotation type cannot be empty")
	}

	now := time.Now().Unix()
	var dataArg any
	if data != "" {
		dataArg = data
	}

	result, err := s.db.Exec(
		`INSERT INTO annotations (experiment_id, step, type, label, data, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		experimentID, step, annType, label, dataArg, now,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting annotation: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("getting insert ID: %w", err)
	}

	return &Annotation{
		ID:           id,
		ExperimentID: experimentID,
		Step:         step,
		Type:         annType,
		Label:        label,
		Data:         data,
		CreatedAt:    now,
	}, nil
}

// Query returns annotations matching the given filters, ordered by step ASC.
// experimentID is required. annType is optional (empty = no filter).
// startStep and endStep are optional (zero = no filter).
func (s *Store) Query(experimentID, annType string, startStep, endStep int64) ([]Annotation, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}

	query := `SELECT id, experiment_id, step, type, label, data, created_at FROM annotations`
	conditions := []string{"experiment_id = ?"}
	args := []any{experimentID}

	if annType != "" {
		conditions = append(conditions, "type = ?")
		args = append(args, annType)
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
		return nil, fmt.Errorf("querying annotations: %w", err)
	}
	defer rows.Close()

	results := []Annotation{}
	for rows.Next() {
		var a Annotation
		var data sql.NullString
		if err := rows.Scan(&a.ID, &a.ExperimentID, &a.Step, &a.Type, &a.Label, &data, &a.CreatedAt); err != nil {
			return nil, fmt.Errorf("scanning annotation: %w", err)
		}
		if data.Valid {
			a.Data = data.String
		}
		results = append(results, a)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating annotations: %w", err)
	}

	return results, nil
}

// Delete removes an annotation by ID.
func (s *Store) Delete(id int64) error {
	result, err := s.db.Exec(`DELETE FROM annotations WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting annotation: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("annotation not found: %d", id)
	}
	return nil
}
