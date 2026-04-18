/**
 * SPAList — flex-wrapped list of `<SPABadge>` pills.
 *
 * Used by:
 *   - `<PilotSection>` on the pilot-mech card (compact variant, no header)
 *   - The pilot detail page's read-only Special Abilities summary
 *     (expanded variant, optional header + grouping by category)
 *
 * Empty state: when the resolved badge count is zero, the list renders
 * nothing — no empty container, no "No abilities" line. Surfaces that
 * want an explicit empty message render their own.
 *
 * Resolution: each ability ref is resolved through the canonical catalog
 * via `getSPADefinition`. Unknown ids are dropped silently — same rule as
 * the badge itself, applied here so we can compute the empty-state
 * decision before mounting any DOM nodes.
 */

import React, { useMemo } from 'react';

import type { IPilotAbilityRef } from '@/types/pilot';
import type { ISPADefinition } from '@/types/spa/SPADefinition';

import { getSPADefinition } from '@/lib/spa';

import { SPABadge, type SPABadgeVariant } from './SPABadge';

// =============================================================================
// Props
// =============================================================================

/** Minimal ability shape the list can render — accepts both `IPilotAbilityRef`
 *  and a bare `{ abilityId }` so unit-card data (which only carries id strings)
 *  can pass an adapted array. */
export interface ISPAListEntry {
  readonly abilityId: string;
  readonly designation?: IPilotAbilityRef['designation'];
  readonly xpSpent?: number;
}

export interface SPAListProps {
  /** Owned-ability refs in display order. */
  abilities: readonly ISPAListEntry[];
  /** Variant forwarded to each badge. */
  variant?: SPABadgeVariant;
  /** When true (default), badges expose a hover/focus tooltip. */
  withTooltip?: boolean;
  /** When true, group badges under a category header instead of a flat row. */
  groupByCategory?: boolean;
  /** Wrapper class. */
  className?: string;
  /** ARIA label for the list container. */
  ariaLabel?: string;
}

// =============================================================================
// Helpers
// =============================================================================

interface ResolvedEntry {
  readonly entry: ISPAListEntry;
  readonly spa: ISPADefinition;
}

/**
 * Resolve every entry against the canonical catalog and drop unknowns.
 * Memoised by the caller so we don't re-compute on every parent render.
 */
function resolveEntries(
  abilities: readonly ISPAListEntry[],
): readonly ResolvedEntry[] {
  const out: ResolvedEntry[] = [];
  for (const entry of abilities) {
    const spa = getSPADefinition(entry.abilityId);
    if (spa) out.push({ entry, spa });
  }
  return out;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Render the list. When `groupByCategory` is set we emit a small header
 * per category (mirrors the pilot sheet spec); otherwise it's a flat
 * wrap-friendly row used by the unit card.
 */
export function SPAList({
  abilities,
  variant = 'compact',
  withTooltip = true,
  groupByCategory = false,
  className = '',
  ariaLabel = 'Special Pilot Abilities',
}: SPAListProps): React.ReactElement | null {
  // Resolution is the hot path — memoise on the abilities reference so
  // the unit card's render loop doesn't repeat catalog lookups.
  const resolved = useMemo(() => resolveEntries(abilities), [abilities]);

  if (resolved.length === 0) return null;

  if (!groupByCategory) {
    return (
      <ul
        aria-label={ariaLabel}
        className={`flex flex-wrap items-center gap-1.5 ${className}`}
      >
        {resolved.map(({ entry }) => (
          <li key={entry.abilityId}>
            <SPABadge
              spaId={entry.abilityId}
              designation={entry.designation}
              xpSpent={entry.xpSpent}
              variant={variant}
              withTooltip={withTooltip}
            />
          </li>
        ))}
      </ul>
    );
  }

  // Grouped layout — bucket by category in catalog order so the pilot
  // sheet renders Gunnery → Piloting → Defensive → ... consistently.
  const grouped = new Map<string, ResolvedEntry[]>();
  for (const r of resolved) {
    const bucket = grouped.get(r.spa.category) ?? [];
    bucket.push(r);
    grouped.set(r.spa.category, bucket);
  }

  return (
    <div aria-label={ariaLabel} className={`flex flex-col gap-3 ${className}`}>
      {Array.from(grouped.entries()).map(([category, entries]) => (
        <section key={category} aria-label={`${category} abilities`}>
          <h4 className="text-text-theme-muted mb-1.5 text-xs font-semibold tracking-wider uppercase">
            {category}
          </h4>
          <ul className="flex flex-wrap items-center gap-1.5">
            {entries.map(({ entry }) => (
              <li key={entry.abilityId}>
                <SPABadge
                  spaId={entry.abilityId}
                  designation={entry.designation}
                  xpSpent={entry.xpSpent}
                  variant={variant}
                  withTooltip={withTooltip}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export default SPAList;
