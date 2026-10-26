import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import { MissingAmmunitionRule } from '@/services/validation/rules/equipment/MissingAmmunitionRule';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { Era, RulesLevel } from '@/types/enums';
import { TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';

import { getEquipmentLookupService } from '../EquipmentLookupService';

jest.mock('../EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

it('preserves source dates and excludes extinct PPCs in all live catalog filters', () => {
  const lookup = getEquipmentLookupService();
  expect(lookup.getById('er-ppc')).toMatchObject({
    introductionYear: 2751,
    extinctionYear: 2860,
    reintroductionYear: 3037,
  });
  expect(lookup.getById('enhanced-er-ppc')).toMatchObject({
    techBase: TechBase.CLAN,
    introductionYear: 2823,
    extinctionYear: 2831,
    reintroductionYear: 3080,
  });
  for (const year of [2860, 3028, 3036]) {
    expect(lookup.getByEra(year).map((item) => item.id)).not.toContain(
      'er-ppc',
    );
    expect(lookup.query({ year }).map((item) => item.id)).not.toContain(
      'er-ppc',
    );
  }
  expect(lookup.getByEra(3037).map((item) => item.id)).toContain('er-ppc');
  const store = useEquipmentStore.getState();
  store.setEquipment(lookup.getAllEquipment());
  store.setUnitContext(3028, TechBase.INNER_SPHERE, []);
  expect(
    useEquipmentStore
      .getState()
      .getFilteredEquipment()
      .map((item) => item.id),
  ).not.toEqual(expect.arrayContaining(['er-ppc']));
  expect(
    useEquipmentStore
      .getState()
      .getFilteredEquipment()
      .map((item) => item.id),
  ).not.toContain('enhanced-er-ppc');
  store.setUnitContext(3037, TechBase.INNER_SPHERE, []);
  expect(
    useEquipmentStore
      .getState()
      .getFilteredEquipment()
      .map((item) => item.id),
  ).toContain('er-ppc');
});

it('hydrates all five canonical Atlas ammunition bins from critical slots', () => {
  const raw: unknown = JSON.parse(
    readFileSync(
      join(
        process.cwd(),
        'public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json',
      ),
      'utf8',
    ),
  );
  const state = new UnitLoaderService().mapToUnitState(parseUnit(raw), true);
  const ammo = state.equipment.filter(
    (item) => item.category === EquipmentCategory.AMMUNITION,
  );
  expect(ammo).toHaveLength(5);
  expect(ammo.reduce((tons, bin) => tons + bin.weight, 0)).toBe(5);
  const matches = (name: RegExp) => ammo.filter((item) => name.test(item.name));
  expect(matches(/AC.?20/)).toHaveLength(2);
  expect(matches(/LRM.?20/)).toHaveLength(2);
  expect(matches(/SRM.?6/)).toHaveLength(1);
  initializeUnitValidationRules();
  const unit: IValidatableUnit = {
    id: state.id,
    name: 'Atlas AS7-D',
    unitType: UnitType.BATTLEMECH,
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    introductionYear: 2755,
    era: Era.STAR_LEAGUE,
    weight: 100,
    cost: 0,
    battleValue: 0,
    heatSinkCount: 20,
    mountedEquipment: state.equipment,
    equipmentCatalog: getEquipmentLookupService().getAllEquipment(),
  };
  const ammoWarnings = (value: IValidatableUnit) =>
    validateUnit(value).results.find(
      (result) => result.ruleId === MissingAmmunitionRule.id,
    )?.warnings;
  expect(ammoWarnings(unit)).toEqual([]);
  expect(
    ammoWarnings({
      ...unit,
      mountedEquipment: state.equipment.filter(
        (item) => item.category !== EquipmentCategory.AMMUNITION,
      ),
    })
      ?.map((warning) => warning.message)
      .sort(),
  ).toEqual([
    'AC/20 has no ammunition',
    'LRM 20 has no ammunition',
    'SRM 6 has no ammunition',
  ]);
});
