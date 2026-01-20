/**
 * StateDiffPanel Component
 * Side-by-side display showing "Before" and "After" state with diff visualization.
 * Uses Card components with headers showing sequence numbers and timestamps.
 *
 * @spec openspec/changes/add-audit-timeline/specs/audit-timeline/spec.md
 */

import React, { useMemo } from 'react';
import { IStateDiff } from '@/hooks/audit';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
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
      className="animate-spin h-8 w-8 text-accent" 
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
      className="w-16 h-16 mb-4 opacity-30"
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

function SummaryBar({ summary, eventCount }: SummaryBarProps): React.ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-surface-raised/30 border-b border-border-theme-subtle/50">
      {/* Change counts */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-theme-muted uppercase tracking-wide">Changes:</span>
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
      <div className="w-px h-4 bg-border-theme-subtle/50" />

      {/* Event count */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-theme-muted uppercase tracking-wide">Events:</span>
        <Badge variant="cyan" size="sm">
          {eventCount} event{eventCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Total */}
      <div className="ml-auto">
        <span className="text-xs text-text-theme-secondary">
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

function SequenceHeader({ label, sequence, variant }: SequenceHeaderProps): React.ReactElement {
  const colorClasses = variant === 'before' 
    ? 'text-red-400 border-red-500/30' 
    : 'text-emerald-400 border-emerald-500/30';

  return (
    <div className={`flex items-center gap-2 px-3 py-2 border-b ${colorClasses}`}>
      <span className="text-xs font-semibold uppercase tracking-wider">
        {label}
      </span>
      <code className="text-xs font-mono bg-surface-base/50 px-2 py-0.5 rounded">
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
    () => diff?.entries.filter(e => e.changeType !== 'unchanged') ?? [],
    [diff]
  );

  // Loading state
  if (isLoading) {
    return (
      <Card variant="default" className={`${className}`}>
        <div className="flex flex-col items-center justify-center py-16">
          <LoadingSpinner />
          <p className="mt-4 text-sm text-text-theme-secondary">
            Computing state differences...
          </p>
          <p className="mt-1 text-xs text-text-theme-muted">
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
        <div className="flex flex-col items-center justify-center py-16 text-text-theme-muted">
          <EmptyStateIcon />
          <p className="text-sm font-medium">No Comparison Selected</p>
          <p className="mt-2 text-xs text-center max-w-xs">
            Select two sequence numbers above and click &quot;Compare States&quot; to see what changed between them.
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
      <div className="grid grid-cols-2 divide-x divide-border-theme-subtle/50">
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
          <div className="flex flex-col items-center justify-center py-12 text-text-theme-muted">
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24" 
              strokeWidth={1} 
              stroke="currentColor" 
              className="w-10 h-10 mb-3 opacity-50"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" 
              />
            </svg>
            <p className="text-sm font-medium">States are Identical</p>
            <p className="mt-1 text-xs">
              No differences found between sequence #{diff.sequenceA} and #{diff.sequenceB}
            </p>
          </div>
        )}
      </div>

      {/* Events Between (collapsed by default) */}
      {diff.eventsBetween.length > 0 && (
        <details className="border-t border-border-theme-subtle/50">
          <summary className="px-4 py-3 cursor-pointer hover:bg-surface-raised/30 transition-colors text-sm text-text-theme-secondary">
            <span className="ml-2">
              View {diff.eventsBetween.length} event{diff.eventsBetween.length !== 1 ? 's' : ''} between these states
            </span>
          </summary>
          <div className="px-4 pb-4 max-h-64 overflow-y-auto">
            <div className="space-y-1">
              {diff.eventsBetween.map((event, index) => (
                <div 
                  key={event.id || index}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-surface-raised/30 text-xs font-mono"
                >
                  <code className="text-text-theme-muted">#{event.sequence}</code>
                  <Badge variant="slate" size="sm">{event.type}</Badge>
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
