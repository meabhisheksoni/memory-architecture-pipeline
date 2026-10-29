/**
 * memoryTypes.ts — Strict types and configuration for Layer 1 Memory System.
 *
 * All interfaces are shared across projectSoulAgent, creatorProfileAgent,
 * and memoryCurator (L1B). Configuration constants enforce hard boundaries
 * to prevent token blowup and unbounded array growth.
 *
 * These types live server-side only — the browser never imports this file.
 */

// ============================================================================
// Core Data Interfaces
// ============================================================================

export interface ProjectSoul {
    projectId: string;
    lastUpdated: string;
    episodesProduced: number;
    operationalRules: string[];
    environmentNotes: string[];
    knownPitfalls: string[];
}

export interface CreatorProfile {
    projectId: string;
    creatorName: string;
    tonePreference: string;
    bannedPhrases: string[];
    primaryNiches: string[];
    audienceDna: {
        peakEngagement: string;
        lowestEngagement?: string;
        preferredLength: string;
    };
    editorialPreferences: string[];
    feedbackHistory: Array<{
        episode: number;
        feedback: string;
        action: string;
        timestamp: number;
    }>;
    lastUpdated: number;
}

export interface ChekhovsGun {
    gunId?: string;
    projectId: string;
    plantedInEpisode: number;
    detail: string;
    potentialPayoff: string;
    status: 'planted' | 'detonated' | 'archived';
    detonatedInEpisode?: number;
    createdAt?: number;
}

export interface ContinuityBrief {
    callbackOpportunity: string;
    emotionalState: string;
    openLoopResolution: string;
    chekhovsGunPlant?: string;
    chekhovsGunDetonation?: string;
    thematicContext: string;
}

export interface AssembledMemoryContext {
    soulBlock: string;
    creatorBlock: string;
    continuityBlock: string;
    estimatedTokens: number;
}

// ============================================================================
// Configuration — Hard boundary constraints
// ============================================================================

export const MEMORY_CONFIG = {
    // Array size caps — prevent unbounded growth over hundreds of episodes
    MAX_SOUL_RULES: 15,
    MAX_PITFALLS: 10,
    MAX_BANNED_PHRASES: 20,
    MAX_EDITORIAL_PREFS: 10,
    MAX_FEEDBACK_HISTORY: 10,

    // RAG retrieval settings (used by memoryCurator in L1B)
    RAG_TOP_K: 5,
    MIN_SIMILARITY_SCORE: 0.65, // Reject low-relevance matches to prevent hallucination

    // Token budgets for prompt injection — prevents context from eating the generation window
    TOKEN_BUDGET: {
        SOUL_BLOCK: 350,
        CREATOR_BLOCK: 200,
        CONTINUITY_BLOCK: 250,
        MAX_TOTAL: 950,
    },

    // Feature flags — allow disabling individual memory tiers without code changes
    ENABLE_ACTIVE_RAG: true,
    ENABLE_SOUL_UPDATES: true,
    ENABLE_CREATOR_FEEDBACK: true,

    // Timeouts — prevent slow DB or AI calls from blocking the generation pipeline
    DB_TIMEOUT_MS: 3000,
    AI_TIMEOUT_MS: 12000,
} as const;
