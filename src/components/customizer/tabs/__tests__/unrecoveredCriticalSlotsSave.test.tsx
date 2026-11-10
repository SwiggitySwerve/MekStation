import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TargetedSaveUnitDialog } from '@/components/customizer/tabs/MultiUnitTabs';
import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { unitNameValidator } from '@/services/units/UnitNameValidator';
import { getUnitDraftFingerprint } from '@/stores/unit/unitEditSnapshot';
import {
  clearAllStores,
  createUnitFromFullState,
} from '@/stores/unitStoreRegistry';
import { useTabManagerStore, type TabInfo } from '@/stores/useTabManagerStore';

import crab from '../../../../../public/data/units/battlemechs/3-succession-wars/standard/King Crab KGC-0000.json';
import scarecrow from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Scarecrow UCU-F4.json';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: { create: jest.fn(), save: jest.fn() },
}));
jest.mock('@/services/units/UnitNameValidator', () => ({
  unitNameValidator: {
    validateUnitName: jest.fn(),
    buildFullName: (chassis: string, variant: string) =>
      `${chassis} ${variant}`,
  },
}));
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: jest.fn() }),
}));
jest.mock('@/hooks/useUnitValidation', () => ({
  useUnitValidation: () => ({
    isValid: true,
    isLoading: false,
    isValidating: false,
    errorCount: 0,
  }),
}));

const closeTab = jest.fn();
const renameTab = jest.fn();
type Mode = 'create' | 'overwrite' | 'save-as-new' | 'save-on-close';

function Harness({ tab, mode }: { tab: TabInfo; mode: Mode }) {
  const handlers = useDialogHandlers(closeTab, renameTab, () => tab);
  return (
    <>
      <button
        onClick={() =>
          mode === 'save-on-close'
            ? handlers.openCloseDialog(tab.id, tab.name)
            : handlers.openSaveDialog(tab.id)
        }
      >
        Begin save
      </button>
      {handlers.closeDialog.isOpen && (
        <button onClick={handlers.handleCloseDialogSave}>
          Save before closing
        </button>
      )}
      <TargetedSaveUnitDialog
        isOpen={handlers.saveDialog.isOpen}
        isSaving={handlers.isSaving}
        currentUnitId={handlers.saveDialog.tabId ?? undefined}
        initialChassis={handlers.saveDialog.chassis}
        initialVariant={handlers.saveDialog.variant}
        onSave={handlers.handleSaveDialogSave}
        onCancel={handlers.handleSaveDialogCancel}
      />
    </>
  );
}

beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});
beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  jest
    .mocked(customUnitApiService.create)
    .mockResolvedValue({ success: true, id: 'new-library', version: 1 });
  jest
    .mocked(customUnitApiService.save)
    .mockResolvedValue({ success: true, id: 'existing-library', version: 2 });
});
afterEach(() => {
  clearAllStores();
  useTabManagerStore.setState({ tabs: [], activeTabId: null });
});

function open(source: typeof scarecrow | typeof crab, mode: Mode) {
  jest
    .mocked(unitNameValidator.validateUnitName)
    .mockImplementation(async (_chassis, variant) => ({
      isValid:
        (mode !== 'overwrite' && mode !== 'save-as-new') ||
        variant.endsWith('-copy'),
      isCanonicalConflict: false,
      isCustomConflict:
        (mode === 'overwrite' || mode === 'save-as-new') &&
        !variant.endsWith('-copy'),
      conflictingUnitId: 'existing-library',
      suggestedName: 'Scarecrow UCU-F4-copy',
    }));
  const state = new UnitLoaderService().mapToUnitState(parseUnit(source), true);
  const store = createUnitFromFullState(state);
  const tab = {
    id: state.id,
    name: state.name,
    tonnage: state.tonnage,
    techBase: state.techBase,
    unitType: state.unitType,
  };
  useTabManagerStore.setState({ tabs: [tab], activeTabId: tab.id });
  render(<Harness tab={tab} mode={mode} />);
  fireEvent.click(screen.getByRole('button', { name: 'Begin save' }));
  if (mode === 'save-on-close')
    fireEvent.click(
      screen.getByRole('button', { name: 'Save before closing' }),
    );
  return store;
}

it.each<Mode>(['create', 'overwrite', 'save-as-new', 'save-on-close'])(
  'shows and confirms the exact loader list before %s completes; cancel preserves the open unit',
  async (mode) => {
    const store = open(scarecrow, mode);
    const before = store.getState();
    const fingerprint = getUnitDraftFingerprint(before);
    const notice = screen.getByRole('note', {
      name: 'Critical-slot entries lost on save',
    });
    const expected = before.unrecoveredCriticalSlots?.map(
      ({ text, location, slot }) => `${text} — ${location} [${slot}]`,
    );
    expect(
      within(notice)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(expected);
    expect(notice).toHaveTextContent(
      'Saving will remove them from this design.',
    );
    expect(notice).toHaveTextContent('Why?');
    if (mode === 'save-as-new') {
      fireEvent.click(
        await screen.findByRole('button', { name: 'Save As New' }),
      );
    }
    const saveButton = await screen.findByRole('button', {
      name: mode === 'overwrite' ? 'Overwrite' : 'Save',
    });
    await waitFor(() => expect(saveButton).toBeEnabled());
    fireEvent.click(saveButton);
    expect(
      screen.getByRole('dialog', {
        name: 'Save with missing critical-slot entries?',
      }),
    ).toBeVisible();
    expect(customUnitApiService.create).not.toHaveBeenCalled();
    expect(customUnitApiService.save).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    expect(
      within(
        screen.getByRole('note', {
          name: 'Critical-slot entries lost on save',
        }),
      )
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(expected);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(store.getState()).toBe(before);
    expect(getUnitDraftFingerprint(store.getState())).toBe(fingerprint);
    expect(closeTab).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', {
        name: mode === 'overwrite' ? 'Overwrite' : 'Save',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save anyway' }));
    await waitFor(() =>
      expect(
        mode === 'overwrite'
          ? customUnitApiService.save
          : customUnitApiService.create,
      ).toHaveBeenCalledTimes(1),
    );
    if (mode === 'save-on-close')
      await waitFor(() => expect(closeTab).toHaveBeenCalledWith(before.id));
    else expect(closeTab).not.toHaveBeenCalled();
  },
);

it('does not show a loss notice or extra confirmation for King Crab', async () => {
  open(crab, 'create');
  expect(
    screen.queryByRole('note', { name: 'Critical-slot entries lost on save' }),
  ).toBeNull();
  const save = await screen.findByRole('button', { name: 'Save' });
  await waitFor(() => expect(save).toBeEnabled());
  fireEvent.click(save);
  await act(async () => {});
  expect(customUnitApiService.create).toHaveBeenCalledTimes(1);
  expect(screen.queryByRole('button', { name: 'Save anyway' })).toBeNull();
});
