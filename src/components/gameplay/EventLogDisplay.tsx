/**
 * Event Log Display Component
 * Shows chronological game events with filtering.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';

import type { IEventLogFilter, IGameEvent } from '@/types/gameplay';

import { AppIcon } from '@/components/ui/AppIcon';

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
  /**
   * Called when the player clicks an event row to focus the map on the
   * relevant unit or hex.
   *
   * @param eventId - stable id of the clicked event
   * @param unitId  - unit id from the event payload, if present
   *
   * @spec openspec/changes/add-tactical-map-lenses-feed-replay/specs/tactical-map-interface/spec.md
   *   "Feed row focuses event participants" scenario
   */
  onRowFocus?: (eventId: string, unitId?: string) => void;
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
  onRowFocus,
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
    const formatted = filtered.map((e) =>
      formatEvent(e, weaponLookup, actorLookup),
    );
    const grouped = annotateGroupedEvents(filtered, formatted);
    return [...grouped].reverse();
  }, [events, filter, weaponLookup, actorLookup]);

  return (
    <div
      className={`border-border-theme-subtle bg-surface-base border-t ${className}`}
      data-testid="event-log"
    >
      <button
        type="button"
        onClick={toggleCollapse}
        className="bg-surface-base hover:bg-surface-base flex w-full items-center justify-between px-4 py-2 transition-colors"
        data-testid="event-log-toggle"
      >
        <span className="text-sm font-medium" data-testid="event-log-count">
          Event Log ({events.length})
        </span>
        <AppIcon
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size="inline"
          aria-hidden="true"
        />
      </button>

      {!isCollapsed && (
        <div
          className="border-border-theme-subtle overflow-y-auto border-t"
          style={{ maxHeight }}
          data-testid="event-log-content"
        >
          {formattedEvents.length === 0 ? (
            <div
              className="text-text-theme-muted p-4 text-center text-sm"
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
                onRowFocus={onRowFocus}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default EventLogDisplay;
