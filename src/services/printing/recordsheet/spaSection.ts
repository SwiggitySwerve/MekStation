/**
 * Record-sheet SPA section helper.
 *
 * Pure data shape used by the SVG renderer to lay out the printable
 * "Special Abilities" block in the pilot area. Decoupled from any DOM
 * concerns so it stays testable in node + reusable across print/preview.
 *
 * Empty-case contract: when the pilot has zero resolvable abilities the
 * helper returns `{ entries: [], hasContent: false }` so the renderer
 * skips the block entirely (no header, no overflow).
 */

import type { IPilotAbilityRef } from '@/types/pilot';

import { formatSPALine } from '@/components/spa/formatDesignation';
import { getSPADefinition } from '@/lib/spa';

// =============================================================================
// Types
// =============================================================================

/**
 * One printable line for the Special Abilities block. `truncatedDescription`
 * is sized to fit a single SVG row at the section's font scale — Wave 3
 * MVP uses ~60 chars before ellipsis, which keeps the line under the
 * pilot panel width on Letter/A4.
 */
export interface ISPASectionEntry {
  readonly abilityId: string;
  readonly displayName: string;
  /** Catalog category — used by the renderer to pick an accent. */
  readonly category: string;
  /** Pre-formatted "displayName (designation)" line. */
  readonly headline: string;
  /** Trimmed description, max ~60 chars + ellipsis. */
  readonly truncatedDescription: string;
  /** XP cost / refund — present for purchasable SPAs. */
  readonly xpSpent?: number;
}

export interface ISPASectionData {
  /** Lines to print. Empty → renderer skips the block. */
  readonly entries: readonly ISPASectionEntry[];
  /** Convenience flag mirroring `entries.length > 0`. */
  readonly hasContent: boolean;
}

// =============================================================================
// Constants
// =============================================================================

/** Max printable description chars per line (single-line truncation). */
const MAX_DESCRIPTION_CHARS = 60;

/**
 * Hard cap on entries rendered in the printable block. The pilot panel
 * can fit roughly 6 lines before bleeding into the equipment table —
 * extra entries are abbreviated with a `+N more` footer in the renderer.
 */
export const MAX_PRINTABLE_SPA_ENTRIES = 6;

// =============================================================================
// Pure helpers
// =============================================================================

/**
 * Truncate `text` to `MAX_DESCRIPTION_CHARS` with an ellipsis. Returns
 * the original string when it already fits.
 */
function truncate(text: string): string {
  if (text.length <= MAX_DESCRIPTION_CHARS) return text;
  return text.slice(0, MAX_DESCRIPTION_CHARS - 1).trimEnd() + '\u2026';
}

/**
 * Build the printable SPA block from the pilot's ability refs. Unknown
 * ids are dropped silently (same rule as the badge/list components).
 *
 * Sort order: catalog category first (alphabetical), then displayName
 * within a category — produces a deterministic block that matches the
 * pilot detail page's grouped-by-category layout.
 */
export function buildSPASection(
  abilities: readonly IPilotAbilityRef[] | null | undefined,
): ISPASectionData {
  const refs = abilities ?? [];
  const resolved: ISPASectionEntry[] = [];

  for (const ref of refs) {
    const spa = getSPADefinition(ref.abilityId);
    if (!spa) continue; // Defensive — see helper-skip rule above.

    resolved.push({
      abilityId: ref.abilityId,
      displayName: spa.displayName,
      category: spa.category,
      headline: formatSPALine(spa.displayName, ref.designation ?? null),
      truncatedDescription: truncate(spa.description),
      xpSpent: ref.xpSpent,
    });
  }

  // Stable sort: category, then displayName.
  resolved.sort((a, b) => {
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.displayName.localeCompare(b.displayName);
  });

  return {
    entries: resolved,
    hasContent: resolved.length > 0,
  };
}
