/**
 * Semantic Guard - Validates meaning, not just structure.
 * Rejects AI hallucinations and moves failures to Quarantine.
 * 
 * Anti-Fragile Features:
 * - Pattern-based garbage detection
 * - Quarantine instead of deletion (never lose data)
 * - 30-day expiry for quarantine items
 */
import { QuarantineEntry } from './MemorySchemas';

// ===== GARBAGE PATTERNS =====
// These indicate AI hallucination or placeholder responses

const GARBAGE_PATTERNS: RegExp[] = [
    // Exact matches (case insensitive)
    /^n\/a$/i,
    /^none$/i,
    /^null$/i,
    /^undefined$/i,
    /^no data$/i,
    /^tbd$/i,
    /^not applicable$/i,
    /^not available$/i,
    /^unknown$/i,
    /^placeholder$/i,

    // AI self-reference patterns
    /as an ai/i,
    /i cannot/i,
    /i don't have/i,
    /i'm unable to/i,
    /i am unable to/i,
    /i'm not able to/i,
    /i am not able to/i,

    // Generic filler patterns — only match if the ENTIRE string is short filler
    /^this is a\s*$/i,        // Only matches 'this is a' alone, not 'this is a key concept...'
    /^here is\s*$/i,          // Only matches 'here is' alone, not 'here is the recap...'
    /^the following\s*$/i,    // Only matches 'the following' alone

    // Empty-ish patterns
    /^\s*$/,
    /^\.{3,}$/,  // Just ellipsis
    /^-+$/       // Just dashes
];

// ===== CONFIGURATION =====

const QUARANTINE_EXPIRY_DAYS = 30;

// ===== TYPES =====

export interface ValidationResult {
    valid: boolean;
    reason?: string;
    quarantineEntry?: QuarantineEntry;
}

export interface QuarantineCleanupResult {
    cleaned: QuarantineEntry[];
    expiredCount: number;
    expiredIds: string[];
}

// ===== VALIDATION FUNCTIONS =====

/**
 * Check if a string contains garbage patterns.
 */
function isGarbageString(val: string): boolean {
    const trimmed = val.trim();
    return GARBAGE_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Recursively scan an object for garbage values.
 * Returns list of paths where garbage was found.
 */
function scanForGarbage(obj: unknown, path: string = ''): string[] {
    const garbageFound: string[] = [];

    if (typeof obj === 'string') {
        if (isGarbageString(obj)) {
            garbageFound.push(`${path}: "${obj}"`);
        }
    } else if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
            garbageFound.push(...scanForGarbage(item, `${path}[${i}]`));
        });
    } else if (obj && typeof obj === 'object') {
        Object.entries(obj).forEach(([key, value]) => {
            const newPath = path ? `${path}.${key}` : key;
            garbageFound.push(...scanForGarbage(value, newPath));
        });
    }

    return garbageFound;
}

/**
 * Validate content for a specific store.
 * Returns validation result with optional quarantine entry.
 */
export function validateContent(store: string, data: unknown): ValidationResult {
    const garbageFound = scanForGarbage(data, store);

    if (garbageFound.length > 0) {
        const reason = `Semantic garbage detected: ${garbageFound.slice(0, 5).join(', ')}` +
            (garbageFound.length > 5 ? ` (and ${garbageFound.length - 5} more)` : '');

        console.warn(`[SemanticGuard] ⚠️ ${reason}`);

        return {
            valid: false,
            reason,
            quarantineEntry: {
                id: generateQuarantineId(),
                data,
                store,
                reason,
                createdAt: Date.now()
            }
        };
    }

    return { valid: true };
}

/**
 * Validate a single string value.
 * Useful for quick inline checks.
 */
export function isValidString(value: string): boolean {
    return !isGarbageString(value);
}

/**
 * Filter an array to remove garbage strings.
 * Returns cleaned array and list of removed items.
 */
export function filterGarbageStrings(arr: string[]): {
    cleaned: string[];
    removed: string[];
} {
    const cleaned: string[] = [];
    const removed: string[] = [];

    for (const item of arr) {
        if (isGarbageString(item)) {
            removed.push(item);
        } else {
            cleaned.push(item);
        }
    }

    if (removed.length > 0) {
        console.warn(`[SemanticGuard] 🗑️ Filtered ${removed.length} garbage strings`);
    }

    return { cleaned, removed };
}

// ===== QUARANTINE MANAGEMENT =====

/**
 * Clean expired quarantine entries (> 30 days old).
 * Returns cleaned list and count of expired items.
 */
export function cleanExpiredQuarantine(quarantine: QuarantineEntry[]): QuarantineCleanupResult {
    const expiryMs = QUARANTINE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();

    const cleaned: QuarantineEntry[] = [];
    const expiredIds: string[] = [];

    for (const entry of quarantine) {
        const age = now - entry.createdAt;
        if (age < expiryMs) {
            cleaned.push(entry);
        } else {
            expiredIds.push(entry.id);
        }
    }

    const expiredCount = expiredIds.length;

    if (expiredCount > 0) {
        console.warn(
            `[SemanticGuard] ⚠️ Expired ${expiredCount} quarantine entries (>${QUARANTINE_EXPIRY_DAYS} days): ` +
            `${expiredIds.slice(0, 3).join(', ')}${expiredCount > 3 ? '...' : ''}`
        );
    }

    return { cleaned, expiredCount, expiredIds };
}

/**
 * Add a pattern to the garbage detection list.
 * Useful for dynamically blocking new hallucination patterns.
 */
export function addGarbagePattern(pattern: RegExp): void {
    GARBAGE_PATTERNS.push(pattern);
    console.log(`[SemanticGuard] 📝 Added garbage pattern: ${pattern.source}`);
}

// ===== HELPERS =====

/**
 * Generate a unique quarantine entry ID.
 */
function generateQuarantineId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Get the age of a quarantine entry in days.
 */
export function getQuarantineAgeDays(entry: QuarantineEntry): number {
    return (Date.now() - entry.createdAt) / (24 * 60 * 60 * 1000);
}
