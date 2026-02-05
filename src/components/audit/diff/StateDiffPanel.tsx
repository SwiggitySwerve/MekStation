/**
 * StateDiffPanel Component
 * Side-by-side display showing "Before" and "After" state with diff visualization.
 * Uses Card components with headers showing sequence numbers and timestamps.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useMemo } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { IStateDiff } from '@/hooks/audit';

import { NestedDiff } from './NestedDiff';

// =============================================================================
// Types
// =============================================================================

export interface StateDiffPanelProps {
  /** The computed state diff (null if not yet computed) */
  diff: IStateDiff<unknown> | null;
  /** Whether the diff is being computed */
  isLoading: boolean;
  /** Optional additional className */
  className?: string;
}

// =============================================================================
// Icons
// =============================================================================

function LoadingSpinner(): React.ReactElement {
  return (
    <svg
      className="text-accent h-8 w-8 animate-spin"
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

function EmptyStateIcon(): React.ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1}
      stroke="currentColor"
      className="mb-4 h-16 w-16 opacity-30"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

// =============================================================================
// Sub-Components
// =============================================================================

interface SummaryBarProps {
  summary: IStateDiff<unknown>['summary'];
  eventCount: number;
}

function SummaryBar({
  summary,
  eventCount,
}: SummaryBarProps): React.ReactElement {
  return (
    <div className="bg-surface-raised/30 border-border-theme-subtle/50 flex flex-wrap items-center gap-3 border-b px-4 py-3">
      {/* Change counts */}
      <div className="flex items-center gap-2">
        <span className="text-text-theme-muted text-xs tracking-wide uppercase">
          Changes:
        </span>
        <Badge variant="emerald" size="sm">
          +{summary.added} added
        </Badge>
        <Badge variant="red" size="sm">
          -{summary.removed} removed
        </Badge>
        <Badge variant="amber" size="sm">
          ~{summary.modified} modified
        </Badge>
      </div>

      {/* Separator */}
      <div className="bg-border-theme-subtle/50 h-4 w-px" />

      {/* Event count */}
      <div className="flex items-center gap-2">
        <span className="text-text-theme-muted text-xs tracking-wide uppercase">
          Events:
        </span>
        <Badge variant="cyan" size="sm">
          {eventCount} event{eventCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Total */}
      <div className="ml-auto">
        <span className="text-text-theme-secondary text-xs">
          {summary.total} total change{summary.total !== 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
}

interface SequenceHeaderProps {
  label: string;
  sequence: number;
  variant: 'before' | 'after';
}

function SequenceHeader({
  label,
  sequence,
  variant,
}: SequenceHeaderProps): React.ReactElement {
  const colorClasses =
    variant === 'before'
      ? 'text-red-400 border-red-500/30'
      : 'text-emerald-400 border-emerald-500/30';

  return (
    <div
      className={`flex items-center gap-2 border-b px-3 py-2 ${colorClasses}`}
    >
      <span className="text-xs font-semibold tracking-wider uppercase">
        {label}
      </span>
      <code className="bg-surface-base/50 rounded px-2 py-0.5 font-mono text-xs">
        #{sequence}
      </code>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function StateDiffPanel({
  diff,
  isLoading,
  className = '',
}: StateDiffPanelProps): React.ReactElement {
  // Memoize entries for performance
  const changedEntries = useMemo(
    () => diff?.entries.filter((e) => e.changeType !== 'unchanged') ?? [],
    [diff],
  );

  // Loading state
  if (isLoading) {
    return (
      <Card variant="default" className={`${className}`}>
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner />
          <p className="text-text-theme-secondary mt-4 text-sm">
            Computing state differences...
          </p>
          <p className="text-text-theme-muted mt-1 text-xs">
            Deriving states and comparing values
          </p>
        </div>
      </Card>
    );
  }

  // Empty state (no diff computed yet)
  if (!diff) {
    return (
      <Card variant="default" className={`${className}`}>
        <div className="text-text-theme-muted flex flex-col items-center justify-center py-16">
          <EmptyStateIcon />
          <p className="text-sm font-medium">No Comparison Selected</p>
          <p className="mt-2 max-w-xs text-center text-xs">
            Select two sequence numbers above and click &quot;Compare
            States&quot; to see what changed between them.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card variant="default" className={`overflow-hidden ${className}`}>
      {/* Summary Bar */}
      <SummaryBar
        summary={diff.summary}
        eventCount={diff.eventsBetween.length}
      />

      {/* Header Row */}
      <div className="divide-border-theme-subtle/50 grid grid-cols-2 divide-x">
        <SequenceHeader
          label="Before"
          sequence={diff.sequenceA}
          variant="before"
        />
        <SequenceHeader
          label="After"
          sequence={diff.sequenceB}
          variant="after"
        />
      </div>

      {/* Diff Content */}
      <div className="max-h-[500px] overflow-y-auto">
        {changedEntries.length > 0 ? (
          <div className="p-4">
            <NestedDiff
              entries={diff.entries}
              groupByPath={true}
              defaultExpanded={changedEntries.length <= 20}
            />
          </div>
        ) : (
          <div className="text-text-theme-muted flex flex-col items-center justify-center py-12">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
              className="mb-3 h-10 w-10 opacity-50"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
              />
            </svg>
            <p className="text-sm font-medium">States are Identical</p>
            <p className="mt-1 text-xs">
              No differences found between sequence #{diff.sequenceA} and #
              {diff.sequenceB}
            </p>
          </div>
        )}
      </div>

      {/* Events Between (collapsed by default) */}
      {diff.eventsBetween.length > 0 && (
        <details className="border-border-theme-subtle/50 border-t">
          <summary className="hover:bg-surface-raised/30 text-text-theme-secondary cursor-pointer px-4 py-3 text-sm transition-colors">
            <span className="ml-2">
              View {diff.eventsBetween.length} event
              {diff.eventsBetween.length !== 1 ? 's' : ''} between these states
            </span>
          </summary>
          <div className="max-h-64 overflow-y-auto px-4 pb-4">
            <div className="space-y-1">
              {diff.eventsBetween.map((event, index) => (
                <div
                  key={event.id || index}
                  className="bg-surface-raised/30 flex items-center gap-2 rounded px-2 py-1.5 font-mono text-xs"
                >
                  <code className="text-text-theme-muted">
                    #{event.sequence}
                  </code>
                  <Badge variant="slate" size="sm">
                    {event.type}
                  </Badge>
                  <span className="text-text-theme-secondary truncate">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </details>
      )}
    </Card>
  );
}

export default StateDiffPanel;
