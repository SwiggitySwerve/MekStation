/**
 * Version Diff View Component
 *
 * Displays a comparison between two versions with unified or side-by-side
 * diff rendering, version selectors, and change summary badges.
 *
 * @spec openspec/changes/add-vault-sharing/specs/vault-sharing/spec.md
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';

import type { IVersionDiff } from '@/types/vault';

import { errorMessageFromUnknown } from '@/components/common/runUiOperation';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { formatRelativeTime } from '@/utils/formatting';
import { logger } from '@/utils/logger';

import type { VersionDiffViewProps } from './VersionHistoryTypes';

import {
  VersionDiffContent,
  type VersionDiffViewMode,
} from './VersionDiffContent';
import { ArrowsRightLeftIcon } from './VersionHistoryIcons';

interface VersionDiffHeaderProps {
  readonly viewMode: VersionDiffViewMode;
  readonly onViewModeChange: (viewMode: VersionDiffViewMode) => void;
}

interface VersionDiffSelectorsProps {
  readonly versionOptions: Array<{ value: string; label: string }>;
  readonly fromVersion: number;
  readonly toVersion: number;
  readonly onFromVersionChange: (version: number) => void;
  readonly onToVersionChange: (version: number) => void;
}

async function fetchVersionDiff(
  itemId: string,
  contentType: VersionDiffViewProps['contentType'],
  fromVersion: number,
  toVersion: number,
): Promise<IVersionDiff> {
  const response = await fetch(
    `/api/vault/versions/diff?itemId=${encodeURIComponent(itemId)}&contentType=${encodeURIComponent(contentType)}&from=${fromVersion}&to=${toVersion}`,
  );

  if (response.ok) {
    return (await response.json()) as IVersionDiff;
  }

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

function VersionDiffHeader({
  viewMode,
  onViewModeChange,
}: VersionDiffHeaderProps): React.ReactElement {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/10 to-transparent" />
      <div className="border-border-theme/50 relative border-b p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 shadow-lg shadow-violet-500/10">
              <ArrowsRightLeftIcon className="h-5 w-5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-text-theme-primary text-lg font-bold tracking-tight">
                Compare Versions
              </h3>
              <p className="text-text-theme-secondary text-sm">
                View changes between versions
              </p>
            </div>
          </div>

          <div className="bg-surface-raised/50 flex items-center gap-1 rounded-lg p-1">
            <button
              onClick={() => onViewModeChange('unified')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'unified'
                  ? 'bg-violet-500/30 text-violet-300'
                  : 'text-text-theme-secondary hover:text-text-theme-primary'
              }`}
            >
              Unified
            </button>
            <button
              onClick={() => onViewModeChange('side-by-side')}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors ${
                viewMode === 'side-by-side'
                  ? 'bg-violet-500/30 text-violet-300'
                  : 'text-text-theme-secondary hover:text-text-theme-primary'
              }`}
            >
              Side by Side
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function VersionDiffSelectors({
  versionOptions,
  fromVersion,
  toVersion,
  onFromVersionChange,
  onToVersionChange,
}: VersionDiffSelectorsProps): React.ReactElement {
  return (
    <div className="border-border-theme/50 bg-surface-base/50 border-b p-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <Select
            label="From Version"
            options={versionOptions}
            value={String(fromVersion)}
            onChange={(e) => onFromVersionChange(Number(e.target.value))}
            accent="violet"
          />
        </div>
        <div className="mt-5 flex h-12 w-12 items-center justify-center">
          <div className="bg-surface-raised/50 flex h-8 w-8 items-center justify-center rounded-full">
            <ArrowsRightLeftIcon className="text-text-theme-secondary h-4 w-4" />
          </div>
        </div>
        <div className="flex-1">
          <Select
            label="To Version"
            options={versionOptions}
            value={String(toVersion)}
            onChange={(e) => onToVersionChange(Number(e.target.value))}
            accent="violet"
          />
        </div>
      </div>
    </div>
  );
}

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
  const loadRunId = useRef(0);
  const [viewMode, setViewMode] = useState<VersionDiffViewMode>('unified');

  useEffect(() => {
    const sequence = loadRunId;
    const runId = ++sequence.current;
    setDiff(null);
    setError(null);
    if (fromVersion === 0 || toVersion === 0 || fromVersion >= toVersion) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);

    async function fetchDiff(): Promise<void> {
      try {
        const data = await fetchVersionDiff(
          itemId,
          contentType,
          fromVersion,
          toVersion,
        );
        if (runId === loadRunId.current) {
          setDiff(data);
        }
      } catch (error) {
        if (runId === loadRunId.current) {
          setError(errorMessageFromUnknown(error, 'Failed to load diff'));
        }
      } finally {
        if (runId === loadRunId.current) {
          setIsLoading(false);
        }
      }
    }

    void fetchDiff();
    return () => {
      sequence.current++;
    };
  }, [itemId, contentType, fromVersion, toVersion]);

  const versionOptions = useMemo(
    () =>
      versions.map((v) => ({
        value: String(v.version),
        label: `v${v.version} - ${formatRelativeTime(v.createdAt)}`,
      })),
    [versions],
  );

  return (
    <Card className={`overflow-hidden ${className}`}>
      <VersionDiffHeader viewMode={viewMode} onViewModeChange={setViewMode} />
      <VersionDiffSelectors
        versionOptions={versionOptions}
        fromVersion={fromVersion}
        toVersion={toVersion}
        onFromVersionChange={setFromVersion}
        onToVersionChange={setToVersion}
      />

      <div className="p-4">
        <VersionDiffContent
          diff={diff}
          error={error}
          fromVersion={fromVersion}
          isLoading={isLoading}
          toVersion={toVersion}
          viewMode={viewMode}
        />
      </div>
    </Card>
  );
}
