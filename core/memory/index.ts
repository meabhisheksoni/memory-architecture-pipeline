/**
 * Memory Core - Barrel Export
 * Single entry point for all memory-related functionality.
 */

// Schema and Types
export {
    MEMORY_SCHEMA_VERSION,
    INITIAL_MEMORY_STATE,
    MemoryAuditEntrySchema,
    AuditSummarySchema,
    QuarantineEntrySchema,
    ThemeBrainSchema,
    ContinuityLedgerSchema,
    ContinuityLedgerItemSchema,
    DirectorMapSchema,
    ChekhovStoreSchema,
    ChekhovGunSchema,
    ActorSoulSchema,
    FullMemoryStateSchema,
    type MemoryAuditEntry,
    type AuditSummary,
    type QuarantineEntry,
    type ThemeBrain,
    type ContinuityLedger,
    type ContinuityLedgerItem,
    type DirectorMap,
    type ChekhovStore,
    type ChekhovGun,
    type ActorSoul,
    type FullMemoryState
} from './MemorySchemas';

// Core Functions
export {
    loadAll,
    saveMemory,
    addAuditEntry,
    getMemory,
    getCurrentVersion,
    resetMemoryCache,
    getBrain,
    getLedger,
    getDirector,
    getChekhov,
    getSoul,
    updateBrain,
    updateLedger,
    updateDirector,
    updateChekhov,
    updateSoul,
    type LoadResult
} from './MemoryCore';

// Semantic Validation
export {
    validateContent,
    isValidString,
    filterGarbageStrings,
    cleanExpiredQuarantine,
    addGarbagePattern,
    getQuarantineAgeDays,
    type ValidationResult,
    type QuarantineCleanupResult
} from './SemanticGuard';

// Retry Utilities
export {
    StaleDataError,
    MaxRetriesExceededError,
    retryWithBackoff,
    executeWithRetry,
    type RetryableOperation
} from './RetryUtils';

// Memory Bridge (ThemeTracker ↔ MemoryCore)
export {
    themeTrackerToMemory,
    memoryToThemeTracker,
    mergeTrackerIntoMemory,
    getAvailableTracker
} from './MemoryBridge';
