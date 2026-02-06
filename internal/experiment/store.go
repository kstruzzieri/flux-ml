package experiment

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Status constants for experiments.
const (
	StatusPending   = "pending"
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

// validStatuses is the set of allowed status values.
var validStatuses = map[string]bool{
	StatusPending:   true,
	StatusRunning:   true,
	StatusCompleted: true,
	StatusFailed:    true,
}

// Experiment represents an ML training run.
type Experiment struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Config    string  `json:"config"`
	ParentID  *string `json:"parentId"`
	Status    string  `json:"status"`
	CreatedAt int64   `json:"createdAt"`
	UpdatedAt int64   `json:"updatedAt"`
}

// Store provides CRUD operations for experiments.
type Store struct {
	db *database.DB
}

// NewStore creates a new experiment store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// Create creates a new experiment with the given name and config JSON.
func (s *Store) Create(name string, config string) (*Experiment, error) {
	if name == "" {
		return nil, fmt.Errorf("experiment name cannot be empty")
	}

	now := time.Now().Unix()
	id := uuid.New().String()

	_, err := s.db.Exec(
		`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		id, name, config, StatusPending, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting experiment: %w", err)
	}

	return &Experiment{
		ID:        id,
		Name:      name,
		Config:    config,
		ParentID:  nil,
		Status:    StatusPending,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// List returns all experiments ordered by created_at descending.
func (s *Store) List() ([]Experiment, error) {
	rows, err := s.db.Query(
		`SELECT id, name, config, parent_id, status, created_at, updated_at
		 FROM experiments ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying experiments: %w", err)
	}
	defer rows.Close()

	experiments := []Experiment{}
	for rows.Next() {
		var exp Experiment
		var parentID sql.NullString
		if err := rows.Scan(&exp.ID, &exp.Name, &exp.Config, &parentID, &exp.Status, &exp.CreatedAt, &exp.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning experiment: %w", err)
		}
		if parentID.Valid {
			exp.ParentID = &parentID.String
		}
		experiments = append(experiments, exp)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating experiments: %w", err)
	}

	return experiments, nil
}

// GetByID returns a single experiment by ID.
func (s *Store) GetByID(id string) (*Experiment, error) {
	var exp Experiment
	var parentID sql.NullString
	err := s.db.QueryRow(
		`SELECT id, name, config, parent_id, status, created_at, updated_at
		 FROM experiments WHERE id = ?`, id,
	).Scan(&exp.ID, &exp.Name, &exp.Config, &parentID, &exp.Status, &exp.CreatedAt, &exp.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("experiment not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("querying experiment: %w", err)
	}
	if parentID.Valid {
		exp.ParentID = &parentID.String
	}
	return &exp, nil
}

// UpdateStatus changes the status of an experiment.
func (s *Store) UpdateStatus(id string, status string) error {
	if !validStatuses[status] {
		return fmt.Errorf("invalid status: %q", status)
	}

	now := time.Now().Unix()
	result, err := s.db.Exec(
		`UPDATE experiments SET status = ?, updated_at = ? WHERE id = ?`,
		status, now, id,
	)
	if err != nil {
		return fmt.Errorf("updating experiment status: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("experiment not found: %s", id)
	}

	return nil
}

// Delete removes an experiment by ID.
func (s *Store) Delete(id string) error {
	result, err := s.db.Exec(`DELETE FROM experiments WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting experiment: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("experiment not found: %s", id)
	}

	return nil
}
