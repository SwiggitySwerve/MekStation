import React from 'react';

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

interface VersionLoadingCardProps {
  className: string;
}

export function VersionLoadingCard({
  className,
}: VersionLoadingCardProps): React.ReactElement {
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

interface VersionErrorCardProps {
  className: string;
  error: string;
}

export function VersionErrorCard({
  className,
  error,
}: VersionErrorCardProps): React.ReactElement {
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

interface VersionHistoryContentProps {
  className: string;
  contentType: ShareableContentType;
  versions: IVersionSnapshot[];
  summary: IVersionHistorySummary | null;
  selectedVersionId: string | null;
  onVersionClick: (version: IVersionSnapshot) => void;
  onPreview: (version: IVersionSnapshot) => void;
  onRollbackRequest: (version: IVersionSnapshot) => void;
}

export function VersionHistoryContent({
  className,
  contentType,
  versions,
  summary,
  selectedVersionId,
  onVersionClick,
  onPreview,
  onRollbackRequest,
}: VersionHistoryContentProps): React.ReactElement {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <VersionHistoryHeader contentType={contentType} />
      {summary && <VersionSummaryStats summary={summary} />}
      <VersionRows
        versions={versions}
        selectedVersionId={selectedVersionId}
        onVersionClick={onVersionClick}
        onPreview={onPreview}
        onRollbackRequest={onRollbackRequest}
      />
    </Card>
  );
}

interface VersionHistoryHeaderProps {
  contentType: ShareableContentType;
}

function VersionHistoryHeader({
  contentType,
}: VersionHistoryHeaderProps): React.ReactElement {
  return (
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
  );
}

interface VersionSummaryStatsProps {
  summary: IVersionHistorySummary;
}

function VersionSummaryStats({
  summary,
}: VersionSummaryStatsProps): React.ReactElement {
  return (
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
  );
}

interface VersionRowsProps {
  versions: IVersionSnapshot[];
  selectedVersionId: string | null;
  onVersionClick: (version: IVersionSnapshot) => void;
  onPreview: (version: IVersionSnapshot) => void;
  onRollbackRequest: (version: IVersionSnapshot) => void;
}

function VersionRows({
  versions,
  selectedVersionId,
  onVersionClick,
  onPreview,
  onRollbackRequest,
}: VersionRowsProps): React.ReactElement {
  if (versions.length === 0) {
    return (
      <div className="max-h-[480px] overflow-y-auto">
        <div className="p-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-700/50">
            <ClockIcon className="h-8 w-8 text-gray-500" />
          </div>
          <p className="font-medium text-gray-400">No version history</p>
          <p className="mt-1 text-sm text-gray-500">
            Versions will appear here as changes are made
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-h-[480px] overflow-y-auto">
      <div className="divide-y divide-gray-700/50">
        {versions.map((version, index) => (
          <VersionRow
            key={version.id}
            version={version}
            isCurrent={index === 0}
            isSelected={selectedVersionId === version.id}
            onVersionClick={onVersionClick}
            onPreview={onPreview}
            onRollbackRequest={onRollbackRequest}
          />
        ))}
      </div>
    </div>
  );
}

interface VersionRowProps {
  version: IVersionSnapshot;
  isCurrent: boolean;
  isSelected: boolean;
  onVersionClick: (version: IVersionSnapshot) => void;
  onPreview: (version: IVersionSnapshot) => void;
  onRollbackRequest: (version: IVersionSnapshot) => void;
}

function VersionRow({
  version,
  isCurrent,
  isSelected,
  onVersionClick,
  onPreview,
  onRollbackRequest,
}: VersionRowProps): React.ReactElement {
  return (
    <div
      className={`group relative cursor-pointer p-4 transition-all duration-200 ${
        isSelected
          ? 'bg-gradient-to-r from-teal-500/15 to-cyan-500/5'
          : 'hover:bg-gray-700/30'
      } `}
      onClick={() => onVersionClick(version)}
    >
      {isCurrent && (
        <div className="absolute top-0 bottom-0 left-0 w-1 bg-gradient-to-b from-teal-400 to-cyan-500" />
      )}

      <div className="flex items-start gap-4">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl font-mono text-lg font-bold ${
            isCurrent
              ? 'bg-gradient-to-br from-teal-500/30 to-cyan-500/20 text-teal-300 shadow-lg shadow-teal-500/10'
              : 'bg-gray-700/50 text-gray-400'
          } `}
        >
          {version.version}
        </div>

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

          <p className="truncate font-medium text-white">
            {version.message || 'No description'}
          </p>

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

        <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            onClick={(event) => {
              event.stopPropagation();
              onPreview(version);
            }}
            className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-600/50 hover:text-white"
            title="Preview this version"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {!isCurrent && (
            <button
              onClick={(event) => {
                event.stopPropagation();
                onRollbackRequest(version);
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
}
