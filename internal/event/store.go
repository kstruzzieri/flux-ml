package event

import (
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Event type constants.
const (
	TypeMetric       = "metric"
	TypeConfigChange = "config_change"
	TypeAlert        = "alert"
	TypeCheckpoint   = "checkpoint"
)

// validTypes is the set of allowed event type values.
var validTypes = map[string]bool{
	TypeMetric:       true,
	TypeConfigChange: true,
	TypeAlert:        true,
	TypeCheckpoint:   true,
}

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

// Append adds a new event for the given experiment.
func (s *Store) Append(experimentID, eventType, data string) (*Event, error) {
	if experimentID == "" {
		return nil, fmt.Errorf("experiment ID cannot be empty")
	}
	if !validTypes[eventType] {
		return nil, fmt.Errorf("invalid event type: %q", eventType)
	}

	now := time.Now().Unix()

	result, err := s.db.Exec(
		`INSERT INTO events (experiment_id, timestamp, type, data) VALUES (?, ?, ?, ?)`,
		experimentID, now, eventType, data,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting event: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("getting last insert ID: %w", err)
	}

	ev := &Event{
		ID:           id,
		ExperimentID: experimentID,
		Timestamp:    now,
		Type:         eventType,
		Data:         data,
	}

	s.notify(*ev)

	return ev, nil
}

// notify sends an event to all matching subscribers (non-blocking).
func (s *Store) notify(ev Event) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, sub := range s.subscribers {
		if sub.experimentID != "" && sub.experimentID != ev.ExperimentID {
			continue
		}
		select {
		case sub.ch <- ev:
		default:
			// Channel full — drop event for this subscriber
		}
	}
}

// Replay returns events matching the given filters, ordered by timestamp ASC.
// All filter parameters are optional: empty string or zero value means no filter.
func (s *Store) Replay(experimentID string, startTime, endTime int64, eventType string) ([]Event, error) {
	query := `SELECT id, experiment_id, timestamp, type, data FROM events`
	var conditions []string
	var args []any

	if experimentID != "" {
		conditions = append(conditions, "experiment_id = ?")
		args = append(args, experimentID)
	}
	if startTime > 0 {
		conditions = append(conditions, "timestamp >= ?")
		args = append(args, startTime)
	}
	if endTime > 0 {
		conditions = append(conditions, "timestamp <= ?")
		args = append(args, endTime)
	}
	if eventType != "" {
		conditions = append(conditions, "type = ?")
		args = append(args, eventType)
	}

	if len(conditions) > 0 {
		query += " WHERE " + strings.Join(conditions, " AND ")
	}
	query += " ORDER BY timestamp ASC"

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("querying events: %w", err)
	}
	defer rows.Close()

	events := []Event{}
	for rows.Next() {
		var ev Event
		if err := rows.Scan(&ev.ID, &ev.ExperimentID, &ev.Timestamp, &ev.Type, &ev.Data); err != nil {
			return nil, fmt.Errorf("scanning event: %w", err)
		}
		events = append(events, ev)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating events: %w", err)
	}

	return events, nil
}

// Subscribe registers a new event listener. If experimentID is empty, all events
// are delivered. Returns a Subscription whose Events() channel receives new events.
func (s *Store) Subscribe(experimentID string) *Subscription {
	s.mu.Lock()
	defer s.mu.Unlock()

	sub := &Subscription{
		ch:           make(chan Event, 64),
		experimentID: experimentID,
		id:           s.nextID,
	}
	s.subscribers[s.nextID] = sub
	s.nextID++

	return sub
}

// Unsubscribe removes an event listener and closes its channel.
func (s *Store) Unsubscribe(sub *Subscription) {
	if sub == nil {
		return
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.subscribers[sub.id]; ok {
		delete(s.subscribers, sub.id)
		close(sub.ch)
	}
}
