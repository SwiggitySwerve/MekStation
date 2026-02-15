import React from 'react';

import {
  UnitLoadDialog,
  LoadUnitSource,
} from '@/components/customizer/dialogs/UnitLoadDialog';
import { IUnitIndexEntry } from '@/services/common/types';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { NewTabModal } from './NewTabModal';

interface MultiUnitTabsEmptyStateProps {
  className: string;
  onOpenNewTabModal: () => void;
  onOpenLoadDialog: () => void;
  isNewTabModalOpen: boolean;
  onCloseNewTabModal: () => void;
  onCreateUnit: (
    tonnage: number,
    techBase?: TechBase,
    unitType?: UnitType,
  ) => string;
  isLoadDialogOpen: boolean;
  onLoadUnit: (unit: IUnitIndexEntry, source: LoadUnitSource) => Promise<void>;
  onCloseLoadDialog: () => void;
}

export function MultiUnitTabsEmptyState({
  className,
  onOpenNewTabModal,
  onOpenLoadDialog,
  isNewTabModalOpen,
  onCloseNewTabModal,
  onCreateUnit,
  isLoadDialogOpen,
  onLoadUnit,
  onCloseLoadDialog,
}: MultiUnitTabsEmptyStateProps): React.ReactElement {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center py-16 ${className}`}
    >
      <div className="max-w-md text-center">
        <div className="bg-surface-base mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl">
          <svg
            className="text-text-theme-muted h-10 w-10"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"
            />
          </svg>
        </div>

        <h2 className="mb-2 text-2xl font-bold text-white">No Units Open</h2>
        <p className="text-text-theme-secondary mb-8">
          Create a new BattleMech from scratch or load an existing unit from the
          library.
        </p>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            onClick={onOpenNewTabModal}
            className="bg-accent hover:bg-accent-hover flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            New Unit
          </button>

          <button
            onClick={onOpenLoadDialog}
            className="bg-surface-raised hover:bg-surface-base flex items-center justify-center gap-2 rounded-lg px-6 py-3 font-medium text-white transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
              />
            </svg>
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
        isOpen={isLoadDialogOpen}
        onLoadUnit={onLoadUnit}
        onCancel={onCloseLoadDialog}
      />
    </div>
  );
}
