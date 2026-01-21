/**
 * ConflictResolutionDialog Component
 * Modal dialog for resolving sync conflicts when CRDT auto-merge fails.
 * Shows local vs remote versions and allows user to choose resolution.
 *
 * @spec openspec/changes/add-p2p-vault-sync/specs/vault-sync/spec.md
 */
import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import type { ISyncableVaultItem } from '@/lib/p2p';

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
  onResolve: (conflictId: string, choice: ResolutionChoice, mergedData?: unknown) => void;
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

  const bgColor = isSelected
    ? 'bg-accent/10'
    : 'bg-surface-raised/30';

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`
        w-full p-4 rounded-xl text-left transition-all
        border-2 ${borderColor} ${bgColor}
        hover:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-surface-base
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className={`text-sm font-semibold ${highlight === 'local' ? 'text-cyan-400' : highlight === 'remote' ? 'text-amber-400' : 'text-text-theme-primary'}`}>
            {title}
          </h4>
          {subtitle && (
            <p className="text-xs text-text-theme-muted">{subtitle}</p>
          )}
        </div>
        {isSelected && (
          <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center">
            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Item Info */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-theme-muted">Name:</span>
          <span className="text-text-theme-primary font-medium">{item.name}</span>
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
            <span className="text-text-theme-secondary">{item.lastModifiedBy}</span>
          </div>
        )}
      </div>

      {/* Diff preview (simplified) */}
      <div className="mt-3 pt-3 border-t border-border-theme-subtle">
        <div className="text-xs text-text-theme-muted mb-1">Preview:</div>
        <pre className="text-xs text-text-theme-secondary bg-surface-deep/50 p-2 rounded overflow-x-auto max-h-24">
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
  const [selectedChoice, setSelectedChoice] = useState<ResolutionChoice | null>(null);
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
      <div className="relative w-full max-w-2xl mx-4 bg-surface-base border border-border-theme rounded-2xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-theme-subtle">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text-theme-primary">
                Sync Conflict Detected
              </h2>
              <p className="text-sm text-text-theme-muted">
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
            className="p-1.5 rounded-lg text-text-theme-muted hover:text-text-theme-primary hover:bg-surface-raised transition-colors"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-sm text-text-theme-secondary mb-6">
            This item was modified both locally and by another peer. Choose which version to keep:
          </p>

          {/* Version Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              subtitle={conflict.remotePeerName ? `From ${conflict.remotePeerName}` : 'From peer'}
              item={conflict.remoteVersion}
              isSelected={selectedChoice === 'remote'}
              onSelect={() => setSelectedChoice('remote')}
              highlight="remote"
            />
          </div>

          {/* Info box */}
          <div className="p-3 bg-surface-deep/50 border border-border-theme-subtle rounded-lg mb-6">
            <div className="flex items-start gap-2">
              <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-text-theme-secondary">
                The selected version will be synced to all peers. The other version will be discarded.
                This action cannot be undone.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border-theme-subtle bg-surface-raised/30">
          <div>
            {onSkip && (
              <Button variant="ghost" onClick={onSkip} disabled={isResolving}>
                Skip for Now
              </Button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" onClick={onClose} disabled={isResolving}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleResolve}
              disabled={!selectedChoice}
              isLoading={isResolving}
            >
              {selectedChoice === 'local' ? 'Keep My Version' : selectedChoice === 'remote' ? 'Use Remote Version' : 'Resolve Conflict'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionDialog;
