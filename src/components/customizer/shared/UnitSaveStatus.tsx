import React, { useCallback, useMemo, useSyncExternalStore } from 'react';

import { getUnitLibraryFingerprint } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';

export type LibraryState = 'none' | 'changed' | 'matched';

export interface LibrarySaveState {
  state: LibraryState;
  version?: number;
}

/**
 * The one wording of the library state, used beside the Save button, on
 * phones and in the status panel: "Not in library", "In library v3" or
 * "Changed since v3".
 */
export function librarySaveLabel(
  state: LibraryState,
  version?: number,
): string {
  if (state === 'none') return 'Not in library';
  return state === 'changed'
    ? `Changed since v${version}`
    : `In library v${version}`;
}

/** Tooltip explaining a library state in a full sentence. */
export function librarySaveExplanation(
  state: LibraryState,
  version?: number,
): string {
  if (state === 'none')
    return 'Not in library: no library save has been recorded for this unit yet.';
  return state === 'changed'
    ? `Changed since v${version}: this unit has edits that are not in its last known library save (v${version}).`
    : `In library v${version}: this unit matches its last known library save. This is not a claim that v${version} is the server latest.`;
}

/** Library states that call for a Save: never saved, or edited since. */
export function libraryNeedsSave(state: LibraryState): boolean {
  return state !== 'matched';
}

const NO_SUBSCRIPTION = (): (() => void) => () => undefined;

/**
 * The draft's last known library save and whether the draft still matches
 * it. Snapshots are strings so unrelated store changes do not re-render.
 */
export function useLibrarySaveState(unitId: string): LibrarySaveState {
  const store = getUnitStore(unitId);
  const subscribe = useCallback(
    (onChange: () => void) => store?.subscribe(onChange) ?? (() => undefined),
    [store],
  );
  const snapshot = useSyncExternalStore(
    store ? subscribe : NO_SUBSCRIPTION,
    () => {
      const state = store?.getState();
      const save = state?.librarySave;
      if (!state || !save) return 'none';
      const changed = getUnitLibraryFingerprint(state) !== save.fingerprint;
      return `${changed ? 'changed' : 'matched'}:${save.version}`;
    },
    () => 'none',
  );
  return useMemo(() => {
    if (snapshot === 'none') return { state: 'none' };
    const [state, version] = snapshot.split(':');
    return { state: state as LibraryState, version: Number(version) };
  }, [snapshot]);
}

function LibraryStatusText({
  state,
  version,
  compact,
}: {
  state: LibraryState;
  version?: number;
  compact: boolean;
}): React.ReactElement {
  return (
    <span
      role="status"
      aria-live="off"
      data-state={state}
      className={`inline-flex min-w-0 items-center ${compact ? 'text-text-theme-secondary whitespace-nowrap' : 'text-text-theme-primary text-sm font-medium'}`}
      title={librarySaveExplanation(state, version)}
    >
      <span data-status-label className="min-w-0 truncate">
        {librarySaveLabel(state, version)}
      </span>
    </span>
  );
}

/** Visible last-known library receipt, never an invented server-latest claim. */
export function UnitSaveStatus({
  unitId,
  compact = false,
}: {
  unitId: string;
  /** One-line secondary text for bands; panels show it as a heading line. */
  compact?: boolean;
}): React.ReactElement {
  const { state, version } = useLibrarySaveState(unitId);
  return (
    <LibraryStatusText state={state} version={version} compact={compact} />
  );
}
