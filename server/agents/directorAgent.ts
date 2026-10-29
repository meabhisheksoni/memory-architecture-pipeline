/**
 * directorAgent.ts — Creative Director with <think> scratchpad reasoning.
 *
 * Before a script is written, the Director Agent:
 * 1. Receives the episode context + memory brief + skill manifest
 * 2. Reasons in a <think> scratchpad (hidden from the final script prompt)
 * 3. Selects 1-3 modular skills that best fit this specific episode
 * 4. Outputs actionable scene-by-scene orders for the script generator
 *
 * The Director runs as a SEPARATE LLM call before script generation —
 * it's the "writers room thinking" that happens before the writer starts typing.
 *
 * Anti-Fragile:
 * - Zod validates LLM output — malformed JSON triggers safe fallback
 * - Regex extraction for <think> blocks handles missing/mangled tags
 * - Complete LLM failure returns deterministic orders (never crashes)
 *
 * Runs server-side only.
 */

import { z } from 'zod';
import { skillLoader } from '../prompts/skillLoader.js';
import { safeParseJSON } from '../utils/safeParseJSON.js';

// ============================================================================
// Zod Schema — validates structured Director output from LLM
// ============================================================================

export const DirectorOutputSchema = z.object({
    scratchpad: z.string().min(1, 'Scratchpad reasoning is required'),
    directorsOrders: z.string().min(1, 'Director instructions are required'),
    selectedSkills: z.array(z.string()).default([]),
    riskFactors: z.array(z.string()).optional().default([]),
    pacingGuide: z.object({
        hookIntensity: z.number().min(1).max(10).default(8),
        humorLevel: z.number().min(1).max(10).default(5),
        targetWordCount: z.number().default(1800),
    }).optional(),
});

export type DirectorOutput = z.infer<typeof DirectorOutputSchema>;

// ============================================================================
// Interfaces
// ============================================================================

export interface DirectorEpisodeContext {
    id: string;
    episodeNumber: number;
    title: string;
    concept?: string;
    summary?: string;
    targetDurationMinutes?: number;
}

export interface DirectorAgentOptions {
    episode: DirectorEpisodeContext;
    projectSoul: string;
    creatorProfile: string;
    memoryBrief: string;
    /** LLM client — any object with a generateText method */
    llmClient: {
        generateText: (prompt: string, options?: { temperature?: number }) => Promise<string>;
    };
}

// ============================================================================
// Safe deterministic fallback — used when LLM fails completely
// ============================================================================

function createFallbackOutput(reason: string): DirectorOutput {
    return {
        scratchpad: `Fallback triggered: ${reason}`,
        directorsOrders: 'Focus on crisp pacing, immediate hook delivery, and hyper-natural conversational tone.',
        selectedSkills: ['hyper_natural_banter'],
        riskFactors: ['Automated fallback engaged; monitor script dialogue quality'],
        pacingGuide: {
            hookIntensity: 8,
            humorLevel: 5,
            targetWordCount: 1800,
        },
    };
}

// ============================================================================
// Director Agent — the "writers room brain" before scripting
// ============================================================================

export async function runDirector(options: DirectorAgentOptions): Promise<DirectorOutput> {
    const { episode, projectSoul, creatorProfile, memoryBrief, llmClient } = options;

    // Fetch compact skill manifest for Director to reason over
    const manifest = skillLoader.getSkillManifest();
    const manifestFormatted = manifest.length > 0
        ? manifest
            .map(m => `- ID: "${m.id}" | Name: "${m.name}" | Status: ${m.status}\n  Description: ${m.description}`)
            .join('\n')
        : '- hyper_natural_banter (Default baseline skill)';

    const directorPrompt = `
=== ROLE: EXECUTIVE SHOWRUNNER & CREATIVE DIRECTOR ===
You are the Creative Director formulating the strategic execution blueprint for Episode ${episode.episodeNumber}: "${episode.title}".

=== TIER 2: PROJECT SOUL ===
${projectSoul || 'Standard high-engagement audio series.'}

=== TIER 3: CREATOR PROFILE ===
${creatorProfile || 'Default creator voice.'}

=== TIER 4: CONTINUITY & MEMORY BRIEF ===
${memoryBrief || 'No previous episode continuity flags.'}

=== EPISODE OBJECTIVE ===
Summary: ${episode.summary || episode.concept || 'Create an addictive, high-retention episode.'}
Target Duration: ${episode.targetDurationMinutes || 10} minutes

=== AVAILABLE MODULAR SKILLS ===
${manifestFormatted}

=== OPERATIONAL DIRECTIVES ===
1. You MUST first think deeply inside an explicit <think>...</think> tag.
   - Deconstruct the dramatic stakes and narrative rhythm.
   - Address continuity hooks from the memory brief.
   - Select 1 to 3 modular skills that elevate this specific episode.
2. Following the </think> tag, output a valid JSON object matching the schema below.

\`\`\`json
{
  "directorsOrders": "Concise, actionable scene-by-scene instructions for the scriptwriter.",
  "selectedSkills": ["skill_id_1", "skill_id_2"],
  "riskFactors": ["Monotone pacing in middle act", "Unaddressed callback from Ep 2"],
  "pacingGuide": {
    "hookIntensity": 9,
    "humorLevel": 6,
    "targetWordCount": 1800
  }
}
\`\`\`
`.trim();

    try {
        const rawResponse = await llmClient.generateText(directorPrompt, { temperature: 0.7 });

        // 1. Extract <think> scratchpad reasoning
        const thinkMatch = rawResponse.match(/<think>([\s\S]*?)<\/think>/i);
        const scratchpad = thinkMatch ? thinkMatch[1].trim() : 'Direct strategic planning engaged.';

        // 2. Extract JSON payload (strip <think> block first)
        const jsonText = rawResponse.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
        const parsedJson = safeParseJSON(jsonText);

        if (!parsedJson) {
            console.warn('[DirectorAgent] ⚠️ Failed to parse LLM JSON output, using fallback');
            return createFallbackOutput('JSON parse failure');
        }

        // 3. Inject extracted scratchpad if not in parsed payload
        if (!parsedJson.scratchpad) {
            parsedJson.scratchpad = scratchpad;
        }

        // 4. Validate with Zod
        const validated = DirectorOutputSchema.safeParse(parsedJson);
        if (!validated.success) {
            console.warn('[DirectorAgent] ⚠️ Zod validation failed, applying repair:', validated.error.format());
            // Partial repair — use what we can, fill in defaults
            return {
                scratchpad,
                directorsOrders: parsedJson.directorsOrders || 'Write an engaging, high-energy conversational script.',
                selectedSkills: Array.isArray(parsedJson.selectedSkills)
                    ? parsedJson.selectedSkills
                    : ['hyper_natural_banter'],
                riskFactors: parsedJson.riskFactors || [],
                pacingGuide: {
                    hookIntensity: 8,
                    humorLevel: 5,
                    targetWordCount: 1800,
                },
            };
        }

        return validated.data;
    } catch (error: any) {
        // Complete LLM failure — return safe deterministic plan, never crash
        console.error('[DirectorAgent] ❌ Execution failure, activating fallback:', error.message);
        return createFallbackOutput(error.message);
    }
}
