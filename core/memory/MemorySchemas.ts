/**
 * Memory Core - Schema Definitions
 * Strict Zod-validated schemas for the 5 Memory Players.
 * 
 * Architecture:
 * - ThemeBrain: Themes, Plots (Central Brain)
 * - ContinuityLedger: Promises, Debts (Debt Collector)
 * - DirectorMap: Tone, Pacing (Showrunner)
 * - ChekhovStore: Guns, Payoffs (Planting Agent)
 * - ActorSoul: Voice, Quirks (Actor's Soul)
 */
import { z } from 'zod';

// ===== SCHEMA VERSION (For Migrations) =====
export const MEMORY_SCHEMA_VERSION = 2;

// ===== AUDIT ENTRY =====
export const MemoryAuditEntrySchema = z.object({
    timestamp: z.number(),
    agentId: z.string(),
    store: z.enum(['brain', 'ledger', 'director', 'chekhov', 'soul']),
    action: z.enum(['add', 'update', 'delete', 'resolve']),
    delta: z.string(),   // JSON stringified diff
    reason: z.string()
});
export type MemoryAuditEntry = z.infer<typeof MemoryAuditEntrySchema>;

// ===== AUDIT SUMMARY (For Archival) =====
export const AuditSummarySchema = z.object({
    periodStart: z.number(),
    periodEnd: z.number(),
    entriesCount: z.number(),
    stats: z.object({
        skillsAdded: z.number(),
        debtsResolved: z.number(),
        gunsPlanted: z.number(),
        gunsDetonated: z.number()
    })
});
export type AuditSummary = z.infer<typeof AuditSummarySchema>;

// ===== QUARANTINE ENTRY =====
export const QuarantineEntrySchema = z.object({
    id: z.string(),
    data: z.any(),
    store: z.string(),
    reason: z.string(),
    createdAt: z.number()
});
export type QuarantineEntry = z.infer<typeof QuarantineEntrySchema>;

// ===== THE 5 STORES =====

// 1. ThemeBrain (Central Brain - Themes, Plots)
export const ThemeBrainSchema = z.object({
    coveredTopics: z.array(z.object({
        topic: z.string(),
        episodeNumber: z.number(),
        depth: z.enum(['brief', 'detailed', 'deep_dive']).optional()
    })),
    recurringThemes: z.array(z.string()),
    introducedConcepts: z.array(z.object({
        concept: z.string(),
        firstMentionedEpisode: z.number(),
        timesReferenced: z.number()
    })).optional()
});
export type ThemeBrain = z.infer<typeof ThemeBrainSchema>;

// 2. ContinuityLedger (Debt Collector - Promises, Debts)
export const ContinuityLedgerItemSchema = z.object({
    item: z.string(),
    type: z.enum(['promise', 'cliffhanger', 'mystery']),
    introducedEpisode: z.number(),
    status: z.enum(['open', 'resolved']),
    resolvedInEpisode: z.number().optional()
});
export type ContinuityLedgerItem = z.infer<typeof ContinuityLedgerItemSchema>;

export const ContinuityLedgerSchema = z.object({
    openItems: z.array(ContinuityLedgerItemSchema)
});
export type ContinuityLedger = z.infer<typeof ContinuityLedgerSchema>;

// 3. DirectorMap (Showrunner - Tone, Pacing)
export const DirectorMapSchema = z.object({
    currentTone: z.string(),
    lastCliffhanger: z.string().optional(),
    suggestedPacing: z.enum(['slow', 'medium', 'fast']),
    lastEpisodeEnergy: z.enum(['low', 'medium', 'high']).optional(),
    nextEpisodeSuggestion: z.string().optional()
});
export type DirectorMap = z.infer<typeof DirectorMapSchema>;

// 4. ChekhovStore (Planting Agent - Guns, Payoffs)
export const ChekhovGunSchema = z.object({
    detail: z.string(),
    potentialPayoff: z.string(),
    plantedEpisode: z.number(),
    plannedPayoffWindow: z.string().optional(),
    status: z.enum(['planted', 'detonated']),
    detonatedInEpisode: z.number().optional()
});
export type ChekhovGun = z.infer<typeof ChekhovGunSchema>;

export const ChekhovStoreSchema = z.object({
    guns: z.array(ChekhovGunSchema)
});
export type ChekhovStore = z.infer<typeof ChekhovStoreSchema>;

// 6. ValuePayload (Educational Progression)
export const ValuePayloadSchema = z.object({
    episodeNumber: z.number(),
    lesson: z.string(),
    framework: z.string().nullable().optional(),
    actionItem: z.string().optional(),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']),
    buildsOn: z.string().nullable().optional()
});
export type ValuePayload = z.infer<typeof ValuePayloadSchema>;

// 7. StoryThread (Multi-Episode Arcs)
export const StoryThreadSchema = z.object({
    threadId: z.string(),
    title: z.string(),
    startedEpisode: z.number(),
    episodesInvolved: z.array(z.number()),
    status: z.enum(['active', 'paused', 'resolved']),
    currentState: z.string(),
    anticipatedResolution: z.string().optional(),
    emotionalStakes: z.enum(['low', 'medium', 'high'])
});
export type StoryThread = z.infer<typeof StoryThreadSchema>;

// 8. EmotionalBeat (Psychological Hooks)
export const EmotionalBeatSchema = z.object({
    episodeNumber: z.number(),
    emotionalPeak: z.string(),
    peakMoment: z.string(),
    intensityScore: z.number(),
    vulnerabilityMoment: z.string().nullable().optional(),
    tensionPoint: z.string().nullable().optional()
});
export type EmotionalBeat = z.infer<typeof EmotionalBeatSchema>;

// 9. BingeMechanic (Retention Triggers)
export const BingeMechanicSchema = z.object({
    episodeNumber: z.number(),
    cliffhangerStrength: z.number(),
    openLoops: z.array(z.string()),
    curiosityGap: z.string(),
    hookType: z.enum(['question', 'revelation', 'conflict', 'mystery', 'promise']),
    nextEpisodeTease: z.string().optional()
});
export type BingeMechanic = z.infer<typeof BingeMechanicSchema>;

// 10. MemorableCallback (Callback Opportunities)
export const MemorableCallbackSchema = z.object({
    type: z.string(),
    description: z.string(),
    episodeNumber: z.number(),
    callbackPotential: z.enum(['low', 'medium', 'high'])
});
export type MemorableCallback = z.infer<typeof MemorableCallbackSchema>;

// 11. FeedbackQueueEntry (Audience Feedback Intelligence)
export const FeedbackQueueEntrySchema = z.object({
    id: z.string(),
    text: z.string(),
    sentiment: z.enum(['positive', 'negative', 'neutral', 'question']),
    addedAt: z.number(),
    forEpisode: z.number(),
    priority: z.enum(['urgent', 'normal', 'low', 'ignore']),
    suggestedResponseEpisode: z.number().optional(),
    responseType: z.enum(['acknowledge', 'address', 'celebrate', 'ignore']),
    aiReasoning: z.string().optional(),
    addressed: z.boolean(),
    addressedInEpisode: z.number().optional(),
    addressedHow: z.string().optional()
});
export type FeedbackQueueEntry = z.infer<typeof FeedbackQueueEntrySchema>;

// 12. MemorableElement (consolidated with callbacks for backward compat)
export const MemorableElementSchema = z.object({
    type: z.string(),
    description: z.string(),
    episodeNumber: z.number(),
    callbackPotential: z.string()
});
export type MemorableElement = z.infer<typeof MemorableElementSchema>;

// 5. ActorSoul (Actor's Soul - Voice, Quirks, Personality)
export const ActorSoulSchema = z.object({
    name: z.string().optional(),
    speakingStyle: z.string(),
    energyLevel: z.enum(['low', 'medium', 'high']),
    quirks: z.array(z.string()),
    emotionalBaseline: z.object({
        state: z.string(),
        reason: z.string(),
        shift: z.string().optional()
    }),
    beliefs: z.record(z.string(), z.object({
        stance: z.enum(['Skeptical', 'Neutral', 'Curious', 'Optimistic', 'Advocate']),
        reason: z.string(),
        changedInEpisode: z.number().optional()
    })).optional(),
    inventory: z.object({
        skills: z.array(z.string()),
        secrets: z.array(z.string()),
        items: z.array(z.string()),
        traumas: z.array(z.string())
    }).optional()
});
export type ActorSoul = z.infer<typeof ActorSoulSchema>;

// ===== FULL MEMORY STATE =====
export const FullMemoryStateSchema = z.object({
    version: z.number(),         // Schema version (for migrations)
    stateVersion: z.number(),    // CAS lock (increments on save)
    brain: ThemeBrainSchema,
    ledger: ContinuityLedgerSchema,
    director: DirectorMapSchema,
    chekhov: ChekhovStoreSchema,
    soul: ActorSoulSchema,
    // Advanced tracking stores (v2)
    valuePayloads: z.array(ValuePayloadSchema).optional().default([]),
    storyThreads: z.array(StoryThreadSchema).optional().default([]),
    emotionalBeats: z.array(EmotionalBeatSchema).optional().default([]),
    bingeMechanics: z.array(BingeMechanicSchema).optional().default([]),
    memorableCallbacks: z.array(MemorableCallbackSchema).optional().default([]),
    memorableElements: z.array(MemorableElementSchema).optional().default([]),
    feedbackQueue: z.array(FeedbackQueueEntrySchema).optional().default([]),
    auditLog: z.array(MemoryAuditEntrySchema),
    auditArchive: z.array(AuditSummarySchema),
    quarantine: z.array(QuarantineEntrySchema),
    lastUpdatedAfterEpisode: z.number()
});
export type FullMemoryState = z.infer<typeof FullMemoryStateSchema>;

// ===== DEFAULT EMPTY STATE =====
export const INITIAL_MEMORY_STATE: FullMemoryState = {
    version: MEMORY_SCHEMA_VERSION,
    stateVersion: 0,
    brain: {
        coveredTopics: [],
        recurringThemes: [],
        introducedConcepts: []
    },
    ledger: { openItems: [] },
    director: {
        currentTone: 'Neutral',
        suggestedPacing: 'medium'
    },
    chekhov: { guns: [] },
    valuePayloads: [],
    storyThreads: [],
    emotionalBeats: [],
    bingeMechanics: [],
    memorableCallbacks: [],
    memorableElements: [],
    feedbackQueue: [],
    soul: {
        speakingStyle: 'Conversational',
        energyLevel: 'medium',
        quirks: [],
        emotionalBaseline: {
            state: 'Neutral',
            reason: 'Series start',
            shift: 'None'
        },
        beliefs: {},
        inventory: {
            skills: [],
            secrets: [],
            items: [],
            traumas: []
        }
    },
    auditLog: [],
    auditArchive: [],
    quarantine: [],
    lastUpdatedAfterEpisode: 0
};
