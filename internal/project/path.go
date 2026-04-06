package project

import (
	"fmt"
	"os"
	"path/filepath"
)

// CanonicalProjectPath returns a normalized, absolute, symlink-resolved path
// suitable for use as a stable project identity key.
//
// If the path does not yet exist (e.g. scaffold target), EvalSymlinks will fail
// and we fall back to the cleaned absolute path.
func CanonicalProjectPath(path string) (string, error) {
	if path == "" {
		return "", fmt.Errorf("project path cannot be empty")
	}

	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolving absolute path: %w", err)
	}
	abs = filepath.Clean(abs)

	resolved, err := filepath.EvalSymlinks(abs)
	if err != nil {
		if os.IsNotExist(err) {
			return abs, nil
		}
		return "", fmt.Errorf("resolving symlinks: %w", err)
	}

	return resolved, nil
}
