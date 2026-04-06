package project

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

const configFileName = "flux.yaml"

// FluxConfig represents the parsed contents of a flux.yaml file.
type FluxConfig struct {
	Version     int               `yaml:"version"     json:"version"`
	Name        string            `yaml:"name"        json:"name"`
	Description string            `yaml:"description" json:"description,omitempty"`
	Ignore      []string          `yaml:"ignore"      json:"ignore,omitempty"`
	Defaults    map[string]string `yaml:"defaults"    json:"defaults,omitempty"`
}

// IsProject returns true if the directory contains a flux.yaml file.
// It checks file presence only — it does not parse or validate.
func IsProject(dir string) bool {
	_, err := os.Stat(filepath.Join(dir, configFileName))
	return err == nil
}

// ReadConfigFile reads the raw bytes of flux.yaml from the given directory.
func ReadConfigFile(dir string) ([]byte, error) {
	data, err := os.ReadFile(filepath.Join(dir, configFileName))
	if err != nil {
		return nil, fmt.Errorf("reading %s: %w", configFileName, err)
	}
	return data, nil
}

// ParseConfig parses raw YAML bytes into a FluxConfig.
// It returns the config, any validation warnings, and any parse error.
// A parse error means the YAML itself is malformed. Warnings are semantic
// issues (missing fields, unknown version) that don't prevent loading.
func ParseConfig(data []byte) (*FluxConfig, []string, error) {
	var cfg FluxConfig
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, nil, fmt.Errorf("parsing %s: %w", configFileName, err)
	}

	// Default version to 1 when omitted
	if cfg.Version == 0 {
		cfg.Version = 1
	}

	warnings := ValidateConfig(&cfg)
	return &cfg, warnings, nil
}

// ValidateConfig checks a parsed config for semantic issues.
// Returns a list of human-readable warnings. An empty list means the config
// is fully valid.
func ValidateConfig(cfg *FluxConfig) []string {
	var warnings []string

	if cfg.Name == "" {
		warnings = append(warnings, "missing required field: name")
	}

	if cfg.Version > 1 {
		warnings = append(warnings, fmt.Sprintf("unknown config version %d; some features may not work", cfg.Version))
	}

	return warnings
}

// LoadConfig reads, parses, and validates flux.yaml from the given directory.
// This is the high-level convenience function that combines ReadConfigFile +
// ParseConfig. Returns the config, any warnings, and any error.
func LoadConfig(dir string) (*FluxConfig, []string, error) {
	data, err := ReadConfigFile(dir)
	if err != nil {
		return nil, nil, err
	}
	return ParseConfig(data)
}

// WriteConfig writes a FluxConfig to flux.yaml in the given directory.
func WriteConfig(dir string, cfg *FluxConfig) error {
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("marshaling config: %w", err)
	}
	return os.WriteFile(filepath.Join(dir, configFileName), data, 0644)
}

// BuildMinimalConfig creates a minimal FluxConfig suitable for importing
// an existing folder as a Flux project.
func BuildMinimalConfig(projectName string) *FluxConfig {
	return &FluxConfig{
		Version: 1,
		Name:    projectName,
		Ignore: []string{
			"__pycache__",
			"*.pyc",
			".venv",
			"node_modules",
			"*.egg-info",
			"dist",
			"build",
			".git",
		},
	}
}
