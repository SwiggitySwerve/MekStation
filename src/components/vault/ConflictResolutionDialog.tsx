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

import type { ISyncConflict } from '@/types/vault';

import { logger } from '@/utils/logger';

import {
  WarningIcon,
  CheckIcon,
  getContentTypeLabel,
  getContentTypeIcon,
  formatConflictDate,
} from './ConflictResolution.icons';

// =============================================================================
// Types
// =============================================================================

export interface ConflictResolutionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  conflict: ISyncConflict | null;
  onResolved?: (
    conflictId: string,
    resolution: 'local' | 'remote' | 'forked',
  ) => void;
}

type ResolutionChoice = 'local' | 'remote' | 'fork';

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
      className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
        selected
          ? `${color} border-current bg-current/10`
          : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 ${selected ? '' : 'text-gray-400'}`}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className={`font-medium ${selected ? '' : 'text-white'}`}>
              {title}
            </h4>
            {selected && (
              <CheckIcon className={`h-5 w-5 flex-shrink-0 ${color}`} />
            )}
          </div>
          <p
            className={`mt-1 text-sm ${selected ? 'opacity-90' : 'text-gray-400'}`}
          >
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
  const [selectedResolution, setSelectedResolution] =
    useState<ResolutionChoice>('local');
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
      const resolution =
        selectedResolution === 'fork' ? 'forked' : selectedResolution;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resolution }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch((e) => {
          logger.debug('Response not JSON when resolving conflict', e);
          return {};
        })) as {
          error?: string;
        };
        throw new Error(
          errorData.error || `Failed to resolve conflict (${response.status})`,
        );
      }

      onResolved?.(conflict.id, resolution as 'local' | 'remote' | 'forked');
      resetState();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to resolve conflict',
      );
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-gray-800 p-6">
        {/* Header */}
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400">
            <WarningIcon />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Sync Conflict</h2>
            <p className="mt-1 text-sm text-gray-400">
              This item was modified both locally and remotely. Choose how to
              resolve.
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded border border-red-500 bg-red-900/50 px-4 py-2 text-red-200">
            {error}
          </div>
        )}

        {/* Conflict Details */}
        <div className="mb-6 rounded-lg bg-gray-700/50 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="text-cyan-400">
              {getContentTypeIcon(conflict.contentType)}
            </div>
            <div>
              <h3 className="font-medium text-white">{conflict.itemName}</h3>
              <p className="text-xs text-gray-400">
                {getContentTypeLabel(conflict.contentType)}
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {/* Local Version */}
            <div className="rounded bg-gray-800/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium text-emerald-400">
                  Local Version
                </span>
              </div>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Version:</dt>
                  <dd className="text-white">{conflict.localVersion}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Hash:</dt>
                  <dd
                    className="max-w-[80px] truncate font-mono text-white"
                    title={conflict.localHash}
                  >
                    {conflict.localHash.slice(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>

            {/* Remote Version */}
            <div className="rounded bg-gray-800/50 p-3">
              <div className="mb-2 flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-violet-500" />
                <span className="text-sm font-medium text-violet-400">
                  Remote Version
                </span>
              </div>
              <dl className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <dt className="text-gray-400">Version:</dt>
                  <dd className="text-white">{conflict.remoteVersion}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Hash:</dt>
                  <dd
                    className="max-w-[80px] truncate font-mono text-white"
                    title={conflict.remoteHash}
                  >
                    {conflict.remoteHash.slice(0, 8)}...
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">From:</dt>
                  <dd
                    className="max-w-[80px] truncate text-white"
                    title={conflict.remotePeerId}
                  >
                    {conflict.remotePeerId.slice(0, 8)}...
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Detected: {formatConflictDate(conflict.detectedAt)}
          </p>
        </div>

        {/* Resolution Options */}
        <div className="mb-6 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">
            Resolution Options
          </h3>

          <ResolutionOption
            selected={selectedResolution === 'local'}
            onSelect={() => setSelectedResolution('local')}
            title="Keep Local"
            description="Use your local version and discard the remote changes."
            icon={
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 3.75H6.912a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H15M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859"
                />
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
                />
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
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="h-6 w-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
                />
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
            className="rounded bg-gray-600 px-4 py-2 text-white hover:bg-gray-500 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            disabled={resolving}
            className="flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {resolving ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Resolving...
              </>
            ) : (
              <>
                <CheckIcon className="h-4 w-4" />
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
