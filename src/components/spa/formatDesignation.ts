/**
 * formatDesignation — render a typed `ISPADesignation` as the human-readable
 * suffix shown next to the SPA's display name (e.g. "Weapon Specialist
 * (Medium Laser)", "Range Master (Long)").
 *
 * Wave 2b stores the full `displayLabel` on every variant, so the formatter
 * is a thin accessor today. Centralising it lets future renames (e.g.
 * "Long" -> "Long Range") happen in one place.
 */

import type { ISPADesignation } from '@/types/pilot/SPADesignation';

/**
 * Return the parenthesised designation suffix WITHOUT parentheses, or
 * `null` when no designation is present. Callers add their own punctuation
 * so badges and the record sheet can format consistently.
 */
export function formatDesignation(
  designation: ISPADesignation | null | undefined,
): string | null {
  if (!designation) return null;
  const label = designation.displayLabel.trim();
  if (label.length === 0) return null;
  return label;
}

/**
 * Compose a full `displayName (designation)` line. Returns just the
 * displayName when no designation applies.
 */
export function formatSPALine(
  displayName: string,
  designation: ISPADesignation | null | undefined,
): string {
  const suffix = formatDesignation(designation);
  return suffix ? `${displayName} (${suffix})` : displayName;
}
