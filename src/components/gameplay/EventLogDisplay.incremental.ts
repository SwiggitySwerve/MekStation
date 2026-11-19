import type {
  IEventLogFilter,
  IFormattedEvent,
  IGameEvent,
} from '@/types/gameplay';

import {
  annotateGroupedEvents,
  filterEvents,
  formatEvent,
  type IFormattedEventWithGrouping,
} from './EventLogDisplay.helpers';

type Lookup = Record<string, string> | undefined;

/**
 * One derivation of the event log rows, with the inputs it was built from.
 * Snapshots are never mutated: the append path builds a new one.
 */
export interface IEventLogDerivation {
  readonly events: readonly IGameEvent[];
  readonly filter: IEventLogFilter;
  readonly weaponLookup: Lookup;
  readonly actorLookup: Lookup;
  /** Events that pass the filter, oldest first. */
  readonly filtered: readonly IGameEvent[];
  /** `formatEvent` output for each entry of `filtered`. */
  readonly formatted: readonly IFormattedEvent[];
  /** Grouped and reversed (newest first), as the log shows them. */
  readonly rows: readonly IFormattedEventWithGrouping[];
}

/**
 * `formatEvent` reads a lookup only as `lookup[id]` (missing = `{}`), so two
 * lookups with the same keys and values format every event the same way.
 */
function sameLookup(a: Lookup, b: Lookup): boolean {
  if (a === b) {
    return true;
  }
  const left = a ?? {};
  const right = b ?? {};
  const keys = Object.keys(left);
  return (
    keys.length === Object.keys(right).length &&
    keys.every(
      (key) =>
        Object.prototype.hasOwnProperty.call(right, key) &&
        left[key] === right[key],
    )
  );
}

/** True when `next` is `previous` plus zero or more events on the end. */
function extendsByAppend(
  previous: readonly IGameEvent[],
  next: readonly IGameEvent[],
): boolean {
  if (next.length < previous.length) {
    return false;
  }
  for (let i = 0; i < previous.length; i++) {
    if (previous[i] !== next[i]) {
      return false;
    }
  }
  return true;
}

function build(
  events: readonly IGameEvent[],
  filter: IEventLogFilter,
  weaponLookup: Lookup,
  actorLookup: Lookup,
  filtered: readonly IGameEvent[],
  formatted: readonly IFormattedEvent[],
): IEventLogDerivation {
  // The grouping walk sees events oldest-first; reverse for display.
  const rows = [...annotateGroupedEvents(filtered, formatted)].reverse();
  return {
    events,
    filter,
    weaponLookup,
    actorLookup,
    filtered,
    formatted,
    rows,
  };
}

/**
 * Derives the log rows: filter, format, group, newest first. When `events`
 * only gained events on the end (same event objects in the same places) and
 * the filter and lookups are unchanged, only the new events are filtered and
 * formatted; the formatted entries of the events already seen are reused.
 * Anything else (a rewind, a correction or `setSession`, a replay seek, a
 * filter change, a changed unit or weapon name) re-derives every row.
 *
 * The cache key is complete: `formatEvent` depends only on the event object
 * and the two lookups (perf P2 review), and `filterEvents` keeps or drops each
 * event on its own, so filtering the new events alone gives the same list.
 */
export function deriveEventLogRows(
  previous: IEventLogDerivation | null,
  events: readonly IGameEvent[],
  filter: IEventLogFilter,
  weaponLookup: Lookup,
  actorLookup: Lookup,
): IEventLogDerivation {
  const format = (event: IGameEvent): IFormattedEvent =>
    formatEvent(event, weaponLookup, actorLookup);

  if (
    previous &&
    previous.filter === filter &&
    sameLookup(previous.weaponLookup, weaponLookup) &&
    sameLookup(previous.actorLookup, actorLookup) &&
    extendsByAppend(previous.events, events)
  ) {
    if (events.length === previous.events.length) {
      return previous;
    }
    const added = filterEvents(events.slice(previous.events.length), filter);
    return build(
      events,
      filter,
      weaponLookup,
      actorLookup,
      previous.filtered.concat(added),
      previous.formatted.concat(added.map(format)),
    );
  }

  const filtered = filterEvents(events, filter);
  return build(
    events,
    filter,
    weaponLookup,
    actorLookup,
    filtered,
    filtered.map(format),
  );
}
