/**
 * ConflictResolutionDialog Component
 * Modal dialog for resolving sync conflicts when CRDT auto-merge fails.
 * Shows local vs remote versions and allows user to choose resolution.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import React, { useState } from 'react';

import type { ISyncableVaultItem } from '@/lib/p2p';

import { Button } from '@/components/ui/Button';

// =============================================================================
// Types
// =============================================================================

interface ConflictData {
  /** Unique conflict ID */
  id: string;
  /** Item ID with conflict */
  itemId: string;
  /** Item name for display */
  itemName: string;
  /** Item type (unit, pilot, force) */
  itemType: 'unit' | 'pilot' | 'force';
  /** Local version of the item */
  localVersion: ISyncableVaultItem;
  /** Remote version of the item */
  remoteVersion: ISyncableVaultItem;
  /** Peer ID of remote version */
  remotePeerId?: string;
  /** Peer name of remote version */
  remotePeerName?: string;
  /** Timestamp of conflict detection */
  detectedAt: string;
}

type ResolutionChoice = 'local' | 'remote' | 'merge';

interface ConflictResolutionDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Conflict data to resolve */
  conflict: ConflictData | null;
  /** Handler for resolution choice */
  onResolve: (
    conflictId: string,
    choice: ResolutionChoice,
    mergedData?: unknown,
  ) => void;
  /** Handler to dismiss/skip this conflict */
  onSkip?: () => void;
  /** Handler to close dialog */
  onClose: () => void;
  /** Additional conflicts pending (for showing count) */
  pendingCount?: number;
}

// =============================================================================
// Helper Components
// =============================================================================

interface VersionCardProps {
  title: string;
  subtitle?: string;
  item: ISyncableVaultItem;
  isSelected: boolean;
  onSelect: () => void;
  highlight?: 'local' | 'remote';
}

function VersionCard({
  title,
  subtitle,
  item,
  isSelected,
  onSelect,
  highlight,
}: VersionCardProps): React.ReactElement {
  const borderColor = isSelected
    ? 'border-accent'
    : highlight === 'local'
      ? 'border-cyan-500/30'
      : highlight === 'remote'
        ? 'border-amber-500/30'
        : 'border-border-theme-subtle';

  const bgColor = isSelected ? 'bg-accent/10' : 'bg-surface-raised/30';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border-2 p-4 text-left transition-all ${borderColor} ${bgColor} hover:border-accent/50 focus:ring-accent focus:ring-offset-surface-base focus:ring-2 focus:ring-offset-2 focus:outline-none`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4
            className={`text-sm font-semibold ${highlight === 'local' ? 'text-cyan-400' : highlight === 'remote' ? 'text-amber-400' : 'text-text-theme-primary'}`}
          >
            {title}
          </h4>
          {subtitle && (
            <p className="text-text-theme-muted text-xs">{subtitle}</p>
          )}
        </div>
        {isSelected && (
          <div className="bg-accent flex h-5 w-5 items-center justify-center rounded-full">
            <svg
              className="h-3 w-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-muted">Name:</span>
          <span className="text-text-theme-primary font-medium">
            {item.name}
          </span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-muted">Last Modified:</span>
          <span className="text-text-theme-secondary">
            {new Date(item.lastModified).toLocaleString()}
          </span>
        </div>
        {item.lastModifiedBy && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-theme-muted">Modified By:</span>
            <span className="text-text-theme-secondary">
              {item.lastModifiedBy}
            </span>
          </div>
        )}
      </div>

      {/* Diff preview (simplified) */}
      <div className="border-border-theme-subtle mt-3 border-t pt-3">
        <div className="text-text-theme-muted mb-1 text-xs">Preview:</div>
        <pre className="text-text-theme-secondary bg-surface-deep/50 max-h-24 overflow-x-auto rounded p-2 text-xs">
          {JSON.stringify(item.data, null, 2).slice(0, 200)}
          {JSON.stringify(item.data).length > 200 ? '...' : ''}
        </pre>
      </div>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ConflictResolutionDialog({
  isOpen,
  conflict,
  onResolve,
  onSkip,
  onClose,
  pendingCount = 0,
}: ConflictResolutionDialogProps): React.ReactElement | null {
  const [selectedChoice, setSelectedChoice] = useState<ResolutionChoice | null>(
    null,
  );
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen || !conflict) return null;

  const handleResolve = async () => {
    if (!selectedChoice) return;

    setIsResolving(true);
    try {
      await onResolve(conflict.id, selectedChoice);
      setSelectedChoice(null);
    } finally {
      setIsResolving(false);
    }
  };

  const itemTypeLabels = {
    unit: 'Unit',
    pilot: 'Pilot',
    force: 'Force',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="bg-surface-base border-border-theme relative mx-4 w-full max-w-2xl overflow-hidden rounded-2xl border shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="border-border-theme-subtle flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-text-theme-primary text-lg font-semibold">
                Sync Conflict Detected
              </h2>
              <p className="text-text-theme-muted text-sm">
                {itemTypeLabels[conflict.itemType]}: {conflict.itemName}
                {pendingCount > 0 && (
                  <span className="ml-2 text-amber-400">
                    ({pendingCount} more pending)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-theme-muted hover:text-text-theme-primary hover:bg-surface-raised rounded-lg p-1.5 transition-colors"
            aria-label="Close dialog"
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
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-text-theme-secondary mb-6 text-sm">
            This item was modified both locally and by another peer. Choose
            which version to keep:
          </p>

          {/* Version Cards */}
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <VersionCard
              title="Your Version"
              subtitle="Local changes"
              item={conflict.localVersion}
              isSelected={selectedChoice === 'local'}
              onSelect={() => setSelectedChoice('local')}
              highlight="local"
            />
            <VersionCard
              title="Remote Version"
              subtitle={
                conflict.remotePeerName
                  ? `From ${conflict.remotePeerName}`
                  : 'From peer'
              }
              item={conflict.remoteVersion}
              isSelected={selectedChoice === 'remote'}
              onSelect={() => setSelectedChoice('remote')}
              highlight="remote"
            />
          </div>

          {/* Info box */}
          <div className="bg-surface-deep/50 border-border-theme-subtle mb-6 rounded-lg border p-3">
            <div className="flex items-start gap-2">
              <svg
                className="mt-0.5 h-4 w-4 flex-shrink-0 text-cyan-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-text-theme-secondary text-xs">
                The selected version will be synced to all peers. The other
                version will be discarded. This action cannot be undone.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-border-theme-subtle bg-surface-raised/30 flex items-center justify-between border-t px-6 py-4">
          <div>
            {onSkip && (
              <Button variant="ghost" onClick={onSkip} disabled={isResolving}>
                Skip for Now
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isResolving}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleResolve}
              disabled={!selectedChoice}
              isLoading={isResolving}
            >
              {selectedChoice === 'local'
                ? 'Keep My Version'
                : selectedChoice === 'remote'
                  ? 'Use Remote Version'
                  : 'Resolve Conflict'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionDialog;
