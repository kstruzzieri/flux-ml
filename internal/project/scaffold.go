package project

import (
	"embed"
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

//go:embed all:templates
var templatesFS embed.FS

// ScaffoldOp describes a single filesystem operation in a scaffold plan.
type ScaffoldOp struct {
	Path   string `json:"path"`
	Action string `json:"action"` // "create", "mkdir", "conflict"
}

// validTemplates lists the available scaffold templates.
var validTemplates = map[string]bool{
	"blank":        true,
	"reward-model": true,
}

// PlanScaffold returns the list of operations that Scaffold would perform,
// without writing anything. Files that already exist in the target directory
// are marked as "conflict".
func PlanScaffold(dir, projectName, template string) ([]ScaffoldOp, error) {
	if !validTemplates[template] {
		return nil, fmt.Errorf("unknown template: %q", template)
	}

	templateRoot := "templates/" + template
	var ops []ScaffoldOp

	err := fs.WalkDir(templatesFS, templateRoot, func(path string, d fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		// Skip the template root itself
		rel, _ := filepath.Rel(templateRoot, path)
		if rel == "." {
			return nil
		}

		if d.IsDir() {
			action := "mkdir"
			if _, err := os.Stat(filepath.Join(dir, rel)); err == nil {
				action = "mkdir" // directories can merge
			}
			ops = append(ops, ScaffoldOp{Path: rel, Action: action})
			return nil
		}

		action := "create"
		if _, err := os.Stat(filepath.Join(dir, rel)); err == nil {
			action = "conflict"
		}
		ops = append(ops, ScaffoldOp{Path: rel, Action: action})
		return nil
	})
	if err != nil {
		return nil, fmt.Errorf("walking template %q: %w", template, err)
	}

	return ops, nil
}

// Scaffold creates a new project directory from the given template.
// It substitutes {{.Name}} in flux.yaml with the project name.
// Returns an error if any file conflicts would occur.
func Scaffold(dir, projectName, template string) error {
	ops, err := PlanScaffold(dir, projectName, template)
	if err != nil {
		return err
	}

	// Check for conflicts
	for _, op := range ops {
		if op.Action == "conflict" {
			return fmt.Errorf("scaffold conflict: %q already exists in %q", op.Path, dir)
		}
	}

	// Create target directory
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("creating project directory: %w", err)
	}

	templateRoot := "templates/" + template

	for _, op := range ops {
		targetPath := filepath.Join(dir, op.Path)

		switch op.Action {
		case "mkdir":
			if err := os.MkdirAll(targetPath, 0755); err != nil {
				return fmt.Errorf("creating directory %q: %w", op.Path, err)
			}

		case "create":
			data, err := templatesFS.ReadFile(templateRoot + "/" + op.Path)
			if err != nil {
				return fmt.Errorf("reading template file %q: %w", op.Path, err)
			}

			// Substitute {{.Name}} in flux.yaml
			if filepath.Base(op.Path) == "flux.yaml" {
				content := strings.ReplaceAll(string(data), "{{.Name}}", projectName)
				data = []byte(content)
			}

			// Ensure parent directory exists
			if err := os.MkdirAll(filepath.Dir(targetPath), 0755); err != nil {
				return fmt.Errorf("creating parent for %q: %w", op.Path, err)
			}

			if err := os.WriteFile(targetPath, data, 0644); err != nil {
				return fmt.Errorf("writing %q: %w", op.Path, err)
			}
		}
	}

	return nil
}
