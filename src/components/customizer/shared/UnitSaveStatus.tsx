import React from 'react';
import { useStore, type StoreApi } from 'zustand';

import type { UnitStore } from '@/stores/unitState';

import { getUnitLibraryFingerprint } from '@/stores/unit/unitEditSnapshot';
import { getUnitStore } from '@/stores/unitStoreRegistry';

type LibraryState = 'none' | 'changed' | 'matched';

function librarySaveLabel(state: LibraryState, version?: number): string {
  if (state === 'none') return 'Not saved to library';
  return state === 'changed'
    ? `Changes since library save v${version}`
    : `Saved to library \u00b7 v${version}`;
}

/** Short wording that reads after the draft state in one line. */
function librarySaveShortLabel(state: LibraryState, version?: number): string {
  if (state === 'none') return 'not in library';
  return state === 'changed'
    ? `changed since library v${version}`
    : `in library v${version}`;
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
  const label = librarySaveLabel(state, version);
  return (
    <span
      role="status"
      aria-live="off"
      data-state={state}
      className={`text-text-theme-secondary inline-flex min-w-0 items-center ${compact ? 'whitespace-nowrap' : 'text-xs'}`}
      title={
        compact
          ? undefined
          : state === 'none'
            ? 'Not saved to library. No library save has been recorded for this draft.'
            : `${label}. This is the last known library save for this draft, not a claim that it is the server latest.`
      }
    >
      {compact ? (
        <>
          <span aria-hidden="true" className="min-w-0 truncate">
            {librarySaveShortLabel(state, version)}
          </span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        <span data-status-label className="min-w-0">
          {label}
        </span>
      )}
    </span>
  );
}

function BoundUnitSaveStatus({
  store,
  compact,
}: {
  store: StoreApi<UnitStore>;
  compact: boolean;
}): React.ReactElement {
  const librarySave = useStore(store, (state) => state.librarySave);
  const isModified = useStore(store, (state) =>
    Boolean(
      state.librarySave &&
      getUnitLibraryFingerprint(state) !== state.librarySave.fingerprint,
    ),
  );
  return (
    <LibraryStatusText
      state={librarySave ? (isModified ? 'changed' : 'matched') : 'none'}
      version={librarySave?.version}
      compact={compact}
    />
  );
}

/** Visible last-known library receipt, never an invented server-latest claim. */
export function UnitSaveStatus({
  unitId,
  compact = false,
}: {
  unitId: string;
  /** Short visible wording; the full wording stays in the accessible text. */
  compact?: boolean;
}): React.ReactElement {
  const store = getUnitStore(unitId);
  if (!store) return <LibraryStatusText state="none" compact={compact} />;
  return <BoundUnitSaveStatus key={unitId} store={store} compact={compact} />;
}
