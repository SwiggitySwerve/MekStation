/** @spec openspec/changes/establish-all-unit-data-parity/specs/customizer-tabs/spec.md */
import fs from 'fs';
import path from 'path';

import { buildVehicleUnitObject } from '@/components/customizer/vehicle/buildVehicleUnitObject';
import * as vehicleExtractor from '@/services/printing/recordsheet/dataExtractors.vehicle';
import * as vehicleBindings from '@/services/printing/svgRecordSheetRenderer/vehicle/bindings';
import { renderVehicleSVG } from '@/services/printing/svgRecordSheetRenderer/vehicleRenderer';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { UnitContract } from '@/types/contracts';

import {
  catalog,
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

jest.mock('@/services/printing/recordsheet/dataExtractors.vehicle', () => {
  const actual = jest.requireActual<typeof vehicleExtractor>(
    '@/services/printing/recordsheet/dataExtractors.vehicle',
  );
  return { ...actual, extractVehicleData: jest.fn(actual.extractVehicleData) };
});
jest.mock('@/services/printing/svgRecordSheetRenderer/vehicle/bindings', () => {
  const actual = jest.requireActual<typeof vehicleBindings>(
    '@/services/printing/svgRecordSheetRenderer/vehicle/bindings',
  );
  return { ...actual, bindVehicle: jest.fn(actual.bindVehicle) };
});

const { extractVehicleData } = jest.requireActual<typeof vehicleExtractor>(
  '@/services/printing/recordsheet/dataExtractors.vehicle',
);
const { bindVehicle } = jest.requireActual<typeof vehicleBindings>(
  '@/services/printing/svgRecordSheetRenderer/vehicle/bindings',
);

const entries = catalog('vehicles');
type VehicleState = ReturnType<typeof mapToVehicleState>;

function load(id: string) {
  const entry = entries.find((candidate) => candidate.id === id);
  if (!entry) throw new Error(`Missing catalog fixture: ${id}`);
  const source = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units/vehicles', entry.path),
        'utf8',
      ),
    ),
  );
  return { entry, source };
}

/** Distinct armor per location exposes compensating swaps; catalog stays untouched. */
function distinct(id: string) {
  const { entry, source } = load(id);
  const byLocation = Object.fromEntries(
    Object.keys(source.armor?.byLocation ?? {}).map((key, index) => [
      key,
      10 + index * 3,
    ]),
  );
  return {
    entry,
    source: { ...source, armor: { ...source.armor, byLocation } },
  };
}

const identityFields = (rows: { field: string }[]) =>
  rows
    .map(({ field }) => field)
    .filter(
      (field) =>
        field.startsWith('armor.') ||
        field.startsWith('pips.') ||
        field === 'binding.armorType' ||
        field === 'barRating',
    )
    .sort();
const fields = (id: string) => {
  const { entry, source } = distinct(id);
  const row = verifyCatalogUnit('vehicles', entry, () =>
    JSON.stringify(source),
  );
  expect(row.rejection).toBeUndefined();
  return identityFields(row.differences);
};

/** One fixture per subtype family named in row 4.3. */
const subtypes = [
  ['tracked with turret', 'ajax-assault-tank-sealed'],
  ['wheeled without turret', 'armored-personnel-carrier-wheeled-lrm'],
  ['hover', 'air-car'],
  ['VTOL rotor', 'aeron-strike-vtol'],
  ['VTOL rotor and turret', 'cavalry-attack-helicopter-infiltrator'],
  ['naval', 'atlantia-luxury-yacht'],
  ['superheavy six-side', 'devastator-ii-superheavy-tank'],
  ['superheavy dual turret', 'gulltoppr-omnimonitor-a'],
  ['dual turret', 'athena-combat-vehicle-xr'],
  ['six-side support (large support tank class)', 'brunel-dump-truck'],
  ['support vehicle with BAR', 'apocalypse-world-rover'],
] as const;

const extractor = jest.mocked(vehicleExtractor.extractVehicleData);
const binder = jest.mocked(vehicleBindings.bindVehicle);

function mutateLocations(
  mutate: (
    locations: ReturnType<typeof extractVehicleData>['armorLocations'],
  ) => ReturnType<typeof extractVehicleData>['armorLocations'],
) {
  extractor.mockImplementation((unit, spa) => {
    const data = extractVehicleData(unit, spa);
    return { ...data, armorLocations: mutate(data.armorLocations) };
  });
}
function mutatePips(
  mutate: (
    counts: Record<string, number | undefined>,
  ) => Record<string, number | undefined>,
) {
  binder.mockImplementation((data) => {
    const bindings = bindVehicle(data);
    return { ...bindings, pipCounts: mutate({ ...bindings.pipCounts }) };
  });
}
const swap = (
  counts: Record<string, number | undefined>,
  a: string,
  b: string,
) => ({ ...counts, [a]: counts[b], [b]: counts[a] });
const swapArmor = (a: string, b: string) =>
  mutateLocations((locations) => {
    const left = locations.find((l) => l.location === a);
    const right = locations.find((l) => l.location === b);
    return locations.map((l) =>
      l === left
        ? { ...l, current: right?.current ?? -1 }
        : l === right
          ? { ...l, current: left?.current ?? -1 }
          : l,
    );
  });

describe('Vehicle catalog location identity acceptance', () => {
  beforeAll(initializeEquipment);
  beforeEach(() => {
    extractor.mockImplementation(extractVehicleData);
    binder.mockImplementation(bindVehicle);
  });

  it.each(subtypes)(
    'accepts the domain locations for %s (%s)',
    (_label, id) => {
      expect(fields(id)).toEqual([]);
    },
  );

  it('identifies the large support tank class by source evidence', () => {
    const { source } = load('brunel-dump-truck');
    expect(source.unitType).toBe('Support Vehicle');
    expect(Object.keys(source.armor?.byLocation ?? {}).sort()).toEqual([
      'FRONT',
      'FRONT_LEFT',
      'FRONT_RIGHT',
      'REAR',
      'REAR_LEFT',
      'REAR_RIGHT',
    ]);
  });

  it('rejects left/right armor swaps even when the total is unchanged', () => {
    swapArmor('Left Side', 'Right Side');
    expect(fields('ajax-assault-tank-sealed')).toEqual(
      ['armor.LEFT', 'armor.RIGHT', 'pips.LS', 'pips.RS'].sort(),
    );
  });

  it('rejects six-side corner swaps', () => {
    swapArmor('Front Left', 'Rear Left');
    expect(fields('devastator-ii-superheavy-tank')).toEqual(
      ['armor.FRONT_LEFT', 'armor.REAR_LEFT', 'pips.FRLS', 'pips.RRLS'].sort(),
    );
  });

  it('rejects a missing printed location', () => {
    mutateLocations((locations) =>
      locations.filter((l) => l.location !== 'Rear'),
    );
    expect(fields('air-car')).toEqual(
      ['armor.REAR', 'armor.locations', 'pips.RR'].sort(),
    );
  });

  it('rejects a duplicated printed location', () => {
    mutateLocations((locations) => [...locations, locations[0]]);
    expect(fields('air-car')).toEqual(['armor.locations', 'pips.FR']);
  });

  it('rejects a printed turret on a turretless vehicle', () => {
    mutateLocations((locations) => [
      ...locations,
      { location: 'Turret', current: 5 },
    ]);
    expect(fields('armored-personnel-carrier-wheeled-lrm')).toEqual([
      'armor.locations',
      'pips.TU',
    ]);
  });

  it('rejects a swapped left/right pip binding (location code table)', () => {
    mutatePips((counts) => swap(counts, 'LS', 'RS'));
    expect(fields('alacorn-heavy-tank-mk-vii')).toEqual(['pips.LS', 'pips.RS']);
  });

  it('rejects swapped six-side corner pip bindings', () => {
    mutatePips((counts) => swap(counts, 'FRLS', 'RRRS'));
    expect(fields('devastator-ii-superheavy-tank')).toEqual([
      'pips.FRLS',
      'pips.RRRS',
    ]);
  });

  it('rejects swapped dual-turret pip bindings', () => {
    mutatePips((counts) => swap(counts, 'TU', 'FT'));
    expect(fields('athena-combat-vehicle-xr')).toEqual(['pips.FT', 'pips.TU']);
  });

  it('rejects a superheavy dual turret printed as TU instead of RT', () => {
    mutatePips(({ RT, ...counts }) => ({ ...counts, TU: RT }));
    expect(fields('gulltoppr-omnimonitor-a')).toEqual(['pips.RT', 'pips.TU']);
  });

  it('rejects a VTOL rotor bound to the turret code', () => {
    mutatePips(({ RO, ...counts }) => ({ ...counts, TU: RO }));
    expect(fields('aeron-strike-vtol')).toEqual(['pips.RO', 'pips.TU']);
  });

  it('rejects a lost BAR rating on a BAR support vehicle', () => {
    extractor.mockImplementation((unit, spa) => ({
      ...extractVehicleData(unit, spa),
      barRating: undefined,
    }));
    expect(fields('apocalypse-world-rover')).toEqual(
      ['barRating', 'binding.armorType'].sort(),
    );
  });

  it('rejects a BAR rating printed on a combat vehicle', () => {
    extractor.mockImplementation((unit, spa) => ({
      ...extractVehicleData(unit, spa),
      barRating: 6,
    }));
    expect(fields('ajax-assault-tank-sealed')).toEqual(
      ['barRating', 'binding.armorType'].sort(),
    );
  });

  it.each(['apocalypse-world-rover', 'brunel-dump-truck'])(
    'rejects a BAR support vehicle %s whose armor type omits the rating',
    (id) => {
      binder.mockImplementation((data) => {
        const bindings = bindVehicle(data);
        return {
          ...bindings,
          texts: { ...bindings.texts, armorType: 'Standard' },
        };
      });
      expect(fields(id)).toEqual(['binding.armorType']);
    },
  );

  it.each(['air-car', 'ajax-assault-tank-sealed'])(
    'rejects BAR printed as the armor type of non-BAR %s',
    (id) => {
      binder.mockImplementation((data) => {
        const bindings = bindVehicle(data);
        return {
          ...bindings,
          texts: { ...bindings.texts, armorType: 'BAR: 7' },
        };
      });
      expect(fields(id)).toEqual(['binding.armorType']);
    },
  );

  it.each(['air-car', 'ajax-assault-tank-sealed', 'aeron-strike-vtol'])(
    'rejects a re-added Body location on %s',
    (id) => {
      mutateLocations((locations) => [
        ...locations,
        { location: 'Body', current: 0 },
      ]);
      expect(fields(id)).toEqual(['armor.locations']);
    },
  );

  it('rejects re-added Left/Right Side on a six-side unit', () => {
    mutateLocations((locations) => [
      ...locations,
      { location: 'Left Side', current: 0 },
      { location: 'Right Side', current: 0 },
    ]);
    expect(fields('devastator-ii-superheavy-tank')).toEqual(
      ['armor.locations', 'pips.LS', 'pips.RS'].sort(),
    );
  });

  it('rejects a restored N/N maximum on every location', () => {
    mutateLocations((locations) =>
      locations.map((l) => ({ ...l, maximum: l.current })),
    );
    expect(fields('ajax-assault-tank-sealed')).toEqual(['armor.maximum']);
  });
});

/** Editor-built units have no catalog source: the layout alone decides. */
describe('Vehicle printed layout for editor-built units', () => {
  const printed = (
    id: string,
    tweak?: (state: VehicleState) => VehicleState,
  ) => {
    const state = mapToVehicleState(load(id).source);
    const data = extractVehicleData(
      buildVehicleUnitObject(tweak ? tweak(state) : state),
    );
    return Object.fromEntries(
      data.armorLocations.map(({ location, current, maximum }) => [
        location,
        { current, maximum },
      ]),
    );
  };

  it('prints a real location at 0 armor without a source key', () => {
    const rear = printed('ajax-assault-tank-sealed', (state) => ({
      ...state,
      armorAllocation: { ...state.armorAllocation, [VehicleLocation.REAR]: 0 },
    })).Rear;
    expect(rear).toEqual({ current: 0, maximum: undefined });
  });

  it('never prints Body, even for a support vehicle with Body armor set', () => {
    const locations = printed('air-car', (state) => ({
      ...state,
      armorAllocation: { ...state.armorAllocation, [VehicleLocation.BODY]: 9 },
    }));
    expect(Object.keys(locations).sort()).toEqual([
      'Front',
      'Left Side',
      'Rear',
      'Right Side',
    ]);
  });

  it('omits stale Left/Right Side on a six-side unit', () => {
    const locations = printed('devastator-ii-superheavy-tank', (state) => ({
      ...state,
      armorAllocation: {
        ...state.armorAllocation,
        [VehicleLocation.LEFT]: 5,
        [VehicleLocation.RIGHT]: 5,
      },
    }));
    expect(Object.keys(locations).sort()).toEqual([
      'Front',
      'Front Left',
      'Front Right',
      'Rear',
      'Rear Left',
      'Rear Right',
    ]);
  });

  it('prints the rotor and chin turret of a VTOL, and no stale turrets', () => {
    expect(
      Object.keys(printed('cavalry-attack-helicopter-infiltrator')).sort(),
    ).toEqual(['Front', 'Left Side', 'Rear', 'Right Side', 'Rotor', 'Turret']);
    expect(Object.keys(printed('aeron-strike-vtol')).sort()).toEqual([
      'Front',
      'Left Side',
      'Rear',
      'Right Side',
      'Rotor',
    ]);
  });

  it('prints both turrets on a dual-turret unit and neither stale one otherwise', () => {
    expect(Object.keys(printed('athena-combat-vehicle-xr')).sort()).toEqual([
      'Front',
      'Left Side',
      'Rear',
      'Right Side',
      'Turret',
      'Turret 2',
    ]);
    expect(
      Object.keys(printed('armored-personnel-carrier-wheeled-lrm')).sort(),
    ).toEqual(['Front', 'Left Side', 'Rear', 'Right Side']);
  });
});

/**
 * The editor keeps `barRating` after the armor changes away from BAR
 * (`setArmorType` only clears `usesBarArmor`), and a new support vehicle
 * starts at rating 7. Only `usesBarArmor` says the armor really is BAR.
 */
describe('Vehicle BAR armor type for editor-built units', () => {
  const sheet = (state: VehicleState) => {
    const data = extractVehicleData(buildVehicleUnitObject(state));
    return { data, armorType: bindVehicle(data).texts.armorType };
  };
  const rover = () => {
    const { source } = load('apocalypse-world-rover');
    return { source, state: mapToVehicleState(source) };
  };

  it('prints BAR: <rating> for a support vehicle with BAR armor', () => {
    const { source, state } = rover();
    expect(state.usesBarArmor).toBe(true);
    const { data, armorType } = sheet(state);
    expect(data.barRating).toBe(source.armor?.barRating);
    expect(armorType).toBe(`BAR: ${source.armor?.barRating}`);
  });

  it('prints no BAR after the armor changes away from BAR', () => {
    const { state } = rover();
    const changed: VehicleState = {
      ...state,
      armorType: ArmorTypeEnum.FERRO_FIBROUS_IS,
      usesBarArmor: false,
      // setArmorType leaves the rating behind.
      barRating: 7,
    };
    const { data, armorType } = sheet(changed);
    expect(data.barRating).toBeUndefined();
    expect(armorType).toBe(String(ArmorTypeEnum.FERRO_FIBROUS_IS));
    expect(armorType).not.toMatch(/^BAR/);
    expect(armorType).not.toBe('undefined');
  });

  it('prints no BAR for a new support vehicle with ordinary armor', () => {
    const { state } = rover();
    const fresh: VehicleState = {
      ...state,
      armorType: ArmorTypeEnum.STANDARD,
      usesBarArmor: undefined,
      barRating: 7,
    };
    const { data, armorType } = sheet(fresh);
    expect(data.barRating).toBeUndefined();
    expect(armorType).not.toMatch(/^BAR/);
  });

  it('prints no BAR for a combat vehicle', () => {
    const state = mapToVehicleState(load('ajax-assault-tank-sealed').source);
    const { data, armorType } = sheet(state);
    expect(data.barRating).toBeUndefined();
    expect(armorType).not.toMatch(/^BAR/);
  });
});

describe('Vehicle skeleton fallback armor text', () => {
  it('prints each location with its value only, no cap and no fill bar', () => {
    const svg = renderVehicleSVG(
      extractVehicleData(
        buildVehicleUnitObject(
          mapToVehicleState(load('ajax-assault-tank-sealed').source),
        ),
      ),
    );
    expect(svg).toContain('>Front 76</text>');
    expect(svg).not.toMatch(/>(Front|Left Side|Turret) \d+\/\d+</);
    expect(svg).not.toMatch(/<rect[^>]*height="8"[^>]*fill="#555"/);
  });
});
