-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 2: Job Tracking Foundation & Execution Resilience
-- Anti-Entropy: Hard limits on jsonb, strict state machine, auto-pruning.
-- ═══════════════════════════════════════════════════════════════════════════

-- pgcrypto fallback for PG < 16 (PG16+ has gen_random_uuid() natively)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Jobs Table — Transactional job queue backing the worker system.
-- State machine: QUEUED → RUNNING → COMPLETED|FAILED|CANCELLED
-- ZOMBIE is a server-detected anomaly state assigned during crash recovery.
CREATE TABLE IF NOT EXISTS jobs (
    job_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      VARCHAR(255) NOT NULL,
    job_type        VARCHAR(50) NOT NULL 
                    CHECK (job_type IN ('vision', 'blueprint', 'scripting', 'audio')),
    status          VARCHAR(50) NOT NULL DEFAULT 'QUEUED'
                    CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ZOMBIE')),
    payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
    result          JSONB,
    error_message   TEXT,
    progress        INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    progress_step   VARCHAR(255),
    worker_pid      INTEGER,
    tokens_used     INTEGER DEFAULT 0,
    duration_ms     INTEGER DEFAULT 0,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at      TIMESTAMP WITH TIME ZONE,
    completed_at    TIMESTAMP WITH TIME ZONE,
    last_heartbeat  TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Performance & Query Indices
-- Queue polling: Find next QUEUED job in FIFO order
CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs (status, created_at ASC);
-- Project dashboard: Show all jobs for a project
CREATE INDEX IF NOT EXISTS idx_jobs_project_status ON jobs (project_id, status);
-- Zombie reaper: Find RUNNING jobs with stale heartbeats
CREATE INDEX IF NOT EXISTS idx_jobs_heartbeat ON jobs (status, last_heartbeat) WHERE status = 'RUNNING';

-- 3. Auto-Pruning Function: Remove terminal jobs older than N days.
-- Prevents unbounded disk growth from completed/failed job records.
CREATE OR REPLACE FUNCTION prune_old_jobs(retention_days INT DEFAULT 14)
RETURNS INT AS $$
DECLARE
    deleted_count INT;
BEGIN
    DELETE FROM jobs
    WHERE status IN ('COMPLETED', 'FAILED', 'CANCELLED', 'ZOMBIE')
      AND created_at < NOW() - (retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Zombie Reaper Function: Called on server startup.
-- Any job that was QUEUED or RUNNING when the server crashed is now an orphan.
-- Mark them ZOMBIE so the UI can show the user what happened.
CREATE OR REPLACE FUNCTION reconcile_zombie_jobs()
RETURNS INT AS $$
DECLARE
    reaped_count INT;
BEGIN
    UPDATE jobs
    SET status = 'ZOMBIE',
        error_message = 'Process terminated during server restart or system crash',
        completed_at = NOW()
    WHERE status IN ('QUEUED', 'RUNNING');
    GET DIAGNOSTICS reaped_count = ROW_COUNT;
    RETURN reaped_count;
END;
$$ LANGUAGE plpgsql;
