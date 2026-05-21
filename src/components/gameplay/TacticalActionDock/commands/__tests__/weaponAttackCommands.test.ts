/**
 * Weapon attack command family — availability + disabled-reason +
 * commit dispatch tests.
 *
 * Verifies the spec's `Disabled command explains invalidity` scenario
 * for the no-target case (weapon commands disabled-with-reason
 * "Select an enemy target first.").
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildWeaponAttackCommands } from '../weaponAttackCommands';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: 'enemy-x',
    hoveredHex: null,
    phase: GamePhase.WeaponAttack,
    canAct: true,
    ...overrides,
  };
}

describe('weaponAttackCommands', () => {
  const commands = buildWeaponAttackCommands();

  it('exposes declare-attack / fire-volley / clear-attacks', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'weapon.declare-attack',
      'weapon.fire-volley',
      'weapon.clear-attacks',
    ]);
  });

  it('every command targets WeaponAttack phase', () => {
    for (const command of commands) {
      expect(command.phaseConstraints).toEqual([GamePhase.WeaponAttack]);
    }
  });

  it('declare-attack is available when target is selected', () => {
    const cmd = commands.find((c) => c.id === 'weapon.declare-attack')!;
    expect(cmd.availability(makeCtx())).toEqual({ available: true });
  });

  it('declare-attack is disabled-with-reason when no target is selected', () => {
    const cmd = commands.find((c) => c.id === 'weapon.declare-attack')!;
    const result = cmd.availability(makeCtx({ targetUnitId: null }));
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toMatch(/target/i);
    }
  });

  it('fire-volley requires confirmation for irreversible commit', () => {
    const cmd = commands.find((c) => c.id === 'weapon.fire-volley')!;
    expect(cmd.requiresConfirmation).toBe(true);
    expect(cmd.undoable).toBe(false);
  });

  it('all weapon commands target enemies', () => {
    const declare = commands.find((c) => c.id === 'weapon.declare-attack')!;
    const volley = commands.find((c) => c.id === 'weapon.fire-volley')!;
    expect(declare.targetsEnemy).toBe(true);
    expect(volley.targetsEnemy).toBe(true);
  });

  it('clear-attacks is available without a target', () => {
    const cmd = commands.find((c) => c.id === 'weapon.clear-attacks')!;
    expect(cmd.availability(makeCtx({ targetUnitId: null }))).toEqual({
      available: true,
    });
  });
});
