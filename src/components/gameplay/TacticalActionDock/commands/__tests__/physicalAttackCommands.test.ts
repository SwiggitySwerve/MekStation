/**
 * Physical attack command family — availability + commit dispatch
 * tests.
 *
 * @spec openspec/changes/add-tactical-action-menu-system/specs/tactical-map-interface/spec.md
 */

import type { IPhysicalAttackOption } from '@/utils/gameplay/physicalAttacks/types';

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

function makePhysicalOption(
  overrides: Partial<IPhysicalAttackOption> = {},
): IPhysicalAttackOption {
  return {
    attackType: 'punch',
    limb: 'rightArm',
    toHit: {
      baseToHit: 4,
      finalToHit: 6,
      modifiers: [],
      allowed: true,
    },
    damage: {
      targetDamage: 7,
      attackerDamage: 0,
      attackerLegDamagePerLeg: 0,
      targetPSR: false,
      attackerPSR: false,
      attackerPSRModifier: 0,
      hitTable: 'punch',
      targetDisplaced: false,
    },
    selfRisk: {
      damageToAttacker: 0,
      legDamagePerLeg: 0,
      pilotingSkillRoll: null,
      onMiss: null,
    },
    restrictionsFailed: [],
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

  it('punch is disabled with the shared physical projection restriction', () => {
    const punch = commands.find((c) => c.id === 'physical.punch')!;
    const result = punch.availability(
      makeCtx({
        targetPhysicalAttackOption: makePhysicalOption({
          toHit: {
            baseToHit: 4,
            finalToHit: Number.POSITIVE_INFINITY,
            modifiers: [],
            allowed: false,
            restrictionReasonCode: 'WeaponFiredThisTurn',
          },
          restrictionsFailed: ['WeaponFiredThisTurn'],
        }),
      }),
    );

    expect(result).toEqual({
      available: false,
      reason: 'Arm fired a weapon this turn',
    });
  });

  it('leaves other physical commands available when the projection is for a different attack type', () => {
    const kick = commands.find((c) => c.id === 'physical.kick')!;
    const result = kick.availability(
      makeCtx({
        targetPhysicalAttackOption: makePhysicalOption({
          attackType: 'punch',
          toHit: {
            baseToHit: 4,
            finalToHit: Number.POSITIVE_INFINITY,
            modifiers: [],
            allowed: false,
            restrictionReasonCode: 'WeaponFiredThisTurn',
          },
          restrictionsFailed: ['WeaponFiredThisTurn'],
        }),
      }),
    );

    expect(result).toEqual({ available: true });
  });

  it('club is disabled by matching melee-weapon projection restrictions', () => {
    const club = commands.find((c) => c.id === 'physical.club')!;
    const result = club.availability(
      makeCtx({
        targetPhysicalAttackOption: makePhysicalOption({
          attackType: 'sword',
          toHit: {
            baseToHit: 5,
            finalToHit: Number.POSITIVE_INFINITY,
            modifiers: [],
            allowed: false,
            restrictionReasonCode: 'MissingActuator',
          },
          restrictionsFailed: ['MissingActuator'],
        }),
      }),
    );

    expect(result).toEqual({
      available: false,
      reason: 'Required actuator is missing',
    });
  });

  it('charge is disabled by target physical option collections', () => {
    const charge = commands.find((c) => c.id === 'physical.charge')!;
    const result = charge.availability(
      makeCtx({
        targetPhysicalAttackOptions: [
          makePhysicalOption({
            attackType: 'charge',
            toHit: {
              baseToHit: 5,
              finalToHit: Number.POSITIVE_INFINITY,
              modifiers: [],
              allowed: false,
              restrictionReasonCode: 'NoRunThisTurn',
            },
            restrictionsFailed: ['NoRunThisTurn'],
          }),
        ],
      }),
    );

    expect(result).toEqual({
      available: false,
      reason: 'Charge requires running this turn',
    });
  });

  it('keeps punch available when any projected limb option is legal', () => {
    const punch = commands.find((c) => c.id === 'physical.punch')!;
    const result = punch.availability(
      makeCtx({
        targetPhysicalAttackOptions: [
          makePhysicalOption({
            limb: 'leftArm',
            toHit: {
              baseToHit: 4,
              finalToHit: Number.POSITIVE_INFINITY,
              modifiers: [],
              allowed: false,
              restrictionReasonCode: 'WeaponFiredThisTurn',
            },
            restrictionsFailed: ['WeaponFiredThisTurn'],
          }),
          makePhysicalOption({ limb: 'rightArm' }),
        ],
      }),
    );

    expect(result).toEqual({ available: true });
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
