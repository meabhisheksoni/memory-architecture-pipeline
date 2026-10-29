-- Empire Audio Factory — Local PostgreSQL Schema
-- Auto-runs on first Docker container boot via docker-entrypoint-initdb.d

-- Enable pgvector for AI semantic search
CREATE EXTENSION IF NOT EXISTS vector;

-- EntityBox + vision data per unique idea
CREATE TABLE IF NOT EXISTS research_sessions (
    id           TEXT PRIMARY KEY,
    raw_idea     TEXT NOT NULL,
    rephrased    TEXT,
    improved     TEXT,
    vision       TEXT,
    bulletproof  TEXT,
    brand_name   TEXT,
    questions    JSONB,
    answers      JSONB,
    created_at   BIGINT NOT NULL,
    updated_at   BIGINT NOT NULL
);

-- 768-dim vector embeddings (Gemini Embedding 2) for semantic RAG
CREATE TABLE IF NOT EXISTS episode_embeddings (
    episode_id     TEXT PRIMARY KEY,
    session_id     TEXT,
    episode_number INTEGER NOT NULL,
    embedding      vector(768),
    title          TEXT,
    concept        TEXT,
    summary        TEXT,
    created_at     BIGINT NOT NULL
);

-- Full ProjectState JSONB backup
CREATE TABLE IF NOT EXISTS project_snapshots (
    project_key   TEXT PRIMARY KEY,
    snapshot      JSONB NOT NULL,
    episode_count INTEGER NOT NULL,
    saved_at      BIGINT NOT NULL,
    brand_name    TEXT,
    raw_idea      TEXT,
    stage         TEXT DEFAULT 'SETUP',
    target_count  INTEGER DEFAULT 10,
    config_hash   TEXT,
    status        TEXT DEFAULT 'active',
    created_at    BIGINT
);

-- Permanent research library
CREATE TABLE IF NOT EXISTS live_data_findings (
    id            TEXT PRIMARY KEY,
    session_id    TEXT,
    report_id     TEXT NOT NULL,
    headline      TEXT NOT NULL,
    topic         TEXT,
    strength      TEXT,
    status        TEXT DEFAULT 'unused',
    episode_angle TEXT,
    source        TEXT,
    source_date   TEXT,
    created_at    BIGINT NOT NULL
);

-- Agent log backup
CREATE TABLE IF NOT EXISTS run_transcripts (
    id           TEXT PRIMARY KEY,
    project_key  TEXT,
    transcript   JSONB NOT NULL,
    entry_count  INTEGER NOT NULL,
    started_at   BIGINT,
    ended_at     BIGINT NOT NULL
);

-- IVFFlat index for fast cosine similarity search
-- Note: This index requires at least some rows to exist; PostgreSQL handles this gracefully
CREATE INDEX IF NOT EXISTS idx_episode_embeddings_vector
ON episode_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- ═══════════════════════════════════════════════════════════════════════════
-- Layer 2: Backend Worker Job Queue
-- Transactional job tracking with strict state machine and crash recovery.
-- ═══════════════════════════════════════════════════════════════════════════

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

CREATE INDEX IF NOT EXISTS idx_jobs_status_created ON jobs (status, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_jobs_project_status ON jobs (project_id, status);
CREATE INDEX IF NOT EXISTS idx_jobs_heartbeat ON jobs (status, last_heartbeat) WHERE status = 'RUNNING';

-- Zombie reaper: marks orphaned RUNNING/QUEUED jobs on server restart
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

-- Auto-prune terminal jobs older than N days
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

-- ============================================================================
-- LAYER 1: MULTI-TIER MEMORY
-- ============================================================================

-- Creator Profiles: auto-learning creator tastes, banned clichés, feedback history
CREATE TABLE IF NOT EXISTS creator_profiles (
    project_id VARCHAR(255) PRIMARY KEY,
    creator_name VARCHAR(255) DEFAULT 'Creator',
    tone_preference TEXT DEFAULT 'Dynamic, Authoritative, High-Retention',
    banned_phrases JSONB DEFAULT '[]'::jsonb,
    primary_niches JSONB DEFAULT '[]'::jsonb,
    audience_dna JSONB DEFAULT '{"peakEngagement": "Cold Opens", "preferredLength": "10-15 mins"}'::jsonb,
    editorial_preferences JSONB DEFAULT '[]'::jsonb,
    feedback_history JSONB DEFAULT '[]'::jsonb,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    last_updated BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_last_updated
    ON creator_profiles (last_updated DESC);

-- Chekhov's Guns: multi-episode setup & payoff narrative tracker
CREATE TABLE IF NOT EXISTS chekhovs_guns (
    gun_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR(255) NOT NULL,
    planted_in_episode INTEGER NOT NULL,
    detail TEXT NOT NULL,
    potential_payoff TEXT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'planted'
        CHECK (status IN ('planted', 'detonated', 'archived')),
    detonated_in_episode INTEGER,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_chekhovs_project_status
    ON chekhovs_guns (project_id, status);

CREATE INDEX IF NOT EXISTS idx_chekhovs_planted_ep
    ON chekhovs_guns (project_id, planted_in_episode);

-- ============================================================================
-- LAYER 4: DIRECTOR REASONING & DYNAMIC SKILLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS episode_metadata (
    episode_id TEXT PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL DEFAULT 'default',
    episode_number INTEGER NOT NULL DEFAULT 1,
    title TEXT NOT NULL DEFAULT 'Untitled',
    director_reasoning JSONB DEFAULT NULL,
    applied_skills JSONB DEFAULT '[]'::jsonb,
    director_cost_tokens INTEGER DEFAULT 0,
    script_system_prompt_tokens INTEGER DEFAULT 0,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_episode_metadata_project
    ON episode_metadata (project_id, episode_number);

CREATE INDEX IF NOT EXISTS idx_episode_metadata_skills
    ON episode_metadata USING GIN (applied_skills);

-- ============================================================================
-- LAYER 3: GEPA EVOLUTION ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_traces (
    trace_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id             VARCHAR(255) NOT NULL,
    episode_number         INTEGER NOT NULL,
    project_id             VARCHAR(255) NOT NULL,
    agent_name             VARCHAR(100) NOT NULL,
    prompt_tokens          INTEGER NOT NULL DEFAULT 0,
    response_tokens        INTEGER NOT NULL DEFAULT 0,
    duration_ms            INTEGER NOT NULL DEFAULT 0,
    input_hash             VARCHAR(64) NOT NULL,
    llm_mentor_score       DECIMAL(5,2),
    human_score            DECIMAL(5,2),
    creator_anchor_score   DECIMAL(5,2),
    final_blended_score    DECIMAL(5,2) NOT NULL,
    skills_used            JSONB DEFAULT '[]'::jsonb,
    is_divergent           BOOLEAN DEFAULT FALSE,
    created_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traces_project_blended
    ON agent_traces (project_id, final_blended_score DESC)
    WHERE is_divergent IS FALSE;

CREATE INDEX IF NOT EXISTS idx_traces_episode_id
    ON agent_traces (episode_id);

CREATE INDEX IF NOT EXISTS idx_traces_created_at
    ON agent_traces (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_traces_skills_gin
    ON agent_traces USING GIN (skills_used);

CREATE TABLE IF NOT EXISTS skill_registry (
    skill_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name             VARCHAR(255) NOT NULL,
    project_id             VARCHAR(255) NOT NULL,
    status                 VARCHAR(50) NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft', 'testing', 'validated', 'reverted', 'archived')),
    confidence_score       DECIMAL(4,3) NOT NULL,
    baseline_avg           DECIMAL(5,2) NOT NULL,
    testing_avg            DECIMAL(5,2),
    performance_delta      DECIMAL(5,2),
    test_episodes_run      INTEGER DEFAULT 0,
    test_window_size       INTEGER DEFAULT 5,
    file_path              TEXT NOT NULL,
    pattern_evidence       TEXT,
    conflicts_with         JSONB DEFAULT '[]'::jsonb,
    discovered_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at           TIMESTAMP WITH TIME ZONE,
    reverted_at            TIMESTAMP WITH TIME ZONE,
    reverted_reason        TEXT,
    CONSTRAINT uq_project_skill UNIQUE (project_id, skill_name)
);

CREATE INDEX IF NOT EXISTS idx_skill_registry_status
    ON skill_registry (project_id, status);

CREATE TABLE IF NOT EXISTS gepa_circuit_breaker (
    project_id             VARCHAR(255) PRIMARY KEY,
    consecutive_failures   INTEGER DEFAULT 0,
    is_dormant             BOOLEAN DEFAULT FALSE,
    dormant_until_episode  INTEGER,
    last_failure_at        TIMESTAMP WITH TIME ZONE,
    last_success_at        TIMESTAMP WITH TIME ZONE,
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION prune_stale_gepa_traces()
RETURNS void AS $$
BEGIN
    DELETE FROM agent_traces
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Option D Hardening: Job deduplication + performance indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_one_active_per_project_type
    ON jobs (project_id, job_type)
    WHERE status IN ('QUEUED', 'RUNNING');

CREATE INDEX IF NOT EXISTS idx_jobs_project_type_status
    ON jobs (project_id, job_type, status);
