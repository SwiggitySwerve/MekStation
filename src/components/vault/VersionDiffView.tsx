/**
 * Version Diff View Component
 *
 * Displays a comparison between two versions with unified or side-by-side
 * diff rendering, version selectors, and change summary badges.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useEffect, useMemo } from 'react';

import type { IVersionDiff } from '@/types/vault';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { formatRelativeTime } from '@/utils/formatting';
import { logger } from '@/utils/logger';

import type { VersionDiffViewProps } from './VersionHistory';

import {
  SpinnerIcon,
  PlusIcon,
  MinusIcon,
  ArrowsRightLeftIcon,
} from './VersionHistoryIcons';

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
          const errorData = (await response.json().catch((e) => {
            logger.debug('Response not JSON when fetching diff', e);
            return {};
          })) as {
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
