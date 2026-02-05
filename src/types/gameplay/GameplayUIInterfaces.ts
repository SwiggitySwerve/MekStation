/**
 * Gameplay UI Interfaces
 * Type definitions for the gameplay user interface layer.
 *
 * @spec openspec/changes/add-gameplay-ui/specs/gameplay-ui/spec.md
 */

import { GamePhase, GameSide, IToHitModifier } from './GameSessionInterfaces';
import { IHexCoordinate, Facing, MovementType } from './HexGridInterfaces';

// =============================================================================
// Layout Types
// =============================================================================

/**
 * Panel emphasis state for contextual layout.
 */
export type PanelEmphasis = 'map' | 'recordSheet' | 'balanced';

/**
 * Layout configuration for gameplay view.
 */
export interface ILayoutConfig {
  /** Current panel emphasis */
  readonly emphasis: PanelEmphasis;
  /** Map panel width percentage (0-100) */
  readonly mapPanelWidth: number;
  /** Is event log collapsed? */
  readonly eventLogCollapsed: boolean;
  /** Minimum panel width in pixels */
  readonly minPanelWidth: number;
}

/**
 * Default layout configuration.
 */
export const DEFAULT_LAYOUT_CONFIG: ILayoutConfig = {
  emphasis: 'balanced',
  mapPanelWidth: 50,
  eventLogCollapsed: false,
  minPanelWidth: 300,
};

/**
 * Get layout config for a given phase.
 */
export function getLayoutForPhase(phase: GamePhase): Partial<ILayoutConfig> {
  switch (phase) {
    case GamePhase.Movement:
      return { emphasis: 'map', mapPanelWidth: 60 };
    case GamePhase.WeaponAttack:
    case GamePhase.PhysicalAttack:
      return { emphasis: 'recordSheet', mapPanelWidth: 40 };
    case GamePhase.Heat:
      return { emphasis: 'recordSheet', mapPanelWidth: 35 };
    default:
      return { emphasis: 'balanced', mapPanelWidth: 50 };
  }
}

// =============================================================================
// Unit Token Types
// =============================================================================

/**
 * Visual token representing a unit on the hex map.
 */
export interface IUnitToken {
  /** Unit ID */
  readonly unitId: string;
  /** Unit name for display */
  readonly name: string;
  /** Side (for coloring) */
  readonly side: GameSide;
  /** Current position */
  readonly position: IHexCoordinate;
  /** Current facing */
  readonly facing: Facing;
  /** Is this unit selected? */
  readonly isSelected: boolean;
  /** Is this unit a valid target? */
  readonly isValidTarget: boolean;
  /** Is this unit destroyed? */
  readonly isDestroyed: boolean;
  /** Short designation (e.g., "ATL-1") */
  readonly designation: string;
}

// =============================================================================
// Movement Preview Types
// =============================================================================

/**
 * Preview data for a potential movement.
 */
export interface IMovementPreview {
  /** Unit being moved */
  readonly unitId: string;
  /** Starting position */
  readonly from: IHexCoordinate;
  /** Target position */
  readonly to: IHexCoordinate;
  /** Path of hexes traversed */
  readonly path: readonly IHexCoordinate[];
  /** Proposed facing */
  readonly facing: Facing;
  /** Movement type */
  readonly movementType: MovementType;
  /** MP cost */
  readonly mpCost: number;
  /** MP available */
  readonly mpAvailable: number;
  /** Heat that will be generated */
  readonly heatGenerated: number;
  /** Target movement modifier (TMM) */
  readonly tmm: number;
  /** To-hit penalty from movement */
  readonly toHitPenalty: number;
  /** Is this movement valid? */
  readonly isValid: boolean;
  /** Validation error message if invalid */
  readonly errorMessage?: string;
}

/**
 * Hex highlight for movement range display.
 */
export interface IMovementRangeHex {
  /** Hex position */
  readonly hex: IHexCoordinate;
  /** MP cost to reach */
  readonly mpCost: number;
  /** Is this hex reachable with current MP? */
  readonly reachable: boolean;
  /** Movement type to reach (walk/run/jump) */
  readonly movementType: MovementType;
}

// =============================================================================
// Attack Preview Types
// =============================================================================

/**
 * Preview data for a potential attack.
 */
export interface IAttackPreview {
  /** Attacking unit */
  readonly attackerId: string;
  /** Target unit */
  readonly targetId: string;
  /** Weapons selected for attack */
  readonly weapons: readonly IWeaponAttackPreview[];
  /** Total heat generated */
  readonly totalHeat: number;
  /** Current heat */
  readonly currentHeat: number;
  /** Projected heat after attacks */
  readonly projectedHeat: number;
  /** Heat warnings */
  readonly heatWarnings: readonly string[];
}

/**
 * Preview for a single weapon attack.
 */
export interface IWeaponAttackPreview {
  /** Weapon ID */
  readonly weaponId: string;
  /** Weapon name */
  readonly weaponName: string;
  /** Is weapon available (not destroyed, has ammo)? */
  readonly available: boolean;
  /** Is target in range? */
  readonly inRange: boolean;
  /** Is target in arc? */
  readonly inArc: boolean;
  /** Range to target in hexes */
  readonly range: number;
  /** Range bracket */
  readonly rangeBracket: 'short' | 'medium' | 'long' | 'out';
  /** Base to-hit (gunnery) */
  readonly baseToHit: number;
  /** All modifiers */
  readonly modifiers: readonly IToHitModifier[];
  /** Final to-hit number */
  readonly finalToHit: number;
  /** Hit probability percentage */
  readonly hitProbability: number;
  /** Damage on hit */
  readonly damage: number;
  /** Heat generated */
  readonly heat: number;
  /** Reason weapon unavailable (if any) */
  readonly unavailableReason?: string;
}

// =============================================================================
// Record Sheet Display Types
// =============================================================================

/**
 * Location status for record sheet display.
 */
export interface ILocationStatus {
  /** Location name */
  readonly location: string;
  /** Display name */
  readonly displayName: string;
  /** Current armor */
  readonly armor: number;
  /** Maximum armor */
  readonly maxArmor: number;
  /** Current structure */
  readonly structure: number;
  /** Maximum structure */
  readonly maxStructure: number;
  /** Is location destroyed? */
  readonly destroyed: boolean;
  /** Rear armor (for torsos) */
  readonly rearArmor?: number;
  /** Maximum rear armor */
  readonly maxRearArmor?: number;
}

/**
 * Weapon status for record sheet display.
 */
export interface IWeaponStatus {
  /** Weapon ID */
  readonly id: string;
  /** Weapon name */
  readonly name: string;
  /** Location mounted */
  readonly location: string;
  /** Is weapon destroyed? */
  readonly destroyed: boolean;
  /** Was weapon fired this turn? */
  readonly firedThisTurn: boolean;
  /** Ammo remaining (if ammo-using) */
  readonly ammoRemaining?: number;
  /** Heat generated */
  readonly heat: number;
  /** Damage */
  readonly damage: number | string;
  /** Range brackets */
  readonly ranges: {
    readonly short: number;
    readonly medium: number;
    readonly long: number;
    readonly minimum?: number;
  };
}

// =============================================================================
// Event Log Types
// =============================================================================

/**
 * Filter options for event log.
 */
export interface IEventLogFilter {
  /** Filter by event types */
  readonly eventTypes?: readonly string[];
  /** Filter by unit ID */
  readonly unitId?: string;
  /** Filter by turn */
  readonly turn?: number;
  /** Filter by side */
  readonly side?: GameSide;
}

/**
 * Formatted event for display.
 */
export interface IFormattedEvent {
  /** Event ID */
  readonly id: string;
  /** Turn number */
  readonly turn: number;
  /** Phase */
  readonly phase: GamePhase;
  /** Formatted text */
  readonly text: string;
  /** Icon/type indicator */
  readonly icon:
    | 'movement'
    | 'attack'
    | 'damage'
    | 'heat'
    | 'critical'
    | 'status'
    | 'phase';
  /** Side that triggered event */
  readonly side?: GameSide;
  /** Related unit ID */
  readonly unitId?: string;
  /** Timestamp */
  readonly timestamp: string;
}

// =============================================================================
// Phase Controls Types
// =============================================================================

/**
 * Action available in the current phase.
 */
export interface IPhaseAction {
  /** Action ID */
  readonly id: string;
  /** Display label */
  readonly label: string;
  /** Icon name */
  readonly icon?: string;
  /** Is action available? */
  readonly enabled: boolean;
  /** Is this the primary action? */
  readonly primary: boolean;
  /** Keyboard shortcut */
  readonly shortcut?: string;
  /** Tooltip text */
  readonly tooltip?: string;
}

/**
 * Get available actions for a phase.
 */
export function getPhaseActions(
  phase: GamePhase,
  canUndo: boolean,
): IPhaseAction[] {
  switch (phase) {
    case GamePhase.Movement:
      return [
        {
          id: 'lock',
          label: 'Lock Movement',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
        {
          id: 'undo',
          label: 'Undo',
          primary: false,
          enabled: canUndo,
          shortcut: 'Ctrl+Z',
        },
        { id: 'skip', label: 'Skip', primary: false, enabled: true },
      ];
    case GamePhase.WeaponAttack:
      return [
        {
          id: 'lock',
          label: 'Lock Attacks',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
        { id: 'clear', label: 'Clear All', primary: false, enabled: true },
        { id: 'skip', label: 'Skip Attacks', primary: false, enabled: true },
      ];
    case GamePhase.Heat:
      return [
        {
          id: 'continue',
          label: 'Continue',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
      ];
    case GamePhase.End:
      return [
        {
          id: 'next-turn',
          label: 'Next Turn',
          primary: true,
          enabled: true,
          shortcut: 'Enter',
        },
        { id: 'concede', label: 'Concede', primary: false, enabled: true },
      ];
    default:
      return [];
  }
}

// =============================================================================
// Replay Types
// =============================================================================

/**
 * Replay mode state.
 */
export interface IReplayState {
  /** Is replay mode active? */
  readonly active: boolean;
  /** Is replay playing? */
  readonly playing: boolean;
  /** Playback speed multiplier */
  readonly speed: number;
  /** Current event index */
  readonly currentEventIndex: number;
  /** Total events */
  readonly totalEvents: number;
  /** Current turn being displayed */
  readonly displayTurn: number;
  /** Current phase being displayed */
  readonly displayPhase: GamePhase;
}

// =============================================================================
// Gameplay Store Types
// =============================================================================

/**
 * UI state for the gameplay view.
 */
export interface IGameplayUIState {
  /** Layout configuration */
  readonly layout: ILayoutConfig;
  /** Selected unit ID */
  readonly selectedUnitId: string | null;
  /** Targeted unit ID (for attacks) */
  readonly targetUnitId: string | null;
  /** Movement preview (if planning movement) */
  readonly movementPreview: IMovementPreview | null;
  /** Attack preview (if planning attack) */
  readonly attackPreview: IAttackPreview | null;
  /** Queued weapon IDs for attack */
  readonly queuedWeaponIds: readonly string[];
  /** Event log filter */
  readonly eventLogFilter: IEventLogFilter;
  /** Replay state */
  readonly replay: IReplayState;
  /** Is waiting for opponent? */
  readonly waitingForOpponent: boolean;
  /** Error message to display */
  readonly errorMessage: string | null;
}

/**
 * Default UI state.
 */
export const DEFAULT_UI_STATE: IGameplayUIState = {
  layout: DEFAULT_LAYOUT_CONFIG,
  selectedUnitId: null,
  targetUnitId: null,
  movementPreview: null,
  attackPreview: null,
  queuedWeaponIds: [],
  eventLogFilter: {},
  replay: {
    active: false,
    playing: false,
    speed: 1,
    currentEventIndex: 0,
    totalEvents: 0,
    displayTurn: 1,
    displayPhase: GamePhase.Initiative,
  },
  waitingForOpponent: false,
  errorMessage: null,
};
