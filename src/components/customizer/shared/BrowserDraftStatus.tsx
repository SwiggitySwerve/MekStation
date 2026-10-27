import React, { useEffect, useState } from 'react';

import { getUnitStore } from '@/stores/unitStoreRegistry';
import {
  getLatestStorageWriteReceipt,
  safeGetItem,
  subscribeToStorageWriteReceipts,
} from '@/stores/utils/clientSafeStorage';

export type DraftState = 'pending' | 'saved' | 'failed';

/**
 * Browser-draft wording. A pending unit has no known stored draft, so surfaces
 * that pair it with the library state leave it out rather than imply the
 * unit is saved.
 */
export const DRAFT_LABEL: Record<DraftState, string> = {
  pending: 'No browser draft yet',
  saved: 'Draft saved in this browser',
  failed: 'Draft save failed in this browser',
};

/** Short wording for bands that pair the draft with the library state. */
export const DRAFT_SHORT_LABEL: Record<DraftState, string> = {
  pending: 'No browser draft',
  saved: 'Draft saved in browser',
  failed: 'Browser draft not saved',
};

function draftStorageKey(unitId: string): string {
  return `megamek-unit-${unitId}`;
}

function receiptForUnit(
  unitId: string,
): { unitId: string; failed: boolean } | null {
  const latest = getLatestStorageWriteReceipt(draftStorageKey(unitId));
  if (latest) return { unitId, failed: latest.status === 'failed' };
  try {
    return safeGetItem(draftStorageKey(unitId)) !== null
      ? { unitId, failed: false }
      : null;
  } catch {
    // An unavailable read cannot establish that a draft was saved.
    return null;
  }
}

/** Existing browser drafts count as saved; newer write receipts take priority. */
export function useBrowserDraftState(unitId: string): DraftState {
  const [receipt, setReceipt] = useState<{
    unitId: string;
    failed: boolean;
  } | null>(null);

  useEffect(() => {
    setReceipt(receiptForUnit(unitId));
    return subscribeToStorageWriteReceipts((next) => {
      if (next.key === draftStorageKey(unitId)) {
        setReceipt({ unitId, failed: next.status === 'failed' });
      }
    });
  }, [unitId]);

  const current = receipt?.unitId === unitId ? receipt : null;
  if (current?.failed) return 'failed';
  return current ? 'saved' : 'pending';
}

/** Show only completed writes for the active draft, separately from library save. */
export function BrowserDraftStatus({
  unitId,
  compact = false,
  onlyWhenFailed = false,
  className = '',
}: {
  unitId: string;
  /** Short visible wording; the full wording stays in the accessible text. */
  compact?: boolean;
  /** Render nothing until a draft write fails (for bands without room). */
  onlyWhenFailed?: boolean;
  className?: string;
}): React.ReactElement | null {
  const state = useBrowserDraftState(unitId);
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
      {failed && getUnitStore(unitId) && compact && (
        <span aria-hidden="true">·</span>
      )}
      {failed && getUnitStore(unitId) && (
        <button
          type="button"
          aria-label="Retry browser draft"
          className="-ml-1 min-h-11 px-1 underline underline-offset-2"
          onClick={() => {
            try {
              getUnitStore(unitId)?.setState({});
            } catch {
              /* The failed write receipt keeps the error visible. */
            }
          }}
        >
          {compact ? 'Retry' : 'Retry browser draft'}
        </button>
      )}
    </span>
  );
}
