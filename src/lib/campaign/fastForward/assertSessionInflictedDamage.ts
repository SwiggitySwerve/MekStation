/**
 * Session damage invariant guard for the headless campaign fast-forward
 * suites — closes the twice-recurred zero-damage/instant-defeat bug class.
 *
 * Why: commit `5ced64549` (#998) shipped BattleMechs seeded at 0/0 armor
 * and structure (the record-sheet-empty-maps class — both the record
 * sheet AND the damage pipeline read empty maps, so one hit destroyed a
 * unit that should have soaked dozens of points); commit `91104d43a`
 * (#1019) shipped mirrored canonical `unitRef`s colliding in the
 * session-state reducer, so "Defeat by elimination" was declared right
 * after Initiative with ZERO combat events in the log. Both shipped
 * while jest stayed green because no suite watched for "a battle
 * completed but nobody took damage." `assertSessionInflictedDamage` is
 * that standing tripwire — the fast-forward combat runner (task 4.1's
 * one-line wire-in in `fastForwardCombatRunner.ts`) applies it to EVERY
 * completed battle unconditionally.
 *
 * Design D6 (`openspec/changes/add-campaign-fast-forward-api/design.md`)
 * — three failure modes, checked in this order:
 *
 *  (a) **Zero-armor start**: any deployed unit whose starting armor +
 *      structure totals are zero. `IGameUnit.armorByLocation` /
 *      `.structureByLocation` are the construction-time values copied
 *      verbatim into `IUnitGameState.armor` / `.structure` at
 *      `GameCreated` (`utils/gameplay/gameState/initialization.ts:139-140`:
 *      `armor: unit.armorByLocation ? { ...unit.armorByLocation } : {}`)
 *      — so these fields ARE the session's "starting" snapshot, and an
 *      empty/undefined map reproduces the #998 shape exactly. Scoped to
 *      BattleMechs (the only unit type the fast-forward runner's
 *      `buildPreparedBattleData` path constructs today, per design D2)
 *      — non-Mek unit types seed armor/structure through their own
 *      `*Init` blocks and are out of this guard's current scope; a
 *      general event-replay-from-`GameCreated` approach was considered
 *      and rejected as unneeded complexity for that scope (no session
 *      snapshot other than `IGameUnit`'s construction fields is needed
 *      for the guard's actual production use).
 *  (b) **Zero cumulative damage**: every unit's remaining armor +
 *      structure (the derived outcome's `unitDeltas`) equals its
 *      starting totals. This condition trips ALONE, regardless of the
 *      event log — an earlier design draft AND-ed "no damage-bearing
 *      event" into the trip condition, which would have let phantom
 *      damage pass (events present + state untouched satisfies neither
 *      AND-ed clause). When `DamageApplied` events (the canonical
 *      damage-bearing event — fires for weapon fire AND self-damage
 *      sources like ammo explosions/falling/heat alike, per
 *      `IDamageAppliedPayload`'s doc comment) exist alongside the
 *      unchanged deltas, the thrown diagnostics additionally name the
 *      **phantom-damage signature**: because condition (b) already
 *      established every unit's delta is unchanged, ANY `DamageApplied`
 *      event under this branch necessarily targeted an id whose
 *      recorded state never moved — precisely the dual-id-construction
 *      class (#1019 family).
 *  (c) **Unjustified terminal outcome**: a completed session recorded a
 *      terminal outcome with no combat, withdrawal, or concession event
 *      justifying it — the same mechanical predicate
 *      `campaign-combat-loop`'s "Terminal outcomes require justifying
 *      events" scenario states (`openspec/specs/campaign-combat-loop/
 *      spec.md:161-164`). Concession is self-justifying (the `GameEnded`
 *      event's own `reason: 'concede'` IS the concession fact — there is
 *      no separate "concede declared" event type in this codebase).
 *
 * A theoretically legitimate zero-damage turn-limit stalemate WILL trip
 * (b) — that is intentional (design R5: fail loud, then decide; a
 * legitimate trip requires a spec delta to soften, never a silent skip).
 *
 * @module lib/campaign/fastForward/assertSessionInflictedDamage
 */

import type {
  ICombatOutcome,
  IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import type {
  IDamageAppliedPayload,
  IGameSession,
  IGameUnit,
} from '@/types/gameplay';

import { CombatEndReason } from '@/types/combat/CombatOutcome';
import { GameEventType } from '@/types/gameplay';

// =============================================================================
// Event classification
// =============================================================================

/**
 * Event types that represent an actual combat effect (not just a
 * declaration/lock/reveal step) — the justifying-events set for
 * condition (c) and the source of "damage-bearing" events for (b)'s
 * phantom-damage naming. Mirrors the same `event.type === GameEventType.X`
 * narrowing convention `derivePostBattleReport` uses
 * (`utils/gameplay/postBattleReport.ts`).
 */
const COMBAT_EVENT_TYPES: ReadonlySet<GameEventType> = new Set([
  GameEventType.AttackResolved,
  GameEventType.DamageApplied,
  GameEventType.PhysicalAttackResolved,
  GameEventType.CriticalHit,
  GameEventType.CriticalHitResolved,
  GameEventType.UnitDestroyed,
  GameEventType.AmmoExplosion,
  GameEventType.LegAttackResolved,
  GameEventType.VibroClawAttackResolved,
  GameEventType.TrooperKilled,
  GameEventType.SquadEliminated,
]);

/** Withdrawal-family events — the other justifying class for (c). */
const WITHDRAWAL_EVENT_TYPES: ReadonlySet<GameEventType> = new Set([
  GameEventType.WithdrawalDeclared,
  GameEventType.ForcedWithdrawalTriggered,
  GameEventType.UnitRetreated,
  GameEventType.RetreatTriggered,
]);

// =============================================================================
// Diagnostics
// =============================================================================

/** Per-unit starting/remaining armor+structure facts attached to every thrown error. */
export interface SessionDamageDiagnosticUnit {
  readonly unitId: string;
  readonly unitRef: string;
  readonly startingArmor: number;
  readonly startingStructure: number;
  readonly remainingArmor: number;
  readonly remainingStructure: number;
}

export type SessionDamageInvariantReason =
  | 'zero-armor-start'
  | 'zero-cumulative-damage'
  | 'unjustified-terminal-outcome';

/**
 * Thrown by `assertSessionInflictedDamage`. Carries the per-unit
 * diagnostic table (spec: "throws ... with per-unit diagnostics") plus,
 * for the phantom-damage case, the unit ids the phantom `DamageApplied`
 * events named.
 */
export class SessionDamageInvariantError extends Error {
  public readonly reason: SessionDamageInvariantReason;
  public readonly diagnostics: readonly SessionDamageDiagnosticUnit[];
  public readonly phantomDamageUnitIds?: readonly string[];

  constructor(
    message: string,
    reason: SessionDamageInvariantReason,
    diagnostics: readonly SessionDamageDiagnosticUnit[],
    phantomDamageUnitIds?: readonly string[],
  ) {
    super(message);
    this.name = 'SessionDamageInvariantError';
    this.reason = reason;
    this.diagnostics = diagnostics;
    this.phantomDamageUnitIds = phantomDamageUnitIds;
  }
}

/** Sum a location-keyed record — the same shape `sumLocations` uses in `campaignMissionEncounterLaunchIntegrity.test.ts:64-66`. */
function sumLocations(values: Record<string, number> | undefined): number {
  return Object.values(values ?? {}).reduce((sum, value) => sum + value, 0);
}

function formatUnitTotals(
  units: readonly SessionDamageDiagnosticUnit[],
): string {
  return units
    .map(
      (u) =>
        `${u.unitId} (${u.unitRef}): starting=${u.startingArmor + u.startingStructure} (armor ${u.startingArmor} + structure ${u.startingStructure}), remaining=${u.remainingArmor + u.remainingStructure} (armor ${u.remainingArmor} + structure ${u.remainingStructure})`,
    )
    .join('; ');
}

/**
 * Build the per-unit starting/remaining diagnostic table by pairing
 * every `session.units` entry with its matching `outcome.unitDeltas`
 * entry. Throws (a plain, non-`SessionDamageInvariantError`) if a
 * session unit has no matching delta — that is a caller/fixture bug
 * (the outcome was not derived from this session), not a damage bug.
 */
function buildDiagnosticTable(
  session: IGameSession,
  outcome: ICombatOutcome,
): readonly SessionDamageDiagnosticUnit[] {
  const deltasByUnitId = new Map<string, IUnitCombatDelta>(
    outcome.unitDeltas.map((delta) => [delta.unitId, delta]),
  );
  return session.units.map((unit: IGameUnit) => {
    const delta = deltasByUnitId.get(unit.id);
    if (!delta) {
      throw new Error(
        `assertSessionInflictedDamage: session unit ${unit.id} (${unit.unitRef}) has no matching entry in outcome.unitDeltas — outcome ${outcome.matchId} was not derived from this session.`,
      );
    }
    return {
      unitId: unit.id,
      unitRef: unit.unitRef,
      startingArmor: sumLocations(
        unit.armorByLocation as Record<string, number> | undefined,
      ),
      startingStructure: sumLocations(
        unit.structureByLocation as Record<string, number> | undefined,
      ),
      remainingArmor: sumLocations(
        delta.armorRemaining as Record<string, number>,
      ),
      remainingStructure: sumLocations(
        delta.internalsRemaining as Record<string, number>,
      ),
    };
  });
}

// =============================================================================
// Guard
// =============================================================================

/**
 * Standing tripwire applied to every completed fast-forward battle
 * unconditionally (design D6). Throws `SessionDamageInvariantError` on
 * any of the three failure modes documented above; returns normally on
 * a healthy battle.
 *
 * @param session - the completed `IGameSession` the battle produced
 * @param outcome - `deriveCombatOutcome(session, ...)`'s result for the
 *   same session (unit ids must line up 1:1 with `session.units`)
 */
export function assertSessionInflictedDamage(
  session: IGameSession,
  outcome: ICombatOutcome,
): void {
  const diagnostics = buildDiagnosticTable(session, outcome);

  // (a) Zero-armor start — the #998 record-sheet-empty-maps class.
  const zeroStartUnits = diagnostics.filter(
    (d) => d.startingArmor + d.startingStructure === 0,
  );
  if (zeroStartUnits.length > 0) {
    throw new SessionDamageInvariantError(
      `assertSessionInflictedDamage: battle ${outcome.matchId} has ${zeroStartUnits.length} deployed unit(s) that started combat with zero total armor and structure (the #998 record-sheet-empty-maps class) — ${formatUnitTotals(zeroStartUnits)}.`,
      'zero-armor-start',
      zeroStartUnits,
    );
  }

  // (b) Zero cumulative damage — trips ALONE, never AND-ed with the
  // event log (design D6: an earlier draft's conjunction would have let
  // phantom damage pass).
  const allUnitsUnchanged = diagnostics.every(
    (d) =>
      d.remainingArmor + d.remainingStructure ===
      d.startingArmor + d.startingStructure,
  );
  if (allUnitsUnchanged) {
    const damageEvents = session.events.filter(
      (event) =>
        event.type === GameEventType.DamageApplied &&
        (event.payload as IDamageAppliedPayload).damage > 0,
    );
    if (damageEvents.length > 0) {
      // Every unit's delta is unchanged (established above), so every
      // one of these damage events necessarily names an id whose
      // recorded state never moved — the phantom-damage signature.
      const phantomDamageUnitIds = Array.from(
        new Set(
          damageEvents.map(
            (event) => (event.payload as IDamageAppliedPayload).unitId,
          ),
        ),
      );
      throw new SessionDamageInvariantError(
        `assertSessionInflictedDamage: battle ${outcome.matchId} inflicted zero cumulative damage — every unit's remaining armor+structure equals its starting totals, regardless of the event log. PHANTOM-DAMAGE SIGNATURE: ${damageEvents.length} DamageApplied event(s) reference unit id(s) [${phantomDamageUnitIds.join(', ')}] that never mutated unit state — the dual-id-construction class (#1019 family). Damage events present is never absolution for unchanged deltas.`,
        'zero-cumulative-damage',
        diagnostics,
        phantomDamageUnitIds,
      );
    }
    throw new SessionDamageInvariantError(
      `assertSessionInflictedDamage: battle ${outcome.matchId} inflicted zero cumulative damage — every unit's remaining armor+structure equals its starting totals and the event log contains no damage-bearing events — ${formatUnitTotals(diagnostics)}.`,
      'zero-cumulative-damage',
      diagnostics,
    );
  }

  // (c) Unjustified terminal outcome — the #1019 shape, applied
  // mechanically per `campaign-combat-loop`'s "Terminal outcomes require
  // justifying events" scenario. Concession is self-justifying via the
  // outcome's own end reason (the `GameEnded` event's `reason: 'concede'`
  // IS the concession fact).
  const hasCombatEvent = session.events.some((event) =>
    COMBAT_EVENT_TYPES.has(event.type),
  );
  const hasWithdrawalEvent = session.events.some((event) =>
    WITHDRAWAL_EVENT_TYPES.has(event.type),
  );
  const isConcession = outcome.endReason === CombatEndReason.Concede;
  if (!hasCombatEvent && !hasWithdrawalEvent && !isConcession) {
    throw new SessionDamageInvariantError(
      `assertSessionInflictedDamage: battle ${outcome.matchId} recorded a terminal outcome (endReason=${outcome.endReason}) with no preceding combat, withdrawal, or concession events in the session log (the #1019 unjustified-terminal-outcome class).`,
      'unjustified-terminal-outcome',
      diagnostics,
    );
  }
}
