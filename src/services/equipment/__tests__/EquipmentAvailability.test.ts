import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { initializeUnitValidationRules } from '@/services/validation/initializeUnitValidation';
import { MissingAmmunitionRule } from '@/services/validation/rules/equipment/MissingAmmunitionRule';
import { validateUnit } from '@/services/validation/UnitValidationOrchestrator';
import { useEquipmentStore } from '@/stores/useEquipmentStore';
import { filterEquipment } from '@/stores/useEquipmentStore.filters';
import { Era, RulesLevel } from '@/types/enums';
import { TechBase } from '@/types/enums';
import { EquipmentCategory } from '@/types/equipment';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { IValidatableUnit } from '@/types/validation/UnitValidationInterfaces';
import { isAvailableInYear } from '@/utils/temporal/availabilityUtils';

import { getEquipmentLoader } from '../EquipmentLoaderService';
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

/** @spec equipment-database source-backed catalog availability */
it.each([
  ['beagle-active-probe', 2576, 2835, 3045],
  ['active-probe-beagle', 2576, 2835, 3045],
  ['er-large-laser', 2620, 2950, 3037],
  ['gauss-rifle', 2590, 2865, 3040],
  ['uac-5', 2640, 2915, 3035],
  ['artemisiv', 2598, 2855, 3035],
  ['case', 2476, 2840, 3036],
  ['double-heat-sink', 2567, 2865, 3040],
  ['er-ppc', 2751, 2860, 3037],
] as const)(
  '%s preserves pinned production/extinction/reintroduction at the loader and filter boundaries',
  (id, introductionYear, extinctionYear, reintroductionYear) => {
    const loaded = getEquipmentLoader().getById(id);
    expect(loaded).toMatchObject({
      introductionYear,
      extinctionYear,
      reintroductionYear,
      techBase: TechBase.INNER_SPHERE,
    });
    if (!loaded) throw new Error(`Missing equipment ${id}`);
    expect(isAvailableInYear(loaded, introductionYear - 1)).toBe(false);
    expect(isAvailableInYear(loaded, introductionYear)).toBe(true);
    expect(isAvailableInYear(loaded, extinctionYear - 1)).toBe(true);
    expect(isAvailableInYear(loaded, extinctionYear)).toBe(false);
    expect(isAvailableInYear(loaded, 3028)).toBe(false);
    expect(isAvailableInYear(loaded, reintroductionYear - 1)).toBe(false);
    expect(isAvailableInYear(loaded, reintroductionYear)).toBe(true);
    // Exercise the filter even for rows excluded by the current browser projection.
    const item = {
      ...loaded,
      category: EquipmentCategory.MISC_EQUIPMENT,
      costCBills: 0,
    };
    const filters = {
      ...useEquipmentStore.getState().filters,
      hideUnavailable: true,
      showAllCategories: true,
    };
    const sort = { column: 'name', direction: 'asc' } as const;
    const context = {
      unitYear: 3028,
      unitTechBase: TechBase.INNER_SPHERE,
      unitWeaponIds: [],
    };
    expect(filterEquipment([item], filters, context, sort)).toEqual([]);
    expect(
      filterEquipment(
        [item],
        filters,
        { ...context, unitYear: reintroductionYear },
        sort,
      ),
    ).toEqual([item]);
    if (!getEquipmentLookupService().getById(id)) return;
    const store = useEquipmentStore.getState();
    store.clearFilters();
    store.showAllCategories();
    store.setEquipment(getEquipmentLookupService().getAllEquipment());
    store.setUnitContext(3028, TechBase.INNER_SPHERE, []);
    expect(
      useEquipmentStore
        .getState()
        .getFilteredEquipment()
        .map((item) => item.id),
    ).not.toContain(id);
    store.setUnitContext(reintroductionYear, TechBase.INNER_SPHERE, []);
    expect(
      useEquipmentStore
        .getState()
        .getFilteredEquipment()
        .map((item) => item.id),
    ).toContain(id);
  },
);

it.each(['er-small-laser', 'er-medium-laser'])(
  '%s starts in 3058 and has no invented extinction dates',
  (id) => {
    const equipment = getEquipmentLookupService().getById(id);
    expect(equipment).toMatchObject({ introductionYear: 3058 });
    expect(equipment?.extinctionYear).toBeUndefined();
    expect(equipment?.reintroductionYear).toBeUndefined();
    expect(
      getEquipmentLookupService()
        .query({ year: 3028 })
        .map((item) => item.id),
    ).not.toContain(id);
    expect(
      getEquipmentLookupService()
        .query({ year: 3058 })
        .map((item) => item.id),
    ).toContain(id);
  },
);

it('identifies the generic one-ton probe as Clan and keeps orphan AC/15 ammunition in data only', () => {
  expect(getEquipmentLookupService().getById('active-probe')).toMatchObject({
    techBase: TechBase.CLAN,
    weight: 1,
    criticalSlots: 1,
    introductionYear: 2832,
  });
  expect(getEquipmentLookupService().getById('ammo-ac-15')).toBeDefined();
  const store = useEquipmentStore.getState();
  store.clearFilters();
  store.showAllCategories();
  store.setEquipment(getEquipmentLookupService().getAllEquipment());
  store.setUnitContext(3028, TechBase.INNER_SPHERE, []);
  const ids = useEquipmentStore
    .getState()
    .getFilteredEquipment()
    .map((item) => item.id);
  expect(ids).not.toContain('active-probe');
  expect(ids).not.toContain('ammo-ac-15');
  expect(ids).toContain('ac-10-ammo');
});

it.each([2755, 3028])(
  'retains the Atlas baseline weapons and legitimate ammo in %i',
  (year) => {
    const store = useEquipmentStore.getState();
    store.clearFilters();
    store.showAllCategories();
    store.setEquipment(getEquipmentLookupService().getAllEquipment());
    store.setUnitContext(year, TechBase.INNER_SPHERE, []);
    const ids = useEquipmentStore
      .getState()
      .getFilteredEquipment()
      .map((item) => item.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        'ppc',
        'medium-laser',
        'ac-10',
        'ac-20',
        'ac-10-ammo',
        'ac-20-ammo',
        'lrm-5',
        'lrm-10',
        'lrm-20',
        'srm-2',
        'srm-4',
        'srm-6',
        'lrm-ammo',
        'srm-ammo',
        'mg-ammo',
      ]),
    );
    expect(ids.includes('er-ppc')).toBe(year === 2755);
  },
);

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
