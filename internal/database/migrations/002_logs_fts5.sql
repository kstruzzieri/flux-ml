-- Full-text search on logs (FTS5)
-- This migration runs outside a transaction because CREATE VIRTUAL TABLE
-- is not transactional in all SQLite builds.
-- META:no_transaction
CREATE VIRTUAL TABLE IF NOT EXISTS logs USING fts5(
    experiment_id,
    content,
    level,
    category
);
