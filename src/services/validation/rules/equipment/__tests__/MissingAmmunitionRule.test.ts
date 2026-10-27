import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { TechBase, RulesLevel, Era } from '@/types/enums';
import { EquipmentCategory, IEquipmentItem } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ValidationCategory } from '@/types/validation/rules/ValidationRuleInterfaces';
import {
  IValidatableUnit,
  UnitCategory,
  UnitValidationSeverity,
} from '@/types/validation/UnitValidationInterfaces';
import { getFixTabsForCategory } from '@/utils/validation/validationNavigation';

import { MissingAmmunitionRule } from '../MissingAmmunitionRule';

const weapon: IEquipmentItem = {
  id: 'ac-20',
  name: 'AC/20',
  category: EquipmentCategory.BALLISTIC_WEAPON,
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 14,
  criticalSlots: 10,
  costCBills: 300000,
  battleValue: 178,
  introductionYear: 2500,
  ammoPerTon: 5,
};
const ammo: IEquipmentItem = {
  ...weapon,
  id: 'ac-20-ammo',
  name: 'AC/20 Ammo',
  weight: 1,
  category: EquipmentCategory.AMMUNITION,
  compatibleWeaponIds: ['ac-20'],
};

function unit(ids: string[], catalog = [weapon, ammo]): IValidatableUnit {
  return {
    id: 'test',
    name: 'Test',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 3028,
    era: Era.LATE_SUCCESSION_WARS,
    weight: 100,
    cost: 0,
    battleValue: 0,
    heatSinkCount: 10,
    mountedEquipment: ids.map((equipmentId) => ({ equipmentId, weight: 1 })),
    equipmentCatalog: catalog,
  };
}
function run(input: IValidatableUnit) {
  return MissingAmmunitionRule.validate({
    unit: input,
    unitType: input.unitType,
    unitCategory: UnitCategory.MECH,
    options: {},
    techBase: input.techBase,
    cache: new Map(),
  });
}

it('warns without making the unit illegal and navigates to Equipment', () => {
  const result = run(unit(['ac-20']));
  expect(result.errors).toEqual([]);
  expect(result.warnings).toEqual([
    expect.objectContaining({
      message: 'AC/20 has no ammunition',
      severity: UnitValidationSeverity.WARNING,
      category: ValidationCategory.EQUIPMENT,
      suggestion: 'Add AC/20 Ammo in Equipment',
    }),
  ]);
  expect(getFixTabsForCategory(result.warnings[0].category)).toEqual([
    'equipment',
  ]);
});

it('accepts a compatible bin shared by several weapons, including an unallocated bin', () => {
  expect(run(unit(['ac-20', 'ac-20', 'ac-20-ammo'])).warnings).toEqual([]);
  expect(run(unit(['ac-20', 'ac-20'])).warnings).toHaveLength(1);
});

it('does not count zero-weight or incompatible ammunition', () => {
  const input = unit(['ac-20', 'ac-20-ammo']);
  expect(
    run({
      ...input,
      mountedEquipment: [
        { equipmentId: 'ac-20', weight: 14 },
        { equipmentId: ammo.id, weight: 0 },
      ],
    }).warnings,
  ).toHaveLength(1);
  expect(
    run(
      unit(
        ['ac-20', ammo.id],
        [weapon, { ...ammo, compatibleWeaponIds: ['ac-10'] }],
      ),
    ).warnings,
  ).toHaveLength(1);
});

it('uses declared IS/Clan compatibility rather than guessing from names', () => {
  const clan = { ...weapon, id: 'clan-ac-20', techBase: TechBase.CLAN };
  const result = run(unit([weapon.id, clan.id, ammo.id], [weapon, clan, ammo]));
  expect(result.warnings).toHaveLength(1);
  expect(result.warnings[0].details).toMatchObject({ equipmentId: clan.id });
});

it.each([
  { category: EquipmentCategory.ENERGY_WEAPON, ammoPerTon: undefined },
  { category: EquipmentCategory.PHYSICAL_WEAPON },
  { name: 'LRM 20 (OS)' },
  { name: 'LRM 20 (I-OS)' },
  { flags: ['ONE_SHOT'] },
  { flags: ['INTERNAL_AMMO'] },
  { special: ['Internal ammunition'] },
])('exempts weapons without external ammunition: %j', (overrides) => {
  expect(
    run(unit([weapon.id], [{ ...weapon, ...overrides }])).warnings,
  ).toEqual([]);
});

it('recognizes imported ammunition with no explicit compatibility list', () => {
  expect(
    run(
      unit(
        [weapon.id, ammo.id],
        [weapon, { ...ammo, compatibleWeaponIds: undefined }],
      ),
    ).warnings,
  ).toEqual([]);
});

it('recognizes full and half machine gun bins by name, exactly', () => {
  const mg = { ...weapon, id: 'machine-gun', name: 'Machine Gun' };
  const lightMg = { ...mg, id: 'light-mg', name: 'Light Machine Gun' };
  const bin = (id: string, name: string) => ({
    ...ammo,
    id,
    name,
    compatibleWeaponIds: [],
  });
  const full = bin('ammo-mg-full', 'Machine Gun Ammo [Full]');
  const half = bin('ammo-mg-half', 'Machine Gun Ammo [Half]');
  const lightFull = bin('ammo-light-mg-full', 'Light Machine Gun Ammo [Full]');
  const catalog = [mg, lightMg, full, half, lightFull];
  expect(run(unit([mg.id, full.id], catalog)).warnings).toEqual([]);
  expect(run(unit([mg.id, half.id], catalog)).warnings).toEqual([]);
  expect(run(unit([mg.id, lightFull.id], catalog)).warnings).toHaveLength(1);
});

it('runs through the registered construction validation boundary', () => {
  initializeUnitValidationRules();
  const result = validateUnit(unit(['ac-20']), {
    categories: [ValidationCategory.EQUIPMENT],
    includeWarnings: true,
  });
  expect(result.isValid).toBe(true);
  expect(result.warningCount).toBe(1);
  expect(
    result.results.some((entry) => entry.ruleId === MissingAmmunitionRule.id),
  ).toBe(true);
});
