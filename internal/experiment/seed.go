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
	Config    string  // JSON config string
}

// SeedDemoExperiments populates the database with sample experiments
// matching the Experiments view mockup. Only inserts if the table is empty.
// When projectID is non-empty, experiments are scoped to that project.
func (s *Store) SeedDemoExperiments(projectID ...string) error {
	var pid string
	if len(projectID) > 0 {
		pid = projectID[0]
	}

	// Check emptiness scoped to the target (project or global)
	var existing []Experiment
	var err error
	if pid != "" {
		existing, err = s.ListByProject(pid)
	} else {
		existing, err = s.List()
	}
	if err != nil {
		return err
	}
	if len(existing) > 0 {
		return nil // already has data
	}

	now := time.Now().Unix()

	seeds := []seedExperiment{
		{
			Name: "reward-model-v2-run-47", Status: StatusRunning, AgeHours: 2.57,
			Config: `{"model":"llama-7b","learning_rate":1e-5,"batch_size":32,"kl_coef":0.1,"optimizer":"adamw","max_steps":20000,"warmup_steps":500}`,
		},
		{
			Name: "reward-model-v2-run-48", Status: StatusRunning, AgeHours: 0.75,
			Config: `{"model":"llama-7b","learning_rate":3e-5,"batch_size":64,"kl_coef":0.05,"optimizer":"adam","max_steps":15000,"warmup_steps":200}`,
		},
		{
			Name: "reward-model-v2-run-46", Status: StatusCompleted, AgeHours: 8, Duration: 4.2,
			Config: `{"model":"llama-13b","learning_rate":5e-6,"batch_size":16,"kl_coef":0.2,"optimizer":"adamw","max_steps":30000,"warmup_steps":1000}`,
		},
		{
			Name: "reward-model-v2-run-45", Status: StatusFailed, AgeHours: 12, Duration: 0.2,
			Config: `{"model":"llama-7b","learning_rate":1e-4,"batch_size":128,"kl_coef":0.01,"optimizer":"sgd","max_steps":10000,"warmup_steps":100}`,
		},
		{
			Name: "reward-model-v2-run-44", Status: StatusCompleted, AgeHours: 24, Duration: 3.97,
			Config: `{"model":"llama-7b","learning_rate":2e-5,"batch_size":32,"kl_coef":0.1,"optimizer":"adamw","max_steps":25000,"warmup_steps":750}`,
		},
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

		var pidPtr interface{}
		if pid != "" {
			pidPtr = pid
		}
		_, err := s.db.Exec(
			`INSERT INTO experiments (id, name, config, status, created_at, updated_at, project_id)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			id, seed.Name, seed.Config, seed.Status, createdAt, updatedAt, pidPtr,
		)
		if err != nil {
			return err
		}
	}

	return nil
}
