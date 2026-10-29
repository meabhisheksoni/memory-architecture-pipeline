-- Option D Hardening: Job deduplication + performance indexes
-- Run: psql -U empire -d empire_factory -f server/db/migrations/20260822_option_d_hardening.sql

-- 1. Atomic job dedup — prevents TOCTOU race on double-click.
--    Only ONE job per (project_id, job_type) can be QUEUED or RUNNING at a time.
--    INSERT ... ON CONFLICT DO NOTHING uses this index.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_one_active_per_project_type
    ON jobs (project_id, job_type)
    WHERE status IN ('QUEUED', 'RUNNING');

-- 2. Composite index for the dedup fallback SELECT (when ON CONFLICT fires)
CREATE INDEX IF NOT EXISTS idx_jobs_project_type_status
    ON jobs (project_id, job_type, status);
