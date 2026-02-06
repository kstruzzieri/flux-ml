package database

import "database/sql"

// DB wraps a sql.DB connection with Flux-specific functionality.
type DB struct {
	*sql.DB
	path string
}
