/**
 * Retry Utilities - Exponential Backoff with Jitter
 * Prevents "Retry Storm" when multiple agents conflict on CAS lock.
 * 
 * Anti-Fragile Features:
 * - Exponential backoff: delay = base * 2^attempt
 * - Jitter: random 0-100ms to prevent synchronized retries
 * - Max retries: hard fail after 3 attempts (no infinite loops)
 */

const BASE_DELAY_MS = 100;
const MAX_RETRIES = 3;
const JITTER_MAX_MS = 100;

// ===== CUSTOM ERRORS =====

/**
 * Thrown when CAS version mismatch is detected.
 * Indicates another agent modified the state since we read it.
 */
export class StaleDataError extends Error {
    public readonly expectedVersion: number;
    public readonly actualVersion: number;

    constructor(expected: number, actual: number) {
        super(`Stale data: expected version ${expected}, got ${actual}`);
        this.name = 'StaleDataError';
        this.expectedVersion = expected;
        this.actualVersion = actual;
    }
}

/**
 * Thrown when all retry attempts have been exhausted.
 * This is a hard failure - the operation could not complete.
 */
export class MaxRetriesExceededError extends Error {
    public readonly attempts: number;
    public readonly lastError: Error | null;

    constructor(attempts: number, lastError: Error | null = null) {
        super(`Max retries exceeded after ${attempts} attempts`);
        this.name = 'MaxRetriesExceededError';
        this.attempts = attempts;
        this.lastError = lastError;
    }
}

// ===== RETRY LOGIC =====

/**
 * Retry a function with exponential backoff + jitter.
 * Only retries on StaleDataError (CAS conflict).
 * 
 * @param fn - Async function to retry
 * @param maxRetries - Maximum retry attempts (default 3)
 * @returns Result of fn() on success
 * @throws MaxRetriesExceededError if all retries fail
 * @throws Original error if it's not a StaleDataError
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = MAX_RETRIES
): Promise<T> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < maxRetries) {
        try {
            return await fn();
        } catch (error) {
            // Only retry on StaleDataError (CAS conflict)
            if (error instanceof StaleDataError) {
                lastError = error;
                attempt++;

                // Final attempt exhausted — throw structured error
                if (attempt >= maxRetries) {
                    throw new MaxRetriesExceededError(maxRetries, lastError);
                }

                // Exponential backoff + jitter
                const delay = (BASE_DELAY_MS * Math.pow(2, attempt)) + (Math.random() * JITTER_MAX_MS);
                console.warn(
                    `[RetryUtils] ⚠️ CAS conflict (v${error.expectedVersion} vs v${error.actualVersion}), ` +
                    `retry ${attempt}/${maxRetries} in ${delay.toFixed(0)}ms`
                );

                await sleep(delay);
            } else {
                // Not a StaleDataError — rethrow immediately (don't retry non-CAS errors)
                throw error;
            }
        }
    }

    // Safety net (should be unreachable after the fix above)
    throw new MaxRetriesExceededError(maxRetries, lastError);
}

/**
 * Sleep for a specified duration.
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== UTILITY TYPES =====

/**
 * Wrapper type for operations that may need retry.
 */
export interface RetryableOperation<T> {
    execute: () => Promise<T>;
    onRetry?: (attempt: number, error: StaleDataError) => void;
    onSuccess?: (result: T) => void;
    onFailure?: (error: MaxRetriesExceededError) => void;
}

/**
 * Execute a retryable operation with callbacks.
 */
export async function executeWithRetry<T>(
    operation: RetryableOperation<T>,
    maxRetries: number = MAX_RETRIES
): Promise<T> {
    try {
        const result = await retryWithBackoff(operation.execute, maxRetries);
        operation.onSuccess?.(result);
        return result;
    } catch (error) {
        if (error instanceof MaxRetriesExceededError) {
            operation.onFailure?.(error);
        }
        throw error;
    }
}
