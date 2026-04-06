package project

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/kstruzzieri/flux-ml/internal/database"
)

// Project represents a registered Flux project.
type Project struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Path      string `json:"path"`
	CreatedAt int64  `json:"createdAt"`
	UpdatedAt int64  `json:"updatedAt"`
}

// Store provides CRUD operations for projects.
type Store struct {
	db *database.DB
}

// NewStore creates a new project store.
func NewStore(db *database.DB) *Store {
	return &Store{db: db}
}

// Create registers a new project with the given name and directory path.
// The path is canonicalized before storage to prevent duplicates.
func (s *Store) Create(name, path string) (*Project, error) {
	if name == "" {
		return nil, fmt.Errorf("project name cannot be empty")
	}
	if path == "" {
		return nil, fmt.Errorf("project path cannot be empty")
	}

	canonical, err := CanonicalProjectPath(path)
	if err != nil {
		return nil, fmt.Errorf("canonicalizing path: %w", err)
	}

	now := time.Now().Unix()
	id := uuid.New().String()

	_, err = s.db.Exec(
		`INSERT INTO projects (id, name, path, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?)`,
		id, name, canonical, now, now,
	)
	if err != nil {
		return nil, fmt.Errorf("inserting project: %w", err)
	}

	return &Project{
		ID:        id,
		Name:      name,
		Path:      canonical,
		CreatedAt: now,
		UpdatedAt: now,
	}, nil
}

// GetByID returns a project by its unique identifier.
func (s *Store) GetByID(id string) (*Project, error) {
	var p Project
	err := s.db.QueryRow(
		`SELECT id, name, path, created_at, updated_at FROM projects WHERE id = ?`, id,
	).Scan(&p.ID, &p.Name, &p.Path, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found: %s", id)
	}
	if err != nil {
		return nil, fmt.Errorf("querying project: %w", err)
	}
	return &p, nil
}

// GetByPath returns a project by its directory path.
// The input path is canonicalized before lookup.
func (s *Store) GetByPath(path string) (*Project, error) {
	canonical, err := CanonicalProjectPath(path)
	if err != nil {
		return nil, fmt.Errorf("canonicalizing path: %w", err)
	}

	var p Project
	err = s.db.QueryRow(
		`SELECT id, name, path, created_at, updated_at FROM projects WHERE path = ?`, canonical,
	).Scan(&p.ID, &p.Name, &p.Path, &p.CreatedAt, &p.UpdatedAt)
	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found at path: %s", canonical)
	}
	if err != nil {
		return nil, fmt.Errorf("querying project by path: %w", err)
	}
	return &p, nil
}

// List returns all projects ordered by creation time (newest first).
func (s *Store) List() ([]Project, error) {
	rows, err := s.db.Query(
		`SELECT id, name, path, created_at, updated_at FROM projects ORDER BY created_at DESC`,
	)
	if err != nil {
		return nil, fmt.Errorf("querying projects: %w", err)
	}
	defer rows.Close()

	projects := []Project{}
	for rows.Next() {
		var p Project
		if err := rows.Scan(&p.ID, &p.Name, &p.Path, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scanning project: %w", err)
		}
		projects = append(projects, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterating projects: %w", err)
	}
	return projects, nil
}

// Delete removes a project by ID. Returns an error if the project has
// experiments scoped to it — the caller must unscope or delete experiments first.
func (s *Store) Delete(id string) error {
	var count int
	err := s.db.QueryRow(
		`SELECT COUNT(*) FROM experiments WHERE project_id = ?`, id,
	).Scan(&count)
	if err != nil {
		return fmt.Errorf("checking scoped experiments: %w", err)
	}
	if count > 0 {
		return fmt.Errorf("cannot delete project with %d scoped experiment(s): unscope or delete them first", count)
	}

	result, err := s.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("deleting project: %w", err)
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("checking rows affected: %w", err)
	}
	if rows == 0 {
		return fmt.Errorf("project not found: %s", id)
	}
	return nil
}
