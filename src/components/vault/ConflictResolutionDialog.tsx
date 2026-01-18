/**
 * Conflict Resolution Dialog Component
 *
 * Dialog for resolving sync conflicts between local and remote versions
 * of vault items. Supports three resolution strategies:
 * - Keep Local: Use the local version, discard remote changes
 * - Accept Remote: Use the remote version, discard local changes
 * - Fork: Keep both versions by creating a copy
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback } from 'react';
import type {
  ISyncConflict,
  ShareableContentType,
} from '@/types/vault';

// =============================================================================
// Types
// =============================================================================

export interface ConflictResolutionDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;

  /** Close the dialog */
  onClose: () => void;

  /** The conflict to resolve */
  conflict: ISyncConflict | null;

  /** Callback when conflict is resolved */
  onResolved?: (conflictId: string, resolution: 'local' | 'remote' | 'forked') => void;
}

type ResolutionChoice = 'local' | 'remote' | 'fork';

// =============================================================================
// Helpers
// =============================================================================

function getContentTypeLabel(type: ShareableContentType | 'folder'): string {
  switch (type) {
    case 'unit':
      return 'Unit';
    case 'pilot':
      return 'Pilot';
    case 'force':
      return 'Force';
    case 'encounter':
      return 'Encounter';
    case 'folder':
      return 'Folder';
    default:
      return 'Item';
  }
}

function getContentTypeIcon(type: ShareableContentType | 'folder'): React.ReactNode {
  switch (type) {
    case 'unit':
      return <MechIcon className="w-5 h-5" />;
    case 'pilot':
      return <PilotIcon className="w-5 h-5" />;
    case 'force':
      return <ForceIcon className="w-5 h-5" />;
    case 'encounter':
      return <EncounterIcon className="w-5 h-5" />;
    case 'folder':
      return <FolderIcon className="w-5 h-5" />;
    default:
      return <DocumentIcon className="w-5 h-5" />;
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// =============================================================================
// Icons
// =============================================================================

function MechIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  );
}

function PilotIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ForceIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  );
}

function EncounterIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function FolderIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
    </svg>
  );
}

function DocumentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function WarningIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}

function CheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

// =============================================================================
// Resolution Option Component
// =============================================================================

interface ResolutionOptionProps {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

function ResolutionOption({
  selected,
  onSelect,
  title,
  description,
  icon,
  color,
}: ResolutionOptionProps): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
        selected
          ? `${color} border-current bg-current/10`
          : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${selected ? '' : 'text-gray-400'}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-medium ${selected ? '' : 'text-white'}`}>
              {title}
            </h4>
            {selected && (
              <CheckIcon className={`w-5 h-5 flex-shrink-0 ${color}`} />
            )}
          </div>
          <p className={`text-sm mt-1 ${selected ? 'opacity-90' : 'text-gray-400'}`}>
            {description}
          </p>
        </div>
      </div>
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

export function ConflictResolutionDialog({
  isOpen,
  onClose,
  conflict,
  onResolved,
}: ConflictResolutionDialogProps): React.ReactElement | null {
  const [selectedResolution, setSelectedResolution] = useState<ResolutionChoice>('local');
  const [resolving, setResolving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = useCallback(() => {
    setSelectedResolution('local');
    setResolving(false);
    setError(null);
  }, []);

  const handleResolve = useCallback(async () => {
    if (!conflict) return;

    setResolving(true);
    setError(null);

    try {
      const endpoint = `/api/vault/conflicts/${conflict.id}/resolve`;
      const resolution = selectedResolution === 'fork' ? 'forked' : selectedResolution;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(errorData.error || `Failed to resolve conflict (${response.status})`);
      }

      onResolved?.(conflict.id, resolution as 'local' | 'remote' | 'forked');
      resetState();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve conflict');
    } finally {
      setResolving(false);
    }
  }, [conflict, selectedResolution, onResolved, resetState, onClose]);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  if (!isOpen || !conflict) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start gap-3 mb-6">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <WarningIcon />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Sync Conflict</h2>
            <p className="text-sm text-gray-400 mt-1">
              This item was modified both locally and remotely. Choose how to resolve.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        {/* Conflict Details */}
        <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="text-cyan-400">
              {getContentTypeIcon(conflict.contentType)}
            </div>
            <div>
              <h3 className="font-medium text-white">{conflict.itemName}</h3>
              <p className="text-xs text-gray-400">{getContentTypeLabel(conflict.contentType)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            {/* Local Version */}
            <div className="bg-gray-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-400">Local Version</span>
              </div>
              <dl className="text-xs space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Version:</dt>
                  <dd className="text-white">{conflict.localVersion}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Hash:</dt>
                  <dd className="text-white font-mono truncate max-w-[80px]" title={conflict.localHash}>
                    {conflict.localHash.slice(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>

            {/* Remote Version */}
            <div className="bg-gray-800/50 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-violet-500" />
                <span className="text-sm font-medium text-violet-400">Remote Version</span>
              </div>
              <dl className="text-xs space-y-1">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Version:</dt>
                  <dd className="text-white">{conflict.remoteVersion}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Hash:</dt>
                  <dd className="text-white font-mono truncate max-w-[80px]" title={conflict.remoteHash}>
                    {conflict.remoteHash.slice(0, 8)}...
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">From:</dt>
                  <dd className="text-white truncate max-w-[80px]" title={conflict.remotePeerId}>
                    {conflict.remotePeerId.slice(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            Detected: {formatDate(conflict.detectedAt)}
          </p>
        </div>

        {/* Resolution Options */}
        <div className="space-y-3 mb-6">
          <h3 className="text-sm font-medium text-gray-300">Resolution Options</h3>

          <ResolutionOption
            selected={selectedResolution === 'local'}
            onSelect={() => setSelectedResolution('local')}
            title="Keep Local"
            description="Use your local version and discard the remote changes."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859" />
              </svg>
            }
            color="text-emerald-400"
          />

          <ResolutionOption
            selected={selectedResolution === 'remote'}
            onSelect={() => setSelectedResolution('remote')}
            title="Accept Remote"
            description="Use the remote version and discard your local changes."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            }
            color="text-violet-400"
          />

          <ResolutionOption
            selected={selectedResolution === 'fork'}
            onSelect={() => setSelectedResolution('fork')}
            title="Fork (Keep Both)"
            description="Create a copy of the remote version while keeping your local version."
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
              </svg>
            }
            color="text-amber-400"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={handleClose}
            disabled={resolving}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 flex items-center gap-2"
          >
            {resolving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Resolving...
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                Resolve Conflict
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConflictResolutionDialog;
