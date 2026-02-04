import React, { memo, useCallback } from 'react';
import { List } from 'react-window';
import type { IBattleEvent } from '@/components/simulation-viewer/pages/EncounterHistory';
import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

/* ========================================================================== */
/*  Types                                                                      */
/* ========================================================================== */

/**
 * Props for the VirtualizedTimeline component.
 * Uses react-window List for efficient rendering of 1000+ events.
 */
export interface IVirtualizedTimelineProps {
  /** Array of battle events to display */
  readonly events: readonly IBattleEvent[];
  /** Container height in pixels */
  readonly height?: number;
  /** Height of each row in pixels */
  readonly itemHeight?: number;
  /** Callback when an event is clicked */
  readonly onEventClick?: (event: IBattleEvent) => void;
  /** Function to resolve unit IDs to display names */
  readonly resolveUnitName?: (unitId: string) => string;
}

/* ========================================================================== */
/*  Constants                                                                  */
/* ========================================================================== */

const EVENT_TYPE_ICONS: Record<string, string> = {
  movement: '🚶',
  attack: '⚔',
  damage: '💥',
  'status-change': '⚡',
};

const DEFAULT_HEIGHT = 384; // matches max-h-96
const DEFAULT_ITEM_HEIGHT = 52;

/* ========================================================================== */
/*  Row Component                                                              */
/* ========================================================================== */

interface ITimelineRowProps {
  events: readonly IBattleEvent[];
  onEventClick?: (event: IBattleEvent) => void;
  resolveUnitName?: (unitId: string) => string;
}

const TimelineRow = ({
  index,
  style,
  events,
  onEventClick,
  resolveUnitName,
}: {
  index: number;
  style: React.CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
} & ITimelineRowProps): React.ReactElement | null => {
  const event = events[index];
  if (!event) return null;

  const icon = EVENT_TYPE_ICONS[event.type] ?? '📋';
  const unitNames = resolveUnitName
    ? event.involvedUnits.map(resolveUnitName).join(', ')
    : event.involvedUnits.join(', ');

  return (
    <div
      style={style}
      className={`border-b border-gray-200 dark:border-gray-700 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${onEventClick ? `cursor-pointer ${FOCUS_RING_CLASSES}` : ''}`}
      onClick={() => onEventClick?.(event)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onEventClick) {
          e.preventDefault();
          onEventClick(event);
        }
      }}
      role={onEventClick ? 'button' : undefined}
      tabIndex={onEventClick ? 0 : undefined}
      aria-label={`Turn ${event.turn}, ${event.phase}: ${event.description}`}
      data-testid={`virtualized-event-${event.id}`}
    >
      <div className="flex items-center gap-3 h-full">
        <span className="text-base flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 whitespace-nowrap w-14 flex-shrink-0">
          Turn {event.turn}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap w-16 flex-shrink-0">
          {event.phase}
        </span>
        <span className="text-sm text-gray-800 dark:text-gray-200 truncate flex-1">
          {event.description}
        </span>
        {unitNames && (
          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-auto flex-shrink-0 max-w-32 truncate">
            {unitNames}
          </span>
        )}
      </div>
    </div>
  );
};

/* ========================================================================== */
/*  Component                                                                  */
/* ========================================================================== */

/**
 * Virtualized event timeline using react-window.
 * Efficiently renders 1000+ events by only mounting visible rows.
 */
export const VirtualizedTimeline = memo<IVirtualizedTimelineProps>(
  ({ events, height = DEFAULT_HEIGHT, itemHeight = DEFAULT_ITEM_HEIGHT, onEventClick, resolveUnitName }) => {
    const rowProps = useCallback(
      () => ({ events, onEventClick, resolveUnitName }),
      [events, onEventClick, resolveUnitName],
    );

    if (events.length === 0) {
      return (
        <p
          className="text-gray-500 dark:text-gray-400 text-sm italic text-center py-8"
          data-testid="virtualized-timeline-empty"
        >
          No events recorded.
        </p>
      );
    }

    return (
      <div
        data-testid="virtualized-timeline"
        className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800"
      >
        <List
          rowComponent={TimelineRow}
          rowCount={events.length}
          rowHeight={itemHeight}
          rowProps={rowProps()}
          style={{ height }}
          overscanCount={5}
        />
      </div>
    );
  },
);

VirtualizedTimeline.displayName = 'VirtualizedTimeline';
