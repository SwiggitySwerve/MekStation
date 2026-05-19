/**
 * Durable-store stress + rate-limit-budget verification —
 * harden-multiplayer-transport (M2), task 8.3.
 *
 * Two checks:
 *   1. `appendEvent` latency under the durable SQLite store stays low
 *      enough that the hot intent path is not a bottleneck — design D2
 *      risk: "durable-store write latency on the hot appendEvent path".
 *   2. A worst-case human play rate never trips the configured
 *      rate-limit budget — design D6 risk: "rate-limit budget too
 *      tight breaks legitimate fast play".
 *
 * The latency assertion uses a generous ceiling (an embedded
 * synchronous-class store is microseconds-per-write, but CI machines
 * vary) — the point is to catch a pathological regression, not to
 * micro-benchmark.
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  INTENT_RATE_LIMIT_CAPACITY,
  INTENT_RATE_LIMIT_REFILL_PER_SEC,
} from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import { IntentRateLimiter } from '../reconnection/IntentRateLimiter';

function makeMeta(matchId: string): IMatchMeta {
  const now = new Date().toISOString();
  return {
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 8, turnLimit: 20 },
  };
}

function makeEvent(matchId: string, sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: matchId,
    sequence,
    timestamp: new Date().toISOString(),
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: { note: 'stress-payload', sequence } as never,
  } as IGameEvent;
}

describe('M2 — Durable store stress + rate-limit budget', () => {
  it('keeps appendEvent latency low across a long match', async () => {
    const fs = await import('node:fs');
    const os = await import('node:os');
    const path = await import('node:path');
    const dbPath = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mp-stress-')),
      'stress.db',
    );
    const store = new DurableMatchStore({ path: dbPath });
    await store.createMatch(makeMeta('stress-match'));

    const APPEND_COUNT = 1000; // a very long fight
    const start = performance.now();
    for (let i = 0; i < APPEND_COUNT; i++) {
      await store.appendEvent('stress-match', makeEvent('stress-match', i));
    }
    const elapsedMs = performance.now() - start;
    const perAppendMs = elapsedMs / APPEND_COUNT;

    // Generous ceiling — an embedded SQLite append is sub-millisecond
    // class; 5ms/append catches a pathological regression (e.g. a
    // missing transaction batching, a full-table scan) without being
    // flaky on a slow CI runner.
    expect(perAppendMs).toBeLessThan(5);

    // The full log round-trips intact and in order.
    const events = await store.getEvents('stress-match');
    expect(events.length).toBe(APPEND_COUNT);
    expect(events[0].sequence).toBe(0);
    expect(events[APPEND_COUNT - 1].sequence).toBe(APPEND_COUNT - 1);

    store.close();
    fs.rmSync(path.dirname(dbPath), { recursive: true, force: true });
  });

  it('the configured rate-limit budget is never tripped by worst-case human play', () => {
    // Worst-case human: a rapid-fire BattleTech player issuing an
    // intent every 200ms (5/sec) sustained for a full 5-minute match.
    // The limiter runs the PRODUCTION-default budget with an injected
    // clock so the refill is deterministic.
    const TOTAL_INTENTS = 1500; // 5/sec * 300s
    let nowMs = 0;
    const limiter = new IntentRateLimiter({ now: () => nowMs });
    let rejected = 0;
    for (let i = 0; i < TOTAL_INTENTS; i++) {
      nowMs += 200;
      if (!limiter.tryConsume('human')) rejected += 1;
    }
    expect(rejected).toBe(0);

    // Sanity: the budget IS finite — a same-instant flood still trips.
    const flood = new IntentRateLimiter({ now: () => 0 });
    let floodRejected = 0;
    for (let i = 0; i < 500; i++) {
      if (!flood.tryConsume('flooder')) floodRejected += 1;
    }
    expect(floodRejected).toBe(500 - INTENT_RATE_LIMIT_CAPACITY);
    // The refill rate is positive so the bucket recovers over time.
    expect(INTENT_RATE_LIMIT_REFILL_PER_SEC).toBeGreaterThan(0);
  });
});
