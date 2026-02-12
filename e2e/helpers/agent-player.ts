/**
 * Agent Player for E2E Tests
 *
 * Autonomous agent that plays through an interactive game session by reading
 * Zustand store state and acting via UI clicks. Uses simple heuristics for
 * movement and attack decisions.
 *
 * @example
 * ```typescript
 * const agent = new AgentPlayer(page);
 * await agent.playGame(); // Plays until completion or 60s timeout
 * ```
 */

import type { Page } from '@playwright/test';

import { getStoreState } from './store';

// =============================================================================
// Types (serialized shapes from Zustand store - no imports from src/)
// =============================================================================

/** Hex coordinate in axial system */
interface HexCoord {
  readonly q: number;
  readonly r: number;
}

/** Serialized unit game state from the store */
interface UnitGameState {
  readonly id: string;
  readonly side: 'player' | 'opponent';
  readonly position: HexCoord;
  readonly facing: number;
  readonly heat: number;
  readonly armor: Record<string, number>;
  readonly structure: Record<string, number>;
  readonly destroyed: boolean;
  readonly destroyedLocations: readonly string[];
  readonly destroyedEquipment: readonly string[];
  readonly lockState: string;
}

/** Serialized game state from the store */
interface GameState {
  readonly gameId: string;
  readonly status: string;
  readonly turn: number;
  readonly phase: string;
  readonly initiativeWinner?: string;
  readonly firstMover?: string;
  readonly activationIndex: number;
  readonly units: Record<string, UnitGameState>;
  readonly result?: {
    readonly winner: string;
    readonly reason: string;
  };
}

/** Serialized game session from the store */
interface GameSession {
  readonly id: string;
  readonly currentState: GameState;
  readonly config: {
    readonly mapRadius: number;
    readonly turnLimit: number;
  };
  readonly units: readonly {
    readonly id: string;
    readonly name: string;
    readonly side: string;
  }[];
}

/** Weapon status from the store's unitWeapons */
interface WeaponStatus {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly destroyed: boolean;
  readonly firedThisTurn: boolean;
  readonly heat: number;
  readonly damage: number | string;
  readonly ranges: {
    readonly short: number;
    readonly medium: number;
    readonly long: number;
    readonly minimum?: number;
  };
}

/** Shape of the gameplay store state (serialized) */
interface GameplayStoreState {
  readonly session: GameSession | null;
  readonly interactivePhase: string;
  readonly validMovementHexes: readonly HexCoord[];
  readonly validTargetIds: readonly string[];
  readonly ui: {
    readonly selectedUnitId: string | null;
    readonly targetUnitId: string | null;
    readonly queuedWeaponIds: readonly string[];
  };
  readonly unitWeapons: Record<string, readonly WeaponStatus[]>;
}

/** Movement decision result */
interface MovementDecision {
  readonly unitId: string;
  readonly targetHex: HexCoord;
}

/** Attack decision result */
interface AttackDecision {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponIds: string[];
}

// =============================================================================
// Helpers
// =============================================================================

/** Euclidean distance between two hex coordinates (good enough heuristic). */
function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = a.q - b.q;
  const dr = a.r - b.r;
  const ds = -dq - dr;
  return Math.max(Math.abs(dq), Math.abs(dr), Math.abs(ds));
}

/** Calculate total remaining armor percentage for a unit. */
function armorPercent(
  unit: UnitGameState,
  maxArmor: Record<string, Record<string, number>>,
): number {
  const unitMax = maxArmor[unit.id];
  if (!unitMax) return 1;

  let currentTotal = 0;
  let maxTotal = 0;
  for (const [loc, max] of Object.entries(unitMax)) {
    maxTotal += max;
    currentTotal += unit.armor[loc] ?? 0;
  }
  return maxTotal > 0 ? currentTotal / maxTotal : 0;
}

/**
 * Get hex neighbors in axial coordinates.
 * Directions: E, NE, NW, W, SW, SE
 */
function hexNeighbors(hex: HexCoord): HexCoord[] {
  return [
    { q: hex.q + 1, r: hex.r },
    { q: hex.q + 1, r: hex.r - 1 },
    { q: hex.q, r: hex.r - 1 },
    { q: hex.q - 1, r: hex.r },
    { q: hex.q - 1, r: hex.r + 1 },
    { q: hex.q, r: hex.r + 1 },
  ];
}

/** Numeric damage value from weapon (handles string damage like "2/pnt"). */
function numericDamage(damage: number | string): number {
  if (typeof damage === 'number') return damage;
  const parsed = parseFloat(damage);
  return isNaN(parsed) ? 0 : parsed;
}

// =============================================================================
// Agent Player
// =============================================================================

/** Maximum game duration in milliseconds. */
const GAME_TIMEOUT_MS = 60_000;

/** Delay between actions to let UI settle (ms). */
const ACTION_DELAY_MS = 150;

/**
 * Autonomous agent that plays through an interactive game session.
 *
 * Reads game state from `__ZUSTAND_STORES__.gameplayStore` and acts via
 * Playwright UI clicks on hex map, unit tokens, and action buttons.
 */
export class AgentPlayer {
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  // ===========================================================================
  // State Access
  // ===========================================================================

  /** Read the current gameplay store state. */
  private async getState(): Promise<GameplayStoreState> {
    return getStoreState<GameplayStoreState>(this.page, 'gameplayStore');
  }

  /** Get the current game session, throwing if not loaded. */
  private async getSession(): Promise<GameSession> {
    const state = await this.getState();
    if (!state.session) {
      throw new Error('AgentPlayer: No game session loaded');
    }
    return state.session;
  }

  /** Get current game phase. */
  private async getPhase(): Promise<string> {
    const session = await this.getSession();
    return session.currentState.phase;
  }

  /** Get the interactive phase from the store. */
  private async getInteractivePhase(): Promise<string> {
    const state = await this.getState();
    return state.interactivePhase;
  }

  /** Check if game is over. */
  private async isGameOver(): Promise<boolean> {
    const interactivePhase = await this.getInteractivePhase();
    if (interactivePhase === 'game_over') return true;

    const session = await this.getSession();
    return (
      session.currentState.status === 'completed' ||
      !!session.currentState.result
    );
  }

  /** Get all living player units. */
  private getPlayerUnits(
    units: Record<string, UnitGameState>,
  ): [string, UnitGameState][] {
    return Object.entries(units).filter(
      ([, u]) => u.side === 'player' && !u.destroyed,
    );
  }

  /** Get all living opponent units. */
  private getOpponentUnits(
    units: Record<string, UnitGameState>,
  ): [string, UnitGameState][] {
    return Object.entries(units).filter(
      ([, u]) => u.side === 'opponent' && !u.destroyed,
    );
  }

  // ===========================================================================
  // UI Actions
  // ===========================================================================

  /** Click a hex on the map. */
  private async clickHex(hex: HexCoord): Promise<void> {
    const selector = `[data-testid="hex-${hex.q}-${hex.r}"]`;
    await this.page.click(selector, { timeout: 5000 });
    await this.page.waitForTimeout(ACTION_DELAY_MS);
  }

  /** Click a unit token on the map. */
  private async clickUnitToken(unitId: string): Promise<void> {
    const selector = `[data-testid="unit-token-${unitId}"]`;
    await this.page.click(selector, { timeout: 5000 });
    await this.page.waitForTimeout(ACTION_DELAY_MS);
  }

  /** Click an action button in the action bar. */
  private async clickActionButton(actionId: string): Promise<void> {
    const selector = `[data-testid="action-btn-${actionId}"]`;
    await this.page.click(selector, { timeout: 5000 });
    await this.page.waitForTimeout(ACTION_DELAY_MS);
  }

  /** Click a weapon in the weapon panel to toggle selection. */
  private async clickWeapon(weaponId: string): Promise<void> {
    const selector = `[data-testid="weapon-${weaponId}"]`;
    try {
      await this.page.click(selector, { timeout: 2000 });
      await this.page.waitForTimeout(ACTION_DELAY_MS);
    } catch {
      // Weapon panel may not be visible; skip silently
    }
  }

  // ===========================================================================
  // Decision Making
  // ===========================================================================

  /**
   * Choose a hex to move toward the nearest enemy.
   *
   * Strategy: For the active player unit, find the closest opponent unit and
   * pick the adjacent hex (or valid movement hex) that minimizes distance.
   */
  async makeMovementDecision(): Promise<MovementDecision | null> {
    const state = await this.getState();
    const session = state.session;
    if (!session) return null;

    const { units } = session.currentState;
    const playerUnits = this.getPlayerUnits(units);
    const opponentUnits = this.getOpponentUnits(units);

    if (playerUnits.length === 0 || opponentUnits.length === 0) return null;

    // Use selected unit or pick first living player unit
    const selectedId = state.ui.selectedUnitId;
    const [unitId, unit] =
      playerUnits.find(([id]) => id === selectedId) ?? playerUnits[0];

    // Find closest opponent
    let closestOpponent: UnitGameState | null = null;
    let closestDist = Infinity;
    for (const [, opp] of opponentUnits) {
      const dist = hexDistance(unit.position, opp.position);
      if (dist < closestDist) {
        closestDist = dist;
        closestOpponent = opp;
      }
    }
    if (!closestOpponent) return null;

    // If already adjacent (distance 1), stay put - no movement needed
    if (closestDist <= 1) {
      return { unitId, targetHex: unit.position };
    }

    // If we have valid movement hexes from the store, pick the best one
    if (state.validMovementHexes.length > 0) {
      let bestHex = state.validMovementHexes[0];
      let bestDist = hexDistance(bestHex, closestOpponent.position);
      for (const hex of state.validMovementHexes) {
        const dist = hexDistance(hex, closestOpponent.position);
        if (dist < bestDist) {
          bestDist = dist;
          bestHex = hex;
        }
      }
      return { unitId, targetHex: bestHex };
    }

    // Fallback: pick the neighbor hex closest to the opponent
    const mapRadius = session.config.mapRadius;
    const neighbors = hexNeighbors(unit.position).filter((h) => {
      // Stay within map bounds
      const s = -h.q - h.r;
      return (
        Math.abs(h.q) <= mapRadius &&
        Math.abs(h.r) <= mapRadius &&
        Math.abs(s) <= mapRadius
      );
    });

    let bestHex = neighbors[0] ?? unit.position;
    let bestDist = hexDistance(bestHex, closestOpponent.position);
    for (const hex of neighbors) {
      const dist = hexDistance(hex, closestOpponent.position);
      if (dist < bestDist) {
        bestDist = dist;
        bestHex = hex;
      }
    }

    return { unitId, targetHex: bestHex };
  }

  /**
   * Choose a weapon and target for attack.
   *
   * Strategy: Select the most-damaged opponent unit and the highest-damage
   * weapon from the active player unit.
   */
  async makeAttackDecision(): Promise<AttackDecision | null> {
    const state = await this.getState();
    const session = state.session;
    if (!session) return null;

    const { units } = session.currentState;
    const playerUnits = this.getPlayerUnits(units);
    const opponentUnits = this.getOpponentUnits(units);

    if (playerUnits.length === 0 || opponentUnits.length === 0) return null;

    // Use selected unit or pick first player unit
    const selectedId = state.ui.selectedUnitId;
    const [attackerId] =
      playerUnits.find(([id]) => id === selectedId) ?? playerUnits[0];

    // Find most damaged opponent (lowest armor %)
    let bestTarget: string | null = null;
    let lowestArmor = Infinity;
    for (const [oppId, opp] of opponentUnits) {
      // Simple armor sum as proxy for health
      const totalArmor = Object.values(opp.armor).reduce(
        (sum, v) => sum + v,
        0,
      );
      if (totalArmor < lowestArmor) {
        lowestArmor = totalArmor;
        bestTarget = oppId;
      }
    }
    if (!bestTarget) return null;

    // Select highest-damage weapon(s)
    const weapons = state.unitWeapons[attackerId] ?? [];
    const usableWeapons = weapons.filter(
      (w) => !w.destroyed && !w.firedThisTurn,
    );

    if (usableWeapons.length === 0) {
      // No weapons available - still return decision to allow skipping
      return { attackerId, targetId: bestTarget, weaponIds: [] };
    }

    // Sort by damage descending, pick all usable weapons
    const sorted = [...usableWeapons].sort(
      (a, b) => numericDamage(b.damage) - numericDamage(a.damage),
    );

    // Select all weapons (fire everything)
    const weaponIds = sorted.map((w) => w.id);

    return { attackerId, targetId: bestTarget, weaponIds };
  }

  // ===========================================================================
  // Turn Execution
  // ===========================================================================

  /**
   * Execute one full turn: movement phase + attack phase.
   *
   * Handles the interactive session flow:
   * 1. Movement phase: select unit, move toward enemy, skip/advance
   * 2. Attack phase: select unit, select target, fire weapons, skip/advance
   * 3. AI turn: trigger opponent AI
   * 4. End phase: advance to next turn
   */
  async playTurn(): Promise<void> {
    if (await this.isGameOver()) return;

    const interactivePhase = await this.getInteractivePhase();

    switch (interactivePhase) {
      case 'select_unit': {
        await this.handleSelectUnit();
        break;
      }
      case 'select_movement': {
        await this.handleSelectMovement();
        break;
      }
      case 'select_target': {
        await this.handleSelectTarget();
        break;
      }
      case 'select_weapons': {
        await this.handleSelectWeapons();
        break;
      }
      case 'ai_turn': {
        // AI turn is handled by the store's runAITurn action
        // Triggered via the next-turn or skip action button
        await this.clickActionButton('next-turn').catch(() =>
          this.clickActionButton('skip').catch(() =>
            this.clickActionButton('lock'),
          ),
        );
        break;
      }
      case 'none': {
        // Game hasn't started interactive mode yet or is between phases
        // Try advancing
        await this.clickActionButton('skip').catch(() =>
          this.clickActionButton('next-turn').catch(() => {
            // Ignore - might not have buttons yet
          }),
        );
        break;
      }
      case 'game_over': {
        // Nothing to do
        break;
      }
      default: {
        // Unknown phase - try skip
        await this.clickActionButton('skip').catch(() => {
          // Ignore
        });
      }
    }
  }

  /** Handle select_unit phase - pick a player unit to act with. */
  private async handleSelectUnit(): Promise<void> {
    const state = await this.getState();
    const session = state.session;
    if (!session) return;

    const gamePhase = session.currentState.phase;
    const playerUnits = this.getPlayerUnits(session.currentState.units);

    if (playerUnits.length === 0) {
      // No player units alive - skip/advance
      await this.clickActionButton('skip').catch(() => {});
      return;
    }

    // Pick first living player unit
    const [unitId] = playerUnits[0];

    if (gamePhase === 'movement' || gamePhase === 'weapon_attack') {
      // Click the unit token to select it
      await this.clickUnitToken(unitId);
    } else if (gamePhase === 'end') {
      // End phase - advance to next turn
      await this.clickActionButton('next-turn').catch(() =>
        this.clickActionButton('skip').catch(() => {}),
      );
    } else if (gamePhase === 'heat') {
      // Heat phase - just advance
      await this.clickActionButton('skip').catch(() =>
        this.clickActionButton('lock').catch(() => {}),
      );
    } else if (gamePhase === 'initiative') {
      // Initiative phase - advance
      await this.clickActionButton('skip').catch(() =>
        this.clickActionButton('next-turn').catch(() => {}),
      );
    } else {
      // Unknown game phase, try to advance
      await this.clickActionButton('skip').catch(() => {});
    }
  }

  /** Handle select_movement phase - choose and click a movement hex. */
  private async handleSelectMovement(): Promise<void> {
    const decision = await this.makeMovementDecision();
    if (!decision) {
      // Can't move - skip movement
      await this.clickActionButton('skip').catch(() =>
        this.clickActionButton('lock').catch(() => {}),
      );
      return;
    }

    // Click the target hex to move
    await this.clickHex(decision.targetHex);

    // Wait for phase to change, then check if we need to skip
    await this.page.waitForTimeout(ACTION_DELAY_MS);
  }

  /** Handle select_target phase - click an opponent unit to target. */
  private async handleSelectTarget(): Promise<void> {
    const decision = await this.makeAttackDecision();
    if (!decision) {
      // No valid targets - skip attacks
      await this.clickActionButton('skip').catch(() =>
        this.clickActionButton('lock').catch(() => {}),
      );
      return;
    }

    // Click the target unit token
    await this.clickUnitToken(decision.targetId);
  }

  /** Handle select_weapons phase - select weapons and fire. */
  private async handleSelectWeapons(): Promise<void> {
    const decision = await this.makeAttackDecision();

    if (decision && decision.weaponIds.length > 0) {
      // Toggle each weapon on
      for (const weaponId of decision.weaponIds) {
        await this.clickWeapon(weaponId);
      }
    }

    // Fire weapons via the lock/fire button
    await this.clickActionButton('lock').catch(() =>
      this.clickActionButton('fire').catch(() =>
        this.clickActionButton('skip').catch(() => {}),
      ),
    );
  }

  // ===========================================================================
  // Game Loop
  // ===========================================================================

  /**
   * Play the entire game until completion or timeout.
   *
   * Loops through turns, making movement and attack decisions each turn.
   * Throws an error if the game doesn't complete within 60 seconds.
   *
   * @throws Error if game doesn't complete within GAME_TIMEOUT_MS
   */
  async playGame(): Promise<void> {
    const startTime = Date.now();
    let turnCount = 0;
    const maxTurns = 200; // Safety: prevent infinite loops

    while (turnCount < maxTurns) {
      // Timeout check
      const elapsed = Date.now() - startTime;
      if (elapsed > GAME_TIMEOUT_MS) {
        throw new Error(
          `AgentPlayer: Game did not complete within ${GAME_TIMEOUT_MS / 1000}s ` +
            `(${turnCount} iterations, elapsed: ${elapsed}ms)`,
        );
      }

      // Check game over
      if (await this.isGameOver()) {
        return;
      }

      // Execute one step of gameplay
      await this.playTurn();

      turnCount++;
    }

    throw new Error(
      `AgentPlayer: Exceeded maximum iterations (${maxTurns}) without game completion`,
    );
  }
}
