/**
 * projectSoulAgent.ts — Manages PROJECT_SOUL.md (AI personality + operational wisdom).
 *
 * The "Soul" is a markdown file that accumulates learned rules and pitfalls
 * across episodes. It's injected into every generation prompt so the AI
 * evolves its style over time — not by retraining, but by remembering what
 * worked and what didn't.
 *
 * Architecture:
 * - Reads/writes a single PROJECT_SOUL.md file per project
 * - Atomic writes via temp-file rename (crash-safe)
 * - Strict array bounds prevent unbounded growth (max 15 rules, 10 pitfalls)
 * - Self-healing: returns sensible defaults if file is missing/corrupt
 *
 * Runs server-side only — uses Node.js `fs` module.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProjectSoul, MEMORY_CONFIG } from './memoryTypes.js';

const DEFAULT_SOUL_DIR = path.resolve(process.cwd(), 'data', 'souls');

export class ProjectSoulAgent {
    private soulDir: string;

    constructor(customDir?: string) {
        this.soulDir = customDir || DEFAULT_SOUL_DIR;
        // Ensure soul directory exists on construction
        try {
            fs.mkdirSync(this.soulDir, { recursive: true });
        } catch {
            // Directory creation failed — readSoul will return defaults
        }
    }

    /**
     * Resolve the soul file path for a given project.
     * Each project gets its own file to prevent cross-project contamination.
     */
    private getSoulPath(projectId: string): string {
        // Sanitize projectId to prevent path traversal attacks
        const safeId = projectId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 100);
        return path.resolve(this.soulDir, `PROJECT_SOUL_${safeId}.md`);
    }

    /**
     * Read and parse PROJECT_SOUL.md from disk.
     * Returns sensible defaults if file doesn't exist or is corrupt.
     */
    public async readSoul(projectId: string): Promise<ProjectSoul> {
        const soulPath = this.getSoulPath(projectId);

        try {
            if (!fs.existsSync(soulPath)) {
                return this.createDefaultSoul(projectId);
            }

            const rawContent = await fs.promises.readFile(soulPath, 'utf-8');

            // Guard against empty/whitespace-only files
            if (!rawContent || rawContent.trim().length < 10) {
                return this.createDefaultSoul(projectId);
            }

            return this.parseFromMarkdown(rawContent, projectId);
        } catch (err: any) {
            // Failsafe: return defaults on I/O error — generation must never block on disk failure
            console.error(`[ProjectSoulAgent] ❌ Error reading SOUL file at ${soulPath}:`, err.message);
            return this.createDefaultSoul(projectId);
        }
    }

    /**
     * Update the Soul with post-mortem metrics from a completed episode.
     * New rules prepend to existing (newest = highest priority = top of file).
     * Strict deduplication + slicing prevents entropy accumulation.
     */
    public async updateSoul(
        currentSoul: ProjectSoul,
        updateData: {
            episodeNumber: number;
            episodeScore: number;
            postMortemNotes: string;
            extractedRules?: string[];
            extractedPitfalls?: string[];
        }
    ): Promise<ProjectSoul> {
        if (!MEMORY_CONFIG.ENABLE_SOUL_UPDATES) {
            return currentSoul;
        }

        const updated: ProjectSoul = {
            projectId: currentSoul.projectId,
            lastUpdated: new Date().toISOString(),
            episodesProduced: Math.max(currentSoul.episodesProduced, updateData.episodeNumber),
            environmentNotes: currentSoul.environmentNotes,
            // Prepend new rules — newest first for recency bias
            operationalRules: [...(updateData.extractedRules || []), ...currentSoul.operationalRules],
            knownPitfalls: [...(updateData.extractedPitfalls || []), ...currentSoul.knownPitfalls]
        };

        // Anti-entropy: deduplicate (case-insensitive trim) + enforce hard caps
        updated.operationalRules = Array.from(
            new Set(updated.operationalRules.map(r => r.trim().toLowerCase()))
        )
            .filter(Boolean)
            .slice(0, MEMORY_CONFIG.MAX_SOUL_RULES);

        updated.knownPitfalls = Array.from(
            new Set(updated.knownPitfalls.map(p => p.trim().toLowerCase()))
        )
            .filter(Boolean)
            .slice(0, MEMORY_CONFIG.MAX_PITFALLS);

        await this.persistSoul(updated);
        return updated;
    }

    /**
     * Atomic write: write to .tmp file first, then rename.
     * If the process crashes during write, the original file is untouched.
     * If rename fails, we clean up the temp file to prevent disk litter.
     */
    public async persistSoul(soul: ProjectSoul): Promise<void> {
        const soulPath = this.getSoulPath(soul.projectId);
        const markdown = this.serializeToMarkdown(soul);
        const tempPath = `${soulPath}.${Date.now()}.tmp`;

        try {
            await fs.promises.writeFile(tempPath, markdown, 'utf-8');
            await fs.promises.rename(tempPath, soulPath);
            console.log(
                `[ProjectSoulAgent] 📜 Persisted SOUL for "${soul.projectId}" ` +
                `(${soul.operationalRules.length} rules, ${soul.knownPitfalls.length} pitfalls)`
            );
        } catch (err: any) {
            console.error('[ProjectSoulAgent] ❌ Atomic write failed:', err.message);
            // Clean up orphaned temp file to prevent disk litter
            await fs.promises.unlink(tempPath).catch(() => {});
            throw err; // Propagate — caller decides recovery strategy
        }
    }

    /**
     * Serialize ProjectSoul to a human-readable markdown format.
     * This file is git-trackable and manually editable.
     */
    public serializeToMarkdown(soul: ProjectSoul): string {
        return `# Project Soul (Auto-Generated & Pruned)
Last Updated: ${soul.lastUpdated} | Episodes Produced: ${soul.episodesProduced} | Project: ${soul.projectId}

## Operational Rules (Learned)
${soul.operationalRules.length > 0 ? soul.operationalRules.map(r => `- ${r}`).join('\n') : '- (No rules learned yet)'}

## Environment Notes
${soul.environmentNotes.length > 0 ? soul.environmentNotes.map(n => `- ${n}`).join('\n') : '- (No environment notes)'}

## Known Pitfalls
${soul.knownPitfalls.length > 0 ? soul.knownPitfalls.map(p => `- ${p}`).join('\n') : '- (No pitfalls recorded yet)'}
`;
    }

    /**
     * Parse a markdown string back into a ProjectSoul object.
     * Resilient: handles missing sections, extra whitespace, and malformed lines.
     */
    public parseFromMarkdown(markdown: string, projectId: string): ProjectSoul {
        const soul: ProjectSoul = this.createDefaultSoul(projectId);
        // Clear defaults before parsing — parser fills from file content
        soul.operationalRules = [];
        soul.environmentNotes = [];
        soul.knownPitfalls = [];

        const lines = markdown.split('\n');
        let currentSection: 'rules' | 'env' | 'pitfalls' | null = null;

        for (const line of lines) {
            const trimmed = line.trim();

            if (trimmed.startsWith('Last Updated:')) {
                const match = trimmed.match(/Episodes Produced:\s*(\d+)/i);
                if (match) soul.episodesProduced = parseInt(match[1], 10) || 0;

                const dateMatch = trimmed.match(/Last Updated:\s*([^\s|]+)/);
                if (dateMatch) soul.lastUpdated = dateMatch[1];
            } else if (trimmed.startsWith('## Operational Rules')) {
                currentSection = 'rules';
            } else if (trimmed.startsWith('## Environment Notes')) {
                currentSection = 'env';
            } else if (trimmed.startsWith('## Known Pitfalls')) {
                currentSection = 'pitfalls';
            } else if (trimmed.startsWith('##')) {
                currentSection = null; // Unknown section — skip
            } else if (trimmed.startsWith('- ') && currentSection) {
                const item = trimmed.substring(2).trim();
                // Skip placeholder lines
                if (item.length > 0 && !item.startsWith('(No ')) {
                    if (currentSection === 'rules') soul.operationalRules.push(item);
                    if (currentSection === 'env') soul.environmentNotes.push(item);
                    if (currentSection === 'pitfalls') soul.knownPitfalls.push(item);
                }
            }
        }

        // Enforce hard caps after parsing to prevent file-level injection
        soul.operationalRules = soul.operationalRules.slice(0, MEMORY_CONFIG.MAX_SOUL_RULES);
        soul.knownPitfalls = soul.knownPitfalls.slice(0, MEMORY_CONFIG.MAX_PITFALLS);

        return soul;
    }

    /**
     * Sensible default soul — enough rules to produce quality output from episode 1.
     */
    private createDefaultSoul(projectId: string): ProjectSoul {
        return {
            projectId,
            lastUpdated: new Date().toISOString(),
            episodesProduced: 0,
            operationalRules: [
                'Hook listener in the first 7 seconds without greetings or meta-announcements',
                'Deliver concrete, high-utility frameworks over generic theoretical motivation',
                'Maintain high dialog velocity and clear speaker contrast'
            ],
            environmentNotes: [
                'Primary Pipeline: Express + PostgreSQL/pgvector',
                'Embeddings: Gemini text-embedding-004 (768-dim)'
            ],
            knownPitfalls: [
                'Do not end episodes with generic signoffs like "Stay tuned for next time"',
                'Never break the fourth wall by referencing LLM prompts or token limits'
            ]
        };
    }
}
