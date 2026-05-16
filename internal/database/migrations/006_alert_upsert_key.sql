-- Alert detections are evaluated repeatedly as metrics arrive. Keep one row
-- per open experiment/pattern so confidence and evidence can be refreshed
-- without creating one persisted alert per metric step.
DELETE FROM alerts
WHERE id NOT IN (
    SELECT MAX(id)
    FROM alerts
    GROUP BY experiment_id, type, step
);

DELETE FROM alerts
WHERE acknowledged = 0
  AND id NOT IN (
    SELECT MAX(id)
    FROM alerts
    WHERE acknowledged = 0
    GROUP BY experiment_id, type
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_open_experiment_type
ON alerts(experiment_id, type)
WHERE acknowledged = 0;
