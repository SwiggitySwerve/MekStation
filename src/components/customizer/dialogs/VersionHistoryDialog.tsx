/**
 * Version History Dialog Component
 *
 * Dialog for viewing unit version history and reverting to previous versions.
 *
 * @spec openspec/specs/unit-versioning/spec.md
 */

import React from 'react';

import { AppIcon } from '@/components/ui/AppIcon';
import { IVersionWithData } from '@/services/units/CustomUnitApiService';
import { IVersionMetadata } from '@/types/persistence/UnitPersistence';
import { formatTons } from '@/utils/formatting';

import { customizerStyles as cs } from '../styles';
import {
  DialogCloseButton,
  ErrorIcon,
  SpinnerIcon,
} from './dialogPresentation';
import { ModalOverlay } from './ModalOverlay';
import { useVersionHistoryDialog } from './useVersionHistoryDialog';

export interface VersionHistoryDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Unit ID to show history for */
  unitId: string;
  /** Unit name for display */
  unitName: string;
  /** Current version number */
  currentVersion: number;
  /** Called when a version is selected for revert */
  onRevert: (version: number) => void;
  /** Called when dialog is closed */
  onClose: () => void;
  /** Restore into the bound draft instead of calling the library revert API. */
  onRestoreDraft?: (version: number) => Promise<void>;
}

function formatDate(isoString: string) {
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getPreviewSummary(previewData: IVersionWithData) {
  const unitData = previewData.data;
  const rulesLevel = 'rulesLevel' in unitData ? unitData.rulesLevel : undefined;
  const equipment = 'equipment' in unitData ? unitData.equipment : undefined;
  const equipmentArr = Array.isArray(equipment) ? equipment : undefined;

  return {
    era: String(unitData.era ?? 'N/A'),
    equipmentCount: equipmentArr?.length ?? 0,
    hasEquipment: Boolean(equipmentArr),
    rulesLevel: String(rulesLevel ?? 'N/A'),
    techBase: String(unitData.techBase ?? 'N/A'),
    tonnage:
      typeof unitData.tonnage === 'number'
        ? formatTons(unitData.tonnage)
        : 'N/A',
  };
}

function VersionList({
  currentLabel,
  currentVersion,
  error,
  isLoading,
  selectedVersion,
  setSelectedVersion,
  versions,
}: {
  currentLabel: string;
  currentVersion: number;
  error: string | null;
  isLoading: boolean;
  selectedVersion: number | null;
  setSelectedVersion: (version: number) => void;
  versions: readonly IVersionMetadata[];
}) {
  if (isLoading) {
    return (
      <div className={cs.dialog.loading}>
        <SpinnerIcon size="toolbar" className="mr-2" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <ErrorIcon size="toolbar" className="mx-auto mb-2" />
        {error}
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="text-text-theme-secondary p-4 text-center">
        No version history
      </div>
    );
  }

  return (
    <div className="divide-border-theme-subtle divide-y">
      {versions.map((version) => (
        <VersionListItem
          currentLabel={currentLabel}
          currentVersion={currentVersion}
          isSelected={selectedVersion === version.version}
          key={version.version}
          onSelect={setSelectedVersion}
          version={version}
        />
      ))}
    </div>
  );
}

function VersionListItem({
  currentLabel,
  currentVersion,
  isSelected,
  onSelect,
  version,
}: {
  currentLabel: string;
  currentVersion: number;
  isSelected: boolean;
  onSelect: (version: number) => void;
  version: IVersionMetadata;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(version.version)}
      className={`min-h-11 w-full border-l-2 p-3 text-left transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-600/20'
          : 'hover:bg-surface-raised/50 border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-text-theme-primary font-medium">
            v{version.version}
          </span>
          {version.version === currentVersion && (
            <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
              {currentLabel}
            </span>
          )}
          {version.revertSource && (
            <span className="bg-accent/20 text-accent rounded px-1.5 py-0.5 text-xs">
              Reverted
            </span>
          )}
        </div>
      </div>
      <div className="text-text-theme-secondary mt-1 text-xs">
        {formatDate(version.savedAt)}
      </div>
      {version.notes && (
        <div className="text-text-theme-muted mt-1 truncate text-xs">
          {version.notes}
        </div>
      )}
    </button>
  );
}

function VersionPreview({
  isLoadingPreview,
  previewData,
  previewError,
  selectedVersion,
}: {
  isLoadingPreview: boolean;
  previewData: IVersionWithData | null;
  previewError: string | null;
  selectedVersion: number | null;
}) {
  if (selectedVersion === null) {
    return <EmptyPreview message="Select a version to preview" />;
  }

  if (isLoadingPreview) {
    return (
      <div className={`${cs.dialog.loading} h-full`}>
        <SpinnerIcon size="toolbar" className="mr-2" />
        Loading preview...
      </div>
    );
  }

  if (previewError || !previewData) {
    return (
      <div className={`${cs.dialog.empty} h-full`}>
        {previewError ?? 'Failed to load preview'}
      </div>
    );
  }

  return <PreviewDetails previewData={previewData} />;
}

function EmptyPreview({ message }: { message: string }) {
  return (
    <div className={`${cs.dialog.empty} h-full`}>
      <div className="text-center">
        <AppIcon
          name="clock"
          size="feature"
          className={cs.dialog.emptyIcon}
          aria-hidden="true"
        />
        <p>{message}</p>
      </div>
    </div>
  );
}

function PreviewDetails({ previewData }: { previewData: IVersionWithData }) {
  const summary = getPreviewSummary(previewData);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-text-theme-primary font-medium">
          Version {previewData.version} Details
        </h4>
        <span className="text-text-theme-secondary text-sm">
          Saved {formatDate(previewData.savedAt)}
        </span>
      </div>

      {previewData.notes && (
        <div className={cs.dialog.infoPanel}>
          <div className="text-text-theme-secondary mb-1 text-xs">Notes:</div>
          <div className="text-text-theme-primary">{previewData.notes}</div>
        </div>
      )}

      {previewData.revertSource && (
        <div className={cs.dialog.warningPanel}>
          <div className="text-accent text-sm">
            This version was created by reverting from version{' '}
            {previewData.revertSource}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <PreviewSummaryItem label="Tonnage" value={summary.tonnage} />
        <PreviewSummaryItem label="Tech Base" value={summary.techBase} />
        <PreviewSummaryItem label="Era" value={summary.era} />
        <PreviewSummaryItem label="Rules Level" value={summary.rulesLevel} />
      </div>

      {summary.hasEquipment && (
        <PreviewSummaryItem
          label="Equipment"
          value={`${summary.equipmentCount} items`}
        />
      )}
    </div>
  );
}

function PreviewSummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={cs.dialog.infoPanel}>
      <div className="text-text-theme-secondary mb-1 text-xs">{label}</div>
      <div className="text-text-theme-primary">{value}</div>
    </div>
  );
}

function ConfirmVersionButton({
  currentVersion,
  isRestoring,
  onConfirm,
  restoreMode,
  selectedVersion,
}: {
  currentVersion: number;
  isRestoring: boolean;
  onConfirm: () => void;
  restoreMode: boolean;
  selectedVersion: number | null;
}) {
  const canConfirm = restoreMode
    ? Boolean(selectedVersion) && !isRestoring
    : Boolean(selectedVersion) &&
      selectedVersion !== currentVersion &&
      !isRestoring;
  const actionLabel = restoreMode
    ? `Restore v${selectedVersion || '?'} into Draft`
    : `Revert to v${selectedVersion || '?'}`;

  return (
    <button
      type="button"
      onClick={onConfirm}
      disabled={!canConfirm}
      className={`min-w-[120px] ${
        canConfirm ? cs.dialog.btnWarning : cs.dialog.btnPrimary
      }`}
    >
      {isRestoring ? (
        <span className="flex items-center gap-2">
          <SpinnerIcon size="inline" />
          {restoreMode ? 'Restoring...' : 'Reverting...'}
        </span>
      ) : (
        actionLabel
      )}
    </button>
  );
}

export function VersionHistoryDialog({
  isOpen,
  unitId,
  unitName,
  currentVersion,
  onRevert,
  onClose,
  onRestoreDraft,
}: VersionHistoryDialogProps): React.ReactElement {
  const {
    versions,
    selectedVersion,
    setSelectedVersion,
    previewData,
    previewError,
    isLoading,
    isLoadingPreview,
    isReverting,
    error,
    confirmError,
    handleConfirm,
  } = useVersionHistoryDialog({
    isOpen,
    unitId,
    currentVersion,
    onRevert,
    onClose,
    onRestoreDraft,
  });

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      preventClose={isReverting && !onRestoreDraft}
      className="mx-4 flex max-h-[80vh] w-full max-w-4xl min-w-0 flex-col"
    >
      <div className={cs.dialog.header}>
        <div>
          <h3 className={cs.dialog.headerTitle}>Version History</h3>
          <p className={cs.dialog.headerSubtitle}>{unitName}</p>
        </div>
        <DialogCloseButton onClose={onClose} />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden sm:flex-row">
        <div className="border-border-theme-subtle max-h-48 overflow-auto border-b sm:max-h-none sm:w-1/3 sm:border-r sm:border-b-0">
          <VersionList
            currentLabel={onRestoreDraft ? 'Last Saved' : 'Current'}
            currentVersion={currentVersion}
            error={error}
            isLoading={isLoading}
            selectedVersion={selectedVersion}
            setSelectedVersion={setSelectedVersion}
            versions={versions}
          />
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-4">
          <VersionPreview
            isLoadingPreview={isLoadingPreview}
            previewData={previewData}
            previewError={previewError}
            selectedVersion={selectedVersion}
          />
        </div>
      </div>

      <div className={`${cs.dialog.footerBetween} flex-wrap gap-2`}>
        <div className="min-w-0">
          <span className="text-text-theme-secondary text-sm">
            {versions.length} version{versions.length !== 1 ? 's' : ''}{' '}
            available
          </span>
          {onRestoreDraft && (
            <p className="text-text-theme-muted text-xs">
              Restore changes this draft. Save to library to create a new
              version.
            </p>
          )}
          {confirmError && (
            <p className="text-sm text-red-400" role="alert">
              {confirmError}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className={cs.dialog.btnGhost}
            disabled={isReverting && !onRestoreDraft}
          >
            Close
          </button>
          <ConfirmVersionButton
            currentVersion={currentVersion}
            isRestoring={isReverting}
            onConfirm={() => {
              void handleConfirm();
            }}
            restoreMode={Boolean(onRestoreDraft)}
            selectedVersion={selectedVersion}
          />
        </div>
      </div>
    </ModalOverlay>
  );
}
