import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { LoadUnitSource } from '@/components/customizer/dialogs/UnitLoadDialog';
import type { IExportableUnit, IImportHandlers } from '@/types/vault';

import { useToast } from '@/components/shared/Toast';
import {
  DEFAULT_TAB,
  buildCustomizerIndexUrl,
  buildCustomizerUrl,
  isValidTabId,
  type CustomizerTabId,
} from '@/hooks/useCustomizerRouter';
import { IUnitIndexEntry } from '@/services/common/types';
import { LoadRequestCoordinator } from '@/services/units/unitLoaderService/LoadRequestCoordinator';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { createNewUnitWithRouting } from './MultiUnitTabsCreateUnit';
import {
  getLibrarySaveDisabledReason,
  getTabDisplayState,
  isTabModified,
  subscribeToTabDisplayState,
} from './MultiUnitTabsUnitState';
import { getSavedHistoryDisabledReason } from './savedHistoryAccess';
import {
  useDialogHandlers,
  type CloseDialogState,
  type SaveDialogState,
} from './useMultiUnitTabsController.dialogs';
import {
  buildActiveUnitExportData,
  createUnitImportHandlers,
  loadUnitIntoTab,
} from './useMultiUnitTabsController.helpers';
import {
  useSavedHistoryDialog,
  type HistoryDialogState,
} from './useSavedHistoryDialog';

export type { CloseDialogState, SaveDialogState, HistoryDialogState };

interface UseMultiUnitTabsControllerResult {
  tabs: ReturnType<typeof useTabManagerStore.getState>['tabs'];
  activeTabId: string | null;
  isLoading: boolean;
  isNewTabModalOpen: boolean;
  closeDialog: CloseDialogState;
  saveDialog: SaveDialogState;
  librarySaveDisabledReason: string | null;
  savedHistoryDisabledReason: string | null;
  isLoadDialogOpen: boolean;
  isLoadingUnit: boolean;
  cancelPendingLoad: () => void;
  isExportDialogOpen: boolean;
  isImportDialogOpen: boolean;
  tabBarTabs: Array<ReturnType<typeof getTabDisplayState>>;
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
  openSaveDialog: () => void;
  openSavedHistory: () => void;
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
  historyDialog: HistoryDialogState;
  closeHistoryDialog: () => void;
  restoreHistoryVersion: (version: number) => Promise<void>;
}

export function useMultiUnitTabsController(): UseMultiUnitTabsControllerResult {
  const router = useRouter();
  const { showToast } = useToast();

  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState(false);
  const [isLoadingUnit, setIsLoadingUnit] = useState(false);
  const loadRequests = useRef(new LoadRequestCoordinator());
  const cancelPendingLoad = useCallback(() => {
    loadRequests.current.cancel();
    setIsLoadingUnit(false);
  }, []);
  useEffect(() => {
    const requests = loadRequests.current;
    return () => requests.cancel();
  }, []);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const isNewTabModalOpen = useTabManagerStore((s) => s.isNewTabModalOpen);

  const storeCloseTab = useTabManagerStore((s) => s.closeTab);
  const renameTab = useTabManagerStore((s) => s.renameTab);
  const createTab = useTabManagerStore((s) => s.createTab);
  const addTab = useTabManagerStore((s) => s.addTab);
  const openNewTabModal = useTabManagerStore((s) => s.openNewTabModal);
  const closeNewTabModal = useTabManagerStore((s) => s.closeNewTabModal);
  const getLastSubTab = useTabManagerStore((s) => s.getLastSubTab);

  const navigateToTab = useCallback(
    (tabId: string) => {
      router.push(
        buildCustomizerUrl(tabId, DEFAULT_TAB, router.query),
        undefined,
        {
          shallow: true,
        },
      );
    },
    [router],
  );

  const selectTab = useCallback(
    (tabId: string) => {
      const lastSubTab = getLastSubTab(tabId);
      const tabToNavigate: CustomizerTabId =
        lastSubTab && isValidTabId(lastSubTab) ? lastSubTab : DEFAULT_TAB;
      router.push(
        buildCustomizerUrl(tabId, tabToNavigate, router.query),
        undefined,
        {
          shallow: true,
        },
      );
    },
    [router, getLastSubTab],
  );

  const performCloseTab = useCallback(
    (tabId: string) => {
      storeCloseTab(tabId);

      const newState = useTabManagerStore.getState();
      if (newState.tabs.length === 0) {
        router.push(buildCustomizerIndexUrl(router.query), undefined, {
          shallow: true,
        });
      } else if (newState.activeTabId && newState.activeTabId !== tabId) {
        router.push(
          buildCustomizerUrl(newState.activeTabId, DEFAULT_TAB, router.query),
          undefined,
          {
            shallow: true,
          },
        );
      }
    },
    [storeCloseTab, router],
  );

  const getTabById = useCallback(
    (tabId: string) =>
      useTabManagerStore.getState().tabs.find((tab) => tab.id === tabId),
    [],
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
    openSaveDialog: openSaveDialogForTab,
  } = useDialogHandlers(performCloseTab, renameTab, getTabById);

  const {
    historyDialog,
    openHistoryDialog,
    closeHistoryDialog,
    restoreHistoryVersion,
  } = useSavedHistoryDialog(getTabById, activeTabId);
  useEffect(() => {
    closeHistoryDialog();
  }, [activeTabId, closeHistoryDialog]);

  const activeTab = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId),
    [tabs, activeTabId],
  );
  const librarySaveDisabledReason = getLibrarySaveDisabledReason(activeTab);
  const savedHistoryDisabledReason = getSavedHistoryDisabledReason(activeTab);
  const openSaveDialog = useCallback(() => {
    if (activeTabId) {
      openSaveDialogForTab(activeTabId);
    }
  }, [activeTabId, openSaveDialogForTab]);
  const openSavedHistory = useCallback(() => {
    if (activeTabId) {
      openHistoryDialog(activeTabId);
    }
  }, [activeTabId, openHistoryDialog]);

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
    cancelPendingLoad();
    setIsLoadDialogOpen(false);
  }, [cancelPendingLoad]);

  const handleLoadUnit = useCallback(
    async (unit: IUnitIndexEntry, source: LoadUnitSource) => {
      const requests = loadRequests.current;
      const ticket = requests.begin(
        JSON.stringify([source, unit.family ?? 'battlemechs', unit.id]),
      );
      if (!ticket) return;
      try {
        await loadUnitIntoTab({
          unit,
          source,
          createTab,
          navigateToTab,
          setIsLoadDialogOpen,
          setIsLoadingUnit,
          showToast,
          isCurrent: () => requests.isCurrent(ticket),
        });
      } finally {
        requests.finish(ticket);
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

  const activeUnitExportData = useMemo(
    (): IExportableUnit | null => buildActiveUnitExportData(activeTabId),
    [activeTabId],
  );

  const unitImportHandlers = useMemo(
    (): IImportHandlers<IExportableUnit> =>
      createUnitImportHandlers(tabs, addTab),
    [tabs, addTab],
  );

  const [, setTabDisplayVersion] = useState(0);
  useEffect(() => {
    const changed = (): void => setTabDisplayVersion((version) => version + 1);
    const unsubscribe = tabs.map((tab) =>
      subscribeToTabDisplayState(tab, changed),
    );
    changed();
    return () => unsubscribe.forEach((stop) => stop());
  }, [tabs]);
  const tabBarTabs = tabs.map((tab) => getTabDisplayState(tab));

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
    librarySaveDisabledReason,
    savedHistoryDisabledReason,
    isLoadDialogOpen,
    isLoadingUnit,
    cancelPendingLoad,
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
    openSaveDialog,
    openSavedHistory,
    createNewUnit,
    handleLoadUnit,
    handleCloseDialogCancel,
    handleCloseDialogDiscard,
    handleCloseDialogSave,
    handleSaveDialogCancel,
    handleSaveDialogSave,
    handleImportComplete,
    historyDialog,
    closeHistoryDialog,
    restoreHistoryVersion,
  };
}
