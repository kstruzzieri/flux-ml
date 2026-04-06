package project

import (
	"os"
	"path/filepath"
	"testing"
)

func TestIsProject_WithFluxYaml(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte("version: 1\nname: test"), 0644)

	if !IsProject(dir) {
		t.Error("IsProject should return true when flux.yaml exists")
	}
}

func TestIsProject_WithoutFluxYaml(t *testing.T) {
	dir := t.TempDir()
	if IsProject(dir) {
		t.Error("IsProject should return false when flux.yaml is absent")
	}
}

func TestReadConfigFile_Success(t *testing.T) {
	dir := t.TempDir()
	content := "version: 1\nname: my-project\n"
	os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte(content), 0644)

	data, err := ReadConfigFile(dir)
	if err != nil {
		t.Fatalf("ReadConfigFile failed: %v", err)
	}
	if string(data) != content {
		t.Errorf("content = %q, want %q", string(data), content)
	}
}

func TestReadConfigFile_Missing(t *testing.T) {
	dir := t.TempDir()
	_, err := ReadConfigFile(dir)
	if err == nil {
		t.Fatal("expected error for missing flux.yaml, got nil")
	}
}

func TestParseConfig_Valid(t *testing.T) {
	data := []byte("version: 1\nname: my-project\ndescription: A test project\n")
	cfg, warnings, err := ParseConfig(data)
	if err != nil {
		t.Fatalf("ParseConfig failed: %v", err)
	}
	if cfg.Name != "my-project" {
		t.Errorf("Name = %q, want %q", cfg.Name, "my-project")
	}
	if cfg.Version != 1 {
		t.Errorf("Version = %d, want 1", cfg.Version)
	}
	if cfg.Description != "A test project" {
		t.Errorf("Description = %q, want %q", cfg.Description, "A test project")
	}
	if len(warnings) != 0 {
		t.Errorf("unexpected warnings: %v", warnings)
	}
}

func TestParseConfig_InvalidYAML(t *testing.T) {
	data := []byte(":::\nnot: [valid yaml{")
	_, _, err := ParseConfig(data)
	if err == nil {
		t.Fatal("expected error for invalid YAML, got nil")
	}
}

func TestParseConfig_MissingVersion(t *testing.T) {
	data := []byte("name: my-project\n")
	cfg, _, err := ParseConfig(data)
	if err != nil {
		t.Fatalf("ParseConfig failed: %v", err)
	}
	if cfg.Version != 1 {
		t.Errorf("Version = %d, want 1 (default)", cfg.Version)
	}
}

func TestValidateConfig_MissingName(t *testing.T) {
	cfg := &FluxConfig{Version: 1}
	warnings := ValidateConfig(cfg)
	found := false
	for _, w := range warnings {
		if w == "missing required field: name" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected 'missing required field: name' warning, got %v", warnings)
	}
}

func TestValidateConfig_FutureVersion(t *testing.T) {
	cfg := &FluxConfig{Version: 99, Name: "test"}
	warnings := ValidateConfig(cfg)
	found := false
	for _, w := range warnings {
		if w == "unknown config version 99; some features may not work" {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("expected future version warning, got %v", warnings)
	}
}

func TestValidateConfig_Valid(t *testing.T) {
	cfg := &FluxConfig{Version: 1, Name: "test"}
	warnings := ValidateConfig(cfg)
	if len(warnings) != 0 {
		t.Errorf("unexpected warnings: %v", warnings)
	}
}

func TestLoadConfig_ValidFile(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte("version: 1\nname: test\n"), 0644)

	cfg, warnings, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig failed: %v", err)
	}
	if cfg.Name != "test" {
		t.Errorf("Name = %q, want %q", cfg.Name, "test")
	}
	if len(warnings) != 0 {
		t.Errorf("unexpected warnings: %v", warnings)
	}
}

func TestLoadConfig_MalformedFile(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "flux.yaml"), []byte(":::\ninvalid{yaml"), 0644)

	_, _, err := LoadConfig(dir)
	if err == nil {
		t.Fatal("expected error for malformed YAML, got nil")
	}
}

func TestWriteConfig_RoundTrip(t *testing.T) {
	dir := t.TempDir()
	cfg := &FluxConfig{
		Version:     1,
		Name:        "round-trip",
		Description: "Testing write/read",
	}

	err := WriteConfig(dir, cfg)
	if err != nil {
		t.Fatalf("WriteConfig failed: %v", err)
	}

	loaded, warnings, err := LoadConfig(dir)
	if err != nil {
		t.Fatalf("LoadConfig after write failed: %v", err)
	}
	if loaded.Name != cfg.Name {
		t.Errorf("Name = %q, want %q", loaded.Name, cfg.Name)
	}
	if loaded.Version != cfg.Version {
		t.Errorf("Version = %d, want %d", loaded.Version, cfg.Version)
	}
	if loaded.Description != cfg.Description {
		t.Errorf("Description = %q, want %q", loaded.Description, cfg.Description)
	}
	if len(warnings) != 0 {
		t.Errorf("unexpected warnings: %v", warnings)
	}
}

func TestBuildMinimalConfig(t *testing.T) {
	cfg := BuildMinimalConfig("imported-project")
	if cfg.Version != 1 {
		t.Errorf("Version = %d, want 1", cfg.Version)
	}
	if cfg.Name != "imported-project" {
		t.Errorf("Name = %q, want %q", cfg.Name, "imported-project")
	}
	if len(cfg.Ignore) == 0 {
		t.Error("expected conservative ignore list, got empty")
	}
}

func TestParseConfig_WithIgnoreAndDefaults(t *testing.T) {
	data := []byte(`
version: 1
name: full-project
ignore:
  - "*.pyc"
  - __pycache__
defaults:
  framework: pytorch
  python: "3.11"
`)
	cfg, warnings, err := ParseConfig(data)
	if err != nil {
		t.Fatalf("ParseConfig failed: %v", err)
	}
	if len(cfg.Ignore) != 2 {
		t.Errorf("Ignore length = %d, want 2", len(cfg.Ignore))
	}
	if cfg.Defaults["framework"] != "pytorch" {
		t.Errorf("Defaults[framework] = %q, want %q", cfg.Defaults["framework"], "pytorch")
	}
	if len(warnings) != 0 {
		t.Errorf("unexpected warnings: %v", warnings)
	}
}
