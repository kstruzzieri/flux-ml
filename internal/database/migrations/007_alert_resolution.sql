ALTER TABLE alerts ADD COLUMN resolved_at INTEGER;

DROP INDEX IF EXISTS idx_alerts_open_experiment_type;

DELETE FROM alerts
WHERE acknowledged = 0
  AND resolved_at IS NULL
  AND id NOT IN (
    SELECT MAX(id)
    FROM alerts
    WHERE acknowledged = 0
      AND resolved_at IS NULL
    GROUP BY experiment_id, type
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_open_experiment_type
ON alerts(experiment_id, type)
WHERE acknowledged = 0 AND resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reward_signals_experiment_component_step
ON reward_signals(experiment_id, component, step);
