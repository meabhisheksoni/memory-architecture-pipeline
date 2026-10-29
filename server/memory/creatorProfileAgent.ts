/**
 * creatorProfileAgent.ts — Persists and evolves creator preferences in PostgreSQL.
 *
 * The "Profile" is a database row that learns from user feedback:
 * - Banned phrases they hate ("buckle up", "in conclusion")
 * - Editorial preferences ("always use concrete examples")
 * - Tone/niche preferences
 * - Audience engagement patterns
 *
 * This data gets injected into generation prompts so the AI produces content
 * that matches the creator's evolving taste — not just a generic podcast.
 *
 * Architecture:
 * - PostgreSQL UPSERT for concurrent-safe writes
 * - All JSONB arrays are capped to prevent unbounded row growth
 * - Graceful degradation: returns sensible defaults if DB is offline
 *
 * Runs server-side only — uses `pg` Pool.
 */

import type pg from 'pg';
import { CreatorProfile, MEMORY_CONFIG } from './memoryTypes.js';

export class CreatorProfileAgent {
    constructor(private pool: pg.Pool) {}

    /**
     * Load a creator profile from PostgreSQL by project ID.
     * Returns a sensible default if no profile exists or DB is unreachable.
     */
    public async loadProfile(projectId: string): Promise<CreatorProfile> {
        try {
            const result = await this.pool.query(
                `SELECT project_id, creator_name, tone_preference, banned_phrases,
                        primary_niches, audience_dna, editorial_preferences,
                        feedback_history, last_updated
                 FROM creator_profiles
                 WHERE project_id = $1
                 LIMIT 1`,
                [projectId]
            );

            if (result.rows.length === 0) {
                return this.createDefaultProfile(projectId);
            }

            const row = result.rows[0];
            return {
                projectId: row.project_id,
                creatorName: row.creator_name || 'Creator',
                tonePreference: row.tone_preference || 'High-Impact, Direct',
                bannedPhrases: Array.isArray(row.banned_phrases) ? row.banned_phrases : [],
                primaryNiches: Array.isArray(row.primary_niches) ? row.primary_niches : [],
                audienceDna: row.audience_dna || {
                    peakEngagement: 'Cold Open Hooks',
                    preferredLength: '10 mins'
                },
                editorialPreferences: Array.isArray(row.editorial_preferences) ? row.editorial_preferences : [],
                feedbackHistory: Array.isArray(row.feedback_history) ? row.feedback_history : [],
                lastUpdated: Number(row.last_updated) || Date.now()
            };
        } catch (err: any) {
            // Graceful degradation — return defaults so generation continues
            console.error(`[CreatorProfileAgent] ❌ DB load failed for project ${projectId}:`, err.message);
            return this.createDefaultProfile(projectId);
        }
    }

    /**
     * Save or update a creator profile using PostgreSQL UPSERT.
     * Concurrent-safe: ON CONFLICT UPDATE prevents duplicate key errors.
     */
    public async saveProfile(profile: CreatorProfile): Promise<void> {
        const now = Date.now();

        try {
            await this.pool.query(
                `INSERT INTO creator_profiles (
                    project_id, creator_name, tone_preference, banned_phrases,
                    primary_niches, audience_dna, editorial_preferences,
                    feedback_history, last_updated
                ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8::jsonb, $9)
                ON CONFLICT (project_id) DO UPDATE SET
                    creator_name = EXCLUDED.creator_name,
                    tone_preference = EXCLUDED.tone_preference,
                    banned_phrases = EXCLUDED.banned_phrases,
                    primary_niches = EXCLUDED.primary_niches,
                    audience_dna = EXCLUDED.audience_dna,
                    editorial_preferences = EXCLUDED.editorial_preferences,
                    feedback_history = EXCLUDED.feedback_history,
                    last_updated = EXCLUDED.last_updated`,
                [
                    profile.projectId,
                    profile.creatorName,
                    profile.tonePreference,
                    JSON.stringify(profile.bannedPhrases.slice(-MEMORY_CONFIG.MAX_BANNED_PHRASES)),
                    JSON.stringify(profile.primaryNiches),
                    JSON.stringify(profile.audienceDna),
                    JSON.stringify(profile.editorialPreferences.slice(-MEMORY_CONFIG.MAX_EDITORIAL_PREFS)),
                    JSON.stringify(profile.feedbackHistory.slice(-MEMORY_CONFIG.MAX_FEEDBACK_HISTORY)),
                    now
                ]
            );
        } catch (err: any) {
            console.error(`[CreatorProfileAgent] ❌ DB save failed for ${profile.projectId}:`, err.message);
            throw err; // Propagate — caller decides recovery
        }
    }

    /**
     * Ingest feedback from a creator or automated editorial review.
     * Merges new banned phrases and editorial rules into the existing profile.
     * All arrays are deduplication + capped to prevent unbounded growth.
     */
    public async ingestFeedback(
        projectId: string,
        feedback: {
            episode: number;
            rawFeedback: string;
            extractedBannedPhrases?: string[];
            extractedEditorialRules?: string[];
            actionTaken: string;
        }
    ): Promise<CreatorProfile> {
        if (!MEMORY_CONFIG.ENABLE_CREATOR_FEEDBACK) {
            return this.loadProfile(projectId);
        }

        const current = await this.loadProfile(projectId);

        const newBanned = feedback.extractedBannedPhrases || [];
        const newEditorial = feedback.extractedEditorialRules || [];

        // Deduplicate (case-insensitive) and retain most recent entries
        const updatedBanned = Array.from(
            new Set([...current.bannedPhrases, ...newBanned].map(s => s.trim().toLowerCase()))
        )
            .filter(Boolean)
            .slice(-MEMORY_CONFIG.MAX_BANNED_PHRASES);

        const updatedEditorial = Array.from(
            new Set([...current.editorialPreferences, ...newEditorial].map(s => s.trim()))
        )
            .filter(Boolean)
            .slice(-MEMORY_CONFIG.MAX_EDITORIAL_PREFS);

        // Append feedback entry with size caps on raw text
        const updatedHistory = [
            ...current.feedbackHistory,
            {
                episode: feedback.episode,
                feedback: feedback.rawFeedback.slice(0, 500), // Cap to prevent DB bloat
                action: feedback.actionTaken.slice(0, 200),
                timestamp: Date.now()
            }
        ].slice(-MEMORY_CONFIG.MAX_FEEDBACK_HISTORY);

        const updatedProfile: CreatorProfile = {
            ...current,
            bannedPhrases: updatedBanned,
            editorialPreferences: updatedEditorial,
            feedbackHistory: updatedHistory,
            lastUpdated: Date.now()
        };

        await this.saveProfile(updatedProfile);

        console.log(
            `[CreatorProfileAgent] 👤 Updated profile for "${projectId}" ` +
            `after Episode ${feedback.episode} (${updatedBanned.length} banned, ${updatedEditorial.length} editorial)`
        );

        return updatedProfile;
    }

    /**
     * Sensible defaults — enough personality to produce non-generic content from day one.
     */
    private createDefaultProfile(projectId: string): CreatorProfile {
        return {
            projectId,
            creatorName: 'Creator',
            tonePreference: 'High-Impact, Direct, No Fluff',
            bannedPhrases: [
                'in conclusion',
                'buckle up',
                'at the end of the day',
                'let that sink in'
            ],
            primaryNiches: ['Tech', 'Business Strategy'],
            audienceDna: {
                peakEngagement: 'First 60 seconds / Concrete case studies',
                preferredLength: '10-12 mins'
            },
            editorialPreferences: [
                'Always substantiate claims with data or concrete examples',
                'Cut intros immediately to the conflict'
            ],
            feedbackHistory: [],
            lastUpdated: Date.now()
        };
    }
}
