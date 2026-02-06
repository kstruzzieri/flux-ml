-- Experiments
CREATE TABLE experiments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    config JSON,
    parent_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (parent_id) REFERENCES experiments(id)
);

CREATE INDEX idx_experiments_status ON experiments(status);
CREATE INDEX idx_experiments_created_at ON experiments(created_at);

-- Event sourcing
CREATE TABLE events (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    type TEXT NOT NULL,
    data JSON,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_events_experiment_id ON events(experiment_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_timestamp ON events(timestamp);

-- Metrics (denormalized for fast queries)
CREATE TABLE metrics (
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    name TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    PRIMARY KEY (experiment_id, step, name),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_metrics_experiment_name ON metrics(experiment_id, name);

-- Reward signals (specialized for RM work)
CREATE TABLE reward_signals (
    experiment_id TEXT NOT NULL,
    step INTEGER NOT NULL,
    component TEXT NOT NULL,
    value REAL NOT NULL,
    distribution JSON,
    PRIMARY KEY (experiment_id, step, component),
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_reward_signals_experiment ON reward_signals(experiment_id);

-- Alerts
CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    experiment_id TEXT NOT NULL,
    type TEXT NOT NULL,
    step INTEGER NOT NULL,
    confidence REAL NOT NULL,
    data JSON,
    acknowledged INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (experiment_id) REFERENCES experiments(id)
);

CREATE INDEX idx_alerts_experiment_id ON alerts(experiment_id);
CREATE INDEX idx_alerts_type ON alerts(type);
