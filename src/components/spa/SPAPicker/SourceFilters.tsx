/**
 * SourceFilters — chip toggles for SPA `source` rulebooks.
 *
 * Each chip is a button with `aria-pressed` for accessibility. When no
 * source is active the picker shows ALL sources (i.e. the empty set
 * means "no filter", not "exclude everything").
 */

import React from 'react';

import type { SPASource } from '@/types/spa/SPADefinition';

interface SourceFiltersProps {
  /** Sources to render chips for, in display order. */
  sources: readonly SPASource[];
  /** Currently active source set — empty means "no filter / show all". */
  active: ReadonlySet<SPASource>;
  /** Toggle a single source on/off. */
  onToggle: (source: SPASource) => void;
}

/**
 * Render the chip row plus a "Clear" affordance when at least one chip
 * is active. Wave 2a may add a "All" toggle; for Wave 1 the empty set
 * is the canonical "show everything" state.
 */
export function SourceFilters({
  sources,
  active,
  onToggle,
}: SourceFiltersProps): React.ReactElement {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-text-theme-muted text-xs font-medium tracking-wide uppercase">
        Sources
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {sources.map((source) => {
          const isActive = active.has(source);
          return (
            <button
              key={source}
              type="button"
              aria-pressed={isActive}
              aria-label={`Toggle source filter: ${source}`}
              onClick={() => onToggle(source)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                isActive
                  ? 'border-accent/40 bg-accent/20 text-accent'
                  : 'border-border-theme-subtle bg-surface-raised text-text-theme-secondary hover:text-text-theme-primary'
              }`}
            >
              {source}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default SourceFilters;
