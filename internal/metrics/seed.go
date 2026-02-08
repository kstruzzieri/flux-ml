package metrics

import (
	"math"
	"time"
)

// SeedDemoMetrics populates the database with sample metrics for existing experiments.
// Only inserts if the metrics table is empty. Uses experiment IDs queried from the database.
func (s *Store) SeedDemoMetrics() error {
	// Check if metrics already exist
	var count int
	if err := s.db.QueryRow(`SELECT COUNT(*) FROM metrics`).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		return nil // already has data
	}

	// Get all experiment IDs
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
		var metrics []Metric

		// Status strings match experiment.Status* constants but are inlined here
		// to avoid importing the experiment package (would create a circular dependency).
		switch exp.Status {
		case "running":
			// Running experiments: loss decreasing, reward increasing over ~50 steps
			for step := int64(1); step <= 50; step++ {
				loss := 2.5 * math.Exp(-0.03*float64(step))
				reward := 0.8 * (1 - math.Exp(-0.05*float64(step)))
				ts := now - (50-step)*60
				metrics = append(metrics,
					Metric{Step: step, Name: "loss", Value: math.Round(loss*10000) / 10000, Timestamp: ts},
					Metric{Step: step, Name: "reward", Value: math.Round(reward*1000) / 1000, Timestamp: ts},
				)
			}
		case "completed":
			// Completed experiments: full training run of 100 steps
			for step := int64(1); step <= 100; step++ {
				loss := 2.0 * math.Exp(-0.04*float64(step))
				reward := 0.9 * (1 - math.Exp(-0.06*float64(step)))
				ts := now - 3600*4 + step*144
				metrics = append(metrics,
					Metric{Step: step, Name: "loss", Value: math.Round(loss*10000) / 10000, Timestamp: ts},
					Metric{Step: step, Name: "reward", Value: math.Round(reward*1000) / 1000, Timestamp: ts},
				)
			}
		case "failed":
			// Failed experiments: only partial data (20 steps), loss starts diverging
			for step := int64(1); step <= 20; step++ {
				loss := 2.5 - 0.05*float64(step) + 0.01*float64(step*step)
				reward := 0.1 + 0.02*float64(step) - 0.003*float64(step*step)
				ts := now - 3600*12 + step*36
				metrics = append(metrics,
					Metric{Step: step, Name: "loss", Value: math.Round(loss*10000) / 10000, Timestamp: ts},
					Metric{Step: step, Name: "reward", Value: math.Round(reward*1000) / 1000, Timestamp: ts},
				)
			}
		default:
			// Pending experiments: no metrics
			continue
		}

		if len(metrics) > 0 {
			if err := s.RecordMetrics(exp.ID, metrics); err != nil {
				return err
			}
		}
	}

	return nil
}
