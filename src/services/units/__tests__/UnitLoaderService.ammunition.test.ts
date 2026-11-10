import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  getMovementProfile,
  buildBattleMechPreviewProjection,
} from '@/components/customizer/preview/recordSheetPreview.logic';
import { buildEditableMech } from '@/components/customizer/tabs/PreviewTab.builders';
import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getCalculationService } from '@/services/construction/CalculationService';
import {
  buildEditableMechBVInput,
  projectEditableMech,
} from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { resetCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { unitLoaderService } from '@/services/units/unitLoaderService';
import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import { MissingAmmunitionRule } from '@/services/validation/rules/equipment/MissingAmmunitionRule';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { Era, RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';
import { getTotalEquipmentSlots } from '@/types/equipment/MountedEquipment';
import { MechConfiguration, UnitType } from '@/types/unit/BattleMechInterfaces';
import { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';
import { calculateUnitBV } from '@/utils/construction/mechBV/calculator';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';

import type { UnitData } from '../../../utils/construction/mechBV/types';

import { parseUnit } from '../unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '../unitLoaderService/unitLoader';

jest.mock('../../equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

const loadDefinition = (
  file = '3-succession-wars/standard/Atlas AS7-D (Danielle).json',
) =>
  parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), `public/data/units/battlemechs/${file}`),
        'utf8',
      ),
    ),
  );

beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
  initializeUnitValidationRules();
});

it('loads Danielle at 100 tons with four placed bins and no missing-ammunition warning', () => {
  const state = new UnitLoaderService().mapToUnitState(loadDefinition(), true);
  const ammo = state.equipment.filter(
    (item) => item.category === EquipmentCategory.AMMUNITION,
  );
  expect(ammo.map((bin) => bin.equipmentId).sort()).toEqual([
    'ac-20-ammo',
    'ac-20-ammo',
    'ammo-lrm-20',
    'ammo-lrm-20',
  ]);
  expect(ammo.every((bin) => bin.weight === 1 && bin.slots?.length === 1)).toBe(
    true,
  );
  const { result } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    ),
  );
  expect(
    result.current.totalStructuralWeight +
      getEquipmentPayloadWeight(state.equipment),
  ).toBe(100);
  expect(state.equipment).toHaveLength(22);
  expect(
    result.current.totalSystemSlots + getTotalEquipmentSlots(state.equipment),
  ).toBe(66);
  const withoutAmmo = {
    ...state,
    equipment: state.equipment.filter(
      (item) => item.category !== EquipmentCategory.AMMUNITION,
    ),
  };
  expect(
    result.current.totalStructuralWeight +
      getEquipmentPayloadWeight(withoutAmmo.equipment),
  ).toBe(96);
  const bv = (unit: typeof state) =>
    getCalculationService().calculateBattleValue(
      projectEditableMech(unit, result.current.walkMP, 'editor'),
    );
  expect(bv(withoutAmmo)).toBe(1958);
  // The shared BV owner includes the four unprotected explosive bins.
  expect(bv(state)).toBe(1976);
  const validationInput: IValidatableUnit = {
    id: state.id,
    name: 'Atlas AS7-D (Danielle)',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3028,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 100,
    cost: 0,
    battleValue: 0,
    mountedEquipment: state.equipment,
    equipmentCatalog: getEquipmentLookupService().getAllEquipment(),
  };
  const resultValidation = validateUnit(validationInput);
  expect(
    resultValidation.results.find(
      (result) => result.ruleId === MissingAmmunitionRule.id,
    )?.warnings,
  ).toEqual([]);
  expect(
    validateUnit({
      ...validationInput,
      mountedEquipment: withoutAmmo.equipment,
    }).results.find((result) => result.ruleId === MissingAmmunitionRule.id)
      ?.warnings,
  ).toHaveLength(2);
});

it('preserves all five ammo bins on the canonical 2755 Atlas', () => {
  const state = new UnitLoaderService().mapToUnitState(
    loadDefinition('2-star-league/standard/Atlas AS7-D.json'),
    true,
  );
  expect(state.year).toBe(2755);
  expect(
    state.equipment
      .filter((item) => item.category === EquipmentCategory.AMMUNITION)
      .map((bin) => bin.equipmentId)
      .sort(),
  ).toEqual([
    'ac-20-ammo',
    'ac-20-ammo',
    'ammo-lrm-20',
    'ammo-lrm-20',
    'ammo-srm-6',
  ]);
});

it.each([false, true])(
  'does not duplicate serialized ammunition (explicit slots: %s)',
  (explicitSlots) => {
    const loader = new UnitLoaderService();
    const unit = loadDefinition();
    const first = loader.mapToUnitState(unit, true);
    // Independent serialized evidence: the dedupe test must still fail if
    // critical-slot recovery stops working altogether.
    const bins = [
      { id: 'ac-20-ammo', location: 'RIGHT_TORSO', slots: [10] },
      { id: 'ac-20-ammo', location: 'RIGHT_TORSO', slots: [11] },
      { id: 'ammo-lrm-20', location: 'LEFT_TORSO', slots: [6] },
      { id: 'ammo-lrm-20', location: 'LEFT_TORSO', slots: [7] },
    ];
    const reloaded = loader.mapToUnitState(
      {
        ...unit,
        equipment: [
          ...(unit.equipment ?? []),
          ...bins.map((bin) => ({
            id: bin.id,
            location: bin.location,
            ...(explicitSlots ? { slots: bin.slots } : {}),
          })),
        ],
      },
      true,
    );
    expect(reloaded.equipment).toHaveLength(first.equipment.length);
    expect(
      reloaded.equipment.filter(
        (item) => item.category === EquipmentCategory.AMMUNITION,
      ),
    ).toHaveLength(4);
  },
);

it.each([
  ['ISRotaryAC5 Ammo', 'rotaryac5', 1],
  ['ISHeavyGauss Ammo', 'heavy-gauss-ammo', 1],
  ['ISGauss Ammo', 'gauss-ammo', 1],
  ['ISLRM5 Ammo', 'ammo-lrm-5', 1],
  ['ISSRM6 Ammo', 'ammo-srm-6', 1],
  ['CLRotaryAC5 Ammo (omnipod)', 'rotaryac5', 1],
  ['CLAMS Ammo (OMNIPOD)', 'clan-ams-ammo', 1],
  ['ISLRM15 Ammo Artemis-capable', 'ammo-lrm-15', 1],
  ['CLLRM15 Ammo (Clan) Artemis-capable', 'ammo-lrm-15', 1],
  ['CLLRM15 Ammo (Clan) Artemis V-capable (OMNIPOD)', 'ammo-lrm-15', 1],
  ['ISSRM6 Ammo Narc-capable', 'ammo-srm-6', 1],
  ['ISLBXAC10 Ammo', 'lb-10-x-ammo', 1],
  ['ISLBXAC10 CL Ammo', 'lb-10-x-cluster-ammo', 1],
  ['CLAPGaussRifle Ammo (omnipod)', 'apgaussrifle', 1],
  ['IS Machine Gun Ammo - Half (omnipod)', 'mg-ammo-half', 0.5],
  ['CLMG Ammo (100)', 'mg-ammo-half', 0.5],
  ['ISMG Ammo (200)', 'mg-ammo', 1],
  ['IS Ammo LRTorpedo-15 Artemis-capable (omnipod)', 'ammo-lrtorpedo-15', 1],
] as const)('recovers %s as %s', (token, id, weight) => {
  const unit = loadDefinition();
  const state = new UnitLoaderService().mapToUnitState(
    { ...unit, criticalSlots: { RIGHT_TORSO: [token] } },
    true,
  );
  expect(
    state.equipment.filter(
      (item) => item.category === EquipmentCategory.AMMUNITION,
    ),
  ).toEqual([expect.objectContaining({ equipmentId: id, weight, slots: [0] })]);
});

it.each([
  'ISFluidGun Ammo',
  'ISAC20 Ammo Unknown-capable',
  'ISAC20 Ammo Half',
  'ISAC20 Ammo Inferno',
])('does not silently substitute standard/full ammunition for %s', (token) => {
  expect(getEquipmentRegistry().lookup(token).found).toBe(false);
});

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { list: async () => [], getById: jest.fn() },
}));

describe('BattleMech BV source parity', () => {
  beforeAll(() => {
    global.fetch = jest.fn(async (input: string) => {
      const file = join(
        'public',
        decodeURIComponent(new URL(input, 'http://localhost').pathname),
      );
      return {
        ok: true,
        json: async () => JSON.parse(readFileSync(file, 'utf8')),
      };
    }) as jest.Mock;
    resetCanonicalUnitService();
  });

  const service = getCalculationService();
  async function load(id: string) {
    const loaded = await unitLoaderService.loadUnit(
      id,
      'canonical',
      'battlemechs',
    );
    if (!loaded.success || !loaded.state) throw new Error(loaded.error);
    return loaded.state;
  }
  const bv = (state: Awaited<ReturnType<typeof load>>) => {
    const { walkMP } = getMovementProfile(state.engineRating, state.tonnage);
    return service.calculateBattleValue(buildEditableMech(state, walkMP));
  };

  // Totals from pinned MegaMek 48fcb2f6, UL-16b full.jsonl (4/5 pilot, ignore C3).
  it.each([
    ['atlas-as7-d', 1897],
    ['locust-lct-1v', 432],
    ['scorpion-scp-1n', 1019],
    ['axman-axm-1n', 1374], // CASE, explosive AC/20 ammo, and hatchet
    ['catapult-cplt-c1b', 1570], // Standard engine, CASE protects torso ammo
    ['champion-chp-1n2', 1233], // LB-X mount and recovered ammo/sinks
    ['raven-rvn-3l', 708], // ECM and active probe
  ])('%s editor BV agrees with Java', async (id, expected) => {
    expect(bv(await load(id))).toBe(expected);
  });

  it.each([
    ['dragonfly-f', 1689],
    ['vulcan-vt-6c', 959],
    ['men-shen-ms1-oe', 1625],
    ['urbanmech-um-r60b', 598],
    ['sun-spider-d', 2096],
  ])(
    '%s full-bin ammo retains Java BV in gate and editor',
    async (id, expected) => {
      const state = await load(id);
      const raw: UnitData = JSON.parse(JSON.stringify(state.bvContext?.source));
      expect(calculateUnitBV(raw, id).bv).toBe(expected);
      expect(bv(state)).toBe(expected);
    },
  );

  it.each([
    ['5-civil-war/advanced/Balius A.json', 27],
    ['6-dark-age/experimental/Arion Unknown.json', 5],
    ['5-civil-war/advanced/Balius A.json', 0],
  ])('retains legacy Biped quad limbs from %s (%s armor)', (file, limb) => {
    const original = loadDefinition(file);
    const source = {
      ...original,
      configuration: MechConfiguration.BIPED,
      armor: {
        type: original.armor?.type ?? 'STANDARD',
        allocation: {
          ...original.armor?.allocation,
          FLL: limb,
          FRL: limb,
          RLL: limb,
          RRL: limb,
        },
      },
    };
    const state = new UnitLoaderService().mapToUnitState(source, true);
    const liveLimb = limb ? limb + 1 : 0;
    state.armorAllocation[MechLocation.FRONT_LEFT_LEG] = liveLimb;
    const raw: UnitData = JSON.parse(JSON.stringify(source));
    raw.armor.allocation.FLL = liveLimb;
    const { walkMP } = getMovementProfile(state.engineRating, state.tonnage);
    const projected = buildEditableMechBVInput(
      buildEditableMech(state, walkMP),
    );
    expect(projected.armor.allocation).toMatchObject({
      FRONT_LEFT_LEG: liveLimb,
      FRONT_RIGHT_LEG: limb,
      REAR_LEFT_LEG: limb,
      REAR_RIGHT_LEG: limb,
    });
    expect(bv(state)).toBe(calculateUnitBV(raw, raw.id).bv);
  });

  it('an explicit live configuration change overrides source quad topology', async () => {
    const state = {
      ...(await load('balius-a')),
      configuration: MechConfiguration.BIPED,
    };
    const { walkMP } = getMovementProfile(state.engineRating, state.tonnage);
    const projected = buildEditableMechBVInput(
      buildEditableMech(state, walkMP),
    );
    expect(projected.armor.allocation).toHaveProperty('LEFT_ARM');
    expect(projected.armor.allocation).not.toHaveProperty('FRONT_LEFT_LEG');
  });
  it('retains third-leg armor for legacy tripods labeled Biped', async () => {
    const state = await load('ares-ars-v1c-aphrodite');
    const raw: UnitData = JSON.parse(JSON.stringify(state.bvContext?.source));
    expect(bv(state)).toBe(calculateUnitBV(raw, raw.id).bv);
  });

  it.each([
    'commando-com-1a',
    'commando-com-1ak',
    'wasp-wsp-1',
    'firebee-frb-1e-wam-b',
    'trooper-tp-1r',
    'pathfinder-pff-2',
    'pathfinder-pff-2t',
  ])(
    '%s primitive movement agrees across editor projections and gate',
    async (id) => {
      const state = await load(id);
      const raw: UnitData = JSON.parse(JSON.stringify(state.bvContext?.source));
      const preview = buildBattleMechPreviewProjection(state);
      const { result } = renderHook(() =>
        useUnitCalculations(state.tonnage, state),
      );
      expect(preview.walkMP).toBe(raw.movement.walk);
      expect(result.current.walkMP).toBe(raw.movement.walk);
      expect(preview.battleValue).toBe(calculateUnitBV(raw, id).bv);
      // CalculationService owns the primitive rule; a caller's plain walk MP must not matter.
      const plainWalk = Math.floor(state.engineRating / state.tonnage);
      expect(
        service.calculateBattleValue(buildEditableMech(state, plainWalk)),
      ).toBe(calculateUnitBV(raw, id).bv);
    },
  );

  it('rounds primitive effective ratings upward at the editor boundary', async () => {
    const loaded = await load('commando-com-1a');
    const state = { ...loaded, engineRating: 115 };
    expect(buildBattleMechPreviewProjection(state).walkMP).toBe(4);
    const { result } = renderHook(() =>
      useUnitCalculations(state.tonnage, state),
    );
    expect(result.current.walkMP).toBe(4);
  });

  it('LAM offensive speed uses AirMek flank movement', async () => {
    const state = await load('stinger-lam-stg-a10');
    const raw: UnitData = JSON.parse(JSON.stringify(state.bvContext?.source));
    expect(calculateUnitBV(raw, raw.id).breakdown?.speedFactor).toBe(3.44);
  });
  it('LAM defense keeps the airborne TMM bonus through bracket seven', async () => {
    const state = await load('stinger-lam-stg-a10');
    const raw: UnitData = JSON.parse(JSON.stringify(state.bvContext?.source));
    const b = calculateUnitBV(raw, raw.id).breakdown;
    expect(b?.maxTMM).toBe(7);
    expect(b?.defensiveFactor).toBe(1.7);
  });
  it('LAM heat uses rounded AirMek flank MP divided by three', async () => {
    const state = await load('stinger-lam-stg-a10');
    const raw: UnitData = JSON.parse(JSON.stringify(state.bvContext?.source));
    const b = calculateUnitBV(raw, raw.id).breakdown;
    expect(b?.moveHeat).toBe(9);
    expect(b?.heatEfficiency).toBe(11);
  });
  // Pinned Java MekBVCalculator; both aggregates are checked before rounding.
  it.each([
    ['urbanmech-lam-s-um-1xla', 1899, 696.75, 1301.7375],
    ['urbanmech-lam-um-a07', 802, 494.25, 308.07],
    ['phoenix-hawk-lam-mk-i-phx-hk1', 1942, 751.2, 1191],
    ['phoenix-hawk-lam-mk-i-phx-hk1r', 1858, 799.2, 1059],
    ['phoenix-hawk-lam-phx-hk1rb', 1800, 783.2, 1017],
    ['phoenix-hawk-lam-phx-hk2', 1555, 727.2, 828],
    ['phoenix-hawk-lam-phx-hk2m', 1465, 703.2, 762],
    ['pwwka-s-pw-1lam', 1668, 538.05, 1217.76],
    ['screamer-lam-scr-1x-lam', 1475, 742.4, 732.72],
    ['shadow-hawk-lam-shd-x1', 828, 512.2, 316.22],
    ['shadow-hawk-lam-shd-x2', 994, 562.8, 431.55],
    ['stinger-lam-mk-i-stg-a1', 846, 495.55, 350.88],
    ['stinger-lam-stg-a10', 881, 495.55, 385.28],
    ['stinger-lam-stg-a5', 1073, 495.55, 577.92],
    ['waneta-s-wn-1lam', 2198, 694.4, 1619.2],
    ['waneta-s-wn-2lam', 2760, 839.8, 2065.5],
    ['wasp-lam-mk-i-wsp-100', 489, 282.4, 206.4],
    ['wasp-lam-mk-i-wsp-100a', 909, 378.4, 531],
    ['wasp-lam-mk-i-wsp-100b', 876, 540, 336],
    ['wasp-lam-wsp-105', 814, 470.05, 344],
    ['wasp-lam-wsp-105m', 907, 470.05, 436.88],
    ['wasp-lam-wsp-110', 639, 381.2, 258],
    ['yurei-s-yr-1lam', 2106, 704.8, 1512],
  ] as const)(
    '%s LAM agrees with pinned Java',
    async (id, total, defensive, offensive) => {
      const loaded = await load(id);
      const context = loaded.bvContext;
      if (!context) throw new Error('Fixture needs source context');
      const source = {
        ...context.source,
        lamType: id.startsWith('shadow-hawk') ? 'Bimodal' : 'Standard',
      };
      const state = { ...loaded, bvContext: { ...context, source } };
      const raw: UnitData = JSON.parse(JSON.stringify(source));
      const result = calculateUnitBV(raw, id);
      expect(result.breakdown?.defensiveBV).toBeCloseTo(defensive, 7);
      expect(result.breakdown?.offensiveBV).toBeCloseTo(offensive, 7);
      expect(result.bv).toBe(total);
      expect(buildBattleMechPreviewProjection(state).battleValue).toBe(total);
    },
  );

  it.each(['armor', 'weapon', 'ammo', 'CASE'] as const)(
    '%s edits agree with independently edited gate inputs',
    async (change) => {
      const state = await load('atlas-as7-d');
      const raw: UnitData = JSON.parse(JSON.stringify(state.bvContext?.source));
      const crits = raw.criticalSlots;
      if (!crits) throw new Error('Fixture needs critical slots');
      let edited = state;
      if (change === 'armor') {
        edited = {
          ...state,
          armorAllocation: { ...state.armorAllocation, [MechLocation.HEAD]: 0 },
        };
        raw.armor.allocation.HEAD = 0;
      } else if (change === 'weapon' || change === 'ammo') {
        const item = state.equipment.find((eq) =>
          change === 'weapon'
            ? eq.equipmentId === 'medium-laser'
            : eq.category === EquipmentCategory.AMMUNITION,
        );
        if (!item?.location || !item.slots?.length)
          throw new Error('Fixture needs a placed item');
        edited = {
          ...state,
          equipment: state.equipment.filter(
            (eq) => eq.instanceId !== item.instanceId,
          ),
        };
        if (change === 'weapon') raw.equipment.splice(0, 1);
        const loc = item.location.toUpperCase().replace(/ /g, '_');
        for (const slot of item.slots) crits[loc][slot] = null;
      } else {
        const item = {
          ...state.equipment[0],
          instanceId: 'new-case',
          equipmentId: 'case',
          name: 'CASE',
          location: MechLocation.LEFT_TORSO,
          slots: [11],
          criticalSlots: 1,
          isRearMounted: false,
        };
        edited = { ...state, equipment: [...state.equipment, item] };
        crits.LEFT_TORSO[11] = 'CASE';
        raw.equipment.push({ id: 'case', location: 'LEFT_TORSO' });
      }
      const expected = calculateUnitBV(raw, raw.id).bv;
      expect(expected).not.toBe(1897);
      expect(bv(edited)).toBe(expected);
      expect(bv(state)).toBe(1897); // Repeated calculation cannot mutate source context.
    },
  );
});
