/**
 * QuickSimResultPanel — full result display for a Quick Resolve batch.
 *
 * Renders the four sections from the spec:
 *   1. "Most Likely Outcome" headline + win-probability stacked bar
 *   2. Turn-count histogram with mean/median/p25-p75/p90 overlays
 *   3. Casualty breakdown — two columns (Player / Opponent) with
 *      mech-destroyed and heat-shutdown frequencies, plus per-unit
 *      survival rows sorted descending by survival rate
 *   4. Collapsible "Raw Data" block with totalRuns, erroredRuns,
 *      baseSeed, and a "Copy seed" button
 *
 * Optional `partial` flag renders a "Partial results (cancelled)"
 * banner above the headline. Optional `onRerun` adds a rerun button to
 * the header. Optional `unitMeta` enriches the per-unit survival rows
 * with human designations and side ownership; without it the rows fall
 * back to the unit id and merge under "Player" by default.
 *
 * @spec openspec/changes/add-quick-sim-result-display/specs/tactical-map-interface/spec.md
 */
import React, { useCallback, useState } from 'react';

import type { IBatchResult } from '@/simulation/batchOutcome';

// =============================================================================
// Raw data section
// =============================================================================

interface RawDataSectionProps {
  result: IBatchResult;
}

function RawDataSection({ result }: RawDataSectionProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    const seed = String(result.baseSeed);
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(seed).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  }, [result.baseSeed]);

  return (
    <details
      className="border-border-theme bg-surface-deep/30 rounded-md border"
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      data-testid="raw-data-section"
    >
      <summary className="text-text-theme-primary cursor-pointer px-4 py-2 text-sm font-semibold">
        Raw Data
      </summary>
      <div className="text-text-theme-secondary grid grid-cols-1 gap-3 px-4 py-3 text-xs sm:grid-cols-3">
        <div>
          <div className="text-text-theme-muted">Total runs</div>
          <div className="text-text-theme-primary text-base font-semibold">
            {result.totalRuns}
          </div>
        </div>
        <div>
          <div className="text-text-theme-muted">Errored runs</div>
          <div className="text-text-theme-primary text-base font-semibold">
            {result.erroredRuns}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-text-theme-muted">Base seed</span>
          <div className="flex items-center gap-2">
            <code className="bg-surface-base text-text-theme-primary rounded px-2 py-0.5 font-mono text-sm">
              {result.baseSeed}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="border-border-theme text-text-theme-primary hover:bg-surface-raised rounded border px-2 py-0.5 text-xs"
              data-testid="copy-seed-btn"
            >
              {copied ? 'Copied' : 'Copy seed'}
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}

export { RawDataSection };
