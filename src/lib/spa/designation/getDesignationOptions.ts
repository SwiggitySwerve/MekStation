/**
 * Designation option registry — Wave 2b replacement for the picker stub.
 *
 * The Wave 1 picker shipped a hardcoded `STUB_DESIGNATION_OPTIONS` map
 * with frozen literal lists ("Medium Laser", "PPC", ...). This module
 * replaces that stub with a typed registry that returns the right option
 * shape per designation kind:
 *   - weapon_type     → curated weapon list (cross-tech canonical names)
 *   - weapon_category → energy / ballistic / missile / physical
 *   - range_bracket   → short / medium / long / extreme
 *   - target          → empty list (assigned post-purchase from unit-card UI)
 *   - terrain         → curated terrain list (woods, jungle, vacuum, etc.)
 *   - skill           → gunnery / piloting (placeholder for ATOW SPAs)
 *
 * The picker only renders options for kinds with a non-empty list. For
 * `target`, it shows a "to be assigned later" notice instead of a select
 * (handled in `SPAItem.tsx`).
 *
 * The weapon list is intentionally short — the Phase 5 MVP uses the
 * MegaMek canonical names that already appear in the equipment catalog
 * (`public/data/equipment/official/weapons/*.json`). A later wave can
 * swap in a full catalog read once the equipment loader is wired into
 * the picker bundle.
 */

import type {
  ISPADefinition,
  SPADesignationType,
} from '@/types/spa/SPADefinition';

import {
  catalogDesignationToKind,
  type SPADesignationKind,
} from '@/types/pilot/SPADesignation';

// =============================================================================
// Option shape
// =============================================================================

/**
 * Single picker row. `value` is the canonical id stored on the pilot
 * record; `label` is what the user sees. The two diverge only when the
 * canonical form is a slug — e.g. `value: 'medium_laser'`,
 * `label: 'Medium Laser'`.
 */
export interface IDesignationOption {
  readonly value: string;
  readonly label: string;
}

/**
 * The registry result for a single SPA. `kind` mirrors the SPA's
 * `designationType` (or `null` when the SPA needs no designation).
 */
export interface IDesignationOptionSet {
  readonly kind: SPADesignationKind | null;
  readonly options: readonly IDesignationOption[];
  /**
   * True when the picker should NOT render a select control and instead
   * show a "to be assigned later" notice — currently only `target`. The
   * caller still emits a designation with an empty `targetUnitId` so the
   * SPA is purchasable; the unit-card UI binds the real id post-purchase.
   */
  readonly deferred: boolean;
}

// =============================================================================
// Curated option lists
// =============================================================================

/**
 * Weapon types relevant to designation-dependent SPAs. Mirrors the
 * MegaMek canonical names used in `public/data/equipment/official/weapons`.
 * The slug form (`value`) follows the lowercase-underscore convention
 * used by the equipment loader.
 */
const WEAPON_TYPES: readonly IDesignationOption[] = [
  { value: 'ac_2', label: 'AC/2' },
  { value: 'ac_5', label: 'AC/5' },
  { value: 'ac_10', label: 'AC/10' },
  { value: 'ac_20', label: 'AC/20' },
  { value: 'ultra_ac_5', label: 'Ultra AC/5' },
  { value: 'ultra_ac_10', label: 'Ultra AC/10' },
  { value: 'ultra_ac_20', label: 'Ultra AC/20' },
  { value: 'lb_10x_ac', label: 'LB 10-X AC' },
  { value: 'gauss_rifle', label: 'Gauss Rifle' },
  { value: 'heavy_gauss', label: 'Heavy Gauss Rifle' },
  { value: 'small_laser', label: 'Small Laser' },
  { value: 'medium_laser', label: 'Medium Laser' },
  { value: 'large_laser', label: 'Large Laser' },
  { value: 'er_small_laser', label: 'ER Small Laser' },
  { value: 'er_medium_laser', label: 'ER Medium Laser' },
  { value: 'er_large_laser', label: 'ER Large Laser' },
  { value: 'ppc', label: 'PPC' },
  { value: 'er_ppc', label: 'ER PPC' },
  { value: 'snub_nose_ppc', label: 'Snub-Nose PPC' },
  { value: 'srm_2', label: 'SRM-2' },
  { value: 'srm_4', label: 'SRM-4' },
  { value: 'srm_6', label: 'SRM-6' },
  { value: 'lrm_5', label: 'LRM-5' },
  { value: 'lrm_10', label: 'LRM-10' },
  { value: 'lrm_15', label: 'LRM-15' },
  { value: 'lrm_20', label: 'LRM-20' },
  { value: 'mrm_10', label: 'MRM-10' },
  { value: 'mrm_20', label: 'MRM-20' },
  { value: 'mrm_30', label: 'MRM-30' },
  { value: 'mrm_40', label: 'MRM-40' },
  { value: 'machine_gun', label: 'Machine Gun' },
  { value: 'flamer', label: 'Flamer' },
];

const WEAPON_CATEGORIES: readonly IDesignationOption[] = [
  { value: 'energy', label: 'Energy' },
  { value: 'ballistic', label: 'Ballistic' },
  { value: 'missile', label: 'Missile' },
  { value: 'physical', label: 'Physical' },
];

const RANGE_BRACKETS: readonly IDesignationOption[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
  { value: 'extreme', label: 'Extreme' },
];

const TERRAINS: readonly IDesignationOption[] = [
  { value: 'woods', label: 'Woods' },
  { value: 'jungle', label: 'Jungle' },
  { value: 'urban', label: 'Urban' },
  { value: 'desert', label: 'Desert' },
  { value: 'snow', label: 'Snow' },
  { value: 'swamp', label: 'Swamp' },
  { value: 'water', label: 'Water' },
  { value: 'vacuum', label: 'Vacuum' },
  { value: 'underground', label: 'Underground' },
  { value: 'low_gravity', label: 'Low Gravity' },
];

const SKILLS: readonly IDesignationOption[] = [
  { value: 'gunnery', label: 'Gunnery' },
  { value: 'piloting', label: 'Piloting' },
];

// =============================================================================
// Registry
// =============================================================================

/**
 * Resolve the option set for a single designation kind. Pure — same
 * input always yields the same frozen list reference.
 */
export function getOptionsForKind(
  kind: SPADesignationKind,
): IDesignationOptionSet {
  switch (kind) {
    case 'weapon_type':
      return { kind, options: WEAPON_TYPES, deferred: false };
    case 'weapon_category':
      return { kind, options: WEAPON_CATEGORIES, deferred: false };
    case 'range_bracket':
      return { kind, options: RANGE_BRACKETS, deferred: false };
    case 'terrain':
      return { kind, options: TERRAINS, deferred: false };
    case 'skill':
      return { kind, options: SKILLS, deferred: false };
    case 'target':
      // The picker can't know the unit roster at SPA-purchase time. Show
      // a deferred notice instead and let the unit-card UI bind the real
      // unit id later.
      return { kind, options: [], deferred: true };
    default: {
      // Exhaustiveness guard — adding a new SPADesignationKind without
      // updating this switch is a compile error.
      const _exhaustive: never = kind;
      void _exhaustive;
      return { kind, options: [], deferred: false };
    }
  }
}

/**
 * Resolve the option set for a given SPA. When the SPA doesn't require a
 * designation — or declares an unknown `designationType` — returns an
 * empty option set with `kind === null`, so the picker emits the
 * selection immediately without prompting.
 */
export function getDesignationOptions(
  spa: ISPADefinition,
): IDesignationOptionSet {
  if (!spa.requiresDesignation || !spa.designationType) {
    return { kind: null, options: [], deferred: false };
  }
  const kind = catalogDesignationToKind(spa.designationType);
  return getOptionsForKind(kind);
}

/**
 * Convenience predicate — true when the SPA has a deferred designation
 * (currently only `target`). The picker uses this to swap the select
 * control for an explanatory placeholder.
 */
export function isDeferredDesignationType(
  type: SPADesignationType | undefined,
): boolean {
  if (!type) return false;
  return catalogDesignationToKind(type) === 'target';
}
