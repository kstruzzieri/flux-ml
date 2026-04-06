package project

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/kstruzzieri/flux-ml/internal/database"
	"github.com/kstruzzieri/flux-ml/internal/experiment"
)

// helper: open a test database and return both stores
func newIntegrationStores(t *testing.T) (*Store, *experiment.Store) {
	t.Helper()
	dir := t.TempDir()
	dbPath := filepath.Join(dir, "test.db")
	db, err := database.Open(dbPath)
	if err != nil {
		t.Fatalf("failed to open test db: %v", err)
	}
	t.Cleanup(func() { db.Close() })
	return NewStore(db), experiment.NewStore(db)
}

func TestIntegration_FullWorkflow(t *testing.T) {
	projStore, expStore := newIntegrationStores(t)

	// 1. Scaffold a new project
	projDir := filepath.Join(t.TempDir(), "my-project")
	err := Scaffold(projDir, "my-project", "blank")
	if err != nil {
		t.Fatalf("Scaffold failed: %v", err)
	}

	// 2. Register and "open" the project
	proj, err := projStore.Create("my-project", projDir)
	if err != nil {
		t.Fatalf("Create project failed: %v", err)
	}

	// 3. Create scoped experiments
	exp1, err := expStore.CreateWithProject("scoped-1", `{}`, proj.ID)
	if err != nil {
		t.Fatalf("CreateWithProject failed: %v", err)
	}
	_, err = expStore.CreateWithProject("scoped-2", `{}`, proj.ID)
	if err != nil {
		t.Fatalf("CreateWithProject 2 failed: %v", err)
	}

	// 4. Create an unscoped experiment
	unscopedExp, err := expStore.Create("unscoped", `{}`)
	if err != nil {
		t.Fatalf("Create unscoped failed: %v", err)
	}

	// 5. Verify ListByProject returns only scoped
	scoped, err := expStore.ListByProject(proj.ID)
	if err != nil {
		t.Fatalf("ListByProject failed: %v", err)
	}
	if len(scoped) != 2 {
		t.Errorf("ListByProject: expected 2, got %d", len(scoped))
	}

	// 6. Verify List still returns all
	all, err := expStore.List()
	if err != nil {
		t.Fatalf("List failed: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("List: expected 3, got %d", len(all))
	}

	// 7. Verify ListUnscoped returns only unscoped
	unscoped, err := expStore.ListUnscoped()
	if err != nil {
		t.Fatalf("ListUnscoped failed: %v", err)
	}
	if len(unscoped) != 1 {
		t.Errorf("ListUnscoped: expected 1, got %d", len(unscoped))
	}

	// 8. Claim unscoped experiment into the project
	err = expStore.ClaimExperimentToProject(unscopedExp.ID, proj.ID)
	if err != nil {
		t.Fatalf("ClaimExperimentToProject failed: %v", err)
	}

	// 9. Verify claimed experiment is now scoped
	scoped2, _ := expStore.ListByProject(proj.ID)
	if len(scoped2) != 3 {
		t.Errorf("after claim: expected 3 scoped, got %d", len(scoped2))
	}
	unscoped2, _ := expStore.ListUnscoped()
	if len(unscoped2) != 0 {
		t.Errorf("after claim: expected 0 unscoped, got %d", len(unscoped2))
	}

	// 10. Verify project delete is blocked
	err = projStore.Delete(proj.ID)
	if err == nil {
		t.Fatal("expected error deleting project with scoped experiments")
	}

	// 11. Verify claim rejects already-scoped
	err = expStore.ClaimExperimentToProject(exp1.ID, proj.ID)
	if err == nil {
		t.Fatal("expected error claiming already-scoped experiment")
	}
}

func TestIntegration_ImportExistingFolder(t *testing.T) {
	projStore, _ := newIntegrationStores(t)
	dir := t.TempDir()

	// Folder has no flux.yaml
	if IsProject(dir) {
		t.Fatal("should not be a project yet")
	}

	// Write minimal config (import flow)
	cfg := BuildMinimalConfig("imported")
	err := WriteConfig(dir, cfg)
	if err != nil {
		t.Fatalf("WriteConfig failed: %v", err)
	}

	// Now it should be a project
	if !IsProject(dir) {
		t.Fatal("should be a project after writing flux.yaml")
	}

	// Register
	proj, err := projStore.Create("imported", dir)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}
	if proj.Name != "imported" {
		t.Errorf("Name = %q, want %q", proj.Name, "imported")
	}
}

func TestIntegration_DegradedOpenMode(t *testing.T) {
	dir := t.TempDir()
	// Write malformed YAML
	os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte(":::\ninvalid{yaml"), 0644)

	// IsProject should still return true (checks file presence only)
	if !IsProject(dir) {
		t.Fatal("IsProject should return true for malformed yaml")
	}

	// LoadConfig should fail
	_, _, err := LoadConfig(dir)
	if err == nil {
		t.Fatal("expected error loading malformed config")
	}

	// ReadConfigFile should succeed (returns raw bytes)
	data, err := ReadConfigFile(dir)
	if err != nil {
		t.Fatalf("ReadConfigFile should succeed: %v", err)
	}
	if len(data) == 0 {
		t.Error("ReadConfigFile returned empty data")
	}
}

func TestIntegration_CanonicalPathConsistency(t *testing.T) {
	projStore, _ := newIntegrationStores(t)
	stateDir := t.TempDir()
	ls, _ := NewLocalState(stateDir)

	dir := t.TempDir()

	// Create project with canonical path
	proj, err := projStore.Create("test", dir)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	// Look up with trailing slash
	got, err := projStore.GetByPath(dir + "/")
	if err != nil {
		t.Fatalf("GetByPath with trailing slash failed: %v", err)
	}
	if got.ID != proj.ID {
		t.Errorf("ID mismatch: %q != %q", got.ID, proj.ID)
	}

	// Add to recent projects
	ls.AddRecentProject(dir, "test")
	ls.AddRecentProject(dir+"/", "test") // should dedup

	recents, _ := ls.RecentProjects()
	if len(recents) != 1 {
		t.Errorf("expected 1 recent (deduped), got %d", len(recents))
	}

	// Per-project state
	ls.SetProjectState(dir, map[string]interface{}{"key": "value"})
	state, _ := ls.GetProjectState(dir + "/")
	if state["key"] != "value" {
		t.Error("per-project state not consistent across path variants")
	}
}

func TestIntegration_ScaffoldAndVerify(t *testing.T) {
	dir := filepath.Join(t.TempDir(), "scaffold-test")
	err := Scaffold(dir, "test-project", "blank")
	if err != nil {
		t.Fatalf("Scaffold failed: %v", err)
	}

	// Verify .gitignore exists (tests //go:embed all: working)
	gitignorePath := filepath.Join(dir, ".gitignore")
	info, err := os.Stat(gitignorePath)
	if err != nil {
		t.Fatalf(".gitignore missing: %v", err)
	}
	if info.Size() == 0 {
		t.Error(".gitignore is empty — embed may not be using all: prefix")
	}

	// Verify directories
	for _, d := range []string{"src", "configs", "data"} {
		dPath := filepath.Join(dir, d)
		stat, err := os.Stat(dPath)
		if err != nil {
			t.Errorf("directory %q missing: %v", d, err)
		} else if !stat.IsDir() {
			t.Errorf("%q is not a directory", d)
		}
	}

	// Verify flux.yaml has correct name
	cfg, _, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg.Name != "test-project" {
		t.Errorf("config name = %q, want %q", cfg.Name, "test-project")
	}
}
