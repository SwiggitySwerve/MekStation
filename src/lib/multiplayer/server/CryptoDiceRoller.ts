/**
 * CryptoDiceRoller — server-authoritative dice source for multiplayer.
 *
 * Wave 3a of Phase 4. Replaces the engine's default `Math.random`-backed
 * `defaultD6Roller` on the SERVER PATH so clients can never bias outcomes
 * by tampering with their local PRNG.
 *
 * Design notes:
 *   - Each d6 reads a single byte from `crypto.randomBytes`. To eliminate
 *     the modulo bias (256 % 6 != 0), we discard bytes >= 252 and re-draw
 *     until we land in [0, 252) — every retained byte is then `(byte % 6) + 1`.
 *     This is rejection sampling; it's a 5-line addition that removes the
 *     measurable 0.16% bias on the trailing buckets.
 *   - The synchronous `randomBytes(n)` is fast enough for our throughput
 *     (single-digit microseconds per roll) and avoids plumbing async into
 *     the engine resolvers.
 *   - The roller exposes BOTH a `d6()` method and a `D6Roller` callback so
 *     it slots cleanly into the existing engine signatures (`D6Roller =
 *     () => number`).
 *
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

import { randomBytes } from 'node:crypto';

import type { D6Roller } from '@/utils/gameplay/diceTypes';

/**
 * Server-side dice roller contract. Every entry point produces a uniform
 * d6 in [1, 6]. Implementations: `CryptoDiceRoller` (production) and
 * `SeededDiceRoller` (debug `?seed=N` path).
 */
export interface IServerDiceRoller {
  /** Roll a single d6 in [1, 6]. */
  d6(): number;
  /**
   * Expose a `D6Roller` callback for engine resolvers. The callback is
   * stable across calls (same identity) so callers can treat it as a
   * cached function reference.
   */
  asD6Roller(): D6Roller;
}

/**
 * Largest multiple of 6 that fits in a byte: 252. Bytes in [252, 255]
 * are rejected and re-drawn so the retained range maps uniformly onto
 * the six faces. This eliminates the modulo bias entirely.
 */
const MAX_UNBIASED_BYTE = 252; // 6 * 42

/**
 * Small re-fill buffer size. We pre-draw a chunk of bytes at a time so a
 * single attack resolution (which may consume 4-12 d6) does only one or
 * two `randomBytes` system calls instead of one per die.
 */
const REFILL_BYTES = 64;

export class CryptoDiceRoller implements IServerDiceRoller {
  private buffer: Buffer = Buffer.alloc(0);
  private offset = 0;
  private readonly cachedRoller: D6Roller;

  constructor() {
    // Bind once so identity is stable — callers can compare references
    // across calls (useful for memoization in resolvers if any are
    // added later).
    this.cachedRoller = () => this.d6();
  }

  d6(): number {
    // Rejection sampling: keep drawing until we get a byte in [0, 252).
    // The expected number of redraws per face is 256/252 ≈ 1.016, so the
    // overhead is negligible (~1.6% of bytes are wasted).
    for (;;) {
      const byte = this.nextByte();
      if (byte < MAX_UNBIASED_BYTE) {
        return (byte % 6) + 1;
      }
    }
  }

  asD6Roller(): D6Roller {
    return this.cachedRoller;
  }

  /**
   * Pull the next byte from the internal buffer, refilling from
   * `randomBytes` when exhausted. Synchronous on purpose — the engine's
   * dice consumers are not async and we don't want to inflict that on
   * them just to source entropy.
   */
  private nextByte(): number {
    if (this.offset >= this.buffer.length) {
      this.buffer = randomBytes(REFILL_BYTES);
      this.offset = 0;
    }
    const byte = this.buffer[this.offset];
    this.offset += 1;
    return byte;
  }
}
