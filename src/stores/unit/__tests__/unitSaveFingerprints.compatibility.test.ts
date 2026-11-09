import type { UnitState } from '@/stores/unitState';

import { stringifyUnitSaveFingerprint } from '@/stores/unitSaveFingerprints';
import {
  clearAllStores,
  getUnitStore,
  hydrateOrCreateUnit,
} from '@/stores/unitStoreRegistry';
import { CockpitType } from '@/types/construction/CockpitType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { TechBase } from '@/types/enums/TechBase';
import { MechConfiguration } from '@/types/unit/BattleMechInterfaces';

import { getUnitEditHistory } from '../unitEditHistory';
import {
  getEditableUnitSnapshot,
  getUnitDraftFingerprint,
  getUnitEditFingerprint,
  getUnitLibraryFingerprint,
  recordUnitLibrarySave,
} from '../unitEditSnapshot';
import { createUnitStore } from '../useUnitStore';
import fixture from './fixtures/unit-save-fingerprints-7c8579e19.json';

beforeEach(() => {
  clearAllStores();
  localStorage.clear();
});
afterEach(() => clearAllStores());

it.each(fixture.cases)(
  'loads the literal main draft and fingerprint bytes: $name',
  (sample) => {
    // This is captured output from the old implementation, not regenerated expectations.
    const envelope = JSON.parse(sample.rawDraft) as {
      state: UnitState;
      version: number;
    };
    const state = envelope.state;
    expect(getUnitEditFingerprint(state)).toBe(sample.editFingerprint);
    expect(getUnitDraftFingerprint(state)).toBe(sample.draftFingerprint);
    expect(getUnitLibraryFingerprint(state)).toBe(sample.libraryFingerprint);
    const key = `megamek-unit-${state.id}`;
    localStorage.setItem(key, sample.rawDraft);
    const store = hydrateOrCreateUnit(state.id, {
      id: state.id,
      name: 'Fallback',
      tonnage: 20,
      techBase: TechBase.CLAN,
    });
    expect(getUnitStore(state.id)).toBe(store);
    expect(store.getState().librarySave).toEqual(state.librarySave);
    // Main already merges a missing optional role with its empty-string default.
    // Characterize that loader behavior; extraction must not silently repair it.
    const hydrated = { ...state, role: state.role ?? '' };
    expect(store.getState().role).toBe(hydrated.role);
    expect(getUnitEditFingerprint(store.getState())).toBe(
      getUnitEditFingerprint(hydrated),
    );
    expect(getUnitDraftFingerprint(store.getState())).toBe(
      getUnitDraftFingerprint(hydrated),
    );
    expect(getUnitLibraryFingerprint(store.getState())).toBe(
      sample.libraryFingerprint,
    );
    expect(store.getState().librarySave?.fingerprint).toBe(
      sample.libraryFingerprint,
    );
    expect(store.getState().librarySave?.draftFingerprint).toBe(
      sample.draftFingerprint,
    );
    expect(store.getState().isModified).toBe(false);

    const history = getUnitEditHistory(store);
    expect(history.getState().canUndo).toBe(false);
    store.getState().setYear(state.year + 1);
    expect(store.getState().isModified).toBe(true);
    history.getState().undo();
    expect(store.getState().isModified).toBe(state.role === undefined);
    expect(getUnitDraftFingerprint(store.getState())).toBe(
      getUnitDraftFingerprint(hydrated),
    );
    expect(store.getState().librarySave).toEqual(state.librarySave);
    recordUnitLibrarySave(
      store,
      { id: 'custom-stored-fixture', version: 3 },
      store.getState(),
    );
    expect(store.getState().librarySave).toEqual({
      ...state.librarySave,
      draftFingerprint: getUnitDraftFingerprint(hydrated),
    });
    clearAllStores();
    expect(getUnitStore(state.id)).toBeUndefined();
    expect(localStorage.getItem(key)).not.toBeNull();
  },
);

it('normalizes regenerated equipment IDs and links while retaining exact edit identity', () => {
  const sample = fixture.cases.find(
    (entry) => entry.name === 'linked-equipment',
  );
  if (!sample)
    throw new Error('Missing linked-equipment compatibility fixture');
  const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
  const remapped = {
    ...state,
    equipment: state.equipment.map((item) => ({
      ...item,
      instanceId: `new-${item.instanceId}`,
      linkedAmmoId: item.linkedAmmoId ? `new-${item.linkedAmmoId}` : undefined,
    })),
  };
  expect(getUnitEditFingerprint(remapped)).not.toBe(sample.editFingerprint);
  expect(getUnitDraftFingerprint(remapped)).toBe(sample.draftFingerprint);
  expect(getUnitLibraryFingerprint(remapped)).toBe(sample.libraryFingerprint);
  expect(
    getUnitDraftFingerprint({
      ...remapped,
      armorTonnage: state.armorTonnage + 0.5,
    }),
  ).not.toBe(sample.draftFingerprint);
  expect(
    getUnitLibraryFingerprint({
      ...remapped,
      sourceDefinition: undefined,
      fluff: state.fluff && { ...state.fluff },
    }),
  ).toBe(sample.libraryFingerprint);
});

it.each(fixture.cases)(
  'absent crewSeats keeps the literal fingerprint bytes: $name',
  (sample) => {
    const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
    const absent = { ...state, crewSeats: undefined };
    expect(getUnitEditFingerprint(absent)).toBe(sample.editFingerprint);
    expect(getUnitDraftFingerprint(absent)).toBe(sample.draftFingerprint);
    expect(getUnitLibraryFingerprint(absent)).toBe(sample.libraryFingerprint);
  },
);

it('a crew seat edit changes every shared fingerprint, marks the draft modified, and is clean after save', () => {
  const sample = fixture.cases[0];
  const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
  const store = createUnitStore({
    ...state,
    configuration: MechConfiguration.TRIPOD,
    tonnage: 100,
    isModified: false,
    librarySave: undefined,
  });
  recordUnitLibrarySave(
    store,
    { id: 'crew-fixture', version: 1 },
    store.getState(),
  );
  const saved = store.getState().librarySave;
  if (!saved?.draftFingerprint) throw new Error('Missing library receipt');
  const before = {
    edit: getUnitEditFingerprint(store.getState()),
    draft: getUnitDraftFingerprint(store.getState()),
    library: getUnitLibraryFingerprint(store.getState()),
  };
  expect(store.getState().isModified).toBe(false);

  store
    .getState()
    .setCrewSeat({ slotIndex: 1, name: 'Gunner Gil', gunnery: 2, piloting: 6 });
  expect(getUnitEditFingerprint(store.getState())).not.toBe(before.edit);
  expect(getUnitDraftFingerprint(store.getState())).not.toBe(before.draft);
  expect(getUnitLibraryFingerprint(store.getState())).not.toBe(before.library);
  expect(store.getState().isModified).toBe(true);

  recordUnitLibrarySave(
    store,
    { id: 'crew-fixture', version: 2 },
    store.getState(),
  );
  expect(store.getState().isModified).toBe(false);

  store
    .getState()
    .setCrewSeat({ slotIndex: 1, name: 'Gunner Gus', gunnery: 2, piloting: 6 });
  expect(store.getState().isModified).toBe(true);
  getUnitEditHistory(store).getState().undo();
  expect(store.getState().isModified).toBe(false);
});

it('adding an optional field that is absent does not change the mech fingerprint', () => {
  const sample = fixture.cases.find((entry) => entry.name === 'empty-fluff');
  if (!sample) throw new Error('Missing empty-fluff compatibility fixture');
  const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
  expect(getUnitEditFingerprint({ ...state, role: undefined })).toBe(
    sample.editFingerprint,
  );
  expect(getUnitDraftFingerprint({ ...state, role: undefined })).toBe(
    sample.draftFingerprint,
  );
  expect(getUnitLibraryFingerprint({ ...state, role: undefined })).toBe(
    sample.libraryFingerprint,
  );
  expect(
    stringifyUnitSaveFingerprint({
      ...getEditableUnitSnapshot(state),
      crewSeats: undefined,
    }),
  ).toBe(sample.editFingerprint);
  const oldDraft: Record<string, unknown> = JSON.parse(sample.draftFingerprint);
  expect(
    stringifyUnitSaveFingerprint({ ...oldDraft, crewSeats: undefined }),
  ).toBe(sample.draftFingerprint);
  expect(stringifyUnitSaveFingerprint({ ...oldDraft, crewSeats: [] })).not.toBe(
    sample.draftFingerprint,
  );
});

it('keeps literal fingerprint bytes when an old mount has no split allocation', () => {
  const sample = fixture.cases.find(
    (entry) => entry.name === 'linked-equipment',
  );
  if (!sample)
    throw new Error('Missing linked-equipment compatibility fixture');
  const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
  expect(state.equipment.every((item) => !('splitSlots' in item))).toBe(true);
  const absent: UnitState = {
    ...state,
    equipment: state.equipment.map((item) => ({
      ...item,
      splitSlots: undefined,
    })),
  };
  expect(
    getEditableUnitSnapshot(absent).equipment[0].splitSlots,
  ).toBeUndefined();
  expect(getUnitEditFingerprint(absent)).toBe(sample.editFingerprint);
  expect(getUnitDraftFingerprint(absent)).toBe(sample.draftFingerprint);
  expect(getUnitLibraryFingerprint(absent)).toBe(sample.libraryFingerprint);
});

it.each([
  CockpitType.TRIPOD,
  CockpitType.QUADVEE,
  CockpitType.SUPER_HEAVY_TRIPOD,
])('fingerprints a meaningful change to the %s cockpit', (cockpitType) => {
  const sample = fixture.cases.find(
    (entry) => entry.name === 'linked-equipment',
  );
  if (!sample)
    throw new Error('Missing linked-equipment compatibility fixture');
  const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
  const changed = { ...state, cockpitType };
  expect(getUnitEditFingerprint(changed)).not.toBe(sample.editFingerprint);
  expect(getUnitDraftFingerprint(changed)).not.toBe(sample.draftFingerprint);
  expect(getUnitLibraryFingerprint(changed)).not.toBe(
    sample.libraryFingerprint,
  );
});

it('fingerprints a secondary split-slot edit without changing the primary mount', () => {
  const sample = fixture.cases.find(
    (entry) => entry.name === 'linked-equipment',
  );
  if (!sample)
    throw new Error('Missing linked-equipment compatibility fixture');
  const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
  const split: UnitState = {
    ...state,
    equipment: [
      {
        ...state.equipment[0],
        equipmentId: 'ac-20',
        name: 'AC/20',
        weight: 14,
        criticalSlots: 10,
        heat: 7,
        linkedAmmoId: undefined,
        location: MechLocation.RIGHT_ARM,
        slots: [4, 5, 6, 7, 8, 9, 10, 11],
        splitSlots: { location: MechLocation.RIGHT_TORSO, slots: [1, 2] },
      },
    ],
  };
  const moved: UnitState = {
    ...split,
    equipment: split.equipment.map((item) => ({
      ...item,
      splitSlots: { location: MechLocation.RIGHT_TORSO, slots: [2, 3] },
    })),
  };
  expect(moved.equipment[0].slots).toEqual(split.equipment[0].slots);
  expect(moved.equipment[0].equipmentId).toBe(split.equipment[0].equipmentId);
  expect(getUnitEditFingerprint(moved)).not.toBe(getUnitEditFingerprint(split));
  expect(getUnitDraftFingerprint(moved)).not.toBe(
    getUnitDraftFingerprint(split),
  );
  expect(getUnitLibraryFingerprint(moved)).not.toBe(
    getUnitLibraryFingerprint(split),
  );
});
