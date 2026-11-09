/**
 * Wave 4 C3 PR1 — characterization of `getPhaseActions`. The switch is made
 * exhaustive over `GamePhase` with no behaviour change: Initiative and
 * PhysicalAttack still offer no actions (offering them is the deferred PR4,
 * which changes visible UI).
 */

import { GamePhase } from '@/types/gameplay';

import { getPhaseActions } from '../GameplayUIPanelStateTypes';

const ids = (phase: GamePhase, canUndo = true): string[] =>
  getPhaseActions(phase, canUndo).map((action) => action.id);

describe('getPhaseActions', () => {
  it.each([
    [GamePhase.Initiative, []],
    [GamePhase.Movement, ['lock', 'undo', 'skip']],
    [GamePhase.WeaponAttack, ['lock', 'clear', 'skip']],
    [GamePhase.PhysicalAttack, []],
    [GamePhase.Heat, ['continue']],
    [GamePhase.End, ['next-turn', 'concede']],
  ])('%s offers %j', (phase, expected) => {
    expect(ids(phase)).toEqual(expected);
  });

  it('answers for every GamePhase', () => {
    for (const phase of Object.values(GamePhase)) {
      expect(Array.isArray(getPhaseActions(phase, false))).toBe(true);
    }
  });

  it('disables Undo when there is nothing to undo', () => {
    const undo = getPhaseActions(GamePhase.Movement, false).find(
      (action) => action.id === 'undo',
    );
    expect(undo?.enabled).toBe(false);
  });
});
