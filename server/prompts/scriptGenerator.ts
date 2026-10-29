/**
 * scriptGenerator.ts — Dynamic vs Legacy prompt builder for script generation.
 *
 * Bridges the Director Agent's output → PromptComposer → final system prompt.
 * Feature-flagged: ENABLE_DYNAMIC_PROMPTS=true activates the 5-tier composer,
 * otherwise falls back to the frozen LEGACY_SCRIPT_WRITER baseline.
 *
 * This file does NOT call the LLM. It only builds the prompt string pair
 * (systemPrompt + userPrompt) that gets passed to the LLM by the caller.
 *
 * Runs server-side only.
 */

import { composePrompt } from './promptComposer.js';
import { LEGACY_SCRIPT_WRITER } from './legacyPrompts.js';
import type { DirectorOutput } from '../agents/directorAgent.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface ScriptPromptInput {
    episodeTitle: string;
    summary: string;
    projectSoul: string;
    creatorProfile?: string;
    memoryBrief?: string;
    directorReasoning?: DirectorOutput | null;
    speakerMode: 'SINGLE' | 'DUAL';
}

export interface ScriptPromptOutput {
    systemPrompt: string;
    userPrompt: string;
    appliedSkills: string[];
    estimatedTokens: number;
}

// ============================================================================
// Prompt Builder
// ============================================================================

/**
 * Build the system + user prompt pair for script generation.
 * When dynamic prompts are enabled AND director reasoning is available,
 * uses the 5-Tier PromptComposer. Otherwise falls back to legacy.
 */
export function buildScriptGenerationPrompt(input: ScriptPromptInput): ScriptPromptOutput {
    const isDynamicEnabled = process.env.ENABLE_DYNAMIC_PROMPTS === 'true';

    let systemPrompt: string;
    let appliedSkills: string[] = [];
    let estimatedTokens = 0;

    if (isDynamicEnabled && input.directorReasoning) {
        const composition = composePrompt({
            baseRole: `TASK: Write a masterclass audio script in ${input.speakerMode} format.\nEnforce high conversational retention.`,
            projectSoulContext: input.projectSoul,
            creatorProfileContext: input.creatorProfile,
            memoryBrief: input.memoryBrief,
            directorOrders: input.directorReasoning.directorsOrders,
            skillIds: input.directorReasoning.selectedSkills,
            maxTokens: 8192,
        });

        systemPrompt = composition.systemPrompt;
        appliedSkills = composition.appliedSkills;
        estimatedTokens = composition.estimatedTokens;
    } else {
        // Legacy fallback — frozen baseline + project soul only
        systemPrompt = `${LEGACY_SCRIPT_WRITER}\n\n=== PROJECT CONTEXT ===\n${input.projectSoul}`;
        estimatedTokens = Math.ceil(systemPrompt.length / 4);
    }

    const userPrompt = `Produce the complete production audio script for: "${input.episodeTitle}"\nPremise: ${input.summary}`;

    return { systemPrompt, userPrompt, appliedSkills, estimatedTokens };
}
