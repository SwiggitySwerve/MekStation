/**
 * Physical attack command family — availability + commit dispatch
 * tests.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import { GamePhase, type ITacticalCommandContext } from '@/types/gameplay';

import { buildPhysicalAttackCommands } from '../physicalAttackCommands';

function makeCtx(
  overrides: Partial<ITacticalCommandContext> = {},
): ITacticalCommandContext {
  return {
    activeUnitId: 'unit-a',
    selectedUnitId: 'unit-a',
    targetUnitId: 'enemy-x',
    hoveredHex: null,
    phase: GamePhase.PhysicalAttack,
    canAct: true,
    ...overrides,
  };
}

describe('physicalAttackCommands', () => {
  const commands = buildPhysicalAttackCommands();

  it('exposes punch / kick / charge / dfa / club', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'physical.punch',
      'physical.kick',
      'physical.charge',
      'physical.dfa',
      'physical.club',
    ]);
  });

  it('every physical command requires confirmation (irreversible)', () => {
    for (const command of commands) {
      expect(command.requiresConfirmation).toBe(true);
      expect(command.undoable).toBe(false);
    }
  });

  it('every physical command targets PhysicalAttack phase', () => {
    for (const command of commands) {
      expect(command.phaseConstraints).toEqual([GamePhase.PhysicalAttack]);
    }
  });

  it('punch is disabled-with-reason when no target is selected', () => {
    const punch = commands.find((c) => c.id === 'physical.punch')!;
    const result = punch.availability(makeCtx({ targetUnitId: null }));
    expect(result.available).toBe(false);
    if (!result.available) {
      expect(result.reason).toMatch(/target/i);
    }
  });

  it('charge dispatches physical-attack actionId with attackType=charge', () => {
    const charge = commands.find((c) => c.id === 'physical.charge')!;
    expect(charge.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'charge' },
    });
  });

  it('dfa dispatches physical-attack actionId with attackType=dfa', () => {
    const dfa = commands.find((c) => c.id === 'physical.dfa')!;
    expect(dfa.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'dfa' },
    });
  });
});
