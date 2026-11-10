import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TargetedSaveUnitDialog } from '@/components/customizer/tabs/MultiUnitTabs';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import fixture from '@/stores/unit/__tests__/fixtures/unit-save-fingerprints-7c8579e19.json';
import { getUnitDraftFingerprint } from '@/stores/unit/unitEditSnapshot';
import {
  clearAllStores,
  hydrateOrCreateUnit,
} from '@/stores/unitStoreRegistry';
import { UnitStoreContext, createNewUnitStore } from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';

import scarecrow from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Scarecrow UCU-F4.json';
import { EditorLoadDiagnostics } from '../UnrecoveredCriticalSlotsNotice';

const mockReadCanonical = jest.fn();
jest.mock('@/services/units/CanonicalUnitService', () => ({
  getCanonicalUnitService: () => ({
    hasFamily: async () => true,
    getById: mockReadCanonical,
    invalidateUnit: jest.fn(),
  }),
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
jest.mock('@/hooks/useUnitValidation', () => ({
  useUnitValidation: () => ({
    isValid: true,
    isLoading: false,
    isValidating: false,
    errorCount: 0,
  }),
}));
jest.mock('@/services/units/UnitNameValidator', () => ({
  unitNameValidator: {
    validateUnitName: async () => ({
      isValid: true,
      isCanonicalConflict: false,
      isCustomConflict: false,
    }),
    buildFullName: (chassis: string, variant: string) =>
      `${chassis} ${variant}`,
  },
}));

// Literal version-0 pre-tracking draft; there is deliberately no source or loss list.
const LEGACY_IMPORTED_DRAFT =
  '{"state":{"id":"77777777-7777-4777-8777-777777777777","name":"Imported X","chassis":"Imported","model":"X","tonnage":50,"techBase":"Inner Sphere"},"version":0}';

it('keeps an absent legacy field unknown through the native Zustand rehydrate path too', async () => {
  const id = '77777777-7777-4777-8777-777777777777';
  const store = createNewUnitStore({
    id,
    name: 'New',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(store.getState().unrecoveredCriticalSlots).toEqual([]);
  localStorage.setItem(`megamek-unit-${id}`, LEGACY_IMPORTED_DRAFT);
  const persistedStore = store as typeof store & {
    persist: { rehydrate(): Promise<void> };
  };
  await persistedStore.persist.rehydrate();
  expect(store.getState().unrecoveredCriticalSlots).toBeUndefined();
});

beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
afterEach(() => clearAllStores());

it('waits for the one catalog refresh before saving and ignores its result after unmount', async () => {
  const sample = fixture.cases[0];
  const raw = sample.rawDraft.replaceAll('fixture-source', 'scarecrow-ucu-f4');
  const envelope = JSON.parse(raw) as { state: { id: string } };
  localStorage.setItem(`megamek-unit-${envelope.state.id}`, raw);
  const store = hydrateOrCreateUnit(envelope.state.id, {
    name: 'Fallback',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  let finish: (value: typeof scarecrow) => void = () => {
    throw new Error('Missing source request');
  };
  mockReadCanonical.mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  const save = jest.fn();
  const view = render(
    <>
      <UnitStoreContext.Provider value={store}>
        <EditorLoadDiagnostics />
      </UnitStoreContext.Provider>
      <TargetedSaveUnitDialog
        isOpen
        currentUnitId={envelope.state.id}
        initialChassis="Old"
        initialVariant="X"
        onSave={save}
        onCancel={jest.fn()}
      />
    </>,
  );
  await waitFor(() => expect(mockReadCanonical).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  view.unmount();
  await act(async () => {
    finish(scarecrow);
  });
  expect(store.getState().unrecoveredCriticalSlots).toBeUndefined();
  expect(save).not.toHaveBeenCalled();
});

it('hydrates a literal U3 pre-PR draft and recomputes an absent list from its catalog id through the real loader', async () => {
  const sample = fixture.cases[0];
  // Change only the source pointer of the existing literal, never regenerate it.
  const raw = sample.rawDraft.replaceAll('fixture-source', 'scarecrow-ucu-f4');
  const envelope = JSON.parse(raw) as { state: { id: string } };
  localStorage.setItem(`megamek-unit-${envelope.state.id}`, raw);
  const store = hydrateOrCreateUnit(envelope.state.id, {
    name: 'Fallback',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(store.getState().unrecoveredCriticalSlots).toBeUndefined();
  const before = getUnitDraftFingerprint(store.getState());
  mockReadCanonical.mockResolvedValue(scarecrow);
  render(
    <UnitStoreContext.Provider value={store}>
      <EditorLoadDiagnostics />
    </UnitStoreContext.Provider>,
  );
  // The retained literal has no equipment. A repaired canonical load must not
  // conceal its missing weapon allocations or its seven native markers.
  await waitFor(() =>
    expect(store.getState().unrecoveredCriticalSlots).toHaveLength(46),
  );
  expect(store.getState().unrecoveredCriticalSlots).toEqual(
    expect.arrayContaining([
      { text: 'CLERMediumLaser', location: 'Left Arm', slot: 2 },
      { text: 'IS Endo-Composite', location: 'Left Arm', slot: 9 },
      { text: 'BloodhoundActiveProbe', location: 'Left Torso', slot: 7 },
    ]),
  );
  expect(mockReadCanonical).toHaveBeenCalledWith('scarecrow-ucu-f4', {
    family: 'battlemechs',
    strict: true,
  });
  expect(getUnitDraftFingerprint(store.getState())).toBe(before);
  expect(screen.getByRole('note')).toHaveTextContent('BloodhoundActiveProbe');
  expect(screen.getAllByRole('listitem')).toHaveLength(46);
});

it('hydrates a literal pre-PR imported draft without a source and warns before allowing save', async () => {
  const id = '77777777-7777-4777-8777-777777777777';
  localStorage.setItem(`megamek-unit-${id}`, LEGACY_IMPORTED_DRAFT);
  const store = hydrateOrCreateUnit(id, {
    name: 'Fallback',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  expect(store.getState().unrecoveredCriticalSlots).toBeUndefined();
  const before = getUnitDraftFingerprint(store.getState());
  const save = jest.fn();
  render(
    <TargetedSaveUnitDialog
      isOpen
      currentUnitId={id}
      initialChassis="Imported"
      initialVariant="X"
      onSave={save}
      onCancel={jest.fn()}
    />,
  );
  expect(screen.getByRole('note')).toHaveTextContent(
    'This draft predates critical-slot loss tracking and may be missing critical-slot entries.',
  );
  const button = screen.getByRole('button', { name: 'Save' });
  await waitFor(() => expect(button).toBeEnabled());
  fireEvent.click(button);
  expect(save).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Save anyway' })).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(getUnitDraftFingerprint(store.getState())).toBe(before);
  expect(store.getState().unrecoveredCriticalSlots).toBeUndefined();
  expect(mockReadCanonical).not.toHaveBeenCalled();
});
