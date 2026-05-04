package project

import (
	"os"
	"path/filepath"
	"testing"
)

func newTestLocalState(t *testing.T) *LocalState {
	t.Helper()
	dir := t.TempDir()
	ls, err := NewLocalState(dir)
	if err != nil {
		t.Fatalf("NewLocalState failed: %v", err)
	}
	return ls
}

func TestRecentProjects_RoundTrip(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()

	err := ls.AddRecentProject(dir, "my-project")
	if err != nil {
		t.Fatalf("AddRecentProject failed: %v", err)
	}

	recents, err := ls.RecentProjects()
	if err != nil {
		t.Fatalf("RecentProjects failed: %v", err)
	}
	if len(recents) != 1 {
		t.Fatalf("expected 1 recent project, got %d", len(recents))
	}
	if recents[0].Name != "my-project" {
		t.Errorf("Name = %q, want %q", recents[0].Name, "my-project")
	}
	if !filepath.IsAbs(recents[0].Path) {
		t.Errorf("Path %q is not absolute", recents[0].Path)
	}
}

func TestRecentProjects_DuplicateMovesToTop(t *testing.T) {
	ls := newTestLocalState(t)
	dir1 := t.TempDir()
	dir2 := t.TempDir()

	ls.AddRecentProject(dir1, "project-1")
	ls.AddRecentProject(dir2, "project-2")
	ls.AddRecentProject(dir1, "project-1") // re-add dir1

	recents, _ := ls.RecentProjects()
	if len(recents) != 2 {
		t.Fatalf("expected 2 recent projects, got %d", len(recents))
	}
	// dir1 should be first (most recent)
	canonical1, _ := CanonicalProjectPath(dir1)
	if recents[0].Path != canonical1 {
		t.Errorf("first recent = %q, want %q", recents[0].Path, canonical1)
	}
}

func TestRecentProjects_DuplicateAfterCanonicalization(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()

	ls.AddRecentProject(dir, "project")
	ls.AddRecentProject(dir+"/", "project") // trailing slash

	recents, _ := ls.RecentProjects()
	if len(recents) != 1 {
		t.Errorf("expected 1 (deduped), got %d", len(recents))
	}
}

func TestRecentProjects_MaxEntries(t *testing.T) {
	ls := newTestLocalState(t)
	// Add more than maxRecentProjects
	for i := 0; i < maxRecentProjects+5; i++ {
		dir := t.TempDir()
		ls.AddRecentProject(dir, "project")
	}

	recents, _ := ls.RecentProjects()
	if len(recents) > maxRecentProjects {
		t.Errorf("expected at most %d, got %d", maxRecentProjects, len(recents))
	}
}

func TestProjectState_RoundTrip(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()

	state := map[string]interface{}{
		"lastOpenFile": "src/train.py",
		"scrollPos":    42.0,
	}
	err := ls.SetProjectState(dir, state)
	if err != nil {
		t.Fatalf("SetProjectState failed: %v", err)
	}

	got, err := ls.GetProjectState(dir)
	if err != nil {
		t.Fatalf("GetProjectState failed: %v", err)
	}
	if got["lastOpenFile"] != "src/train.py" {
		t.Errorf("lastOpenFile = %v, want %q", got["lastOpenFile"], "src/train.py")
	}
}

func TestProjectState_CanonicalPathKey(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()

	state := map[string]interface{}{"key": "value"}
	ls.SetProjectState(dir, state)

	// Read back with trailing slash — should resolve to the same state
	got, err := ls.GetProjectState(dir + "/")
	if err != nil {
		t.Fatalf("GetProjectState failed: %v", err)
	}
	if got["key"] != "value" {
		t.Errorf("state not found via trailing-slash path")
	}
}

func TestProjectState_CorruptJSON(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()

	// Write corrupt JSON to the state file
	canonical, _ := CanonicalProjectPath(dir)
	stateDir := filepath.Join(ls.dir, "projects", sanitizePath(canonical))
	os.MkdirAll(stateDir, 0755)
	os.WriteFile(filepath.Join(stateDir, "state.json"), []byte("{corrupt"), 0644)

	_, err := ls.GetProjectState(dir)
	if err == nil {
		t.Fatal("expected error for corrupt JSON, got nil")
	}
}

func TestRecentProjects_Empty(t *testing.T) {
	ls := newTestLocalState(t)
	recents, err := ls.RecentProjects()
	if err != nil {
		t.Fatalf("RecentProjects failed: %v", err)
	}
	if recents == nil {
		t.Fatal("RecentProjects returned nil, want empty slice")
	}
	if len(recents) != 0 {
		t.Errorf("expected 0, got %d", len(recents))
	}
}

func TestRemoveRecentProject(t *testing.T) {
	ls := newTestLocalState(t)
	dir1 := t.TempDir()
	dir2 := t.TempDir()

	ls.AddRecentProject(dir1, "project-1")
	ls.AddRecentProject(dir2, "project-2")

	err := ls.RemoveRecentProject(dir1)
	if err != nil {
		t.Fatalf("RemoveRecentProject failed: %v", err)
	}

	recents, _ := ls.RecentProjects()
	if len(recents) != 1 {
		t.Fatalf("expected 1 recent project after removal, got %d", len(recents))
	}
	canonical2, _ := CanonicalProjectPath(dir2)
	if recents[0].Path != canonical2 {
		t.Errorf("remaining project = %q, want %q", recents[0].Path, canonical2)
	}
}

func TestRemoveRecentProject_NotFound(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()
	ls.AddRecentProject(dir, "project")

	// Remove a path that doesn't exist in recents — should succeed silently
	err := ls.RemoveRecentProject(t.TempDir())
	if err != nil {
		t.Fatalf("RemoveRecentProject for non-existent entry should not error: %v", err)
	}

	recents, _ := ls.RecentProjects()
	if len(recents) != 1 {
		t.Errorf("expected 1 (unchanged), got %d", len(recents))
	}
}

func TestRemoveRecentProject_EmptyList(t *testing.T) {
	ls := newTestLocalState(t)
	err := ls.RemoveRecentProject(t.TempDir())
	if err != nil {
		t.Fatalf("unexpected error on empty list: %v", err)
	}
	recents, _ := ls.RecentProjects()
	if len(recents) != 0 {
		t.Errorf("expected 0, got %d", len(recents))
	}
}

func TestRemoveRecentProject_Canonicalizes(t *testing.T) {
	ls := newTestLocalState(t)
	dir := t.TempDir()
	ls.AddRecentProject(dir, "project")

	// Remove using trailing-slash variant
	err := ls.RemoveRecentProject(dir + "/")
	if err != nil {
		t.Fatalf("RemoveRecentProject failed: %v", err)
	}

	recents, _ := ls.RecentProjects()
	if len(recents) != 0 {
		t.Errorf("expected 0 after removal via trailing-slash path, got %d", len(recents))
	}
}
