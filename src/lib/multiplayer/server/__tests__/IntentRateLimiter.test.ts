/**
 * IntentRateLimiter unit tests — harden-multiplayer-transport (M2),
 * design D6 / tasks 5.x.
 *
 * The token bucket is driven with an injected clock so the refill
 * behavior is deterministic and no `jest.useFakeTimers()` is needed.
 */

import {
  INTENT_RATE_LIMIT_CAPACITY,
  INTENT_RATE_LIMIT_REFILL_PER_SEC,
} from '@/types/multiplayer/Protocol';

import { IntentRateLimiter } from '../reconnection/IntentRateLimiter';

describe('IntentRateLimiter', () => {
  it('allows a first burst up to the bucket capacity', () => {
    const limiter = new IntentRateLimiter({
      capacity: 5,
      refillPerSec: 0,
      now: () => 0,
    });
    for (let i = 0; i < 5; i++) {
      expect(limiter.tryConsume('conn-a')).toBe(true);
    }
    // The 6th over-budget intent is rejected.
    expect(limiter.tryConsume('conn-a')).toBe(false);
  });

  it('refills tokens lazily as wall-clock advances', () => {
    let nowMs = 0;
    const limiter = new IntentRateLimiter({
      capacity: 3,
      refillPerSec: 1,
      now: () => nowMs,
    });
    expect(limiter.tryConsume('c')).toBe(true);
    expect(limiter.tryConsume('c')).toBe(true);
    expect(limiter.tryConsume('c')).toBe(true);
    expect(limiter.tryConsume('c')).toBe(false); // empty
    nowMs = 2000; // 2 seconds elapsed → +2 tokens at 1/sec
    expect(limiter.tryConsume('c')).toBe(true);
    expect(limiter.tryConsume('c')).toBe(true);
    expect(limiter.tryConsume('c')).toBe(false);
  });

  it('keeps a separate bucket per connection key', () => {
    const limiter = new IntentRateLimiter({
      capacity: 2,
      refillPerSec: 0,
      now: () => 0,
    });
    expect(limiter.tryConsume('conn-1')).toBe(true);
    expect(limiter.tryConsume('conn-1')).toBe(true);
    expect(limiter.tryConsume('conn-1')).toBe(false);
    // A different connection still has a full bucket.
    expect(limiter.tryConsume('conn-2')).toBe(true);
    expect(limiter.tryConsume('conn-2')).toBe(true);
  });

  it('throttles an intent flood but never a worst-case human play rate', () => {
    // Production-default budget.
    let nowMs = 0;
    const limiter = new IntentRateLimiter({ now: () => nowMs });

    // A flood: hundreds of intents in the same instant. The bucket
    // drains after `capacity` intents and every subsequent one trips.
    let floodRejections = 0;
    for (let i = 0; i < 200; i++) {
      if (!limiter.tryConsume('flooder')) floodRejections += 1;
    }
    expect(floodRejections).toBe(200 - INTENT_RATE_LIMIT_CAPACITY);

    // A worst-case human: a fast BattleTech player declaring ~3 intents
    // per second sustained for two full minutes. The refill
    // (5/sec default) outpaces them, so NOTHING is ever throttled.
    let humanRejections = 0;
    for (let i = 0; i < 360; i++) {
      nowMs += 333; // ~3 intents/sec
      if (!limiter.tryConsume('human')) humanRejections += 1;
    }
    expect(humanRejections).toBe(0);
  });

  it('exposes the production budget as exported constants', () => {
    // The stress test (task 8.3) imports these rather than hardcoding.
    expect(INTENT_RATE_LIMIT_CAPACITY).toBeGreaterThanOrEqual(10);
    expect(INTENT_RATE_LIMIT_REFILL_PER_SEC).toBeGreaterThan(0);
  });

  it('drops a connection bucket on release', () => {
    const limiter = new IntentRateLimiter({
      capacity: 1,
      refillPerSec: 0,
      now: () => 0,
    });
    expect(limiter.tryConsume('c')).toBe(true);
    expect(limiter.tryConsume('c')).toBe(false);
    limiter.release('c');
    // A released key starts fresh with a full bucket.
    expect(limiter.tryConsume('c')).toBe(true);
  });
});
