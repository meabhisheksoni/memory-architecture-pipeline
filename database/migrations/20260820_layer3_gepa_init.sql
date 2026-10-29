-- ============================================================================
-- LAYER 3: GEPA EVOLUTION ENGINE DATABASE FOUNDATION
--
-- Three tables:
--   1. agent_traces     — Telemetry for every LLM execution step
--   2. skill_registry   — Full lifecycle tracking of discovered skills
--   3. gepa_circuit_breaker — Prevents runaway self-degradation
--
-- SRE Principles: Strong CHECK constraints, concurrency-safe indexes,
-- non-blocking partial indexes, and automated entropy pruning.
-- ============================================================================

-- 1. Agent Traces — Per-episode execution telemetry with blended scoring
-- Every LLM call in the generation pipeline logs: tokens, latency, scores.
-- Blended scoring (mentor + human/anchor) prevents Goodhart's Law drift.
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

-- Partial index: only non-divergent traces for pattern extraction
CREATE INDEX IF NOT EXISTS idx_traces_project_blended
    ON agent_traces (project_id, final_blended_score DESC)
    WHERE is_divergent IS FALSE;

CREATE INDEX IF NOT EXISTS idx_traces_episode_id
    ON agent_traces (episode_id);

CREATE INDEX IF NOT EXISTS idx_traces_created_at
    ON agent_traces (created_at DESC);

-- GIN index for skill performance correlation (which skills → which scores)
CREATE INDEX IF NOT EXISTS idx_traces_skills_gin
    ON agent_traces USING GIN (skills_used);

-- 2. Skill Registry — Full lifecycle of GEPA-discovered skills
-- Tracks: discovery → testing → validated/reverted → archived
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

-- 3. GEPA Circuit Breaker — Prevents runaway self-degradation
-- If 3 consecutive skills fail, GEPA goes dormant for 50 episodes.
CREATE TABLE IF NOT EXISTS gepa_circuit_breaker (
    project_id             VARCHAR(255) PRIMARY KEY,
    consecutive_failures   INTEGER DEFAULT 0,
    is_dormant             BOOLEAN DEFAULT FALSE,
    dormant_until_episode  INTEGER,
    last_failure_at        TIMESTAMP WITH TIME ZONE,
    last_success_at        TIMESTAMP WITH TIME ZONE,
    updated_at             TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Automated Trace Pruning (Anti-Entropy: 90-day retention)
CREATE OR REPLACE FUNCTION prune_stale_gepa_traces()
RETURNS void AS $$
BEGIN
    DELETE FROM agent_traces
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
