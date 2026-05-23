/**
 * SPA (Special Pilot Abilities) Type Definitions
 * Shared types and interfaces for SPA system.
 */

import { RangeBracket } from '@/types/gameplay';

// =============================================================================
// Edge Trigger System Types
// =============================================================================

/**
 * MegaMek-style Edge trigger options. Edge is not a generic critical
 * canceller; each trigger has specific usage conditions.
 */
export type EdgeTriggerType =
  | 'edge_when_headhit'
  | 'edge_when_tac'
  | 'edge_when_ko'
  | 'edge_when_explosion'
  | 'edge_when_masc_fails'
  | 'edge_when_aero_alt_loss'
  | 'edge_when_aero_explosion'
  | 'edge_when_aero_ko'
  | 'edge_when_aero_lucky_crit'
  | 'edge_when_aero_nuke_crit'
  | 'edge_when_aero_unit_cargo_lost';

/**
 * State of a pilot's Edge points during a game.
 */
export interface IEdgeState {
  /** Maximum Edge points (set at game start, typically 1-3) */
  readonly maxPoints: number;
  /** Remaining Edge points */
  readonly remainingPoints: number;
  /** History of Edge uses this game */
  readonly usageHistory: readonly IEdgeUsage[];
}

/**
 * Record of a single Edge usage.
 */
export interface IEdgeUsage {
  /** Which trigger was used */
  readonly trigger: EdgeTriggerType;
  /** Turn when Edge was used */
  readonly turn: number;
  /** Unit that used Edge */
  readonly unitId: string;
  /** Brief description of what was rerolled/negated */
  readonly description: string;
}

// =============================================================================
// SPA Combat Effect Context
// =============================================================================

/**
 * Context for SPA modifier calculation — extends attacker/target with SPA-specific data.
 */
export interface ISPAContext {
  /** Pilot's SPA identifiers (e.g., ['weapon-specialist', 'sniper']) */
  readonly abilities: readonly string[];
  /** Weapon type being fired (for Weapon Specialist) */
  readonly weaponType?: string;
  /** Weapon category: 'energy' | 'ballistic' | 'missile' (for Gunnery Specialist) */
  readonly weaponCategory?: string;
  /** Designated weapon type for Weapon Specialist */
  readonly designatedWeaponType?: string;
  /** Designated weapon category for Gunnery Specialist */
  readonly designatedWeaponCategory?: string;
  /** Designated target ID for Blood Stalker */
  readonly designatedTargetId?: string;
  /** Actual target being fired at */
  readonly targetId?: string;
  /** Designated range bracket for Range Master */
  readonly designatedRangeBracket?: RangeBracket;
  /** Current range bracket of the attack */
  readonly rangeBracket?: RangeBracket;
  /** Whether pilot declared a dodge action this turn */
  readonly isDodging?: boolean;
  /** Edge state for this pilot */
  readonly edgeState?: IEdgeState;
}

// =============================================================================
// SPA Catalog Types
// =============================================================================

/**
 * SPA combat effect category.
 */
export type SPACategory =
  | 'gunnery'
  | 'piloting'
  | 'defensive'
  | 'toughness'
  | 'tactical'
  | 'miscellaneous';

/**
 * Combat pipeline that the SPA affects.
 */
export type SPAPipeline =
  | 'to-hit'
  | 'damage'
  | 'psr'
  | 'heat'
  | 'initiative'
  | 'consciousness'
  | 'special';

/**
 * SPA catalog entry — defines how an SPA integrates with combat.
 */
export interface ISPACatalogEntry {
  /** SPA identifier (matches ability IDs in pilot system) */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** SPA category */
  readonly category: SPACategory;
  /** Which combat pipeline(s) this SPA affects */
  readonly pipelines: readonly SPAPipeline[];
  /** Brief description of combat effect */
  readonly combatEffect: string;
  /** Whether this SPA requires a designation (weapon type, target, etc.) */
  readonly requiresDesignation: boolean;
  /** Designation type if required */
  readonly designationType?:
    | 'weapon_type'
    | 'weapon_category'
    | 'target'
    | 'range_bracket';
}
