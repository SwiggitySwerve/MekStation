import React, { useState, useCallback, useEffect } from 'react';

import type {
  IVersionSnapshot,
  IVersionHistorySummary,
  ShareableContentType,
} from '@/types/vault';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import {
  formatBytes,
  formatRelativeTime,
  formatFullDateTime,
} from '@/utils/formatting';
import { logger } from '@/utils/logger';

import type { VersionHistoryPanelProps } from './VersionHistory';

import {
  ClockIcon,
  HistoryIcon,
  ArrowPathIcon,
  EyeIcon,
  SpinnerIcon,
  ExclamationTriangleIcon,
  ServerStackIcon,
  UserCircleIcon,
} from './VersionHistoryIcons';
import { VersionPreview } from './VersionPreviewModal';
import { VersionRollbackDialog } from './VersionRollbackDialog';

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

function getCreatorDisplay(createdBy: string): string {
  if (createdBy === 'local') return 'You';
  if (createdBy.length > 12) return createdBy.slice(0, 8) + '...';
  return createdBy;
}

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
          const errorData = (await response.json().catch((e) => {
            logger.debug('Response not JSON when fetching versions', e);
            return {};
          })) as {
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
          const errorData = (await response.json().catch((e) => {
            logger.debug('Response not JSON when rolling back version', e);
            return {};
          })) as {
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
