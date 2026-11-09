import { useCallback, useRef, useState } from 'react';

import type { TabInfo } from '@/stores/useTabManagerStore';
import type { IUnitContract } from '@/types/contracts';
import type { ISerializedUnit } from '@/types/unit/UnitSerialization';

import { useToast } from '@/components/shared/Toast';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import {
  createUnitLibrarySaveReceipt,
  isUnitDraftModified,
} from '@/stores/unitSaveState';
import {
  getEditorDraftFingerprint,
  getEditorLibraryFingerprint,
  getEditorLibrarySavePatch,
} from '@/stores/unitSaveStateAdapters';
import { Era } from '@/types/temporal/Era';
import { logger } from '@/utils/logger';
import {
  type CustomUnitSaveIdentity,
  serializeCustomUnitState,
  serializeCustomVehicleState,
  serializeCustomAerospaceState,
  serializeCustomSmallUnitState,
} from '@/utils/serialization/CustomUnitSerializer';
import { getEraForYear } from '@/utils/temporal/eraUtils';

import {
  getLibrarySaveDisabledReason,
  getLibrarySaveEditor,
  getLibrarySaveStore,
} from './MultiUnitTabsUnitState';

/** Route dialog readiness and writes through the same family serializers. */
export function serializeCustomLibraryState(
  state: ReturnType<
    NonNullable<ReturnType<typeof getLibrarySaveStore>>['getState']
  >,
  identity: Omit<CustomUnitSaveIdentity, 'era'> = {
    id: state.id,
    chassis: state.chassis,
    variant: state.model,
  },
): ISerializedUnit | IUnitContract {
  const saveIdentity = {
    ...identity,
    era: getEraForYear(state.year) ?? Era.LATE_SUCCESSION_WARS,
  };
  const editor = getLibrarySaveEditor(state);
  switch (editor.store) {
    case 'battlemech':
      return serializeCustomUnitState(editor.state, saveIdentity);
    case 'vehicle':
      return serializeCustomVehicleState(editor.state, saveIdentity);
    case 'aerospace':
      return serializeCustomAerospaceState(editor.state, saveIdentity);
    case 'infantry':
    case 'battlearmor':
    case 'protomech':
      return serializeCustomSmallUnitState(editor.state, saveIdentity);
    default: {
      const unhandled: never = editor;
      throw new Error(`Unhandled library save editor: ${String(unhandled)}`);
    }
  }
}

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
  if (result.success !== true) return null;
  const { id, version } = result;
  if (typeof id !== 'string' || id.trim().length === 0) return null;
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
  isSaving: boolean;
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
  const saveInFlight = useRef(false);
  const [isSaving, setIsSaving] = useState(false);

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
      if (saveInFlight.current) return;
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
    if (saveInFlight.current) return;
    setSaveDialog(INITIAL_SAVE_DIALOG);
  }, []);

  const handleSaveDialogSave = useCallback(
    async (chassis: string, variant: string, overwriteId?: string) => {
      if (saveInFlight.current || !saveDialog.isOpen || !saveDialog.tabId) {
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
      const targetId = saveDialog.tabId;

      // React state alone cannot reject a second submission before rendering.
      saveInFlight.current = true;
      setIsSaving(true);
      try {
        const identity = {
          id: overwriteId ?? saveDialog.tabId,
          chassis,
          variant,
        };
        const unitName = [chassis, variant].filter(Boolean).join(' ');
        const savedState = {
          ...state,
          chassis,
          model: variant,
          name: unitName,
        };
        // Capture immutable comparison values before awaiting the HTTP boundary.
        const sourceFingerprint = getEditorDraftFingerprint(
          getLibrarySaveEditor(state),
        );
        const savedEditor = getLibrarySaveEditor(savedState);
        const submitted = {
          draft: getEditorDraftFingerprint(savedEditor),
          library: getEditorLibraryFingerprint(savedEditor),
        };
        const unitData = serializeCustomLibraryState(state, identity);

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

        const targetStillOpen = () => {
          const tab = getTabById(targetId);
          return (
            Boolean(tab) &&
            getLibrarySaveStore(targetId, tab?.unitType) === unitStore
          );
        };
        const finishWithWarning = (message: string) => {
          showToast({ message, variant: 'warning' });
          setSaveDialog(INITIAL_SAVE_DIALOG);
        };
        const unavailableMessage = `Unit "${unitName}" saved, but its source tab is no longer open.`;
        if (!targetStillOpen()) {
          finishWithWarning(unavailableMessage);
          return;
        }
        const stillCurrent = !isUnitDraftModified(
          () =>
            getEditorDraftFingerprint(
              getLibrarySaveEditor(unitStore.getState()),
            ),
          sourceFingerprint,
        );
        const librarySave = createUnitLibrarySaveReceipt(reference, submitted);
        const identityPatch = stillCurrent
          ? {
              chassis,
              model: variant,
              name: unitName,
              lastModifiedAt: Date.now(),
            }
          : {};
        let browserSaveFailed = false;
        try {
          // One write keeps identity and receipt together. Zustand retains this
          // confirmed receipt in memory even when browser persistence throws.
          unitStore.setState({
            ...identityPatch,
            ...getEditorLibrarySavePatch(
              getLibrarySaveEditor({
                ...unitStore.getState(),
                ...identityPatch,
              }),
              librarySave,
            ),
          });
        } catch (error) {
          browserSaveFailed = true;
          logger.error('Library saved but browser draft write failed:', error);
        }
        const contentStillSaved = () =>
          !getEditorLibrarySavePatch(
            getLibrarySaveEditor(unitStore.getState()),
            librarySave,
          ).isModified;
        if (targetStillOpen() && contentStillSaved()) {
          try {
            renameTab(saveDialog.tabId, unitName);
          } catch (error) {
            browserSaveFailed = true;
            logger.error('Library saved but browser tab write failed:', error);
          }
        }
        if (browserSaveFailed) {
          finishWithWarning(
            `Unit "${unitName}" saved to the library as v${reference.version}, but the browser draft save failed. Keep this tab open and retry the browser draft.`,
          );
          return;
        }

        if (!targetStillOpen()) {
          finishWithWarning(unavailableMessage);
          return;
        }

        if (!contentStillSaved()) {
          finishWithWarning(
            `Unit "${unitName}" saved, but newer browser draft changes remain.`,
          );
          return;
        }

        showToast({
          message: `Unit "${unitName}" saved successfully!`,
          variant: 'success',
        });

        const shouldClose = saveDialog.closeAfterSave;
        const tabIdToClose = saveDialog.tabId;
        setSaveDialog(INITIAL_SAVE_DIALOG);

        if (shouldClose && targetStillOpen() && contentStillSaved()) {
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
      } finally {
        saveInFlight.current = false;
        setIsSaving(false);
      }
    },
    [
      saveDialog.isOpen,
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
    isSaving,
    handleCloseDialogCancel,
    handleCloseDialogDiscard,
    handleCloseDialogSave,
    handleSaveDialogCancel,
    handleSaveDialogSave,
    openCloseDialog,
    openSaveDialog,
  };
}
