package main

import (
	"fmt"

	"github.com/kstruzzieri/flux-ml/internal/annotation"
)

// CreateAnnotation inserts an annotation at a given step for an experiment.
func (a *App) CreateAnnotation(experimentID string, step int64, annType, label, data string) (*annotation.Annotation, error) {
	if a.annotations == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	ann, err := a.annotations.Create(experimentID, step, annType, label, data)
	if err != nil {
		return nil, err
	}
	a.emitEvent("annotation:created", map[string]interface{}{
		"experimentId": experimentID,
		"annotationId": ann.ID,
		"step":         step,
		"type":         annType,
	})
	return ann, nil
}

// QueryAnnotations returns annotations matching the given filters, ordered by step ASC.
// annType, startStep, and endStep are optional (empty/zero = no filter).
func (a *App) QueryAnnotations(experimentID, annType string, startStep, endStep int64) ([]annotation.Annotation, error) {
	if a.annotations == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return a.annotations.Query(experimentID, annType, startStep, endStep)
}

// DeleteAnnotation removes an annotation by ID.
func (a *App) DeleteAnnotation(experimentID string, id int64) error {
	if a.annotations == nil {
		return fmt.Errorf("database not initialized")
	}
	if err := a.annotations.Delete(id); err != nil {
		return err
	}
	a.emitEvent("annotation:deleted", map[string]interface{}{
		"experimentId": experimentID,
		"annotationId": id,
	})
	return nil
}
