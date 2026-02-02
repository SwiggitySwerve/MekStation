/**
 * Quick Game Interfaces
 * Type definitions for quick session mode - standalone games without campaign persistence.
 *
 * @spec openspec/changes/add-quick-session-mode/proposal.md
 */

import { IGeneratedScenario } from '../scenario';
import { GameStatus, GamePhase, IGameEvent } from '../gameplay';

// =============================================================================
// Enums
// =============================================================================

/**
 * Quick game setup wizard steps.
 */
export enum QuickGameStep {
  /** Select units for player force */
  SelectUnits = 'select_units',
  /** Configure scenario (difficulty, modifiers, etc.) */
  ConfigureScenario = 'configure_scenario',
  /** Review and confirm setup */
  Review = 'review',
  /** Game in progress */
  Playing = 'playing',
  /** Game completed, showing results */
  Results = 'results',
}

// =============================================================================
// Unit Instance Interfaces
// =============================================================================

/**
 * Temporary unit instance for quick games.
 * Not persisted to database - exists only for the session.
 */
export interface IQuickGameUnit {
  /** Unique instance ID (generated per session) */
  readonly instanceId: string;
  /** Reference to the source unit definition */
  readonly sourceUnitId: string;
  /** Unit name (may be customized) */
  readonly name: string;
  /** Unit chassis/variant */
  readonly chassis: string;
  /** Unit variant name */
  readonly variant: string;
  /** Battle Value */
  readonly bv: number;
  /** Tonnage */
  readonly tonnage: number;
  /** Pilot gunnery skill */
  readonly gunnery: number;
  /** Pilot piloting skill */
  readonly piloting: number;
  /** Pilot name (optional) */
  readonly pilotName?: string;
  /** Maximum armor by location (for reset) */
  readonly maxArmor: Record<string, number>;
  /** Maximum internal structure by location (for reset) */
  readonly maxStructure: Record<string, number>;
  /** Current armor by location */
  armor: Record<string, number>;
  /** Current internal structure by location */
  structure: Record<string, number>;
  /** Current heat level */
  heat: number;
  /** Is unit destroyed */
  isDestroyed: boolean;
  /** Is unit withdrawn */
  isWithdrawn: boolean;
}

/**
 * Request to add a unit to quick game.
 */
export interface IQuickGameUnitRequest {
  /** Source unit ID from compendium/vault */
  readonly sourceUnitId: string;
  /** Unit name */
  readonly name: string;
  /** Chassis name */
  readonly chassis: string;
  /** Variant name */
  readonly variant: string;
  /** Battle Value */
  readonly bv: number;
  /** Tonnage */
  readonly tonnage: number;
  /** Pilot gunnery skill (default 4) */
  readonly gunnery?: number;
  /** Pilot piloting skill (default 5) */
  readonly piloting?: number;
  /** Pilot name */
  readonly pilotName?: string;
  /** Initial armor values by location */
  readonly maxArmor: Record<string, number>;
  /** Initial structure values by location */
  readonly maxStructure: Record<string, number>;
}

// =============================================================================
// Quick Game State Interfaces
// =============================================================================

/**
 * Player force configuration for quick game.
 */
export interface IQuickGameForce {
  /** Force display name */
  readonly name: string;
  /** Units in the force */
  readonly units: readonly IQuickGameUnit[];
  /** Total BV of the force */
  readonly totalBV: number;
  /** Total tonnage */
  readonly totalTonnage: number;
}

/**
 * Quick game scenario configuration.
 */
export interface IQuickGameScenarioConfig {
  /** Difficulty multiplier (0.5 - 2.0) */
  readonly difficulty: number;
  /** Number of modifiers to apply */
  readonly modifierCount: number;
  /** Allow negative modifiers */
  readonly allowNegativeModifiers: boolean;
  /** Specific scenario type (optional) */
  readonly scenarioType?: string;
  /** Enemy faction */
  readonly enemyFaction?: string;
  /** Biome preference */
  readonly biome?: string;
  /** Campaign year for unit filtering (optional). When set, units are filtered by introduction/extinction dates. Defaults to 3025 (Late Succession Wars). See isAvailableInYear() in availabilityUtils for filtering logic. */
  readonly year?: number;
}

/**
 * Complete quick game instance.
 * Stored in session storage, not persisted to database.
 */
export interface IQuickGameInstance {
  /** Unique game ID (generated per session) */
  readonly id: string;
  /** Game status */
  status: GameStatus;
  /** Current setup step */
  step: QuickGameStep;
  /** Player force */
  playerForce: IQuickGameForce;
  /** Generated opponent force */
  opponentForce: IQuickGameForce | null;
  /** Scenario configuration */
  scenarioConfig: IQuickGameScenarioConfig;
  /** Generated scenario (after configuration) */
  scenario: IGeneratedScenario | null;
  /** Current game phase */
  phase: GamePhase;
  /** Current turn number */
  turn: number;
  /** Game events (for replay) */
  events: IGameEvent[];
  /** Winner (if game completed) */
  winner: 'player' | 'opponent' | 'draw' | null;
  /** Victory reason */
  victoryReason: string | null;
  /** Session start time */
  readonly startedAt: string;
  /** Session end time */
  endedAt: string | null;
}

/**
 * Quick game store state.
 */
export interface IQuickGameState {
  /** Current game instance */
  game: IQuickGameInstance | null;
  /** Is loading */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Has unsaved changes */
  isDirty: boolean;
}

// =============================================================================
// Action Interfaces
// =============================================================================

/**
 * Quick game store actions.
 */
export interface IQuickGameActions {
  /** Start a new quick game */
  startNewGame: () => void;
  /** Add unit to player force */
  addUnit: (unit: IQuickGameUnitRequest) => void;
  /** Remove unit from player force */
  removeUnit: (instanceId: string) => void;
  /** Update unit skills */
  updateUnitSkills: (instanceId: string, gunnery: number, piloting: number) => void;
  /** Set scenario configuration */
  setScenarioConfig: (config: Partial<IQuickGameScenarioConfig>) => void;
  /** Generate scenario and opponent force */
  generateScenario: () => void;
  /** Advance to next setup step */
  nextStep: () => void;
  /** Go back to previous step */
  previousStep: () => void;
  /** Start the game (move to playing) */
  startGame: () => void;
  /** Record a game event */
  recordEvent: (event: IGameEvent) => void;
  /** End the game */
  endGame: (winner: 'player' | 'opponent' | 'draw', reason: string) => void;
  /** Reset for a new game with same units */
  playAgain: (resetUnits: boolean) => void;
  /** Clear the current game */
  clearGame: () => void;
  /** Clear error */
  clearError: () => void;
  /** Restore from session storage */
  restoreFromSession: () => boolean;
  /** Save to session storage */
  saveToSession: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Create a new quick game instance.
 */
export function createQuickGameInstance(): IQuickGameInstance {
  return {
    id: `quick-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    status: GameStatus.Setup,
    step: QuickGameStep.SelectUnits,
    playerForce: {
      name: 'Player Force',
      units: [],
      totalBV: 0,
      totalTonnage: 0,
    },
    opponentForce: null,
    scenarioConfig: {
      difficulty: 1.0,
      modifierCount: 2,
      allowNegativeModifiers: true,
      year: 3025,
    },
    scenario: null,
    phase: GamePhase.Initiative,
    turn: 0,
    events: [],
    winner: null,
    victoryReason: null,
    startedAt: new Date().toISOString(),
    endedAt: null,
  };
}

/**
 * Create a quick game unit from a unit request.
 */
export function createQuickGameUnit(request: IQuickGameUnitRequest): IQuickGameUnit {
  return {
    instanceId: `unit-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    sourceUnitId: request.sourceUnitId,
    name: request.name,
    chassis: request.chassis,
    variant: request.variant,
    bv: request.bv,
    tonnage: request.tonnage,
    gunnery: request.gunnery ?? 4,
    piloting: request.piloting ?? 5,
    pilotName: request.pilotName,
    maxArmor: { ...request.maxArmor },
    maxStructure: { ...request.maxStructure },
    armor: { ...request.maxArmor },
    structure: { ...request.maxStructure },
    heat: 0,
    isDestroyed: false,
    isWithdrawn: false,
  };
}

/**
 * Calculate force totals.
 */
export function calculateForceTotals(units: readonly IQuickGameUnit[]): {
  totalBV: number;
  totalTonnage: number;
} {
  return units.reduce(
    (acc, unit) => ({
      totalBV: acc.totalBV + unit.bv,
      totalTonnage: acc.totalTonnage + unit.tonnage,
    }),
    { totalBV: 0, totalTonnage: 0 }
  );
}

/**
 * Check if a quick game can advance to playing.
 */
export function canStartGame(game: IQuickGameInstance): boolean {
  return (
    game.playerForce.units.length > 0 &&
    game.opponentForce !== null &&
    game.scenario !== null &&
    game.step === QuickGameStep.Review
  );
}

/**
 * Session storage key for quick game.
 */
export const QUICK_GAME_STORAGE_KEY = 'mekstation-quick-game';
