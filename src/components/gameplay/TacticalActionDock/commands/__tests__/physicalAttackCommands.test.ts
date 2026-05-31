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

  it('exposes core and supported melee weapon physical attacks', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'physical.punch',
      'physical.kick',
      'physical.push',
      'physical.trip',
      'physical.charge',
      'physical.dfa',
      'physical.club',
      'physical.sword',
      'physical.mace',
      'physical.lance',
      'physical.retractable-blade',
      'physical.flail',
      'physical.wrecking-ball',
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

  it('push dispatches physical-attack actionId with attackType=push', () => {
    const push = commands.find((c) => c.id === 'physical.push')!;
    expect(push.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'push' },
    });
  });

  it('trip dispatches physical-attack actionId with attackType=trip', () => {
    const trip = commands.find((c) => c.id === 'physical.trip')!;
    expect(trip.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'trip' },
    });
  });

  it('dfa dispatches physical-attack actionId with attackType=dfa', () => {
    const dfa = commands.find((c) => c.id === 'physical.dfa')!;
    expect(dfa.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'dfa' },
    });
  });

  it('melee weapon commands dispatch their supported physical attack types', () => {
    const commandAttackTypes = Object.fromEntries(
      commands.map((command) => [
        command.id,
        command.commit(makeCtx()).payload?.attackType,
      ]),
    );

    expect(commandAttackTypes).toMatchObject({
      'physical.club': 'hatchet',
      'physical.sword': 'sword',
      'physical.mace': 'mace',
      'physical.lance': 'lance',
      'physical.retractable-blade': 'retractable-blade',
      'physical.flail': 'flail',
      'physical.wrecking-ball': 'wrecking-ball',
    });
  });
});
