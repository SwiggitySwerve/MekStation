import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { IRawSerializedUnit } from '@/services/units/unitLoaderService/types';
import type { UnitState } from '@/stores/unitState';

import { restoreLibraryVersionToDraft } from '@/components/customizer/tabs/restoreLibraryVersionToDraft';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import {
  parseUnit,
  UnitLoaderService,
} from '@/services/units/unitLoaderService';
import { getCriticalSlotsForLocation } from '@/services/units/unitLoaderService/criticalSlotEquipment';
import { parseCriticalSlotToken } from '@/services/units/unitLoaderService/equipmentResolution';
import { createLibrarySaveReceipt } from '@/stores/unit/unitEditSnapshot';
import { clearAllStores, registerStore } from '@/stores/unitStoreRegistry';
import { createUnitStore } from '@/stores/useUnitStore';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { projectCustomCombatSnapshot } from '@/types/contracts/CustomCombatSnapshot';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment';
import { Era } from '@/types/temporal/Era';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';
import { getMountedRearSuffix } from '@/utils/serialization/CustomUnitSerializer.sourceCells';

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { getVersion: jest.fn() },
}));
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

const LOCUST = '6-dark-age/standard/Locust IIC 9.json';
const TURTLE = '5-civil-war/standard/Great Turtle GTR-2.json';
const ATLAS = '2-star-league/standard/Atlas AS7-D.json';

function source(path: string): IRawSerializedUnit {
  return parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', path),
        'utf8',
      ),
    ),
  );
}

function load(path: string): UnitState {
  return new UnitLoaderService().mapToUnitState(source(path), true);
}

function loadExplicitRearAtlas(): UnitState {
  const atlas = source(ATLAS);
  return new UnitLoaderService().mapToUnitState(
    {
      ...atlas,
      equipment: atlas.equipment?.map((mount) =>
        mount.id === 'medium-laser' && mount.location === 'CENTER_TORSO'
          ? { ...mount, isRearMounted: true }
          : mount,
      ),
    },
    true,
  );
}

function save(state: UnitState) {
  return serializeCustomUnitState(state, {
    id: 'custom-save-loss-test',
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
}

function coldReopen(document: unknown): UnitState {
  return new UnitLoaderService().mapToUnitState(
    parseUnit(JSON.parse(JSON.stringify(document))),
    false,
  );
}

function cells(
  document: Pick<IRawSerializedUnit, 'criticalSlots'>,
  location: MechLocation,
) {
  return getCriticalSlotsForLocation(document.criticalSlots, location) ?? [];
}

function reopenedSource(document: unknown): IRawSerializedUnit {
  const raw = coldReopen(document).bvContext?.source;
  if (!raw) throw new Error('Cold reopen must retain the saved source');
  return raw;
}

function expectLocustEngineCells(
  document: Pick<IRawSerializedUnit, 'criticalSlots'>,
) {
  for (const location of [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO]) {
    expect(cells(document, location).slice(0, 4)).toEqual(
      Array(4).fill('Fusion Engine'),
    );
  }
  expect(cells(document, MechLocation.CENTER_TORSO).slice(0, 3)).toEqual(
    Array(3).fill('Fusion Engine'),
  );
  expect(cells(document, MechLocation.CENTER_TORSO).slice(9, 12)).toEqual(
    Array(3).fill('Fusion Engine'),
  );
}

function expectTurtleArmor(
  document: Pick<IRawSerializedUnit, 'criticalSlots'>,
) {
  for (const location of [
    MechLocation.FRONT_LEFT_LEG,
    MechLocation.FRONT_RIGHT_LEG,
    MechLocation.REAR_LEFT_LEG,
    MechLocation.REAR_RIGHT_LEG,
  ]) {
    expect(cells(document, location)[0]).toBe('Hip (ARMORED)');
  }
  for (const location of [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO]) {
    expect(cells(document, location)[0]).toBe('Life Support (ARMORED)');
  }
  expect(cells(document, MechLocation.CENTER_TORSO).slice(0, 7)).toEqual([
    'Fusion Engine (ARMORED)',
    'Fusion Engine (ARMORED)',
    'Fusion Engine (ARMORED)',
    'Gyro (ARMORED)',
    'Gyro (ARMORED)',
    'Cockpit (ARMORED)',
    'Sensors (ARMORED)',
  ]);
  expect(cells(document, MechLocation.HEAD).slice(0, 2)).toEqual([
    'Sensors (ARMORED)',
    'Sensors (ARMORED)',
  ]);
  for (const slot of [5, 6, 7]) {
    expect(cells(document, MechLocation.RIGHT_TORSO)[slot]).toMatch(
      / \(ARMORED\)$/,
    );
  }
  expect(cells(document, MechLocation.LEFT_TORSO)[8]).toMatch(/ \(ARMORED\)$/);
  expect(cells(document, MechLocation.LEFT_TORSO)[9]).toMatch(/ \(ARMORED\)$/);
  expect(cells(document, MechLocation.HEAD)[5]).toMatch(/ \(ARMORED\)$/);
}

it('cold saves and reopens the Locust IIC 9 native engine cells', () => {
  const document = save(load(LOCUST));
  expectLocustEngineCells(document);
  expectLocustEngineCells(reopenedSource(document));
});

it('rejects an engine-dropping writer mutant through the same cold boundary', () => {
  const document = save(load(LOCUST));
  const mutant = {
    ...document,
    criticalSlots: {
      ...document.criticalSlots,
      [MechLocation.LEFT_TORSO]: document.criticalSlots[
        MechLocation.LEFT_TORSO
      ].map((token, slot) => (slot < 4 ? null : token)),
    },
  };
  expect(() => expectLocustEngineCells(reopenedSource(mutant))).toThrow();
});

it.each([
  { engineType: EngineType.STANDARD },
  { engineRating: 300 },
  { engineRating: 0 },
  { tonnage: 30 },
  { configuration: MechConfiguration.QUAD },
  { gyroType: GyroType.COMPACT },
  { cockpitType: CockpitType.TORSO_MOUNTED },
])('does not inherit old engine cells after configuration edit %j', (patch) => {
  const document = save({ ...load(LOCUST), ...patch });
  expect(Object.values(document.criticalSlots).flat()).not.toContain(
    'Fusion Engine',
  );
});

it('rejects a writer mutant that drops the unchanged-engine guard', () => {
  const state = { ...load(LOCUST), engineType: EngineType.STANDARD };
  const document = save(state);
  const assertNoStaleEngine = (
    raw: Pick<IRawSerializedUnit, 'criticalSlots'>,
  ) =>
    expect(Object.values(raw.criticalSlots ?? {}).flat()).not.toContain(
      'Fusion Engine',
    );
  assertNoStaleEngine(document);
  // The unguarded writer copies old native engine cells after changing type.
  const mutant = {
    ...document,
    criticalSlots: {
      ...document.criticalSlots,
      [MechLocation.LEFT_TORSO]: [
        'Fusion Engine',
        'Fusion Engine',
        'Fusion Engine',
        'Fusion Engine',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
  };
  expect(() => assertNoStaleEngine(reopenedSource(mutant))).toThrow();
});

it('requires an exact engine system identity, never an engine substring', () => {
  const state = load(LOCUST);
  if (!state.bvContext) throw new Error('Fixture must have source context');
  const document = save({
    ...state,
    bvContext: {
      ...state.bvContext,
      source: {
        ...state.bvContext.source,
        criticalSlots: { LEFT_TORSO: ['Fusion Engine Repair Kit'] },
      },
    },
  });
  expect(cells(document, MechLocation.LEFT_TORSO)[0] ?? null).toBeNull();
});

it('keeps a current mounted cell instead of overwriting it with source engine evidence', () => {
  const state = load(LOCUST);
  const mount = state.equipment[0];
  expect(mount).toBeDefined();
  const document = save({
    ...state,
    equipment: [
      {
        ...mount,
        location: MechLocation.LEFT_TORSO,
        slots: [0],
        name: 'Current Mount',
      },
    ],
  });
  expect(cells(document, MechLocation.LEFT_TORSO)[0]).toBe('Current Mount');
});

it('cold saves and reopens Great Turtle armored mounts and systems', () => {
  const document = save(load(TURTLE));
  expectTurtleArmor(document);
  expectTurtleArmor(reopenedSource(document));
});

it.each(['Mad Cat Mk IV A.json', 'Mad Cat Mk IV (Prime).json'])(
  'preserves the armored gyro on A2-only %s',
  (file) => {
    const state = load(`6-dark-age/experimental/${file}`);
    const document = save(state);
    for (const raw of [document, reopenedSource(document)]) {
      expect(cells(raw, MechLocation.CENTER_TORSO).slice(3, 7)).toEqual(
        Array(4).fill('Gyro (ARMORED)'),
      );
    }
  },
);

it('rejects an armor-dropping writer mutant through the same cold boundary', () => {
  const document = save(load(TURTLE));
  const mutant = {
    ...document,
    criticalSlots: Object.fromEntries(
      Object.entries(document.criticalSlots).map(([location, entries]) => [
        location,
        entries.map((token) => token?.replace(/ \(ARMORED\)$/, '') ?? null),
      ]),
    ),
  };
  expect(() => expectTurtleArmor(reopenedSource(mutant))).toThrow();
});

it('does not transfer source armor to a replacement mounted identity', () => {
  const state = load(TURTLE);
  const weapon = state.equipment.find(
    (item) =>
      item.location === MechLocation.LEFT_TORSO && item.slots?.includes(9),
  );
  expect(weapon).toBeDefined();
  const document = save({
    ...state,
    equipment: state.equipment.map((item) =>
      item === weapon
        ? { ...item, equipmentId: 'medium-laser', name: 'Medium Laser' }
        : item,
    ),
  });
  expect(cells(document, MechLocation.LEFT_TORSO)[9]).toBe('Medium Laser');
});

it('does not transfer armored cockpit/gyro source cells to changed systems', () => {
  const document = save({
    ...load(TURTLE),
    cockpitType: CockpitType.STANDARD,
    gyroType: GyroType.STANDARD,
  });
  const torso = cells(document, MechLocation.CENTER_TORSO);
  expect(torso[3] ?? null).toBeNull();
  expect(torso[5] ?? null).toBeNull();
  expect(cells(document, MechLocation.LEFT_TORSO)[0] ?? null).toBeNull();
});

it('cold reopens each Atlas rear mount with its boolean and cell marker', () => {
  const state = loadExplicitRearAtlas();
  const rear = state.equipment.filter((mount) => mount.isRearMounted);
  expect(rear).toHaveLength(2);
  const document = save(state);
  const reopened = coldReopen(document);
  expect(
    reopened.equipment.filter((mount) => mount.isRearMounted),
  ).toHaveLength(2);
  for (const mount of rear) {
    if (!mount.location) throw new Error('Rear fixture must be allocated');
    for (const slot of mount.slots ?? []) {
      expect(cells(document, mount.location)[slot]).toMatch(/ \(R\)$/);
    }
  }
});

it('keeps canonical Atlas source rear markers through the current load-side false fallback', () => {
  const document = save(load(ATLAS));
  for (const raw of [document, reopenedSource(document)]) {
    expect(cells(raw, MechLocation.CENTER_TORSO).slice(10, 12)).toEqual(
      Array(2).fill('Medium Laser (R)'),
    );
  }
});

it.each(['moved', 'replaced', 'removed'] as const)(
  'rejects a stale rear marker for a %s mount',
  (edit) => {
    const state = load(ATLAS);
    const original = state.equipment.find(
      (mount) =>
        mount.location === MechLocation.CENTER_TORSO &&
        mount.slots?.includes(10),
    );
    if (!original) throw new Error('Expected Atlas center torso laser');
    const mount =
      edit === 'moved'
        ? { ...original, location: MechLocation.LEFT_ARM, slots: [4] }
        : edit === 'replaced'
          ? { ...original, equipmentId: 'small-laser', name: 'Small Laser' }
          : { ...original, instanceId: 'replacement-instance' };
    if (!mount.location) throw new Error('Expected allocated mount');
    const location = mount.location;
    const slot = mount.slots?.[0] ?? 0;
    const assertGuard = (suffix: string) => expect(suffix).toBe('');
    assertGuard(
      getMountedRearSuffix(state, mount, location, slot, 'Medium Laser (R)'),
    );
    // Deliberately drop source-identity/position/instance guards from the writer.
    const unguardedMutant = parseCriticalSlotToken('Medium Laser (R)')
      .isRearMounted
      ? ' (R)'
      : '';
    expect(() => assertGuard(unguardedMutant)).toThrow();
  },
);

it('honors an explicit live rear=false edit over a previously rear=true source', () => {
  const state = loadExplicitRearAtlas();
  const document = save({
    ...state,
    equipment: state.equipment.map((mount) => ({
      ...mount,
      isRearMounted: false,
    })),
  });
  expect(cells(document, MechLocation.CENTER_TORSO).slice(10, 12)).toEqual(
    Array(2).fill('Medium Laser'),
  );
  expect(
    coldReopen(document).equipment.some((mount) => mount.isRearMounted),
  ).toBe(false);
});

it('rejects a rear-dropping writer mutant through the same cold boundary', () => {
  const document = save(loadExplicitRearAtlas());
  const mutant = {
    ...document,
    equipment: document.equipment.map((mount) => ({
      ...mount,
      isRearMounted: false,
    })),
    criticalSlots: Object.fromEntries(
      Object.entries(document.criticalSlots).map(([location, entries]) => [
        location,
        entries.map((token) => token?.replace(/ \(R\)$/, '') ?? null),
      ]),
    ),
  };
  expect(() =>
    expect(
      coldReopen(mutant).equipment.filter((mount) => mount.isRearMounted),
    ).toHaveLength(2),
  ).toThrow();
});

it.each([true, false])(
  'writes the current rear flag %s even when source cells differ',
  (isRearMounted) => {
    const state = load(TURTLE);
    const weapon = state.equipment.find(
      (item) =>
        item.location === MechLocation.LEFT_TORSO && item.slots?.includes(9),
    );
    if (!weapon) throw new Error('Expected mounted Turtle laser');
    const changed = { ...weapon, isRearMounted };
    const document = save({
      ...state,
      equipment: state.equipment.map((item) =>
        item === weapon ? changed : item,
      ),
    });
    expect(cells(document, MechLocation.LEFT_TORSO)[9]).toBe(
      `${weapon.name}${isRearMounted ? ' (R)' : ''} (ARMORED)`,
    );
    const reopened = coldReopen(document).equipment.find(
      (item) => item.location === weapon.location && item.slots?.includes(9),
    );
    expect(reopened?.isRearMounted).toBe(isRearMounted);
  },
);

it('does not rebuild missing engine cells or armored state when opening an old save', () => {
  const original = source(LOCUST);
  const legacy = {
    ...original,
    criticalSlots: {
      LEFT_ARM: [
        'Shoulder',
        'Upper Arm',
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ],
    },
  };
  expect(reopenedSource(legacy).criticalSlots).toEqual(legacy.criticalSlots);
  expect(cells(reopenedSource(legacy), MechLocation.LEFT_TORSO)).toEqual([]);
  const turtle = source(TURTLE);
  const unarmoredLegacy = {
    ...turtle,
    criticalSlots: Object.fromEntries(
      Object.entries(turtle.criticalSlots ?? {}).map(([location, entries]) => [
        location,
        entries.map((token) => token?.replace(/ \(ARMORED\)$/, '') ?? null),
      ]),
    ),
  };
  expect(reopenedSource(unarmoredLegacy).criticalSlots).toEqual(
    unarmoredLegacy.criticalSlots,
  );
});

// Catalog files omit the Omni declaration an MTF import supplies
// (MTFParserService.ts `isOmni: header.isOmni`), so declare it as an import would.
const NAGA = '3-succession-wars/advanced/Naga II A.json';

it('cold saves and reopens Naga II A quirks, weapon quirks and publication source', () => {
  const original: IRawSerializedUnit = { ...source(NAGA), isOmni: true };
  const facts = {
    quirks: original.quirks,
    weaponQuirks: original.weaponQuirks,
    source: original.source,
  };
  expect(facts).toEqual({
    quirks: ['ext_twist', 'bad_rep_clan'],
    weaponQuirks: expect.objectContaining({
      'LA:2:CLLBXAC20': ['stable_weapon'],
    }),
    source: expect.any(String),
  });
  const podMounts = (unit: UnitState) =>
    unit.equipment
      .filter((mount) => mount.isOmniPodMounted)
      .map(({ equipmentId, location, slots }) => ({
        equipmentId,
        location,
        slots,
      }));
  const state = new UnitLoaderService().mapToUnitState(original, true);
  expect(podMounts(state)).toHaveLength(9);

  const saved = save(state);
  expect(saved).toMatchObject(facts);
  const reopened = coldReopen(saved);
  expect(reopened.bvContext?.source).toMatchObject(facts);
  expect(reopened.isOmni).toBe(true);
  expect(podMounts(reopened)).toEqual(podMounts(state));

  // A later edit and a second save keep the reopened facts.
  const edited = save({
    ...reopened,
    heatSinkCount: reopened.heatSinkCount + 1,
  });
  expect(edited).toMatchObject({
    ...facts,
    heatSinks: { count: state.heatSinkCount + 1 },
  });
  expect(coldReopen(edited).bvContext?.source).toMatchObject(facts);
});

function nagaStore() {
  return createUnitStore(
    new UnitLoaderService().mapToUnitState(
      { ...source(NAGA), isOmni: true },
      true,
    ),
  );
}

function mountAt(state: UnitState, location: MechLocation, slot: number) {
  const mount = state.equipment.find(
    (item) => item.location === location && item.slots?.includes(slot),
  );
  if (!mount) throw new Error(`No mount at ${location} ${slot}`);
  return mount;
}

function savedWeaponQuirks(state: UnitState) {
  return (save(state) as { weaponQuirks?: Record<string, string[]> })
    .weaponQuirks;
}

// MegaMek's load rule (Entity.java:17256-17315). Dropping a moved weapon's
// entry deliberately diverges from MegaMekLab, which re-keys it on save.
describe('weapon quirks stay only where their weapon sits', () => {
  it('drops the quirk of a removed weapon and keeps the others', () => {
    const store = nagaStore();
    const before = savedWeaponQuirks(store.getState());
    expect(before).toMatchObject({ 'LA:2:CLLBXAC20': ['stable_weapon'] });
    store
      .getState()
      .removeEquipment(
        mountAt(store.getState(), MechLocation.LEFT_ARM, 2).instanceId,
      );
    const after = savedWeaponQuirks(store.getState());
    expect(after).not.toHaveProperty(['LA:2:CLLBXAC20']);
    const { 'LA:2:CLLBXAC20': _removed, ...others } = before ?? {};
    expect(after).toEqual(others);
  });

  it('drops the quirk of a moved weapon and never re-keys it (deliberate divergence from MML)', () => {
    const store = nagaStore();
    const before = savedWeaponQuirks(store.getState()) ?? {};
    expect(before).toHaveProperty(['RA:10:CLERLargeLaser']);
    const laser = mountAt(store.getState(), MechLocation.RIGHT_ARM, 10);
    store
      .getState()
      .updateEquipmentLocation(laser.instanceId, MechLocation.RIGHT_ARM, [5]);
    expect(
      mountAt(store.getState(), MechLocation.RIGHT_ARM, 5).instanceId,
    ).toBe(laser.instanceId);
    const after = savedWeaponQuirks(store.getState()) ?? {};
    expect(after).not.toHaveProperty(['RA:10:CLERLargeLaser']);
    expect(Object.keys(after).filter((key) => key.startsWith('RA:5:'))).toEqual(
      [],
    );
    const { 'RA:10:CLERLargeLaser': _moved, ...others } = before;
    expect(after).toEqual(others);
  });

  it('drops the quirk when a different weapon takes the quirked cells', () => {
    const store = nagaStore();
    store
      .getState()
      .removeEquipment(
        mountAt(store.getState(), MechLocation.LEFT_ARM, 2).instanceId,
      );
    const laser = mountAt(store.getState(), MechLocation.RIGHT_ARM, 10);
    store
      .getState()
      .updateEquipmentLocation(laser.instanceId, MechLocation.LEFT_ARM, [2]);
    expect(
      mountAt(store.getState(), MechLocation.LEFT_ARM, 2).equipmentId,
    ).toBe(laser.equipmentId);
    expect(savedWeaponQuirks(store.getState())).not.toHaveProperty([
      'LA:2:CLLBXAC20',
    ]);
  });

  it.each([
    ['1-age-of-war/standard/Trooper TP-1R.json', 4],
    ['1-age-of-war/standard/Crossbow CRS-6B.json', 2],
  ] as const)(
    'keeps every quirk of %s when the unit switches from Inner Sphere to Clan',
    (path, entries) => {
      const original = source(path);
      expect(Object.keys(original.weaponQuirks ?? {})).toHaveLength(entries);
      const store = createUnitStore(
        new UnitLoaderService().mapToUnitState(original, true),
      );
      const mounts = (state: UnitState) =>
        state.equipment.map(({ equipmentId, location, slots }) => ({
          equipmentId,
          location,
          slots,
        }));
      const before = mounts(store.getState());
      store.getState().setTechBaseMode(TechBaseMode.CLAN);
      expect(store.getState().techBaseMode).toBe(TechBaseMode.CLAN);
      // The weapons never moved; only the unit's tech base changed.
      expect(mounts(store.getState())).toEqual(before);
      expect(savedWeaponQuirks(store.getState())).toEqual(
        original.weaponQuirks,
      );
    },
  );

  // The key's name owns its side (CLFlamer.java:57-59 names only CLFlamer and
  // Clan Flamer), so a Clan twin in the same cells is not the named weapon.
  it.each([
    [
      '1-age-of-war/standard/Trooper TP-1R.json',
      TechBaseMode.MIXED,
      MechLocation.CENTER_TORSO,
      10,
      'CT:10:Flamer',
      'clan-flamer',
      TechBase.CLAN,
    ],
    [
      '1-age-of-war/standard/Trooper TP-1R.json',
      TechBaseMode.INNER_SPHERE,
      MechLocation.RIGHT_ARM,
      2,
      'RA:2:Machine Gun',
      'clan-machine-gun',
      TechBase.CLAN,
    ],
    [
      NAGA,
      undefined,
      MechLocation.LEFT_ARM,
      2,
      'LA:2:CLLBXAC20',
      'lb-20-x-ac',
      TechBase.INNER_SPHERE,
    ],
  ] as const)(
    "drops %s %s %s %i (%s) when its cells hold the other side's %s",
    (path, mode, location, slot, key, twin, twinTechBase) => {
      const store = createUnitStore(
        new UnitLoaderService().mapToUnitState(
          { ...source(path), isOmni: path === NAGA },
          true,
        ),
      );
      if (mode) store.getState().setTechBaseMode(mode);
      expect(savedWeaponQuirks(store.getState())).toHaveProperty([key]);
      expect(getEquipmentLookupService().getById(twin)).toBeDefined();
      const mount = mountAt(store.getState(), location, slot);
      // Same cells and slots, the other side's item.
      store.setState({
        equipment: store
          .getState()
          .equipment.map((item) =>
            item.instanceId === mount.instanceId
              ? { ...item, equipmentId: twin, techBase: twinTechBase }
              : item,
          ),
      });
      expect(savedWeaponQuirks(store.getState())).not.toHaveProperty([key]);
    },
  );

  // Entity.java:17284-17287: only a weapon or club takes a weapon quirk. The
  // Streak SRM 6 ammo bin carries its weapon's id, so the id alone would match.
  it('drops a weapon quirk keyed to a cell that holds ammunition', () => {
    const original = source(NAGA);
    const state = new UnitLoaderService().mapToUnitState(
      {
        ...original,
        isOmni: true,
        weaponQuirks: {
          ...(original.weaponQuirks as Record<string, string[]>),
          'LT:4:CLStreakSRM6': ['stable_weapon'],
        },
      },
      true,
    );
    const bin = mountAt(state, MechLocation.LEFT_TORSO, 4);
    expect(bin).toMatchObject({
      equipmentId: 'clan-streak-srm-6',
      category: EquipmentCategory.AMMUNITION,
    });
    const saved = savedWeaponQuirks(state);
    expect(saved).not.toHaveProperty(['LT:4:CLStreakSRM6']);
    expect(saved).toEqual(original.weaponQuirks);
  });

  // KNOWN DIVERGENCE, pinned on purpose. MegaMek 48fcb2f64 drops this entry on
  // load: the large shield is F_SHIELD without F_CLUB, so it is "not a weapon"
  // (Entity.java:17284-17287). The writer cannot tell clubs from other
  // Miscellaneous items and excludes only ammunition, so it keeps the entry.
  // Per-item Java weapon/club facts should flip this test deliberately.
  it('keeps Slagmaiden SLG-X LA:4:ISLargeShield, which Java drops (known divergence)', () => {
    const original = source('5-civil-war/standard/Slagmaiden SLG-X.json');
    expect(original.weaponQuirks).toHaveProperty(['LA:4:ISLargeShield']);
    const saved = savedWeaponQuirks(
      new UnitLoaderService().mapToUnitState(original, true),
    );
    expect(saved).toHaveProperty(
      ['LA:4:ISLargeShield'],
      (original.weaponQuirks as Record<string, string[]>)['LA:4:ISLargeShield'],
    );
  });

  it('leaves no orphaned key after restoring an older version with another layout', async () => {
    const store = nagaStore();
    const draftId = store.getState().id;
    registerStore(store);
    try {
      store.setState({
        librarySave: createLibrarySaveReceipt(store.getState(), {
          id: 'library-naga',
          version: 2,
        }),
      });
      // Version 1 of the library unit had no LA LB 20-X AC.
      const older = nagaStore();
      older
        .getState()
        .removeEquipment(
          mountAt(older.getState(), MechLocation.LEFT_ARM, 2).instanceId,
        );
      jest.mocked(customUnitApiService.getVersion).mockResolvedValue({
        version: 1,
        data: JSON.parse(JSON.stringify(save(older.getState()))),
      } as Awaited<ReturnType<typeof customUnitApiService.getVersion>>);
      await restoreLibraryVersionToDraft({
        store,
        draftId,
        libraryId: 'library-naga',
        version: 1,
      });
      // The restored draft keeps the current version's loaded source.
      expect(store.getState().bvContext?.source.weaponQuirks).toHaveProperty([
        'LA:2:CLLBXAC20',
      ]);
      expect(savedWeaponQuirks(store.getState())).not.toHaveProperty([
        'LA:2:CLLBXAC20',
      ]);
    } finally {
      clearAllStores();
    }
  });
});

// Deliberate recorded-payload change (S1, parity/s1-mech-serializer-spread):
// a custom mech saved from a quirked canon unit now records its unit quirks in
// the GameCreated combat snapshot. Java plays with quirks; the snapshot still
// omits weapon quirks and the publication source.
it('records unit quirks, not weapon quirks or source, in the combat snapshot', () => {
  const original = source('2-star-league/advanced/Sentinel STN-3L.json');
  expect(original).toMatchObject({
    quirks: ['imp_com'],
    weaponQuirks: { 'RT:0:ISStreakSRM2': ['ammo_feed_problems'] },
    source: 'TR:3050,TR:SW',
  });
  const saved = save(new UnitLoaderService().mapToUnitState(original, true));
  expect(saved).toMatchObject({
    weaponQuirks: original.weaponQuirks,
    source: original.source,
  });
  const snapshot = projectCustomCombatSnapshot(
    JSON.parse(JSON.stringify(saved)),
  );
  expect(snapshot).not.toBeNull();
  expect(snapshot?.quirks).toEqual(['imp_com']);
  expect(snapshot).not.toHaveProperty('weaponQuirks');
  expect(snapshot).not.toHaveProperty('source');
});
