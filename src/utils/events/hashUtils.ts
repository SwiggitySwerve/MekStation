/**
 * Hash Utilities
 * Cryptographic hashing for event verification.
 *
 * @spec openspec/changes/add-unified-event-store/specs/event-store/spec.md
 */

import { IBaseEvent, IEventChunk } from '@/types/events';

// =============================================================================
// Deterministic JSON Serialization
// =============================================================================

/**
 * Serialize an object to a deterministic JSON string.
 * Keys are sorted alphabetically to ensure consistent hashing.
 */
export function toCanonicalJson(obj: unknown): string {
  return JSON.stringify(obj, (_, value: unknown) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // Sort object keys
      const record = value as Record<string, unknown>;
      return Object.keys(record)
        .sort()
        .reduce(
          (sorted, key) => {
            sorted[key] = record[key];
            return sorted;
          },
          {} as Record<string, unknown>,
        );
    }
    return value;
  });
}

// =============================================================================
// SHA-256 Hashing
// =============================================================================

/**
 * Compute SHA-256 hash of a string.
 * Works in both browser and Node.js environments.
 */
export async function sha256(data: string): Promise<string> {
  // Use Web Crypto API (available in browser and Node.js 15+)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for environments without Web Crypto
  // This is a simple implementation for testing - use a proper library in production
  throw new Error('SHA-256 not available in this environment');
}

/**
 * Synchronous hash using a simple implementation.
 * For environments where async is not practical.
 *
 * TODO: Replace with real SHA-256 for production (e.g., js-sha256 or Node crypto).
 * Current implementation uses a 32-bit hash repeated for consistent output length,
 * which is sufficient for development/testing but not cryptographically secure.
 *
 * @see https://github.com/nickyout/fast-sha256-js for a sync SHA-256 option
 */
export function sha256Sync(data: string): string {
  // Simple hash implementation for synchronous use
  // In production, use a proper crypto library
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Expand to 64 character hex string (SHA-256 length)
  const base = Math.abs(hash).toString(16).padStart(8, '0');
  return base.repeat(8);
}

// =============================================================================
// Event Hashing
// =============================================================================

/**
 * Hash a single event.
 */
export function hashEvent(event: IBaseEvent): string {
  const canonical = toCanonicalJson({
    id: event.id,
    sequence: event.sequence,
    timestamp: event.timestamp,
    category: event.category,
    type: event.type,
    payload: event.payload,
    context: event.context,
    causedBy: event.causedBy,
  });
  return sha256Sync(canonical);
}

/**
 * Hash an array of events (merkle-style).
 * Creates a combined hash of all event hashes.
 */
export function hashEvents(events: readonly IBaseEvent[]): string {
  if (events.length === 0) {
    return sha256Sync('empty');
  }

  // Hash each event
  const eventHashes = events.map(hashEvent);

  // Combine all hashes into one
  const combined = eventHashes.join('');
  return sha256Sync(combined);
}

// =============================================================================
// Chunk Hashing
// =============================================================================

/**
 * Hash a chunk (excluding the hash field itself).
 */
export function hashChunk(chunk: Omit<IEventChunk, 'hash'>): string {
  const canonical = toCanonicalJson({
    chunkId: chunk.chunkId,
    campaignId: chunk.campaignId,
    sequenceRange: chunk.sequenceRange,
    timeRange: chunk.timeRange,
    eventsHash: hashEvents(chunk.events),
    summary: chunk.summary,
    previousHash: chunk.previousHash,
  });
  return sha256Sync(canonical);
}

/**
 * Hash a state object for checkpoints.
 */
export function hashState<T>(state: T): string {
  const canonical = toCanonicalJson(state);
  return sha256Sync(canonical);
}

// =============================================================================
// Chain Verification
// =============================================================================

/**
 * Result of chain verification.
 */
export interface IChainVerificationResult {
  /** Whether the chain is valid */
  readonly valid: boolean;
  /** Index of first broken link (if invalid) */
  readonly brokenAtIndex?: number;
  /** Details of the verification failure */
  readonly error?: string;
}

/**
 * Verify the integrity of a chain of chunks.
 * Returns true if all previousHash links are valid.
 */
export function verifyChainIntegrity(
  chunks: readonly IEventChunk[],
): IChainVerificationResult {
  if (chunks.length === 0) {
    return { valid: true };
  }

  // First chunk should have null previousHash
  if (chunks[0].previousHash !== null) {
    return {
      valid: false,
      brokenAtIndex: 0,
      error: 'First chunk should have null previousHash',
    };
  }

  // Verify chain links
  for (let i = 1; i < chunks.length; i++) {
    const previousChunk = chunks[i - 1];
    const currentChunk = chunks[i];

    if (currentChunk.previousHash !== previousChunk.hash) {
      return {
        valid: false,
        brokenAtIndex: i,
        error: `Chunk ${i} previousHash (${currentChunk.previousHash}) does not match chunk ${i - 1} hash (${previousChunk.hash})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Verify a single chunk has not been tampered with.
 */
export function verifyChunk(chunk: IEventChunk): boolean {
  const expectedHash = hashChunk({
    chunkId: chunk.chunkId,
    campaignId: chunk.campaignId,
    sequenceRange: chunk.sequenceRange,
    timeRange: chunk.timeRange,
    events: chunk.events,
    summary: chunk.summary,
    previousHash: chunk.previousHash,
  });
  return chunk.hash === expectedHash;
}
