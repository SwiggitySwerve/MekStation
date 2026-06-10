/**
 * GameEngine.helpers — toAIUnitState producer contract.
 *
 * Audit 2026-06-09 finding A-9: the reconciliation merge `7f22e4f22`
 * dropped `prone`, `unitType`, and `abilities` from `toAIUnitState`
 * while `BotPlayer` kept consuming them — `BotPlayer.takeTurn` passes
 * `{ pilotAbilities: unit.abilities }` into movement option generation
 * and reads `unit.prone` for the voluntary go-prone gate. These tests
 * lock the producer side of that contract so the AI never silently
 * loses posture/type/SPA visibility again.
 */

import { toAIUnitState } from '@/engine/GameEngine.helpers';
import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import { GameSide } from '@/types/gameplay';

describe('toAIUnitState', () => {
  const position = { q: 0, r: 0 };

  it('propagates prone, unitType, and abilities that BotPlayer consumes', () => {
    // Producer fixture mirrors a hydrated session unit: prone BattleMech
    // with pilot SPAs, exactly the state BotPlayer branches on.
    const unit = {
      ...createMinimalUnitState('unit-1', GameSide.Player, position),
      prone: true,
      unitType: 'BattleMech',
      abilities: ['hot_dog', 'dodge'] as const,
    };

    const aiState = toAIUnitState(unit, [], 4);

    expect(aiState.prone).toBe(true);
    expect(aiState.unitType).toBe('BattleMech');
    expect(aiState.abilities).toEqual(['hot_dog', 'dodge']);
  });

  it('defaults prone to false when the session unit omits posture state', () => {
    // Legacy synthetic fixtures never set `prone`; the AI contract is an
    // explicit boolean so downstream checks never see undefined.
    const unit = {
      ...createMinimalUnitState('unit-2', GameSide.Opponent, position),
      prone: undefined,
    };

    const aiState = toAIUnitState(unit, [], 4);

    expect(aiState.prone).toBe(false);
  });

  it('keeps the retreat latch and identity fields intact alongside the restored fields', () => {
    // Guard the surrounding contract: restoring A-9 fields must not
    // disturb the existing retreat/identity propagation.
    const unit = {
      ...createMinimalUnitState('unit-3', GameSide.Player, position),
      isRetreating: true,
      retreatTargetEdge: 'north' as const,
    };

    const aiState = toAIUnitState(unit, [], 3);

    expect(aiState.unitId).toBe('unit-3');
    expect(aiState.gunnery).toBe(3);
    expect(aiState.isRetreating).toBe(true);
    expect(aiState.retreatTargetEdge).toBe('north');
  });
});
