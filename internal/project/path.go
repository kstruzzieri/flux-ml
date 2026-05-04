package project

import (
	"fmt"
	"os"
	"path/filepath"
)

// CanonicalProjectPath returns a normalized, absolute, symlink-resolved path
// suitable for use as a stable project identity key.
//
// If the final path does not yet exist (e.g. scaffold target), the nearest
// existing parent is symlink-resolved and the missing suffix is appended.
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
			return resolveExistingParent(abs)
		}
		return "", fmt.Errorf("resolving symlinks: %w", err)
	}

	return resolved, nil
}

func resolveExistingParent(abs string) (string, error) {
	missingParts := []string{}
	candidate := abs

	for {
		resolved, err := filepath.EvalSymlinks(candidate)
		if err == nil {
			parts := append([]string{resolved}, missingParts...)
			return filepath.Join(parts...), nil
		}
		if !os.IsNotExist(err) {
			return "", fmt.Errorf("resolving symlinks: %w", err)
		}

		parent := filepath.Dir(candidate)
		if parent == candidate {
			return abs, nil
		}

		missingParts = append([]string{filepath.Base(candidate)}, missingParts...)
		candidate = parent
	}
}
