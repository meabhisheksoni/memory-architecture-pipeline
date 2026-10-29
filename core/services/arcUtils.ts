import {
    EpisodeArcResult,
    Act,
    PhaseType,
    PacingType,
    SeasonBlueprint,
    NicheCategory,
    LiveDataConfig
} from '../types';

// ===== CONSTANTS =====

// Phase types for different act positions
export const PHASE_SEQUENCE: PhaseType[] = [
    'foundation',      // Act 1: Setup
    'rising_action',   // Act 2: Build
    'development',     // Act 3+: Deepen
    'peak',            // Middle acts: Tension
    'climax',          // Near end: Maximum tension
    'falling_action',  // After climax: Consequences
    'resolution'       // Final act: Conclusion
];

// ===== UTILITIES =====

export const getPhaseForAct = (actNumber: number, totalActs: number): PhaseType => {
    if (actNumber === 1) return 'foundation';
    if (actNumber === 2) return 'rising_action';
    if (actNumber === totalActs) return 'resolution';
    if (actNumber === totalActs - 1) return 'falling_action';

    // Middle acts - distribute between development, peak, climax
    const middlePosition = (actNumber - 2) / (totalActs - 3);
    if (middlePosition < 0.33) return 'development';
    if (middlePosition < 0.66) return 'peak';
    return 'climax';
};

export const getPacingForPhase = (phase: PhaseType): PacingType => {
    switch (phase) {
        case 'foundation': return 'slow';
        case 'rising_action': return 'medium';
        case 'development': return 'medium';
        case 'peak': return 'fast';
        case 'climax': return 'fast';
        case 'falling_action': return 'medium';
        case 'resolution': return 'fast';
        default: return 'medium';
    }
};

export const getThemeForPhase = (phase: PhaseType, actNum: number, totalActs: number): string => {
    switch (phase) {
        case 'foundation': return 'Introduction, world-building, core concepts';
        case 'rising_action': return 'Building complexity, first conflicts';
        case 'development': return `Deep exploration (Act ${actNum}/${totalActs})`;
        case 'peak': return 'Peak tension, major stakes';
        case 'climax': return 'Maximum intensity, crucial revelations';
        case 'falling_action': return 'Consequences unfold, paths converge';
        case 'resolution': return 'Satisfying conclusion, final payoff';
        default: return 'Content development';
    }
};

export const getMilestonesForPhase = (phase: PhaseType): string[] => {
    switch (phase) {
        case 'foundation': return ['Establish premise', 'Introduce core elements'];
        case 'rising_action': return ['Deepen understanding', 'Build momentum'];
        case 'development': return ['Explore nuances', 'Expand scope'];
        case 'peak': return ['Major revelations', 'Highest stakes'];
        case 'climax': return ['Critical turning point', 'Everything changes'];
        case 'falling_action': return ['Deal with consequences', 'Set up finale'];
        case 'resolution': return ['Wrap up threads', 'Deliver payoff'];
        default: return ['Continue development'];
    }
};

// ===== BUG 6 FIX: Single Source of Truth for Frequency =====
/**
 * Gets the checkpoint frequency from EpisodeArcResult.
 * This is the SINGLE source of truth - use this everywhere!
 * Priority: liveDataConfig.frequency > liveDataFrequency > default (20)
 */
export const getFrequency = (arcResult: EpisodeArcResult): number => {
    // Primary: nested config takes priority (more specific)
    if (arcResult.liveDataConfig?.frequency) {
        return arcResult.liveDataConfig.frequency;
    }
    // Fallback: top-level for backward compatibility
    if (arcResult.liveDataFrequency) {
        return arcResult.liveDataFrequency;
    }
    // Default: safe fallback
    return 20;
};

// ===== HELPER: Check if at live data checkpoint =====

export const isLiveDataCheckpoint = (
    currentEpisodeIndex: number,  // 0-indexed
    arcResult: EpisodeArcResult
): boolean => {
    if (!arcResult.needsLiveData) return false;

    const episodeNumber = currentEpisodeIndex + 1;  // Convert to 1-indexed
    const startEpisode = arcResult.liveDataStartEpisode || 1;  // Default: start from Episode 1
    const frequency = arcResult.liveDataFrequency ||
        arcResult.liveDataConfig?.frequency ||
        20;  // Default: every 20 episodes (safe fallback)

    // Before start episode? No live data needed yet
    if (episodeNumber < startEpisode) {
        return false;
    }

    // At the start episode? Definitely need live data!
    if (episodeNumber === startEpisode) {
        console.log(`[Checkpoint] 🔍 Live data STARTS at Episode ${startEpisode}`);
        return true;
    }

    // ===== FIXED CHECKPOINT CALCULATION =====
    // For frequency=3 with startEpisode=1:
    // Checkpoints should be at: 1, 3, 6, 9, 12... (multiples of frequency, after start)
    // 
    // OLD (Bug): episodesSinceStart % frequency === 0
    //   Episode 3: (3-1) % 3 = 2 % 3 = 2 → FALSE (WRONG!)
    //   Episode 4: (4-1) % 3 = 3 % 3 = 0 → TRUE (But should be FALSE!)
    // 
    // NEW (Fix): Check if episodeNumber itself is at a frequency boundary
    //   Episode 3: 3 % 3 = 0 → TRUE ✓
    //   Episode 6: 6 % 3 = 0 → TRUE ✓
    //   Episode 4: 4 % 3 = 1 → FALSE ✓

    // Check if we're at a frequency checkpoint (multiples of frequency)
    if (episodeNumber >= startEpisode && episodeNumber % frequency === 0) {
        console.log(`[Checkpoint] 🔍 Frequency checkpoint at Episode ${episodeNumber} (every ${frequency} episodes)`);
        return true;
    }

    // Also check liveDataConfig.specificEpisodes for hybrid mode
    if (arcResult.liveDataConfig?.specificEpisodes?.includes(episodeNumber)) {
        console.log(`[Checkpoint] 🔍 Specific checkpoint at Episode ${episodeNumber} (hybrid mode)`);
        return true;
    }

    // Also check if any act requires live data at its start
    for (const act of arcResult.seasonBlueprint.acts) {
        if (act.needsLiveDataAtStart && currentEpisodeIndex === act.episodeRange.start - 1) {
            console.log(`[Checkpoint] 🔍 Act ${act.actNumber} requires live data at start`);
            return true;
        }
    }

    return false;
};

// ===== HELPER: Get current act for episode =====

export const getCurrentAct = (
    episodeIndex: number,  // 0-indexed
    arcResult: EpisodeArcResult
): Act | undefined => {
    const episodeNumber = episodeIndex + 1;  // Convert to 1-indexed

    return arcResult.seasonBlueprint.acts.find(act =>
        episodeNumber >= act.episodeRange.start && episodeNumber <= act.episodeRange.end
    );
};

// ===== HELPER: Get arc context for Episode Architect =====

export const getArcContextForPrompt = (
    currentEpisodeIndex: number,
    totalEpisodes: number,
    arcResult: EpisodeArcResult
): string => {
    const currentAct = getCurrentAct(currentEpisodeIndex, arcResult);

    if (!currentAct) {
        return '';
    }

    const episodeNumber = currentEpisodeIndex + 1;
    const progressPercent = Math.round((episodeNumber / totalEpisodes) * 100);

    return `
    ===== SEASON ARC CONTEXT =====
    
    📊 PROGRESS: Episode ${episodeNumber} of ${totalEpisodes} (${progressPercent}%)
    
    🎬 ARC TYPE: ${arcResult.arcType}
    Reason: ${arcResult.arcTypeReason}
    
    📍 CURRENT ACT: Act ${currentAct.actNumber} - "${currentAct.theme}"
    Phase: ${currentAct.phase.toUpperCase()}
    Pacing: ${currentAct.pacing}
    Episode Range: ${currentAct.episodeRange.start}-${currentAct.episodeRange.end}
    
    🎯 KEY MILESTONES FOR THIS ACT:
    ${currentAct.keyMilestones.map(m => `- ${m}`).join('\n')}
    
    🌍 OVERARCHING THEME: ${arcResult.seasonBlueprint.overarchingTheme}
    
    📌 PACING GUIDANCE:
    ${currentAct.pacing === 'slow' ? 'Take time to build. Introduce concepts gradually. Don\'t rush.' : ''}
    ${currentAct.pacing === 'medium' ? 'Balanced pacing. Mix depth with momentum.' : ''}
    ${currentAct.pacing === 'fast' ? 'High energy. Major revelations. Keep momentum strong.' : ''}
    
    ${currentAct.phase === 'foundation' ? '⚠️ FOUNDATION PHASE: Focus on setup, introduction, and building trust with audience.' : ''}
    ${currentAct.phase === 'rising_action' ? '⚠️ RISING ACTION: Increase complexity. Introduce conflicts and challenges.' : ''}
    ${currentAct.phase === 'peak' ? '⚠️ PEAK PHASE: Maximum intensity. Major revelations and turning points.' : ''}
    ${currentAct.phase === 'resolution' ? '⚠️ RESOLUTION PHASE: Wrap up threads. Provide satisfying conclusions. Plant seeds for future.' : ''}
  `;
};

// ===== FALLBACK DEFAULT =====

export const getDefaultArcResult = (totalEpisodes: number): EpisodeArcResult => {
    const acts: Act[] = [];

    // ===== DYNAMIC ACT COUNT LOGIC =====
    // ≤10 episodes: 2 acts
    // 11-25 episodes: 3 acts
    // 26-50 episodes: 4 acts
    // 51-100 episodes: 5 acts
    // 100+ episodes: 1 act per 20 episodes

    let numberOfActs: number;

    if (totalEpisodes <= 10) {
        numberOfActs = 2;
    } else if (totalEpisodes <= 25) {
        numberOfActs = 3;
    } else if (totalEpisodes <= 50) {
        numberOfActs = 4;
    } else if (totalEpisodes <= 100) {
        numberOfActs = 5;
    } else {
        // For 100+ episodes: 1 act per 20 episodes
        numberOfActs = Math.ceil(totalEpisodes / 20);
    }

    console.log(`[Arc AI] 📊 Dynamic Acts: ${numberOfActs} acts for ${totalEpisodes} episodes`);

    // Calculate episodes per act
    const episodesPerAct = Math.floor(totalEpisodes / numberOfActs);
    let remainder = totalEpisodes % numberOfActs;

    let currentStart = 1;

    for (let i = 1; i <= numberOfActs; i++) {
        // Distribute remainder episodes across first few acts
        const actEpisodes = episodesPerAct + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder--;

        const actEnd = Math.min(currentStart + actEpisodes - 1, totalEpisodes);
        const phase = getPhaseForAct(i, numberOfActs);

        acts.push({
            actNumber: i,
            episodeRange: { start: currentStart, end: actEnd },
            phase: phase,
            theme: getThemeForPhase(phase, i, numberOfActs),
            pacing: getPacingForPhase(phase),
            keyMilestones: getMilestonesForPhase(phase),
            needsLiveDataAtStart: false
        });

        currentStart = actEnd + 1;
    }

    return {
        arcType: 'phase_based',
        arcTypeReason: `Dynamic ${numberOfActs}-act structure for ${totalEpisodes} episodes`,

        // New: Niche Detection (default)
        detectedNiche: 'education' as NicheCategory,
        nicheConfidence: 50,

        // Live Data Config (COMPLETE - all fields present)
        needsLiveData: false,
        liveDataConfig: {
            mode: 'never' as const,
            reason: 'Default fallback - no live data',
            startEpisode: 1,
            frequency: 20,
            specificEpisodes: [],
            liveDataTopics: []
        },
        liveDataReason: 'Default fallback - no live data',
        liveDataStartEpisode: 1,
        liveDataFrequency: 20,

        // Season Blueprint
        seasonBlueprint: {
            totalEpisodes,
            acts,
            overarchingTheme: 'To be determined from context',
            targetAudienceReminder: 'General audience'
        },

        // New: Audience Journey (default)
        audienceJourney: {
            startState: 'Curious beginner',
            endState: 'Knowledgeable practitioner',
            transformationMoments: [
                {
                    episode: Math.floor(totalEpisodes * 0.2),
                    shift: 'First understanding',
                    emotionalState: 'Curious',
                    skillLevel: 'beginner' as const
                },
                {
                    episode: Math.floor(totalEpisodes * 0.5),
                    shift: 'Can apply independently',
                    emotionalState: 'Confident',
                    skillLevel: 'intermediate' as const
                },
                {
                    episode: Math.floor(totalEpisodes * 0.8),
                    shift: 'Ready to share knowledge',
                    emotionalState: 'Empowered',
                    skillLevel: 'advanced' as const
                }
            ],
            emotionalArc: 'Curiosity → Understanding → Confidence → Mastery'
        }
    };
};
