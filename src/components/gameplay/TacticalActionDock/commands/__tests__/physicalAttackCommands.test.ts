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

  it('exposes core and supported melee weapon physical attacks', () => {
    const ids = commands.map((c) => c.id);
    expect(ids).toEqual([
      'physical.punch',
      'physical.kick',
      'physical.push',
      'physical.trip',
      'physical.thrash',
      'physical.jump-jet-attack',
      'physical.brush-off',
      'physical.grapple',
      'physical.break-grapple',
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

  it('thrash dispatches physical-attack actionId with attackType=thrash', () => {
    const thrash = commands.find((c) => c.id === 'physical.thrash')!;
    expect(thrash.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'thrash' },
    });
  });

  it('jump jet attack dispatches right-leg physical-attack intent', () => {
    const jumpJetAttack = commands.find(
      (c) => c.id === 'physical.jump-jet-attack',
    )!;
    expect(jumpJetAttack.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'jump-jet-attack', limb: 'rightLeg' },
    });
  });

  it('brush off dispatches right-arm physical-attack intent', () => {
    const brushOff = commands.find((c) => c.id === 'physical.brush-off')!;
    expect(brushOff.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'brush-off', limb: 'rightArm' },
    });
  });

  it('grapple dispatches physical-attack actionId with attackType=grapple', () => {
    const grapple = commands.find((c) => c.id === 'physical.grapple')!;
    expect(grapple.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'grapple' },
    });
  });

  it('break grapple dispatches physical-attack actionId with attackType=break-grapple', () => {
    const breakGrapple = commands.find(
      (c) => c.id === 'physical.break-grapple',
    )!;
    expect(breakGrapple.commit(makeCtx())).toEqual({
      actionId: 'physical-attack',
      payload: { attackType: 'break-grapple' },
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
