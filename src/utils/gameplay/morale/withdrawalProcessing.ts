/**
 * Combat morale + withdrawal session processing.
 *
 * Engine-facing helpers that thread the three new event types onto a
 * live `IGameSession`:
 *
 *   - `applyMoralePass` — emits the `MoraleShifted` events the combat
 *     log implies but has not yet recorded.
 *   - `applyForcedWithdrawalCheck` — the end-of-phase Forced Withdrawal
 *     check; emits `WithdrawalDeclared` + `ForcedWithdrawalTriggered`
 *     for every eligible unit when the scenario rule is on.
 *   - `applyWithdrawalEdgeExits` — emits `UnitRetreated` for any
 *     withdrawing OR retreating unit that has reached its target edge.
 *     This generalizes the previously bot-only edge check (design D6).
 *   - `declarePlayerWithdrawal` — the player-facing withdrawal action.
 *
 * Each function is pure with respect to the session: it returns the
 * next `IGameSession`. They reuse the existing `appendEvent` +
 * `RetreatAI.hasReachedEdge` machinery — no parallel retreat code path
 * (design D6).
 *
 * @spec openspec/changes/add-combat-morale-and-withdrawal/spec.md
 */

import { hasReachedEdge } from '@/simulation/ai/RetreatAI';
import { type IGameSession } from '@/types/gameplay';
import {
  createForcedWithdrawalTriggeredEvent,
  createUnitRetreatedEvent,
  createWithdrawalDeclaredEvent,
} from '@/utils/gameplay/gameEvents';
import { appendEvent } from '@/utils/gameplay/gameSession';

import { collectForcedWithdrawals } from './forcedWithdrawal';
import { buildMissingMoraleEvents } from './moraleEvaluation';

/**
 * Run the in-battle morale pass. Appends every `MoraleShifted` event
 * the combat-event log implies but has not yet recorded. Idempotent —
 * a second call appends nothing because the missing-suffix is empty.
 *
 * Stamps the new events with the session's current turn + phase.
 */
export function applyMoralePass(session: IGameSession): IGameSession {
  const { turn, phase } = session.currentState;
  let updated = session;
  // `buildMissingMoraleEvents` derives the full suffix in one shot, but
  // we re-derive after each append so the next event's `from` level
  // reflects the prior shift. The suffix shrinks by one each iteration.
  for (;;) {
    const missing = buildMissingMoraleEvents(
      updated.id,
      updated.events,
      turn,
      phase,
    );
    if (missing.length === 0) break;
    updated = appendEvent(updated, missing[0]);
  }
  return updated;
}

/**
 * Run the end-of-phase Forced Withdrawal check. When the scenario
 * config has `forcedWithdrawal` enabled, every unit whose side morale
 * is broken — or that is crippled — and is not already withdrawing is
 * flagged: a `ForcedWithdrawalTriggered` event records the reason and
 * a paired `WithdrawalDeclared` (`declaredBy: 'forced'`) latches
 * `isWithdrawing` + the unit's target edge.
 *
 * When `forcedWithdrawal` is off the function is a no-op — nothing is
 * withdrawn, units fight to destruction (spec scenario "Rule disabled
 * leaves units fighting").
 *
 * `resolveEdgeFor` picks the target edge for a unit — the engine
 * supplies a bot-style edge resolver. When it returns `null` the unit
 * is skipped (no edge to head toward).
 */
export function applyForcedWithdrawalCheck(
  session: IGameSession,
  resolveEdgeFor: (
    unitId: string,
  ) => 'north' | 'south' | 'east' | 'west' | null,
): IGameSession {
  if (!session.config.forcedWithdrawal) {
    return session;
  }

  let updated = session;
  // `collectForcedWithdrawals` already excludes units that are already
  // withdrawing / retreating, so a unit is never withdrawn twice.
  const eligible = collectForcedWithdrawals(updated.currentState);
  for (const { unitId, reason } of eligible) {
    const edge = resolveEdgeFor(unitId);
    if (edge === null) continue;
    const { turn, phase } = updated.currentState;

    updated = appendEvent(
      updated,
      createForcedWithdrawalTriggeredEvent(
        updated.id,
        updated.events.length,
        turn,
        phase,
        unitId,
        reason,
      ),
    );
    updated = appendEvent(
      updated,
      createWithdrawalDeclaredEvent(
        updated.id,
        updated.events.length,
        turn,
        phase,
        unitId,
        edge,
        'forced',
      ),
    );
  }
  return updated;
}

/**
 * Emit `UnitRetreated` for any unit that is withdrawing or retreating
 * and has reached its locked target edge. Generalizes the bot-only
 * edge check: a unit flagged by `isWithdrawing` (player declaration or
 * forced withdrawal) and a unit flagged by `isRetreating` (bot damage
 * trigger) both converge here.
 *
 * Idempotent — a unit that has already emitted `UnitRetreated`
 * (`hasRetreated`) is skipped, and `applyUnitRetreated` short-circuits
 * on re-entry. A destroyed unit never retreats: if `UnitDestroyed`
 * fired first, `destroyed` is true and this function skips it (the
 * first-event-wins discriminator, design D7).
 */
export function applyWithdrawalEdgeExits(session: IGameSession): IGameSession {
  let updated = session;
  for (const unitId of Object.keys(updated.currentState.units)) {
    const unit = updated.currentState.units[unitId];
    if (!unit) continue;
    if (unit.destroyed) continue;
    if (unit.hasRetreated) continue;
    if (unit.hasEjected) continue;
    if (!unit.isWithdrawing && !unit.isRetreating) continue;
    if (!unit.retreatTargetEdge) continue;
    if (
      !hasReachedEdge(
        unit.position,
        unit.retreatTargetEdge,
        updated.config.mapRadius,
      )
    ) {
      continue;
    }
    const { turn, phase } = updated.currentState;
    updated = appendEvent(
      updated,
      createUnitRetreatedEvent(
        updated.id,
        updated.events.length,
        turn,
        phase,
        unitId,
        unit.retreatTargetEdge,
      ),
    );
  }
  return updated;
}

/**
 * The player-facing withdrawal action. A human player declares
 * withdrawal for a unit they own, choosing the target map `edge`. Emits
 * a `WithdrawalDeclared` event (`declaredBy: 'player'`) — the reducer
 * latches `isWithdrawing` + `retreatTargetEdge`, after which the unit
 * is routed through the same edge-ward exit machinery the bot uses.
 *
 * Returns the unchanged session when:
 *   - the unit id is unknown,
 *   - the unit is destroyed or has already retreated,
 *   - the unit is already withdrawing (the declaration is sticky — the
 *     player cannot re-declare or cancel).
 */
export function declarePlayerWithdrawal(
  session: IGameSession,
  unitId: string,
  edge: 'north' | 'south' | 'east' | 'west',
): IGameSession {
  const unit = session.currentState.units[unitId];
  if (!unit) return session;
  if (unit.destroyed || unit.hasRetreated || unit.hasEjected) return session;
  if (unit.isWithdrawing) return session;

  const { turn, phase } = session.currentState;
  return appendEvent(
    session,
    createWithdrawalDeclaredEvent(
      session.id,
      session.events.length,
      turn,
      phase,
      unitId,
      edge,
      'player',
    ),
  );
}
