/**
 * Match Terminal State — engine-layer match outcome taxonomy.
 *
 * Authored under `add-combat-fidelity-suite` Phase 0.5 ("Closed-set
 * hygiene"). See:
 *   - openspec/changes/add-combat-fidelity-suite/specs/after-combat-report/spec.md
 *   - openspec/changes/add-combat-fidelity-suite/design.md (D8, D9)
 *
 * Distinct from the ACAR statistical layer's
 * `'victory' | 'defeat' | 'draw'` taxonomy used in `Scenario Resolution`
 * and from the `winner: 'player' | 'opponent' | 'draw' | null` field
 * already on `ISimulationResult`. This is the engine's per-match
 * terminal classification — both taxonomies coexist.
 */

/**
 * Closed snake_case set — exactly one value per match.
 *
 *  - `player_victory`       — opfor wiped (destroyed/withdrawn/forfeit) while player has ≥1 operational unit
 *  - `opfor_victory`        — symmetric to player_victory
 *  - `mutual_destruction`   — every unit on both sides destroyed (NOT withdrawn)
 *  - `draw`                 — neither side meets victory conditions and neither voluntarily exits (objective-based)
 *  - `timeout`              — match reached `MAX_TURNS` ceiling with operational units on both sides
 *  - `forfeit`              — a side voluntarily concedes
 *  - `withdrawal`           — a side voluntarily retreats off-map
 */
export type MatchTerminalState =
  | 'player_victory'
  | 'opfor_victory'
  | 'draw'
  | 'mutual_destruction'
  | 'timeout'
  | 'forfeit'
  | 'withdrawal';

/**
 * Inputs the determination function consumes. Kept dependency-free so
 * tests can synthesise fixtures without spinning up an `IGameState`.
 */
export interface IMatchTerminalStateInputs {
  /** Number of player units operational at match end. */
  readonly playerSurvivors: number;
  /** Number of opfor units operational at match end. */
  readonly opforSurvivors: number;
  /** Total starting roster — used to detect mutual_destruction (zero/zero with non-trivial start). */
  readonly playerRosterSize: number;
  /** Total starting roster on opfor side. */
  readonly opforRosterSize: number;
  /** Turns elapsed at match end. */
  readonly turnsElapsed: number;
  /** Engine ceiling — defaults to MAX_TURNS=100 from SimulationRunnerConstants. */
  readonly maxTurns: number;
  /** True when at least one unit on either side voluntarily withdrew off-map. */
  readonly hadWithdrawal?: boolean;
  /** True when one side issued a forfeit/concede command. */
  readonly hadForfeit?: boolean;
}

/**
 * Pure deterministic classifier. Order of precedence (high → low):
 *
 *  1. forfeit — explicit concede command beats every other classification
 *  2. withdrawal — voluntary retreat takes precedence over destruction
 *     of remaining units
 *  3. mutual_destruction — both sides at zero survivors AND both started
 *     with at least one unit
 *  4. player_victory / opfor_victory — one side eliminated, the other
 *     still has units
 *  5. timeout — turns reached the ceiling with units alive on both sides
 *  6. draw — fall-through (objective-based scenarios end here)
 *
 * Pure: no side effects, no event emission. Callers in the runner are
 * responsible for stitching this into `ISimulationRunResult`. Conservation
 * invariants asserted in
 * `src/simulation/runner/__tests__/matchTerminalState.test.ts`.
 */
export function determineMatchTerminalState(
  inputs: IMatchTerminalStateInputs,
): MatchTerminalState {
  const {
    playerSurvivors,
    opforSurvivors,
    playerRosterSize,
    opforRosterSize,
    turnsElapsed,
    maxTurns,
    hadWithdrawal = false,
    hadForfeit = false,
  } = inputs;

  // 1. Explicit concede beats everything else — the side that forfeited
  //    chose to end the match irrespective of unit counts.
  if (hadForfeit) {
    return 'forfeit';
  }

  // 2. Voluntary retreat ends the match before "destruction"
  //    classification kicks in — the withdrawing side preserved units.
  if (hadWithdrawal) {
    return 'withdrawal';
  }

  // 3. Both sides eliminated to zero. Guard against the degenerate case
  //    where one side started empty (treated as a draw, not mutual destruction).
  if (
    playerSurvivors === 0 &&
    opforSurvivors === 0 &&
    playerRosterSize > 0 &&
    opforRosterSize > 0
  ) {
    return 'mutual_destruction';
  }

  // 4. One-sided eliminations.
  if (opforSurvivors === 0 && playerSurvivors > 0) {
    return 'player_victory';
  }
  if (playerSurvivors === 0 && opforSurvivors > 0) {
    return 'opfor_victory';
  }

  // 5. Engine turn ceiling reached with operational units on both sides.
  //    Caller passes `maxTurns` (typically `MAX_TURNS = 100`).
  if (turnsElapsed >= maxTurns) {
    return 'timeout';
  }

  // 6. Fall-through — neither side eliminated, no timeout, no exit.
  //    Objective-based scenarios that end on objective resolution land
  //    here.
  return 'draw';
}
