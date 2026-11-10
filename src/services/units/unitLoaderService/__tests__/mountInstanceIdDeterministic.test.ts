/**
 * 0c-UUID-001: mount instance ids minted by the loader were random UUIDs, so
 * VAL-UNIV-015 issue fields (`criticalSlots.<instanceId>`) differed on every
 * load of the same committed unit. The field must name the real mount (the
 * editor routes on it) and must be the same on every load.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { CriticalSlotOverflowValidation } from '@/services/validation/rules/universal/UniversalValidationRules';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IUnitValidationContext,
  UnitCategory,
} from '@/types/validation/UnitValidationInterfaces';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';

import atae70 from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Uni ATAE-70 ArtilleryMech.json';
import { recoveredMountInstanceId } from '../mountInstanceId';
import { parseUnit } from '../unitContractAdapter';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

function load(unit: unknown) {
  return new UnitLoaderService().mapToUnitState(
    parseUnit(unit as Parameters<typeof parseUnit>[0]),
    true,
  );
}

function slotRuleFields(unit: unknown): string[] {
  const state = load(unit);
  const context: IUnitValidationContext = {
    unit: {
      id: 'unit',
      name: 'unit',
      unitType: UnitType.BATTLEMECH,
      techBase: state.techBase,
      slotsByLocation: {},
      equipmentSlotIssues: getEquipmentSlotIssues(
        state.equipment,
        state.configuration,
        state.engineType,
        state.gyroType,
        state.armActuators,
        state.cockpitType,
      ),
    } as unknown as IUnitValidationContext['unit'],
    unitType: UnitType.BATTLEMECH,
    unitCategory: UnitCategory.MECH,
    techBase: state.techBase,
    options: {},
    cache: new Map(),
  };
  const result = CriticalSlotOverflowValidation.validate(context);
  return [...result.errors, ...result.warnings].map((issue) => issue.field!);
}

describe('mount instance ids are deterministic across loads', () => {
  it('gives identical VAL-UNIV-015 fields on two loads of ATAE-70 ArtilleryMech', () => {
    const first = slotRuleFields(atae70);
    const second = slotRuleFields(atae70);
    expect(first.length).toBeGreaterThan(0); // the unplaced thumpers fire it
    expect(second).toEqual(first);
  });

  it('keeps every mount id on one unit unique, including same-location duplicates', () => {
    const doubled = {
      ...atae70,
      equipment: [
        ...atae70.equipment,
        { id: 'thumper', location: 'CENTER_TORSO' },
      ],
    };
    const ids = load(doubled).equipment.map((item) => item.instanceId);
    // Two source thumpers + the recovered thumper ammo bin + the added one.
    expect(ids).toHaveLength(4);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(load(doubled).equipment.map((item) => item.instanceId));
  });
});

describe('recoveredMountInstanceId', () => {
  const ct = 'Center Torso';
  const lt = 'Left Torso';

  it('refuses a mount that occupies no critical slot instead of sharing an id', () => {
    expect(() => recoveredMountInstanceId('ammo', [])).toThrow(
      /no critical slot/,
    );
    expect(() =>
      recoveredMountInstanceId('ammo', [{ location: ct, slots: [] }]),
    ).toThrow(/no critical slot/);
  });

  it('names a mount by every cell it occupies, independent of slot order', () => {
    const a = recoveredMountInstanceId('ac-20', [
      { location: ct, slots: [7, 5, 6] },
    ]);
    expect(
      recoveredMountInstanceId('ac-20', [{ location: ct, slots: [5, 6, 7] }]),
    ).toBe(a);
    // Same id, same location, different cells.
    expect(
      recoveredMountInstanceId('ac-20', [{ location: ct, slots: [8, 9, 10] }]),
    ).not.toBe(a);
    // Split mounts that share a first cell still differ by their other part.
    const split = (rest: number[]) =>
      recoveredMountInstanceId('ac-20', [
        { location: ct, slots: [7] },
        { location: lt, slots: rest },
      ]);
    expect(split([2, 3])).not.toBe(split([4, 5]));
    expect(split([2, 3])).not.toBe(
      recoveredMountInstanceId('ac-20', [{ location: ct, slots: [7] }]),
    );
  });
});

// Units that exercise split, spread, omni, LAM, superheavy, ammo and heat-sink
// recovery in the existing loader suites. A full-catalog check is a census-size
// run; this set is the representative one.
const REPRESENTATIVE_UNITS = [
  '2-star-league/standard/Atlas AS7-D',
  '3-succession-wars/standard/King Crab KGC-0000',
  '5-civil-war/advanced/King Crab KGC-008',
  '6-dark-age/standard/Uni ATAE-70 ArtilleryMech',
  '6-dark-age/standard/Scarecrow UCU-F4',
  '6-dark-age/experimental/Omega SHP-5R',
  '6-dark-age/experimental/Ares ARS-V1 Zeus',
  '4-clan-invasion/experimental/Cudgel CDG-1B',
  '4-clan-invasion/experimental/Avatar AV1-OR',
  '1-age-of-war/standard/Warhammer WHM-6R',
  '1-age-of-war/standard/Lumberjack LM1-A',
  '6-dark-age/standard/Celerity CLR-03-O',
  '6-dark-age/experimental/Poseidon PSD-V2',
  '6-dark-age/experimental/Devastator DVS-10',
  '6-dark-age/advanced/Crossbow T',
  '6-dark-age/standard/Goliath GOL-6M',
  '6-dark-age/standard/Sarath SRTH-1OB',
  '6-dark-age/standard/Orca OC-1X',
  '5-civil-war/standard/Wasp LAM WSP-110',
  '5-civil-war/standard/Turkina U',
  '5-civil-war/standard/Kodiak (Cale)',
  '5-civil-war/standard/Great Turtle GTR-2',
  '5-civil-war/standard/Cauldron-Born U',
  '5-civil-war/experimental/Linebacker F',
  '5-civil-war/advanced/Flea FLE-19',
  '5-civil-war/advanced/Bombardier BMB-14K',
  '4-clan-invasion/advanced/Daishi C',
  '4-clan-invasion/advanced/Crossbow C',
  '4-clan-invasion/advanced/Atlas AS7-S2',
  '4-clan-invasion/advanced/Arctic Wolf 2',
];

describe('mount ids over a representative unit set', () => {
  const read = (name: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${name}.json`),
        'utf8',
      ),
    );

  it('are unique within every unit and identical on every load', () => {
    let recovered = 0;
    let total = 0;
    for (const name of REPRESENTATIVE_UNITS) {
      const ids = load(read(name)).equipment.map((item) => item.instanceId);
      expect({ name, unique: new Set(ids).size }).toEqual({
        name,
        unique: ids.length,
      });
      expect({
        name,
        ids: load(read(name)).equipment.map((m) => m.instanceId),
      }).toEqual({
        name,
        ids,
      });
      total += ids.length;
      recovered += ids.filter((id) => id.startsWith('mount:recovered:')).length;
    }
    // Not vacuous: the set must really contain recovered mounts.
    expect(total).toBeGreaterThan(350);
    expect(recovered).toBeGreaterThan(100);
  });
});
