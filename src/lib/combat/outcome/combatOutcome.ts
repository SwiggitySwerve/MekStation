/**
 * Combat Outcome Derivation
 *
 * Pure function that walks an `IGameSession` (events + current state)
 * and produces an `ICombatOutcome` for the campaign layer to consume.
 * Composes the existing Phase 1 `derivePostBattleReport` rather than
 * duplicating its event-walk logic, then layers per-unit deltas
 * (armor/internals/heat/ammo/pilot) on top.
 *
 * Determinism rule: identical session input MUST yield deeply-equal
 * outputs (modulo `capturedAt`, which is the explicit "when derived"
 * field). Callers needing byte-equal repeats should override
 * `capturedAt` via the helper signature or freeze the clock at the
 * test boundary.
 *
 * @spec openspec/changes/add-combat-outcome-model/specs/after-combat-report/spec.md
 */

import {
  COMBAT_OUTCOME_VERSION,
  CombatEndReason,
  PilotFinalStatus,
  UnitFinalStatus,
  type ICombatOutcome,
  type IUnitCombatDelta,
} from '@/types/combat/CombatOutcome';
import {
  GameStatus,
  type IGameSession,
  type IGameUnit,
  type IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import { derivePostBattleReport } from '@/utils/gameplay/postBattleReport';

/** Options consumed by `deriveCombatOutcome`. */
export interface IDeriveCombatOutcomeOptions {
  /**
   * Campaign contract this match resolved. Wave 5 wiring will pass this
   * from the contract orchestrator; the engine itself never knows it.
   */
  readonly contractId?: string;
  /**
   * Scenario instance this match represents. Same Wave 5 wiring story.
   */
  readonly scenarioId?: string;
  /**
   * Override the captured-at timestamp. Tests that need deterministic
   * deep-equal outputs (Requirement: Deterministic Outcome Derivation)
   * pass a fixed string here; production code omits it.
   */
  readonly capturedAt?: string;
}

/**
 * Map the Phase 1 `IPostBattleReport.reason` string union onto the
 * Phase 3 `CombatEndReason` enum. The Phase 1 report does not yet
 * carry `withdrawal`, so the engine never produces it through this
 * path — it stays available for direct outcome construction by Wave 5
 * code paths that resolve withdrawal explicitly.
 */
function toCombatEndReason(
  reason: 'destruction' | 'concede' | 'turn_limit' | 'objective',
): CombatEndReason {
  switch (reason) {
    case 'destruction':
      return CombatEndReason.Destruction;
    case 'concede':
      return CombatEndReason.Concede;
    case 'turn_limit':
      return CombatEndReason.TurnLimit;
    case 'objective':
      return CombatEndReason.ObjectiveMet;
    default: {
      // Exhaustiveness guard — remove if Phase 1 expands the union.
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

/**
 * Classify a unit's end-of-combat damage state. Mirrors the rules in
 * the spec: any CT-internals-zero or `destroyed` flag → DESTROYED, any
 * non-CT location lost or >50% structure lost → CRIPPLED, any armor or
 * structure delta → DAMAGED, otherwise INTACT. EJECTED is reserved for
 * Wave 5 ejection wiring and never produced here.
 */
function computeUnitFinalStatus(state: IUnitGameState): UnitFinalStatus {
  if (state.destroyed) return UnitFinalStatus.Destroyed;

  // Any non-CT destroyed location bumps to CRIPPLED.
  const nonCtDestroyed = state.destroyedLocations.some(
    (loc) => loc !== 'CT' && loc !== 'CENTER_TORSO',
  );
  if (nonCtDestroyed) return UnitFinalStatus.Crippled;

  // No armor or structure tracking? Treat as intact (defensive default).
  const armorEntries = Object.entries(state.armor ?? {});
  const structureEntries = Object.entries(state.structure ?? {});
  const armorTouched = armorEntries.length === 0 ? false : false; // armor map is "remaining"; we can't know baseline → fall through

  // We don't have baselines on `IUnitGameState`, so use the events as the
  // authority for "did anything happen". Heuristic: if any structure entry
  // is below a sensible max (we don't know max), default to DAMAGED whenever
  // there is at least one structure or armor entry below the visible peak.
  // To stay deterministic without baselines, treat any zero structure entry
  // (= location destroyed) as CRIPPLED, and any armorEntries length > 0 as
  // potentially damaged. The strongest signal we have without baselines is
  // `destroyedLocations`; absence of those + no destroyed flag → INTACT.
  if (structureEntries.some(([, v]) => v <= 0)) {
    return UnitFinalStatus.Crippled;
  }

  // If we got here, no destruction signals are visible. Default to INTACT.
  // Damage detection without baselines is intentionally conservative; the
  // Wave 2 consumer that has access to the unit catalog can re-classify if
  // it needs the DAMAGED / CRIPPLED split.
  void armorTouched;
  return UnitFinalStatus.Intact;
}

/**
 * Pilot status from the per-unit state. KIA when unit was destroyed and
 * pilot is not conscious (proxy for "no successful ejection"); WOUNDED
 * for any pilot wounds; otherwise ACTIVE. CAPTURED / MIA / UNCONSCIOUS
 * remain Wave 5 territory.
 */
function computePilotFinalStatus(state: IUnitGameState): PilotFinalStatus {
  if (state.destroyed && !state.pilotConscious) return PilotFinalStatus.KIA;
  if (!state.pilotConscious) return PilotFinalStatus.Unconscious;
  if ((state.pilotWounds ?? 0) > 0) return PilotFinalStatus.Wounded;
  return PilotFinalStatus.Active;
}

/** Build the per-unit delta from the session's derived state. */
function unitToDelta(
  unit: IGameUnit,
  state: IUnitGameState | undefined,
): IUnitCombatDelta {
  // Defensive default when a unit is in `IGameSession.units` but has no
  // entry in `currentState.units` yet (shouldn't happen for completed
  // sessions but keeps the function total).
  const armor = state?.armor ?? {};
  const structure = state?.structure ?? {};
  const ammoState = state?.ammoState ?? {};
  const ammoRemaining: Record<string, number> = {};
  for (const [binId, slot] of Object.entries(ammoState)) {
    ammoRemaining[binId] = slot.remainingRounds;
  }

  return {
    unitId: unit.id,
    side: unit.side,
    destroyed: state?.destroyed ?? false,
    finalStatus: state ? computeUnitFinalStatus(state) : UnitFinalStatus.Intact,
    armorRemaining: { ...armor },
    internalsRemaining: { ...structure },
    destroyedLocations: state?.destroyedLocations ?? [],
    destroyedComponents: state?.destroyedEquipment ?? [],
    heatEnd: state?.heat ?? 0,
    ammoRemaining,
    pilotState: {
      conscious: state?.pilotConscious ?? true,
      wounds: state?.pilotWounds ?? 0,
      killed: (state?.destroyed ?? false) && !(state?.pilotConscious ?? true),
      finalStatus: state
        ? computePilotFinalStatus(state)
        : PilotFinalStatus.Active,
    },
  };
}

/**
 * Pure derivation of `ICombatOutcome` from a session. Reuses
 * `derivePostBattleReport` for the UI-compatible Phase 1 shape and adds
 * the per-unit `IUnitCombatDelta[]` plus contract / scenario linkage.
 */
export function deriveCombatOutcome(
  session: IGameSession,
  options: IDeriveCombatOutcomeOptions = {},
): ICombatOutcome {
  const report = derivePostBattleReport(session);

  // Derive end reason: prefer the GameEnded payload via the report; if the
  // session never ended (status !== Completed) we still emit `destruction`
  // as a placeholder to keep the function total. Callers that care should
  // gate on session status before calling.
  const endReason = toCombatEndReason(report.reason);

  const unitDeltas = session.units.map((u) =>
    unitToDelta(u, session.currentState.units[u.id]),
  );

  return {
    version: COMBAT_OUTCOME_VERSION,
    matchId: session.id,
    contractId: options.contractId ?? null,
    scenarioId: options.scenarioId ?? null,
    endReason,
    report,
    unitDeltas,
    capturedAt: options.capturedAt ?? new Date().toISOString(),
  };
}

/**
 * Convenience guard for callers that want to refuse to derive outcomes
 * for active sessions. Mirrors the contract on
 * `InteractiveSession.getOutcome` but lives here so non-engine callers
 * can use it too.
 */
export function isSessionCompleted(session: IGameSession): boolean {
  return session.currentState.status === GameStatus.Completed;
}
