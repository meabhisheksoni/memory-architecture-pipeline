/**
 * memoryCurator.ts — Active pgvector RAG + Chekhov's Gun narrative tracker.
 *
 * This is the "recall" engine. When the AI is about to write Episode 15,
 * the curator searches past episodes for thematically similar ones (using
 * vector cosine similarity) and checks if any "Chekhov's Guns" (narrative
 * details planted in earlier episodes) are ready to be "detonated" (paid off).
 *
 * The result is a ContinuityBrief that gets injected into the generation prompt:
 * - "Reference Episode 3's theme about X — it has evolved"
 * - "Pay off the detail about Y planted in Episode 7"
 * - "Emotional trajectory: Seasoned Authority"
 *
 * Architecture:
 * - pgvector cosine distance for semantic episode similarity (768-dim Gemini embeddings)
 * - Strict similarity threshold (>= 0.65) rejects low-relevance noise
 * - Chekhov's guns have atomic status transitions (planted → detonated → archived)
 * - Graceful fallback: returns neutral standalone brief if DB is unreachable
 *
 * Runs server-side only — uses `pg` Pool.
 */

import type pg from 'pg';
import { ContinuityBrief, ChekhovsGun, MEMORY_CONFIG } from './memoryTypes.js';

export class MemoryCurator {
    constructor(private pool: pg.Pool) {}

    /**
     * Synthesize a Continuity Brief for the script generator.
     * Combines vector search (past episodes) + active Chekhov's guns
     * into a structured block that the AI can use for narrative callbacks.
     */
    public async generateContinuityBrief(
        projectId: string,
        episodeNumber: number,
        concept: string,
        conceptEmbedding?: number[]
    ): Promise<ContinuityBrief> {
        const fallbackBrief: ContinuityBrief = {
            callbackOpportunity: 'None (Standalone episode focus)',
            emotionalState: 'Confident, Energetic',
            openLoopResolution: 'None',
            thematicContext: 'Maintain fresh narrative tempo without stale dependencies.'
        };

        if (!MEMORY_CONFIG.ENABLE_ACTIVE_RAG) {
            return fallbackBrief;
        }

        try {
            let pastEpisodes: Array<{
                episodeNumber: number;
                title: string;
                summary: string;
                similarity: number;
            }> = [];

            // 1. Vector search if embedding is supplied (768-dim Gemini text-embedding-004)
            if (conceptEmbedding && conceptEmbedding.length === 768) {
                const vecStr = `[${conceptEmbedding.join(',')}]`;
                const res = await this.pool.query(
                    `SELECT episode_number, title, concept, summary,
                            1 - (embedding <=> $1::vector) AS similarity
                     FROM episode_embeddings
                     WHERE project_id = $2 AND episode_number < $3
                     ORDER BY embedding <=> $1::vector
                     LIMIT $4`,
                    [vecStr, projectId, episodeNumber, MEMORY_CONFIG.RAG_TOP_K]
                );

                pastEpisodes = res.rows
                    .map((r: any) => ({
                        episodeNumber: r.episode_number,
                        title: r.title,
                        summary: r.summary,
                        similarity: parseFloat(String(r.similarity)) || 0
                    }))
                    // Reject low-relevance matches to prevent hallucinated callbacks
                    .filter(r => r.similarity >= MEMORY_CONFIG.MIN_SIMILARITY_SCORE);
            }

            // 2. Fetch active Chekhov's guns (planted but not yet detonated)
            const gunsRes = await this.pool.query(
                `SELECT gun_id, detail, potential_payoff, planted_in_episode
                 FROM chekhovs_guns
                 WHERE project_id = $1 AND status = 'planted' AND planted_in_episode < $2
                 ORDER BY planted_in_episode ASC
                 LIMIT 3`,
                [projectId, episodeNumber]
            );

            const activeGuns: ChekhovsGun[] = gunsRes.rows.map((g: any) => ({
                gunId: g.gun_id,
                projectId,
                plantedInEpisode: g.planted_in_episode,
                detail: g.detail,
                potentialPayoff: g.potential_payoff,
                status: 'planted' as const
            }));

            // 3. Assemble the brief
            let callbackOp = 'None';
            if (pastEpisodes.length > 0) {
                const best = pastEpisodes[0];
                callbackOp = `Organic callback to Ep ${best.episodeNumber} ("${best.title}"): ` +
                    `reference how the theme of "${best.summary.slice(0, 80)}..." has now evolved.`;
            }

            let gunDetonation: string | undefined = undefined;
            if (activeGuns.length > 0) {
                const gun = activeGuns[0];
                gunDetonation = `Payoff opportunity for detail planted in Ep ${gun.plantedInEpisode}: ` +
                    `"${gun.detail}". Payoff Angle: ${gun.potentialPayoff}`;
            }

            return {
                callbackOpportunity: callbackOp,
                emotionalState: episodeNumber > 5
                    ? 'Seasoned Authority, Dynamic Host'
                    : 'Hungry, Direct, Urgent',
                openLoopResolution: activeGuns.length > 1
                    ? `Address underlying question from Ep ${activeGuns[1].plantedInEpisode}`
                    : 'None',
                chekhovsGunDetonation: gunDetonation,
                thematicContext: pastEpisodes.length > 0
                    ? `Echoes past themes from Ep ${pastEpisodes.map(p => p.episodeNumber).join(', ')}.`
                    : 'Pioneering new thematic territory for the show.'
            };
        } catch (err: any) {
            console.error('[MemoryCurator] ❌ Continuity brief generation failed:', err.message);
            // Return safe fallback instead of crashing the generation pipeline
            return fallbackBrief;
        }
    }

    /**
     * Plant a new Chekhov's gun — a narrative detail that will be paid off later.
     * Returns the generated gun_id for tracking.
     */
    public async plantChekhovsGun(
        gun: Omit<ChekhovsGun, 'gunId' | 'status' | 'createdAt'>
    ): Promise<string> {
        try {
            const result = await this.pool.query(
                `INSERT INTO chekhovs_guns (project_id, planted_in_episode, detail, potential_payoff, status)
                 VALUES ($1, $2, $3, $4, 'planted')
                 RETURNING gun_id`,
                [gun.projectId, gun.plantedInEpisode, gun.detail, gun.potentialPayoff]
            );
            const gunId = result.rows[0].gun_id;
            console.log(
                `[MemoryCurator] 🔫 Planted Chekhov's Gun "${gun.detail.slice(0, 50)}..." ` +
                `in Ep ${gun.plantedInEpisode} (id: ${gunId})`
            );
            return gunId;
        } catch (err: any) {
            console.error('[MemoryCurator] ❌ Failed to plant Chekhov gun:', err.message);
            throw err;
        }
    }

    /**
     * Mark a Chekhov's gun as detonated (paid off in a specific episode).
     * Atomic update: WHERE clause prevents double-detonation.
     */
    public async detonateChekhovsGun(gunId: string, episodeNumber: number): Promise<boolean> {
        try {
            // Only detonate if currently 'planted' — prevents double-detonation race
            const res = await this.pool.query(
                `UPDATE chekhovs_guns
                 SET status = 'detonated',
                     detonated_in_episode = $1,
                     updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
                 WHERE gun_id = $2 AND status = 'planted'`,
                [episodeNumber, gunId]
            );

            const detonated = (res.rowCount ?? 0) > 0;
            if (detonated) {
                console.log(`[MemoryCurator] 💥 Detonated Chekhov's Gun ${gunId} in Ep ${episodeNumber}`);
            }
            return detonated;
        } catch (err: any) {
            console.error('[MemoryCurator] ❌ Failed to detonate gun:', err.message);
            throw err;
        }
    }

    /**
     * Archive a gun that is no longer narratively relevant.
     * Prevents stale guns from cluttering the continuity brief.
     */
    public async archiveChekhovsGun(gunId: string): Promise<boolean> {
        try {
            const res = await this.pool.query(
                `UPDATE chekhovs_guns
                 SET status = 'archived',
                     updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
                 WHERE gun_id = $1 AND status = 'planted'`,
                [gunId]
            );
            return (res.rowCount ?? 0) > 0;
        } catch (err: any) {
            console.error('[MemoryCurator] ❌ Failed to archive gun:', err.message);
            throw err;
        }
    }

    /**
     * Store an episode embedding for future vector search.
     * UPSERT-safe: re-embedding the same episode overwrites cleanly.
     */
    public async storeEpisodeEmbedding(
        episodeId: string,
        projectId: string,
        episodeNumber: number,
        embedding: number[],
        title: string,
        concept: string,
        summary: string
    ): Promise<void> {
        if (!embedding || embedding.length !== 768) {
            console.warn(`[MemoryCurator] ⚠️ Skipping embedding storage — invalid vector length (${embedding?.length})`);
            return;
        }

        const vecStr = `[${embedding.join(',')}]`;
        try {
            await this.pool.query(
                `INSERT INTO episode_embeddings (episode_id, project_id, episode_number, embedding, title, concept, summary)
                 VALUES ($1, $2, $3, $4::vector, $5, $6, $7)
                 ON CONFLICT (episode_id) DO UPDATE SET
                     embedding = EXCLUDED.embedding,
                     title = EXCLUDED.title,
                     concept = EXCLUDED.concept,
                     summary = EXCLUDED.summary`,
                [episodeId, projectId, episodeNumber, vecStr, title, concept, summary]
            );
        } catch (err: any) {
            // Non-critical: embedding storage failure shouldn't block generation
            console.error('[MemoryCurator] ❌ Failed to store episode embedding:', err.message);
        }
    }
}
