-- Add ON DELETE CASCADE to all child tables referencing experiments.
-- SQLite does not support ALTER TABLE to modify foreign keys,
-- so we recreate each table with the correct constraint.

-- Events: recreate with CASCADE
CREATE TABLE events_new (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    data JSON,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);
INSERT INTO events_new SELECT * FROM events;
DROP TABLE events;
ALTER TABLE events_new RENAME TO events;
CREATE INDEX idx_events_experiment_id ON events(experiment_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Metrics: recreate with CASCADE
CREATE TABLE metrics_new (
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    PRIMARY KEY (experiment_id, step, name),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);
INSERT INTO metrics_new SELECT * FROM metrics;
DROP TABLE metrics;
ALTER TABLE metrics_new RENAME TO metrics;
CREATE INDEX idx_metrics_experiment_name ON metrics(experiment_id, name);

-- Reward signals: recreate with CASCADE
CREATE TABLE reward_signals_new (
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    component TEXT NOT NULL,
    value REAL NOT NULL,
    distribution JSON,
    PRIMARY KEY (experiment_id, step, component),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);
INSERT INTO reward_signals_new SELECT * FROM reward_signals;
DROP TABLE reward_signals;
ALTER TABLE reward_signals_new RENAME TO reward_signals;
CREATE INDEX idx_reward_signals_experiment ON reward_signals(experiment_id);

-- Alerts: recreate with CASCADE
CREATE TABLE alerts_new (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    type TEXT NOT NULL,
    step INTEGER NOT NULL,
    confidence REAL NOT NULL,
    data JSON,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id) ON DELETE CASCADE
);
INSERT INTO alerts_new SELECT * FROM alerts;
DROP TABLE alerts;
ALTER TABLE alerts_new RENAME TO alerts;
CREATE INDEX idx_alerts_experiment_id ON alerts(experiment_id);
CREATE INDEX idx_alerts_type ON alerts(type);
