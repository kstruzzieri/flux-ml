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
		var signals []RewardSignal

		// Status strings match experiment.Status* constants but are inlined here
		// to avoid importing the experiment package (would create a circular dependency).
		switch exp.Status {
		case "running":
			// Running experiments: ~50 steps of healthy training
			for step := int64(1); step <= 50; step++ {
				ts := now - (50-step)*60
				t := float64(step)

				loss := 2.5 * math.Exp(-0.03*t)
				reward := 0.8 * (1 - math.Exp(-0.05*t))
				kl := 0.01 + 0.0008*t + 0.0001*math.Sin(t*0.3)
				lr := 3e-4 * math.Exp(-0.002*t)
				rewardVar := 0.05 * math.Exp(-0.015*t) + 0.008
				entropy := 4.5 - 0.02*t + 0.05*math.Sin(t*0.2)

				metrics = append(metrics,
					Metric{Step: step, Name: "loss", Value: round(loss, 4), Timestamp: ts},
					Metric{Step: step, Name: "reward", Value: round(reward, 3), Timestamp: ts},
					Metric{Step: step, Name: "kl", Value: round(kl, 6), Timestamp: ts},
					Metric{Step: step, Name: "learning_rate", Value: round(lr, 8), Timestamp: ts},
					Metric{Step: step, Name: "reward_variance", Value: round(rewardVar, 4), Timestamp: ts},
					Metric{Step: step, Name: "policy_entropy", Value: round(entropy, 4), Timestamp: ts},
				)

				// Reward signals every 5 steps
				if step%5 == 0 {
					signals = append(signals,
						RewardSignal{Step: step, Component: "helpfulness", Value: round(0.6+0.004*t, 3)},
						RewardSignal{Step: step, Component: "harmlessness", Value: round(0.7+0.002*t, 3)},
						RewardSignal{Step: step, Component: "honesty", Value: round(0.65+0.003*t, 3)},
					)
				}
			}
		case "completed":
			// Completed experiments: full training run of 100 steps
			for step := int64(1); step <= 100; step++ {
				ts := now - 3600*4 + step*144
				t := float64(step)

				loss := 2.0 * math.Exp(-0.04*t)
				reward := 0.9 * (1 - math.Exp(-0.06*t))
				kl := 0.02 + 0.0005*t + 0.00015*math.Sin(t*0.2)
				lr := 5e-4 * math.Exp(-0.003*t)
				rewardVar := 0.08 * math.Exp(-0.02*t) + 0.005
				entropy := 4.8 - 0.025*t + 0.04*math.Sin(t*0.15)

				metrics = append(metrics,
					Metric{Step: step, Name: "loss", Value: round(loss, 4), Timestamp: ts},
					Metric{Step: step, Name: "reward", Value: round(reward, 3), Timestamp: ts},
					Metric{Step: step, Name: "kl", Value: round(kl, 6), Timestamp: ts},
					Metric{Step: step, Name: "learning_rate", Value: round(lr, 8), Timestamp: ts},
					Metric{Step: step, Name: "reward_variance", Value: round(rewardVar, 4), Timestamp: ts},
					Metric{Step: step, Name: "policy_entropy", Value: round(entropy, 4), Timestamp: ts},
				)

				if step%10 == 0 {
					signals = append(signals,
						RewardSignal{Step: step, Component: "helpfulness", Value: round(0.5+0.004*t, 3)},
						RewardSignal{Step: step, Component: "harmlessness", Value: round(0.6+0.003*t, 3)},
						RewardSignal{Step: step, Component: "honesty", Value: round(0.55+0.0035*t, 3)},
					)
				}
			}
		case "failed":
			// Failed experiments: 20 steps, loss diverges, entropy collapses
			for step := int64(1); step <= 20; step++ {
				ts := now - 3600*12 + step*36
				t := float64(step)

				loss := 2.5 - 0.05*t + 0.01*t*t
				reward := 0.1 + 0.02*t - 0.003*t*t
				kl := 0.03 + 0.005*t + 0.001*t*t
				lr := 1e-3 * math.Exp(-0.01*t)
				rewardVar := 0.06 * math.Exp(-0.08*t) + 0.001
				entropy := 4.0 - 0.15*t

				metrics = append(metrics,
					Metric{Step: step, Name: "loss", Value: round(loss, 4), Timestamp: ts},
					Metric{Step: step, Name: "reward", Value: round(reward, 3), Timestamp: ts},
					Metric{Step: step, Name: "kl", Value: round(kl, 6), Timestamp: ts},
					Metric{Step: step, Name: "learning_rate", Value: round(lr, 8), Timestamp: ts},
					Metric{Step: step, Name: "reward_variance", Value: round(rewardVar, 4), Timestamp: ts},
					Metric{Step: step, Name: "policy_entropy", Value: round(entropy, 4), Timestamp: ts},
				)

				if step%5 == 0 {
					signals = append(signals,
						RewardSignal{Step: step, Component: "helpfulness", Value: round(0.3+0.01*t, 3)},
						RewardSignal{Step: step, Component: "harmlessness", Value: round(0.4-0.005*t, 3)},
						RewardSignal{Step: step, Component: "honesty", Value: round(0.35+0.002*t, 3)},
					)
				}
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
		if len(signals) > 0 {
			if err := s.RecordRewardSignals(exp.ID, signals); err != nil {
				return err
			}
		}
	}

	return nil
}

func round(v float64, decimals int) float64 {
	pow := math.Pow(10, float64(decimals))
	return math.Round(v*pow) / pow
}
