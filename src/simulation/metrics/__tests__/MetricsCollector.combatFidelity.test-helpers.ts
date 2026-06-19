/**
 * Phase 5 (`add-combat-fidelity-suite` — combat-analytics delta) unit
 * tests for `MetricsCollector.recordGame()` event-log hydration.
 *
 * These tests build synthetic event-log fixtures (no real
 * `SimulationRunner` needed) so the per-event-type aggregation logic
 * can be exercised in isolation. Real Atlas-mirror runs that exercise
 * the runner's event chain live in
 * `src/simulation/__tests__/scenario-mirror-metrics.integration.test.ts`.
 *
 * Spec contract:
 *   `combat-analytics/spec.md` — "MetricsCollector Hydrates From Event Log"
 *     - Atlas-vs-Atlas mirror records non-zero damage
 *     - Game with shutdowns records the count
 */

import { describe, expect, it } from '@jest/globals';

import {
  GameEventType,
  GamePhase,
  IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { ISimulationResult } from '../../core/types';
import { MetricsCollector } from '../MetricsCollector';

// =============================================================================
// Fixture builders
// =============================================================================

/**
 * Minimal event factory — sets the discriminated-union shape required by
 * `IGameEvent` while leaving callers free to override only the
 * fields they care about. Sequence is monotonically increasing across
 * the helper's lifetime so tests don't have to thread a counter.
 */
let nextSequence = 1;
export function makeEvent(
  type: GameEventType,
  payload: unknown,
  overrides: { actorId?: string; turn?: number } = {},
): IGameEvent {
  const seq = nextSequence++;
  return {
    id: `evt-${seq}`,
    gameId: 'p5-test',
    sequence: seq,
    timestamp: '2026-05-06T00:00:00.000Z',
    turn: overrides.turn ?? 1,
    phase: GamePhase.WeaponAttack,
    type,
    actorId: overrides.actorId,
    payload: payload as IGameEvent['payload'],
  };
}

/** Wrap an event list into a minimal `ISimulationResult`. */
export function makeResult(events: readonly IGameEvent[]): ISimulationResult {
  return {
    seed: 42,
    winner: 'player',
    turns: 5,
    durationMs: 1000,
    events,
  };
}

// =============================================================================
// Test suite
// =============================================================================

export { GameEventType, MetricsCollector };
