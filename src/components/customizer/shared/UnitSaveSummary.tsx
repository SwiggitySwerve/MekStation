import React from 'react';

import { BrowserDraftStatus } from './BrowserDraftStatus';
import { UnitSaveStatus } from './UnitSaveStatus';

/** What a browser draft is and how it reaches the library, in plain words. */
export const SAVE_STATE_EXPLANATION =
  'Your changes are kept in this browser. Use Save to add the unit to your library or update its library copy.';

/**
 * One secondary line pairing the browser draft with the library receipt, e.g.
 * "Draft saved in browser · not in library". The tooltip explains the
 * difference; each part keeps its full wording in its accessible text.
 */
export function UnitSaveSummary({
  unitId,
  className = '',
}: {
  unitId: string;
  className?: string;
}): React.ReactElement {
  return (
    <span
      data-testid="unit-save-summary"
      title={SAVE_STATE_EXPLANATION}
      className={`text-text-theme-secondary inline-flex min-w-0 items-center gap-1 text-[13px] leading-5 ${className}`}
    >
      <BrowserDraftStatus unitId={unitId} compact />
      <span aria-hidden="true">{'\u00b7'}</span>
      <UnitSaveStatus unitId={unitId} compact />
    </span>
  );
}

/** Full-sentence save state for a details panel. */
export function UnitSaveDetails({
  unitId,
}: {
  unitId: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-text-theme-secondary text-[11px] font-semibold tracking-wider uppercase">
        Saving
      </span>
      <BrowserDraftStatus unitId={unitId} />
      <UnitSaveStatus unitId={unitId} />
      <span className="text-text-theme-secondary text-xs">
        {SAVE_STATE_EXPLANATION}
      </span>
    </div>
  );
}
