package database

import "embed"

//go:embed migrations/*.sql
var migrationsFS embed.FS

// Migrate applies all pending database migrations.
func (db *DB) Migrate() error {
	return nil // stub
}
