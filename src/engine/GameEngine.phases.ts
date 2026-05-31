import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { hasReachedEdge, resolveEdge } from '@/simulation/ai/RetreatAI';
import {
  GamePhase,
  LockState,
  type IMovementDeclaredPayload,
  type IGameSession,
  type IUnitGameState,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  RangeBracket,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  type D6Roller,
  type DiceRoller,
  defaultD6Roller,
} from '@/utils/gameplay/diceTypes';
import {
  createGoProneMovementDeclaredEvent,
  createRetreatTriggeredEvent,
  createUnitRetreatedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  rollInitiative,
  advancePhase,
  appendEvent,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  resolveAllAttacks,
  resolveHeatPhase,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  checkAndQueueDamagePSRs,
  resolvePendingPSRs,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';
import {
  canUnitGoProne,
  getGoProneMpCost,
} from '@/utils/gameplay/gameSessionProne';
import { getGridTerrainHeatEffect } from '@/utils/gameplay/heat';
import {
  applyForcedWithdrawalCheck,
  applyMoralePass,
  applyWithdrawalEdgeExits,
} from '@/utils/gameplay/morale';
import {
  buildMovementEventPath,
  maxMovementCostForCapability,
} from '@/utils/gameplay/movement/eventPath';
import { validateMovement } from '@/utils/gameplay/movement/validation';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import { prepareAttackContext } from './attackContext';
import { toAIUnitState } from './GameEngine.helpers';

/**
 * Adapt a single-d6 roller into the 2d6 `DiceRoller` shape used by
 * combat resolution helpers. Centralizes the conversion so callers only
 * need to wire one PRNG-backed function.
 */
function toDiceRoller(d6: D6Roller): DiceRoller {
  return () => {
    const die1 = d6();
    const die2 = d6();
    const total = die1 + die2;
    return {
      dice: [die1, die2] as const,
      total,
      isSnakeEyes: total === 2,
      isBoxcars: total === 12,
    };
  };
}

function elevationDifferenceBetween(
  grid: IHexGrid | undefined,
  attacker: IUnitGameState,
  target: IUnitGameState | undefined,
): number {
  if (!grid || !target) return 0;
  const attackerHex = grid.hexes.get(
    `${attacker.position.q},${attacker.position.r}`,
  );
  const targetHex = grid.hexes.get(`${target.position.q},${target.position.r}`);
  return (targetHex?.elevation ?? 0) - (attackerHex?.elevation ?? 0);
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: default attacker tonnage
 * shared with `SimulationRunnerConstants` (65t). Catalog data isn't
 * plumbed through to the engine yet — Phase 2 will swap this for a
 * per-unit lookup.
 */
const DEFAULT_ATTACKER_TONNAGE = 65;
/** Default piloting skill when no `IGameUnit` lookup is available. */
const DEFAULT_PILOTING_SKILL = 5;

function canUnitAct(unit: IUnitGameState): boolean {
  return (
    !unit.destroyed &&
    !unit.shutdown &&
    !unit.hasRetreated &&
    !unit.hasEjected &&
    unit.pilotConscious
  );
}

function canUnitBeTargeted(unit: IUnitGameState): boolean {
  return !unit.destroyed && !unit.hasRetreated && !unit.hasEjected;
}

function isGoProneMovementPayload(
  payload: IMovementDeclaredPayload | undefined,
): boolean {
  return payload?.steps?.some((step) => step.kind === 'goProne') ?? false;
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: invoke the bot's retreat
 * evaluator for each living unit and append any RetreatTriggered
 * events to the session before the phase body runs. Idempotent —
 * `evaluateRetreat` returns null once a unit's `isRetreating` latch
 * is set.
 */
function emitRetreatTriggers(
  session: IGameSession,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  gunneryByUnit: Map<string, number>,
): IGameSession {
  let updated = session;
  for (const unitId of Object.keys(updated.currentState.units)) {
    const unit = updated.currentState.units[unitId];
    if (!canUnitAct(unit)) continue;
    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const evt = botPlayer.evaluateRetreat(aiUnit, updated);
    if (!evt) continue;
    const sequence = updated.events.length;
    const { turn, phase } = updated.currentState;
    updated = appendEvent(
      updated,
      createRetreatTriggeredEvent(
        updated.id,
        sequence,
        turn,
        phase,
        evt.payload.unitId,
        evt.payload.edge,
        evt.payload.reason,
      ),
    );
  }
  return updated;
}

export function runMovementPhase(
  session: IGameSession,
  grid: IHexGrid,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  movementByUnit: Map<string, IMovementCapability>,
  gunneryByUnit: Map<string, number>,
): IGameSession {
  // Per `wire-bot-ai-helpers-and-capstone`: evaluate retreat BEFORE
  // any movement so the move scorer sees `isRetreating: true` when
  // picking destinations.
  let updatedSession = emitRetreatTriggers(
    session,
    botPlayer,
    weaponsByUnit,
    gunneryByUnit,
  );

  for (const unitId of Object.keys(updatedSession.currentState.units)) {
    const unit = updatedSession.currentState.units[unitId];
    if (unit.destroyed) {
      updatedSession = lockMovement(updatedSession, unitId);
      continue;
    }
    if (!canUnitAct(unit)) continue;

    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const cap = movementByUnit.get(unitId) ?? {
      walkMP: 4,
      runMP: 6,
      jumpMP: 0,
    };
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const moveEvt = botPlayer.playMovementPhase(aiUnit, grid, cap);

    if (moveEvt) {
      if (isGoProneMovementPayload(moveEvt.payload)) {
        if (canUnitGoProne(unit)) {
          updatedSession = appendEvent(
            updatedSession,
            createGoProneMovementDeclaredEvent(
              updatedSession.id,
              updatedSession.events.length,
              updatedSession.currentState.turn,
              unitId,
              unit.position,
              unit.facing,
              getGoProneMpCost(unit),
            ),
          );
        }
        updatedSession = lockMovement(updatedSession, unitId);
        continue;
      }

      const validation = validateMovement(
        grid,
        {
          unitId,
          coord: unit.position,
          facing: unit.facing,
          prone: unit.prone ?? false,
        },
        moveEvt.payload.to,
        moveEvt.payload.facing as Facing,
        moveEvt.payload.movementType,
        cap,
        unit.heat,
        undefined,
        { pilotAbilities: unit.abilities },
      );
      if (!validation.valid) {
        updatedSession = lockMovement(updatedSession, unitId);
        continue;
      }

      const eventPath = buildMovementEventPath({
        grid,
        from: unit.position,
        to: moveEvt.payload.to,
        movementType: moveEvt.payload.movementType,
        maxCost: Math.min(
          validation.mpCost,
          maxMovementCostForCapability(cap, moveEvt.payload.movementType),
        ),
        movementContext: { pilotAbilities: unit.abilities },
      });
      updatedSession = declareMovement(
        updatedSession,
        unitId,
        unit.position,
        moveEvt.payload.to,
        moveEvt.payload.facing as Facing,
        moveEvt.payload.movementType,
        validation.mpCost,
        validation.heatGenerated,
        eventPath,
      );
    }
    updatedSession = lockMovement(updatedSession, unitId);

    // Per `add-bot-retreat-behavior` § 7.2–7.3: after the unit locks in
    // its movement, check whether the new position touches the locked
    // retreat edge. If so, emit `UnitRetreated` — the reducer latches
    // `hasRetreated: true` (distinct from `destroyed`) so the victory
    // predicate can distinguish withdrawal from combat destruction.
    //
    // Idempotent: `applyUnitRetreated` short-circuits on re-entry, and
    // the guard below also prevents re-emission within the same phase.
    const postMoveUnit = updatedSession.currentState.units[unitId];
    if (
      postMoveUnit &&
      !postMoveUnit.destroyed &&
      !postMoveUnit.hasEjected &&
      postMoveUnit.isRetreating &&
      !postMoveUnit.hasRetreated &&
      postMoveUnit.retreatTargetEdge
    ) {
      if (
        hasReachedEdge(
          postMoveUnit.position,
          postMoveUnit.retreatTargetEdge,
          updatedSession.config.mapRadius,
        )
      ) {
        const sequence = updatedSession.events.length;
        const { turn, phase } = updatedSession.currentState;
        updatedSession = appendEvent(
          updatedSession,
          createUnitRetreatedEvent(
            updatedSession.id,
            sequence,
            turn,
            phase,
            unitId,
            postMoveUnit.retreatTargetEdge,
          ),
        );
      }
    }
  }

  return updatedSession;
}

export function runAttackPhase(
  session: IGameSession,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  gunneryByUnit: Map<string, number>,
  // Wave 8 PR-K5: optional grid for indirect-fire LOS + spotter election.
  // When omitted, the bot's attack-phase loop behaves identically to its
  // pre-K5 contract — no indirect-fire dispatch.
  grid?: IHexGrid,
): IGameSession {
  // Per `wire-bot-ai-helpers-and-capstone`: re-evaluate retreat — a
  // unit might have crossed the threshold from damage taken during
  // movement (e.g., charge / DFA) or stale crits.
  let updatedSession = emitRetreatTriggers(
    session,
    botPlayer,
    weaponsByUnit,
    gunneryByUnit,
  );

  const allAIUnits = Object.keys(updatedSession.currentState.units).map(
    (uid) => {
      const u = updatedSession.currentState.units[uid];
      const w = weaponsByUnit.get(uid) ?? [];
      const g = gunneryByUnit.get(uid) ?? 4;
      return toAIUnitState(u, w, g);
    },
  );

  for (const unitId of Object.keys(updatedSession.currentState.units)) {
    const unit = updatedSession.currentState.units[unitId];
    if (unit.destroyed) {
      updatedSession = lockAttack(updatedSession, unitId);
      continue;
    }
    if (!canUnitAct(unit)) continue;

    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const enemies = allAIUnits.filter(
      (a) =>
        canUnitBeTargeted(updatedSession.currentState.units[a.unitId]) &&
        updatedSession.currentState.units[a.unitId].side !== unit.side,
    );

    const atkEvt = botPlayer.playAttackPhase(aiUnit, enemies);
    if (atkEvt) {
      const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
        atkEvt.payload.weapons,
        weapons,
        unitId,
        {
          calledShots: atkEvt.payload.calledShots,
          teammateCalledShots: atkEvt.payload.teammateCalledShots,
        },
      );

      // Wave 8 PR-K5/K11: delegate indirect-fire pre-resolution to
      // prepareAttackContext. The returned IAttackPreResolution union
      // threads straight through declareAttack (accepts either shape).
      const targetUnit =
        updatedSession.currentState.units[atkEvt.payload.targetId];
      const targetHex = targetUnit?.position;
      const attackPreResolution =
        grid && targetHex && targetUnit
          ? prepareAttackContext(
              unitId,
              atkEvt.payload.weapons,
              atkEvt.payload.targetId,
              updatedSession.currentState,
              grid,
            )
          : undefined;

      // Arc is computed inside resolveAttack at resolve time.
      updatedSession = declareAttack(
        updatedSession,
        unitId,
        atkEvt.payload.targetId,
        weaponAttacks,
        3,
        RangeBracket.Short,
        attackPreResolution,
        targetHex,
      );
    }
    updatedSession = lockAttack(updatedSession, unitId);
  }

  return updatedSession;
}

/**
 * Per `wire-bot-ai-helpers-and-capstone`: autonomous-mode physical
 * attack phase. For each living bot-controlled unit, ask the bot
 * for a melee declaration, then resolve all declarations via
 * `resolveAllPhysicalAttacks`. Mirrors the weapon-attack pattern.
 */
export function runPhysicalAttackPhase(
  session: IGameSession,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  gunneryByUnit: Map<string, number>,
  pilotingByUnit: Map<string, number>,
  d6Roller: D6Roller = defaultD6Roller,
  grid?: IHexGrid,
): IGameSession {
  let updatedSession = session;

  const allAIUnits = Object.keys(updatedSession.currentState.units).map(
    (uid) => {
      const u = updatedSession.currentState.units[uid];
      const w = weaponsByUnit.get(uid) ?? [];
      const g = gunneryByUnit.get(uid) ?? 4;
      return toAIUnitState(u, w, g);
    },
  );

  for (const unitId of Object.keys(updatedSession.currentState.units)) {
    const unit = updatedSession.currentState.units[unitId];
    if (!canUnitAct(unit)) continue;

    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const enemies = allAIUnits.filter(
      (a) =>
        canUnitBeTargeted(updatedSession.currentState.units[a.unitId]) &&
        updatedSession.currentState.units[a.unitId].side !== unit.side,
    );

    const physEvt = botPlayer.playPhysicalAttackPhase(aiUnit, enemies);
    if (physEvt) {
      const piloting = pilotingByUnit.get(unitId) ?? DEFAULT_PILOTING_SKILL;
      const targetUnit =
        updatedSession.currentState.units[physEvt.payload.targetId];
      updatedSession = declarePhysicalAttack(
        updatedSession,
        physEvt.payload.attackerId,
        physEvt.payload.targetId,
        physEvt.payload.attackType,
        {
          attackerTonnage: DEFAULT_ATTACKER_TONNAGE,
          pilotingSkill: piloting,
          hasTSM: unit.hasTSM ?? false,
          hexesMoved: unit.hexesMovedThisTurn,
          isUnderwater:
            grid !== undefined &&
            (waterDepthAtPosition(grid, unit.position) > 0 ||
              (targetUnit
                ? waterDepthAtPosition(grid, targetUnit.position) > 0
                : false)),
          pilotAbilities: unit.abilities,
          unitQuirks: unit.unitQuirks,
          elevationDifference: elevationDifferenceBetween(
            grid,
            unit,
            targetUnit,
          ),
          targetMovementComplete: true,
        },
      );
    }
  }

  // Build the per-attacker context map for resolution.
  const contextMap = new Map<string, IPhysicalAttackContext>();
  for (const [uid, u] of Object.entries(updatedSession.currentState.units)) {
    contextMap.set(uid, {
      attackerTonnage: DEFAULT_ATTACKER_TONNAGE,
      pilotingSkill: pilotingByUnit.get(uid) ?? DEFAULT_PILOTING_SKILL,
      hasTSM: u.hasTSM ?? false,
      hexesMoved: u.hexesMovedThisTurn,
      targetMovementComplete: true,
      isUnderwater:
        grid !== undefined ? waterDepthAtPosition(grid, u.position) > 0 : false,
      pilotAbilities: u.abilities,
      unitQuirks: u.unitQuirks,
    });
  }
  // Per `add-quick-resolve-monte-carlo`: thread the seeded roller into
  // physical-attack resolution so Monte Carlo batches stay deterministic.
  updatedSession = resolveAllPhysicalAttacks(
    updatedSession,
    contextMap,
    toDiceRoller(d6Roller),
    grid,
  );

  return updatedSession;
}

export function runInteractivePhaseAdvance(
  session: IGameSession,
  grid?: IHexGrid,
): IGameSession {
  let updatedSession = session;
  const { phase } = updatedSession.currentState;

  if (phase === GamePhase.Initiative) {
    updatedSession = rollInitiative(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.Movement) {
    for (const unitId of Object.keys(updatedSession.currentState.units)) {
      const u = updatedSession.currentState.units[unitId];
      if (
        u.lockState !== LockState.Locked &&
        u.lockState !== LockState.Resolved
      ) {
        updatedSession = lockMovement(updatedSession, unitId);
      }
    }
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.WeaponAttack) {
    for (const unitId of Object.keys(updatedSession.currentState.units)) {
      const u = updatedSession.currentState.units[unitId];
      if (
        u.lockState !== LockState.Locked &&
        u.lockState !== LockState.Resolved
      ) {
        updatedSession = lockAttack(updatedSession, unitId);
      }
    }
    updatedSession = resolveAllAttacks(updatedSession);
    // Per `wire-piloting-skill-rolls` task 2.1 + TW p.51: damage-driven
    // PSRs are queued at end of weapon phase (when `damageThisPhase` is
    // final). Resolution happens in the End phase so heat + physical
    // phase mods land first.
    updatedSession = checkAndQueueDamagePSRs(updatedSession);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.PhysicalAttack) {
    // Per `wire-piloting-skill-rolls` § 5: physical-attack triggers
    // (kick / charge / DFA / push hit-or-miss) are enqueued by the
    // physical-attack resolver. Any additional damage-driven PSRs from
    // physical damage are captured here before the phase advances.
    updatedSession = checkAndQueueDamagePSRs(updatedSession);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.Heat) {
    // Per `wire-heat-generation-and-effects` task 5: when a `grid`
    // is available, pass a water-depth resolver so flooded hexes
    // dissipate +2 / +4. Legacy callers that omit `grid` get zero
    // bonus — back-compat preserved.
    const heatOptions =
      grid !== undefined
        ? {
            getWaterDepth: (
              unitId: string,
              _position: import('@/types/gameplay').IHexCoordinate,
            ) => {
              const unit = updatedSession.currentState.units[unitId];
              return unit ? waterDepthAtPosition(grid, unit.position) : 0;
            },
            getEnvironmentHeatEffect: (
              unitId: string,
              _position: import('@/types/gameplay').IHexCoordinate,
            ) => {
              const unit = updatedSession.currentState.units[unitId];
              return unit ? getGridTerrainHeatEffect(grid, unit.position) : 0;
            },
          }
        : undefined;
    updatedSession = resolveHeatPhase(updatedSession, undefined, heatOptions);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.End) {
    // Per `wire-piloting-skill-rolls` § 7: drain the queue at end of
    // turn. `resolvePendingPSRs` rolls 2d6 vs TN for each entry, emits
    // `PSRResolved`, and on failure invokes `applyFall` → emits
    // `UnitFell` + `PilotHit`.
    updatedSession = resolvePendingPSRs(updatedSession);
    updatedSession = runEngineMoraleAndWithdrawalPass(updatedSession);
    updatedSession = advancePhase(updatedSession);
  }

  return updatedSession;
}

/**
 * Per `add-combat-morale-and-withdrawal`: run the in-battle morale pass,
 * the Forced Withdrawal check, and the withdrawal edge-exits at the end
 * of a phase. Mirrors `InteractiveSession.phases.runMoraleAndWithdrawalPass`
 * — the forced-withdrawal edge resolver heads each unit toward its
 * nearest map edge via the bot's existing `RetreatAI.resolveEdge`.
 */
function runEngineMoraleAndWithdrawalPass(session: IGameSession): IGameSession {
  let next = applyMoralePass(session);
  next = applyForcedWithdrawalCheck(next, (unitId) => {
    const unit = next.currentState.units[unitId];
    if (!unit) return null;
    return resolveEdge(
      { retreatEdge: 'nearest' } as Parameters<typeof resolveEdge>[0],
      unit.position,
      next.config.mapRadius,
    );
  });
  next = applyWithdrawalEdgeExits(next);
  return next;
}
