import { GamePhase, GameSide } from '@/types/gameplay/GameSessionCoreTypes';
import type { GmReplayCorrectionEffect } from '@/types/interventions/GmReplayCorrection';
import { createInitialGameState, createInitialUnitState, applyEvent } from '@/utils/gameplay/gameState';
import { createGmCorrectionAppliedEvent } from '@/utils/gameplay/gameEvents/gmCorrection';

import { applyGmReplayCorrectionEffects } from '../GmReplayCorrectionProjection';

function state() {
  const unit = createInitialUnitState({ id: 'player', name: 'Player', side: GameSide.Player, unitRef: 'unit', pilotRef: 'pilot', gunnery: 4, piloting: 5 }, { q: 0, r: 0 });
  return { ...createInitialGameState('game'), units: { player: unit } };
}

describe('resolved GM correction event fold', () => {
  it('uses the intervention owner without triggering threshold consequences', () => {
    const before = state();
    const effects: GmReplayCorrectionEffect[] = [
      { family: 'heat-ammo', unitId: 'player', after: { heat: 31 } },
      { family: 'damage-critical', unitId: 'player', after: { structure: { ...before.units.player.structure, center_torso: 0 } } },
    ];
    const event = createGmCorrectionAppliedEvent('game', 2, 1, GamePhase.Initiative, effects);
    const after = applyEvent(before, event);
    expect(after).toStrictEqual(applyGmReplayCorrectionEffects(before, effects));
    expect(after.units.player.heat).toBe(31);
    expect(after.units.player.destroyed).toBe(false);
    expect(after.units.player.shutdown).toBe(before.units.player.shutdown);
    expect(after.units.player.pendingPSRs).toStrictEqual(before.units.player.pendingPSRs);
    expect(before.units.player.heat).toBe(0);
  });

  it('deletes only explicitly cleared optional own keys across JSON replay', () => {
    const before = state();
    const withOptional = { ...before, units: { player: { ...before.units.player, shutdown: true } } };
    const event = createGmCorrectionAppliedEvent('game', 2, 1, GamePhase.Initiative, [
      { family: 'lifecycle', unitId: 'player', after: { destroyed: false }, clear: ['shutdown'] },
    ]);
    const after = applyEvent(withOptional, JSON.parse(JSON.stringify(event)) as typeof event);
    expect(Object.hasOwn(after.units.player, 'shutdown')).toBe(false);
    expect(Object.hasOwn(after.units.player, 'rescued')).toBe(false);
    expect(withOptional.units.player.shutdown).toBe(true);
  });

  it('applies order and objective values without running phase work', () => {
    const before = state();
    const after = applyGmReplayCorrectionEffects(before, [
      { family: 'turn-order', after: { phase: GamePhase.Heat, firstMover: GameSide.Opponent } },
      { family: 'objective-state', objectiveId: 'objective', after: { id: 'objective', hexKey: '1,2', objectiveType: 'capture', owningSide: 'neutral', controlSide: 'player', controlRule: 'sole-occupancy', holdTurnsRequired: 3, holdProgress: 2 } },
    ]);
    expect(after.phase).toBe(GamePhase.Heat);
    expect(after.units).toBe(before.units);
    expect(after.turnEvents).toBe(before.turnEvents);
    expect(after.objectives?.['1,2'].holdProgress).toBe(2);
  });

  it('refuses a missing unit atomically', () => {
    const before = state();
    expect(() => applyGmReplayCorrectionEffects(before, [
      { family: 'heat-ammo', unitId: 'player', after: { heat: 17 } },
      { family: 'heat-ammo', unitId: 'missing', after: { heat: 5 } },
    ])).toThrow('gm-correction-unknown-unit');
    expect(before.units.player.heat).toBe(0);
  });
});
