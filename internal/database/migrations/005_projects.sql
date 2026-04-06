CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    path TEXT NOT NULL UNIQUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

ALTER TABLE experiments ADD COLUMN project_id TEXT REFERENCES projects(id);
CREATE INDEX idx_experiments_project ON experiments(project_id);
