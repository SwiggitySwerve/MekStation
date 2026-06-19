/**
 * Version History Dialog Component
 *
 * Dialog for viewing unit version history and reverting to previous versions.
 *
 * @spec openspec/specs/unit-versioning/spec.md
 */

import React, { useState, useEffect, useCallback } from 'react';

import {
  customUnitApiService,
  IVersionWithData,
} from '@/services/units/CustomUnitApiService';
import { IVersionMetadata } from '@/types/persistence/UnitPersistence';
import { logger } from '@/utils/logger';

import { customizerStyles as cs } from '../styles';
import {
  DialogCloseButton,
  ErrorIcon,
  SpinnerIcon,
} from './dialogPresentation';
import { ModalOverlay } from './ModalOverlay';

// =============================================================================
// Types
// =============================================================================

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
    tonnage: String(unitData.tonnage ?? 'N/A'),
  };
}

function VersionList({
  currentVersion,
  error,
  isLoading,
  selectedVersion,
  setSelectedVersion,
  versions,
}: {
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
        <SpinnerIcon className="mr-2 h-6 w-6 animate-spin" />
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400">
        <ErrorIcon className="mx-auto mb-2 h-8 w-8" />
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
  currentVersion,
  isSelected,
  onSelect,
  version,
}: {
  currentVersion: number;
  isSelected: boolean;
  onSelect: (version: number) => void;
  version: IVersionMetadata;
}) {
  return (
    <button
      onClick={() => onSelect(version.version)}
      className={`w-full border-l-2 p-3 text-left transition-colors ${
        isSelected
          ? 'border-blue-500 bg-blue-600/20'
          : 'hover:bg-surface-raised/50 border-transparent'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white">v{version.version}</span>
          {version.version === currentVersion && (
            <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-xs text-green-400">
              Current
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
        <div className="mt-1 truncate text-xs text-slate-500">
          {version.notes}
        </div>
      )}
    </button>
  );
}

function VersionPreview({
  isLoadingPreview,
  previewData,
  selectedVersion,
}: {
  isLoadingPreview: boolean;
  previewData: IVersionWithData | null;
  selectedVersion: number | null;
}) {
  if (selectedVersion === null) {
    return <EmptyPreview message="Select a version to preview" />;
  }

  if (isLoadingPreview) {
    return (
      <div className={`${cs.dialog.loading} h-full`}>
        <SpinnerIcon className="mr-2 h-6 w-6 animate-spin" />
        Loading preview...
      </div>
    );
  }

  if (!previewData) {
    return (
      <div className={`${cs.dialog.empty} h-full`}>Failed to load preview</div>
    );
  }

  return <PreviewDetails previewData={previewData} />;
}

function EmptyPreview({ message }: { message: string }) {
  return (
    <div className={`${cs.dialog.empty} h-full`}>
      <div className="text-center">
        <svg
          className={cs.dialog.emptyIcon}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
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
        <h4 className="font-medium text-white">
          Version {previewData.version} Details
        </h4>
        <span className="text-text-theme-secondary text-sm">
          Saved {formatDate(previewData.savedAt)}
        </span>
      </div>

      {previewData.notes && (
        <div className={cs.dialog.infoPanel}>
          <div className="mb-1 text-xs text-slate-400">Notes:</div>
          <div className="text-white">{previewData.notes}</div>
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
        <PreviewSummaryItem label="Tonnage" value={`${summary.tonnage}t`} />
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
      <div className="text-white">{value}</div>
    </div>
  );
}

function RevertButton({
  currentVersion,
  isReverting,
  onRevert,
  selectedVersion,
}: {
  currentVersion: number;
  isReverting: boolean;
  onRevert: () => void;
  selectedVersion: number | null;
}) {
  const canRevert =
    Boolean(selectedVersion) &&
    selectedVersion !== currentVersion &&
    !isReverting;

  return (
    <button
      onClick={onRevert}
      disabled={!canRevert}
      className={`min-w-[120px] ${
        canRevert ? cs.dialog.btnWarning : cs.dialog.btnPrimary
      }`}
    >
      {isReverting ? (
        <span className="flex items-center gap-2">
          <SpinnerIcon className="h-4 w-4 animate-spin" />
          Reverting...
        </span>
      ) : (
        `Revert to v${selectedVersion || '?'}`
      )}
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

export function VersionHistoryDialog({
  isOpen,
  unitId,
  unitName,
  currentVersion,
  onRevert,
  onClose,
}: VersionHistoryDialogProps): React.ReactElement {
  // State
  const [versions, setVersions] = useState<readonly IVersionMetadata[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [previewData, setPreviewData] = useState<IVersionWithData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isReverting, setIsReverting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load version history when dialog opens
  useEffect(() => {
    if (!isOpen || !unitId) return;

    setIsLoading(true);
    setError(null);
    setSelectedVersion(null);
    setPreviewData(null);

    customUnitApiService
      .getVersionHistory(unitId)
      .then(setVersions)
      .catch((err) => {
        logger.error('Failed to load version history:', err);
        setError('Failed to load version history');
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, unitId]);

  // Load version preview when selection changes
  useEffect(() => {
    if (!selectedVersion || !unitId) {
      setPreviewData(null);
      return;
    }

    setIsLoadingPreview(true);

    customUnitApiService
      .getVersion(unitId, selectedVersion)
      .then(setPreviewData)
      .catch((err) => {
        logger.error('Failed to load version preview:', err);
        setPreviewData(null);
      })
      .finally(() => setIsLoadingPreview(false));
  }, [unitId, selectedVersion]);

  // Handle revert
  const handleRevert = useCallback(async () => {
    if (!selectedVersion || selectedVersion === currentVersion) return;

    setIsReverting(true);
    try {
      const result = await customUnitApiService.revert(unitId, selectedVersion);

      if (result.success) {
        onRevert(selectedVersion);
        onClose();
      } else {
        setError(result.error.message || 'Failed to revert');
      }
    } catch (err) {
      logger.error('Revert error:', err);
      setError('Failed to revert to selected version');
    } finally {
      setIsReverting(false);
    }
  }, [unitId, selectedVersion, currentVersion, onRevert, onClose]);

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      className="mx-4 flex max-h-[80vh] w-full max-w-4xl flex-col"
    >
      {/* Header */}
      <div className={cs.dialog.header}>
        <div>
          <h3 className={cs.dialog.headerTitle}>Version History</h3>
          <p className={cs.dialog.headerSubtitle}>{unitName}</p>
        </div>
        <DialogCloseButton onClose={onClose} />
      </div>

      {/* Content */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Version list */}
        <div className="border-border-theme-subtle w-1/3 overflow-auto border-r">
          <VersionList
            currentVersion={currentVersion}
            error={error}
            isLoading={isLoading}
            selectedVersion={selectedVersion}
            setSelectedVersion={setSelectedVersion}
            versions={versions}
          />
        </div>

        {/* Preview panel */}
        <div className="flex-1 overflow-auto p-4">
          <VersionPreview
            isLoadingPreview={isLoadingPreview}
            previewData={previewData}
            selectedVersion={selectedVersion}
          />
        </div>
      </div>

      {/* Footer */}
      <div className={cs.dialog.footerBetween}>
        <span className="text-text-theme-secondary text-sm">
          {versions.length} version{versions.length !== 1 ? 's' : ''} available
        </span>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className={cs.dialog.btnGhost}>
            Close
          </button>
          <RevertButton
            currentVersion={currentVersion}
            isReverting={isReverting}
            onRevert={handleRevert}
            selectedVersion={selectedVersion}
          />
        </div>
      </div>
    </ModalOverlay>
  );
}
