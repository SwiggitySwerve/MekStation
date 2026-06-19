import React from 'react';

import type { IVersionDiff } from '@/types/vault';

import { Badge } from '@/components/ui/Badge';

import {
  SpinnerIcon,
  PlusIcon,
  MinusIcon,
  ArrowsRightLeftIcon,
} from './VersionHistoryIcons';

export type VersionDiffViewMode = 'unified' | 'side-by-side';

interface VersionDiffContentProps {
  readonly diff: IVersionDiff | null;
  readonly error: string | null;
  readonly fromVersion: number;
  readonly isLoading: boolean;
  readonly toVersion: number;
  readonly viewMode: VersionDiffViewMode;
}

interface DiffFieldProps {
  readonly field: string;
  readonly value: unknown;
}

interface ModifiedFieldProps {
  readonly field: string;
  readonly from: unknown;
  readonly to: unknown;
  readonly viewMode: VersionDiffViewMode;
}

function formatDiffValue(value: unknown): string {
  return typeof value === 'object' && value !== null
    ? JSON.stringify(value, null, 2)
    : String(value);
}

function DiffSummaryBadges({
  diff,
}: {
  readonly diff: IVersionDiff;
}): React.ReactElement {
  const additionCount = Object.keys(diff.additions).length;
  const deletionCount = Object.keys(diff.deletions).length;
  const modificationCount = Object.keys(diff.modifications).length;
  const hasChanges =
    additionCount > 0 || deletionCount > 0 || modificationCount > 0;

  return (
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
      {!hasChanges && (
        <span className="text-sm text-gray-400">No changes detected</span>
      )}
    </div>
  );
}

function ChangedFieldsList({
  fields,
}: {
  readonly fields: readonly string[];
}): React.ReactElement | null {
  if (fields.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-400">Changed Fields</p>
      <div className="flex flex-wrap gap-2">
        {fields.map((field) => (
          <Badge key={field} variant="slate" size="sm">
            {field}
          </Badge>
        ))}
      </div>
    </div>
  );
}

function AddedField({ field, value }: DiffFieldProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <PlusIcon className="h-4 w-4 text-green-400" />
        <span className="font-mono text-sm text-green-400">{field}</span>
      </div>
      <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-green-300">
        {formatDiffValue(value)}
      </pre>
    </div>
  );
}

function DeletedField({ field, value }: DiffFieldProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
      <div className="mb-2 flex items-center gap-2">
        <MinusIcon className="h-4 w-4 text-red-400" />
        <span className="font-mono text-sm text-red-400 line-through">
          {field}
        </span>
      </div>
      <pre className="overflow-x-auto font-mono text-sm whitespace-pre-wrap text-red-300 opacity-60">
        {formatDiffValue(value)}
      </pre>
    </div>
  );
}

function SideBySideModifiedValue({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: unknown;
  readonly tone: 'red' | 'green';
}): React.ReactElement {
  const classes =
    tone === 'red'
      ? {
          container: 'border-red-500/20 bg-red-500/10',
          label: 'text-red-400',
          value: 'text-red-300',
        }
      : {
          container: 'border-green-500/20 bg-green-500/10',
          label: 'text-green-400',
          value: 'text-green-300',
        };

  return (
    <div className={`rounded border p-2 ${classes.container}`}>
      <p className={`mb-1 text-xs tracking-wider uppercase ${classes.label}`}>
        {label}
      </p>
      <pre
        className={`overflow-x-auto font-mono text-sm whitespace-pre-wrap ${classes.value}`}
      >
        {formatDiffValue(value)}
      </pre>
    </div>
  );
}

function UnifiedModifiedValue({
  prefix,
  value,
  tone,
}: {
  readonly prefix: '-' | '+';
  readonly value: unknown;
  readonly tone: 'red' | 'green';
}): React.ReactElement {
  const valueClass =
    tone === 'red' ? 'text-red-300 line-through opacity-70' : 'text-green-300';
  const prefixClass = tone === 'red' ? 'text-red-400' : 'text-green-400';

  return (
    <div className="flex items-start gap-2">
      <span className={`font-mono text-sm ${prefixClass}`}>{prefix}</span>
      <pre
        className={`overflow-x-auto font-mono text-sm whitespace-pre-wrap ${valueClass}`}
      >
        {formatDiffValue(value)}
      </pre>
    </div>
  );
}

function ModifiedField({
  field,
  from,
  to,
  viewMode,
}: ModifiedFieldProps): React.ReactElement {
  return (
    <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3">
      <div className="mb-3 flex items-center gap-2">
        <ArrowsRightLeftIcon className="h-4 w-4 text-yellow-400" />
        <span className="font-mono text-sm text-yellow-400">{field}</span>
      </div>
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-2 gap-3">
          <SideBySideModifiedValue label="Before" value={from} tone="red" />
          <SideBySideModifiedValue label="After" value={to} tone="green" />
        </div>
      ) : (
        <div className="space-y-2">
          <UnifiedModifiedValue prefix="-" value={from} tone="red" />
          <UnifiedModifiedValue prefix="+" value={to} tone="green" />
        </div>
      )}
    </div>
  );
}

function DiffEntries({
  diff,
  viewMode,
}: {
  readonly diff: IVersionDiff;
  readonly viewMode: VersionDiffViewMode;
}): React.ReactElement {
  return (
    <div className="space-y-3">
      {Object.entries(diff.additions).map(([field, value]) => (
        <AddedField key={`add-${field}`} field={field} value={value} />
      ))}
      {Object.entries(diff.deletions).map(([field, value]) => (
        <DeletedField key={`del-${field}`} field={field} value={value} />
      ))}
      {Object.entries(diff.modifications).map(([field, { from, to }]) => (
        <ModifiedField
          key={`mod-${field}`}
          field={field}
          from={from}
          to={to}
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}

function VersionDiffLoadedContent({
  diff,
  viewMode,
}: {
  readonly diff: IVersionDiff;
  readonly viewMode: VersionDiffViewMode;
}): React.ReactElement {
  return (
    <div className="space-y-4">
      <DiffSummaryBadges diff={diff} />
      <ChangedFieldsList fields={diff.changedFields} />
      <DiffEntries diff={diff} viewMode={viewMode} />
    </div>
  );
}

export function VersionDiffContent({
  diff,
  error,
  fromVersion,
  isLoading,
  toVersion,
  viewMode,
}: VersionDiffContentProps): React.ReactElement | null {
  if (fromVersion >= toVersion) {
    return (
      <div className="py-8 text-center">
        <p className="text-gray-400">
          Select a &quot;From&quot; version that is older than the
          &quot;To&quot; version
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <SpinnerIcon className="h-6 w-6 text-violet-400" />
        <span className="ml-3 text-gray-400">Computing differences...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-900/30 p-4">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  return diff ? (
    <VersionDiffLoadedContent diff={diff} viewMode={viewMode} />
  ) : null;
}
