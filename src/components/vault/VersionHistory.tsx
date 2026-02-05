/**
 * Version History Components
 *
 * Components for viewing and managing version history of shared vault items.
 * Includes version list panel, diff viewer, preview modal, and rollback dialog.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';

import type {
  IVersionSnapshot,
  IVersionDiff,
  IVersionHistorySummary,
  ShareableContentType,
} from '@/types/vault';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import {
  formatBytes,
  formatRelativeTime,
  formatFullDateTime,
} from '@/utils/formatting';

// =============================================================================
// Types
// =============================================================================

export interface VersionHistoryPanelProps {
  /** Item ID to show version history for */
  itemId: string;
  /** Content type of the item */
  contentType: ShareableContentType;
  /** Optional callback when version is selected */
  onVersionSelect?: (version: IVersionSnapshot) => void;
  /** Optional callback when rollback is initiated */
  onRollback?: (version: IVersionSnapshot) => void;
  /** Custom class name */
  className?: string;
}

export interface VersionDiffViewProps {
  /** Item ID */
  itemId: string;
  /** Content type */
  contentType: ShareableContentType;
  /** List of available versions for selection */
  versions: IVersionSnapshot[];
  /** Initial from version (defaults to current - 1) */
  initialFromVersion?: number;
  /** Initial to version (defaults to current) */
  initialToVersion?: number;
  /** Custom class name */
  className?: string;
}

export interface VersionPreviewProps {
  /** Whether the preview is open */
  isOpen: boolean;
  /** Close the preview */
  onClose: () => void;
  /** Version to preview */
  version: IVersionSnapshot | null;
  /** Callback when rollback is requested */
  onRollback?: (version: IVersionSnapshot) => void;
}

export interface VersionRollbackDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Close the dialog */
  onClose: () => void;
  /** Version to rollback to */
  version: IVersionSnapshot | null;
  /** Current version number */
  currentVersion: number;
  /** Callback when rollback is confirmed */
  onConfirm?: (version: IVersionSnapshot) => void;
}

// =============================================================================
// Icons
// =============================================================================

function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function HistoryIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function ArrowPathIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

function EyeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function DocumentDuplicateIcon({
  className = 'w-5 h-5',
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75"
      />
    </svg>
  );
}

function XMarkIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function CheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}

function ExclamationTriangleIcon({
  className = 'w-6 h-6',
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
      />
    </svg>
  );
}

function ServerStackIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z"
      />
    </svg>
  );
}

function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5v15m7.5-7.5h-15"
      />
    </svg>
  );
}

function MinusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
    </svg>
  );
}

function ArrowsRightLeftIcon({
  className = 'w-4 h-4',
}: {
  className?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function SpinnerIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function UserCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get content type color
 */
function getContentTypeColor(type: ShareableContentType): string {
  switch (type) {
    case 'unit':
      return 'text-amber-400';
    case 'pilot':
      return 'text-blue-400';
    case 'force':
      return 'text-violet-400';
    case 'encounter':
      return 'text-cyan-400';
    default:
      return 'text-gray-400';
  }
}

/**
 * Get abbreviated creator name
 */
function getCreatorDisplay(createdBy: string): string {
  if (createdBy === 'local') return 'You';
  if (createdBy.length > 12) return createdBy.slice(0, 8) + '...';
  return createdBy;
}

// =============================================================================
// VersionHistoryPanel Component
// =============================================================================

export function VersionHistoryPanel({
  itemId,
  contentType,
  onVersionSelect,
  onRollback,
  className = '',
}: VersionHistoryPanelProps): React.ReactElement {
  const [versions, setVersions] = useState<IVersionSnapshot[]>([]);
  const [summary, setSummary] = useState<IVersionHistorySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(
    null,
  );
  const [previewVersion, setPreviewVersion] = useState<IVersionSnapshot | null>(
    null,
  );
  const [rollbackVersion, setRollbackVersion] =
    useState<IVersionSnapshot | null>(null);

  // Fetch version history
  useEffect(() => {
    async function fetchVersions() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/vault/versions?itemId=${encodeURIComponent(itemId)}&contentType=${encodeURIComponent(contentType)}`,
        );

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            errorData.error || `Failed to fetch versions (${response.status})`,
          );
        }

        const data = (await response.json()) as {
          versions: IVersionSnapshot[];
          summary: IVersionHistorySummary;
        };

        setVersions(data.versions);
        setSummary(data.summary);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load version history',
        );
      } finally {
        setIsLoading(false);
      }
    }

    fetchVersions();
  }, [itemId, contentType]);

  const handleVersionClick = useCallback(
    (version: IVersionSnapshot) => {
      setSelectedVersionId(version.id);
      onVersionSelect?.(version);
    },
    [onVersionSelect],
  );

  const handlePreview = useCallback((version: IVersionSnapshot) => {
    setPreviewVersion(version);
  }, []);

  const handleRollbackRequest = useCallback((version: IVersionSnapshot) => {
    setRollbackVersion(version);
  }, []);

  const handleRollbackConfirm = useCallback(
    async (version: IVersionSnapshot) => {
      try {
        const response = await fetch('/api/vault/versions/rollback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            itemId,
            contentType,
            targetVersion: version.version,
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            errorData.error || `Failed to rollback (${response.status})`,
          );
        }

        // Refresh the version list
        const refreshResponse = await fetch(
          `/api/vault/versions?itemId=${encodeURIComponent(itemId)}&contentType=${encodeURIComponent(contentType)}`,
        );
        if (refreshResponse.ok) {
          const data = (await refreshResponse.json()) as {
            versions: IVersionSnapshot[];
            summary: IVersionHistorySummary;
          };
          setVersions(data.versions);
          setSummary(data.summary);
        }

        onRollback?.(version);
        setRollbackVersion(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rollback');
      }
    },
    [itemId, contentType, onRollback],
  );

  if (isLoading) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div className="flex items-center justify-center py-16">
          <SpinnerIcon className="h-8 w-8 text-teal-400" />
          <span className="ml-3 font-medium text-gray-400">
            Loading history...
          </span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`overflow-hidden ${className}`}>
        <div className="p-6">
          <div className="flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-900/30 p-4">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-400" />
            <div>
              <p className="font-medium text-red-300">Failed to load history</p>
              <p className="mt-1 text-sm text-red-400/70">{error}</p>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className={`overflow-hidden ${className}`}>
        {/* Header with gradient */}
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-transparent" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-400/10 via-transparent to-transparent" />
          <div className="relative border-b border-gray-700/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/30 to-cyan-500/20 shadow-lg shadow-teal-500/10">
                  <HistoryIcon className="h-5 w-5 text-teal-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-white">
                    Version History
                  </h3>
                  <p
                    className={`text-sm ${getContentTypeColor(contentType)} capitalize`}
                  >
                    {contentType}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="grid grid-cols-3 gap-px bg-gray-700/30">
            <div className="bg-gray-800/80 p-4 text-center">
              <div className="text-2xl font-bold text-white tabular-nums">
                {summary.totalVersions}
              </div>
              <div className="mt-1 text-xs tracking-wider text-gray-500 uppercase">
                Versions
              </div>
            </div>
            <div className="bg-gray-800/80 p-4 text-center">
              <div className="text-2xl font-bold text-teal-400 tabular-nums">
                v{summary.currentVersion}
              </div>
              <div className="mt-1 text-xs tracking-wider text-gray-500 uppercase">
                Current
              </div>
            </div>
            <div className="bg-gray-800/80 p-4 text-center">
              <div className="text-2xl font-bold text-gray-300 tabular-nums">
                {formatBytes(summary.totalSizeBytes)}
              </div>
              <div className="mt-1 text-xs tracking-wider text-gray-500 uppercase">
                Storage
              </div>
            </div>
          </div>
        )}

        {/* Version List */}
        <div className="max-h-[480px] overflow-y-auto">
          {versions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-700/50">
                <ClockIcon className="h-8 w-8 text-gray-500" />
              </div>
              <p className="font-medium text-gray-400">No version history</p>
              <p className="mt-1 text-sm text-gray-500">
                Versions will appear here as changes are made
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-700/50">
              {versions.map((version, index) => {
                const isSelected = selectedVersionId === version.id;
                const isCurrent = index === 0;

                return (
                  <div
                    key={version.id}
                    className={`group relative cursor-pointer p-4 transition-all duration-200 ${
                      isSelected
                        ? 'bg-gradient-to-r from-teal-500/15 to-cyan-500/5'
                        : 'hover:bg-gray-700/30'
                    } `}
                    onClick={() => handleVersionClick(version)}
                  >
                    {/* Current indicator line */}
                    {isCurrent && (
                      <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-teal-400 to-cyan-500" />
                    )}

                    <div className="flex items-start gap-4">
                      {/* Version badge */}
                      <div
                        className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold ${
                          isCurrent
                            ? 'bg-gradient-to-br from-teal-500/30 to-cyan-500/20 text-teal-300 shadow-lg shadow-teal-500/10'
                            : 'bg-gray-700/50 text-gray-400'
                        } `}
                      >
                        {version.version}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          {isCurrent && (
                            <Badge variant="cyan" size="sm">
                              Current
                            </Badge>
                          )}
                          <span
                            className="text-sm text-gray-500"
                            title={formatFullDateTime(version.createdAt)}
                          >
                            {formatRelativeTime(version.createdAt)}
                          </span>
                        </div>

                        {/* Message */}
                        <p className="truncate font-medium text-white">
                          {version.message || 'No description'}
                        </p>

                        {/* Meta row */}
                        <div className="mt-2 flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <UserCircleIcon className="h-4 w-4" />
                            <span>{getCreatorDisplay(version.createdBy)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-gray-500">
                            <ServerStackIcon className="h-4 w-4" />
                            <span>{formatBytes(version.sizeBytes)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreview(version);
                          }}
                          className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-600/50 hover:text-white"
                          title="Preview this version"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        {!isCurrent && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRollbackRequest(version);
                            }}
                            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-amber-500/10 hover:text-amber-400"
                            title="Rollback to this version"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      {/* Preview Modal */}
      <VersionPreview
        isOpen={previewVersion !== null}
        onClose={() => setPreviewVersion(null)}
        version={previewVersion}
        onRollback={(v) => {
          setPreviewVersion(null);
          handleRollbackRequest(v);
        }}
      />

      {/* Rollback Dialog */}
      <VersionRollbackDialog
        isOpen={rollbackVersion !== null}
        onClose={() => setRollbackVersion(null)}
        version={rollbackVersion}
        currentVersion={summary?.currentVersion ?? 0}
        onConfirm={handleRollbackConfirm}
      />
    </>
  );
}

// =============================================================================
// VersionDiffView Component
// =============================================================================

export function VersionDiffView({
  itemId,
  contentType,
  versions,
  initialFromVersion,
  initialToVersion,
  className = '',
}: VersionDiffViewProps): React.ReactElement {
  const [fromVersion, setFromVersion] = useState<number>(
    initialFromVersion ?? (versions.length > 1 ? versions[1].version : 0),
  );
  const [toVersion, setToVersion] = useState<number>(
    initialToVersion ?? (versions.length > 0 ? versions[0].version : 0),
  );
  const [diff, setDiff] = useState<IVersionDiff | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'unified' | 'side-by-side'>(
    'unified',
  );

  // Fetch diff when versions change
  useEffect(() => {
    if (fromVersion === 0 || toVersion === 0 || fromVersion >= toVersion) {
      setDiff(null);
      return;
    }

    async function fetchDiff() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/vault/versions/diff?itemId=${encodeURIComponent(itemId)}&contentType=${encodeURIComponent(contentType)}&from=${fromVersion}&to=${toVersion}`,
        );

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
          };
          throw new Error(
            errorData.error || `Failed to fetch diff (${response.status})`,
          );
        }

        const data = (await response.json()) as IVersionDiff;
        setDiff(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load diff');
      } finally {
        setIsLoading(false);
      }
    }

    fetchDiff();
  }, [itemId, contentType, fromVersion, toVersion]);

  const versionOptions = useMemo(
    () =>
      versions.map((v) => ({
        value: String(v.version),
        label: `v${v.version} - ${formatRelativeTime(v.createdAt)}`,
      })),
    [versions],
  );

  const additionCount = diff ? Object.keys(diff.additions).length : 0;
  const deletionCount = diff ? Object.keys(diff.deletions).length : 0;
  const modificationCount = diff ? Object.keys(diff.modifications).length : 0;

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent" />
        <div className="relative border-b border-gray-700/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 shadow-lg shadow-violet-500/10">
                <ArrowsRightLeftIcon className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold tracking-tight text-white">
                  Compare Versions
                </h3>
                <p className="text-sm text-gray-400">
                  View changes between versions
                </p>
              </div>
            </div>

            {/* View mode toggle */}
            <div className="flex items-center gap-1 rounded-lg bg-gray-700/50 p-1">
              <button
                onClick={() => setViewMode('unified')}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'unified'
                    ? 'bg-violet-500/30 text-violet-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('side-by-side')}
                className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'side-by-side'
                    ? 'bg-violet-500/30 text-violet-300'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Side by Side
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Version Selectors */}
      <div className="border-b border-gray-700/50 bg-gray-800/50 p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select
              label="From Version"
              options={versionOptions}
              value={String(fromVersion)}
              onChange={(e) => setFromVersion(Number(e.target.value))}
              accent="violet"
            />
          </div>
          <div className="mt-5 flex h-12 w-12 items-center justify-center">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700/50">
              <ArrowsRightLeftIcon className="h-4 w-4 text-gray-400" />
            </div>
          </div>
          <div className="flex-1">
            <Select
              label="To Version"
              options={versionOptions}
              value={String(toVersion)}
              onChange={(e) => setToVersion(Number(e.target.value))}
              accent="violet"
            />
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="p-4">
        {fromVersion >= toVersion ? (
          <div className="py-8 text-center">
            <p className="text-gray-400">
              Select a &quot;From&quot; version that is older than the
              &quot;To&quot; version
            </p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <SpinnerIcon className="h-6 w-6 text-violet-400" />
            <span className="ml-3 text-gray-400">Computing differences...</span>
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-900/30 p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        ) : diff ? (
          <div className="space-y-4">
            {/* Summary badges */}
            <div className="flex items-center gap-3 border-b border-gray-700/50 pb-4">
              {additionCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1.5">
                  <PlusIcon className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-sm font-medium text-green-400">
                    {additionCount} added
                  </span>
                </div>
              )}
              {deletionCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5">
                  <MinusIcon className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-sm font-medium text-red-400">
                    {deletionCount} removed
                  </span>
                </div>
              )}
              {modificationCount > 0 && (
                <div className="flex items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5">
                  <ArrowsRightLeftIcon className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-sm font-medium text-yellow-400">
                    {modificationCount} modified
                  </span>
                </div>
              )}
              {additionCount === 0 &&
                deletionCount === 0 &&
                modificationCount === 0 && (
                  <span className="text-sm text-gray-400">
                    No changes detected
                  </span>
                )}
            </div>

            {/* Changed fields */}
            {diff.changedFields.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-400">
                  Changed Fields
                </p>
                <div className="flex flex-wrap gap-2">
                  {diff.changedFields.map((field) => (
                    <Badge key={field} variant="slate" size="sm">
                      {field}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Diff display */}
            <div className="space-y-3">
              {/* Additions */}
              {Object.entries(diff.additions).map(([key, value]) => (
                <div
                  key={`add-${key}`}
                  className="rounded-lg border border-green-500/20 bg-green-500/5 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <PlusIcon className="h-4 w-4 text-green-400" />
                    <span className="font-mono text-sm text-green-400">
                      {key}
                    </span>
                  </div>
                  <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-green-300">
                    {typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
                      : String(value)}
                  </pre>
                </div>
              ))}

              {/* Deletions */}
              {Object.entries(diff.deletions).map(([key, value]) => (
                <div
                  key={`del-${key}`}
                  className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <MinusIcon className="h-4 w-4 text-red-400" />
                    <span className="font-mono text-sm text-red-400 line-through">
                      {key}
                    </span>
                  </div>
                  <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-red-300 opacity-60">
                    {typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
                      : String(value)}
                  </pre>
                </div>
              ))}

              {/* Modifications */}
              {Object.entries(diff.modifications).map(([key, { from, to }]) => (
                <div
                  key={`mod-${key}`}
                  className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3"
                >
                  <div className="mb-3 flex items-center gap-2">
                    <ArrowsRightLeftIcon className="h-4 w-4 text-yellow-400" />
                    <span className="font-mono text-sm text-yellow-400">
                      {key}
                    </span>
                  </div>
                  {viewMode === 'side-by-side' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded border border-red-500/20 bg-red-500/10 p-2">
                        <p className="mb-1 text-xs tracking-wider text-red-400 uppercase">
                          Before
                        </p>
                        <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-red-300">
                          {typeof from === 'object'
                            ? JSON.stringify(from, null, 2)
                            : String(from)}
                        </pre>
                      </div>
                      <div className="rounded border border-green-500/20 bg-green-500/10 p-2">
                        <p className="mb-1 text-xs tracking-wider text-green-400 uppercase">
                          After
                        </p>
                        <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-green-300">
                          {typeof to === 'object'
                            ? JSON.stringify(to, null, 2)
                            : String(to)}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-sm text-red-400">
                          -
                        </span>
                        <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-red-300 line-through opacity-70">
                          {typeof from === 'object'
                            ? JSON.stringify(from, null, 2)
                            : String(from)}
                        </pre>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-sm text-green-400">
                          +
                        </span>
                        <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-green-300">
                          {typeof to === 'object'
                            ? JSON.stringify(to, null, 2)
                            : String(to)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </Card>
  );
}

// =============================================================================
// VersionPreview Component
// =============================================================================

export function VersionPreview({
  isOpen,
  onClose,
  version,
  onRollback,
}: VersionPreviewProps): React.ReactElement | null {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!version) return;

    try {
      await navigator.clipboard.writeText(version.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = version.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [version]);

  const handleClose = useCallback(() => {
    setCopied(false);
    onClose();
  }, [onClose]);

  if (!isOpen || !version) return null;

  // Try to format content as JSON
  let formattedContent = version.content;
  try {
    const parsed = JSON.parse(version.content) as unknown;
    formattedContent = JSON.stringify(parsed, null, 2);
  } catch {
    // Keep as-is if not valid JSON
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-700/50 bg-gray-800 shadow-2xl shadow-black/50">
        {/* Header */}
        <div className="relative flex-shrink-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-transparent" />
          <div className="relative border-b border-gray-700/50 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/30 to-teal-500/20 shadow-lg shadow-cyan-500/10">
                  <span className="font-mono text-2xl font-bold text-cyan-300">
                    {version.version}
                  </span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Version Preview
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-400">
                    {version.message || 'No description'} &middot;{' '}
                    {formatRelativeTime(version.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-700/50 hover:text-white"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex-shrink-0 border-b border-gray-700/50 bg-gray-800/50 p-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-gray-400">
              <UserCircleIcon className="h-4 w-4" />
              <span>Created by {getCreatorDisplay(version.createdBy)}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <ClockIcon className="h-4 w-4" />
              <span title={formatFullDateTime(version.createdAt)}>
                {formatFullDateTime(version.createdAt)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-gray-400">
              <ServerStackIcon className="h-4 w-4" />
              <span>{formatBytes(version.sizeBytes)}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <div className="relative">
            <pre className="overflow-x-auto rounded-xl border border-gray-700/50 bg-gray-900/50 p-4 font-mono text-sm leading-relaxed whitespace-pre text-gray-300">
              {formattedContent}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-t border-gray-700/50 bg-gray-800/80 p-4">
          <div className="flex items-center gap-2 font-mono text-xs text-gray-500">
            Hash: {version.contentHash.slice(0, 16)}...
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleCopy}
              leftIcon={
                copied ? (
                  <CheckIcon className="h-4 w-4 text-green-400" />
                ) : (
                  <DocumentDuplicateIcon className="h-4 w-4" />
                )
              }
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </Button>
            {onRollback && (
              <Button
                variant="primary"
                onClick={() => onRollback(version)}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Rollback to This
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// VersionRollbackDialog Component
// =============================================================================

export function VersionRollbackDialog({
  isOpen,
  onClose,
  version,
  currentVersion,
  onConfirm,
}: VersionRollbackDialogProps): React.ReactElement | null {
  const [isRollingBack, setIsRollingBack] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (!version || !onConfirm) return;

    setIsRollingBack(true);
    try {
      await onConfirm(version);
    } finally {
      setIsRollingBack(false);
    }
  }, [version, onConfirm]);

  if (!isOpen || !version) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-gray-700/50 bg-gray-800 p-6 shadow-2xl shadow-black/50">
        {/* Warning icon */}
        <div className="mb-5 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/20">
            <ExclamationTriangleIcon className="h-8 w-8 text-amber-400" />
          </div>
        </div>

        {/* Title */}
        <h2 className="mb-2 text-center text-xl font-bold text-white">
          Confirm Rollback
        </h2>
        <p className="mb-6 text-center text-sm text-gray-400">
          This will restore the content to a previous version
        </p>

        {/* Version info */}
        <div className="mb-6 rounded-xl border border-gray-700/50 bg-gray-900/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm text-gray-400">Rolling back from</span>
            <span className="text-sm text-gray-400">Restoring to</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20">
                <span className="font-mono font-bold text-red-400">
                  v{currentVersion}
                </span>
              </div>
              <span className="text-sm text-gray-500">Current</span>
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.25 8.25L21 12m0 0l-3.75 3.75M21 12H3"
                />
              </svg>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Target</span>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                <span className="font-mono font-bold text-green-400">
                  v{version.version}
                </span>
              </div>
            </div>
          </div>

          {version.message && (
            <div className="mt-4 border-t border-gray-700/50 pt-3">
              <p className="mb-1 text-xs text-gray-500">Version message</p>
              <p className="text-sm text-gray-300">{version.message}</p>
            </div>
          )}
        </div>

        {/* Warning message */}
        <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
            <div className="text-sm">
              <p className="font-medium text-amber-300">Important</p>
              <p className="mt-1 text-amber-400/80">
                This will create a new version (v{currentVersion + 1}) with the
                content from v{version.version}. Your current version will be
                preserved in history.
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            fullWidth
            onClick={onClose}
            disabled={isRollingBack}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            fullWidth
            onClick={handleConfirm}
            isLoading={isRollingBack}
            disabled={isRollingBack}
            leftIcon={<ArrowPathIcon className="h-4 w-4" />}
          >
            Rollback
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

/**
 * All version history components bundled together
 */
export const VersionHistory = {
  VersionHistoryPanel,
  VersionDiffView,
  VersionPreview,
  VersionRollbackDialog,
};

export default VersionHistory;
