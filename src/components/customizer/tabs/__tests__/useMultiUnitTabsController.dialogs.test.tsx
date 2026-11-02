import { act, renderHook } from '@testing-library/react';

import type { TabInfo } from '@/stores/useTabManagerStore';

import { useDialogHandlers } from '@/components/customizer/tabs/useMultiUnitTabsController.dialogs';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { createNewUnitStore } from '@/stores/useUnitStore';
import { createVehicleStore } from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { getVehicleStore } from '@/stores/vehicleStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

const showToastMock = jest.fn();

jest.mock('@/components/shared/Toast', () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

jest.mock('@/services/units/CustomUnitApiService', () => ({
  customUnitApiService: {
    create: jest.fn(),
    save: jest.fn(),
  },
}));

jest.mock('@/stores/unitStoreRegistry', () => ({
  getUnitStore: jest.fn(),
}));
jest.mock('@/stores/vehicleStoreRegistry', () => ({
  getVehicleStore: jest.fn(),
}));

jest.mock('@/utils/logger', () => ({
  logger: { error: jest.fn() },
}));

const UNIT_ID = '44444444-4444-4444-8444-444444444444';
const performCloseTab = jest.fn();
const renameTab = jest.fn();
const mockGetUnitStore = getUnitStore as jest.MockedFunction<
  typeof getUnitStore
>;
const mockCreate = customUnitApiService.create as jest.MockedFunction<
  typeof customUnitApiService.create
>;
const mockSave = customUnitApiService.save as jest.MockedFunction<
  typeof customUnitApiService.save
>;

function tab(unitType: UnitType): TabInfo {
  return {
    id: UNIT_ID,
    name: 'Old Chassis OLD-1',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
    unitType,
  };
}

function makeStore() {
  const store = createNewUnitStore({
    id: UNIT_ID,
    name: 'Old Chassis OLD-1',
    tonnage: 50,
    techBase: TechBase.INNER_SPHERE,
  });
  store.setState({
    chassis: 'Old Chassis',
    model: 'OLD-1',
    name: 'Old Chassis OLD-1',
    isModified: true,
  });
  return store;
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe('useDialogHandlers library save', () => {
  it.each([UnitType.VEHICLE, UnitType.VTOL, UnitType.SUPPORT_VEHICLE] as const)(
    'saves %s through its vehicle store and keeps concurrent edits dirty',
    async (unitType) => {
      const store = createVehicleStore(
        createDefaultVehicleState({
          id: UNIT_ID,
          name: 'Carrier C',
          tonnage: 60,
          techBase: TechBase.INNER_SPHERE,
          unitType,
        }),
      );
      jest.mocked(getVehicleStore).mockReturnValue(store);
      const getTabById = jest.fn(() => tab(unitType));
      let resolveSave: (value: {
        success: boolean;
        id: string;
        version: number;
      }) => void = () => undefined;
      mockCreate.mockImplementation(
        () =>
          new Promise((resolve) => {
            resolveSave = resolve;
          }),
      );
      const { result } = renderHook(() =>
        useDialogHandlers(performCloseTab, renameTab, getTabById),
      );
      act(() => result.current.openSaveDialog(UNIT_ID));
      expect(result.current.saveDialog.isOpen).toBe(true);
      let pending: Promise<void>;
      act(() => {
        pending = result.current.handleSaveDialogSave('Carrier', 'C');
      });
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ family: 'vehicles', unitType }),
        'Carrier',
        'C',
      );
      act(() => store.getState().setCrewSize(9));
      await act(async () => {
        resolveSave({ success: true, id: 'custom-carrier', version: 1 });
        await pending;
      });
      expect(store.getState().crewSize).toBe(9);
      expect(store.getState().isModified).toBe(true);
      mockCreate.mockResolvedValue({
        success: true,
        id: 'custom-carrier',
        version: 2,
      });
      act(() => result.current.openSaveDialog(UNIT_ID));
      await act(async () => {
        await result.current.handleSaveDialogSave('Carrier', 'C');
      });
      expect(store.getState().isModified).toBe(false);
      expect(showToastMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ variant: 'success' }),
      );
    },
  );

  it('reports unsupported families and keeps the unsaved-close choice open', () => {
    const getTabById = jest.fn(() => tab(UnitType.DROPSHIP));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => {
      result.current.openCloseDialog(UNIT_ID, 'Vehicle');
    });
    act(() => {
      result.current.handleCloseDialogSave();
    });

    expect(result.current.closeDialog).toMatchObject({
      isOpen: true,
      tabId: UNIT_ID,
    });
    expect(result.current.saveDialog.isOpen).toBe(false);
    expect(performCloseTab).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/not available.*browser draft/i),
        variant: 'error',
      }),
    );
  });

  it('opens the active BattleMech library dialog without scheduling a close', () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => result.current.openSaveDialog(UNIT_ID));

    expect(result.current.saveDialog).toEqual({
      isOpen: true,
      tabId: UNIT_ID,
      chassis: 'Old Chassis',
      variant: 'OLD-1',
      closeAfterSave: false,
    });
  });

  it('keeps the dirty unit and dialog open when the API rejects the save', async () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    mockCreate.mockResolvedValue({
      success: false,
      error: 'database unavailable',
    });
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => result.current.openSaveDialog(UNIT_ID));
    await act(async () => {
      await result.current.handleSaveDialogSave('New Chassis', 'NEW-2');
    });

    expect(result.current.saveDialog.isOpen).toBe(true);
    expect(store.getState().isModified).toBe(true);
    expect(store.getState().chassis).toBe('Old Chassis');
    expect(renameTab).not.toHaveBeenCalled();
    expect(performCloseTab).not.toHaveBeenCalled();
  });

  it('updates store identity and tab caption only after API success', async () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    mockCreate.mockResolvedValue({ success: true, id: UNIT_ID, version: 1 });
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => result.current.openSaveDialog(UNIT_ID));
    await act(async () => {
      await result.current.handleSaveDialogSave('New Chassis', 'NEW-2');
    });

    expect(store.getState()).toMatchObject({
      chassis: 'New Chassis',
      model: 'NEW-2',
      name: 'New Chassis NEW-2',
      isModified: false,
      librarySave: { id: UNIT_ID, version: 1 },
    });
    expect(store.getState().librarySave?.fingerprint).toEqual(
      expect.any(String),
    );
    expect(renameTab).toHaveBeenCalledWith(UNIT_ID, 'New Chassis NEW-2');
    expect(result.current.saveDialog.isOpen).toBe(false);
    expect(performCloseTab).not.toHaveBeenCalled();
  });

  it('does not mark edits made during an API request as saved', async () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    let resolveCreate!: (value: {
      success: true;
      id: string;
      version: number;
    }) => void;
    mockCreate.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve;
      }),
    );
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => result.current.openSaveDialog(UNIT_ID));
    let saveRequest!: Promise<void>;
    await act(async () => {
      saveRequest = result.current.handleSaveDialogSave(
        'Saved Chassis',
        'SAVED-1',
      );
      await Promise.resolve();
    });

    act(() => {
      store.setState({
        name: 'Newer Browser Draft',
        isModified: true,
        lastModifiedAt: Date.now() + 1,
      });
    });
    await act(async () => {
      resolveCreate({ success: true, id: UNIT_ID, version: 1 });
      await saveRequest;
    });

    expect(store.getState()).toMatchObject({
      name: 'Newer Browser Draft',
      isModified: true,
      librarySave: { id: UNIT_ID, version: 1 },
    });
    expect(renameTab).not.toHaveBeenCalled();
    expect(performCloseTab).not.toHaveBeenCalled();
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/newer browser draft changes remain/i),
        variant: 'warning',
      }),
    );
  });

  it('updates identity before completing a save-and-close request', async () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    mockCreate.mockResolvedValue({ success: true, id: UNIT_ID, version: 1 });
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    performCloseTab.mockImplementation(() => {
      expect(store.getState()).toMatchObject({
        chassis: 'Final Chassis',
        model: 'FINAL-3',
        isModified: false,
      });
    });
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => {
      result.current.openCloseDialog(UNIT_ID, 'Old Chassis OLD-1');
    });
    act(() => {
      result.current.handleCloseDialogSave();
    });
    await act(async () => {
      await result.current.handleSaveDialogSave('Final Chassis', 'FINAL-3');
    });

    expect(performCloseTab).toHaveBeenCalledWith(UNIT_ID);
  });

  it('does not invent a library receipt when the API omits identity', async () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    mockCreate.mockResolvedValue({ success: true });
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => result.current.openSaveDialog(UNIT_ID));
    await act(async () => {
      await result.current.handleSaveDialogSave('New Chassis', 'NEW-2');
    });

    expect(store.getState().librarySave).toBeUndefined();
    expect(store.getState().isModified).toBe(true);
    expect(store.getState().chassis).toBe('Old Chassis');
    expect(renameTab).not.toHaveBeenCalled();
    expect(result.current.saveDialog.isOpen).toBe(true);
    expect(showToastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringMatching(/did not return a saved identity/i),
        variant: 'error',
      }),
    );
  });

  it('records the returned library id even when it differs from the draft id', async () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    mockCreate.mockResolvedValue({
      success: true,
      id: 'server-library-id',
      version: 2,
    });
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => result.current.openSaveDialog(UNIT_ID));
    await act(async () => {
      await result.current.handleSaveDialogSave('New Chassis', 'NEW-2');
    });

    expect(store.getState().librarySave).toMatchObject({
      id: 'server-library-id',
      version: 2,
    });
    expect(store.getState().id).toBe(UNIT_ID);
  });

  it('records overwrite save identity from the API response', async () => {
    const store = makeStore();
    mockGetUnitStore.mockReturnValue(store);
    mockSave.mockResolvedValue({
      success: true,
      id: 'existing-library',
      version: 4,
    });
    const getTabById = jest.fn(() => tab(UnitType.BATTLEMECH));
    const { result } = renderHook(() =>
      useDialogHandlers(performCloseTab, renameTab, getTabById),
    );

    act(() => result.current.openSaveDialog(UNIT_ID));
    await act(async () => {
      await result.current.handleSaveDialogSave(
        'New Chassis',
        'NEW-2',
        'existing-library',
      );
    });

    expect(mockSave).toHaveBeenCalled();
    expect(store.getState().librarySave).toMatchObject({
      id: 'existing-library',
      version: 4,
    });
  });
});
