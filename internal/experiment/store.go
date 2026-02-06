package experiment

import (
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Status constants for experiments.
const (
	StatusPending   = "pending"
	StatusRunning   = "running"
	StatusCompleted = "completed"
	StatusFailed    = "failed"
)

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

// Create creates a new experiment. Stub.
func (s *Store) Create(name string, config string) (*Experiment, error) {
	return nil, nil
}

// List returns all experiments. Stub.
func (s *Store) List() ([]Experiment, error) {
	return nil, nil
}

// GetByID returns an experiment by ID. Stub.
func (s *Store) GetByID(id string) (*Experiment, error) {
	return nil, nil
}

// UpdateStatus updates the status of an experiment. Stub.
func (s *Store) UpdateStatus(id string, status string) error {
	return nil
}

// Delete removes an experiment by ID. Stub.
func (s *Store) Delete(id string) error {
	return nil
}
