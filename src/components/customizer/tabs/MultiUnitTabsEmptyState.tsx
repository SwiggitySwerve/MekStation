import React from 'react';

import {
  UnitLoadDialog,
  LoadUnitSource,
} from '@/components/customizer/dialogs/UnitLoadDialog';
import { AppIcon } from '@/components/ui/AppIcon';
import { IUnitIndexEntry } from '@/services/common/types';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { NewTabModal } from './NewTabModal';

interface MultiUnitTabsEmptyStateProps {
  className: string;
  onOpenNewTabModal: () => void;
  onCreateBlankUnit: () => void;
  onOpenLoadDialog: () => void;
  isNewTabModalOpen: boolean;
  onCloseNewTabModal: () => void;
  onCreateUnit: (
    tonnage: number,
    techBase?: TechBase,
    unitType?: UnitType,
  ) => string;
  isLoadDialogOpen: boolean;
  isLoadingUnit: boolean;
  onSelectionChange: () => void;
  onLoadUnit: (unit: IUnitIndexEntry, source: LoadUnitSource) => Promise<void>;
  onCloseLoadDialog: () => void;
}

export function MultiUnitTabsEmptyState({
  className,
  onOpenNewTabModal,
  onCreateBlankUnit,
  onOpenLoadDialog,
  isNewTabModalOpen,
  onCloseNewTabModal,
  onCreateUnit,
  isLoadDialogOpen,
  isLoadingUnit,
  onSelectionChange,
  onLoadUnit,
  onCloseLoadDialog,
}: MultiUnitTabsEmptyStateProps): React.ReactElement {
  return (
    <div
      className={`flex h-full min-h-0 flex-col items-center justify-center overflow-auto px-4 py-8 ${className}`}
    >
      <div className="my-auto w-full max-w-md text-center">
        <div className="bg-surface-base border-accent/40 ring-accent/15 text-accent mx-auto mb-6 flex h-28 w-28 items-center justify-center rounded-full border ring-4">
          <AppIcon
            name="mech"
            size="hero"
            className="scale-150"
            aria-hidden="true"
          />
        </div>

        <h2 className="text-text-theme-primary mb-2 text-2xl font-bold">
          No Units Open
        </h2>
        <p className="text-text-theme-secondary mb-8">
          Create a new BattleMech from scratch or load an existing unit from the
          library.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={onOpenLoadDialog}
            className="bg-accent hover:bg-accent-hover text-on-accent focus-visible:outline-accent flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <AppIcon name="add" size="control" aria-hidden="true" />
            New Unit
          </button>

          <button
            onClick={onOpenLoadDialog}
            className="bg-surface-raised hover:bg-surface-base text-text-theme-primary focus-visible:outline-accent flex min-h-11 items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <AppIcon name="list" size="control" aria-hidden="true" />
            Load from Library
          </button>
        </div>
      </div>

      <NewTabModal
        isOpen={isNewTabModalOpen}
        onClose={onCloseNewTabModal}
        onCreateUnit={onCreateUnit}
      />

      <UnitLoadDialog
        onCreateBlankUnit={onCreateBlankUnit}
        onConfigureNewUnit={onOpenNewTabModal}
        isOpen={isLoadDialogOpen}
        isLoadingUnit={isLoadingUnit}
        onSelectionChange={onSelectionChange}
        onLoadUnit={onLoadUnit}
        onCancel={onCloseLoadDialog}
      />
    </div>
  );
}
