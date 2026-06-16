import {
  applyPilotDamage,
  resolvePilotWakeUpCheck,
  type IUnitDamageState,
} from '../index';

const LOCATION_VALUES = {
  head: 0,
  center_torso: 0,
  center_torso_rear: 0,
  left_torso: 0,
  left_torso_rear: 0,
  right_torso: 0,
  right_torso_rear: 0,
  left_arm: 0,
  right_arm: 0,
  left_leg: 0,
  right_leg: 0,
};

const BASE_STATE: IUnitDamageState = {
  armor: LOCATION_VALUES,
  rearArmor: {
    center_torso: 0,
    left_torso: 0,
    right_torso: 0,
  },
  structure: LOCATION_VALUES,
  destroyedLocations: [],
  pilotWounds: 1,
  pilotConscious: true,
  destroyed: false,
};

function scriptedD6(values: readonly number[]) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}

describe('pilot consciousness SPA modifiers', () => {
  it('lowers consciousness target numbers only for source-backed Pain Resistance', () => {
    const withoutAbility = applyPilotDamage(
      BASE_STATE,
      1,
      'head_hit',
      scriptedD6([2, 2]),
    );
    const withPainResistance = applyPilotDamage(
      {
        ...BASE_STATE,
        pilotAbilities: ['pain-resistance'],
      },
      1,
      'head_hit',
      scriptedD6([2, 2]),
    );
    const withIronMan = applyPilotDamage(
      {
        ...BASE_STATE,
        pilotAbilities: ['iron-man'],
      },
      1,
      'head_hit',
      scriptedD6([2, 2]),
    );

    expect(withoutAbility.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 5,
      conscious: false,
    });
    expect(withPainResistance.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 4,
      conscious: true,
    });
    expect(withPainResistance.state.pilotConscious).toBe(true);
    expect(withIronMan.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 5,
      conscious: false,
    });
  });

  it('lowers consciousness target numbers for explicit RPG Toughness state without using legacy ability aliases', () => {
    const withLegacyAliasOnly = applyPilotDamage(
      {
        ...BASE_STATE,
        pilotAbilities: ['toughness'],
      },
      1,
      'head_hit',
      scriptedD6([2, 2]),
    );
    const withNumericToughness = applyPilotDamage(
      {
        ...BASE_STATE,
        pilotToughness: 1,
      },
      1,
      'head_hit',
      scriptedD6([2, 2]),
    );

    expect(withLegacyAliasOnly.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 5,
      conscious: false,
    });
    expect(withNumericToughness.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 4,
      conscious: true,
    });
    expect(withNumericToughness.state.pilotConscious).toBe(true);
  });

  it('spends edge_when_ko to reroll a failed consciousness check', () => {
    const withEdge = applyPilotDamage(
      {
        ...BASE_STATE,
        edgePointsRemaining: 1,
        pilotAbilities: ['edge_when_ko'],
        turn: 7,
        unitId: 'atlas-1',
      },
      1,
      'head_hit',
      scriptedD6([1, 1, 6, 6]),
    );

    expect(withEdge.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 5,
      conscious: true,
      edgeReroll: true,
      edgeSuperseded: true,
      edgeTrigger: 'edge_when_ko',
      edgePointsRemaining: 0,
    });
    expect(withEdge.result.supersededConsciousnessRoll?.total).toBe(2);
    expect(withEdge.result.consciousnessRoll?.total).toBe(12);
    expect(withEdge.state).toMatchObject({
      pilotConscious: true,
      edgePointsRemaining: 0,
    });
  });

  it('does not spend generic Edge without the KO trigger-specific ability', () => {
    const withGenericEdgeOnly = applyPilotDamage(
      {
        ...BASE_STATE,
        edgePointsRemaining: 1,
        pilotAbilities: ['edge'],
        turn: 7,
        unitId: 'atlas-1',
      },
      1,
      'head_hit',
      scriptedD6([1, 1, 6, 6]),
    );

    expect(withGenericEdgeOnly.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 5,
      conscious: false,
    });
    expect(withGenericEdgeOnly.result.edgeReroll).toBeUndefined();
    expect(
      withGenericEdgeOnly.result.supersededConsciousnessRoll,
    ).toBeUndefined();
    expect(withGenericEdgeOnly.state).toMatchObject({
      pilotConscious: false,
      edgePointsRemaining: 1,
    });
  });

  it('does not spend edge_when_ko when the first consciousness roll passes', () => {
    const withUnusedEdge = applyPilotDamage(
      {
        ...BASE_STATE,
        edgePointsRemaining: 1,
        pilotAbilities: ['edge_when_ko'],
        turn: 7,
        unitId: 'atlas-1',
      },
      1,
      'head_hit',
      scriptedD6([6, 6]),
    );

    expect(withUnusedEdge.result).toMatchObject({
      totalWounds: 2,
      consciousnessTarget: 5,
      conscious: true,
    });
    expect(withUnusedEdge.result.edgeReroll).toBeUndefined();
    expect(withUnusedEdge.state.edgePointsRemaining).toBe(1);
  });

  it('applies source-backed Pain Resistance to unconscious pilot wake-up rolls', () => {
    const withoutAbility = resolvePilotWakeUpCheck(
      2,
      false,
      [],
      scriptedD6([2, 2]),
    );
    const withPainResistance = resolvePilotWakeUpCheck(
      2,
      false,
      ['pain-resistance'],
      scriptedD6([2, 2]),
    );

    expect(withoutAbility).toMatchObject({
      wakeUpCheckRequired: true,
      wakeUpTarget: 5,
      conscious: false,
    });
    expect(withPainResistance).toMatchObject({
      wakeUpCheckRequired: true,
      wakeUpTarget: 4,
      conscious: true,
    });
  });

  it('leaves non-Pain-Resistance wake-up target behavior unchanged', () => {
    const withIronMan = resolvePilotWakeUpCheck(
      2,
      false,
      ['iron-man'],
      scriptedD6([2, 2]),
    );
    const alreadyConscious = resolvePilotWakeUpCheck(
      2,
      true,
      ['pain-resistance'],
      scriptedD6([6, 6]),
    );

    expect(withIronMan).toMatchObject({
      wakeUpCheckRequired: true,
      wakeUpTarget: 5,
      conscious: false,
    });
    expect(alreadyConscious).toEqual({ wakeUpCheckRequired: false });
  });
});
