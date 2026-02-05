/**
 * Tests for useUnit, useSelection, and useUnitEditor hooks
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import { renderHook, act } from '@testing-library/react';

import { useUnit, useSelection, useUnitEditor } from '@/hooks/useUnit';
import { useCustomizerStore } from '@/stores/useCustomizerStore';
import { useMultiUnitStore } from '@/stores/useMultiUnitStore';
import { MechLocation } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';

// Mock the stores
jest.mock('@/stores/useMultiUnitStore', () => ({
  useMultiUnitStore: jest.fn(),
  UNIT_TEMPLATES: [
    { tonnage: 20, name: 'Light' },
    { tonnage: 50, name: 'Medium' },
    { tonnage: 75, name: 'Heavy' },
    { tonnage: 100, name: 'Assault' },
  ],
}));

jest.mock('@/stores/useCustomizerStore', () => ({
  useCustomizerStore: jest.fn(),
}));

describe('useUnit Hook', () => {
  const mockUseMultiUnitStore = useMultiUnitStore as jest.MockedFunction<
    typeof useMultiUnitStore
  >;

  const mockMultiUnitStore = {
    tabs: [
      { id: 'tab-1', name: 'Atlas AS7-D', isModified: false, tonnage: 100 },
      { id: 'tab-2', name: 'Marauder MAD-3R', isModified: true, tonnage: 75 },
    ],
    activeTabId: 'tab-1',
    isLoading: false,
    selectTab: jest.fn(),
    createTab: jest.fn().mockReturnValue('new-tab-id'),
    duplicateTab: jest.fn().mockReturnValue('dupe-tab-id'),
    closeTab: jest.fn(),
    renameTab: jest.fn(),
    markModified: jest.fn(),
    isNewTabModalOpen: false,
    openNewTabModal: jest.fn(),
    closeNewTabModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMultiUnitStore.mockReturnValue(mockMultiUnitStore);
  });

  it('should return current tab', () => {
    const { result } = renderHook(() => useUnit());

    expect(result.current.tab).toEqual(mockMultiUnitStore.tabs[0]);
  });

  it('should return all tabs', () => {
    const { result } = renderHook(() => useUnit());

    expect(result.current.allTabs).toEqual(mockMultiUnitStore.tabs);
    expect(result.current.allTabs.length).toBe(2);
  });

  it('should return active tab id', () => {
    const { result } = renderHook(() => useUnit());

    expect(result.current.activeTabId).toBe('tab-1');
  });

  it('should return loading state', () => {
    const { result } = renderHook(() => useUnit());

    expect(result.current.isLoading).toBe(false);
  });

  it('should return hasUnsavedChanges based on active tab', () => {
    const { result } = renderHook(() => useUnit());

    expect(result.current.hasUnsavedChanges).toBe(false);
  });

  it('should return hasUnsavedChanges true for modified tab', () => {
    const modifiedStore = {
      ...mockMultiUnitStore,
      activeTabId: 'tab-2',
    };
    mockUseMultiUnitStore.mockReturnValue(modifiedStore);

    const { result } = renderHook(() => useUnit());

    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it('should call selectTab', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      result.current.selectTab('tab-2');
    });

    expect(mockMultiUnitStore.selectTab).toHaveBeenCalledWith('tab-2');
  });

  it('should create new unit with default tech base', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      const newId = result.current.createNewUnit(50);
      expect(newId).toBe('new-tab-id');
    });

    expect(mockMultiUnitStore.createTab).toHaveBeenCalled();
  });

  it('should create new unit with specific tech base', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      result.current.createNewUnit(75, TechBase.CLAN);
    });

    expect(mockMultiUnitStore.createTab).toHaveBeenCalledWith(
      expect.objectContaining({ techBase: TechBase.CLAN }),
    );
  });

  it('should duplicate current unit', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      const dupeId = result.current.duplicateCurrentUnit();
      expect(dupeId).toBe('dupe-tab-id');
    });

    expect(mockMultiUnitStore.duplicateTab).toHaveBeenCalledWith('tab-1');
  });

  it('should return null when duplicating without active tab', () => {
    const noActiveStore = {
      ...mockMultiUnitStore,
      activeTabId: null,
    };
    mockUseMultiUnitStore.mockReturnValue(noActiveStore);

    const { result } = renderHook(() => useUnit());

    act(() => {
      const dupeId = result.current.duplicateCurrentUnit();
      expect(dupeId).toBeNull();
    });
  });

  it('should close tab', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      result.current.closeTab('tab-1');
    });

    expect(mockMultiUnitStore.closeTab).toHaveBeenCalledWith('tab-1');
  });

  it('should rename unit', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      result.current.renameUnit('New Name');
    });

    expect(mockMultiUnitStore.renameTab).toHaveBeenCalledWith(
      'tab-1',
      'New Name',
    );
  });

  it('should mark modified', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      result.current.markModified();
    });

    expect(mockMultiUnitStore.markModified).toHaveBeenCalledWith('tab-1', true);
  });

  it('should mark saved', () => {
    const { result } = renderHook(() => useUnit());

    act(() => {
      result.current.markSaved();
    });

    expect(mockMultiUnitStore.markModified).toHaveBeenCalledWith(
      'tab-1',
      false,
    );
  });

  it('should return modal state', () => {
    const { result } = renderHook(() => useUnit());

    expect(result.current.isNewTabModalOpen).toBe(false);
    expect(result.current.openNewTabModal).toBeDefined();
    expect(result.current.closeNewTabModal).toBeDefined();
  });

  it('should handle null active tab', () => {
    const noActiveStore = {
      ...mockMultiUnitStore,
      activeTabId: null,
    };
    mockUseMultiUnitStore.mockReturnValue(noActiveStore);

    const { result } = renderHook(() => useUnit());

    expect(result.current.tab).toBeNull();
    expect(result.current.hasUnsavedChanges).toBe(false);
  });
});

describe('useSelection Hook', () => {
  const mockUseCustomizerStore = useCustomizerStore as jest.MockedFunction<
    typeof useCustomizerStore
  >;

  const mockCustomizerStore = {
    selectedEquipment: {
      id: 'eq-1',
      name: 'Medium Laser',
      equipmentId: 'eq-1',
      criticalSlots: 1,
      source: 'browser' as const,
    },
    selectedLocation: MechLocation.LEFT_ARM,
    selectionMode: 'click' as const,
    selectEquipment: jest.fn(),
    selectLocation: jest.fn(),
    clearSelection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCustomizerStore.mockReturnValue(mockCustomizerStore);
  });

  it('should return selected equipment', () => {
    const { result } = renderHook(() => useSelection());

    expect(result.current.selectedEquipment).toEqual(
      mockCustomizerStore.selectedEquipment,
    );
  });

  it('should return selected location', () => {
    const { result } = renderHook(() => useSelection());

    expect(result.current.selectedLocation).toBe(MechLocation.LEFT_ARM);
  });

  it('should return selection mode', () => {
    const { result } = renderHook(() => useSelection());

    expect(result.current.selectionMode).toBe('click');
  });

  it('should call selectEquipment', () => {
    const { result } = renderHook(() => useSelection());
    const newEquipment = {
      id: 'eq-2',
      name: 'PPC',
      equipmentId: 'eq-2',
      criticalSlots: 3,
      source: 'browser' as const,
    };

    act(() => {
      result.current.selectEquipment(newEquipment);
    });

    expect(mockCustomizerStore.selectEquipment).toHaveBeenCalledWith(
      newEquipment,
    );
  });

  it('should call selectLocation', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.selectLocation(MechLocation.RIGHT_TORSO);
    });

    expect(mockCustomizerStore.selectLocation).toHaveBeenCalledWith(
      MechLocation.RIGHT_TORSO,
    );
  });

  it('should call clearSelection', () => {
    const { result } = renderHook(() => useSelection());

    act(() => {
      result.current.clearSelection();
    });

    expect(mockCustomizerStore.clearSelection).toHaveBeenCalled();
  });
});

describe('useUnitEditor Hook', () => {
  const mockUseMultiUnitStore = useMultiUnitStore as jest.MockedFunction<
    typeof useMultiUnitStore
  >;
  const mockUseCustomizerStore = useCustomizerStore as jest.MockedFunction<
    typeof useCustomizerStore
  >;

  const mockMultiUnitStore = {
    tabs: [{ id: 'tab-1', name: 'Atlas', isModified: false, tonnage: 100 }],
    activeTabId: 'tab-1',
    isLoading: false,
    selectTab: jest.fn(),
    createTab: jest.fn(),
    duplicateTab: jest.fn(),
    closeTab: jest.fn(),
    renameTab: jest.fn(),
    markModified: jest.fn(),
    isNewTabModalOpen: false,
    openNewTabModal: jest.fn(),
    closeNewTabModal: jest.fn(),
  };

  const mockCustomizerStore = {
    selectedEquipment: null,
    selectedLocation: null,
    selectionMode: 'click' as const,
    selectEquipment: jest.fn(),
    selectLocation: jest.fn(),
    clearSelection: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMultiUnitStore.mockReturnValue(mockMultiUnitStore);
    mockUseCustomizerStore.mockReturnValue(mockCustomizerStore);
  });

  it('should return combined unit and selection context', () => {
    const { result } = renderHook(() => useUnitEditor());

    // Unit context properties
    expect(result.current.tab).toBeDefined();
    expect(result.current.allTabs).toBeDefined();
    expect(result.current.activeTabId).toBe('tab-1');

    // Selection context properties
    expect(result.current.selection).toBeDefined();
    expect(result.current.selection.selectedEquipment).toBeNull();
    expect(result.current.selection.selectedLocation).toBeNull();
  });

  it('should have selection actions', () => {
    const { result } = renderHook(() => useUnitEditor());

    expect(result.current.selection.selectEquipment).toBeDefined();
    expect(result.current.selection.selectLocation).toBeDefined();
    expect(result.current.selection.clearSelection).toBeDefined();
  });

  it('should have unit actions', () => {
    const { result } = renderHook(() => useUnitEditor());

    expect(result.current.selectTab).toBeDefined();
    expect(result.current.createNewUnit).toBeDefined();
    expect(result.current.closeTab).toBeDefined();
  });
});
