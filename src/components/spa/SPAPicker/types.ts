/**
 * SPAPicker — local types and constants.
 *
 * Wave 1 ships a STUB `SPADesignation` shape so the picker can compile
 * and emit selection payloads without the real designation domain
 * model. Wave 2b replaces `SPADesignation` with a discriminated-union
 * type that carries the canonical weapon-type / target / range-bracket
 * payloads, and replaces `getDesignationOptions()` with a registry that
 * pulls real options from the equipment + terrain catalogs.
 *
 * Until then, every consumer of the picker can rely on this contract:
 *   - `kind` is the SPA's `designationType` (or "unknown" if absent)
 *   - `value` is the user-visible label of whatever they picked
 */

import type {
  ISPADefinition,
  SPADesignationType,
  SPASource,
} from '@/types/spa/SPADefinition';

/**
 * Stub designation payload — Wave 2b replaces with a typed discriminated union.
 * Keep the shape deliberately narrow so consumers don't grow dependencies on
 * fields that won't survive the Wave 2b rewrite.
 */
export interface SPADesignation {
  /** SPA designationType, or 'unknown' if the SPA didn't declare one. */
  readonly kind: SPADesignationType | 'unknown';
  /** User-visible label of the selected option (what the user picked). */
  readonly value: string;
}

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
// Designation option registry (STUB — Wave 2b replaces)
// =============================================================================

/**
 * STUB designation registry. Wave 2b replaces these literals with lookups
 * against the real weapon catalog, terrain presets, and skill list. The
 * shape (string label list) is what Wave 2b will produce, so picker code
 * doesn't need to change when the real registry lands.
 */
const STUB_DESIGNATION_OPTIONS: Record<SPADesignationType, readonly string[]> =
  {
    weapon_type: [
      'AC/2',
      'AC/5',
      'AC/10',
      'AC/20',
      'Medium Laser',
      'Large Laser',
      'PPC',
      'LRM-10',
      'LRM-20',
      'SRM-6',
      'Gauss Rifle',
      'Machine Gun',
    ],
    weapon_category: ['Energy', 'Ballistic', 'Missile', 'Melee'],
    target: ['Enemy commander', 'Heaviest enemy', 'Closest enemy'],
    range_bracket: ['Short', 'Medium', 'Long'],
    skill: ['Gunnery', 'Piloting'],
    terrain: ['Woods', 'Jungle', 'Urban', 'Desert', 'Snow', 'Swamp'],
  };

/**
 * Returns the stub option list for the given SPA's `designationType`.
 * When the SPA has no `designationType` (or the type isn't in the stub
 * registry) returns an empty array — consumers should treat this as
 * "no designation needed".
 */
export function getDesignationOptions(spa: ISPADefinition): readonly string[] {
  if (!spa.requiresDesignation || !spa.designationType) return [];
  return STUB_DESIGNATION_OPTIONS[spa.designationType] ?? [];
}

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
