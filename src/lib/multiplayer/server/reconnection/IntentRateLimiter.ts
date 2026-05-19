/**
 * IntentRateLimiter — per-connection token-bucket rate limiter for the
 * authoritative intent dispatch.
 *
 * Per `harden-multiplayer-transport` design D6: a malicious or buggy
 * client can flood the host with intents. The authoritative server
 * applies a per-connection token bucket — an intent that exceeds the
 * configured budget is rejected with a non-fatal
 * `Error {code: 'RATE_LIMITED'}`, the connection stays open, and no
 * event is appended. Heartbeats and replay traffic are NOT routed
 * through this limiter (the host calls `tryConsume` only on the engine
 * + lobby intent path).
 *
 * The bucket model:
 *   - `capacity` tokens, refilled at `refillPerSec` tokens/second.
 *   - Each intent consumes one token. `tryConsume` returns `true` and
 *     debits a token if one is available, `false` otherwise.
 *   - The refill is lazy (computed from elapsed wall-clock on each
 *     call) so there is no background timer to leak.
 *
 * Why per-connection and not per-player: a player with two tabs open
 * gets two buckets — that is intentional. The defense is against a
 * single abusive socket, and a legitimate two-tab player still cannot
 * out-click two generous budgets combined.
 *
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 */

import {
  INTENT_RATE_LIMIT_CAPACITY,
  INTENT_RATE_LIMIT_REFILL_PER_SEC,
} from '@/types/multiplayer/Protocol';

interface IBucket {
  /** Fractional token count — refills continuously. */
  tokens: number;
  /** Wall-clock ms of the last refill computation. */
  lastRefillMs: number;
}

export interface IIntentRateLimiterOptions {
  /** Maximum burst size (bucket capacity). */
  readonly capacity?: number;
  /** Steady-state refill rate in tokens per second. */
  readonly refillPerSec?: number;
  /**
   * Clock injection so tests can drive the limiter deterministically
   * without `jest.useFakeTimers()`. Defaults to `Date.now`.
   */
  readonly now?: () => number;
}

export class IntentRateLimiter {
  private readonly capacity: number;
  private readonly refillPerSec: number;
  private readonly now: () => number;
  /** One bucket per connection key (the per-socket identity). */
  private readonly buckets = new Map<string, IBucket>();

  constructor(options: IIntentRateLimiterOptions = {}) {
    this.capacity = options.capacity ?? INTENT_RATE_LIMIT_CAPACITY;
    this.refillPerSec =
      options.refillPerSec ?? INTENT_RATE_LIMIT_REFILL_PER_SEC;
    this.now = options.now ?? (() => Date.now());
  }

  /**
   * Attempt to spend one token for `connectionKey`. Returns `true` if a
   * token was available (the intent is allowed) and `false` if the
   * connection has exhausted its budget (the intent must be rejected
   * with `RATE_LIMITED`). A previously-unseen key starts with a full
   * bucket so a connection's first burst is never throttled.
   */
  tryConsume(connectionKey: string): boolean {
    const bucket = this.refill(connectionKey);
    if (bucket.tokens < 1) {
      return false;
    }
    bucket.tokens -= 1;
    return true;
  }

  /**
   * Drop a connection's bucket. The host calls this on socket detach so
   * a finished match doesn't retain per-socket state forever.
   */
  release(connectionKey: string): void {
    this.buckets.delete(connectionKey);
  }

  /** Test/observability: current (fractional) token count for a key. */
  tokensFor(connectionKey: string): number {
    return this.refill(connectionKey).tokens;
  }

  /**
   * Lazily refill the bucket for `connectionKey` based on elapsed
   * wall-clock, creating a full bucket on first use.
   */
  private refill(connectionKey: string): IBucket {
    const nowMs = this.now();
    const existing = this.buckets.get(connectionKey);
    if (!existing) {
      const fresh: IBucket = { tokens: this.capacity, lastRefillMs: nowMs };
      this.buckets.set(connectionKey, fresh);
      return fresh;
    }
    const elapsedSec = Math.max(0, (nowMs - existing.lastRefillMs) / 1000);
    if (elapsedSec > 0) {
      existing.tokens = Math.min(
        this.capacity,
        existing.tokens + elapsedSec * this.refillPerSec,
      );
      existing.lastRefillMs = nowMs;
    }
    return existing;
  }
}
