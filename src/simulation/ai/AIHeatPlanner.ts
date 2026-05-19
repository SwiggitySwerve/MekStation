/**
 * AI Heat Planner — multi-turn heat projection.
 *
 * Per `add-ai-resource-planning` design D1: the legacy bot's heat model is
 * one turn deep — `AttackAI.applyHeatBudget` trims the fire list so projected
 * heat fits `safeHeatThreshold` for the *current* turn and stops there. It
 * cannot see that two more turns of the same fire list shut the unit down.
 *
 * `projectHeat` projects the unit's heat curve across a configurable
 * lookahead window, assuming the candidate fire list repeats each turn, and
 * reports the first turn (if any) at which projected heat crosses the
 * shutdown-risk ceiling. `AttackAI` consults the planner: if a shutdown is
 * predicted inside the window, the effective heat budget is lowered so the
 * curve flattens. The single-turn `applyHeatBudget` stays as the inner trim;
 * the planner wraps it with a forward-looking ceiling.
 *
 * This module is a pure deterministic function of numeric heat state — it
 * never consumes `SeededRandom`, so SimulationRunner seed sequences stay
 * stable (design D6).
 *
 * @spec openspec/changes/add-ai-resource-planning/specs/simulation-system/spec.md
 *   Requirement: Multi-Turn Heat Projection
 */

/**
 * The shutdown-risk ceiling, in BattleTech heat points.
 *
 * Per the canonical heat scale, automatic-shutdown rolls begin at heat 14
 * (heat 14: shutdown on 4+, climbing to an automatic shutdown at 30). The
 * planner treats 14 as the ceiling the projected curve must not cross — the
 * point at which the unit is at material risk of being taken out of the
 * fight by its own heat. This is intentionally distinct from
 * `IBotBehavior.safeHeatThreshold` (default 13, the +1-to-hit penalty
 * threshold the single-turn trim targets): the planner guards against
 * *shutdown*, the single-turn trim guards against *to-hit penalties*.
 */
export const SHUTDOWN_RISK_HEAT = 14;

/**
 * The result of a multi-turn heat projection.
 */
export interface IHeatProjection {
  /**
   * Projected heat at the end of each turn in the lookahead window. Index
   * `0` is the end of the first projected turn. The array length equals the
   * `lookaheadTurns` argument (empty when `lookaheadTurns <= 0`).
   */
  readonly perTurnHeat: readonly number[];
  /**
   * First turn index (0-based, into `perTurnHeat`) at which a shutdown risk
   * is predicted — projected heat at or above `SHUTDOWN_RISK_HEAT` — or `-1`
   * when the candidate fire list is sustainable across the whole window.
   */
  readonly shutdownRiskTurn: number;
}

/** An empty projection — returned when projection is disabled or skipped. */
const EMPTY_PROJECTION: IHeatProjection = {
  perTurnHeat: [],
  shutdownRiskTurn: -1,
};

/**
 * Project a unit's heat curve across a lookahead window.
 *
 * The projection assumes the candidate fire list (and movement) repeats each
 * turn: every turn adds `perTurnHeatGenerated` and removes `dissipation`,
 * starting from `currentHeat`. Heat is floored at `0` — a unit cannot carry
 * negative heat. The first turn projected heat reaches `SHUTDOWN_RISK_HEAT`
 * is reported as `shutdownRiskTurn`.
 *
 * Pure and deterministic — a function of its numeric arguments only.
 *
 * @param currentHeat          the unit's heat right now (before this turn)
 * @param dissipation          heat sinks' per-turn dissipation capacity
 * @param perTurnHeatGenerated heat the candidate fire list + movement adds
 *                             each turn
 * @param lookaheadTurns       how many turns to project; `<= 0` disables
 *                             projection and returns an empty result
 */
export function projectHeat(
  currentHeat: number,
  dissipation: number,
  perTurnHeatGenerated: number,
  lookaheadTurns: number,
): IHeatProjection {
  // `lookaheadTurns <= 0` is the `Green`/`Regular` inert path — projection
  // is skipped entirely and the caller falls back to the single-turn trim.
  if (lookaheadTurns <= 0) {
    return EMPTY_PROJECTION;
  }

  const perTurnHeat: number[] = [];
  let shutdownRiskTurn = -1;

  // Walk the window turn by turn. Each turn applies the net heat delta
  // (generated minus dissipated) and floors the result at zero — a unit's
  // heat track does not go negative.
  let heat = Math.max(0, currentHeat);
  for (let turn = 0; turn < lookaheadTurns; turn++) {
    heat = Math.max(0, heat + perTurnHeatGenerated - dissipation);
    perTurnHeat.push(heat);
    if (shutdownRiskTurn === -1 && heat >= SHUTDOWN_RISK_HEAT) {
      shutdownRiskTurn = turn;
    }
  }

  return { perTurnHeat, shutdownRiskTurn };
}

/**
 * Compute the effective heat budget `AttackAI` should pass to the single-turn
 * `applyHeatBudget` trim, given a multi-turn projection.
 *
 * When the projection predicts a shutdown inside the window, the budget is
 * lowered toward a *sustainable* ceiling — the heat level at which the next
 * turn's fired heat no longer exceeds dissipation, so the curve flattens
 * instead of climbing. The proximity of the predicted shutdown blends the
 * two: an imminent (next-turn) shutdown pulls the budget all the way to the
 * sustainable ceiling; a distant one only nudges it part-way, because the
 * per-turn `applyHeatBudget` re-trim has more turns to correct the curve.
 *
 * The single-turn `applyHeatBudget` keeps `currentHeat + movementHeat +
 * firedHeat <= budget`. The sustainable ceiling is therefore
 * `currentHeat + movementHeat + dissipation` — at that budget the fired
 * heat cannot exceed what the unit sheds each turn, and the curve is flat.
 *
 * When no shutdown is predicted, the original budget passes through
 * unchanged. The budget is never lowered below zero or below the heat
 * already on the track.
 *
 * Pure and deterministic.
 *
 * @param baseBudget   the single-turn `safeHeatThreshold` the caller would
 *                     otherwise use
 * @param projection   the result of `projectHeat`
 * @param currentHeat  the unit's heat right now — sets the floor so the
 *                     budget is never trimmed below what is already on the
 *                     track
 * @param dissipation  the unit's per-turn heat dissipation — defines the
 *                     sustainable ceiling the budget is pulled toward
 * @param movementHeat heat already committed to movement this turn — folds
 *                     into the sustainable ceiling so the single-turn trim's
 *                     accounting lines up
 */
export function effectiveHeatBudget(
  baseBudget: number,
  projection: IHeatProjection,
  currentHeat: number,
  dissipation = 0,
  movementHeat = 0,
): number {
  // No predicted shutdown — the single-turn trim is sufficient.
  if (projection.shutdownRiskTurn < 0) {
    return baseBudget;
  }

  const floor = Math.max(0, currentHeat);

  // The sustainable ceiling: a budget at or below which the single-turn
  // trim leaves `firedHeat <= dissipation`, so the multi-turn curve is flat.
  const sustainableBudget = Math.max(
    floor,
    currentHeat + movementHeat + dissipation,
  );

  // If the base budget is already sustainable there is nothing to do — the
  // shutdown was predicted from a fire list the single-turn trim will cull
  // on its own.
  if (baseBudget <= sustainableBudget) {
    return baseBudget;
  }

  // Blend between the base budget (distant risk) and the sustainable ceiling
  // (imminent risk). `proximityScale` is 1 for a next-turn shutdown and
  // shrinks each turn the shutdown is further out.
  const riskTurn = projection.shutdownRiskTurn;
  const proximityScale = 1 / (riskTurn + 1);
  const blended =
    baseBudget - proximityScale * (baseBudget - sustainableBudget);

  return Math.max(floor, blended);
}

/**
 * Compute the effective single-turn heat budget for an attack, applying the
 * A2 multi-turn projection in one call.
 *
 * When `lookaheadTurns` is `0` the base budget passes through unchanged (the
 * `Green`/`Regular` inert path). Otherwise the heat curve is projected
 * assuming the candidate fire list repeats each turn, and the budget is
 * lowered via `effectiveHeatBudget` if a shutdown is predicted in the window.
 *
 * This is the high-level entry point `AttackAI` / `BotPlayer` calls — it
 * folds `projectHeat` + `effectiveHeatBudget` into a single deterministic
 * function so callers do not re-implement the two-step dance.
 */
export function planEffectiveThreshold(
  baseBudget: number,
  currentHeat: number,
  dissipation: number,
  perTurnHeatGenerated: number,
  movementHeat: number,
  lookaheadTurns: number,
): number {
  if (lookaheadTurns <= 0) {
    return baseBudget;
  }
  const projection = projectHeat(
    currentHeat,
    dissipation,
    perTurnHeatGenerated,
    lookaheadTurns,
  );
  return effectiveHeatBudget(
    baseBudget,
    projection,
    currentHeat,
    dissipation,
    movementHeat,
  );
}
