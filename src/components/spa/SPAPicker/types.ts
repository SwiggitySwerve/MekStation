/**
 * SPAPicker — local types and constants.
 *
 * Wave 2b replaced the original stub `SPADesignation = { kind, value }`
 * with the canonical typed discriminated union `ISPADesignation` exported
 * from `@/types/pilot/SPADesignation`. The picker emits the typed
 * variant directly; downstream consumers (Wave 2a editor, Wave 2c
 * read-only sheet) keep the same prop signatures because we re-alias the
 * old type name here.
 *
 * Deprecation notes:
 *   - `STUB_DESIGNATION_OPTIONS` was removed; the live registry lives in
 *     `@/lib/spa/designation/getDesignationOptions.ts`.
 *   - `getDesignationOptions` is re-exported from this module pointing to
 *     the real registry so existing imports keep resolving.
 */

import type { ISPADesignation } from '@/types/pilot/SPADesignation';
import type { ISPADefinition, SPASource } from '@/types/spa/SPADefinition';

import { getDesignationOptions as getRealDesignationOptions } from '@/lib/spa/designation';

/**
 * Typed designation payload — the picker now emits the real
 * `ISPADesignation` variant declared in `@/types/pilot/SPADesignation`.
 * Aliased here so consumers can keep importing `SPADesignation` from the
 * picker's barrel without churn.
 */
export type SPADesignation = ISPADesignation;

/** Filter mode for the picker — affects price label + origin-only handling. */
export type SPAPickerMode = 'browse' | 'purchase';

/**
 * Public props contract. Every Phase 5 consumer is wired to this — keep
 * the surface stable. Optional fields default to permissive behavior so
 * the picker renders the full catalog when called with `{ onSelect }` only.
 */
export interface SPAPickerProps {
  /** Fires when the user picks an SPA (with designation when applicable). */
  onSelect: (spa: ISPADefinition, designation?: SPADesignation) => void;
  /** Fires when the user dismisses the picker (e.g. Esc). Optional. */
  onCancel?: () => void;
  /** SPAs the pilot already owns — rendered disabled with "Already owned". */
  excludedIds?: readonly string[];
  /** Pilot's current XP. When set, SPAs that cost more than this are hidden
   *  in `purchase` mode and dimmed in `browse` mode. */
  availableXP?: number;
  /** Restricts the source filter chips to this whitelist. Default: all. */
  allowedSources?: readonly SPASource[];
  /** `purchase` shows XP cost prominently and hides unaffordable rows;
   *  `browse` shows everything with cost as a neutral badge. */
  mode?: SPAPickerMode;
}

// =============================================================================
// Designation option registry — re-export of the live Wave 2b registry
// =============================================================================

/**
 * Returns the typed option set for the SPA's `designationType`. Thin
 * re-export of `@/lib/spa/designation/getDesignationOptions` so existing
 * picker code keeps the same import path.
 */
export const getDesignationOptions = getRealDesignationOptions;

// =============================================================================
// Category UI metadata
// =============================================================================

/**
 * Maps the canonical `SPACategory` ids to user-facing tab labels and a
 * short slug used as a category color accent. Driven by the catalog
 * (we still build the visible tab list dynamically from the data) — this
 * just supplies presentation data when a category appears.
 */
export const SPA_CATEGORY_LABELS: Record<string, string> = {
  gunnery: 'Gunnery',
  piloting: 'Piloting',
  defensive: 'Defensive',
  toughness: 'Toughness',
  tactical: 'Tactical',
  infantry: 'Infantry',
  bioware: 'Manei Domini',
  edge: 'Edge',
  miscellaneous: 'Miscellaneous',
};

/** Tailwind accent color slug per category. */
export const SPA_CATEGORY_COLORS: Record<string, string> = {
  gunnery: 'rose',
  piloting: 'cyan',
  defensive: 'emerald',
  toughness: 'amber',
  tactical: 'violet',
  infantry: 'orange',
  bioware: 'fuchsia',
  edge: 'yellow',
  miscellaneous: 'slate',
};

/** All sources we render chips for, in display order. */
export const SPA_ALL_SOURCES: readonly SPASource[] = [
  'CamOps',
  'MaxTech',
  'ATOW',
  'ManeiDomini',
  'Unofficial',
  'Legacy',
];
