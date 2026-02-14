import React, { memo, useCallback } from 'react';
import { List } from 'react-window';

import type { IViolation } from '@/types/simulation-viewer/IViolation';

import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

export interface IVirtualizedViolationLogProps {
  readonly violations: readonly IViolation[];
  readonly height?: number;
  readonly itemHeight?: number;
  readonly onViolationClick?: (violation: IViolation) => void;
  readonly onViewBattle?: (battleId: string) => void;
}

/* ========================================================================== */
/*  Constants                                                                  */
/* ========================================================================== */

type Severity = 'critical' | 'warning' | 'info';

const SEVERITY_BADGE_CLASSES: Record<Severity, string> = {
  critical: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-sky-500 text-white',
};

const DEFAULT_HEIGHT = 480;
const DEFAULT_ITEM_HEIGHT = 56;

/* ========================================================================== */
/*  Row Component                                                              */
/* ========================================================================== */

interface IViolationRowProps {
  violations: readonly IViolation[];
  onViolationClick?: (violation: IViolation) => void;
  onViewBattle?: (battleId: string) => void;
}

function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const ViolationRow = ({
  index,
  style,
  violations,
  onViolationClick,
  onViewBattle,
}: {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
} & IViolationRowProps): React.ReactElement | null => {
  const violation = violations[index];
  if (!violation) return null;

  const severityClass =
    SEVERITY_BADGE_CLASSES[violation.severity as Severity] ??
    SEVERITY_BADGE_CLASSES.info;

  return (
    <div
      style={style}
      className={`border-b border-gray-200 px-4 py-2 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800 ${onViolationClick ? `cursor-pointer ${FOCUS_RING_CLASSES}` : ''}`}
      onClick={() => onViolationClick?.(violation)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onViolationClick) {
          e.preventDefault();
          onViolationClick(violation);
        }
      }}
      role={onViolationClick ? 'button' : undefined}
      tabIndex={onViolationClick ? 0 : undefined}
      aria-label={`${violation.severity} violation: ${violation.message}`}
      data-testid={`virtualized-violation-${violation.id}`}
    >
      <div className="flex h-full items-center gap-3">
        <span
          className={`flex-shrink-0 rounded px-2 py-0.5 text-xs font-bold uppercase ${severityClass}`}
          data-testid="violation-severity-badge"
        >
          {violation.severity}
        </span>
        <span className="w-28 flex-shrink-0 text-xs whitespace-nowrap text-gray-500 dark:text-gray-400">
          {formatTimestamp(violation.timestamp)}
        </span>
        <span className="w-24 flex-shrink-0 truncate text-xs font-medium whitespace-nowrap text-gray-600 dark:text-gray-300">
          {violation.type}
        </span>
        <span className="flex-1 truncate text-sm text-gray-800 dark:text-gray-200">
          {violation.message}
        </span>
        {onViewBattle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewBattle(violation.battleId);
            }}
            className={`flex-shrink-0 rounded px-2 py-1 text-xs whitespace-nowrap text-blue-600 hover:underline dark:text-blue-400 ${FOCUS_RING_CLASSES}`}
            aria-label={`View battle ${violation.battleId}`}
            data-testid="violation-view-battle"
          >
            View Battle
          </button>
        )}
      </div>
    </div>
  );
};

/* ========================================================================== */
/*  Component                                                                  */
/* ========================================================================== */

export const VirtualizedViolationLog = memo<IVirtualizedViolationLogProps>(
  ({
    violations,
    height = DEFAULT_HEIGHT,
    itemHeight = DEFAULT_ITEM_HEIGHT,
    onViolationClick,
    onViewBattle,
  }) => {
    const rowProps = useCallback(
      () => ({ violations, onViolationClick, onViewBattle }),
      [violations, onViolationClick, onViewBattle],
    );

    if (violations.length === 0) {
      return (
        <p
          className="py-8 text-center text-sm text-gray-500 italic dark:text-gray-400"
          data-testid="virtualized-violation-log-empty"
        >
          No violations match the current filters.
        </p>
      );
    }

    return (
      <div
        data-testid="virtualized-violation-log"
        className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
      >
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-100 px-4 py-2 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
          <span className="w-16 flex-shrink-0">Severity</span>
          <span className="w-28 flex-shrink-0">Timestamp</span>
          <span className="w-24 flex-shrink-0">Type</span>
          <span className="flex-1">Message</span>
          {onViewBattle && (
            <span className="w-20 flex-shrink-0 text-right">Actions</span>
          )}
        </div>
        <List
          rowComponent={ViolationRow}
          rowCount={violations.length}
          rowHeight={itemHeight}
          rowProps={rowProps()}
          style={{ height }}
          overscanCount={5}
        />
      </div>
    );
  },
);

VirtualizedViolationLog.displayName = 'VirtualizedViolationLog';
