package database

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

// DB wraps a sql.DB connection with Flux-specific functionality.
type DB struct {
	*sql.DB
	path string
}

// Open creates or opens a SQLite database at the given path.
// It creates parent directories, applies pragmas, and runs migrations.
func Open(path string) (*DB, error) {
	// Create parent directory
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("creating database directory: %w", err)
	}

	// Open SQLite connection
	sqlDB, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("opening database: %w", err)
	}

	// Apply pragmas
	pragmas := []string{
		"PRAGMA journal_mode=WAL",
		"PRAGMA foreign_keys=ON",
		"PRAGMA busy_timeout=5000",
	}
	for _, pragma := range pragmas {
		if _, err := sqlDB.Exec(pragma); err != nil {
			sqlDB.Close()
			return nil, fmt.Errorf("applying %s: %w", pragma, err)
		}
	}

	db := &DB{DB: sqlDB, path: path}

	// Run migrations
	if err := db.Migrate(); err != nil {
		sqlDB.Close()
		return nil, fmt.Errorf("running migrations: %w", err)
	}

	return db, nil
}

// Path returns the filesystem path to the database file.
func (db *DB) Path() string {
	return db.path
}
