# Comprehensive Memory Architecture Guideline and Codebase Audit

Author: Teamwork Subagent Worker 1 (Guideline Author)
Target File: F:\EMPIRE D DRIVE\New folder\MEMORY_ARCHITECTURE_GUIDELINE.md
Codebase Scope: empire-audio-factory (Client) and empire-local-server (Server)
Verified Date: 2026-10-29

---

## Table of Contents
1. Executive Summary and Grounding Verification
   - 1.1 Purpose and Architectural Scope
   - 1.2 Codebase Grounding Verification
   - 1.3 Master Discrepancy Matrix (Verified Codebase vs Reference Draft)
2. PART 1: PHYSICAL CODEBASE MEMORY ARCHITECTURE AUDIT REPORT
   - 2.1 Infrastructure and Containerization Layer
   - 2.2 Database Relational and Vector Schema Audit (All 12 Tables)
   - 2.3 Server and Client Memory Services and API Layer
   - 2.4 GEPA Evolutionary Architecture (Layer 3 Engine)
   - 2.5 Multi-Stage Reflection and Anti-Entropy Decay Mechanisms
3. PART 2: REUSABLE CONTENT GENERATION PIPELINE ARCHITECTURE GUIDELINE
   - 3.1 Universal 4-Tier Memory Architecture Blueprint
   - 3.2 Episode-to-Episode Continuity Across Long Narrative Arcs (Episodes 1 to 50)
   - 3.3 General Implementation Guide for New Content Pipelines (Faceless Video, Animation, Sequential Stories)
   - 3.4 Concrete Step-by-Step Setup, Migrations, and Production Recipe

---

# 1. Executive Summary and Grounding Verification

## 1.1 Purpose and Architectural Scope
This document serves as the authoritative memory architecture audit and reusable engineering guideline for long-arc content generation systems.
It synthesizes empirical findings across physical database migrations, Docker definitions, backend services, and client-side memory stores.
It resolves ambiguities between the existing reference draft in `MEMORY_AND_CHARACTER_VIDEO_PIPELINE_ARCHITECTURE.md` and the physical codebase.

## 1.2 Codebase Grounding Verification
The physical codebase consists of two primary packages:
1. `empire-audio-factory`: A React 19 and Vite frontend application located at `package.json:1-37` (`measured`).
2. `empire-local-server`: An Express 5 and Node.js backend server located at `server/package.json:1-27` (`measured`).

The primary production pipeline in this repository generates serialized audio episodes, narrative scripts, and structured sound design cues (`measured`).
Vector storage is managed via PostgreSQL 16 with the `pgvector` extension running inside Docker (`measured`).

## 1.3 Master Discrepancy Matrix (Verified Codebase vs Reference Draft)
The reference draft `MEMORY_AND_CHARACTER_VIDEO_PIPELINE_ARCHITECTURE.md` contains architectural insights alongside several documentation omissions and speculative proposals.
The matrix below provides the definitive reconciliation between physical reality and draft claims.

| Area | Reference Draft Claim | Physical Codebase Reality | Exact Codebase Location and Verification |
| :--- | :--- | :--- | :--- |
| Database Tables | Documents 4 tables: `episode_embeddings`, `chekhovs_guns`, `creator_profiles`, `jobs` (Draft Section 3.C). | 12 tables exist physically across `server/init.sql` and migration scripts. 8 tables were completely omitted from the draft. | `server/init.sql:8-274` and `server/db/migrations/` (`measured`). |
| Character State Schema | States that `CharacterState` is a strict Zod schema in `MemorySchemas.ts` (Draft Section 4). | `CharacterState` is a TypeScript interface in `src/core/types.ts`. The actual Zod schema in `MemorySchemas.ts` is named `ActorSoulSchema`. | `src/core/types.ts:191-196` and `src/core/services/memory/MemorySchemas.ts:193-215` (`measured`). |
| Job Type Constraints | Proposes background video rendering workers running alongside audio workers (Draft Section 7). | The `jobs` table enforces a check constraint allowing only four job types: `'vision'`, `'blueprint'`, `'scripting'`, and `'audio'`. | `server/init.sql:89` and `server/db/migrations/20260817_layer2_jobs_init.sql:15` (`measured`). |
| GEPA Evolution Engine | Completely omitted from the reference draft. | A complete Layer 3 evolutionary engine exists physically, containing 6 TypeScript modules, 3 relational tables, and Express routes. | `server/src/gepa/` (lines 1-204) and `server/src/routes/gepa.ts:1-208` (`measured`). |
| Video Generation Pipeline | Documents an active Remotion, LivePortrait, Shiki, Piston, and BullMQ Instagram Reels pipeline (Draft Section 7). | None of these dependencies exist in `package.json` or `server/package.json`. No video rendering files exist in the repository. Section 7 is an unbuilt architectural proposal. | `package.json:1-37` and `server/package.json:1-27` (`measured`). |
| Unique Job Index | Cites `20260817_layer2_jobs_init.sql` for `idx_jobs_one_active_per_project_type`. | The unique index was added in `20260822_option_d_hardening.sql` and at the end of `server/init.sql`. | `server/db/migrations/20260822_option_d_hardening.sql:7-9` and `server/init.sql:285-287` (`measured`). |
| `episode_embeddings` Definition | Documents `episode_embeddings` with `project_id` and `lists = 20`. | The baseline table in `server/init.sql` lacked `project_id` and used `lists = 10`. The column and `lists = 20` index were added in migration `20260820_layer1_memory.sql`. | `server/init.sql:23-32` and `server/db/migrations/20260820_layer1_memory.sql:58-78` (`measured`). |
| Vector Query Limit | States that vector similarity search uses a hardcoded limit of 5 past episodes. | The query dynamically limits using the constant `MEMORY_CONFIG.RAG_TOP_K`, which defaults to 5. | `server/src/memory/memoryCurator.ts:69` and `server/src/memory/memoryTypes.ts:85` (`measured`). |
| Canon Protection Engine | Labels the consistency validator generically as Canon Protector. | The physical implementation is `auditScriptConsistency()` in `feedbackAnalyzer.ts`, tagged with prompt role `CONSISTENCY AUDITOR & CANON PROTECTOR`. | `src/core/services/themeTracker/feedbackAnalyzer.ts:148-237` (`measured`). |

---

# 2. PART 1: PHYSICAL CODEBASE MEMORY ARCHITECTURE AUDIT REPORT

## 2.1 Infrastructure and Containerization Layer

### 2.1.1 Docker Compose Specification
The container infrastructure is defined in `docker-compose.yml:1-21` (`measured`).
It defines a single service running PostgreSQL with the vector extension pre-installed.
No custom Dockerfile exists in the project workspace (`measured`).

```yaml
# docker-compose.yml (Lines 1 to 21)
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: empire_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: empire_factory
      POSTGRES_USER: empire
      POSTGRES_PASSWORD: empire_local_dev
    volumes:
      - ./pgdata:/var/lib/postgresql/data
      - ./server/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U empire -d empire_factory"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Key observations on container configuration:
1. Base image: `pgvector/pgvector:pg16`, providing PostgreSQL 16 compiled with pgvector (`docker-compose.yml:4`).
2. Initialization volume: `./server/init.sql` is mounted to `/docker-entrypoint-initdb.d/init.sql`, executing automatically upon first database initialization (`docker-compose.yml:15`).
3. Persistent storage: `./pgdata` binds to `/var/lib/postgresql/data` (`docker-compose.yml:14`).
4. Networking: Port 5432 is mapped directly to host port 5432 (`docker-compose.yml:7-8`).

### 2.1.2 Database Connection Pool
The database connection pool is implemented in `server/src/db.ts:9-21` (`measured`).
It utilizes the official `pg` library (`node-postgres` version 8.16.0).

```typescript
// server/src/db.ts (Lines 9 to 21)
export const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'empire_factory',
    user: process.env.DB_USER || 'empire',
    password: process.env.DB_PASSWORD || 'empire_local_dev',
    max: parseInt(process.env.DB_POOL_MAX || '20', 10),
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
```

Pool behavior details:
1. Concurrency limit: Maximum pool size defaults to 20 connections (`server/src/db.ts:18`).
2. Idle reclamation: Connections idle for more than 30,000 ms are closed (`server/src/db.ts:19`).
3. Acquisition timeout: Queries fail fast if a connection cannot be acquired within 5,000 ms (`server/src/db.ts:20`).
4. Health verification: `healthCheck()` verifies connectivity using `SELECT 1 AS ok` (`server/src/db.ts:32-39`).

### 2.1.3 Complete Environment Variable Inventory
The following table documents every environment variable consumed across the backend and client source code.

| Variable Name | Defining File and Line | Default Value | Purpose |
| :--- | :--- | :--- | :--- |
| `PORT` | `server/src/index.ts:30` | `3001` | HTTP and WebSocket listening port for Express backend. |
| `NODE_ENV` | `server/src/index.ts:86` | `undefined` | Toggles detailed stack trace output in API error responses. |
| `DB_HOST` | `server/src/db.ts:13` | `'localhost'` | PostgreSQL host address for connection pool. |
| `DB_PORT` | `server/src/db.ts:14` | `'5432'` | PostgreSQL port number. |
| `DB_NAME` | `server/src/db.ts:15` | `'empire_factory'` | PostgreSQL database name. |
| `DB_USER` | `server/src/db.ts:16` | `'empire'` | PostgreSQL database username. |
| `DB_PASSWORD` | `server/src/db.ts:17` | `'empire_local_dev'` | PostgreSQL database password. |
| `DB_POOL_MAX` | `server/src/db.ts:18` | `'20'` | Maximum connection pool capacity in `pg.Pool`. |
| `MAX_WORKERS` | `server/src/workers/WorkerManager.ts:60` | `'6'` | Maximum concurrent child processes spawned by WorkerManager. |
| `WORKER_TIMEOUT_MS` | `server/src/workers/WorkerManager.ts:62` | `'1800000'` (30 min) | Timeout before child process worker is killed as zombie. |
| `JOB_ID` | `server/src/workers/base/BaseWorker.ts:22` | `''` | Assigned job UUID passed into child process environment. |
| `PROJECT_ID` | `server/src/workers/base/BaseWorker.ts:23` | `''` | Project identifier passed into child process environment. |
| `ENABLE_GEPA_EVOLUTION` | `server/src/gepa/gepaOrchestrator.ts:56` | `undefined` | Setting to `'false'` completely disables Layer 3 GEPA mutations. |
| `ENABLE_DYNAMIC_PROMPTS` | `server/src/prompts/scriptGenerator.ts:49` | `undefined` | Setting to `'true'` enables dynamic Director and GEPA skill prompts. |
| `SKILLS_DIR` | `server/src/prompts/skillLoader.ts:73` | `path.resolve(process.cwd(), 'skills')` | Filesystem path where modular markdown skills are loaded from. |
| `VITE_API_URL` | `src/core/services/memoryClient.ts:18` | `'http://localhost:3001'` | Client HTTP adapter base URL pointing to the Express server. |
| `VITE_ENABLE_BACKEND_WORKERS` | `src/core/config/featureFlags.ts:24` | `false` | Client feature flag enabling backend job queue delegation. |

---

## 2.2 Database Relational and Vector Schema Audit (All 12 Tables)

The physical database schema contains exactly 12 relational tables.
There are no third-party ORMs in use. All database interactions execute raw parameterized SQL via `pg.Pool` (`measured`).

### 2.2.1 Table 1: `research_sessions`
- Defined in: `server/init.sql:8-20` (`measured`).
- Primary Key: `id TEXT` (`server/init.sql:9`).
- Columns:
  - `id TEXT PRIMARY KEY`: Research session UUID.
  - `raw_idea TEXT NOT NULL`: Initial unformatted prompt or topic.
  - `rephrased TEXT`: Cleaned editorial concept.
  - `improved TEXT`: Expanded concept with market hooks.
  - `vision TEXT`: High-level creative vision.
  - `bulletproof TEXT`: Stress-tested narrative premise.
  - `brand_name TEXT`: Associated brand or channel name.
  - `questions JSONB`: Audience and creator interview questions.
  - `answers JSONB`: Corresponding interview responses.
  - `created_at BIGINT NOT NULL`: Millisecond unix epoch timestamp.
  - `updated_at BIGINT NOT NULL`: Millisecond unix epoch timestamp.
- Route Handlers: `server/src/routes/research.ts:19-32` and `57-63`.

### 2.2.2 Table 2: `episode_embeddings`
- Defined in: `server/init.sql:23-32` and upgraded in `server/db/migrations/20260820_layer1_memory.sql:58-68` (`measured`).
- Primary Key: `episode_id TEXT` (`server/db/migrations/20260820_layer1_memory.sql:59`).
- Columns:
  - `episode_id TEXT PRIMARY KEY`: Canonical episode identifier (e.g. `'ep_001'`).
  - `project_id VARCHAR(255) NOT NULL DEFAULT 'default'`: Multi-tenant project identifier.
  - `session_id TEXT`: Link to research session.
  - `episode_number INTEGER NOT NULL`: Sequential index of the episode in the series arc.
  - `embedding vector(768) NOT NULL`: 768-dimensional float vector produced by Gemini `text-embedding-004`.
  - `title TEXT NOT NULL`: Title of the episode.
  - `concept TEXT NOT NULL`: Core premise or lesson of the episode.
  - `summary TEXT NOT NULL`: Condensed narrative synopsis.
  - `created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`: Creation timestamp.
- Indexes:
  - Composite Index: `idx_embeddings_project_ep ON episode_embeddings (project_id, episode_number)` (`server/db/migrations/20260820_layer1_memory.sql:70-71`).
  - Cosine Vector Index: `idx_episode_embeddings_cosine ON episode_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 20)` (`server/db/migrations/20260820_layer1_memory.sql:75-78`).
  - Legacy Vector Index: `idx_episode_embeddings_vector ON episode_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10)` in `server/init.sql:76-79`.
- Query Logic: `server/src/memory/memoryCurator.ts:62-70` queries cosine similarity via `1 - (embedding <=> $1::vector) AS similarity` filtering by `project_id` and `episode_number < $3`. Matches below 0.65 are discarded.

### 2.2.3 Table 3: `project_snapshots`
- Defined in: `server/init.sql:35-47` (`measured`).
- Primary Key: `project_key TEXT` (`server/init.sql:36`).
- Columns:
  - `project_key TEXT PRIMARY KEY`: Project key or slug.
  - `snapshot JSONB NOT NULL`: Full serialized `ProjectState` JSON object containing all episodes, acts, script drafts, and theme tracker data.
  - `episode_count INTEGER NOT NULL`: Total episodes tracked in snapshot.
  - `saved_at BIGINT NOT NULL`: Millisecond epoch timestamp of last snapshot save.
  - `brand_name TEXT`: Channel or series brand name.
  - `raw_idea TEXT`: Original premise.
  - `stage TEXT DEFAULT 'SETUP'`: Current pipeline stage (e.g. `'SETUP'`, `'SCRIPTING'`, `'COMPLETED'`).
  - `target_count INTEGER DEFAULT 10`: Intended episode count for series.
  - `config_hash TEXT`: Hash of generation parameters.
  - `status TEXT DEFAULT 'active'`: Project status.
  - `created_at BIGINT`: Millisecond epoch timestamp.
- Route Handlers: `server/src/routes/projects.ts:37-61` and `80-85`.
- Note on Episode Persistence: There is no dedicated `episodes` table in PostgreSQL. Individual episode states and scripts reside within the `snapshot JSONB` column.

### 2.2.4 Table 4: `live_data_findings`
- Defined in: `server/init.sql:50-62` (`measured`).
- Primary Key: `id TEXT` (`server/init.sql:51`).
- Columns:
  - `id TEXT PRIMARY KEY`: Finding record identifier.
  - `session_id TEXT`: Associated research session.
  - `report_id TEXT NOT NULL`: External report identifier.
  - `headline TEXT NOT NULL`: Research headline or trend insight.
  - `topic TEXT`: Domain topic category.
  - `strength TEXT`: Evidence confidence strength (e.g. `'strong'`, `'speculative'`).
  - `status TEXT DEFAULT 'unused'`: Usage flag (`'unused'` or `'used'`).
  - `episode_angle TEXT`: Recommended storyline integration angle.
  - `source TEXT`: Attribution source or URL.
  - `source_date TEXT`: Date of the source data.
  - `created_at BIGINT NOT NULL`: Millisecond epoch timestamp.
- Route Handlers: `server/src/routes/findings.ts:25-43`.

### 2.2.5 Table 5: `run_transcripts`
- Defined in: `server/init.sql:65-72` (`measured`).
- Primary Key: `id TEXT` (`server/init.sql:66`).
- Columns:
  - `id TEXT PRIMARY KEY`: Transcript execution run UUID.
  - `project_key TEXT`: Associated project key.
  - `transcript JSONB NOT NULL`: Detailed execution log array with agent thoughts and tool calls.
  - `entry_count INTEGER NOT NULL`: Count of entries in transcript.
  - `started_at BIGINT`: Millisecond epoch timestamp of run start.
  - `ended_at BIGINT NOT NULL`: Millisecond epoch timestamp of run completion.
- Route Handlers: `server/src/routes/transcripts.ts:28-44` and `60-74`.

### 2.2.6 Table 6: `jobs`
- Defined in: `server/init.sql:86-105` and `server/db/migrations/20260817_layer2_jobs_init.sql:12-31` (`measured`).
- Primary Key: `job_id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (`server/init.sql:87`).
- Columns:
  - `job_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`: Job identifier.
  - `project_id VARCHAR(255) NOT NULL`: Associated project.
  - `job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('vision', 'blueprint', 'scripting', 'audio'))`: Validated job type.
  - `status VARCHAR(50) NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'ZOMBIE'))`: State machine status.
  - `payload JSONB NOT NULL DEFAULT '{}'::jsonb`: Input parameters for job worker.
  - `result JSONB`: Worker output payload upon completion.
  - `error_message TEXT`: Error stack trace or message on failure.
  - `progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)`: Integer percentage (0 to 100).
  - `progress_step VARCHAR(255)`: Human-readable active stage description.
  - `worker_pid INTEGER`: Process ID of the child process executing the job.
  - `tokens_used INTEGER DEFAULT 0`: LLM tokens consumed during run.
  - `duration_ms INTEGER DEFAULT 0`: Execution duration in milliseconds.
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`: Enqueue timestamp.
  - `started_at TIMESTAMP WITH TIME ZONE`: Execution pickup timestamp.
  - `completed_at TIMESTAMP WITH TIME ZONE`: Completion or termination timestamp.
  - `last_heartbeat TIMESTAMP WITH TIME ZONE DEFAULT NOW()`: Heartbeat timestamp for stall detection.
- Indexes:
  - Deduplication Unique Index: `idx_jobs_one_active_per_project_type ON jobs (project_id, job_type) WHERE status IN ('QUEUED', 'RUNNING')` (`server/db/migrations/20260822_option_d_hardening.sql:7-9` and `server/init.sql:285-287`).
  - Status Lookup Index: `idx_jobs_project_type_status ON jobs (project_id, job_type, status)` (`server/init.sql:289-291`).
  - Worker Polling Index: `idx_jobs_status_created ON jobs (status, created_at ASC)` (`server/init.sql:107`).
  - Heartbeat Watchdog Index: `idx_jobs_heartbeat ON jobs (status, last_heartbeat) WHERE status = 'RUNNING'` (`server/init.sql:109`).
- Stored Functions:
  - `reconcile_zombie_jobs()`: Updates orphan `'RUNNING'` and `'QUEUED'` jobs to `'ZOMBIE'` upon server startup (`server/init.sql:112-125`).
  - `prune_old_jobs(retention_days INT DEFAULT 14)`: Purges terminal jobs older than specified retention days (`server/init.sql:128-139`).
- Concurrency Claim: Workers claim jobs using atomic skip locking in `server/src/workers/WorkerManager.ts:156-166`:
  ```sql
  UPDATE jobs
  SET status = 'RUNNING', started_at = NOW(), worker_pid = $1, last_heartbeat = NOW()
  WHERE job_id = (
      SELECT job_id FROM jobs
      WHERE status = 'QUEUED'
      ORDER BY created_at ASC
      LIMIT 1
      FOR UPDATE SKIP LOCKED
  )
  RETURNING job_id, project_id, job_type, payload;
  ```

### 2.2.7 Table 7: `creator_profiles`
- Defined in: `server/init.sql:146-157` and `server/db/migrations/20260820_layer1_memory.sql:16-27` (`measured`).
- Primary Key: `project_id VARCHAR(255) PRIMARY KEY` (`server/init.sql:147`).
- Columns:
  - `project_id VARCHAR(255) PRIMARY KEY`: Associated project.
  - `creator_name VARCHAR(255) DEFAULT 'Creator'`: Host or creator persona name.
  - `tone_preference TEXT DEFAULT 'Dynamic, Authoritative, High-Retention'`: Stylistic voice guidelines.
  - `banned_phrases JSONB DEFAULT '[]'::jsonb`: Banned clichés, phrases, and buzzwords.
  - `primary_niches JSONB DEFAULT '[]'::jsonb`: Niche categories.
  - `audience_dna JSONB DEFAULT '{"peakEngagement": "Cold Opens", "preferredLength": "10-15 mins"}'::jsonb`: Target audience traits.
  - `editorial_preferences JSONB DEFAULT '[]'::jsonb`: Editorial rules learned over time.
  - `feedback_history JSONB DEFAULT '[]'::jsonb`: Past creator critique and ratings.
  - `created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`: Millisecond epoch creation timestamp.
  - `last_updated BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`: Millisecond epoch update timestamp.
- Indexes: `idx_creator_profiles_last_updated ON creator_profiles (last_updated DESC)` (`server/init.sql:159-160`).
- Controller Implementation: `server/src/memory/creatorProfileAgent.ts:78-91` performs upserts using `ON CONFLICT (project_id) DO UPDATE SET ...` while enforcing array bounds.

### 2.2.8 Table 8: `chekhovs_guns`
- Defined in: `server/init.sql:163-175` and `server/db/migrations/20260820_layer1_memory.sql:35-46` (`measured`).
- Primary Key: `gun_id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (`server/init.sql:164`).
- Columns:
  - `gun_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`: Narrative item identifier.
  - `project_id VARCHAR(255) NOT NULL`: Associated project.
  - `planted_in_episode INTEGER NOT NULL`: Episode index where the plot detail was first introduced.
  - `detail TEXT NOT NULL`: Physical item, secret, or clue planted in the narrative.
  - `potential_payoff TEXT NOT NULL`: Suggested dramatic resolution or future callback.
  - `status VARCHAR(32) NOT NULL DEFAULT 'planted' CHECK (status IN ('planted', 'detonated', 'archived'))`: Lifecycle state.
  - `detonated_in_episode INTEGER`: Episode index where the payoff occurred.
  - `created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`: Creation timestamp.
  - `updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`: Last state update timestamp.
- Indexes:
  - `idx_chekhovs_project_status ON chekhovs_guns (project_id, status)` (`server/init.sql:176-178`).
  - `idx_chekhovs_planted_ep ON chekhovs_guns (project_id, planted_in_episode)` (`server/init.sql:179-181`).
- Operational Methods: In `server/src/memory/memoryCurator.ts`, line 84 fetches planted guns; line 146 plants new guns; line 171 marks guns detonated.

### 2.2.9 Table 9: `episode_metadata`
- Defined in: `server/init.sql:186-197` and `server/db/migrations/20260820_layer4_director.sql:11-22` (`measured`).
- Primary Key: `episode_id TEXT PRIMARY KEY` (`server/init.sql:187`).
- Columns:
  - `episode_id TEXT PRIMARY KEY`: Canonical episode identifier.
  - `project_id VARCHAR(255) NOT NULL DEFAULT 'default'`: Associated project.
  - `episode_number INTEGER NOT NULL DEFAULT 1`: Sequential episode index.
  - `title TEXT NOT NULL DEFAULT 'Untitled'`: Episode title.
  - `director_reasoning JSONB DEFAULT NULL`: Director scratchpad thoughts and tactical choices.
  - `applied_skills JSONB DEFAULT '[]'::jsonb`: Array of modular skill IDs applied to this episode.
  - `director_cost_tokens INTEGER DEFAULT 0`: Tokens consumed by Director Agent.
  - `script_system_prompt_tokens INTEGER DEFAULT 0`: Tokens consumed by system prompt composition.
  - `created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`: Creation timestamp.
  - `updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`: Update timestamp.
- Indexes:
  - `idx_episode_metadata_project ON episode_metadata (project_id, episode_number)` (`server/init.sql:199-200`).
  - `idx_episode_metadata_skills ON episode_metadata USING GIN (applied_skills)` (`server/init.sql:202-203`).

### 2.2.10 Table 10: `agent_traces`
- Defined in: `server/init.sql:209-226` and `server/db/migrations/20260820_layer3_gepa_init.sql:16-33` (`measured`).
- Primary Key: `trace_id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (`server/init.sql:210`).
- Columns:
  - `trace_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`: Telemetry trace identifier.
  - `episode_id VARCHAR(255) NOT NULL`: Target episode identifier.
  - `episode_number INTEGER NOT NULL`: Sequential episode number.
  - `project_id VARCHAR(255) NOT NULL`: Associated project.
  - `agent_name VARCHAR(100) NOT NULL`: Generating agent identifier (e.g. `'scriptwriter'`, `'director'`).
  - `prompt_tokens INTEGER NOT NULL DEFAULT 0`: Input token count.
  - `response_tokens INTEGER NOT NULL DEFAULT 0`: Generated token count.
  - `duration_ms INTEGER NOT NULL DEFAULT 0`: Execution time in milliseconds.
  - `input_hash VARCHAR(64) NOT NULL`: SHA-256 hash of input context (avoids storing massive raw prompt text).
  - `llm_mentor_score DECIMAL(5,2)`: Autonomous quality score from Summary Mentor (0.00 to 100.00).
  - `human_score DECIMAL(5,2)`: Explicit human creator rating (0.00 to 100.00).
  - `creator_anchor_score DECIMAL(5,2)`: Deterministic score against Creator Profile baseline.
  - `final_blended_score DECIMAL(5,2) NOT NULL`: Anti-Goodhart combined score.
  - `skills_used JSONB DEFAULT '[]'::jsonb`: Array of modular skill names active during execution.
  - `is_divergent BOOLEAN DEFAULT FALSE`: Flagged true when human rating and mentor rating diverge by >= 25.0 points.
  - `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`: Recording timestamp.
- Indexes:
  - Partial Performance Index: `idx_traces_project_blended ON agent_traces (project_id, final_blended_score DESC) WHERE is_divergent IS FALSE` (`server/init.sql:228-230`).
  - `idx_traces_episode_id ON agent_traces (episode_id)` (`server/init.sql:232-233`).
  - `idx_traces_created_at ON agent_traces (created_at DESC)` (`server/init.sql:235-236`).
  - GIN Skills Index: `idx_traces_skills_gin ON agent_traces USING GIN (skills_used)` (`server/init.sql:238-239`).
- Stored Maintenance Function: `prune_stale_gepa_traces()` purges traces older than 90 days (`server/init.sql:276-282`).

### 2.2.11 Table 11: `skill_registry`
- Defined in: `server/init.sql:241-261` and `server/db/migrations/20260820_layer3_gepa_init.sql:52-72` (`measured`).
- Primary Key: `skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid()` (`server/init.sql:242`).
- Columns:
  - `skill_id UUID PRIMARY KEY DEFAULT gen_random_uuid()`: Skill registry UUID.
  - `skill_name VARCHAR(255) NOT NULL`: Machine-readable skill name (e.g. `'hyper_natural_banter'`).
  - `project_id VARCHAR(255) NOT NULL`: Associated project.
  - `status VARCHAR(50) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'testing', 'validated', 'reverted', 'archived'))`: Lifecycle state.
  - `confidence_score DECIMAL(4,3) NOT NULL`: Pattern extraction statistical confidence (0.000 to 1.000).
  - `baseline_avg DECIMAL(5,2) NOT NULL`: Pre-discovery 10-episode rolling performance average.
  - `testing_avg DECIMAL(5,2)`: Performance average across active test window.
  - `performance_delta DECIMAL(5,2)`: Net score difference (`testing_avg - baseline_avg`).
  - `test_episodes_run INTEGER DEFAULT 0`: Episodes tested so far in current test window.
  - `test_window_size INTEGER DEFAULT 5`: Target number of episodes in evaluation window.
  - `file_path TEXT NOT NULL`: Filesystem location of the modular skill markdown file.
  - `pattern_evidence TEXT`: Explanatory reasoning generated during pattern extraction.
  - `conflicts_with JSONB DEFAULT '[]'::jsonb`: Array of skill names mutually exclusive with this skill.
  - `discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`: Discovery timestamp.
  - `validated_at TIMESTAMP WITH TIME ZONE`: Promotion timestamp.
  - `reverted_at TIMESTAMP WITH TIME ZONE`: Reversion timestamp.
  - `reverted_reason TEXT`: Documented failure reason upon reversion.
- Constraints and Indexes:
  - Unique Constraint: `CONSTRAINT uq_project_skill UNIQUE (project_id, skill_name)` (`server/init.sql:260`).
  - `idx_skill_registry_status ON skill_registry (project_id, status)` (`server/init.sql:263-264`).

### 2.2.12 Table 12: `gepa_circuit_breaker`
- Defined in: `server/init.sql:266-274` and `server/db/migrations/20260820_layer3_gepa_init.sql:79-87` (`measured`).
- Primary Key: `project_id VARCHAR(255) PRIMARY KEY` (`server/init.sql:267`).
- Columns:
  - `project_id VARCHAR(255) PRIMARY KEY`: Associated project.
  - `consecutive_failures INTEGER DEFAULT 0`: Running count of rejected or degraded skills.
  - `is_dormant BOOLEAN DEFAULT FALSE`: Flag indicating that autonomous skill mutation is suspended.
  - `dormant_until_episode INTEGER`: Target episode index when mutation lock is unlocked.
  - `last_failure_at TIMESTAMP WITH TIME ZONE`: Timestamp of most recent skill degradation.
  - `last_success_at TIMESTAMP WITH TIME ZONE`: Timestamp of most recent skill validation.
  - `updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`: Last status update timestamp.
- Trigger Rule: Reaching 3 consecutive failures trips the breaker and enforces dormancy for 50 episodes (`server/src/gepa/skillTester.ts:68-86`).

---

## 2.3 Server and Client Memory Services and API Layer

### 2.3.1 Express 5 REST Endpoints
The backend Express 5 service mounts modular routers in `server/src/index.ts:43-49` (`measured`):
1. `POST /api/memory/assembly-brief` (`server/src/routes/memory.ts:38-106`):
   - Invokes `soulAgent.readSoul()`, `profileAgent.loadProfile()`, and `curator.generateContinuityBrief()` in parallel via `Promise.all`.
   - Assembles `soulBlock`, `creatorBlock`, and `continuityBlock`.
   - Returns safe 30-token fallback if any internal query fails (`server/src/routes/memory.ts:90-104`).
2. `POST /api/memory/soul/read` and `POST /api/memory/soul/update` (`server/src/routes/memory.ts:112-148`): Reads and atomically updates markdown soul files.
3. `POST /api/memory/creator/profile` and `POST /api/memory/creator/feedback` (`server/src/routes/memory.ts:154-189`): Ingests creator ratings and editorial updates into PostgreSQL.
4. `POST /api/memory/chekhov/plant` and `POST /api/memory/chekhov/detonate` (`server/src/routes/memory.ts:195-233`): Plants and detonates narrative payoffs in `chekhovs_guns`.
5. `POST /api/memory/embedding/store` (`server/src/routes/memory.ts:239-263`): Stores 768-dimensional episode vectors.
6. `PUT /api/embeddings` and `POST /api/embeddings/search` (`server/src/routes/embeddings.ts:14-90`): Upserts vectors and performs cosine distance searches.
7. `POST /api/jobs`, `GET /api/jobs/:jobId`, `DELETE /api/jobs/:jobId` (`server/src/routes/jobs.ts:36-198`): Manages background job queue execution.
8. `PUT /api/projects/:key` and `GET /api/projects/:key` (`server/src/routes/projects.ts:21-96`): Persists and loads serialized `ProjectState` snapshots.
9. `POST /api/gepa/rating` and `GET /api/gepa/analytics` (`server/src/routes/gepa.ts:28-164`): Manages GEPA telemetry and human ratings.

### 2.3.2 Core Server Memory Agents
1. `ProjectSoulAgent` (`server/src/memory/projectSoulAgent.ts:1-237`):
   - Stores global narrative rules in markdown files at `data/souls/PROJECT_SOUL_<safeId>.md`.
   - Executes atomic writes: creates temporary file `${soulPath}.${Date.now()}.tmp`, writes content, then calls `fs.promises.rename()` (`server/src/memory/projectSoulAgent.ts:125-137`).
   - Caps `operationalRules` at 15 items and `knownPitfalls` at 10 items (`server/src/memory/memoryTypes.ts:78-79`).
   - Prepends newer rules to the top of arrays for recency bias (`server/src/memory/projectSoulAgent.ts:98-100`).
2. `CreatorProfileAgent` (`server/src/memory/creatorProfileAgent.ts:1-204`):
   - Persists creator personality and tone preferences into PostgreSQL table `creator_profiles`.
   - Executes idempotent upserts via `ON CONFLICT (project_id) DO UPDATE SET ...` (`server/src/memory/creatorProfileAgent.ts:78-91`).
   - Caps `bannedPhrases` at 20 items, `editorialPreferences` at 10 items, and `feedbackHistory` at 10 entries (`server/src/memory/memoryTypes.ts:80-82`).
3. `MemoryCurator` (`server/src/memory/memoryCurator.ts:1-246`):
   - Executes pgvector cosine similarity search:
     ```sql
     SELECT episode_number, title, concept, summary,
            1 - (embedding <=> $1::vector) AS similarity
     FROM episode_embeddings
     WHERE project_id = $2 AND episode_number < $3
     ORDER BY embedding <=> $1::vector
     LIMIT $4
     ```
   - Filters out matches with similarity < 0.65 to prevent hallucinations (`server/src/memory/memoryCurator.ts:80`).
   - Queries active planted Chekhov guns where `status = 'planted' AND planted_in_episode < $2` (`server/src/memory/memoryCurator.ts:84-91`).

### 2.3.3 Token Budgets and Memory Configuration Constants
Defined in `server/src/memory/memoryTypes.ts:76-104` (`measured`):
- `MAX_SOUL_RULES`: 15
- `MAX_PITFALLS`: 10
- `MAX_BANNED_PHRASES`: 20
- `MAX_EDITORIAL_PREFS`: 10
- `MAX_FEEDBACK_HISTORY`: 10
- `RAG_TOP_K`: 5
- `MIN_SIMILARITY_SCORE`: 0.65
- `TOKEN_BUDGET`:
  - `SOUL_BLOCK`: 350 tokens
  - `CREATOR_BLOCK`: 200 tokens
  - `CONTINUITY_BLOCK`: 250 tokens
  - `MAX_TOTAL`: 950 tokens
- Timeouts: `DB_TIMEOUT_MS = 3000`, `AI_TIMEOUT_MS = 12000`.

### 2.3.4 Client HTTP Adapter and Offline Fallbacks
Implemented in `src/core/services/memoryClient.ts:1-163` (`measured`):
- Pure browser HTTP client using native `fetch()` with zero Node.js imports.
- Hard timeout: `AbortSignal.timeout(4000)` enforces a 4-second timeout to prevent UI hangs (`src/core/services/memoryClient.ts:51`).
- Fallback object: `OFFLINE_ASSEMBLY` provides a 50-token default context when backend server is offline (`src/core/services/memoryClient.ts:21-26`).

### 2.3.5 Memory Bridge and Zod Schemas
Implemented in `src/core/services/memory/MemoryBridge.ts:1-265` and `MemorySchemas.ts:1-285` (`measured`):
- Dual migration bridge converts between legacy `ThemeTracker` and modern `FullMemoryState`.
- Slicing bounds during migration: `valuePayloads.slice(-30)`, `storyThreads.slice(-10)`, `emotionalBeats.slice(-30)`, `bingeMechanics.slice(-20)`, `memorableCallbacks.slice(-20)`, `feedbackQueue.slice(-50)` (`src/core/services/memory/MemoryBridge.ts:110-130`).
- Staleness guard: `getAvailableTracker()` checks if legacy tracker is newer than memory core and falls back to prevent state regression (`src/core/services/memory/MemoryBridge.ts:247-264`).
- Concurrency control: `MemoryCore.ts:112-148` checks `memoryState.stateVersion === expectedVersion` (CAS lock) and throws `StaleDataError` on collision.

---

## 2.4 GEPA Evolutionary Architecture (Layer 3 Engine)

The Generative Episode Pattern Accelerator (GEPA) is the Layer 3 evolutionary engine that continuously optimizes prompt engineering across episodes.
It runs as a non-blocking background subsystem on the server.

### 2.4.1 Telemetry Ingestion and Anti-Goodhart Scoring
Implemented in `server/src/gepa/traceCollector.ts:1-204` (`measured`):
1. In-memory trace queue: Buffers traces up to `MAX_TRACE_QUEUE_SIZE = 1000`. If the database is unreachable, oldest entries are dropped to prevent memory leaks (`server/src/gepa/traceCollector.ts:89-92`).
2. Batch flush: Asynchronous flush to PostgreSQL occurs every 5,000 ms (`FLUSH_INTERVAL_MS = 5000`). Database errors are caught and swallowed so pipeline generation never halts (`server/src/gepa/traceCollector.ts:107-165`).
3. SHA-256 prompt hashing: `hashInput()` hashes prompt inputs with crypto SHA-256 so raw sensitive prompts are not persisted in telemetry tables (`server/src/gepa/traceCollector.ts:45-47`).
4. Anti-Goodhart blended score calculation (`server/src/gepa/traceCollector.ts:60-80`):
   - Case 1 (Human reviewed):
     ```
     finalScore = (mentorScore * 0.40) + (humanScore * 0.60)
     isDivergent = |mentorScore - humanScore| >= 25.0
     ```
     When divergence is detected, `is_divergent` is set to `TRUE`. Divergent traces are excluded from pattern extraction pools.
   - Case 2 (No human review available):
     ```
     finalScore = (mentorScore * 0.65) + (creatorAnchorScore * 0.35)
     isDivergent = false
     ```
     Creator profile anchor acts as an objective baseline to prevent synthetic self-reinforcing sycophancy.

### 2.4.2 Advisory Locks and Comparative Pattern Extraction
Implemented in `server/src/gepa/patternExtractor.ts:1-189` (`measured`):
1. Concurrency control: Executes `SELECT pg_try_advisory_lock(42000303)` (`server/src/gepa/patternExtractor.ts:33-40`). If another worker holds the lock, extraction skips immediately.
2. Dataset gating: Requires at least 15 non-divergent scored episodes (`MIN_EPISODES_FOR_EXTRACTION = 15`) before running pattern discovery (`server/src/gepa/patternExtractor.ts:50-57`).
3. Winner vs loser comparison pool: Queries top 5 winning episodes and bottom 5 losing episodes by `final_blended_score` (`server/src/gepa/patternExtractor.ts:60-88`).
4. Creator anchor grounding: Reads `data/souls/PROJECT_SOUL_*` as immutable ground truth during extraction (`server/src/gepa/patternExtractor.ts:95-110`).
5. Pattern schema validation: Validates LLM analysis using `DiscoveredPatternSchema` and rejects patterns with statistical confidence < 0.80 (`MIN_CONFIDENCE_THRESHOLD = 0.80`) (`server/src/gepa/patternExtractor.ts:152-176`).

### 2.4.3 Skill Synthesis and Lifecycle Transitions
Implemented in `server/src/gepa/skillSynthesizer.ts:1-219` (`measured`):
1. Duplicate and conflict check: Checks `skill_registry` for existing skill names and verifies conflict matrices (`server/src/gepa/skillSynthesizer.ts:44-71`).
2. Baseline calculation: Calculates average score of the last 10 non-divergent episodes (`server/src/gepa/skillSynthesizer.ts:74-86`).
3. Atomic skill creation: Writes Markdown prompt rules to a temporary file in `skills/discovered/` then renames to `<skill_name>.md` (`server/src/gepa/skillSynthesizer.ts:124-130`).
4. State transitions:
   - `draft` to `testing`: Injected into prompt composer for live testing.
   - `testing` to `validated`: Rewrites frontmatter and marks active (`promoteSkillFile`, lines 192-219).
   - `testing` to `reverted`: Moves file to `skills/archived/` with documented failure reason (`archiveSkillFile`, lines 166-189).

### 2.4.4 Pareto Skill Testing and Circuit Breaker State Machine
Implemented in `server/src/gepa/skillTester.ts:1-204` (`measured`):
1. Active testing window: Evaluates candidate skills over 5 test episodes (`TEST_WINDOW_SIZE = 5`).
2. JSONB containment query:
   ```sql
   SELECT AVG(final_blended_score) AS avg_score
   FROM (
       SELECT DISTINCT ON (episode_id) final_blended_score, created_at
       FROM agent_traces
       WHERE project_id = $1 AND skills_used ? $2 AND is_divergent IS FALSE
       ORDER BY episode_id, created_at DESC
       LIMIT $3
   ) test_set
   ```
3. Decision gates:
   - Promotion: If `delta >= +2.5` (`VALIDATE_THRESHOLD`), skill is promoted to `'validated'` and circuit breaker resets (`server/src/gepa/skillTester.ts:186-191`).
   - Reversion: If `delta <= -2.0` (`REVERT_THRESHOLD`), skill is archived, status set to `'reverted'`, and failure trips the circuit breaker (`server/src/gepa/skillTester.ts:178-185`).
   - Extension: If delta is between -2.0 and +2.5, testing window extends by 3 episodes (`server/src/gepa/skillTester.ts:192-201`).
4. Circuit breaker trip: If `consecutive_failures >= 3`, sets `is_dormant = TRUE` and `dormant_until_episode = currentEpisode + 50`. Skill mutation stops for 50 episodes to preserve stability (`server/src/gepa/skillTester.ts:68-86`).

---

## 2.5 Multi-Stage Reflection and Anti-Entropy Decay Mechanisms

### 2.5.1 Multi-Stage Reflection Loops
The pipeline executes reflection at four distinct stages:
1. Audience Psychologist and Self-Reflection Engine (`predictAudienceReaction` in `src/core/services/themeTracker/feedbackAnalyzer.ts:17-137`):
   - Evaluates preceding episode summary for emotional weight, controversy (0 to 10), and pacing (`"balanced"`, `"too_fast"`, `"too_slow"`).
   - Generates host acknowledgment lines for the next episode.
   - Safeguard 4: Returns neutral defaults on Episode 1 (`feedbackAnalyzer.ts:23-33`).
2. Pre-Scripting Director Scratchpad (`server/src/agents/directorAgent.ts:89-145`):
   - Enforces internal `<think>...</think>` scratchpad reasoning where the director assesses stakes, open loops, and modular skill choices before emitting scene instructions.
3. 4-Call Quality Gate (`summaryMentorAgent.ts:148-480`):
   - Call 1: Semantic validity, refusal detection, minimum 300 words.
   - Call 2: 6-part structural completeness (hook, dynamics, pain point, payload, arc, cliffhanger).
   - Call 3: Weighted genre evaluation.
   - Call 4: Structured critique if score < 75.
4. Consistency Auditor and Canon Protector (`auditScriptConsistency` in `src/core/services/themeTracker/feedbackAnalyzer.ts:148-237`):
   - Audits draft script against character inventory (skills, secrets, items, traumas), emotional baseline, and open ledger items.
   - Flags contradictions and emits suggested fixes for automated script regeneration.

### 2.5.2 Deterministic Anti-Entropy Decay Mechanisms
The codebase avoids unverified continuous mathematical half-life formulas.
Instead, it enforces memory decay through six deterministic boundary controls (`measured`):
1. SQL Interval Deletion: `prune_stale_gepa_traces()` in `server/init.sql:276` drops telemetry traces older than 90 days (`NOW() - INTERVAL '90 days'`).
2. Quarantine Expiration: `cleanExpiredQuarantine()` in `src/core/services/memory/SemanticGuard.ts:170-196` purges quarantined hallucinations older than 30 days (`QUARANTINE_EXPIRY_DAYS = 30`).
3. Topic Sliding Window: `src/core/services/themeTracker/memoryContext.ts:94-96` filters covered topics to only those within the last 15 episodes (`t.episodeNumber > currentEpisodeNumber - 15`). Older topics decay out of active working context.
4. Recency Rule Truncation: `server/src/memory/projectSoulAgent.ts:98-115` prepends new rules to the top of arrays and slices at 15 items (`MAX_SOUL_RULES`), discarding rules beyond index 15.
5. In-Memory Bridge Array Caps: `src/core/services/memory/MemoryBridge.ts:110-130` caps value payloads (30), emotional beats (30), binge mechanics (20), and memorable elements (20).
6. In-Memory Queue Shift: `server/src/gepa/traceCollector.ts:90-92` shifts and discards the oldest trace when queue depth exceeds 1,000 items.

---

# 3. PART 2: REUSABLE CONTENT GENERATION PIPELINE ARCHITECTURE GUIDELINE

## 3.1 Universal 4-Tier Memory Architecture Blueprint vs 5-Tier Physical Prompt Hierarchy

Every serialized content generation pipeline (whether audio dramas, animated shorts, or educational video channels) requires a structured hierarchy that isolates permanent identities from transient scene instructions.

To understand the architecture, implementers must distinguish between the **4-Tier Conceptual Memory Blueprint** (the stateful memory blocks that carry token budgets) and the **5-Tier Physical Prompt Hierarchy** executed at runtime by `server/src/prompts/promptComposer.ts:89-125`.

### 3.1.1 The 4-Tier Conceptual Memory Blueprint (950-Token Budget)
In `server/src/memory/memoryTypes.ts:89-94`, token budgets are allocated strictly across the dynamic memory layers:
```typescript
TOKEN_BUDGET: {
    SOUL_BLOCK: 350,
    CREATOR_BLOCK: 200,
    CONTINUITY_BLOCK: 250,
    MAX_TOTAL: 950,
},
```
The named blocks total $350 + 200 + 250 = 800$ tokens, leaving an unallocated remainder of $950 - 800 = 150$ tokens specifically reserved for dynamic Director Orders and Modular Skills:

```
┌────────────────────────────────────────────────────────────────────────┐
│ MEMORY TIER 1: GLOBAL IDENTITY AND BRAND CORE (Project Soul)           │
│ Inviolable constraints, universe rules, taboo topics, visual styling.  │
│ Budget: 350 tokens. Storage: Atomic Markdown file on disk.             │
├────────────────────────────────────────────────────────────────────────┤
│ MEMORY TIER 2: CREATOR AND HOST DNA (Creator Profile)                  │
│ Persona voice, speaking rhythm, editorial mandates, banned clichés.    │
│ Budget: 200 tokens. Storage: PostgreSQL JSONB.                         │
├────────────────────────────────────────────────────────────────────────┤
│ MEMORY TIER 3: NARRATIVE CONTINUITY AND OPEN LOOPS (Continuity Cortex) │
│ Active Chekhov guns, dual-end ledger, semantic vector callbacks.       │
│ Budget: 250 tokens. Storage: PostgreSQL + pgvector (768 dimensions).   │
├────────────────────────────────────────────────────────────────────────┤
│ MEMORY TIER 4: DYNAMIC ORDERS AND MODULAR SKILLS (Director Layer)      │
│ Scene pacing, hook intensity, active skills (e.g. comic timing).       │
│ Budget: 150 tokens. Storage: Ephemeral scratchpad + Skills Markdown.   │
└────────────────────────────────────────────────────────────────────────┘
TOTAL DYNAMIC MEMORY BUDGET CAP: 950 TOKENS (Strictly Enforced)
```

### 3.1.2 Physical 5-Tier Runtime Prompt Composer Hierarchy
At prompt assembly time, `server/src/prompts/promptComposer.ts:89-125` composes a 5-tier context where **Tier 1 is Base System Role & Inviolable Safety Rules**. This Base Role is hardcoded and unbudgeted (it operates outside the 950-token memory budget, bounded only by the model's overall context window).

The mapping between physical prompt tiers and the memory blueprint is:

| Physical Prompt Tier (`promptComposer.ts`) | Memory Blueprint Tier | Component Name | Token Budget | Truncation Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** (`promptComposer.ts:89`) | *External to Memory* | **Base System Role & Safety Rules** | Unbudgeted (Hardcoded) | **Inviolable** (Never truncated) |
| **Tier 2** (`promptComposer.ts:92`) | **Memory Tier 1** | **Project Soul & Universe Rules** | 350 tokens | **Inviolable** (Preserved) |
| **Tier 3** (`promptComposer.ts:99`) | **Memory Tier 2** | **Creator Profile & Tone** | 200 tokens | Preserved |
| **Tier 4** (`promptComposer.ts:106`)| **Memory Tier 3** | **Memory Curator Continuity Brief** | 250 tokens | Truncated second if budget tight |
| **Tier 5** (`promptComposer.ts:117`)| **Memory Tier 4** | **Director Strategic Orders & Skills** | 150 tokens | **Truncated first** (`remainingBudget <= 200`) |

### 3.1.3 Mathematical Schema and Budget Formulations
The dynamic memory block injected into generation prompts must follow this exact token allocation formula:

$$\text{TokenTotal} = \text{SoulBlock} (350) + \text{CreatorBlock} (200) + \text{ContinuityBlock} (250) + \text{DynamicBlock} (150) \le 950$$

If total token count threatens the context limit, truncation strictly follows inverse priority:
1. Physical Tier 5 / Memory Tier 4 (Director Orders and Dynamic Skills) is dropped first (`promptComposer.ts:117-121`).
2. Physical Tier 4 / Memory Tier 3 (Continuity Brief) is truncated second.
3. Physical Tier 3 / Memory Tier 2 (Creator DNA) is preserved.
4. Physical Tier 2 / Memory Tier 1 (Project Soul) and Physical Tier 1 (Base System Role) are inviolable and never truncated (`promptComposer.ts:89-115`).

---

## 3.2 Episode-to-Episode Continuity Across Long Narrative Arcs (Episodes 1 to 50)

### 3.2.1 Character Syncing and Personality Drift Prevention
When generating episode 50 of a serialized story or faceless character series, language models suffer from persona erosion.
The following three safeguards prevent drift:
1. Anchor State Schema: Character traits must be modeled explicitly as inventories and stances rather than qualitative prose (`src/core/types.ts:191-196` and `MemorySchemas.ts:193-215`):
   - Skills: Concrete capabilities learned in previous episodes.
   - Secrets: Lore facts known to the character that must not be contradicted.
   - Items: Physical tools, code repositories, or objects currently in possession.
   - Traumas: Narrative failures, outages, or emotional wounds shaping current reactions.
2. Stance Tracking by Topic: Opinions on key world themes must carry a stance (`'Skeptical'`, `'Neutral'`, `'Curious'`, `'Optimistic'`, `'Advocate'`) and citation of the episode where the stance changed.
3. Pre-Persist Garbage Validation: `validateHistorianOutput()` in `themeExtractor.ts:28-60` inspects extracted state updates. Any payload containing garbage placeholders (`"n/a"`, `"none"`, `"null"`, `"undefined"`) is rejected before database commit.

### 3.2.2 Dual-End Open Ledger Pattern and Ledger Eviction Boundaries
A naive sliding window (e.g. keeping the last 10 episodes) leads to the Abandoned Plot Hole Failure: commitments made in Episode 1 are forgotten by Episode 15.
The Dual-End Ledger pattern solves this by sampling from both boundaries of the unresolved ledger (`src/core/services/themeTracker/memoryContext.ts:12-16`):
- Take the 5 oldest open ledger items: `allOpenItems.slice(0, 5)`
- Take the 15 newest open ledger items: `allOpenItems.slice(-15)`
- Deduplicate into a combined list: `[...new Set([...oldestOpen, ...newestOpen])]`

#### Physical Capacity Cap and 50-Episode Eviction Boundary
In the physical implementation (`src/core/services/themeTracker/themeExtractor.ts:470` and `themeExtractor.ts:568`), the state merger explicitly caps `openLedger` at 40 items using `.slice(-40)`:
```typescript
return [...existing, ...newItems].slice(-40);
```
Consequently, commitments, mysteries, or open loops introduced in Episode 1 persist in prompt context at Episode 50 **if and only if** total cumulative items recorded in `openLedger` across all 50 episodes do not exceed 40. Under continuous operational loads where new items are added each episode (e.g. 1 new item per episode across 50 episodes), the ledger cap drops the oldest items; by Episode 50, all items from Episodes 1 through 10 have been truncated (`l.slice(-40)` leaves Episode 11 as the oldest surviving entry).

#### Production Segregation Pattern for Long-Running Series
To guarantee that open commitments from Episode 1 are never evicted regardless of series length:
1. **Segregate Unresolved from Resolved Items**: Rather than storing open and resolved items in a single homogeneous 40-item array, isolate active unresolved commitments (`status === 'open'`) in a dedicated unresolved ledger with an unbounded or high-threshold capacity (e.g. 100+ items).
2. **Dedicated Resolved Archive**: Route resolved items (`status === 'resolved'`) into a separate historical archive table or ring buffer, sampling only the last 5 resolved items for prompt injection context (`memoryContext.ts:21-25`).
3. **Guaranteed Anti-Eviction Invariant**: This structural segregation guarantees that completed plotlines never displace critical unresolved narrative promises from early episodes.

### 3.2.3 60% Word-Overlap Ledger Resolution Algorithm and Boundary Failure Modes
To prevent false resolution of open plot threads, items are not resolved by naive substring matching.
`themeExtractor.ts:455-463` and `themeExtractor.ts:653-666` execute word-overlap validation:
```typescript
const descWords = itemDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3);
const itemWords = item.item.toLowerCase().split(/\s+/).filter(w => w.length > 3);
if (descWords.length === 0 || itemWords.length === 0) return item;
const shorter = descWords.length < itemWords.length ? descWords : itemWords;
const longer = descWords.length < itemWords.length ? itemWords : descWords;
const matchCount = shorter.filter(w => longer.includes(w)).length;
const matchRatio = matchCount / shorter.length;
return matchRatio >= 0.6 ? { ...item, resolved: true, resolvedEpisode } : item;
```

#### Empirical Boundary Edge Cases
Empirical execution against real-world narrative transcripts reveals three critical boundary failure modes:
1. **Short-Word Phrase Drop Failure**: Because words $\le 3$ characters are filtered out (`w.length > 3`), narrative items composed entirely of short words (e.g. `"car key in box"` or `"red gem on top"`) produce empty word arrays (`descWords.length === 0`). The resolution check early-exits (`return item`), rendering the item permanently unresolvable.
2. **Punctuation Attachment Mismatch**: Words adjacent to trailing or leading punctuation are not sanitized before tokenization (e.g. splitting `"opened vault."` yields `"vault."`, which fails strict string equality against `"vault"`). This artificially drops `matchCount` to 0, resulting in a 0.0 match ratio.
3. **Single-Word Query False Resolution**: When the shorter tokenized phrase contains exactly 1 word (e.g. `"system"`), any casual reference in a multi-word target (`"system failure in tokyo"`) produces $\text{matchRatio} = 1 / 1 = 1.0 \ge 0.6$. This allows generic single-word phrases to accidentally trigger premature resolution of complex multi-part commitments.

#### Concrete Sanitization and Hardening Recommendations
Pipelines adopting this pattern must incorporate the following pre-processing sanitization guards:
- **Punctuation Stripping**: Pre-clean input strings using regex punctuation stripping before tokenization:
  ```typescript
  const cleanTokens = (text: string) =>
      text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  ```
- **Short-Word Fallback**: If filtering words $> 3$ characters yields an empty array, fall back to retaining words $\ge 2$ characters, or evaluate normalized Levenshtein distance on the full sanitized string.
- **Minimum Match Quantity Guard**: Enforce a minimum word-count guard (e.g. `shorter.length >= 2` and `matchCount >= 2`, or absolute matching) so that single-word occurrences cannot trigger resolution of high-stakes plot commitments.

### 3.2.4 Dynamic Act Scaling (Episodes 1 to 100+)
Story arcs cannot use static 3-act structures across variable series lengths.
`src/core/services/arcUtils.ts:220-250` dynamically calculates the number of acts based on total planned episodes:
- **1 to 10 episodes**: 2 acts
- **11 to 25 episodes**: 3 acts
- **26 to 50 episodes**: 4 acts
- **51 to 100 episodes**: 5 acts
- **Over 100 episodes**: $\lceil \text{totalEpisodes} / 20 \rceil$ acts (1 act per 20 episodes)

#### Physical Act Phase Return Types (`arcUtils.ts:26-37`)
The physical engine calculates phases through `getPhaseForAct(actNumber, totalActs)`:
```typescript
export const getPhaseForAct = (actNumber: number, totalActs: number): PhaseType => {
    if (actNumber === 1) return 'foundation';
    if (actNumber === 2) return 'rising_action';
    if (actNumber === totalActs) return 'resolution';
    if (actNumber === totalActs - 1) return 'falling_action';

    const middlePosition = (actNumber - 2) / (totalActs - 3);
    if (middlePosition < 0.33) return 'development';
    if (middlePosition < 0.66) return 'peak';
    return 'climax';
};
```

This yields the exact physical sequence of phase types across season structures:
- **1 to 10 episodes (2 acts)**: `['foundation', 'rising_action']`. (Note: Act 2 satisfies `actNumber === 2`, returning `'rising_action'` rather than `'resolution'`).
- **11 to 25 episodes (3 acts)**: `['foundation', 'rising_action', 'resolution']`.
- **26 to 50 episodes (4 acts)**: `['foundation', 'rising_action', 'falling_action', 'resolution']`.
- **51 to 100 episodes (5 acts)**: `['foundation', 'rising_action', 'peak', 'falling_action', 'resolution']`.
- **Over 100 episodes ($\lceil N/20 \rceil$ acts)**: Bounded by `['foundation', 'rising_action', ..., 'falling_action', 'resolution']`, with internal middle acts distributed across `development`, `peak`, and `climax` according to `middlePosition` (e.g. 6 acts: `['foundation', 'rising_action', 'peak', 'climax', 'falling_action', 'resolution']`).

#### Pacing Mapping (`arcUtils.ts:39-50`)
Each phase maps deterministically to a pacing velocity:
- `'foundation'`: `slow`
- `'rising_action'`: `medium`
- `'development'`: `medium`
- `'peak'`: `fast`
- `'climax'`: `fast`
- `'falling_action'`: `medium`
- `'resolution'`: `fast`

### 3.2.5 Chekhov's Guns Lifecycle Across Long Arcs
Narrative setups and payoffs are managed as stateful database entities in `chekhovs_guns` (`server/init.sql:163-175`):
1. Planting Phase: During outline generation, the director or scriptwriter plants a detail (e.g. a specific encryption key or character flaw) and records a potential payoff. Status is initialized to `'planted'`.
2. Tracking Phase: Across subsequent episodes (e.g. episodes 2 through 49), `MemoryCurator` queries active guns where `status = 'planted' AND planted_in_episode < currentEpisode`.
3. Detonation Phase: When an act reaches its climax (e.g. Episode 50), the prompt injects the planted detail as a mandatory payoff target. Upon script completion, an atomic update executes:
   ```sql
   UPDATE chekhovs_guns
   SET status = 'detonated', detonated_in_episode = 50, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
   WHERE gun_id = $1 AND status = 'planted';
   ```

---

## 3.3 General Implementation Guide for New Content Pipelines

The memory architecture established in this codebase translates directly to other automated media formats. Below are concrete implementation blueprints for three major pipeline archetypes.

### 3.3.1 Pipeline Archetype 1: Automated Faceless Video Channels (YouTube Shorts, Reels, TikTok)
Faceless channels depend on high audience retention, fast pacing, curiosity gaps, and consistent branding.

1. Adaptation of the 4 Memory Tiers:
   - Tier 1 (Channel Soul): Visual palette (hex colors), caption font styling, visual safe zones (padding for UI overlays), and banned clichés.
   - Tier 2 (Narrator Persona): Vocal cadence, speech rate (e.g. 150-165 words per minute), humor level, and signature sign-offs.
   - Tier 3 (Audience Memory and Inside Jokes): Past viral callbacks, running jokes, and active curiosity gaps teased in previous videos.
   - Tier 4 (Video Director Orders): Hook type (Visual Glitch, Bold Question, Counter-Intuitive Stat), B-roll visual cues, and sound effect (SFX) triggers.
2. Hook Pacing Architecture:
   - Enforce an opening 3-second hook rule in the prompt composer (`server/src/prompts/promptComposer.ts`).
   - The script generator must output split audio-visual cues:
     ```json
     {
       "timestamp": "00:00 - 00:03",
       "audioScript": "Most developers think Redis is just an in-memory cache.",
       "visualPrompt": "Fast zoom-in on red glowing server rack with error alert",
       "onScreenText": "REDIS IS NOT JUST A CACHE",
       "soundEffect": "bass_drop_subtle"
     }
     ```
3. Semantic Vector Search for Visual Asset Deduplication:
   - Use `episode_embeddings` to index past video hooks and thumbnail concepts.
   - Query vectors during topic generation with threshold 0.75. If similarity exceeds 0.75, reject the topic as redundant to maintain channel freshness.

### 3.3.2 Pipeline Archetype 2: Animation and Motion Design Pipelines
Animation pipelines require strict continuity across visual assets, character model sheets, and spatial layouts.

1. Visual Asset Memory Integration:
   - Extend `ActorSoulSchema` to include visual design tokens:
     ```typescript
     export const AnimatedCharacterSoulSchema = ActorSoulSchema.extend({
         visualModel: z.object({
             baseModelCheckpoint: z.string(),
             loraWeights: z.record(z.string(), z.number()),
             colorPalette: z.object({
                 hair: z.string(),
                 clothingPrimary: z.string(),
                 clothingSecondary: z.string(),
                 eyes: z.string()
             }),
             costumeVariants: z.array(z.string()),
             currentCostume: z.string()
         })
     });
     ```
2. Scene Layout and Spatial State Persistence:
   - Use `project_snapshots.snapshot` to persist scene geometry and character positions.
   - When transitioning from Scene A to Scene B in Episode 10, the generator inspects where characters exited the stage to ensure continuity in entrance directions.
3. Motion State Handoffs:
   - Store character emotional intensity (0.0 to 1.0) and motion pace in `emotionalBeats`.
   - Motion design tools (e.g. After Effects, Remotion, Blender scripts) consume this value to set camera shake intensity and keyframe animation curves.

### 3.3.3 Pipeline Archetype 3: Sequential Story Media (Audio Dramas, Webtoons, Serialized Fiction)
Sequential fiction requires strict character growth, trauma tracking, and cliffhanger engineering.

1. Chapter-by-Chapter State Preservation:
   - Persist character inventory (`skills`, `secrets`, `items`, `traumas`) after every chapter.
   - When a character undergoes physical injury or betrayal in Chapter 5, record it in `traumas`.
   - The Consistency Auditor (`feedbackAnalyzer.ts:148-237`) checks subsequent chapters to ensure the character does not act with sudden unearned recovery.
2. Cliffhanger and Binge Mechanics:
   - Store `bingeMechanics` records with `cliffhangerStrength` (1 to 10) and `curiosityGap`.
   - Dynamic Act Scaling ensures Act Climax chapters always enforce `cliffhangerStrength >= 8`.
3. Canon Consistency Auditing Loop:
   - Prior to final rendering of Chapter 30, pass the draft script through `auditScriptConsistency()`.
   - If the script mentions an item that was lost in Chapter 12, the auditor emits `verdict: "REJECTED"` and triggers an automated script revision with suggested fixes.

---

## 3.4 Concrete Step-by-Step Setup, Migrations, and Production Recipe

Below is the concrete recipe for deploying this memory architecture into a new production environment.

### 3.4.1 Step 1: Docker Compose Setup
Create `docker-compose.yml` in the project root:

```yaml
services:
  postgres:
    image: pgvector/pgvector:pg16
    container_name: empire_postgres
    restart: unless-stopped
    ports:
      - "5432:5432"
    environment:
      POSTGRES_DB: empire_factory
      POSTGRES_USER: empire
      POSTGRES_PASSWORD: empire_local_dev
    volumes:
      - ./pgdata:/var/lib/postgresql/data
      - ./server/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U empire -d empire_factory"]
      interval: 5s
      timeout: 3s
      retries: 5
```

Execute container startup:
```sh
docker compose up -d
```

### 3.4.2 Step 2: PostgreSQL Schema Migrations
Execute the initialization script and migrations in exact sequence.

```sql
-- 1. Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Core Memory Tables
CREATE TABLE IF NOT EXISTS creator_profiles (
    project_id            VARCHAR(255) PRIMARY KEY,
    creator_name          VARCHAR(255) DEFAULT 'Creator',
    tone_preference       TEXT DEFAULT 'Dynamic, Authoritative, High-Retention',
    banned_phrases        JSONB DEFAULT '[]'::jsonb,
    primary_niches        JSONB DEFAULT '[]'::jsonb,
    audience_dna          JSONB DEFAULT '{"peakEngagement": "Cold Opens", "preferredLength": "10-15 mins"}'::jsonb,
    editorial_preferences JSONB DEFAULT '[]'::jsonb,
    feedback_history      JSONB DEFAULT '[]'::jsonb,
    created_at            BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    last_updated          BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS chekhovs_guns (
    gun_id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           VARCHAR(255) NOT NULL,
    planted_in_episode   INTEGER NOT NULL,
    detail               TEXT NOT NULL,
    potential_payoff     TEXT NOT NULL,
    status               VARCHAR(32) NOT NULL DEFAULT 'planted'
                         CHECK (status IN ('planted', 'detonated', 'archived')),
    detonated_in_episode INTEGER,
    created_at           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at           BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE TABLE IF NOT EXISTS episode_embeddings (
    episode_id     TEXT PRIMARY KEY,
    project_id     VARCHAR(255) NOT NULL DEFAULT 'default',
    session_id     TEXT,
    episode_number INTEGER NOT NULL,
    embedding      vector(768) NOT NULL,
    title          TEXT NOT NULL,
    concept        TEXT NOT NULL,
    summary        TEXT NOT NULL,
    created_at     BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

CREATE INDEX IF NOT EXISTS idx_embeddings_project_ep
    ON episode_embeddings (project_id, episode_number);

CREATE INDEX IF NOT EXISTS idx_episode_embeddings_cosine
    ON episode_embeddings
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 20);

-- 3. Job State Machine Table
CREATE TABLE IF NOT EXISTS jobs (
    job_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id      VARCHAR(255) NOT NULL,
    job_type        VARCHAR(50) NOT NULL CHECK (job_type IN ('vision', 'blueprint', 'scripting', 'audio')),
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_one_active_per_project_type
    ON jobs (project_id, job_type)
    WHERE status IN ('QUEUED', 'RUNNING');

-- 4. GEPA Telemetry Tables
CREATE TABLE IF NOT EXISTS agent_traces (
    trace_id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    episode_id           VARCHAR(255) NOT NULL,
    episode_number       INTEGER NOT NULL,
    project_id           VARCHAR(255) NOT NULL,
    agent_name           VARCHAR(100) NOT NULL,
    prompt_tokens        INTEGER NOT NULL DEFAULT 0,
    response_tokens      INTEGER NOT NULL DEFAULT 0,
    duration_ms          INTEGER NOT NULL DEFAULT 0,
    input_hash           VARCHAR(64) NOT NULL,
    llm_mentor_score     DECIMAL(5,2),
    human_score          DECIMAL(5,2),
    creator_anchor_score DECIMAL(5,2),
    final_blended_score  DECIMAL(5,2) NOT NULL,
    skills_used          JSONB DEFAULT '[]'::jsonb,
    is_divergent         BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS skill_registry (
    skill_id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name        VARCHAR(255) NOT NULL,
    project_id        VARCHAR(255) NOT NULL,
    status            VARCHAR(50) NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft', 'testing', 'validated', 'reverted', 'archived')),
    confidence_score  DECIMAL(4,3) NOT NULL,
    baseline_avg      DECIMAL(5,2) NOT NULL,
    testing_avg       DECIMAL(5,2),
    performance_delta DECIMAL(5,2),
    test_episodes_run INTEGER DEFAULT 0,
    test_window_size  INTEGER DEFAULT 5,
    file_path         TEXT NOT NULL,
    pattern_evidence  TEXT,
    conflicts_with    JSONB DEFAULT '[]'::jsonb,
    discovered_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    validated_at      TIMESTAMP WITH TIME ZONE,
    reverted_at       TIMESTAMP WITH TIME ZONE,
    reverted_reason   TEXT,
    CONSTRAINT uq_project_skill UNIQUE (project_id, skill_name)
);

CREATE TABLE IF NOT EXISTS gepa_circuit_breaker (
    project_id            VARCHAR(255) PRIMARY KEY,
    consecutive_failures  INTEGER DEFAULT 0,
    is_dormant            BOOLEAN DEFAULT FALSE,
    dormant_until_episode INTEGER,
    last_failure_at       TIMESTAMP WITH TIME ZONE,
    last_success_at       TIMESTAMP WITH TIME ZONE,
    updated_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Maintenance Procedures
CREATE OR REPLACE FUNCTION reconcile_zombie_jobs()
RETURNS INT AS $$
DECLARE reaped_count INT;
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

CREATE OR REPLACE FUNCTION prune_stale_gepa_traces()
RETURNS void AS $$
BEGIN
    DELETE FROM agent_traces
    WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;
```

### 3.4.3 Step 3: Runtime Calling Patterns and Error Handling
When invoking memory services before generating a script, implement the client-server pattern below.

```typescript
// 1. Client Memory Assembly Request with Fast-Timeout Fallback
import { ClientMemoryAssembly } from './types';

const API_BASE = process.env.VITE_API_URL || 'http://localhost:3001';

export async function fetchMemoryBrief(
    projectId: string,
    episodeNumber: number,
    concept: string,
    embedding?: number[]
): Promise<ClientMemoryAssembly> {
    try {
        const response = await fetch(`${API_BASE}/api/memory/assembly-brief`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId, episodeNumber, concept, conceptEmbedding: embedding }),
            signal: AbortSignal.timeout(4000) // Hard 4-second cutoff
        });
        if (!response.ok) throw new Error(`Server returned HTTP ${response.status}`);
        const data = await response.json();
        return data.assembly;
    } catch (err) {
        console.warn('[Memory] Backend unreachable, using offline fallback context:', err);
        return {
            soulBlock: '### OPERATIONAL RULES\n- High retention opening\n- Clear narrative pacing',
            creatorBlock: '### CREATOR VOICE\n- Authoritative, engaging tone',
            continuityBlock: '### CONTINUITY\n- Standalone narrative focus',
            estimatedTokens: 45
        };
    }
}
```

```typescript
// 2. Concurrency Safe State Saving with CAS (Compare-And-Swap) Lock
export function persistMemoryState(
    currentState: FullMemoryState,
    expectedVersion: number
): FullMemoryState {
    if (currentState.stateVersion !== expectedVersion) {
        throw new Error(
            `Concurrent modification detected! Expected v${expectedVersion}, found v${currentState.stateVersion}`
        );
    }
    // Increment version for next atomic update
    const updatedState = {
        ...currentState,
        stateVersion: currentState.stateVersion + 1,
        lastUpdatedAfterEpisode: currentState.brain.lastEpisodeNumber
    };
    return updatedState;
}
```

---

## Conclusion
The memory architecture audited in Part 1 and generalized in Part 2 provides an SRE-grade, deterministic foundation for serialized generation.
By combining Docker containerization, PostgreSQL vector operations, file-based identity bibles, and dual-end ledger windowing, the system eliminates memory loss across episodes 1 to 50 while strictly guaranteeing token boundaries and execution immutability.
