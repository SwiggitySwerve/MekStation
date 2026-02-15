import { useCallback, useState } from 'react';

import { useToast } from '@/components/shared/Toast';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import { Era } from '@/types/temporal/Era';
import { logger } from '@/utils/logger';
import { getEraForYear } from '@/utils/temporal/eraUtils';

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

export function useDialogHandlers(
  performCloseTab: (tabId: string) => void,
  renameTab: (tabId: string, name: string) => void,
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

  const handleCloseDialogSave = useCallback(() => {
    if (closeDialog.tabId) {
      const unitStore = getUnitStore(closeDialog.tabId);
      if (unitStore) {
        const state = unitStore.getState();
        setCloseDialog(INITIAL_CLOSE_DIALOG);
        setSaveDialog({
          isOpen: true,
          tabId: closeDialog.tabId,
          chassis: state.name || 'New Mech',
          variant: '',
          closeAfterSave: true,
        });
        return;
      }
    }
    setCloseDialog(INITIAL_CLOSE_DIALOG);
  }, [closeDialog.tabId]);

  const handleSaveDialogCancel = useCallback(() => {
    setSaveDialog(INITIAL_SAVE_DIALOG);
  }, []);

  const handleSaveDialogSave = useCallback(
    async (chassis: string, variant: string, overwriteId?: string) => {
      if (!saveDialog.tabId) {
        return;
      }

      const unitStore = getUnitStore(saveDialog.tabId);
      if (!unitStore) {
        return;
      }

      const state = unitStore.getState();

      try {
        const era = getEraForYear(state.year) ?? Era.LATE_SUCCESSION_WARS;
        const unitData = {
          id: overwriteId || saveDialog.tabId,
          chassis,
          variant,
          tonnage: state.tonnage,
          techBase: state.techBase,
          era,
          unitType: 'BattleMech' as const,
          engineType: state.engineType,
          engineRating: state.engineRating,
          gyroType: state.gyroType,
          internalStructureType: state.internalStructureType,
          cockpitType: state.cockpitType,
          heatSinkType: state.heatSinkType,
          heatSinkCount: state.heatSinkCount,
          armorType: state.armorType,
          armorAllocation: state.armorAllocation,
        };

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

        showToast({
          message: `Unit "${chassis} ${variant}" saved successfully!`,
          variant: 'success',
        });

        state.markModified(false);
        renameTab(saveDialog.tabId, `${chassis} ${variant}`);

        const shouldClose = saveDialog.closeAfterSave;
        const tabIdToClose = saveDialog.tabId;
        setSaveDialog(INITIAL_SAVE_DIALOG);

        if (shouldClose) {
          performCloseTab(tabIdToClose);
        }
      } catch (error) {
        logger.error('Failed to save unit:', error);
        showToast({
          message: 'Failed to save unit. Please try again.',
          variant: 'error',
        });
      }
    },
    [
      saveDialog.tabId,
      saveDialog.closeAfterSave,
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
  };
}
