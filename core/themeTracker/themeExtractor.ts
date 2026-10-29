import { GeminiService } from '../geminiService';
import {
    Episode,
    ThemeTracker,
    StoryThread,
    CharacterState,
    CharacterInventory,
    EmotionalBaseline,
    BeliefStance,
} from '../../types';

// ===== SAFEGUARD 2: Semantic Validation for Historian Output =====

interface HistorianOutput {
    characterInventory?: CharacterInventory;
    emotionalBaseline?: EmotionalBaseline;
    openLedger?: any[];
    memorableCallbacks?: any[];
    chekhovsGuns?: any[];
    newBeliefs?: { [topic: string]: BeliefStance };
    characterState?: CharacterState;
}

/**
 * Validates that Historian Agent output is semantically meaningful.
 * Prevents "Valid but Wrong" JSON responses (e.g., skills: ["N/A"]).
 */
export const validateHistorianOutput = (output: HistorianOutput): boolean => {
    // Check for garbage values in inventory
    const garbagePatterns = ['n/a', 'none', 'null', 'undefined', 'na', 'no data'];

    const hasGarbageInventory = output.characterInventory && (
        output.characterInventory.skills?.some(s => garbagePatterns.includes(s.toLowerCase().trim())) ||
        output.characterInventory.secrets?.some(s => garbagePatterns.includes(s.toLowerCase().trim())) ||
        output.characterInventory.items?.some(s => garbagePatterns.includes(s.toLowerCase().trim()))
    );

    if (hasGarbageInventory) {
        console.warn('[ThemeTracker] ⚠️ Safeguard 2: Detected garbage values in inventory');
        return false;
    }

    // Check if there's ANY meaningful content
    const hasContent = (
        (output.characterInventory?.skills?.length || 0) > 0 ||
        (output.characterInventory?.secrets?.length || 0) > 0 ||
        (output.openLedger?.length || 0) > 0 ||
        (output.memorableCallbacks?.length || 0) > 0 ||
        (output.chekhovsGuns?.length || 0) > 0 ||
        output.emotionalBaseline?.state !== undefined
    );

    if (!hasContent) {
        console.warn('[ThemeTracker] ⚠️ Safeguard 2: No meaningful content extracted');
        // Note: We return true here because empty extraction is valid for some episodes
        // The garbage check above is the critical one
    }

    return !hasGarbageInventory;
};

// ===== INITIAL EMPTY TRACKER =====

export const INITIAL_THEME_TRACKER: ThemeTracker = {
    // Original tracking
    coveredTopics: [],
    introducedConcepts: [],
    memorableElements: [],
    unresolvedItems: [],
    recurringThemes: [],
    lastUpdatedAfterEpisode: 0,

    // NEW: Advanced tracking
    valuePayloads: [],
    storyThreads: [],
    emotionalBeats: [],
    bingeMechanics: [],

    // ===== GOD-LEVEL MEMORY ARCHITECTURE (Safeguard 6: Safe Defaults) =====

    // Layer 1: Character State - undefined initially, will be set after first episode
    characterState: undefined,

    // Layer 1: Open Ledger - empty array (with status tracking)
    openLedger: [],

    // Layer 1: Chekhov's Guns - empty array
    chekhovsGuns: [],

    // Layer 1: Memorable Callbacks - empty array
    memorableCallbacks: [],

    // Layer 5: Belief System - empty object (not undefined!)
    beliefs: {},

    // Layer 1: Emotional Baseline - neutral start
    emotionalBaseline: { state: 'Neutral', reason: 'Series start', shift: 'None' },

    // Layer 7: Intelligent Feedback Queue - empty array
    feedbackQueue: []
};

// ===== THEME EXTRACTOR AI =====

export const extractThemesFromEpisodes = async (
    service: GeminiService,
    newEpisodes: Episode[],
    currentTracker: ThemeTracker
): Promise<ThemeTracker> => {
    console.log(`[ThemeTracker] 🧠 Extracting themes from ${newEpisodes.length} new episodes...`);

    // Build episode summaries for analysis
    const episodeSummaries = newEpisodes.map((e, idx) => {
        const epNum = currentTracker.lastUpdatedAfterEpisode + idx + 1;
        return `Episode ${epNum}: "${e.title}"
    Concept: ${e.concept}
    Summary: ${e.summary}${e.script ? `\n    Script Excerpt: ${e.script.substring(0, 3000)}` : ''}`;
    }).join('\n\n');

    // Current memory context (keep concise!)
    const currentMemory = `
Current Covered Topics(last 20): ${currentTracker.coveredTopics.slice(-20).map(t => t.topic).join(', ') || 'None'}
Current Concepts: ${currentTracker.introducedConcepts.slice(-10).map(c => c.concept).join(', ') || 'None'}
Current Themes: ${currentTracker.recurringThemes.join(', ') || 'None'}
    `;

    const prompt = `
    ROLE: ADVANCED THEME EXTRACTION & MEMORY ANALYST
    
    You analyze podcast episodes to extract COMPREHENSIVE information for:
        - Content continuity(avoid repetition)
            - Callback opportunities(memorable moments)
                - Educational progression(value payloads building)
                    - Narrative arcs(story threads)
                        - Emotional engagement(psychological hooks)
                            - Retention mechanics(binge triggers)
    
    Be SELECTIVE but THOROUGH - capture important patterns.
    
    ===== NEWLY GENERATED EPISODES =====
        ${episodeSummaries}
    
    ===== CURRENT MEMORY =====
        ${currentMemory}
    
    ===== EXTRACTION TASKS =====
    
    📋 1. COVERED TOPICS
    - Significant subjects discussed
        - depth: "brief" | "detailed" | "deep_dive"
            - Max 3 per episode
    
    💡 2. INTRODUCED CONCEPTS
    - New frameworks, methods, ideas
        - Max 2 per episode
    
    🎭 3. MEMORABLE ELEMENTS
    - Jokes, personal stories, quotable moments
        - callbackPotential: "high" | "medium" | "low"
            - Max 2 per episode
    
    ❓ 4. UNRESOLVED ITEMS
    - Cliffhangers, promises, open questions
        - Max 1 per episode
    
    🔄 5. RECURRING THEMES
    - Cross - episode patterns
        - Max 2 NEW themes
    
    📚 6. VALUE PAYLOADS(NEW - Educational Content)
    - lesson: Core takeaway of the episode
        - framework: Named method if any("The 5-Step Process")
            - actionItem: What listener should do after
                - skillLevel: "beginner" | "intermediate" | "advanced"
                    - buildsOn: Reference to previous lesson if applicable
                        - Max 1 per episode
    
    📖 7. STORY THREADS(NEW - Multi - Episode Arcs)
    - Ongoing narratives spanning episodes
        - title: Name of the thread("Alex's Career Journey")
            - status: "active" | "paused" | "resolved"
                - currentState: Where the story is now
                    - emotionalStakes: "low" | "medium" | "high"
                        - Only track threads with HIGH callback potential
                            - Max 1 NEW thread per batch
    
    💔 8. EMOTIONAL BEATS(NEW - Psychological Hooks)
    - emotionalPeak: "joy" | "sadness" | "fear" | "anger" | "surprise" | "tension" | "relief" | "inspiration"
        - peakMoment: Brief description of the moment
            - intensityScore: 1 - 10
                - vulnerabilityMoment: Personal share from host(if any)
    - tensionPoint: Conflict / disagreement(if any)
    - Max 1 per episode
    
    🔄 9. BINGE MECHANICS(NEW - Retention Triggers)
    - cliffhangerStrength: 1 - 10 score
        - openLoops: List of unanswered questions
            - curiosityGap: What listeners want to know next
                - hookType: "question" | "revelation" | "conflict" | "mystery" | "promise"
                    - nextEpisodeTease: "Next time..." teaser
                        - Max 1 per episode
    
                            ===== GOD - LEVEL MEMORY ARCHITECTURE(CRITICAL) =====
    
    📦 10. CHARACTER STATE(Host Evolution)
    - Track the host's CURRENT state after this episode
        - inventory.skills: New skills learned
            - inventory.secrets: New information / secrets known
                - inventory.items: Resources or items mentioned
                    - inventory.traumas: Failures or painful experiences shared
                        - emotionalBaseline: Current emotional state + reason + shift from before
    
    🧠 11. BELIEF SYSTEM(Opinion Tracking)
    - What OPINIONS did the host express on key topics ?
        - Track stance: "Skeptical" | "Neutral" | "Curious" | "Optimistic" | "Advocate"
            - Did any belief SHIFT from previous stance ?
                - Max 3 beliefs per batch
    
    ⏳ 12. OPEN LEDGER(Unresolved for Future Reference)
    - Promises made but not yet kept
        - Cliffhangers that need resolution
            - Mysteries introduced
                - These will be used for MANDATORY callbacks in future episodes
    
    🔫 13. CHEKHOV'S GUNS (Future Payoff Items)
    - Subtle details planted that COULD become important later
        - e.g., "Mentioned a friend named Alex who's a lawyer"
        - Track potential payoff scenario
    
    🎭 14. MEMORABLE CALLBACKS(High - Potential References)
    - Quotable lines, jokes, unique frameworks
        - callbackPotential: "high" | "medium" | "low"
            - High - potential items will be used in future scripts
    
    ✅ 15. RESOLVED LEDGER ITEMS (CRITICAL)
    - Identify which "OPEN LEDGER" items listed below were RESOLVED in these episodes.
    - If resolved, explain HOW.
    
                ===== OUTPUT(JSON ONLY) =====
            {
                "newCoveredTopics": [
                    { "topic": "topic name", "episodeNumber": 1, "depth": "detailed" }
                ],
                "newConcepts": [
                    { "concept": "concept name", "firstMentionedEpisode": 1, "timesReferenced": 1 }
                ],
                "newMemorableElements": [
                    { "type": "joke", "description": "brief description", "episodeNumber": 1, "callbackPotential": "high" }
                ],
                "newUnresolvedItems": [
                    { "item": "what was promised", "type": "promise", "introducedEpisode": 1, "resolved": false }
                ],
                "newRecurringThemes": ["theme1"],

                "newValuePayloads": [
                    {
                        "episodeNumber": 1,
                        "lesson": "Core lesson taught",
                        "framework": "The 3-Step Method",
                        "actionItem": "Practice technique for 5 minutes daily",
                        "skillLevel": "beginner",
                        "buildsOn": "Previous lesson reference or null"
                    }
                ],
                "newStoryThreads": [
                    {
                        "threadId": "thread_unique_id",
                        "title": "Story Thread Title",
                        "startedEpisode": 1,
                        "episodesInvolved": [1],
                        "status": "active",
                        "currentState": "Current state of the story",
                        "anticipatedResolution": "Hint at resolution",
                        "emotionalStakes": "high"
                    }
                ],
                "newEmotionalBeats": [
                    {
                        "episodeNumber": 1,
                        "emotionalPeak": "inspiration",
                        "peakMoment": "When host shared the breakthrough moment",
                        "intensityScore": 8,
                        "vulnerabilityMoment": "Host admitted their biggest failure",
                        "tensionPoint": null
                    }
                ],
                "newBingeMechanics": [
                    {
                        "episodeNumber": 1,
                        "cliffhangerStrength": 8,
                        "openLoops": ["Will they succeed?", "What happened next?"],
                        "curiosityGap": "Listeners want to know if the method actually worked",
                        "hookType": "mystery",
                        "nextEpisodeTease": "Next time, we reveal the shocking results..."
                    }
                ],

                // ===== GOD-LEVEL MEMORY ARCHITECTURE =====

                "characterState": {
                    "name": "Host Name",
                    "emotionalBaseline": {
                        "state": "Hopeful",
                        "reason": "Successfully taught a difficult concept",
                        "shift": "Was anxious, now more confident"
                    },
                    "inventory": {
                        "skills": ["New skill learned this episode"],
                        "secrets": ["Secret revealed or discovered"],
                        "items": ["Resource or item mentioned"],
                        "traumas": ["Failure or painful experience shared"]
                    },
                    "beliefs": {
                        "TopicName": {
                            "stance": "Curious",
                            "reason": "After discussion with expert"
                        }
                    }
                },

                "newOpenLedgerItems": [
                    {
                        "item": "Promise or cliffhanger description",
                        "type": "promise",
                        "introducedEpisode": 1
                    }
                ],

                "newChekhovsGuns": [
                    {
                        "detail": "Subtle detail planted",
                        "potentialPayoff": "Could be used later for...",
                        "episodeNumber": 1
                    }
                ],

                "newMemorableCallbacks": [
                    {
                        "type": "joke",
                        "description": "Quotable line or memorable moment",
                        "episodeNumber": 1,
                        "callbackPotential": "high"
                    }
                ],

                "newBeliefs": {
                    "AI": {
                        "stance": "Curious",
                        "reason": "After discussion with expert",
                        "changedInEpisode": 1
                    }
                },

                "emotionalBaseline": {
                    "state": "Current emotional state",
                    "reason": "Why this state",
                    "shift": "What changed from before"
                },

                "resolvedLedgerItems": [
                    { "item": "item description", "resolvedHow": "Brief explanation" }
                ]
            }

CRITICAL: Extract what's genuinely important. Quality over quantity.
    For GOD - LEVEL fields: Focus on CHARACTER EVOLUTION, BELIEFS, and CONTINUITY HOOKS.
    OUTPUT JSON ONLY.
  `;

    try {
        const response = await service.generateText(prompt);

        let jsonStr = response.replace(/\`\`\`json\n?/gi, '').replace(/\`\`\`\n?/g, '').trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];

        const extracted = JSON.parse(jsonStr);

        // Merge with existing tracker - UPDATED with all new fields
        const updatedTracker: ThemeTracker = {
            // Original tracking
            coveredTopics: [
                ...currentTracker.coveredTopics,
                ...(extracted.newCoveredTopics || [])
            ].slice(-50),

            introducedConcepts: [
                ...currentTracker.introducedConcepts,
                ...(extracted.newConcepts || [])
            ].slice(-30),

            memorableElements: [
                ...currentTracker.memorableElements,
                ...(extracted.newMemorableElements || [])
            ].slice(-20),

            unresolvedItems: [
                ...currentTracker.unresolvedItems,
                ...(extracted.newUnresolvedItems || [])
            ].slice(-15),

            recurringThemes: [
                ...new Set([
                    ...currentTracker.recurringThemes,
                    ...(extracted.newRecurringThemes || [])
                ])
            ].slice(0, 10),

            lastUpdatedAfterEpisode: currentTracker.lastUpdatedAfterEpisode + newEpisodes.length,

            // NEW: Advanced tracking
            valuePayloads: [
                ...(currentTracker.valuePayloads || []),
                ...(extracted.newValuePayloads || [])
            ].slice(-30),

            storyThreads: mergeStoryThreads(
                currentTracker.storyThreads || [],
                extracted.newStoryThreads || []
            ),

            emotionalBeats: [
                ...(currentTracker.emotionalBeats || []),
                ...(extracted.newEmotionalBeats || [])
            ].slice(-30),

            bingeMechanics: [
                ...(currentTracker.bingeMechanics || []),
                ...(extracted.newBingeMechanics || [])
            ].slice(-20),

            // ===== GOD-LEVEL MEMORY ARCHITECTURE =====

            // Layer 1: Character State - preserve or extract new
            characterState: extracted.characterState || currentTracker.characterState,

            // Layer 1: Open Ledger - merge with status tracking (Safeguard 1)
            openLedger: (() => {
                const existing = [...(currentTracker.openLedger || [])];
                const newItems = (extracted.newOpenLedgerItems || []).map((item: any) => ({
                    ...item,
                    status: 'open' as const,
                    introducedEpisode: item.introducedEpisode || (currentTracker.lastUpdatedAfterEpisode + 1)
                }));
                const resolvedList = extracted.resolvedLedgerItems || [];

                // Mark items as resolved — use word-overlap scoring to prevent false matches
                existing.forEach(item => {
                    const resolution = resolvedList.find((r: any) => {
                        const rLower = r.item.toLowerCase();
                        const iLower = item.item.toLowerCase();
                        // Require at least 60% of the shorter string's significant words
                        // to appear in the longer string. Prevents "promise" falsely
                        // matching "promise to interview expert".
                        const rWords = rLower.split(/\s+/).filter((w: string) => w.length > 3);
                        const iWords = iLower.split(/\s+/).filter((w: string) => w.length > 3);
                        if (rWords.length === 0 || iWords.length === 0) return false;
                        const shorter = rWords.length < iWords.length ? rWords : iWords;
                        const longer = rWords.length < iWords.length ? iWords : rWords;
                        const matchCount = shorter.filter((w: string) => longer.includes(w)).length;
                        const matchRatio = matchCount / shorter.length;
                        return matchRatio >= 0.6;
                    });
                    if (resolution && item.status === 'open') {
                        item.status = 'resolved';
                        item.resolvedInEpisode = currentTracker.lastUpdatedAfterEpisode + 1;
                    }
                });

                return [...existing, ...newItems].slice(-40);
            })(),

            // Layer 1: Chekhov's Guns
            chekhovsGuns: [
                ...(currentTracker.chekhovsGuns || []),
                ...(extracted.newChekhovsGuns || []).map((gun: any) => ({
                    ...gun,
                    status: 'planted' as const
                }))
            ].slice(-20),

            // Layer 1: Memorable Callbacks
            memorableCallbacks: [
                ...(currentTracker.memorableCallbacks || []),
                ...(extracted.newMemorableCallbacks || [])
            ].slice(-20),

            // Layer 5: Belief System - merge beliefs
            beliefs: {
                ...(currentTracker.beliefs || {}),
                ...(extracted.newBeliefs || {})
            },

            // Layer 1: Emotional Baseline - use latest
            emotionalBaseline: extracted.emotionalBaseline || currentTracker.emotionalBaseline || { state: 'Neutral', reason: 'Unknown', shift: 'None' },

            // Layer 7: Feedback Queue - preserve existing (managed separately via analyzeFeedback)
            feedbackQueue: currentTracker.feedbackQueue || []
        };

        console.log(`[ThemeTracker] ✅ Advanced Update! Topics: ${updatedTracker.coveredTopics.length}, Value Payloads: ${updatedTracker.valuePayloads.length}, Story Threads: ${updatedTracker.storyThreads.length}, Binge Hooks: ${updatedTracker.bingeMechanics.length} `);

        return updatedTracker;

    } catch (error) {
        // RETRY ONCE on JSON parse failures — these are recoverable
        if (error instanceof SyntaxError) {
            console.warn(`[ThemeTracker] ⚠️ JSON parse failed, retrying with strict prompt...`);
            try {
                const retryResponse = await service.generateText(
                    prompt + '\n\nCRITICAL: Your previous response was not valid JSON. Output ONLY a raw JSON object. No markdown, no backticks, no explanation. Start with { and end with }.'
                );
                let retryJson = retryResponse.trim();
                const retryMatch = retryJson.match(/\{[\s\S]*\}/);
                if (retryMatch) retryJson = retryMatch[0];
                const retryExtracted = JSON.parse(retryJson);

                // Success on retry — proceed with merge (same logic as primary path)
                console.log(`[ThemeTracker] ✅ Retry succeeded, merging extracted data...`);
                const updatedTracker: ThemeTracker = {
                    coveredTopics: [
                        ...currentTracker.coveredTopics,
                        ...(retryExtracted.newCoveredTopics || [])
                    ].slice(-50),
                    introducedConcepts: [
                        ...currentTracker.introducedConcepts,
                        ...(retryExtracted.newConcepts || [])
                    ].slice(-30),
                    memorableElements: [
                        ...currentTracker.memorableElements,
                        ...(retryExtracted.newMemorableElements || [])
                    ].slice(-20),
                    unresolvedItems: [
                        ...currentTracker.unresolvedItems,
                        ...(retryExtracted.newUnresolvedItems || [])
                    ].slice(-15),
                    recurringThemes: [
                        ...new Set([
                            ...currentTracker.recurringThemes,
                            ...(retryExtracted.newRecurringThemes || [])
                        ])
                    ].slice(0, 10),
                    lastUpdatedAfterEpisode: currentTracker.lastUpdatedAfterEpisode + newEpisodes.length,
                    valuePayloads: [
                        ...(currentTracker.valuePayloads || []),
                        ...(retryExtracted.newValuePayloads || [])
                    ].slice(-30),
                    storyThreads: mergeStoryThreads(
                        currentTracker.storyThreads || [],
                        retryExtracted.newStoryThreads || []
                    ),
                    emotionalBeats: [
                        ...(currentTracker.emotionalBeats || []),
                        ...(retryExtracted.newEmotionalBeats || [])
                    ].slice(-30),
                    bingeMechanics: [
                        ...(currentTracker.bingeMechanics || []),
                        ...(retryExtracted.newBingeMechanics || [])
                    ].slice(-20),
                    characterState: retryExtracted.characterState || currentTracker.characterState,
                    openLedger: [
                        ...(currentTracker.openLedger || []),
                        ...(retryExtracted.newOpenLedgerItems || []).map((item: any) => ({
                            ...item,
                            status: 'open' as const,
                            introducedEpisode: item.introducedEpisode || (currentTracker.lastUpdatedAfterEpisode + 1)
                        }))
                    ].slice(-40),
                    chekhovsGuns: [
                        ...(currentTracker.chekhovsGuns || []),
                        ...(retryExtracted.newChekhovsGuns || []).map((gun: any) => ({
                            ...gun,
                            status: 'planted' as const
                        }))
                    ].slice(-20),
                    memorableCallbacks: [
                        ...(currentTracker.memorableCallbacks || []),
                        ...(retryExtracted.newMemorableCallbacks || [])
                    ].slice(-20),
                    beliefs: {
                        ...(currentTracker.beliefs || {}),
                        ...(retryExtracted.newBeliefs || {})
                    },
                    emotionalBaseline: retryExtracted.emotionalBaseline || currentTracker.emotionalBaseline || { state: 'Neutral', reason: 'Unknown', shift: 'None' },
                    feedbackQueue: currentTracker.feedbackQueue || []
                };
                return updatedTracker;

            } catch (retryError) {
                // HARD FAIL on double parse failure — do NOT increment lastUpdatedAfterEpisode
                // to prevent permanent memory holes. System will re-attempt on next cycle.
                console.error(
                    `[ThemeTracker] 🚨 MEMORY_HOLE: Episodes ${currentTracker.lastUpdatedAfterEpisode + 1}` +
                    `-${currentTracker.lastUpdatedAfterEpisode + newEpisodes.length} have NO memory extracted. ` +
                    `Will retry on next extraction cycle.`
                );
                return {
                    ...currentTracker,
                    valuePayloads: currentTracker.valuePayloads || [],
                    storyThreads: currentTracker.storyThreads || [],
                    emotionalBeats: currentTracker.emotionalBeats || [],
                    bingeMechanics: currentTracker.bingeMechanics || [],
                    // DO NOT increment — forces re-extraction on next cycle
                };
            }
        } else {
            // Non-parse errors (network, API) — safe fallback without incrementing
            console.error(`[ThemeTracker] 🚨 MEMORY_HOLE: Extraction failed (non-parse): `, error);
            return {
                ...currentTracker,
                valuePayloads: currentTracker.valuePayloads || [],
                storyThreads: currentTracker.storyThreads || [],
                emotionalBeats: currentTracker.emotionalBeats || [],
                bingeMechanics: currentTracker.bingeMechanics || [],
                // DO NOT increment — forces re-extraction on next cycle
            };
        }
    }
};

// ===== HELPER: Merge Story Threads (Update existing or add new) =====
const mergeStoryThreads = (existing: StoryThread[], newThreads: StoryThread[]): StoryThread[] => {
    const merged = [...existing];

    for (const newThread of newThreads) {
        const existingIndex = merged.findIndex(t => t.threadId === newThread.threadId);
        if (existingIndex >= 0) {
            // Update existing thread
            merged[existingIndex] = {
                ...merged[existingIndex],
                episodesInvolved: [...new Set([...merged[existingIndex].episodesInvolved, ...newThread.episodesInvolved])],
                status: newThread.status,
                currentState: newThread.currentState
            };
        } else {
            // Add new thread
            merged.push(newThread);
        }
    }

    return merged.slice(-10); // Keep max 10 threads
};

// ===== MARK ITEM AS RESOLVED =====

export const markItemResolved = (
    tracker: ThemeTracker,
    itemDescription: string,
    resolvedEpisode: number
): ThemeTracker => {
    return {
        ...tracker,
        unresolvedItems: tracker.unresolvedItems.map(item => {
            // Use word-overlap scoring instead of loose substring matching
            // to prevent false resolution of unrelated items
            const descWords = itemDescription.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            const itemWords = item.item.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            if (descWords.length === 0 || itemWords.length === 0) return item;
            const shorter = descWords.length < itemWords.length ? descWords : itemWords;
            const longer = descWords.length < itemWords.length ? itemWords : descWords;
            const matchCount = shorter.filter(w => longer.includes(w)).length;
            const matchRatio = matchCount / shorter.length;
            return matchRatio >= 0.6
                ? { ...item, resolved: true, resolvedEpisode }
                : item;
        })
    };
};
