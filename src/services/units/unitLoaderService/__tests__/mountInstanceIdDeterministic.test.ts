/**
 * 0c-UUID-001: mount instance ids minted by the loader were random UUIDs, so
 * VAL-UNIV-015 issue fields (`criticalSlots.<instanceId>`) differed on every
 * load of the same committed unit. The field must name the real mount (the
 * editor routes on it) and must be the same on every load.
 */
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import { CriticalSlotOverflowValidation } from '@/services/validation/rules/universal/UniversalValidationRules';
import { Era } from '@/types/temporal/Era';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  IUnitValidationContext,
  UnitCategory,
} from '@/types/validation/UnitValidationInterfaces';
import { getEquipmentSlotIssues } from '@/utils/construction/slotOperations/placement';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

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

describe('mount ids on the save-and-reopen path', () => {
  // A saved document lists heat sinks (and everything else) as equipment entries, which takes the
  // serialized-equipment restore path instead of the canonical one. Its ids must be content-derived
  // too: nothing on a reopened unit may come from a random draw.
  const read = (name: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', `${name}.json`),
        'utf8',
      ),
    );
  const reopen = (name: string) => {
    const state = load(read(name));
    const saved = JSON.parse(
      JSON.stringify(
        serializeCustomUnitState(state, {
          id: state.id,
          chassis: state.chassis,
          variant: state.model,
          era: Era.LATE_SUCCESSION_WARS,
        }),
      ),
    );
    return new UnitLoaderService().mapToUnitState(parseUnit(saved), false)
      .equipment;
  };

  it('are content-derived, unique and identical on every reopen', () => {
    let heatSinks = 0;
    for (const name of REPRESENTATIVE_UNITS) {
      const first = reopen(name);
      const ids = first.map((item) => item.instanceId);
      expect({
        name,
        random: ids.filter((id) => !id.startsWith('mount:')),
      }).toEqual({
        name,
        random: [],
      });
      expect(new Set(ids).size).toBe(ids.length);
      expect(reopen(name).map((item) => item.instanceId)).toEqual(ids);
      heatSinks += first.filter((m) => /heat-sink/.test(m.equipmentId)).length;
    }
    // Not vacuous: the saved documents really carry heat sink mounts.
    expect(heatSinks).toBeGreaterThan(50);
  });
});

describe('mount ids across repeated save, close and reopen (real UnitRepository over SQLite)', () => {
  // The property itself: load Atlas AS7-D, save it, close the database, reopen it, then save the
  // reopened unit, close, reopen again. The mount ids of the two reopens must be equal. The real
  // serializer, UnitRepository (a real SQLite file) and loader are used; nothing is mocked but the
  // equipment file reader.
  const sqliteOpen = (dbPath: string) => {
    resetSQLiteService();
    resetUnitRepository();
    getSQLiteService({ path: dbPath }).initialize();
    return getUnitRepository();
  };
  const sqliteClose = () => {
    getSQLiteService().close();
    resetSQLiteService();
    resetUnitRepository();
  };
  const saved = (state: ReturnType<typeof load>) =>
    JSON.parse(
      JSON.stringify(
        serializeCustomUnitState(state, {
          id: state.id,
          chassis: state.chassis,
          variant: state.model,
          era: Era.LATE_SUCCESSION_WARS,
        }),
      ),
    );

  it('gives the same mount ids on the first and the second reopen of Atlas AS7-D', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mount-ids-'));
    const dbPath = join(dir, 'units.db');
    try {
      const atlas = JSON.parse(
        readFileSync(
          join(
            process.cwd(),
            'public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json',
          ),
          'utf8',
        ),
      );
      // Save 1: the freshly loaded canonical unit.
      let repo = sqliteOpen(dbPath);
      const first = load(atlas);
      const created = repo.create({
        chassis: first.chassis,
        variant: first.model,
        data: saved(first),
      });
      expect(created.success).toBe(true);
      const id = (created.data as { id: string }).id;
      sqliteClose();

      // Reopen 1, then save 2: the reopened unit written back as a new version.
      repo = sqliteOpen(dbPath);
      const row1 = repo.getById(id);
      expect(row1).not.toBeNull();
      const reopened1 = new UnitLoaderService().mapToUnitState(
        parseUnit(JSON.parse(row1!.data)),
        false,
      );
      const updated = repo.update(id, { data: saved(reopened1) });
      expect(updated.success).toBe(true);
      sqliteClose();

      // Reopen 2 from what save 2 wrote.
      repo = sqliteOpen(dbPath);
      const row2 = repo.getById(id);
      expect(row2!.currentVersion).toBe(2);
      const reopened2 = new UnitLoaderService().mapToUnitState(
        parseUnit(JSON.parse(row2!.data)),
        false,
      );
      sqliteClose();

      const ids1 = reopened1.equipment.map((m) => m.instanceId);
      const ids2 = reopened2.equipment.map((m) => m.instanceId);
      expect(ids2).toEqual(ids1);
      expect(new Set(ids1).size).toBe(ids1.length);
      // Not vacuous: Atlas's heat sinks are listed as equipment in the saved document, and every
      // mount id on the reopened unit comes from the unit's content, none from a random draw.
      expect(
        reopened1.equipment.filter((m) => /heat-sink/.test(m.equipmentId))
          .length,
      ).toBeGreaterThan(0);
      expect(ids1.filter((x) => !x.startsWith('mount:'))).toEqual([]);
    } finally {
      try {
        getSQLiteService().close();
      } catch {
        // already closed
      }
      resetSQLiteService();
      resetUnitRepository();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('what a reopened unit takes from the saved document (it never takes mount ids)', () => {
  // A saved mech document names equipment by catalog id, location and slot index
  // (CustomUnitSerializer.serializeEquipment): no mount `instanceId` is written. The one field that
  // can carry a mount id is `linkedAmmo`, the editor's weapon-to-ammo link, and it is absent unless a
  // user set one. So a reopened unit's ids are session-owned, and everything that survives a reopen
  // (crit assignments, placement, record sheets, BV) resolves by position and catalog id.
  const atlas = () =>
    JSON.parse(
      readFileSync(
        join(
          process.cwd(),
          'public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json',
        ),
        'utf8',
      ),
    );
  const save = (state: ReturnType<typeof load>) =>
    JSON.parse(
      JSON.stringify(
        serializeCustomUnitState(state, {
          id: state.id,
          chassis: state.chassis,
          variant: state.model,
          era: Era.LATE_SUCCESSION_WARS,
        }),
      ),
    );
  const placement = (state: ReturnType<typeof load>) =>
    state.equipment
      .map((m) => JSON.stringify([m.equipmentId, m.location, m.slots]))
      .sort();

  it('writes no mount id into the saved document', () => {
    const state = load(atlas());
    const text = JSON.stringify(save(state));
    const ids = state.equipment.map((m) => m.instanceId);
    expect(ids.length).toBeGreaterThan(0);
    expect(ids.filter((id) => text.includes(id))).toEqual([]);
    expect(text).not.toContain('instanceId');
    expect(text).not.toContain('mount:');
  });

  it('keeps every mount where it was across the first and second reopen (crit assignments resolve by position)', () => {
    const loaded = load(atlas());
    const document1 = save(loaded);
    const reopened1 = new UnitLoaderService().mapToUnitState(
      parseUnit(document1),
      false,
    );
    const reopened2 = new UnitLoaderService().mapToUnitState(
      parseUnit(save(reopened1)),
      false,
    );
    expect(placement(reopened1)).toEqual(placement(loaded));
    expect(placement(reopened2)).toEqual(placement(loaded));
    // The saved critical-slot grid is what places them: each mount's first slot holds its own token.
    for (const mount of reopened1.equipment) {
      if (!mount.slots?.length || !mount.location) continue;
      const column = Object.entries(document1.criticalSlots).find(
        ([name]) =>
          name.replace(/\s/g, '').toLowerCase() ===
          mount.location!.replace(/\s/g, '').toLowerCase(),
      )?.[1] as (string | null)[] | undefined;
      expect(column?.[mount.slots[0]]).toBeTruthy();
    }
  });
});
