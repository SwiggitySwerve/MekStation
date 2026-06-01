/**
 * Facing command family tests.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildFacingCommands } from '../facingCommands';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: null,
    hoveredHex: null,
    phase: GamePhase.Movement,
    canAct: true,
    ...overrides,
  };
}

describe('facingCommands', () => {
  const commands = buildFacingCommands();

  it('exposes rotate-left / rotate-right / torso-twist', () => {
    expect(commands.map((c) => c.id)).toEqual([
      'facing.rotate-left',
      'facing.rotate-right',
      'facing.torso-twist',
    ]);
  });

  it('rotate-left applies in Movement phase', () => {
    const cmd = commands.find((c) => c.id === 'facing.rotate-left')!;
    expect(cmd.phaseConstraints).toContain(GamePhase.Movement);
  });

  it('torso-twist applies in WeaponAttack phase (not Movement)', () => {
    const cmd = commands.find((c) => c.id === 'facing.torso-twist')!;
    expect(cmd.phaseConstraints).toEqual([GamePhase.WeaponAttack]);
  });

  it('rotate-left disabled-with-reason when no unit is active', () => {
    const cmd = commands.find((c) => c.id === 'facing.rotate-left')!;
    const result = cmd.availability(makeCtx({ activeUnitId: null }));
    expect(result.available).toBe(false);
  });

  it('rotate-right commit dispatches facing-right actionId', () => {
    const cmd = commands.find((c) => c.id === 'facing.rotate-right')!;
    expect(cmd.commit(makeCtx()).actionId).toBe('facing-right');
  });

  it('rotate-left commit dispatches facing-left actionId', () => {
    const cmd = commands.find((c) => c.id === 'facing.rotate-left')!;
    expect(cmd.commit(makeCtx()).actionId).toBe('facing-left');
  });

  it('torso-twist commit carries a source-backed direction payload', () => {
    const cmd = commands.find((c) => c.id === 'facing.torso-twist')!;
    expect(cmd.commit(makeCtx({ phase: GamePhase.WeaponAttack }))).toEqual({
      actionId: 'torso-twist',
      payload: { direction: 'left' },
    });
  });
});
