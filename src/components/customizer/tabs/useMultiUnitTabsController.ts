import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type { LoadUnitSource } from '@/components/customizer/dialogs/UnitLoadDialog';
import type { UnitState } from '@/stores/unitState';
import type {
  IExportableUnit,
  IImportHandlers,
  IImportSource,
} from '@/types/vault';

import { useToast } from '@/components/shared/Toast';
import {
  DEFAULT_TAB,
  isValidTabId,
  type CustomizerTabId,
} from '@/hooks/useCustomizerRouter';
import { IUnitIndexEntry } from '@/services/common/types';
import { unitLoaderService } from '@/services/units/unitLoaderService';
import {
  createUnitFromFullState,
  getUnitStore,
} from '@/stores/unitStoreRegistry';
import {
  UNIT_TEMPLATES,
  useTabManagerStore,
} from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { logger } from '@/utils/logger';
import { generateUUID } from '@/utils/uuid';

import { createNewUnitWithRouting } from './MultiUnitTabsCreateUnit';
import { getTabDisplayState, isTabModified } from './MultiUnitTabsUnitState';
import {
  useDialogHandlers,
  type CloseDialogState,
  type SaveDialogState,
} from './useMultiUnitTabsController.dialogs';

export type { CloseDialogState, SaveDialogState };

interface UseMultiUnitTabsControllerResult {
  tabs: ReturnType<typeof useTabManagerStore.getState>['tabs'];
  activeTabId: string | null;
  isLoading: boolean;
  isNewTabModalOpen: boolean;
  closeDialog: CloseDialogState;
  saveDialog: SaveDialogState;
  isLoadDialogOpen: boolean;
  isExportDialogOpen: boolean;
  isImportDialogOpen: boolean;
  tabBarTabs: Array<{ id: string; name: string; isModified: boolean }>;
  activeUnitExportData: IExportableUnit | null;
  unitImportHandlers: IImportHandlers<IExportableUnit>;
  selectTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  renameTab: (tabId: string, name: string) => void;
  openNewTabModal: () => void;
  closeNewTabModal: () => void;
  openLoadDialog: () => void;
  closeLoadDialog: () => void;
  openExportDialog: () => void;
  closeExportDialog: () => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;
  createNewUnit: (
    tonnage: number,
    techBase?: TechBase,
    unitType?: UnitType,
  ) => string;
  handleLoadUnit: (
    unit: IUnitIndexEntry,
    source: LoadUnitSource,
  ) => Promise<void>;
  handleCloseDialogCancel: () => void;
  handleCloseDialogDiscard: () => void;
  handleCloseDialogSave: () => void;
  handleSaveDialogCancel: () => void;
  handleSaveDialogSave: (
    chassis: string,
    variant: string,
    overwriteId?: string,
  ) => Promise<void>;
  handleImportComplete: (count: number) => void;
}

export function useMultiUnitTabsController(): UseMultiUnitTabsControllerResult {
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [, setIsLoadingUnit] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const isNewTabModalOpen = useTabManagerStore((s) => s.isNewTabModalOpen);

  const storeSelectTab = useTabManagerStore((s) => s.selectTab);
  const storeCloseTab = useTabManagerStore((s) => s.closeTab);
  const renameTab = useTabManagerStore((s) => s.renameTab);
  const createTab = useTabManagerStore((s) => s.createTab);
  const addTab = useTabManagerStore((s) => s.addTab);
  const openNewTabModal = useTabManagerStore((s) => s.openNewTabModal);
  const closeNewTabModal = useTabManagerStore((s) => s.closeNewTabModal);
  const getLastSubTab = useTabManagerStore((s) => s.getLastSubTab);

  const navigateToTab = useCallback(
    (tabId: string) => {
      router.push(`/customizer/${tabId}/${DEFAULT_TAB}`, undefined, {
        shallow: true,
      });
    },
    [router],
  );

  const selectTab = useCallback(
    (tabId: string) => {
      storeSelectTab(tabId);
      const lastSubTab = getLastSubTab(tabId);
      const tabToNavigate: CustomizerTabId =
        lastSubTab && isValidTabId(lastSubTab) ? lastSubTab : DEFAULT_TAB;
      router.push(`/customizer/${tabId}/${tabToNavigate}`, undefined, {
        shallow: true,
      });
    },
    [storeSelectTab, router, getLastSubTab],
  );

  const performCloseTab = useCallback(
    (tabId: string) => {
      storeCloseTab(tabId);

      const newState = useTabManagerStore.getState();
      if (newState.tabs.length === 0) {
        router.push('/customizer', undefined, { shallow: true });
      } else if (newState.activeTabId && newState.activeTabId !== tabId) {
        router.push(
          `/customizer/${newState.activeTabId}/${DEFAULT_TAB}`,
          undefined,
          {
            shallow: true,
          },
        );
      }
    },
    [storeCloseTab, router],
  );

  const {
    closeDialog,
    saveDialog,
    handleCloseDialogCancel,
    handleCloseDialogDiscard,
    handleCloseDialogSave,
    handleSaveDialogCancel,
    handleSaveDialogSave,
    openCloseDialog,
  } = useDialogHandlers(performCloseTab, renameTab);

  const closeTab = useCallback(
    (tabId: string) => {
      const tabInfo = tabs.find((tab) => tab.id === tabId);
      const modified = isTabModified(tabId, tabInfo?.unitType);

      if (modified) {
        openCloseDialog(tabId, tabInfo?.name ?? 'Unknown Unit');
        return;
      }

      performCloseTab(tabId);
    },
    [tabs, performCloseTab, openCloseDialog],
  );

  const openLoadDialog = useCallback(() => {
    setIsLoadDialogOpen(true);
  }, []);

  const closeLoadDialog = useCallback(() => {
    setIsLoadDialogOpen(false);
  }, []);

  const handleLoadUnit = useCallback(
    async (unit: IUnitIndexEntry, source: LoadUnitSource) => {
      setIsLoadingUnit(true);

      try {
        const result = await unitLoaderService.loadUnit(unit.id, source);

        if (!result.success || !result.state) {
          logger.error('Failed to load unit:', result.error);
          const baseTemplate =
            UNIT_TEMPLATES.find((t) => t.tonnage === unit.tonnage) ||
            UNIT_TEMPLATES[1];
          const template = {
            ...baseTemplate,
            name: `${unit.chassis} ${unit.variant}`,
            tonnage: unit.tonnage,
            techBase: unit.techBase,
          };
          const newTabId = createTab(template);
          navigateToTab(newTabId);
          setIsLoadDialogOpen(false);
          setIsLoadingUnit(false);
          return;
        }

        const createdStore = createUnitFromFullState(result.state);
        const newTabId = result.state.id;

        void createdStore;

        useTabManagerStore.getState().addTab({
          id: newTabId,
          name: result.state.name,
          tonnage: result.state.tonnage,
          techBase: result.state.techBase,
        });

        showToast({
          message: `Unit "${result.state.name}" loaded`,
          variant: 'success',
        });

        navigateToTab(newTabId);
        setIsLoadDialogOpen(false);
      } catch (error) {
        logger.error('Error loading unit:', error);
        showToast({
          message: 'Failed to load unit. Please try again.',
          variant: 'error',
        });
      } finally {
        setIsLoadingUnit(false);
      }
    },
    [createTab, navigateToTab, showToast],
  );

  const createNewUnit = useCallback(
    (
      tonnage: number,
      techBase: TechBase = TechBase.INNER_SPHERE,
      unitType: UnitType = UnitType.BATTLEMECH,
    ) => {
      return createNewUnitWithRouting({
        tonnage,
        techBase,
        unitType,
        createTab,
        addTab,
        navigateToTab,
      });
    },
    [createTab, addTab, navigateToTab],
  );

  const activeUnitExportData = useMemo((): IExportableUnit | null => {
    if (!activeTabId) {
      return null;
    }

    const unitStore = getUnitStore(activeTabId);
    if (!unitStore) {
      return null;
    }

    const state = unitStore.getState();
    return {
      id: activeTabId,
      name: state.name,
      chassis: state.chassis || state.name,
      model: state.model || '',
      data: state,
    };
  }, [activeTabId]);

  const unitImportHandlers = useMemo(
    (): IImportHandlers<IExportableUnit> => ({
      checkExists: async (id: string) => {
        return tabs.some((tab) => tab.id === id);
      },
      checkNameConflict: async (name: string) => {
        const existing = tabs.find((tab) => tab.name === name);
        return existing ? { id: existing.id, name: existing.name } : null;
      },
      save: async (item: IExportableUnit, _source: IImportSource) => {
        const importedState = item.data as UnitState;
        const newId = generateUUID();

        createUnitFromFullState({
          ...importedState,
          id: newId,
          isModified: false,
        });

        addTab({
          id: newId,
          name: item.name,
          tonnage: importedState.tonnage,
          techBase: importedState.techBase,
        });

        return newId;
      },
    }),
    [tabs, addTab],
  );

  const tabBarTabs = useMemo(
    () => tabs.map((tab) => getTabDisplayState(tab)),
    [tabs],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'n' || event.key === 'N') {
          event.preventDefault();
          openNewTabModal();
        } else if (event.key === 'o' || event.key === 'O') {
          event.preventDefault();
          openLoadDialog();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openNewTabModal, openLoadDialog]);

  const openExportDialog = useCallback(() => {
    setIsExportDialogOpen(true);
  }, []);

  const closeExportDialog = useCallback(() => {
    setIsExportDialogOpen(false);
  }, []);

  const openImportDialog = useCallback(() => {
    setIsImportDialogOpen(true);
  }, []);

  const closeImportDialog = useCallback(() => {
    setIsImportDialogOpen(false);
  }, []);

  const handleImportComplete = useCallback(
    (count: number) => {
      showToast({
        message: `Imported ${count} unit(s)`,
        variant: 'success',
      });
      setIsImportDialogOpen(false);
    },
    [showToast],
  );

  return {
    tabs,
    activeTabId,
    isLoading,
    isNewTabModalOpen,
    closeDialog,
    saveDialog,
    isLoadDialogOpen,
    isExportDialogOpen,
    isImportDialogOpen,
    tabBarTabs,
    activeUnitExportData,
    unitImportHandlers,
    selectTab,
    closeTab,
    renameTab,
    openNewTabModal,
    closeNewTabModal,
    openLoadDialog,
    closeLoadDialog,
    openExportDialog,
    closeExportDialog,
    openImportDialog,
    closeImportDialog,
    createNewUnit,
    handleLoadUnit,
    handleCloseDialogCancel,
    handleCloseDialogDiscard,
    handleCloseDialogSave,
    handleSaveDialogCancel,
    handleSaveDialogSave,
    handleImportComplete,
  };
}
