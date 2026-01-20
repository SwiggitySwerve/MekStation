/**
 * Pilot-Mech Card Types
 *
 * Type definitions for the unified pilot-mech character sheet view.
 * Combines pilot identity, skills, career data with assigned mech information.
 *
 * @spec Phase 2 - Gameplay Roadmap
 */

// =============================================================================
// Pilot-Mech Card Data Interface
// =============================================================================

/**
 * Mech data subset for display in pilot-mech cards.
 */
export interface IPilotMechCardMechData {
  /** Unit/mech ID reference */
  readonly unitId: string;
  /** Display name (chassis + model) */
  readonly name: string;
  /** Chassis name */
  readonly chassis: string;
  /** Tonnage */
  readonly tonnage: number;
  /** Weight class display name */
  readonly weightClass: string;
  /** Tech base display name */
  readonly techBase: string;
  /** Battle Value */
  readonly battleValue: number;
  /** Walk MP */
  readonly walkMP: number;
  /** Run MP */
  readonly runMP: number;
  /** Jump MP */
  readonly jumpMP: number;
  /** Total armor points */
  readonly totalArmor: number;
  /** Maximum possible armor */
  readonly maxArmor: number;
}

/**
 * Complete pilot-mech card data interface.
 * Aggregates pilot and mech information for unified display.
 */
export interface IPilotMechCardData {
  // === Pilot Identity ===
  /** Pilot ID */
  readonly pilotId: string;
  /** Pilot display name */
  readonly pilotName: string;
  /** Callsign/nickname */
  readonly callsign?: string;
  /** Faction/house affiliation */
  readonly affiliation?: string;
  /** Military rank/title */
  readonly rank?: string;

  // === Pilot Skills ===
  /** Gunnery skill (1-8, lower is better) */
  readonly gunnery: number;
  /** Piloting skill (1-8, lower is better) */
  readonly piloting: number;

  // === Career Stats (Persistent Pilots) ===
  /** Total missions completed */
  readonly missions?: number;
  /** Total kills */
  readonly kills?: number;
  /** Current XP pool */
  readonly xp?: number;

  // === Status ===
  /** Current wounds (0-6) */
  readonly wounds: number;
  /** Pilot status (Active, Injured, KIA, etc.) */
  readonly status: string;

  // === Abilities ===
  /** List of ability names */
  readonly abilities: readonly string[];

  // === Effective Stats (Calculated) ===
  /** Base to-hit number (4 + gunnery) */
  readonly baseToHit: number;
  /** Consciousness roll target (3 + wounds) */
  readonly consciousnessTarget: number;

  // === Mech Data ===
  /** Assigned mech data, null if unassigned */
  readonly mech: IPilotMechCardMechData | null;
}

// =============================================================================
// Component Variant Types
// =============================================================================

/**
 * Display variant for PilotMechCard component.
 */
export type PilotMechCardVariant = 'compact' | 'standard' | 'gameplay';

/**
 * Props for the compact variant (list display).
 */
export interface IPilotMechCardCompactProps {
  /** Card data */
  data: IPilotMechCardData;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the standard variant (detail view).
 */
export interface IPilotMechCardStandardProps {
  /** Card data */
  data: IPilotMechCardData;
  /** Called when Export is clicked */
  onExport?: () => void;
  /** Called when Share is clicked */
  onShare?: () => void;
  /** Called when Edit Pilot is clicked */
  onEditPilot?: () => void;
  /** Called when Change Mech is clicked */
  onChangeMech?: () => void;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the gameplay variant (active game).
 */
export interface IPilotMechCardGameplayProps {
  /** Card data */
  data: IPilotMechCardData;
  /** Current heat level (for mech) */
  currentHeat?: number;
  /** Current damage state */
  damageState?: Record<string, number>;
  /** Called when wound is applied */
  onApplyWound?: () => void;
  /** Called when wound is healed */
  onHealWound?: () => void;
  /** Called when Edit Pilot is clicked */
  onEditPilot?: () => void;
  /** Called when Change Mech is clicked */
  onChangeMech?: () => void;
  /** Additional CSS classes */
  className?: string;
}
