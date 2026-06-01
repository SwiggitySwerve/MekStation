import { applyPilotDamage, type IUnitDamageState } from '../index';

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
});
