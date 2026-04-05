package annotation

import "time"

// SeedDemoAnnotations populates the database with sample annotations for existing experiments.
// Only inserts if the annotations table is empty. Uses experiment IDs queried from the database.
func (s *Store) SeedDemoAnnotations() error {
	var count int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM annotations`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	rows, err := s.db.Query(`SELECT id, status FROM experiments ORDER BY created_at DESC`)
	if err != nil {
		return err
	}
	defer rows.Close()

	type expInfo struct {
		ID     string
		Status string
	}
	var experiments []expInfo
	for rows.Next() {
		var e expInfo
		if err := rows.Scan(&e.ID, &e.Status); err != nil {
			return err
		}
		experiments = append(experiments, e)
	}
	if err := rows.Err(); err != nil {
		return err
	}

	if len(experiments) == 0 {
		return nil
	}

	now := time.Now().Unix()

	for _, exp := range experiments {
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
