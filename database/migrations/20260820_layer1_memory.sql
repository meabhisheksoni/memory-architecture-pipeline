-- ============================================================================
-- LAYER 1 MULTI-TIER MEMORY SCHEMA
-- Provides persistent storage for creator preferences, Chekhov's guns,
-- and semantic continuity embeddings.
--
-- Depends: pgvector extension (included in pgvector/pgvector:pg16 Docker image)
-- Run:     docker exec -i empire_postgres psql -U empire -d empire_factory < server/db/migrations/20260820_layer1_memory.sql
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Creator Profiles: Auto-learning creator tastes, banned clichés, and feedback history
-- One row per project — upsert-safe via PRIMARY KEY on project_id.
-- All JSONB arrays are capped application-side to prevent unbounded row growth.
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

-- 2. Chekhov's Guns: Multi-episode setup & payoff narrative tracker
-- "Plant" a detail in episode N, "detonate" it in episode N+K for continuity.
-- Status CHECK constraint prevents invalid state transitions at DB level.
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

-- Composite index: most queries filter by project + active status
CREATE INDEX IF NOT EXISTS idx_chekhovs_project_status
    ON chekhovs_guns (project_id, status);

CREATE INDEX IF NOT EXISTS idx_chekhovs_planted_ep
    ON chekhovs_guns (project_id, planted_in_episode);

-- 3. Episode Embeddings: Semantic RAG index (768-dim for Gemini text-embedding-004)
-- Each episode gets a vector embedding of its concept+summary for similarity search.
-- Used by MemoryCurator (L1B) to find thematically related past episodes.
CREATE TABLE IF NOT EXISTS episode_embeddings (
    episode_id TEXT PRIMARY KEY,
    project_id VARCHAR(255) NOT NULL DEFAULT 'default',
    session_id TEXT,
    episode_number INTEGER NOT NULL,
    embedding vector(768) NOT NULL,
    title TEXT NOT NULL,
    concept TEXT NOT NULL,
    summary TEXT NOT NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_embeddings_project_ep
    ON episode_embeddings (project_id, episode_number);

-- IVFFlat index for fast cosine similarity search across episode embeddings
-- lists=20 is tuned for <1000 episodes per project (safe up to ~10K total rows)
CREATE INDEX IF NOT EXISTS idx_episode_embeddings_cosine
    ON episode_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 20);
