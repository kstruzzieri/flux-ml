package database

import (
	"os"
	"path/filepath"
	"testing"
)

func TestOpen_CreatesDatabase(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()
	if _, err := os.Stat(path); os.IsNotExist(err) {
		t.Fatal("database file was not created")
	}
}

func TestOpen_CreatesParentDirectory(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "nested", "dirs", "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()
	if _, err := os.Stat(filepath.Dir(path)); os.IsNotExist(err) {
		t.Fatal("parent directories were not created")
	}
}

func TestOpen_PragmasApplied(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()

	var journalMode string
	if err := db.QueryRow("PRAGMA journal_mode").Scan(&journalMode); err != nil {
		t.Fatalf("failed to query journal_mode: %v", err)
	}
	if journalMode != "wal" {
		t.Errorf("journal_mode = %q, want %q", journalMode, "wal")
	}

	var foreignKeys int
	if err := db.QueryRow("PRAGMA foreign_keys").Scan(&foreignKeys); err != nil {
		t.Fatalf("failed to query foreign_keys: %v", err)
	}
	if foreignKeys != 1 {
		t.Errorf("foreign_keys = %d, want 1", foreignKeys)
	}

	var busyTimeout int
	if err := db.QueryRow("PRAGMA busy_timeout").Scan(&busyTimeout); err != nil {
		t.Fatalf("failed to query busy_timeout: %v", err)
	}
	if busyTimeout != 5000 {
		t.Errorf("busy_timeout = %d, want 5000", busyTimeout)
	}
}

func TestOpen_RunsMigrations(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	defer db.Close()

	var name string
	err = db.QueryRow(
		"SELECT name FROM sqlite_master WHERE type='table' AND name='experiments'",
	).Scan(&name)
	if err != nil {
		t.Fatal("experiments table not found after Open — migrations did not run")
	}
}

func TestClose(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "test.db")
	db, err := Open(path)
	if err != nil {
		t.Fatalf("Open failed: %v", err)
	}
	if err := db.Close(); err != nil {
		t.Fatalf("Close failed: %v", err)
	}
}
