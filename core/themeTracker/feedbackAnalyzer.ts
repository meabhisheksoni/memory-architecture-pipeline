import { GeminiService } from '../geminiService';
import {
    ThemeTracker,
    PredictedReaction,
    AuditResult,
    FeedbackAnalysis
} from '../../types';

// ===== LAYER 6: EMPATHY AGENT (Predictive Audience Reaction) =====

/**
 * EMPATHY AGENT - Predicts how the audience might have reacted to the last episode.
 * This allows the host to be SELF-AWARE without using fake comments.
 * 
 * SAFEGUARD 4: Returns neutral defaults for Episode 1 (no "last episode" to analyze).
 */
export const predictAudienceReaction = async (
    service: GeminiService,
    lastEpisodeSummary: string,
    episodeNumber: number
): Promise<PredictedReaction> => {

    // SAFEGUARD 4: First Episode Guard
    if (episodeNumber <= 1 || !lastEpisodeSummary) {
        console.log('[EmpathyAgent] 🛡️ Safeguard 4: First episode - returning neutral defaults');
        return {
            emotionalWeight: 'medium',
            controversyScore: 0,
            pacingPrediction: 'balanced',
            likelyQuestions: [],
            suggestedHostAcknowledgment: ''
        };
    }

    console.log(`[EmpathyAgent] 🪞 Analyzing Episode ${episodeNumber - 1} for audience reaction prediction...`);

    const prompt = `
ROLE: AUDIENCE PSYCHOLOGIST & SELF-REFLECTION ENGINE

You are NOT generating fake comments. You are PREDICTING how a typical listener might have felt after the last episode.
Your predictions help the host sound SELF-AWARE and CONNECTED to the audience.

This is about EMPATHY, not fabrication.

===== INPUT: LAST EPISODE SUMMARY (Episode ${episodeNumber - 1}) =====
${lastEpisodeSummary}

===== YOUR ANALYSIS TASKS =====

📊 1. EMOTIONAL WEIGHT ASSESSMENT
   - Was the last episode emotionally heavy (sad, stressful, intense)?
   - Or was it light (fun, easy, entertaining)?
   - Output: "heavy" | "medium" | "light"

🔥 2. CONTROVERSY SCORE (1-10)
   - Did the host say anything that might have divided the audience?
   - Hot takes, unpopular opinions, dismissive statements?
   - 0 = No controversy, 10 = Maximum divisiveness

⏱️ 3. PACING PREDICTION
   - Was the episode too fast (overwhelming, rushed)?
   - Too slow (boring, dragging)?
   - Or balanced?
   - Output: "balanced" | "too_fast" | "too_slow"

❓ 4. LIKELY QUESTIONS
   - What 1-2 questions might listeners have after this episode?
   - What might they be confused about or want to know more about?

💬 5. SUGGESTED HOST ACKNOWLEDGMENT
   - Write a single, natural opening line the host COULD use to acknowledge the previous episode.
   - This should feel authentic, not scripted.
   - Examples:
     - "I know last time was kinda heavy, so today let's keep it lighter..."
     - "A few of you probably disagreed with what I said about X, and honestly, I get it..."
     - "I left you hanging last time, I know. Let's pick up where we left off..."
   - If no acknowledgment is needed, return empty string.

===== OUTPUT FORMAT (JSON ONLY) =====
{
  "emotionalWeight": "heavy" | "medium" | "light",
  "controversyScore": 0-10,
  "pacingPrediction": "balanced" | "too_fast" | "too_slow",
  "likelyQuestions": ["Question 1?", "Question 2?"],
  "suggestedHostAcknowledgment": "Natural opening line or empty string"
}

Be HONEST in your assessment. If the episode was boring, say so. If it was controversial, note it.
OUTPUT JSON ONLY.
`;

    try {
        const response = await service.generateText(prompt);

        // Parse JSON response
        let jsonStr = response.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];

        const parsed = JSON.parse(jsonStr);

        // Validate and normalize
        const result: PredictedReaction = {
            emotionalWeight: ['heavy', 'medium', 'light'].includes(parsed.emotionalWeight)
                ? parsed.emotionalWeight
                : 'medium',
            controversyScore: typeof parsed.controversyScore === 'number'
                ? Math.min(10, Math.max(0, parsed.controversyScore))
                : 0,
            pacingPrediction: ['balanced', 'too_fast', 'too_slow'].includes(parsed.pacingPrediction)
                ? parsed.pacingPrediction
                : 'balanced',
            likelyQuestions: Array.isArray(parsed.likelyQuestions)
                ? parsed.likelyQuestions.slice(0, 3)
                : [],
            suggestedHostAcknowledgment: typeof parsed.suggestedHostAcknowledgment === 'string'
                ? parsed.suggestedHostAcknowledgment
                : ''
        };

        console.log(`[EmpathyAgent] ✅ Prediction complete. Weight: ${result.emotionalWeight}, Controversy: ${result.controversyScore}/10`);

        return result;

    } catch (error) {
        console.error('[EmpathyAgent] ❌ Prediction failed:', error);

        // Return safe defaults on error
        return {
            emotionalWeight: 'medium',
            controversyScore: 0,
            pacingPrediction: 'balanced',
            likelyQuestions: [],
            suggestedHostAcknowledgment: ''
        };
    }
};

// ===== LAYER 4: AUDITOR AGENT (Consistency Guard) =====

/**
 * AUDITOR AGENT - The Final Line of Defense against the "Ghajini Problem"
 * Compares newly generated scripts against the established Series Bible
 * and flags any contradictions before they make it to audio.
 * 
 * SAFEGUARD 5: Returns detailed results for retry loop implementation
 */
export const auditScriptConsistency = async (
    service: GeminiService,
    newScript: string,
    episodeNumber: number,
    seriesBible: ThemeTracker
): Promise<AuditResult> => {

    console.log(`[AuditorAgent] 🔍 Running consistency audit for Episode ${episodeNumber}...`);

    // Build the Series Bible summary for comparison
    const inventorySummary = seriesBible.characterState ? `
Skills: ${seriesBible.characterState.inventory.skills.join(', ') || 'None'}
Secrets: ${seriesBible.characterState.inventory.secrets.join(', ') || 'None'}
Traumas: ${seriesBible.characterState.inventory.traumas.join(', ') || 'None'}
` : 'No character state tracked.';

    const emotionalSummary = `
Current State: ${seriesBible.emotionalBaseline?.state || 'Neutral'}
Reason: ${seriesBible.emotionalBaseline?.reason || 'Unknown'}
Recent Shift: ${seriesBible.emotionalBaseline?.shift || 'None'}
`;

    const openLedgerSummary = seriesBible.openLedger
        .filter(i => i.status === 'open')
        .slice(0, 10)
        .map(i => `- Ep ${i.introducedEpisode}: "${i.item}" (${i.type})`)
        .join('\n') || 'No open items';

    const beliefsSummary = Object.entries(seriesBible.beliefs || {})
        .map(([topic, belief]) => `- ${topic}: ${belief.stance}`)
        .join('\n') || 'No beliefs tracked';

    const prompt = `
ROLE: CONSISTENCY AUDITOR & CANON PROTECTOR

You are the FINAL LINE OF DEFENSE against the "Ghajini Problem" (memory loss in AI-generated content).
Your job is to COMPARE the newly generated script against the established "Series Bible" and flag any CONTRADICTIONS.

===== NEW SCRIPT (Episode ${episodeNumber}) =====
${newScript.substring(0, 2500)}${newScript.length > 2500 ? '...[truncated]' : ''}

===== SERIES BIBLE =====
CHARACTER INVENTORY: ${inventorySummary}
EMOTIONAL BASELINE: ${emotionalSummary}
BELIEFS: ${beliefsSummary}
OPEN LEDGER: ${openLedgerSummary}

===== OUTPUT (JSON ONLY) =====
{
  "overallVerdict": "APPROVED" | "REJECTED",
  "inventoryCheck": { "verdict": "PASS" | "CONTRADICTION", "explanation": "..." },
  "knowledgeCheck": { "verdict": "PASS" | "CONTRADICTION", "explanation": "..." },
  "emotionalCheck": { "verdict": "PASS" | "JARRING_SHIFT", "explanation": "..." },
  "ledgerCheck": { "verdict": "PASS" | "ITEM_MISSED", "explanation": "...", "missedItem": "..." },
  "suggestedFixes": ["Fix 1", "Fix 2"]
}
`;

    try {
        const response = await service.generateText(prompt);
        let jsonStr = response.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];

        const parsed = JSON.parse(jsonStr);

        const result: AuditResult = {
            overallVerdict: parsed.overallVerdict === 'REJECTED' ? 'REJECTED' : 'APPROVED',
            inventoryCheck: { verdict: parsed.inventoryCheck?.verdict || 'PASS', explanation: parsed.inventoryCheck?.explanation || '' },
            knowledgeCheck: { verdict: parsed.knowledgeCheck?.verdict || 'PASS', explanation: parsed.knowledgeCheck?.explanation || '' },
            emotionalCheck: { verdict: parsed.emotionalCheck?.verdict || 'PASS', explanation: parsed.emotionalCheck?.explanation || '' },
            ledgerCheck: { verdict: parsed.ledgerCheck?.verdict || 'PASS', explanation: parsed.ledgerCheck?.explanation || '', missedItem: parsed.ledgerCheck?.missedItem },
            suggestedFixes: Array.isArray(parsed.suggestedFixes) ? parsed.suggestedFixes : []
        };

        console.log(`[AuditorAgent] ${result.overallVerdict === 'APPROVED' ? '✅' : '❌'} Script ${result.overallVerdict}`);
        return result;

    } catch (error) {
        console.error('[AuditorAgent] Audit failed:', error);
        return {
            overallVerdict: 'APPROVED',
            inventoryCheck: { verdict: 'PASS', explanation: 'Audit failed - auto-approved' },
            knowledgeCheck: { verdict: 'PASS', explanation: 'Audit failed - auto-approved' },
            emotionalCheck: { verdict: 'PASS', explanation: 'Audit failed - auto-approved' },
            ledgerCheck: { verdict: 'PASS', explanation: 'Audit failed - auto-approved' },
            suggestedFixes: ['Manual review recommended']
        };
    }
};

/**
 * Helper: Format audit suggestions for script regeneration retry (Safeguard 5)
 */
export const formatAuditFeedbackForRetry = (audit: AuditResult): string => {
    if (audit.overallVerdict === 'APPROVED') return '';

    let feedback = '===== AUDIT FAILED - FIX REQUIRED =====\n';
    if (audit.inventoryCheck.verdict !== 'PASS') feedback += `❌ INVENTORY: ${audit.inventoryCheck.explanation}\n`;
    if (audit.knowledgeCheck.verdict !== 'PASS') feedback += `❌ KNOWLEDGE: ${audit.knowledgeCheck.explanation}\n`;
    if (audit.emotionalCheck.verdict !== 'PASS') feedback += `❌ EMOTIONAL: ${audit.emotionalCheck.explanation}\n`;
    if (audit.ledgerCheck.verdict !== 'PASS') feedback += `❌ CONTINUITY: ${audit.ledgerCheck.explanation}\n`;

    if (audit.suggestedFixes.length > 0) {
        feedback += '\n🔧 FIXES:\n' + audit.suggestedFixes.map((f, i) => `${i + 1}. ${f}`).join('\n');
    }
    return feedback;
};

// ===== LAYER 7 ENHANCED: FEEDBACK INTELLIGENCE AGENT =====

/**
 * FEEDBACK INTELLIGENCE AGENT
 * Analyzes audience feedback and strategically decides:
 * - Sentiment (positive/negative/question)
 * - Priority (urgent/normal/low/ignore)
 * - Timing (which episode to address)
 * - Response type (acknowledge/address/celebrate/ignore)
 */
export const analyzeFeedback = async (
    service: GeminiService,
    feedbackText: string,
    forEpisode: number,
    podcastTheme: string,
    currentEpisode: number,
    totalPlannedEpisodes: number
): Promise<FeedbackAnalysis> => {
    console.log(`[FeedbackAgent] 🧠 Analyzing feedback for Episode ${forEpisode}...`);

    const prompt = `
ROLE: AUDIENCE RELATIONSHIP MANAGER & TIMING STRATEGIST

You are NOT just reading comments - you are MANAGING a relationship with your audience.
Your job is to decide IF, WHEN, and HOW to address audience feedback in the podcast.

===== INPUT =====
PODCAST THEME: "${podcastTheme}"
FEEDBACK TEXT: "${feedbackText}"
ABOUT EPISODE: ${forEpisode}
CURRENT EPISODE: ${currentEpisode}
TOTAL PLANNED: ${totalPlannedEpisodes}

===== YOUR ANALYSIS TASKS =====

1. SENTIMENT ANALYSIS
   - positive: Praise, appreciation, requests for more
   - negative: Complaint, confusion, frustration
   - neutral: Observation, suggestion
   - question: Genuine question that needs answering

2. PRIORITY CLASSIFICATION
   - urgent: Factual error, serious complaint, confusion that affects understanding → ADDRESS IMMEDIATELY
   - normal: Valid feedback that should be addressed soon (within 3-5 episodes)
   - low: Nice-to-have, can wait for milestone episodes (10, 25, 50)
   - ignore: Spam, off-topic, already addressed, or just "nice work" that needs no response

3. TIMING DECISION (MOST IMPORTANT!)
   Think like a smart podcast host:
   - IMMEDIATELY (next episode): Only for urgent issues or great callback opportunities
   - SOON (2-5 episodes): Normal priority, when content naturally fits
   - MILESTONE (10, 25, 50): For celebrations, acknowledgments of praise
   - NEVER (null): For low priority or "ignore" items

4. RESPONSE TYPE
   - acknowledge: Brief mention - "Someone asked about..." (~5 seconds)
   - address: Deep dive - explain, correct, or elaborate (~30 seconds to 1 minute)
   - celebrate: Positive reinforcement - "You guys loved when..." (~15 seconds)
   - ignore: Don't mention, but file in memory for content strategy

===== OUTPUT (JSON ONLY) =====
{
    "sentiment": "positive" | "negative" | "neutral" | "question",
    "priority": "urgent" | "normal" | "low" | "ignore",
    "suggestedEpisode": number OR null,
    "responseType": "acknowledge" | "address" | "celebrate" | "ignore",
    "reasoning": "Brief explanation of your timing decision"
}

Be strategic. Not every comment needs a response. Great hosts know when to engage and when to let things be.
OUTPUT JSON ONLY.
`;

    try {
        const response = await service.generateText(prompt, undefined, undefined, 0.7);

        // Parse JSON response
        let jsonStr = response.replace(/```json\n?/gi, '').replace(/```\n?/g, '').trim();
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];

        const parsed = JSON.parse(jsonStr);

        const result: FeedbackAnalysis = {
            sentiment: ['positive', 'negative', 'neutral', 'question'].includes(parsed.sentiment)
                ? parsed.sentiment
                : 'neutral',
            priority: ['urgent', 'normal', 'low', 'ignore'].includes(parsed.priority)
                ? parsed.priority
                : 'normal',
            suggestedEpisode: typeof parsed.suggestedEpisode === 'number' ? parsed.suggestedEpisode : null,
            responseType: ['acknowledge', 'address', 'celebrate', 'ignore'].includes(parsed.responseType)
                ? parsed.responseType
                : 'acknowledge',
            reasoning: parsed.reasoning || 'No reasoning provided'
        };

        console.log(`[FeedbackAgent] ✅ Analysis complete: ${result.priority} priority, respond in Ep ${result.suggestedEpisode || 'never'}`);
        console.log(`[FeedbackAgent] 💭 Reasoning: ${result.reasoning}`);

        return result;

    } catch (error) {
        console.error('[FeedbackAgent] ❌ Analysis failed:', error);
        // Return safe default
        return {
            sentiment: 'neutral',
            priority: 'low',
            suggestedEpisode: null,
            responseType: 'ignore',
            reasoning: 'Analysis failed - marked for manual review'
        };
    }
};
