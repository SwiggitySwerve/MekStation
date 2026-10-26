import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';

import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { unitLoaderService } from '@/services/units/unitLoaderService';
import { getUnitEditHistory } from '@/stores/unit/unitEditHistory';
import { recordUnitLibrarySave } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { createNewUnitStore } from '@/stores/useUnitStore';
import {
  clientSafeStorage,
  getLatestStorageWriteReceipt,
  safeRemoveItem,
} from '@/stores/utils/clientSafeStorage';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { BrowserDraftStatus } from '../../shared/BrowserDraftStatus';
import { useDialogHandlers } from '../useMultiUnitTabsController.dialogs';
import { useSavedHistoryDialog } from '../useSavedHistoryDialog';

const showToast = jest.fn();
jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast }),
}));
jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    getVersion: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  },
}));
jest.mock('@/services/units/unitLoaderService', () => ({
  parseUnit: (value: unknown) => value,
  unitLoaderService: { mapToUnitState: jest.fn() },
}));
jest.mock('@/services/equipment/EquipmentLookupService', () => ({
  getEquipmentLookupService: () => ({ initialize: async () => undefined }),
}));
jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  getEquipmentRegistry: () => ({ initialize: async () => undefined }),
}));
jest.mock('@/stores/unitStoreRegistry', () => ({ getUnitStore: jest.fn() }));

const id = '22222222-2222-4222-8222-222222222222';
function setup() {
  const store = createNewUnitStore({
    id,
    name: 'Recovery test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  recordUnitLibrarySave(
    store,
    { id: 'library-test', version: 2 },
    store.getState(),
  );
  jest.mocked(getUnitStore).mockReturnValue(store);
  const tab = {
    id,
    name: 'Recovery test',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    unitType: UnitType.BATTLEMECH,
  };
  jest
    .mocked(unitLoaderService.mapToUnitState)
    .mockReturnValue({ ...store.getState(), year: 3025 });
  return { store, getTab: jest.fn(() => tab) };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});
afterEach(() => jest.restoreAllMocks());

describe('recovery asynchronous boundaries', () => {
  it.each([
    'close',
    'unmount',
    'tab removed',
    'library changed',
    'active changed',
  ] as const)('does not restore after %s during the fetch', async (change) => {
    const { store, getTab } = setup();
    let finish!: (
      value: Awaited<ReturnType<typeof customUnitApiService.getVersion>>,
    ) => void;
    jest.mocked(customUnitApiService.getVersion).mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { result, unmount, rerender } = renderHook(
      ({ active }) => useSavedHistoryDialog(getTab, active),
      { initialProps: { active: id } },
    );
    act(() => result.current.openHistoryDialog(id));
    let pending!: Promise<void>;
    act(() => {
      pending = result.current.restoreHistoryVersion(1);
    });
    if (change === 'close') act(() => result.current.closeHistoryDialog());
    if (change === 'unmount') unmount();
    if (change === 'active changed')
      act(() => rerender({ active: 'another-draft' }));
    if (change === 'tab removed') getTab.mockReturnValue(undefined as never);
    if (change === 'library changed')
      recordUnitLibrarySave(
        store,
        { id: 'another-library', version: 1 },
        store.getState(),
      );
    const before = store.getState();
    await act(async () => {
      finish({
        version: 1,
        savedAt: '2026-09-10T00:00:00Z',
        data: {},
      } as never);
      await expect(pending).rejects.toThrow();
    });
    expect(store.getState()).toBe(before);
    expect(getUnitEditHistory(store).getState().canUndo).toBe(false);
  });

  it('keeps the library receipt in memory and reports a browser failure after the server saves', async () => {
    const { store, getTab } = setup();
    const close = jest.fn();
    const { result } = renderHook(() =>
      useDialogHandlers(close, jest.fn(), getTab),
    );
    act(() => result.current.openSaveDialog(id));
    jest.mocked(customUnitApiService.create).mockImplementation(async () => {
      jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Full', 'QuotaExceededError');
      });
      return { success: true, id: 'new-library', version: 1 };
    });
    await act(async () => {
      await result.current.handleSaveDialogSave('Recovery', 'SAVED');
    });
    expect(store.getState().librarySave).toMatchObject({
      id: 'new-library',
      version: 1,
    });
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/saved.*library.*browser.*failed/i),
        variant: 'warning',
      }),
    );
    expect(result.current.saveDialog.isOpen).toBe(false);
    expect(close).not.toHaveBeenCalled();
    expect(customUnitApiService.create).toHaveBeenCalledTimes(1);
  });
});

it('retries only the browser draft after a storage failure', () => {
  const { store } = setup();
  const key = `megamek-unit-${id}`;
  render(<BrowserDraftStatus unitId={id} />);
  const fail = jest
    .spyOn(Storage.prototype, 'setItem')
    .mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
  act(() => {
    expect(() => store.setState({ year: 3040 })).toThrow();
  });
  expect(screen.getByText('Draft save failed in this browser')).toBeVisible();
  fail.mockRestore();
  fireEvent.click(screen.getByRole('button', { name: 'Retry browser draft' }));
  expect(JSON.parse(localStorage.getItem(key)!).state.year).toBe(3040);
  expect(screen.getByText('Draft saved in this browser')).toBeVisible();
  expect(customUnitApiService.create).not.toHaveBeenCalled();
  expect(customUnitApiService.save).not.toHaveBeenCalled();
});

it.each(['persist', 'helper'])(
  'forgets the write receipt after a successful %s removal',
  (method) => {
    const key = `removed-${method}`;
    clientSafeStorage.setItem(key, '{}');
    expect(getLatestStorageWriteReceipt(key)?.status).toBe('saved');
    if (method === 'persist') clientSafeStorage.removeItem(key);
    else safeRemoveItem(key);
    expect(getLatestStorageWriteReceipt(key)).toBeNull();
  },
);
