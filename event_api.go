package main

import (
	"fmt"

	"github.com/kstruzzieri/flux-ml/internal/event"
)

// AppendEvent appends an immutable event to an experiment's activity log.
func (a *App) AppendEvent(experimentID, eventType, data string) (*event.Event, error) {
	if a.events == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	ev, err := a.events.Append(experimentID, eventType, data)
	if err != nil {
		return nil, err
	}
	a.emitEvent("event:appended", ev)
	return ev, nil
}

// ReplayEvents returns events matching the given filters, ordered chronologically.
// All filter parameters are optional: empty string or zero value means no filter.
func (a *App) ReplayEvents(experimentID string, startTime, endTime int64, eventType string) ([]event.Event, error) {
	if a.events == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.events.Replay(experimentID, startTime, endTime, eventType)
}
