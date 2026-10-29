/**
 * promptComposer.ts — 5-Tier Priority Hierarchy prompt assembly.
 *
 * When assembling the system prompt for script generation, this composer
 * enforces a strict priority hierarchy. When the token budget is constrained,
 * lower-priority tiers (Tier 5: Skills) are truncated FIRST. Safety rules
 * and core brand guidelines (Tier 1) are NEVER truncated.
 *
 * Tier Hierarchy:
 *   T1: Base Role & Safety (hardcoded, inviolable)     — NEVER truncated
 *   T2: Project Soul (brand rules, universe boundaries) — Preserved
 *   T3: Creator Profile (voice, preferences)            — Preserved
 *   T4: Memory Curator Brief (continuity, callbacks)    — Soft-budgeted
 *   T5: Skills + Director Orders (dynamic, modular)     — TRUNCATED FIRST
 *
 * Runs server-side only — imports SkillLoader for disk-based skill content.
 */

import { skillLoader } from './skillLoader.js';
import type { LoadedSkill } from './skillLoader.js';

// ============================================================================
// Interfaces
// ============================================================================

export interface PromptComposerOptions {
    /** Core system role and output format rules (Tier 1 — inviolable) */
    baseRole: string;
    /** Project Soul context — brand rules, universe boundaries (Tier 2) */
    projectSoulContext?: string;
    /** Creator Profile context — voice, banned phrases, editorial (Tier 3) */
    creatorProfileContext?: string;
    /** Memory Curator brief — continuity callbacks, Chekhov's guns (Tier 4) */
    memoryBrief?: string;
    /** Director Agent's strategic orders (Tier 5A) */
    directorOrders?: string;
    /** Skill IDs to inject into the prompt (Tier 5B) */
    skillIds?: string[];
    /** Max token budget for the composed prompt (default: 8192) */
    maxTokens?: number;
}

export interface CompositionResult {
    /** The fully assembled system prompt */
    systemPrompt: string;
    /** Estimated token count */
    estimatedTokens: number;
    /** Skill IDs that were successfully included */
    appliedSkills: string[];
    /** Skills that were omitted with reasons */
    omittedSkills: Array<{ skillId: string; reason: string }>;
    /** Token breakdown by tier for debugging/analytics */
    tierBreakdown: {
        tier1Tokens: number;
        tier2Tokens: number;
        tier3Tokens: number;
        tier4Tokens: number;
        tier5Tokens: number;
    };
}

// ============================================================================
// Token estimation
// ============================================================================

/**
 * Heuristic token estimator: English ~4 chars/token + 10% safety margin.
 * Not exact, but fast and sufficient for budget management.
 */
export function estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil((text.length / 4) * 1.1);
}

// ============================================================================
// Prompt Composer
// ============================================================================

/**
 * Assemble a system prompt following the 5-Tier Priority Hierarchy.
 * Truncates Tier 5 first when budget is constrained.
 */
export function composePrompt(options: PromptComposerOptions): CompositionResult {
    const maxTokens = options.maxTokens || 8192;
    const appliedSkills: string[] = [];
    const omittedSkills: Array<{ skillId: string; reason: string }> = [];

    // ── TIER 1: Base Role (Hardcoded Safety & Output Schema — INVIOLABLE) ──
    const tier1Text = `=== TIER 1: BASE SYSTEM ROLE & INVIOLABLE RULES ===\n${options.baseRole.trim()}\n\n`;
    const tier1Tokens = estimateTokens(tier1Text);

    // ── TIER 2: Project Soul (Brand Core Rules & Universe Boundaries) ──
    let tier2Text = '';
    if (options.projectSoulContext?.trim()) {
        tier2Text = `=== TIER 2: PROJECT SOUL & UNIVERSE RULES ===\n${options.projectSoulContext.trim()}\n\n`;
    }
    const tier2Tokens = estimateTokens(tier2Text);

    // ── TIER 3: Creator Profile (Voice Persona & Constraints) ──
    let tier3Text = '';
    if (options.creatorProfileContext?.trim()) {
        tier3Text = `=== TIER 3: CREATOR PROFILE & TONE CONSTRAINTS ===\n${options.creatorProfileContext.trim()}\n\n`;
    }
    const tier3Tokens = estimateTokens(tier3Text);

    // ── TIER 4: Memory Curator Brief (Episodic Continuity & Callbacks) ──
    let tier4Text = '';
    if (options.memoryBrief?.trim()) {
        tier4Text = `=== TIER 4: MEMORY CURATOR CONTINUITY BRIEF ===\n${options.memoryBrief.trim()}\n\n`;
    }
    const tier4Tokens = estimateTokens(tier4Text);

    // Calculate remaining budget for Tier 5 (dynamic content)
    const essentialTokens = tier1Tokens + tier2Tokens + tier3Tokens + tier4Tokens;
    let remainingBudget = maxTokens - essentialTokens;

    // ── TIER 5: Director Orders + Skills (Dynamic — TRUNCATED FIRST) ──
    let tier5Text = '';
    let tier5Tokens = 0;

    if (remainingBudget > 200) {
        const tier5Sections: string[] = [];

        // 5A: Director's Strategic Orders
        if (options.directorOrders?.trim()) {
            const ordersSection = `=== TIER 5A: DIRECTOR STRATEGIC ORDERS ===\n${options.directorOrders.trim()}\n\n`;
            const ordersTokens = estimateTokens(ordersSection);

            if (ordersTokens <= remainingBudget) {
                tier5Sections.push(ordersSection);
                remainingBudget -= ordersTokens;
            } else {
                omittedSkills.push({ skillId: 'director_orders', reason: 'Token budget exceeded' });
            }
        }

        // 5B: Modular Skills with conflict resolution
        if (options.skillIds && options.skillIds.length > 0) {
            const activeSkills: LoadedSkill[] = [];
            const forbiddenSkills = new Set<string>();

            for (const skillId of options.skillIds) {
                const skill = skillLoader.getSkill(skillId);
                if (!skill) {
                    omittedSkills.push({ skillId, reason: 'Skill file not found on disk' });
                    continue;
                }

                // Mutual exclusion check — higher-priority skills (earlier in array) win
                if (forbiddenSkills.has(skillId)) {
                    omittedSkills.push({
                        skillId,
                        reason: 'Conflicts with a previously loaded higher-priority skill'
                    });
                    continue;
                }

                // Register this skill's conflicts so later skills get blocked
                skill.frontmatter.conflicts_with?.forEach(c => forbiddenSkills.add(c));
                activeSkills.push(skill);
            }

            let skillsBlock = '';
            if (activeSkills.length > 0) {
                skillsBlock += `=== TIER 5B: ACTIVE SKILLS & TECHNIQUES ===\n`;
                for (const skill of activeSkills) {
                    const formatted = `\n--- [SKILL: ${skill.frontmatter.name.toUpperCase()}] ---\n${skill.content}\n`;
                    const skillTokens = estimateTokens(formatted);

                    if (skillTokens <= remainingBudget) {
                        skillsBlock += formatted;
                        remainingBudget -= skillTokens;
                        appliedSkills.push(skill.id);
                    } else {
                        omittedSkills.push({
                            skillId: skill.id,
                            reason: `Token budget overflow (needed: ${skillTokens}, available: ${remainingBudget})`
                        });
                    }
                }
                if (appliedSkills.length > 0) {
                    tier5Sections.push(skillsBlock);
                }
            }
        }

        tier5Text = tier5Sections.join('\n');
        tier5Tokens = estimateTokens(tier5Text);
    } else {
        // Budget exhausted by Tiers 1-4 — all skills omitted
        if (options.skillIds) {
            options.skillIds.forEach(id =>
                omittedSkills.push({ skillId: id, reason: 'Zero Tier 5 budget remaining' })
            );
        }
    }

    const systemPrompt = [tier1Text, tier2Text, tier3Text, tier4Text, tier5Text]
        .filter(Boolean)
        .join('\n')
        .trim();

    const totalTokens = tier1Tokens + tier2Tokens + tier3Tokens + tier4Tokens + tier5Tokens;

    return {
        systemPrompt,
        estimatedTokens: totalTokens,
        appliedSkills,
        omittedSkills,
        tierBreakdown: {
            tier1Tokens,
            tier2Tokens,
            tier3Tokens,
            tier4Tokens,
            tier5Tokens,
        },
    };
}
