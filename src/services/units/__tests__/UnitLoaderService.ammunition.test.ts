import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getCalculationService } from '@/services/construction/CalculationService';
import { projectEditableMech } from '@/services/construction/editableMechProjection';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import { MissingAmmunitionRule } from '@/services/validation/rules/equipment/MissingAmmunitionRule';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { Era, RulesLevel, TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';
import { getTotalEquipmentSlots } from '@/types/equipment/MountedEquipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';
import { getEquipmentPayloadWeight } from '@/utils/equipment/equipmentWeightAccounting';

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
  expect(bv(state)).toBe(2048);
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
