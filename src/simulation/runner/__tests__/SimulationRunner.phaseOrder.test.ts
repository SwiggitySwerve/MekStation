/**
 * Wave 4 C3 PR1 — order-drift guard for the standalone runner.
 *
 * The runner emits no `PhaseChanged` (that stays with D-8) and calls its
 * phase functions in code order. Each event it does emit is stamped with a
 * `phase`; this checks that, within a turn, those stamps never run
 * backwards against the shared GamePhase table. It changes no runner
 * output.
 */

import { GamePhase } from '@/types/gameplay';
import { GAME_PHASE_ORDER } from '@/utils/gameplay/gamePhaseTransitions';

import { SimulationRunner } from '../SimulationRunner';
import { makeConfig } from './SimulationRunner.gameCreated.test-helpers';

describe('SimulationRunner phase order', () => {
  it('stamps events in GamePhase table order within every turn', () => {
    const result = new SimulationRunner(42).run(
      makeConfig({ turnLimit: 3, unitCount: { player: 2, opponent: 2 } }),
    );

    const lastIndexByTurn = new Map<number, number>();
    const seenPhases = new Set<GamePhase>();
    for (const event of result.events) {
      if (event.turn === 0) continue; // GameCreated seed event
      const index = GAME_PHASE_ORDER.indexOf(event.phase);
      expect(index).toBeGreaterThanOrEqual(0);
      const last = lastIndexByTurn.get(event.turn) ?? 0;
      expect(index).toBeGreaterThanOrEqual(last);
      lastIndexByTurn.set(event.turn, index);
      seenPhases.add(event.phase);
    }

    // The runner reaches Movement and the closing End stamp.
    expect(seenPhases.has(GamePhase.Movement)).toBe(true);
    expect(seenPhases.has(GamePhase.End)).toBe(true);
  });
});
