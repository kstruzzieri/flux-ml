package database

import (
	"database/sql"
	"embed"
	"fmt"
	"sort"
	"strings"
	"time"
)

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate applies all pending database migrations.
func (db *DB) Migrate() error {
	// Create schema_migrations table
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version TEXT PRIMARY KEY,
			applied_at INTEGER NOT NULL
		)
	`)
	if err != nil {
		return fmt.Errorf("creating schema_migrations: %w", err)
	}

	// Read all migration files
	entries, err := migrationsFS.ReadDir("migrations")
	if err != nil {
		return fmt.Errorf("reading migrations dir: %w", err)
	}

	// Sort by name (ensures order: 001_, 002_, etc.)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		name := entry.Name()
		version := strings.TrimSuffix(name, ".sql")

		// Check if already applied
		var exists string
		err := db.QueryRow(
			"SELECT version FROM schema_migrations WHERE version = ?", version,
		).Scan(&exists)
		if err == nil {
			continue // already applied
		}
		if err != sql.ErrNoRows {
			return fmt.Errorf("checking migration %s: %w", version, err)
		}

		// Read migration SQL
		content, err := migrationsFS.ReadFile("migrations/" + name)
		if err != nil {
			return fmt.Errorf("reading migration %s: %w", name, err)
		}

		sqlStr := string(content)

		// Check for no_transaction meta flag (needed for FTS5)
		if strings.Contains(sqlStr, "META:no_transaction") {
			if err := db.execMigrationNoTx(version, sqlStr); err != nil {
				return err
			}
		} else {
			if err := db.execMigrationTx(version, sqlStr); err != nil {
				return err
			}
		}
	}

	return nil
}

func (db *DB) execMigrationTx(version, sqlStr string) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("begin tx for %s: %w", version, err)
	}
	defer tx.Rollback()

	if _, err := tx.Exec(sqlStr); err != nil {
		return fmt.Errorf("executing migration %s: %w", version, err)
	}

	if _, err := tx.Exec(
		"INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
		version, time.Now().Unix(),
	); err != nil {
		return fmt.Errorf("recording migration %s: %w", version, err)
	}

	return tx.Commit()
}

func (db *DB) execMigrationNoTx(version, sqlStr string) error {
	if _, err := db.Exec(sqlStr); err != nil {
		return fmt.Errorf("executing migration %s: %w", version, err)
	}

	if _, err := db.Exec(
		"INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
		version, time.Now().Unix(),
	); err != nil {
		return fmt.Errorf("recording migration %s: %w", version, err)
	}

	return nil
}
