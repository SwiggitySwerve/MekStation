import type {
  IAttackerState,
  ITargetState,
  IToHitCalculation,
} from '@/types/gameplay';

import { RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT } from '@/simulation/runner/CombatRuleSupport';
import { MovementType, RangeBracket } from '@/types/gameplay';
import {
  type ITerrainFeature,
  TerrainType,
} from '@/types/gameplay/TerrainTypes';

import type { IWeaponRangeProfile } from '../../range';

import {
  calculateToHit,
  calculateToHitWithC3,
  getTerrainToHitModifier,
} from '..';
import {
  addC3Network,
  createC3MasterSlaveNetwork,
  createC3Unit,
  createEmptyC3State,
} from '../../c3Network';

const INTEGRATED_TO_HIT_MODIFIERS = [
  'actuator-damage',
  'attacker-prone',
  'c3',
  'called-shot',
  'ecm',
  'hull-down',
  'pilot-wounds',
  'sensor-damage',
  'secondary-target',
  'target-evasion',
  'terrain-features',
] as const;

const HELPER_ONLY_TO_HIT_MODIFIERS = [
  'c3-equipment-network-formation',
] as const;

type HelperOnlyToHitModifierId = (typeof HELPER_ONLY_TO_HIT_MODIFIERS)[number];
type IntegratedToHitModifierId = (typeof INTEGRATED_TO_HIT_MODIFIERS)[number];
type AdvancedToHitModifierId =
  | HelperOnlyToHitModifierId
  | IntegratedToHitModifierId;

function makeAttacker(overrides: Partial<IAttackerState> = {}): IAttackerState {
  return {
    gunnery: 4,
    movementType: MovementType.Stationary,
    heat: 0,
    damageModifiers: [],
    ...overrides,
  };
}

function makeTarget(overrides: Partial<ITargetState> = {}): ITargetState {
  return {
    movementType: MovementType.Stationary,
    hexesMoved: 0,
    prone: false,
    immobile: false,
    partialCover: false,
    ...overrides,
  };
}

function shortRangeBaseline(): IToHitCalculation {
  return calculateToHit(makeAttacker(), makeTarget(), RangeBracket.Short, 3);
}

function modifierNames(result: IToHitCalculation): readonly string[] {
  return result.modifiers.map((modifier) => modifier.name);
}

describe('BattleMech to-hit support matrix modifiers', () => {
  it.each(INTEGRATED_TO_HIT_MODIFIERS)(
    '%s is tracked as runner-integrated',
    (id) => {
      const support = RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[id];

      expect(support.level).toBe('integrated');
      expect(support.evidence).toEqual(expect.any(String));
      expect('gap' in support).toBe(false);
    },
  );

  it.each(HELPER_ONLY_TO_HIT_MODIFIERS)(
    '%s is explicitly tracked as helper-only instead of runner-integrated',
    (id) => {
      const support = RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[id];

      expect(support.level).toBe('helper-only');
      expect(support.evidence).toEqual(expect.any(String));
      expect(support.gap).toEqual(expect.any(String));
    },
  );

  const fullToHitCases: ReadonlyArray<{
    readonly id: Exclude<
      AdvancedToHitModifierId,
      'c3' | 'ecm' | 'terrain-features'
    >;
    readonly expectedDelta: number;
    readonly expectedModifierName: string;
    readonly calculate: () => IToHitCalculation;
  }> = [
    {
      id: 'actuator-damage',
      expectedDelta: 6,
      expectedModifierName: 'Actuator Damage',
      calculate: () =>
        calculateToHit(
          makeAttacker({
            actuatorDamage: {
              shoulderDestroyed: true,
              upperArmDestroyed: true,
              lowerArmDestroyed: true,
            },
          }),
          makeTarget(),
          RangeBracket.Short,
          3,
        ),
    },
    {
      id: 'attacker-prone',
      expectedDelta: 2,
      expectedModifierName: 'Attacker Prone',
      calculate: () =>
        calculateToHit(
          makeAttacker({ prone: true }),
          makeTarget(),
          RangeBracket.Short,
          3,
        ),
    },
    {
      id: 'called-shot',
      expectedDelta: 3,
      expectedModifierName: 'Called Shot',
      calculate: () =>
        calculateToHit(
          makeAttacker({ calledShot: true }),
          makeTarget(),
          RangeBracket.Short,
          3,
        ),
    },
    {
      id: 'hull-down',
      expectedDelta: 2,
      expectedModifierName: 'Hull-Down',
      calculate: () =>
        calculateToHit(
          makeAttacker(),
          makeTarget({ hullDown: true }),
          RangeBracket.Short,
          3,
        ),
    },
    {
      id: 'pilot-wounds',
      expectedDelta: 2,
      expectedModifierName: 'Pilot Wounds',
      calculate: () =>
        calculateToHit(
          makeAttacker({ pilotWounds: 2 }),
          makeTarget(),
          RangeBracket.Short,
          3,
        ),
    },
    {
      id: 'secondary-target',
      expectedDelta: 2,
      expectedModifierName: 'Secondary Target',
      calculate: () =>
        calculateToHit(
          makeAttacker({
            secondaryTarget: { isSecondary: true, inFrontArc: false },
          }),
          makeTarget(),
          RangeBracket.Short,
          3,
        ),
    },
    {
      id: 'target-evasion',
      expectedDelta: 1,
      expectedModifierName: 'Target Evasion',
      calculate: () =>
        calculateToHit(
          makeAttacker(),
          makeTarget({ isEvading: true }),
          RangeBracket.Short,
          3,
        ),
    },
    {
      id: 'sensor-damage',
      expectedDelta: 2,
      expectedModifierName: 'Sensor Damage',
      calculate: () =>
        calculateToHit(
          makeAttacker({ sensorHits: 2 }),
          makeTarget(),
          RangeBracket.Short,
          3,
        ),
    },
  ];

  it.each(fullToHitCases)(
    'applies advanced modifier math for $id through calculateToHit',
    ({ calculate, expectedDelta, expectedModifierName }) => {
      const baseline = shortRangeBaseline();
      const result = calculate();

      expect(result.finalToHit - baseline.finalToHit).toBe(expectedDelta);
      expect(modifierNames(result)).toContain(expectedModifierName);
    },
  );

  it('keeps ECM integrated as guidance suppression instead of additive calculateToHit math', () => {
    const result = shortRangeBaseline();
    const ecmSupport = RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.ecm;

    expect(result.finalToHit).toBe(4);
    expect(modifierNames(result)).not.toEqual(
      expect.arrayContaining([expect.stringContaining('ECM')]),
    );
    expect(ecmSupport.level).toBe('integrated');
    expect(ecmSupport.evidence).toContain('suppresses');
    expect(ecmSupport.evidence).toContain('generic ECM to-hit penalty');
    expect('gap' in ecmSupport).toBe(false);
  });

  it('applies C3 by replacing the attacker range bracket with the best network bracket', () => {
    const mediumLaser: IWeaponRangeProfile = {
      short: 3,
      medium: 6,
      long: 9,
    };
    const network = createC3MasterSlaveNetwork('network-1', [
      createC3Unit({
        entityId: 'attacker',
        teamId: 'player',
        role: 'master',
        position: { q: 8, r: 0 },
      }),
      createC3Unit({
        entityId: 'spotter',
        teamId: 'player',
        role: 'slave',
        position: { q: 2, r: 0 },
      }),
    ]);

    expect(network).not.toBeNull();

    const c3State = addC3Network(createEmptyC3State(), network!);
    const baseline = calculateToHit(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Long,
      8,
    );
    const result = calculateToHitWithC3(
      makeAttacker(),
      makeTarget(),
      RangeBracket.Long,
      8,
      {
        attackerEntityId: 'attacker',
        targetPosition: { q: 0, r: 0 },
        weaponRangeProfile: mediumLaser,
        c3State,
      },
    );

    expect(result.c3Result.benefitApplied).toBe(true);
    expect(result.c3Result.bestBracket).toBe(RangeBracket.Short);
    expect(result.finalToHit).toBe(baseline.finalToHit - 4);
    expect(modifierNames(result)).toContain('C3 Network');
  });

  it('keeps ambiguous C3 network assignment edges as explicit gaps', () => {
    expect(
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-network-formation']
        .gap,
    ).toContain('multiple same-side C3 networks');
    expect(Object.keys(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT)).not.toContain(
      'c3-spotter-los-hydration',
    );
  });

  it('keeps terrain feature to-hit helper math covered by runner integration', () => {
    const targetTerrain: readonly ITerrainFeature[] = [
      { type: TerrainType.LightWoods, level: 1 },
      { type: TerrainType.HeavyWoods, level: 1 },
    ];
    const interveningTerrain: ITerrainFeature[][] = [
      [{ type: TerrainType.Smoke, level: 1 }],
      [{ type: TerrainType.Building, level: 1 }],
    ];

    expect(getTerrainToHitModifier(targetTerrain, interveningTerrain)).toBe(4);
  });
});
