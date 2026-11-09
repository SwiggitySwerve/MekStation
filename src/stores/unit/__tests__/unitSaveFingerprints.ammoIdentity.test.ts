import type { UnitState } from '@/stores/unitState';

import { clearAllStores } from '@/stores/unitStoreRegistry';
import { EquipmentCategory } from '@/types/equipment';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

import {
  getUnitDraftFingerprint,
  getUnitEditFingerprint,
  getUnitLibraryFingerprint,
  recordUnitLibrarySave,
} from '../unitEditSnapshot';
import { createUnitStore } from '../useUnitStore';
import fixture from './fixtures/unit-save-fingerprints-7c8579e19.json';

afterEach(() => {
  clearAllStores();
  localStorage.clear();
});

function linkedState(): UnitState {
  const sample = fixture.cases.find(
    (entry) => entry.name === 'linked-equipment',
  );
  if (!sample) throw new Error('Missing literal linked-equipment fixture');
  return (JSON.parse(sample.rawDraft) as { state: UnitState }).state;
}

it.each(fixture.cases)(
  'preserves old fingerprint bytes while omitting derived ammo metadata: $name',
  (sample) => {
    const { state } = JSON.parse(sample.rawDraft) as { state: UnitState };
    expect(getUnitEditFingerprint(state)).toBe(sample.editFingerprint);
    expect(getUnitDraftFingerprint(state)).toBe(sample.draftFingerprint);
    expect(getUnitLibraryFingerprint(state)).toBe(sample.libraryFingerprint);
    expect(
      JSON.parse(getUnitLibraryFingerprint(state)).equipment.every(
        (item: { isAmmo?: boolean }) => item.isAmmo === undefined,
      ),
    ).toBe(true);
  },
);

it('writes a shared-ID discriminator without changing old library fingerprint bytes', () => {
  const old = fixture.cases.find((entry) => entry.name === 'linked-equipment');
  if (!old) throw new Error('Missing literal fixture');
  const original = linkedState();
  const state = {
    ...original,
    equipment: original.equipment.map((item) =>
      item.category === EquipmentCategory.AMMUNITION
        ? { ...item, equipmentId: 'mrm-20' }
        : item,
    ),
  };
  const serialized = serializeCustomUnitState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
  expect(serialized.equipment.some((item) => item.isAmmo === true)).toBe(true);
  expect(
    serialized.equipment.filter((item) => item.isAmmo === undefined).length,
  ).toBeGreaterThan(0);
  const bytes = JSON.parse(getUnitLibraryFingerprint(state)) as {
    equipment: { isAmmo?: boolean }[];
  };
  expect(bytes.equipment.every((item) => item.isAmmo === undefined)).toBe(true);
  expect(getUnitLibraryFingerprint(state)).toBe(
    old.libraryFingerprint.replace('"id":"ammo-ac5"', '"id":"mrm-20"'),
  );
});

it('keeps unambiguous old portable equipment records free of category markers', () => {
  const state = linkedState();
  const serialized = serializeCustomUnitState(state, {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
    era: Era.DARK_AGE,
  });
  expect(serialized.equipment.every((item) => item.isAmmo === undefined)).toBe(
    true,
  );
});

it('detects a same-ID category edit in draft/edit fingerprints and dirty state', () => {
  const state = linkedState();
  const store = createUnitStore({
    ...state,
    librarySave: undefined,
    isModified: false,
  });
  recordUnitLibrarySave(
    store,
    { id: 'ammo-fingerprint', version: 1 },
    store.getState(),
  );
  const before = store.getState();
  const edit = getUnitEditFingerprint(before);
  const draft = getUnitDraftFingerprint(before);
  const changed = {
    ...before,
    equipment: before.equipment.map((item, index) =>
      index === 0 ? { ...item, category: EquipmentCategory.AMMUNITION } : item,
    ),
  };
  expect(changed.equipment[0].equipmentId).toBe(
    before.equipment[0].equipmentId,
  );
  expect(getUnitEditFingerprint(changed)).not.toBe(edit);
  expect(getUnitDraftFingerprint(changed)).not.toBe(draft);
  // A real store edit uses this same draft comparison to track dirty state.
  store.setState({ equipment: changed.equipment });
  recordUnitLibrarySave(store, { id: 'ammo-fingerprint', version: 1 }, before);
  expect(store.getState().isModified).toBe(true);
});

it('retains a meaningful equipment edit in all shared fingerprints', () => {
  const state = linkedState();
  const changed: UnitState = {
    ...state,
    equipment: state.equipment.map((item, index) =>
      index === 0
        ? { ...item, equipmentId: 'large-laser', name: 'Large Laser' }
        : item,
    ),
  };
  expect(getUnitEditFingerprint(changed)).not.toBe(
    getUnitEditFingerprint(state),
  );
  expect(getUnitDraftFingerprint(changed)).not.toBe(
    getUnitDraftFingerprint(state),
  );
  expect(getUnitLibraryFingerprint(changed)).not.toBe(
    getUnitLibraryFingerprint(state),
  );
});
