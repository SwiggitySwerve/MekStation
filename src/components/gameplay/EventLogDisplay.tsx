/**
 * Event Log Display Component
 * Shows chronological game events with filtering.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';

import type { IEventLogFilter, IGameEvent } from '@/types/gameplay';

import {
  annotateGroupedEvents,
  filterEvents,
  formatEvent,
  type IFormattedEventWithGrouping,
} from './EventLogDisplay.helpers';
import { EventRow } from './EventLogDisplayRow';

export interface EventLogDisplayProps {
  /** All game events */
  events: readonly IGameEvent[];
  /** Current filter settings */
  filter?: IEventLogFilter;
  /** Callback when filter changes */
  onFilterChange?: (filter: IEventLogFilter) => void;
  /** Is log collapsed? */
  collapsed?: boolean;
  /** Callback when collapse state changes */
  onCollapsedChange?: (collapsed: boolean) => void;
  /** Maximum height in pixels (for scrolling) */
  maxHeight?: number;
  /**
   * Per `add-interactive-combat-core-ui` § 11.3: map of unit id →
   * short designation (e.g., "ATL-7K") so each event row can render
   * the acting unit's designation inline instead of an opaque id.
   * Optional — when omitted rows fall back to the raw unit id, and
   * events without a unit id render only phase + summary.
   */
  actorLookup?: Record<string, string>;
  /**
   * Per `add-attack-phase-ui` task 8.1: map of weapon id → display
   * name so AttackResolved rows can read "Medium Laser HIT ..." rather
   * than rely on the raw `weaponId`. Missing entries fall back to the
   * raw id so the row never blanks.
   */
  weaponLookup?: Record<string, string>;
  /** Optional className for styling */
  className?: string;
}

/**
 * Event log display with filtering and collapse.
 */
export function EventLogDisplay({
  events,
  filter = {},
  onFilterChange: _onFilterChange,
  collapsed = false,
  onCollapsedChange,
  maxHeight = 200,
  actorLookup,
  weaponLookup,
  className = '',
}: EventLogDisplayProps): React.ReactElement {
  const [localCollapsed, setLocalCollapsed] = useState(collapsed);
  const isCollapsed = onCollapsedChange ? collapsed : localCollapsed;

  const toggleCollapse = useCallback(() => {
    if (onCollapsedChange) {
      onCollapsedChange(!isCollapsed);
    } else {
      setLocalCollapsed(!isCollapsed);
    }
  }, [isCollapsed, onCollapsedChange]);

  // Filter and format events. We annotate BEFORE reversing so the
  // grouping walk sees events oldest-first, then reverse for display.
  const formattedEvents = useMemo<
    readonly IFormattedEventWithGrouping[]
  >(() => {
    const filtered = filterEvents(events, filter);
    const formatted = filtered.map((e) => formatEvent(e, weaponLookup));
    const grouped = annotateGroupedEvents(filtered, formatted);
    return [...grouped].reverse();
  }, [events, filter, weaponLookup]);

  return (
    <div
      className={`border-t border-gray-300 bg-white ${className}`}
      data-testid="event-log"
    >
      <button
        type="button"
        onClick={toggleCollapse}
        className="flex w-full items-center justify-between bg-gray-50 px-4 py-2 transition-colors hover:bg-gray-100"
        data-testid="event-log-toggle"
      >
        <span className="text-sm font-medium" data-testid="event-log-count">
          Event Log ({events.length})
        </span>
        <span className="text-gray-500">{isCollapsed ? '▼' : '▲'}</span>
      </button>

      {!isCollapsed && (
        <div
          className="overflow-y-auto border-t border-gray-200"
          style={{ maxHeight }}
          data-testid="event-log-content"
        >
          {formattedEvents.length === 0 ? (
            <div
              className="p-4 text-center text-sm text-gray-500"
              data-testid="event-log-empty"
            >
              No events yet
            </div>
          ) : (
            formattedEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                actorLookup={actorLookup}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default EventLogDisplay;
