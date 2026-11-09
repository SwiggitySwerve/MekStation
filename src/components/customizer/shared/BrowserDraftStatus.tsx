import React, { useEffect, useState } from 'react';

import type { SaveState } from '@/stores/unitSaveState';

import {
  getLatestStorageWriteReceipt,
  safeGetItem,
  subscribeToStorageWriteReceipts,
} from '@/stores/utils/clientSafeStorage';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getLibrarySaveStore } from '../tabs/MultiUnitTabsUnitState';
import { getCustomizerDraftStorageKey } from './customizerDraftStorage';

export type DraftState = SaveState['draft'];

/**
 * Browser-draft wording. A pending unit has no known stored draft, so surfaces
 * that pair it with the library state leave it out rather than imply the
 * unit is saved.
 */
export const DRAFT_LABEL: Record<DraftState, string> = {
  pending: 'No browser draft yet',
  saved: 'Draft saved in browser',
  failed: 'Draft save failed in browser',
};

/**
 * Short wording for bands that pair the draft with the library state. The
 * header and the status panel both say "Draft Saved"; the panel's sentence
 * under it says the draft is kept in this browser.
 */
export const DRAFT_SHORT_LABEL: Record<DraftState, string> = {
  pending: 'No Browser Draft',
  saved: 'Draft Saved',
  failed: 'Browser Draft Not Saved',
};

function receiptForUnit(
  storageKey: string,
): { storageKey: string; failed: boolean } | null {
  const latest = getLatestStorageWriteReceipt(storageKey);
  if (latest) return { storageKey, failed: latest.status === 'failed' };
  try {
    return safeGetItem(storageKey) !== null
      ? { storageKey, failed: false }
      : null;
  } catch {
    // An unavailable read cannot establish that a draft was saved.
    return null;
  }
}

/** Existing browser drafts count as saved; newer write receipts take priority. */
export function useBrowserDraftState(
  unitId: string,
  unitType: UnitType = UnitType.BATTLEMECH,
): DraftState {
  const storageKey = getCustomizerDraftStorageKey({ unitId, unitType });
  const [receipt, setReceipt] = useState<{
    storageKey: string;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    setReceipt(receiptForUnit(storageKey));
    return subscribeToStorageWriteReceipts((next) => {
      if (next.key === storageKey) {
        setReceipt({ storageKey, failed: next.status === 'failed' });
      }
    });
  }, [storageKey]);

  const current = receipt?.storageKey === storageKey ? receipt : null;
  if (current?.failed) return 'failed';
  return current ? 'saved' : 'pending';
}

/** How long the header's "Draft Saved" stays emphasised after a write. */
export const DRAFT_SAVE_PULSE_MS = 1500;

/**
 * True for a moment after a draft write for this unit succeeds, so the header
 * save state can confirm each automatic save in place of a toast.
 */
export function useDraftSavePulse(
  unitId: string,
  unitType: UnitType = UnitType.BATTLEMECH,
): boolean {
  const storageKey = getCustomizerDraftStorageKey({ unitId, unitType });
  const [pulseStorageKey, setPulseStorageKey] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsubscribe = subscribeToStorageWriteReceipts((next) => {
      if (next.key !== storageKey || next.status === 'failed') return;
      setPulseStorageKey(storageKey);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setPulseStorageKey(null), DRAFT_SAVE_PULSE_MS);
    });
    return () => {
      unsubscribe();
      if (timer) clearTimeout(timer);
      // A pulse cut short by a unit switch must not be left on for later.
      setPulseStorageKey(null);
    };
  }, [storageKey]);

  return pulseStorageKey === storageKey;
}

/** Show only completed writes for the active draft, separately from library save. */
export function BrowserDraftStatus({
  unitId,
  unitType = UnitType.BATTLEMECH,
  compact = false,
  onlyWhenFailed = false,
  className = '',
}: {
  unitId: string;
  unitType?: UnitType;
  /** Short visible wording; the full wording stays in the accessible text. */
  compact?: boolean;
  /** Render nothing until a draft write fails (for bands without room). */
  onlyWhenFailed?: boolean;
  className?: string;
}): React.ReactElement | null {
  const state = useBrowserDraftState(unitId, unitType);
  const draftStore = getLibrarySaveStore(unitId, unitType);
  const failed = state === 'failed';
  if (onlyWhenFailed && !failed) return null;
  const label = DRAFT_LABEL[state];
  return (
    <span
      role="status"
      aria-live={failed ? 'polite' : 'off'}
      data-state={state}
      className={`inline-flex min-w-0 items-center gap-1 ${compact ? 'whitespace-nowrap' : 'flex-wrap text-xs'} ${failed ? 'font-semibold text-red-400' : 'text-text-theme-secondary'} ${className}`}
      // Compact parts share their band's tooltip; a failure keeps its own.
      title={
        compact && !failed
          ? undefined
          : `${label}. Browser drafts are separate from units saved to your library.`
      }
    >
      {compact ? (
        <>
          <span aria-hidden="true">{DRAFT_SHORT_LABEL[state]}</span>
          <span className="sr-only">{label}</span>
        </>
      ) : (
        <span data-status-label>{label}</span>
      )}
      {failed && draftStore && compact && <span aria-hidden="true">·</span>}
      {failed && draftStore && (
        <button
          type="button"
          aria-label="Retry Browser Draft"
          className="-ml-1 min-h-11 px-1 underline underline-offset-2"
          onClick={() => {
            try {
              draftStore.setState({});
            } catch {
              /* The failed write receipt keeps the error visible. */
            }
          }}
        >
          {compact ? 'Retry' : 'Retry Browser Draft'}
        </button>
      )}
    </span>
  );
}
