CREATE TABLE annotations (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    type TEXT NOT NULL,
    label TEXT NOT NULL DEFAULT '',
    data JSON,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);
CREATE INDEX idx_annotations_experiment_step ON annotations(experiment_id, step);
