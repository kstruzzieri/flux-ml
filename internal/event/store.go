package event

import (
	"sync"

	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Event type constants.
const (
	TypeMetric       = "metric"
	TypeConfigChange = "config_change"
	TypeAlert        = "alert"
	TypeCheckpoint   = "checkpoint"
)

// Event represents an immutable experiment activity record.
type Event struct {
	ID           int64  `json:"id"`
	ExperimentID string `json:"experiment_id"`
	Timestamp    int64  `json:"timestamp"`
	Type         string `json:"type"`
	Data         string `json:"data"`
}

// Subscription represents a channel-based event listener.
type Subscription struct {
	ch           chan Event
	experimentID string
	id           int
}

// Events returns a read-only channel for receiving events.
func (s *Subscription) Events() <-chan Event {
	return s.ch
}

// Store provides event sourcing operations.
type Store struct {
	db          *database.DB
	mu          sync.RWMutex
	subscribers map[int]*Subscription
	nextID      int
}

// NewStore creates a new event store.
func NewStore(db *database.DB) *Store {
	return &Store{
		db:          db,
		subscribers: make(map[int]*Subscription),
	}
}

// Append adds a new event. Stub.
func (s *Store) Append(experimentID, eventType, data string) (*Event, error) {
	return nil, nil
}

// Replay returns events matching the given filters. Stub.
func (s *Store) Replay(experimentID string, startTime, endTime int64, eventType string) ([]Event, error) {
	return nil, nil
}

// Subscribe registers a new event listener. Stub.
func (s *Store) Subscribe(experimentID string) *Subscription {
	return nil
}

// Unsubscribe removes an event listener. Stub.
func (s *Store) Unsubscribe(sub *Subscription) {
}
