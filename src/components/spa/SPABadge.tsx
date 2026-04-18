/**
 * SPABadge — single SPA pill rendered on the pilot mech card, the pilot
 * detail page, and any other surface that lists a pilot's owned SPAs.
 *
 * The badge resolves the canonical SPA via `getSPADefinition()` so callers
 * only need to pass the `spaId`. When the id can't be resolved (legacy
 * alias drift) the badge renders nothing — keeping the unit card clean
 * rather than surfacing data-quality issues to the player.
 *
 * Designation rendering: when a typed designation is supplied, the badge
 * appends the human label (e.g. "Weapon Specialist (Medium Laser)")
 * via `formatDesignation`.
 *
 * Tooltip: the badge composes with `<SPATooltip>` when `withTooltip` is
 * true (default). The tooltip body shows the canonical description plus
 * a "Source: <rulebook>" footer, matching the spec's display contract.
 */

import React, { useMemo } from 'react';

import type { ISPADesignation } from '@/types/pilot/SPADesignation';

import {
  SPA_CATEGORY_COLORS,
  SPA_CATEGORY_LABELS,
} from '@/components/spa/SPAPicker';
import { getSPADefinition } from '@/lib/spa';

import { formatDesignation } from './formatDesignation';
import { SPATooltip } from './SPATooltip';

// =============================================================================
// Props
// =============================================================================

export type SPABadgeVariant = 'compact' | 'expanded';

export interface SPABadgeProps {
  /** Canonical (or legacy) SPA id; resolved via `getSPADefinition`. */
  spaId: string;
  /** Optional typed designation captured at purchase. */
  designation?: ISPADesignation | null;
  /** Optional XP cost label rendered alongside the displayName. */
  xpSpent?: number;
  /** `compact` = single-line pill (unit card); `expanded` = card with description (pilot sheet). */
  variant?: SPABadgeVariant;
  /** When true (default) hover/focus shows the SPATooltip overlay. */
  withTooltip?: boolean;
  /** Additional CSS classes appended to the root. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Render a single SPA badge. Returns `null` when the id can't be
 * resolved against the catalog so the parent's flex container collapses
 * the empty slot rather than showing "Unknown".
 */
export function SPABadge({
  spaId,
  designation,
  xpSpent,
  variant = 'compact',
  withTooltip = true,
  className = '',
}: SPABadgeProps): React.ReactElement | null {
  // Resolve once per render. The catalog is a frozen map so the lookup
  // is O(1); memoising guards against deep prop trees re-running the
  // function unnecessarily.
  const spa = useMemo(() => getSPADefinition(spaId), [spaId]);
  if (!spa) return null;

  const colorSlug = SPA_CATEGORY_COLORS[spa.category] ?? 'slate';
  const categoryLabel = SPA_CATEGORY_LABELS[spa.category] ?? spa.category;
  const designationLabel = formatDesignation(designation);

  // Compose the pill body. The category accent dot uses the same Tailwind
  // color slug as the SPAPicker for visual continuity.
  const pill = (
    <span
      data-testid={`spa-badge-${spa.id}`}
      data-category={spa.category}
      tabIndex={withTooltip ? 0 : -1}
      className={`border-border-theme-subtle bg-surface-raised/40 text-text-theme-primary focus:ring-accent/40 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium focus:ring-2 focus:outline-none ${className}`}
    >
      <span
        aria-label={`Category: ${categoryLabel}`}
        className={`inline-block h-1.5 w-1.5 rounded-full bg-${colorSlug}-400`}
      />
      <span>{spa.displayName}</span>
      {designationLabel && (
        <span className="text-text-theme-secondary">({designationLabel})</span>
      )}
      {xpSpent !== undefined && variant === 'expanded' && (
        <span className="text-text-theme-muted ml-1 tabular-nums">
          {xpSpent >= 0 ? `${xpSpent} XP` : `+${-xpSpent} XP`}
        </span>
      )}
    </span>
  );

  if (!withTooltip) return pill;

  // Tooltip body: description + source footer. Keep markup tiny — the
  // tooltip width is constrained at 16rem in <SPATooltip>.
  const tooltipBody = (
    <>
      <p className="text-text-theme-primary mb-2 font-semibold">
        {spa.displayName}
        {designationLabel && (
          <span className="text-text-theme-secondary ml-1 font-normal">
            ({designationLabel})
          </span>
        )}
      </p>
      <p className="text-text-theme-secondary mb-2 leading-snug">
        {spa.description}
      </p>
      <p className="text-text-theme-muted text-[10px] tracking-wide uppercase">
        Source: {spa.source}
        {xpSpent !== undefined && (
          <>
            {' '}
            · {xpSpent >= 0 ? `${xpSpent} XP spent` : `+${-xpSpent} XP granted`}
          </>
        )}
      </p>
    </>
  );

  return <SPATooltip content={tooltipBody}>{pill}</SPATooltip>;
}

export default SPABadge;
