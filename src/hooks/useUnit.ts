/**
 * useUnit Hook
 *
 * Provides access to the currently active unit in the customizer.
 * Combines multi-unit store state with unit-specific data.
 *
 * @spec openspec/specs/multi-unit-tabs/spec.md
 */

import { useMemo, useCallback } from 'react';

import {
  useCustomizerSelector,
  EquipmentSelection,
} from '@/stores/useCustomizerStore';
import {
  useMultiUnitSelector,
  UnitTab,
  UNIT_TEMPLATES,
} from '@/stores/useMultiUnitStore';
import { MechLocation } from '@/types/construction';
import { TechBase } from '@/types/enums/TechBase';

/**
 * Unit context returned by the hook
 */
export interface UnitContext {
  // Current unit tab
  readonly tab: UnitTab | null;
  readonly isLoading: boolean;
  readonly hasUnsavedChanges: boolean;

  // All tabs
  readonly allTabs: readonly UnitTab[];
  readonly activeTabId: string | null;

  // Actions
  readonly selectTab: (tabId: string) => void;
  readonly createNewUnit: (tonnage: number, techBase?: TechBase) => string;
  readonly duplicateCurrentUnit: () => string | null;
  readonly closeTab: (tabId: string) => void;
  readonly renameUnit: (name: string) => void;
  readonly markModified: () => void;
  readonly markSaved: () => void;

  // Modal state
  readonly isNewTabModalOpen: boolean;
  readonly openNewTabModal: () => void;
  readonly closeNewTabModal: () => void;
}

/**
 * Selection context returned by the hook
 */
export interface SelectionContext {
  readonly selectedEquipment: EquipmentSelection | null;
  readonly selectedLocation: MechLocation | null;
  readonly selectionMode: 'click' | 'drag';

  readonly selectEquipment: (equipment: EquipmentSelection | null) => void;
  readonly selectLocation: (location: MechLocation | null) => void;
  readonly clearSelection: () => void;
}

/**
 * Hook to access the current unit context
 */
export function useUnit(): UnitContext {
  const tabs = useMultiUnitSelector((state) => state.tabs);
  const activeTabId = useMultiUnitSelector((state) => state.activeTabId);
  const isLoading = useMultiUnitSelector((state) => state.isLoading);
  const selectTab = useMultiUnitSelector((state) => state.selectTab);
  const createTab = useMultiUnitSelector((state) => state.createTab);
  const duplicateTab = useMultiUnitSelector((state) => state.duplicateTab);
  const closeTab = useMultiUnitSelector((state) => state.closeTab);
  const renameTab = useMultiUnitSelector((state) => state.renameTab);
  const markModified = useMultiUnitSelector((state) => state.markModified);
  const isNewTabModalOpen = useMultiUnitSelector(
    (state) => state.isNewTabModalOpen,
  );
  const openNewTabModal = useMultiUnitSelector(
    (state) => state.openNewTabModal,
  );
  const closeNewTabModal = useMultiUnitSelector(
    (state) => state.closeNewTabModal,
  );

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || null,
    [tabs, activeTabId],
  );

  const createNewUnit = useCallback(
    (tonnage: number, techBase: TechBase = TechBase.INNER_SPHERE) => {
      // Find matching template
      const template =
        UNIT_TEMPLATES.find((t) => t.tonnage === tonnage) || UNIT_TEMPLATES[1]; // Default to medium
      const templateWithTechBase = { ...template, techBase };
      return createTab(templateWithTechBase);
    },
    [createTab],
  );

  const duplicateCurrentUnit = useCallback(() => {
    if (!activeTabId) return null;
    return duplicateTab(activeTabId);
  }, [activeTabId, duplicateTab]);

  const renameUnit = useCallback(
    (name: string) => {
      if (activeTabId) {
        renameTab(activeTabId, name);
      }
    },
    [activeTabId, renameTab],
  );

  const markModifiedCallback = useCallback(() => {
    if (activeTabId) {
      markModified(activeTabId, true);
    }
  }, [activeTabId, markModified]);

  const markSaved = useCallback(() => {
    if (activeTabId) {
      markModified(activeTabId, false);
    }
  }, [activeTabId, markModified]);

  return {
    tab: activeTab,
    isLoading,
    hasUnsavedChanges: activeTab?.isModified ?? false,
    allTabs: tabs,
    activeTabId,
    selectTab,
    createNewUnit,
    duplicateCurrentUnit,
    closeTab,
    renameUnit,
    markModified: markModifiedCallback,
    markSaved,
    isNewTabModalOpen,
    openNewTabModal,
    closeNewTabModal,
  };
}

/**
 * Hook to access selection state (equipment and location selection)
 */
export function useSelection(): SelectionContext {
  const selectedEquipment = useCustomizerSelector(
    (state) => state.selectedEquipment,
  );
  const selectedLocation = useCustomizerSelector(
    (state) => state.selectedLocation,
  );
  const selectionMode = useCustomizerSelector((state) => state.selectionMode);
  const selectEquipment = useCustomizerSelector(
    (state) => state.selectEquipment,
  );
  const selectLocation = useCustomizerSelector((state) => state.selectLocation);
  const clearSelection = useCustomizerSelector((state) => state.clearSelection);

  return {
    selectedEquipment,
    selectedLocation,
    selectionMode,
    selectEquipment,
    selectLocation,
    clearSelection,
  };
}

/**
 * Combined hook for unit and selection context
 */
export function useUnitEditor(): UnitContext & { selection: SelectionContext } {
  const unit = useUnit();
  const selection = useSelection();

  return {
    ...unit,
    selection,
  };
}
