package experiment

import (
	"time"

	"github.com/google/uuid"
)

// seedExperiment defines a demo experiment for development.
type seedExperiment struct {
	Name      string
	Status    string
	AgeHours  float64 // how old the createdAt should be
	Duration  float64 // hours of duration (for completed/failed)
}

// SeedDemoExperiments populates the database with sample experiments
// matching the Experiments view mockup. Only inserts if the table is empty.
func (s *Store) SeedDemoExperiments() error {
	experiments, err := s.List()
	if err != nil {
		return err
	}
	if len(experiments) > 0 {
		return nil // already has data
	}

	now := time.Now().Unix()

	seeds := []seedExperiment{
		{Name: "reward-model-v2-run-47", Status: StatusRunning, AgeHours: 2.57},          // 2h 34m ago
		{Name: "reward-model-v2-run-48", Status: StatusRunning, AgeHours: 0.75},           // 45m ago
		{Name: "reward-model-v2-run-46", Status: StatusCompleted, AgeHours: 8, Duration: 4.2},   // 4h 12m
		{Name: "reward-model-v2-run-45", Status: StatusFailed, AgeHours: 12, Duration: 0.2},     // 12m
		{Name: "reward-model-v2-run-44", Status: StatusCompleted, AgeHours: 24, Duration: 3.97}, // 3h 58m
	}

	for _, seed := range seeds {
		id := uuid.New().String()
		createdAt := now - int64(seed.AgeHours*3600)

		var updatedAt int64
		switch seed.Status {
		case StatusRunning:
			updatedAt = now
		case StatusCompleted, StatusFailed:
			updatedAt = createdAt + int64(seed.Duration*3600)
		default:
			updatedAt = createdAt
		}

		_, err := s.db.Exec(
			`INSERT INTO experiments (id, name, config, status, created_at, updated_at)
			 VALUES (?, ?, ?, ?, ?, ?)`,
			id, seed.Name, `{"learning_rate": 1e-5, "batch_size": 32}`, seed.Status, createdAt, updatedAt,
		)
		if err != nil {
			return err
		}
	}

	return nil
}
