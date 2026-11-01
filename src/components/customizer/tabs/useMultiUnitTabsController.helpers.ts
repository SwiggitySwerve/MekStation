import type { LoadUnitSource } from '@/components/customizer/dialogs/UnitLoadDialog';
import type { useToast } from '@/components/shared/Toast';
import type { UnitState } from '@/stores/unitState';
import type {
  IExportableUnit,
  IImportHandlers,
  IImportSource,
} from '@/types/vault';

import { IUnitIndexEntry } from '@/services/common/types';
import { unitLoaderService } from '@/services/units/unitLoaderService';
import {
  createUnitFromFullState,
  getUnitStore,
} from '@/stores/unitStoreRegistry';
import {
  useTabManagerStore,
  type UnitTemplate,
} from '@/stores/useTabManagerStore';
import { TechBase } from '@/types/enums/TechBase';
import { logger } from '@/utils/logger';
import { generateUUID } from '@/utils/uuid';

type ShowToast = ReturnType<typeof useToast>['showToast'];

interface ManagedTab {
  readonly id: string;
  readonly name: string;
  readonly tonnage: number;
  readonly techBase: TechBase;
}

interface LoadUnitParams {
  readonly unit: IUnitIndexEntry;
  readonly source: LoadUnitSource;
  readonly createTab: (template: UnitTemplate) => string;
  readonly navigateToTab: (tabId: string) => void;
  readonly setIsLoadDialogOpen: (isOpen: boolean) => void;
  readonly setIsLoadingUnit: (isLoading: boolean) => void;
  readonly showToast: ShowToast;
  readonly isCurrent?: () => boolean;
}

export async function loadUnitIntoTab({
  unit,
  source,
  navigateToTab,
  setIsLoadDialogOpen,
  setIsLoadingUnit,
  showToast,
  isCurrent = () => true,
}: LoadUnitParams): Promise<void> {
  if (!isCurrent()) return;
  setIsLoadingUnit(true);

  try {
    const result = await unitLoaderService.loadUnit(
      unit.id,
      source,
      unit.family,
    );
    if (!isCurrent()) return;

    if (!result.success || !result.state) {
      showToast({
        message:
          result.errorCode === 'unsupported-configuration'
            ? (result.error ??
              'This configuration is not supported by the editor.')
            : result.errorCode === 'invalid-definition'
              ? 'This library entry contains invalid unit data. Choose another entry or correct the saved definition.'
              : result.errorCode === 'unsupported-store-family'
                ? 'This unit family cannot be opened in the BattleMech editor yet.'
                : result.errorCode === 'unknown-family'
                  ? 'This library entry uses an unknown unit family. Choose another entry or correct the saved definition.'
                  : result.errorCode === 'family-not-found'
                    ? 'The catalog for this unit family is unavailable. Choose an entry from another family.'
                    : `Failed to load ${unit.chassis} ${unit.variant}. Please try again.`,
        variant: 'error',
      });
      logger.error('Failed to load unit:', result.error);
      return;
    }

    createUnitFromFullState(result.state);
    const newTabId = result.state.id;

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
    if (!isCurrent()) return;
    logger.error('Error loading unit:', error);
    showToast({
      message: 'Failed to load unit. Please try again.',
      variant: 'error',
    });
  } finally {
    if (isCurrent()) setIsLoadingUnit(false);
  }
}

export function buildActiveUnitExportData(
  activeTabId: string | null,
): IExportableUnit | null {
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
}

export function createUnitImportHandlers(
  tabs: readonly ManagedTab[],
  addTab: (tab: ManagedTab) => void,
): IImportHandlers<IExportableUnit> {
  return {
    checkExists: async (id: string) => tabs.some((tab) => tab.id === id),
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
  };
}
