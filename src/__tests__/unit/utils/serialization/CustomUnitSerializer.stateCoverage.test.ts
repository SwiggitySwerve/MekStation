import type { ISerializedUnit } from '@/types/unit/UnitSerialization';

import { createDefaultUnitState, type UnitState } from '@/stores/unitState';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MovementEnhancementType } from '@/types/construction/MovementEnhancement';
import { TechBaseMode } from '@/types/construction/TechBaseConfiguration';
import { UnitContract } from '@/types/contracts';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';
import {
  SOURCE_ONLY_FACTS,
  serializeCustomUnitState,
} from '@/utils/serialization/CustomUnitSerializer';

type SaveCoverage =
  | { readonly savedAs: readonly (keyof ISerializedUnit | 'lamType')[] }
  | { readonly notSaved: string };

/**
 * Every BattleMech editor state key: either the saved document key(s) that
 * carry it, or why the save does not write it. Source-only facts (quirks,
 * weapon quirks, publication source) are carried from the loaded source by
 * SOURCE_ONLY_FACTS, not by a state key.
 */
const MECH_STATE_SAVE_COVERAGE: {
  readonly [K in keyof UnitState]-?: SaveCoverage;
} = {
  bvContext: {
    notSaved:
      'Load-time source snapshot; the save appends its SOURCE_ONLY_FACTS after the written keys.',
  },
  unrecoveredCriticalSlots: {
    notSaved: 'Loader-owned loss notice, rebuilt from the cells on every load.',
  },
  armActuators: { savedAs: ['criticalSlots'] },
  id: { notSaved: 'Editor instance id; the save identity supplies the id.' },
  name: { notSaved: 'Display name derived from chassis and model.' },
  chassis: { savedAs: ['chassis'] },
  clanName: { savedAs: ['clanName'] },
  model: { savedAs: ['model', 'variant'] },
  mulId: { savedAs: ['mulId'] },
  sourceDefinition: { savedAs: ['sourceDefinition'] },
  librarySave: {
    notSaved: 'Receipt of the last library save, used for dirty checks.',
  },
  role: { savedAs: ['role'] },
  fluff: { savedAs: ['fluff'] },
  crewSeats: { savedAs: ['crewSeats'] },
  year: { savedAs: ['year'] },
  rulesLevel: { savedAs: ['rulesLevel'] },
  tonnage: { savedAs: ['tonnage'] },
  techBase: { notSaved: 'Derived on load from the saved tech base mode.' },
  unitType: { savedAs: ['unitType'] },
  configuration: { savedAs: ['configuration'] },
  lamMode: {
    notSaved: 'Transient LAM operating mode; reopen starts as a Mech.',
  },
  lamType: { savedAs: ['lamType'] },
  quadVeeMode: {
    notSaved: 'Transient QuadVee operating mode; reopen starts as a Mech.',
  },
  isOmni: { savedAs: ['isOmni'] },
  baseChassisHeatSinks: { savedAs: ['baseChassisHeatSinks'] },
  techBaseMode: { savedAs: ['techBase'] },
  componentTechBases: { savedAs: ['componentTechBases'] },
  selectionMemory: {
    notSaved: 'Editor memory of choices per tech base, used when switching.',
  },
  engineType: { savedAs: ['engine'] },
  engineRating: { savedAs: ['engine', 'movement'] },
  gyroType: { savedAs: ['gyro'] },
  internalStructureType: { savedAs: ['structure'] },
  frankenStructure: { savedAs: ['structure'] },
  cockpitType: { savedAs: ['cockpit'] },
  heatSinkType: { savedAs: ['heatSinks'] },
  heatSinkCount: { savedAs: ['heatSinks'] },
  armorType: { savedAs: ['armor'] },
  armorTonnage: {
    notSaved: 'Derived on load from the armor type and allocation.',
  },
  armorAllocation: { savedAs: ['armor'] },
  enhancement: { savedAs: ['movement'] },
  jumpMP: { savedAs: ['movement'] },
  jumpJetType: { savedAs: ['movement'] },
  equipment: { savedAs: ['equipment', 'criticalSlots'] },
  isModified: { notSaved: 'Editor dirty flag.' },
  createdAt: { notSaved: 'Editor session timestamp.' },
  lastModifiedAt: { notSaved: 'Editor session timestamp.' },
};

/** Every key present, so a key added to UnitState must be added here too. */
function fullState(): Required<UnitState> {
  const base = createDefaultUnitState({
    id: '0b6f7c55-7a37-4c55-9d8c-38f3b2a6a2f4',
    name: 'Coverage Fixture',
    tonnage: 60,
    techBase: TechBase.INNER_SPHERE,
  });
  return {
    ...base,
    bvContext: {
      source: {
        id: 'coverage-source',
        chassis: 'Coverage',
        techBase: 'INNER_SPHERE',
        tonnage: 60,
      },
      equipment: [],
      types: {
        engineType: base.engineType,
        gyroType: base.gyroType,
        internalStructureType: base.internalStructureType,
        cockpitType: base.cockpitType,
        armorType: base.armorType,
        heatSinkType: base.heatSinkType,
      },
    },
    unrecoveredCriticalSlots: [],
    armActuators: {
      [MechLocation.LEFT_ARM]: { lowerArm: true, hand: false },
    },
    chassis: 'Coverage',
    clanName: 'Coverage Clan Name',
    model: 'CV-1',
    sourceDefinition: { source: 'custom', id: 'coverage-origin', version: 1 },
    librarySave: { id: 'coverage-origin', version: 1, fingerprint: 'x' },
    role: 'Brawler',
    fluff: { overview: 'Coverage.' },
    configuration: MechConfiguration.TRIPOD,
    crewSeats: [{ slotIndex: 0, name: 'Pilot', gunnery: 4, piloting: 5 }],
    lamType: 'STANDARD',
    isOmni: true,
    baseChassisHeatSinks: 4,
    techBaseMode: TechBaseMode.MIXED,
    frankenStructure: { type: 'STANDARD' },
    enhancement: MovementEnhancementType.MASC,
  };
}

function save(state: UnitState) {
  return serializeCustomUnitState(state, {
    id: 'coverage-save',
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  }) as unknown as Readonly<Record<string, unknown>>;
}

it('names every editor state key as saved or as not saved with a reason', () => {
  expect(Object.keys(fullState()).sort()).toEqual(
    Object.keys(MECH_STATE_SAVE_COVERAGE).sort(),
  );
  for (const coverage of Object.values(MECH_STATE_SAVE_COVERAGE)) {
    if ('notSaved' in coverage) expect(coverage.notSaved).not.toBe('');
  }
});

it('writes every saved key from editor state alone, without a loaded source', () => {
  const saved = save({ ...fullState(), bvContext: undefined });
  const missing = Object.entries(MECH_STATE_SAVE_COVERAGE).flatMap(
    ([key, coverage]) =>
      'savedAs' in coverage
        ? coverage.savedAs
            .filter((field) => saved[field] === undefined)
            .map((field) => `${key} -> ${field}`)
        : [],
  );
  expect(missing).toEqual([]);
});

it('never revives a loaded source value for a field the editor cleared', () => {
  const state = fullState();
  const saved = save({
    ...state,
    bvContext: {
      ...state.bvContext,
      source: {
        ...state.bvContext.source,
        clanName: 'Source Clan Name',
        role: 'Sniper',
        crewSeats: [{ slotIndex: 0, name: 'Old', gunnery: 3, piloting: 3 }],
        componentTechBases: { chassis: 'CLAN' },
        lamType: 'BIMODAL',
        sourceDefinition: { source: 'canonical', id: 'old-origin' },
        fluff: { overview: 'Old.' },
      },
    },
    clanName: '',
    role: '',
    crewSeats: undefined,
    techBaseMode: TechBaseMode.INNER_SPHERE,
    lamType: undefined,
    sourceDefinition: undefined,
    fluff: undefined,
  });
  expect({
    clanName: saved.clanName,
    role: saved.role,
    crewSeats: saved.crewSeats,
    componentTechBases: saved.componentTechBases,
    lamType: saved.lamType,
    sourceDefinition: saved.sourceDefinition,
    fluff: saved.fluff,
  }).toEqual({});
});

it('appends source-only facts after the written keys and never library metadata', () => {
  const state = fullState();
  const withoutSource = save({ ...state, bvContext: undefined });
  const saved = save({
    ...state,
    bvContext: {
      ...state.bvContext,
      // A library open carries the record's version and timestamps.
      source: {
        ...state.bvContext.source,
        quirks: ['command_mech'],
        source: 'TR:3039',
        currentVersion: 3,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      },
    },
  });
  expect(Object.keys(saved)).toEqual([
    ...Object.keys(withoutSource),
    'quirks',
    'source',
  ]);
});

/**
 * BattleMech contract keys the mech writer neither writes nor carries from the
 * loaded source. Carrying one would save a stale fact after the editor changes
 * what it describes, or a fact no BattleMech has.
 */
const NOT_CARRIED_BY_MECH_WRITER: Readonly<Record<string, string>> = {
  omniPodHeatSinks:
    'Aerospace/vehicle pod sink count; a mech carries pod flags on mounts.',
  baseChassisTurretWeight: 'Vehicle Omni turret allowance; no mech turret.',
  baseChassisTurret2Weight: 'Vehicle Omni second turret allowance.',
  baseChassisSponsonPintleWeight: 'Vehicle Omni sponson/pintle allowance.',
  baseChassisFireConWeight: 'Vehicle Omni fire-control allowance.',
  transporters: 'Vehicle/aerospace transport bays.',
  fuel: 'Support vehicle tons or aerospace points.',
  fuelType: 'Support vehicle fuel type.',
  isTrailer: 'Vehicle trailer flag.',
  clanEngine: 'Derived from the engine type the writer owns.',
  structuralTechRating: 'BLK rating derived from the written structure.',
  engineTechRating: 'BLK rating derived from the written engine.',
  armorTechRating: 'BLK rating derived from the written armor.',
  internalType: 'BLK structure code derived from the written structure.',
};

it('names every BattleMech contract key as written, source-only or not carried', () => {
  const contractKeys = Object.keys(UnitContract.options[0].shape);
  const written = new Set(
    Object.keys(save({ ...fullState(), bvContext: undefined })),
  );
  const sourceOnly = new Set<string>(SOURCE_ONLY_FACTS);
  const notCarried = new Set(Object.keys(NOT_CARRIED_BY_MECH_WRITER));
  const unclassified = contractKeys.filter(
    (key) =>
      [written, sourceOnly, notCarried].filter((list) => list.has(key))
        .length !== 1,
  );
  expect(unclassified).toEqual([]);
  expect(
    [...sourceOnly, ...notCarried].filter((key) => !contractKeys.includes(key)),
  ).toEqual([]);
});

it('saves the editor construction, never a stale construction fact from the source', () => {
  const state = fullState();
  const sentinel = { stale: true };
  const saved = save({
    ...state,
    bvContext: {
      ...state.bvContext,
      // The source says Clan engine; the editor state has an IS engine.
      source: {
        ...state.bvContext.source,
        ...Object.fromEntries(
          Object.keys(NOT_CARRIED_BY_MECH_WRITER).map((key) => [key, sentinel]),
        ),
        clanEngine: true,
      },
    },
  });
  expect(saved.clanEngine).toBeUndefined();
  expect(
    Object.keys(NOT_CARRIED_BY_MECH_WRITER).filter(
      (key) => saved[key] !== undefined,
    ),
  ).toEqual([]);
});
