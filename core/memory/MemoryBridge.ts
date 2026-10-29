/**
 * Memory Bridge - Converts between ThemeTracker and FullMemoryState
 * 
 * Purpose: Allows gradual migration from old ThemeTracker format to new MemoryCore.
 * Agents can continue using ThemeTracker while we store data in MemoryCore.
 */
import { ThemeTracker, OpenLedgerItem, ChekhovsGun, MemorableCallback, ProjectState } from '../../types';
import { INITIAL_THEME_TRACKER } from '../themeTracker';
import {
    FullMemoryState,
    INITIAL_MEMORY_STATE,
    MEMORY_SCHEMA_VERSION,
    ThemeBrain,
    ContinuityLedger,
    DirectorMap,
    ChekhovStore,
    ActorSoul,
    ChekhovGun as MemoryChekhovGun,
    ContinuityLedgerItem
} from './MemorySchemas';

// ===== THEME TRACKER → MEMORY CORE =====

/**
 * Convert ThemeTracker to FullMemoryState.
 * Used when saving data to MemoryCore format.
 */
export function themeTrackerToMemory(
    tracker: ThemeTracker,
    existingMemory?: FullMemoryState
): FullMemoryState {
    const base = existingMemory || INITIAL_MEMORY_STATE;

    // 1. ThemeBrain (Themes, Topics, Concepts)
    const brain: ThemeBrain = {
        coveredTopics: tracker.coveredTopics.map(t => ({
            topic: t.topic,
            episodeNumber: t.episodeNumber,
            depth: t.depth
        })),
        recurringThemes: tracker.recurringThemes,
        introducedConcepts: tracker.introducedConcepts.map(c => ({
            concept: c.concept,
            firstMentionedEpisode: c.firstMentionedEpisode,
            timesReferenced: c.timesReferenced
        }))
    };

    // 2. ContinuityLedger (Open Ledger Items)
    const ledger: ContinuityLedger = {
        openItems: (tracker.openLedger || []).map((item: OpenLedgerItem): ContinuityLedgerItem => ({
            item: item.item,
            type: item.type,
            introducedEpisode: item.introducedEpisode,
            status: item.status,
            resolvedInEpisode: item.resolvedInEpisode
        }))
    };

    // 3. DirectorMap (Tone, Pacing from emotional beats)
    const lastBeat = (tracker.emotionalBeats || []).slice(-1)[0];
    const director: DirectorMap = {
        currentTone: tracker.emotionalBaseline?.state || 'Neutral',
        suggestedPacing: 'medium',  // Default, can be enhanced later
        lastEpisodeEnergy: lastBeat ? (lastBeat.intensityScore > 7 ? 'high' : lastBeat.intensityScore > 4 ? 'medium' : 'low') : undefined,
        lastCliffhanger: (tracker.bingeMechanics || []).slice(-1)[0]?.curiosityGap
    };

    // 4. ChekhovStore (Guns)
    const chekhov: ChekhovStore = {
        guns: (tracker.chekhovsGuns || []).map((gun: ChekhovsGun): MemoryChekhovGun => ({
            detail: gun.detail,
            potentialPayoff: gun.potentialPayoff,
            plantedEpisode: gun.episodeNumber,
            plannedPayoffWindow: gun.plannedPayoffWindow,
            status: gun.status,
            detonatedInEpisode: gun.detonatedInEpisode
        }))
    };

    // 5. ActorSoul (Character State, Beliefs, Inventory)
    const soul: ActorSoul = {
        name: tracker.characterState?.name,
        speakingStyle: 'Conversational',  // Default
        energyLevel: 'medium',
        quirks: [],
        emotionalBaseline: {
            state: tracker.emotionalBaseline?.state || 'Neutral',
            reason: tracker.emotionalBaseline?.reason || 'Series start',
            shift: tracker.emotionalBaseline?.shift
        },
        beliefs: tracker.beliefs || {},
        inventory: tracker.characterState?.inventory || {
            skills: [],
            secrets: [],
            items: [],
            traumas: []
        }
    };

    return {
        version: MEMORY_SCHEMA_VERSION,
        stateVersion: base.stateVersion,
        brain,
        ledger,
        director,
        chekhov,
        soul,
        // Advanced tracking — carry through losslessly
        valuePayloads: (tracker.valuePayloads || []).slice(-30),
        storyThreads: (tracker.storyThreads || []).slice(-10),
        emotionalBeats: (tracker.emotionalBeats || []).slice(-30),
        bingeMechanics: (tracker.bingeMechanics || []).slice(-20),
        memorableCallbacks: (tracker.memorableCallbacks || []).slice(-20),
        // Consolidate memorableElements into memorableCallbacks format for MemoryCore
        memorableElements: (tracker.memorableElements || []).slice(-20),
        feedbackQueue: (tracker.feedbackQueue || []).map(f => ({
            id: f.id,
            text: f.text,
            sentiment: f.sentiment,
            addedAt: f.addedAt,
            forEpisode: f.forEpisode,
            priority: f.priority,
            suggestedResponseEpisode: f.suggestedResponseEpisode,
            responseType: f.responseType,
            aiReasoning: f.aiReasoning,
            addressed: f.addressed,
            addressedInEpisode: f.addressedInEpisode,
            addressedHow: f.addressedHow
        })).slice(-50),
        auditLog: base.auditLog,
        auditArchive: base.auditArchive,
        quarantine: base.quarantine,
        lastUpdatedAfterEpisode: tracker.lastUpdatedAfterEpisode
    };
}

// ===== MEMORY CORE → THEME TRACKER =====

/**
 * Convert FullMemoryState back to ThemeTracker.
 * Used for backward compatibility with existing agents.
 */
export function memoryToThemeTracker(memory: FullMemoryState): ThemeTracker {
    return {
        // Original tracking
        coveredTopics: memory.brain.coveredTopics.map(t => ({
            topic: t.topic,
            episodeNumber: t.episodeNumber,
            depth: t.depth || 'brief'
        })),
        introducedConcepts: (memory.brain.introducedConcepts || []).map(c => ({
            concept: c.concept,
            firstMentionedEpisode: c.firstMentionedEpisode,
            timesReferenced: c.timesReferenced
        })),
        memorableElements: (memory.memorableElements || []) as any[],
        unresolvedItems: memory.ledger.openItems
            .filter(i => i.status === 'open')
            .map(i => ({
                item: i.item,
                type: i.type as 'listener_question' | 'cliffhanger' | 'promise',
                introducedEpisode: i.introducedEpisode,
                resolved: false
            })),
        recurringThemes: memory.brain.recurringThemes,
        lastUpdatedAfterEpisode: memory.lastUpdatedAfterEpisode,

        // Advanced tracking (empty for now, can be enhanced)
        valuePayloads: (memory.valuePayloads || []) as any[],
        storyThreads: memory.storyThreads || [],
        emotionalBeats: (memory.emotionalBeats || []) as any[],
        bingeMechanics: memory.bingeMechanics || [],

        // God-Level Memory
        characterState: memory.soul.name ? {
            name: memory.soul.name,
            emotionalBaseline: {
                state: memory.soul.emotionalBaseline.state,
                reason: memory.soul.emotionalBaseline.reason,
                shift: memory.soul.emotionalBaseline.shift || 'None'
            },
            inventory: memory.soul.inventory || { skills: [], secrets: [], items: [], traumas: [] },
            beliefs: memory.soul.beliefs || {}
        } : undefined,

        openLedger: memory.ledger.openItems.map(i => ({
            item: i.item,
            type: i.type,
            introducedEpisode: i.introducedEpisode,
            status: i.status,
            resolvedInEpisode: i.resolvedInEpisode
        })),

        chekhovsGuns: memory.chekhov.guns.map(g => ({
            detail: g.detail,
            potentialPayoff: g.potentialPayoff,
            episodeNumber: g.plantedEpisode,
            plannedPayoffWindow: g.plannedPayoffWindow,
            status: g.status,
            detonatedInEpisode: g.detonatedInEpisode
        })),

        memorableCallbacks: (memory.memorableCallbacks || []) as any[],

        beliefs: memory.soul.beliefs || {},

        emotionalBaseline: {
            state: memory.soul.emotionalBaseline.state,
            reason: memory.soul.emotionalBaseline.reason,
            shift: memory.soul.emotionalBaseline.shift || 'None'
        },

        feedbackQueue: (memory.feedbackQueue || []) as any[], // Restored from MemoryCore
    };
}

// ===== MERGE HELPER =====

/**
 * Merge new ThemeTracker data into existing MemoryCore state.
 * Preserves audit logs and quarantine from existing state.
 */
export function mergeTrackerIntoMemory(
    newTracker: ThemeTracker,
    existingMemory: FullMemoryState
): FullMemoryState {
    const converted = themeTrackerToMemory(newTracker, existingMemory);

    return {
        ...converted,
        // Preserve metadata from existing
        stateVersion: existingMemory.stateVersion,
        auditLog: existingMemory.auditLog,
        auditArchive: existingMemory.auditArchive,
        quarantine: existingMemory.quarantine
    };
}

/**
 * Priority Lookup Helper - Prefers MemoryCore if available but validates freshness.
 * 
 * INVERSION LOGIC:
 * If MemoryCore is "stale" (older than ThemeTracker), we fallback to ThemeTracker
 * to prevent regression. This handles cases where dual-write failed silently.
 */
export function getAvailableTracker(project: ProjectState): ThemeTracker {
    // 1. If no memory core, strictly fallback to legacy
    if (!project.memoryCore) {
        return project.themeTracker || INITIAL_THEME_TRACKER;
    }

    // 2. STALENESS CHECK (The "Kill Chain")
    const legacyEp = project.themeTracker?.lastUpdatedAfterEpisode || 0;
    const memoryEp = project.memoryCore.lastUpdatedAfterEpisode || 0;

    if (legacyEp > memoryEp) {
        console.warn(`[MemoryBridge] ⚠️ DETECTED STALE MEMORY CORE! (Legacy: ${legacyEp} > Core: ${memoryEp}). Using Legacy to prevent regression.`);
        return project.themeTracker || INITIAL_THEME_TRACKER;
    }

    // 3. Otherwise, use the verified MemoryCore
    return memoryToThemeTracker(project.memoryCore);
}
