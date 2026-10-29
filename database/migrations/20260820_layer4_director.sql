-- ============================================================================
-- LAYER 4: DIRECTOR REASONING & DYNAMIC SKILLS SCHEMA
-- Tracks director reasoning, applied skills, and cost per episode.
--
-- Since episodes may not have a dedicated DB table yet (episode state lives
-- in project_snapshots JSONB), this creates a lightweight episode_metadata
-- table for director analytics. This is a forward-compatible table that
-- will be used when full episode persistence is implemented.
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

-- Fast retrieval of episodes that used the Director
CREATE INDEX IF NOT EXISTS idx_episode_metadata_project
    ON episode_metadata (project_id, episode_number);

-- GIN index on applied_skills for GEPA performance correlation analysis
CREATE INDEX IF NOT EXISTS idx_episode_metadata_skills
    ON episode_metadata USING GIN (applied_skills);

COMMENT ON TABLE episode_metadata IS 'Stores Director Agent reasoning and skill application data per episode for analytics and GEPA';
COMMENT ON COLUMN episode_metadata.director_reasoning IS 'Contains scratchpad reasoning, directorsOrders, and skill decisions from DirectorAgent';
COMMENT ON COLUMN episode_metadata.applied_skills IS 'JSON array of skill IDs dynamically injected into prompt composition';
