package project

import (
	"os"
	"path/filepath"
	"testing"
)

func TestPlanScaffold_Blank(t *testing.T) {
	dir := t.TempDir()
	ops, err := PlanScaffold(dir, "test-project", "blank")
	if err != nil {
		t.Fatalf("PlanScaffold failed: %v", err)
	}
	if len(ops) == 0 {
		t.Fatal("PlanScaffold returned no operations")
	}

	// Check that key files are planned
	paths := map[string]bool{}
	for _, op := range ops {
		paths[op.Path] = true
	}
	expected := []string{"flux.yaml", ".gitignore", "src", "configs", "data"}
	for _, p := range expected {
		if !paths[p] {
			t.Errorf("expected %q in plan, not found", p)
		}
	}
}

func TestPlanScaffold_RewardModel(t *testing.T) {
	dir := t.TempDir()
	ops, err := PlanScaffold(dir, "test-project", "reward-model")
	if err != nil {
		t.Fatalf("PlanScaffold failed: %v", err)
	}

	paths := map[string]bool{}
	for _, op := range ops {
		paths[op.Path] = true
	}
	expected := []string{"flux.yaml", ".gitignore", "configs/base.yaml", "src/train.py", "data", "checkpoints"}
	for _, p := range expected {
		if !paths[p] {
			t.Errorf("expected %q in plan, not found", p)
		}
	}
}

func TestPlanScaffold_UnknownTemplate(t *testing.T) {
	dir := t.TempDir()
	_, err := PlanScaffold(dir, "test", "nonexistent-template")
	if err == nil {
		t.Fatal("expected error for unknown template, got nil")
	}
}

func TestPlanScaffold_ConflictDetection(t *testing.T) {
	dir := t.TempDir()
	// Create a conflicting file
	os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte("existing"), 0644)

	ops, err := PlanScaffold(dir, "test", "blank")
	if err != nil {
		t.Fatalf("PlanScaffold failed: %v", err)
	}

	// flux.yaml should be marked as "conflict"
	for _, op := range ops {
		if op.Path == "flux.yaml" {
			if op.Action != "conflict" {
				t.Errorf("flux.yaml action = %q, want %q", op.Action, "conflict")
			}
			return
		}
	}
	t.Error("flux.yaml not found in scaffold plan")
}

func TestScaffold_Blank(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "new-project")

	err := Scaffold(dir, "my-project", "blank")
	if err != nil {
		t.Fatalf("Scaffold failed: %v", err)
	}

	// Verify key files exist
	checks := []string{
		"flux.yaml",
		".gitignore",
		filepath.Join("src", ".gitkeep"),
		filepath.Join("configs", ".gitkeep"),
		filepath.Join("data", ".gitkeep"),
	}
	for _, f := range checks {
		path := filepath.Join(dir, f)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			t.Errorf("expected file %q to exist after scaffold", f)
		}
	}

	// Verify flux.yaml has the project name substituted
	data, _ := os.ReadFile(filepath.Join(dir, "flux.yaml"))
	cfg, _, err := ParseConfig(data)
	if err != nil {
		t.Fatalf("ParseConfig failed: %v", err)
	}
	if cfg.Name != "my-project" {
		t.Errorf("scaffolded flux.yaml name = %q, want %q", cfg.Name, "my-project")
	}
}

func TestScaffold_RewardModel(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "rm-project")

	err := Scaffold(dir, "reward-test", "reward-model")
	if err != nil {
		t.Fatalf("Scaffold failed: %v", err)
	}

	checks := []string{
		"flux.yaml",
		".gitignore",
		filepath.Join("configs", "base.yaml"),
		filepath.Join("src", "train.py"),
		filepath.Join("data", ".gitkeep"),
		filepath.Join("checkpoints", ".gitkeep"),
	}
	for _, f := range checks {
		path := filepath.Join(dir, f)
		if _, err := os.Stat(path); os.IsNotExist(err) {
			t.Errorf("expected file %q to exist after scaffold", f)
		}
	}
}

func TestScaffold_GitignorePresent(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "project")
	Scaffold(dir, "test", "blank")

	path := filepath.Join(dir, ".gitignore")
	info, err := os.Stat(path)
	if err != nil {
		t.Fatalf(".gitignore not found: %v", err)
	}
	if info.Size() == 0 {
		t.Error(".gitignore is empty")
	}
}

func TestScaffold_RefusesConflict(t *testing.T) {
	dir := t.TempDir()
	// Create a conflicting file
	os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte("existing"), 0644)

	err := Scaffold(dir, "test", "blank")
	if err == nil {
		t.Fatal("expected error for conflicting files, got nil")
	}
}

func TestScaffold_UnknownTemplate(t *testing.T) {
	dir := t.TempDir()
	err := Scaffold(dir, "test", "nonexistent")
	if err == nil {
		t.Fatal("expected error for unknown template, got nil")
	}
}
