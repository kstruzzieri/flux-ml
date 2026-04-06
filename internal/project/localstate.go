package project

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
)

const maxRecentProjects = 20

// RecentProject is an entry in the recent-projects list.
type RecentProject struct {
	Path string `json:"path"`
	Name string `json:"name"`
}

// LocalState manages machine-local project state:
// recent-projects list and per-project state files.
// All paths are canonicalized before use.
type LocalState struct {
	dir string // root directory for state files
}

// NewLocalState creates a LocalState rooted at the given directory.
func NewLocalState(dir string) (*LocalState, error) {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating local state directory: %w", err)
	}
	return &LocalState{dir: dir}, nil
}

// RecentProjects returns the list of recently opened projects,
// most recent first.
func (ls *LocalState) RecentProjects() ([]RecentProject, error) {
	data, err := os.ReadFile(filepath.Join(ls.dir, "recent-projects.json"))
	if os.IsNotExist(err) {
		return []RecentProject{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reading recent projects: %w", err)
	}

	var recents []RecentProject
	if err := json.Unmarshal(data, &recents); err != nil {
		return nil, fmt.Errorf("parsing recent projects: %w", err)
	}
	return recents, nil
}

// AddRecentProject adds or moves a project to the top of the recent list.
// The path is canonicalized to prevent duplicates.
func (ls *LocalState) AddRecentProject(projectPath, name string) error {
	canonical, err := CanonicalProjectPath(projectPath)
	if err != nil {
		return fmt.Errorf("canonicalizing path: %w", err)
	}

	recents, err := ls.RecentProjects()
	if err != nil {
		return err
	}

	// Remove existing entry with same canonical path
	filtered := make([]RecentProject, 0, len(recents))
	for _, r := range recents {
		if r.Path != canonical {
			filtered = append(filtered, r)
		}
	}

	// Prepend new entry
	entry := RecentProject{Path: canonical, Name: name}
	filtered = append([]RecentProject{entry}, filtered...)

	// Enforce max
	if len(filtered) > maxRecentProjects {
		filtered = filtered[:maxRecentProjects]
	}

	return ls.writeJSON("recent-projects.json", filtered)
}

// GetProjectState returns the per-project state for the given path.
// The path is canonicalized before lookup.
func (ls *LocalState) GetProjectState(projectPath string) (map[string]interface{}, error) {
	canonical, err := CanonicalProjectPath(projectPath)
	if err != nil {
		return nil, fmt.Errorf("canonicalizing path: %w", err)
	}

	stateFile := filepath.Join(ls.dir, "projects", sanitizePath(canonical), "state.json")
	data, err := os.ReadFile(stateFile)
	if os.IsNotExist(err) {
		return map[string]interface{}{}, nil
	}
	if err != nil {
		return nil, fmt.Errorf("reading project state: %w", err)
	}

	var state map[string]interface{}
	if err := json.Unmarshal(data, &state); err != nil {
		return nil, fmt.Errorf("parsing project state: %w", err)
	}
	return state, nil
}

// SetProjectState saves per-project state for the given path.
// The path is canonicalized before use. Writes are atomic (temp+rename).
func (ls *LocalState) SetProjectState(projectPath string, state map[string]interface{}) error {
	canonical, err := CanonicalProjectPath(projectPath)
	if err != nil {
		return fmt.Errorf("canonicalizing path: %w", err)
	}

	stateDir := filepath.Join(ls.dir, "projects", sanitizePath(canonical))
	if err := os.MkdirAll(stateDir, 0755); err != nil {
		return fmt.Errorf("creating project state directory: %w", err)
	}

	return ls.writeJSON(filepath.Join("projects", sanitizePath(canonical), "state.json"), state)
}

// writeJSON atomically writes JSON data to a file relative to the state directory.
func (ls *LocalState) writeJSON(relPath string, data interface{}) error {
	target := filepath.Join(ls.dir, relPath)

	bytes, err := json.MarshalIndent(data, "", "  ")
	if err != nil {
		return fmt.Errorf("marshaling JSON: %w", err)
	}

	// Atomic write: temp file + rename
	tmp := target + ".tmp"
	if err := os.WriteFile(tmp, bytes, 0644); err != nil {
		return fmt.Errorf("writing temp file: %w", err)
	}
	if err := os.Rename(tmp, target); err != nil {
		os.Remove(tmp)
		return fmt.Errorf("renaming temp file: %w", err)
	}

	return nil
}

// sanitizePath converts a canonical path to a safe directory name
// using a hash. This avoids issues with path separators in filenames.
func sanitizePath(canonicalPath string) string {
	h := sha256.Sum256([]byte(canonicalPath))
	return hex.EncodeToString(h[:16])
}
