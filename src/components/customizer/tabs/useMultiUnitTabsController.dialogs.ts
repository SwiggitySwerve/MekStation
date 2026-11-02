import { useCallback, useState } from 'react';

import type { TabInfo } from '@/stores/useTabManagerStore';

import { useToast } from '@/components/shared/Toast';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { recordUnitLibrarySave } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { Era } from '@/types/temporal/Era';
import { logger } from '@/utils/logger';
import {
  serializeCustomUnitState,
  serializeCustomVehicleState,
} from '@/utils/serialization/CustomUnitSerializer';
import { getEraForYear } from '@/utils/temporal/eraUtils';

import {
  getLibrarySaveDisabledReason,
  getLibrarySaveStore,
} from './MultiUnitTabsUnitState';

export interface CloseDialogState {
  isOpen: boolean;
  tabId: string | null;
  tabName: string;
}

export interface SaveDialogState {
  isOpen: boolean;
  tabId: string | null;
  chassis: string;
  variant: string;
  closeAfterSave: boolean;
}

const INITIAL_CLOSE_DIALOG: CloseDialogState = {
  isOpen: false,
  tabId: null,
  tabName: '',
};

const INITIAL_SAVE_DIALOG: SaveDialogState = {
  isOpen: false,
  tabId: null,
  chassis: '',
  variant: '',
  closeAfterSave: false,
};

type GetTabById = (tabId: string) => TabInfo | undefined;

function readLibrarySaveReference(result: {
  success: boolean;
  id?: string;
  version?: number;
}): { id: string; version: number } | null {
  if (!result.success) return null;
  const { id, version } = result;
  if (typeof id !== 'string' || id.length === 0) return null;
  if (
    typeof version !== 'number' ||
    !Number.isSafeInteger(version) ||
    version < 1
  ) {
    return null;
  }
  return { id, version };
}

export function useDialogHandlers(
  performCloseTab: (tabId: string) => void,
  renameTab: (tabId: string, name: string) => void,
  getTabById: GetTabById,
): {
  closeDialog: CloseDialogState;
  saveDialog: SaveDialogState;
  handleCloseDialogCancel: () => void;
  handleCloseDialogDiscard: () => void;
  handleCloseDialogSave: () => void;
  handleSaveDialogCancel: () => void;
  handleSaveDialogSave: (
    chassis: string,
    variant: string,
    overwriteId?: string,
  ) => Promise<void>;
  openCloseDialog: (tabId: string, tabName: string) => void;
  openSaveDialog: (tabId: string) => void;
} {
  const { showToast } = useToast();

  const [closeDialog, setCloseDialog] =
    useState<CloseDialogState>(INITIAL_CLOSE_DIALOG);
  const [saveDialog, setSaveDialog] =
    useState<SaveDialogState>(INITIAL_SAVE_DIALOG);

  const handleCloseDialogCancel = useCallback(() => {
    setCloseDialog(INITIAL_CLOSE_DIALOG);
  }, []);

  const handleCloseDialogDiscard = useCallback(() => {
    if (closeDialog.tabId) {
      performCloseTab(closeDialog.tabId);
    }
    setCloseDialog(INITIAL_CLOSE_DIALOG);
  }, [closeDialog.tabId, performCloseTab]);

  const openSaveDialogForTab = useCallback(
    (tabId: string, closeAfterSave: boolean) => {
      const disabledReason = getLibrarySaveDisabledReason(getTabById(tabId));
      if (disabledReason) {
        showToast({ message: disabledReason, variant: 'error' });
        return;
      }

      const unitStore = getLibrarySaveStore(tabId, getTabById(tabId)?.unitType);
      if (!unitStore) {
        showToast({
          message: 'This unit is no longer available to save.',
          variant: 'error',
        });
        return;
      }

      const state = unitStore.getState();
      setSaveDialog({
        isOpen: true,
        tabId,
        chassis: state.chassis || state.name || 'New Mech',
        variant: state.model || '',
        closeAfterSave,
      });

      if (closeAfterSave) {
        setCloseDialog(INITIAL_CLOSE_DIALOG);
      }
    },
    [getTabById, showToast],
  );

  const handleCloseDialogSave = useCallback(() => {
    if (closeDialog.tabId) {
      openSaveDialogForTab(closeDialog.tabId, true);
    }
  }, [closeDialog.tabId, openSaveDialogForTab]);

  const openSaveDialog = useCallback(
    (tabId: string) => {
      openSaveDialogForTab(tabId, false);
    },
    [openSaveDialogForTab],
  );

  const handleSaveDialogCancel = useCallback(() => {
    setSaveDialog(INITIAL_SAVE_DIALOG);
  }, []);

  const handleSaveDialogSave = useCallback(
    async (chassis: string, variant: string, overwriteId?: string) => {
      if (!saveDialog.tabId) {
        return;
      }

      const disabledReason = getLibrarySaveDisabledReason(
        getTabById(saveDialog.tabId),
      );
      if (disabledReason) {
        showToast({ message: disabledReason, variant: 'error' });
        return;
      }

      const unitStore = getLibrarySaveStore(
        saveDialog.tabId,
        getTabById(saveDialog.tabId)?.unitType,
      );
      if (!unitStore) {
        showToast({
          message: 'This unit is no longer available to save.',
          variant: 'error',
        });
        return;
      }

      const state = unitStore.getState();
      const mechStore =
        'configuration' in state ? getUnitStore(saveDialog.tabId) : undefined;

      try {
        const era = getEraForYear(state.year) ?? Era.LATE_SUCCESSION_WARS;
        const identity = {
          id: overwriteId ?? saveDialog.tabId,
          chassis,
          variant,
          era,
        };
        const unitData =
          'configuration' in state
            ? serializeCustomUnitState(state, identity)
            : serializeCustomVehicleState(state, identity);

        // The legacy API type names persisted data as IFullUnit even though
        // this path writes the canonical ISerializedUnit contract.
        let result;
        if (overwriteId) {
          result = await customUnitApiService.save(
            overwriteId,
            unitData as never,
          );
        } else {
          result = await customUnitApiService.create(
            unitData as never,
            chassis,
            variant,
          );
        }

        if (!result.success) {
          logger.error('Failed to save unit:', result.error);
          showToast({
            message: `Failed to save unit: ${result.error}`,
            variant: 'error',
          });
          return;
        }

        const reference = readLibrarySaveReference(result);
        if (!reference) {
          logger.error(
            'Failed to save unit: library response omitted id/version',
          );
          showToast({
            message:
              'The library did not return a saved identity. The draft was not marked as a library save.',
            variant: 'error',
          });
          return;
        }

        const unitName = [chassis, variant].filter(Boolean).join(' ');
        const savedState = {
          ...state,
          chassis,
          model: variant,
          name: unitName,
        };
        const storeStillOpen =
          getLibrarySaveStore(
            saveDialog.tabId,
            getTabById(saveDialog.tabId)?.unitType,
          ) === unitStore;
        const stillCurrent = unitStore.getState() === state;
        const tabStillOpen = Boolean(getTabById(saveDialog.tabId));

        let browserSaveFailed = false;
        if (storeStillOpen) {
          if (stillCurrent && tabStillOpen) {
            try {
              unitStore.setState({
                chassis,
                model: variant,
                name: unitName,
                lastModifiedAt: Date.now(),
              });
            } catch (error) {
              browserSaveFailed = true;
              logger.error(
                'Library saved but browser draft write failed:',
                error,
              );
            }
          }
          try {
            if ('configuration' in savedState) {
              if (mechStore)
                recordUnitLibrarySave(mechStore, reference, savedState);
            } else {
              unitStore.setState({ isModified: !stillCurrent });
            }
          } catch (error) {
            browserSaveFailed = true;
            logger.error(
              'Library saved but browser receipt write failed:',
              error,
            );
          }
          if (stillCurrent && tabStillOpen) {
            try {
              renameTab(saveDialog.tabId, unitName);
            } catch (error) {
              browserSaveFailed = true;
              logger.error(
                'Library saved but browser tab write failed:',
                error,
              );
            }
          }
        }
        if (browserSaveFailed) {
          showToast({
            message: `Unit "${unitName}" saved to the library as v${reference.version}, but the browser draft save failed. Keep this tab open and retry the browser draft.`,
            variant: 'warning',
          });
          setSaveDialog(INITIAL_SAVE_DIALOG);
          return;
        }

        if (!tabStillOpen || !storeStillOpen) {
          showToast({
            message: `Unit "${unitName}" saved, but its source tab is no longer open.`,
            variant: 'warning',
          });
          setSaveDialog(INITIAL_SAVE_DIALOG);
          return;
        }

        if (!stillCurrent) {
          showToast({
            message: `Unit "${unitName}" saved, but newer browser draft changes remain.`,
            variant: 'warning',
          });
          setSaveDialog(INITIAL_SAVE_DIALOG);
          return;
        }

        showToast({
          message: `Unit "${unitName}" saved successfully!`,
          variant: 'success',
        });

        const shouldClose = saveDialog.closeAfterSave;
        const tabIdToClose = saveDialog.tabId;
        setSaveDialog(INITIAL_SAVE_DIALOG);

        if (shouldClose) {
          performCloseTab(tabIdToClose);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown save error';
        logger.error('Failed to save unit:', errorMessage);
        showToast({
          message: 'Failed to save unit. Please try again.',
          variant: 'error',
        });
      }
    },
    [
      saveDialog.tabId,
      saveDialog.closeAfterSave,
      getTabById,
      renameTab,
      performCloseTab,
      showToast,
    ],
  );

  const openCloseDialog = useCallback((tabId: string, tabName: string) => {
    setCloseDialog({
      isOpen: true,
      tabId,
      tabName,
    });
  }, []);

  return {
    closeDialog,
    saveDialog,
    handleCloseDialogCancel,
    handleCloseDialogDiscard,
    handleCloseDialogSave,
    handleSaveDialogCancel,
    handleSaveDialogSave,
    openCloseDialog,
    openSaveDialog,
  };
}
