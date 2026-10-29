import { ThemeTracker } from '../../types';

// ===== GET SERIES CONTEXT BRIEF (For Director/Scriptwriter injection) =====

/**
 * Formats ThemeTracker into a concise "Series Context Brief" for injection
 * into Director and Scriptwriter prompts. Implements token limiting.
 */
export const getSeriesContextBrief = (tracker: ThemeTracker): string => {
    // Safeguard 1: Only include OPEN items in ledger (max 20)
    // GOD-LEVEL: Ensure we don't lose OLD unaddressed items by picking mixture of oldest and newest
    const allOpenItems = (tracker.openLedger || []).filter(item => item.status === 'open');
    const oldestOpen = allOpenItems.slice(0, 5);
    const newestOpen = allOpenItems.slice(-15);
    const uniqueOpenItems = [...new Set([...oldestOpen, ...newestOpen])];

    const openLedgerItems = uniqueOpenItems
        .map(item => `- Ep ${item.introducedEpisode}: "${item.item}" (${item.type})`)
        .join('\n');

    // Last 5 resolved items for context
    const recentResolved = (tracker.openLedger || [])
        .filter(item => item.status === 'resolved')
        .slice(-5)
        .map(item => `- Ep ${item.introducedEpisode}→${item.resolvedInEpisode}: "${item.item}" ✓`)
        .join('\n');

    // High-potential callbacks only (max 10)
    const highCallbacks = (tracker.memorableCallbacks || [])
        .filter(c => c.callbackPotential === 'high')
        .slice(-10)
        .map(c => `- Ep ${c.episodeNumber}: "${c.description}" (${c.type})`)
        .join('\n');

    // Active Chekhov's Guns (max 10)
    const activeGuns = (tracker.chekhovsGuns || [])
        .filter(g => g.status === 'planted')
        .slice(-10)
        .map(g => `- Ep ${g.episodeNumber}: "${g.detail}" → Potential: ${g.potentialPayoff}`)
        .join('\n');

    // Beliefs summary
    const beliefsSummary = Object.entries(tracker.beliefs || {})
        .map(([topic, belief]) => `- ${topic}: ${belief.stance} (${belief.reason})`)
        .slice(0, 8)
        .join('\n');

    // Character inventory summary
    const inventorySummary = tracker.characterState ? `
Skills: ${tracker.characterState.inventory.skills.slice(-5).join(', ') || 'None tracked'}
Secrets: ${tracker.characterState.inventory.secrets.slice(-3).join(', ') || 'None tracked'}
Traumas: ${tracker.characterState.inventory.traumas.slice(-3).join(', ') || 'None tracked'}
` : 'No character state tracked yet.';

    return `
===== SERIES CONTEXT BRIEF (Episode ${tracker.lastUpdatedAfterEpisode}) =====

📦 CHARACTER STATE:
${inventorySummary}

💔 EMOTIONAL BASELINE:
State: ${tracker.emotionalBaseline?.state || 'Neutral'}
Reason: ${tracker.emotionalBaseline?.reason || 'Series start'}
Shift: ${tracker.emotionalBaseline?.shift || 'None'}

🧠 BELIEFS:
${beliefsSummary || 'No beliefs tracked yet.'}

⏳ OPEN LEDGER (Unresolved - Must Address):
${openLedgerItems || 'No open items.'}

✅ RECENTLY RESOLVED:
${recentResolved || 'None yet.'}

🎭 HIGH-POTENTIAL CALLBACKS:
${highCallbacks || 'No high-potential callbacks yet.'}

🔗 CHEKHOV'S GUNS (Active):
${activeGuns || 'No planted guns yet.'}
`.trim();
};

// ===== MEMORY CONTEXT FOR EPISODE ARCHITECT =====

export const getMemoryContextForPrompt = (
    themeTracker: ThemeTracker,
    currentEpisodeNumber: number
): string => {
    if (!themeTracker || themeTracker.coveredTopics.length === 0) {
        return ''; // No memory yet
    }

    // Get recently covered topics (last 15 episodes)
    const recentTopics = themeTracker.coveredTopics
        .filter(t => t.episodeNumber > currentEpisodeNumber - 15)
        .map(t => `${t.topic} (Ep ${t.episodeNumber}, ${t.depth})`);

    // Get high-potential callback opportunities (last 10)
    const callbacks = themeTracker.memorableElements
        .filter(m => m.callbackPotential === 'high')
        .slice(-5)
        .map(c => `Ep ${c.episodeNumber}: ${c.description} [${c.type}]`);

    // Get unresolved items that need addressing
    const pending = themeTracker.unresolvedItems
        .filter(u => !u.resolved)
        .slice(-3)
        .map(u => `Ep ${u.introducedEpisode}: ${u.item} `);

    // Get key concepts
    const concepts = themeTracker.introducedConcepts
        .slice(-5)
        .map(c => c.concept);

    // NEW: Get recent value payloads (educational progression)
    const valuePayloads = (themeTracker.valuePayloads || [])
        .slice(-5)
        .map(v => `Ep ${v.episodeNumber}: "${v.lesson}"[${v.skillLevel}]${v.framework ? ` - Framework: ${v.framework}` : ''} `);

    // NEW: Get active story threads
    const activeThreads = (themeTracker.storyThreads || [])
        .filter(t => t.status === 'active')
        .slice(-3)
        .map(t => `📖 "${t.title}"(Started Ep ${t.startedEpisode}, ${t.emotionalStakes} stakes) \n      Current: ${t.currentState} `);

    // NEW: Get recent emotional peaks
    const emotionalPeaks = (themeTracker.emotionalBeats || [])
        .slice(-5)
        .map(e => `Ep ${e.episodeNumber}: ${e.emotionalPeak.toUpperCase()} (${e.intensityScore}/10) - ${e.peakMoment} `);

    // NEW: Get binge mechanics for continuity
    const lastBingeHook = (themeTracker.bingeMechanics || []).slice(-1)[0];
    const bingeContext = lastBingeHook
        ? `Last Hook(Ep ${lastBingeHook.episodeNumber}): "${lastBingeHook.curiosityGap}"[${lastBingeHook.hookType}]
   Open Loops: ${lastBingeHook.openLoops.join(', ')} `
        : 'No hooks yet';

    // Only return if there's meaningful content
    if (recentTopics.length === 0 && callbacks.length === 0 && valuePayloads.length === 0) {
        return '';
    }

    return `
    ===== 🧠 ADVANCED SEASON MEMORY =====

📋 RECENTLY COVERED(avoid repetition):
${recentTopics.length > 0 ? recentTopics.map(t => `- ${t}`).join('\n') : '- None yet'}

🎯 CALLBACK OPPORTUNITIES(consider referencing):
${callbacks.length > 0 ? callbacks.map(c => `- ${c}`).join('\n') : '- None yet'}

💡 KEY CONCEPTS INTRODUCED:
${concepts.length > 0 ? concepts.map(c => `- ${c}`).join('\n') : '- None yet'}

❓ UNRESOLVED(consider addressing):
${pending.length > 0 ? pending.map(p => `- ${p}`).join('\n') : '- All resolved'}

🔄 RECURRING THEMES:
${themeTracker.recurringThemes.length > 0 ? themeTracker.recurringThemes.map(t => `- ${t}`).join('\n') : '- None yet'}

===== 📚 EDUCATIONAL PROGRESSION(Value Payloads) =====
    ${valuePayloads.length > 0 ? valuePayloads.map(v => `- ${v}`).join('\n') : '- No lessons tracked yet'}
→ INSTRUCTION: Build on previous lessons.Progress from beginner → advanced.

===== 📖 ACTIVE STORY THREADS(Multi - Episode Arcs) =====
    ${activeThreads.length > 0 ? activeThreads.join('\n') : '- No active story threads'}
→ INSTRUCTION: Continue active threads.Consider resolving or advancing them.

===== 💔 EMOTIONAL JOURNEY(Recent Peaks) =====
    ${emotionalPeaks.length > 0 ? emotionalPeaks.map(e => `- ${e}`).join('\n') : '- No emotional peaks tracked'}
→ INSTRUCTION: Vary emotional tones.Don't repeat same peak type consecutively.

    ===== 🔄 BINGE MECHANICS(Last Episode Hook) =====
        ${bingeContext}
→ INSTRUCTION: Resolve previous curiosity gaps.Create NEW open loops.

===== MEMORY INSTRUCTIONS =====
    - AVOID repeating topics marked as "detailed" or "deep_dive"
        - Build educational content progressively(beginner → advanced)
            - Continue active story threads naturally
                - Vary emotional peaks(don't repeat same emotion back-to-back)
                    - ALWAYS create strong cliffhangers and open loops
                - Make 1 - 2 callbacks per batch when natural
                - Address unresolved items when appropriate
                    `;
};
