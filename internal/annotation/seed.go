package annotation

import (
	"database/sql"
	"fmt"
	"time"
)

type experimentStatus struct {
	ID     string
	Status string
}

// SeedDemoAnnotations backfills demo annotations for experiments that do not
// already have them.
func (s *Store) SeedDemoAnnotations() error {
	experiments, err := s.listExperimentsForDemoSeed()
	if err != nil {
		return err
	}
	return s.seedDemoAnnotationsForExperiments(experiments)
}

// SeedDemoAnnotationsForExperiments backfills demo annotations for the given
// experiments only.
func (s *Store) SeedDemoAnnotationsForExperiments(experimentIDs []string) error {
	experiments, err := s.listExperimentsForDemoSeedByID(experimentIDs)
	if err != nil {
		return err
	}
	return s.seedDemoAnnotationsForExperiments(experiments)
}

func (s *Store) listExperimentsForDemoSeed() ([]experimentStatus, error) {
	rows, err := s.db.Query(`SELECT id, status FROM experiments ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var experiments []experimentStatus
	for rows.Next() {
		var e experimentStatus
		if err := rows.Scan(&e.ID, &e.Status); err != nil {
			return nil, err
		}
		experiments = append(experiments, e)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return experiments, nil
}

func (s *Store) listExperimentsForDemoSeedByID(experimentIDs []string) ([]experimentStatus, error) {
	if len(experimentIDs) == 0 {
		return []experimentStatus{}, nil
	}

	experiments := make([]experimentStatus, 0, len(experimentIDs))
	seen := make(map[string]bool, len(experimentIDs))
	for _, experimentID := range experimentIDs {
		if experimentID == "" || seen[experimentID] {
			continue
		}
		seen[experimentID] = true

		var exp experimentStatus
		err := s.db.QueryRow(
			`SELECT id, status FROM experiments WHERE id = ?`,
			experimentID,
		).Scan(&exp.ID, &exp.Status)
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("experiment not found: %s", experimentID)
		}
		if err != nil {
			return nil, err
		}

		experiments = append(experiments, exp)
	}
	return experiments, nil
}

func (s *Store) seedDemoAnnotationsForExperiments(experiments []experimentStatus) error {
	if len(experiments) == 0 {
		return nil
	}

	now := time.Now().Unix()

	for _, exp := range experiments {
		hasAnnotations, err := s.experimentHasAnnotations(exp.ID)
		if err != nil {
			return err
		}
		if hasAnnotations {
			continue
		}

		switch exp.Status {
		case "running":
			// Running: checkpoint at step 10, config change at step 25, note at step 40
			s.seed(exp.ID, 10, "checkpoint", "Checkpoint saved", `{"path": "ckpt/step-10"}`, now)
			s.seed(exp.ID, 25, "config_change", "LR reduced to 1e-4", "", now)
			s.seed(exp.ID, 40, "note", "Training looks healthy", "", now)
		case "completed":
			// Completed: checkpoints every 25 steps, config change at 50, alert at 75
			s.seed(exp.ID, 25, "checkpoint", "Checkpoint saved", `{"path": "ckpt/step-25"}`, now)
			s.seed(exp.ID, 50, "checkpoint", "Checkpoint saved", `{"path": "ckpt/step-50"}`, now)
			s.seed(exp.ID, 50, "config_change", "Batch size doubled to 64", "", now)
			s.seed(exp.ID, 75, "checkpoint", "Checkpoint saved", `{"path": "ckpt/step-75"}`, now)
			s.seed(exp.ID, 75, "alert", "KL drift above threshold", `{"kl": 0.072}`, now)
			s.seed(exp.ID, 100, "checkpoint", "Final checkpoint", `{"path": "ckpt/step-100"}`, now)
		case "failed":
			// Failed: checkpoint at 5, alert at 15 (before failure)
			s.seed(exp.ID, 5, "checkpoint", "Checkpoint saved", `{"path": "ckpt/step-5"}`, now)
			s.seed(exp.ID, 15, "alert", "Loss diverging", `{"loss": 4.2}`, now)
			s.seed(exp.ID, 18, "note", "Investigating divergence", "", now)
		}
	}

	return nil
}

func (s *Store) experimentHasAnnotations(experimentID string) (bool, error) {
	var count int
	if err := s.db.QueryRow(
		`SELECT COUNT(*) FROM annotations WHERE experiment_id = ?`,
		experimentID,
	).Scan(&count); err != nil {
		return false, err
	}
	return count > 0, nil
}

func (s *Store) seed(experimentID string, step int64, annType, label, data string, now int64) {
	var dataArg any
	if data != "" {
		dataArg = data
	}
	s.db.Exec(
		`INSERT INTO annotations (experiment_id, step, type, label, data, created_at)
		 VALUES (?, ?, ?, ?, ?, ?)`,
		experimentID, step, annType, label, dataArg, now,
	)
}
