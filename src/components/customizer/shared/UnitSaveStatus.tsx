import React, { useCallback, useMemo, useSyncExternalStore } from 'react';

import type { SaveState } from '@/stores/unitSaveState';
import type { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getUnitSaveState } from '@/stores/unitSaveState';
import { getEditorSaveState } from '@/stores/unitSaveStateAdapters';

import {
  getLibrarySaveEditor,
  getLibrarySaveStore,
  subscribeToLibrarySaveState,
} from '../tabs/MultiUnitTabsUnitState';

export type LibraryState = SaveState['library']['state'];

export interface LibrarySaveState {
  state: LibraryState;
  version?: number;
}

const SAVED_OLDER_WRITER_MESSAGE =
  'Saved with an older version of MekStation. Save again to update the library copy.';

function unhandledLibraryState(state: never): never {
  throw new Error(`Unhandled library save state: ${String(state)}`);
}

/**
 * The one wording of the library state, used beside the Save button, on
 * phones and in the status panel: "Not in Library", "In Library v3" or
 * "Changed Since v3".
 */
export function librarySaveLabel(
  state: LibraryState,
  version?: number,
): string {
  switch (state) {
    case 'none':
      return 'Not in Library';
    case 'changed':
      return `Changed Since v${version}`;
    case 'matched':
      return `In Library v${version}`;
    case 'saved-older-writer':
      return SAVED_OLDER_WRITER_MESSAGE;
    case 'unknown':
      return 'Library status unknown';
    default:
      return unhandledLibraryState(state);
  }
}

/** Tooltip explaining a library state in a full sentence. */
export function librarySaveExplanation(
  state: LibraryState,
  version?: number,
): string {
  switch (state) {
    case 'none':
      return 'Not in Library: no library save has been recorded for this unit yet.';
    case 'changed':
      return `Changed Since v${version}: this unit has edits that are not in its last known library save (v${version}).`;
    case 'matched':
      return `In Library v${version}: this unit matches its last known library save. This is not a claim that v${version} is the server latest.`;
    case 'saved-older-writer':
      return SAVED_OLDER_WRITER_MESSAGE;
    case 'unknown':
      return 'Library status unknown. Save again to update the library copy.';
    default:
      return unhandledLibraryState(state);
  }
}

/** Saving can establish, update, or confirm the library copy in these states. */
export function libraryNeedsSave(state: LibraryState): boolean {
  switch (state) {
    case 'none':
    case 'changed':
    case 'saved-older-writer':
    case 'unknown':
      return true;
    case 'matched':
      return false;
    default:
      return unhandledLibraryState(state);
  }
}

const NO_SUBSCRIPTION = (): (() => void) => () => undefined;

/**
 * The draft's last known library save and whether the draft still matches
 * it. Snapshots are strings so unrelated store changes do not re-render.
 */
export function useLibrarySaveState(
  unitId: string,
  unitType?: UnitType,
): LibrarySaveState {
  const store = getLibrarySaveStore(unitId, unitType);
  const subscribe = useCallback(
    (onChange: () => void) =>
      store
        ? subscribeToLibrarySaveState(unitId, unitType, onChange)
        : () => undefined,
    [store, unitId, unitType],
  );
  const snapshot = useSyncExternalStore(
    store ? subscribe : NO_SUBSCRIPTION,
    () => {
      const state = store?.getState();
      const save = state?.librarySave;
      if (!state || !save) return 'none';
      let library: SaveState['library'];
      try {
        library = getEditorSaveState(getLibrarySaveEditor(state)).library;
      } catch {
        // Invalid intermediate native drafts cannot match a confirmed design.
        // Keep classification in the owner without asking a serializer to accept
        // incomplete editor input. Valid canonical fingerprints are JSON objects.
        library = getUnitSaveState(state, '', undefined).library;
      }
      return library.state === 'none'
        ? 'none'
        : `${library.state}:${library.receipt.version}`;
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
  unitType,
  compact = false,
}: {
  unitId: string;
  unitType?: UnitType;
  /** One-line secondary text for bands; panels show it as a heading line. */
  compact?: boolean;
}): React.ReactElement {
  const { state, version } = useLibrarySaveState(unitId, unitType);
  return (
    <LibraryStatusText state={state} version={version} compact={compact} />
  );
}
