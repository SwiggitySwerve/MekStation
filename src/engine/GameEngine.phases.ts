import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { hasReachedEdge, resolveEdge } from '@/simulation/ai/RetreatAI';
import {
  GamePhase,
  LockState,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  RangeBracket,
  type IHexCoordinate,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import {
  type D6Roller,
  type DiceRoller,
  defaultD6Roller,
} from '@/utils/gameplay/diceTypes';
import { determineArc } from '@/utils/gameplay/firingArcs';
import {
  createRetreatTriggeredEvent,
  createUnitRetreatedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  rollInitiative,
  advancePhase,
  appendEvent,
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
import { coordToKey, hexDistance } from '@/utils/gameplay/hexMath';
import {
  hullDownLegWeaponBlockedReason,
  hullDownVehicleFrontWeaponBlockedReason,
  isRepresentedVehicleAttacker,
} from '@/utils/gameplay/hullDownRestrictions';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import {
  applyForcedWithdrawalCheck,
  applyMoralePass,
  applyWithdrawalEdgeExits,
} from '@/utils/gameplay/morale';
import { buildPhysicalElevationContext } from '@/utils/gameplay/physicalAttacks/elevation';
import { buildPhysicalTerrainContext } from '@/utils/gameplay/physicalAttacks/terrain';
import { getWeaponRangeBracket } from '@/utils/gameplay/range';
import {
  gameUnitUsesMekHorizontalCover,
  gameUnitUsesMekWaterCover,
  getTargetCoverInfo,
} from '@/utils/gameplay/terrainCover';
import { calculateTargetTerrainModifierFromHex } from '@/utils/gameplay/toHit';
import { weaponPassesRepresentedWaterAttackRules } from '@/utils/gameplay/underwaterAttacks';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';
import { weaponMountCoversTargetArc } from '@/utils/gameplay/weaponMountArcs';

import { prepareAttackContext } from './attackContext';
import { toAIUnitState } from './GameEngine.helpers';
import { applyInteractiveSessionMovement } from './InteractiveSession.actions';

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

/**
 * Per `wire-bot-ai-helpers-and-capstone`: default attacker tonnage
 * shared with `SimulationRunnerConstants` (65t). Catalog data isn't
 * plumbed through to the engine yet — Phase 2 will swap this for a
 * per-unit lookup.
 */
const DEFAULT_ATTACKER_TONNAGE = 65;
/** Default piloting skill when no `IGameUnit` lookup is available. */
const DEFAULT_PILOTING_SKILL = 5;

const ATTACK_RANGE_BRACKET_RANK: Readonly<Record<RangeBracket, number>> = {
  [RangeBracket.Short]: 0,
  [RangeBracket.Medium]: 1,
  [RangeBracket.Long]: 2,
  [RangeBracket.Extreme]: 3,
  [RangeBracket.OutOfRange]: 4,
};

function bestAttackRangeBracket(
  range: number,
  weaponAttacks: readonly IWeaponAttack[],
): RangeBracket {
  if (weaponAttacks.length === 0) return RangeBracket.Short;

  return weaponAttacks.reduce<RangeBracket>((best, weapon) => {
    const bracket = getWeaponRangeBracket(range, {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      extreme: weapon.extremeRange,
      minimum: weapon.minRange,
    });
    return ATTACK_RANGE_BRACKET_RANK[bracket] < ATTACK_RANGE_BRACKET_RANK[best]
      ? bracket
      : best;
  }, RangeBracket.OutOfRange);
}

function isWeaponInRange(weapon: IWeaponAttack, range: number): boolean {
  return (
    getWeaponRangeBracket(range, {
      short: weapon.shortRange,
      medium: weapon.mediumRange,
      long: weapon.longRange,
      extreme: weapon.extremeRange,
      minimum: weapon.minRange,
    }) !== RangeBracket.OutOfRange
  );
}

function weaponCoversTargetArc(
  weapon: IWeaponAttack,
  targetArc: ReturnType<typeof determineArc>['arc'],
): boolean {
  return weaponMountCoversTargetArc(weapon, targetArc);
}

function indirectInterveningTerrainEffects({
  session,
  grid,
  targetHex,
  indirectFireResolution,
}: {
  readonly session: IGameSession;
  readonly grid: IHexGrid;
  readonly targetHex: IHexCoordinate;
  readonly indirectFireResolution?: IIndirectFireResolution;
}): ReturnType<typeof calculateLOS>['interveningTerrainEffects'] {
  if (
    indirectFireResolution?.permitted !== true ||
    indirectFireResolution.isIndirect !== true ||
    !indirectFireResolution.spotterId
  ) {
    return [];
  }

  const spotter = session.currentState.units[indirectFireResolution.spotterId];
  if (!spotter) return [];
  return calculateLOS(spotter.position, targetHex, grid)
    .interveningTerrainEffects;
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
    if (unit.destroyed) continue;
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
      updatedSession = applyInteractiveSessionMovement({
        session: updatedSession,
        grid,
        movementByUnit,
        unitId,
        to: moveEvt.payload.to,
        facing: moveEvt.payload.facing as Facing,
        movementType: moveEvt.payload.movementType,
      });
    }
    if (
      updatedSession.currentState.units[unitId]?.lockState !== LockState.Locked
    ) {
      updatedSession = lockMovement(updatedSession, unitId);
    }

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

    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const enemies = allAIUnits.filter(
      (a) =>
        !a.destroyed &&
        updatedSession.currentState.units[a.unitId].side !== unit.side,
    );

    const atkEvt = botPlayer.playAttackPhase(aiUnit, enemies);
    if (atkEvt) {
      const weaponAttacks: IWeaponAttack[] = buildWeaponAttacks(
        atkEvt.payload.weapons,
        weapons,
        unitId,
      );

      const targetUnit =
        updatedSession.currentState.units[atkEvt.payload.targetId];
      const targetHex = targetUnit?.position;
      const attackRange = targetHex ? hexDistance(unit.position, targetHex) : 3;
      const targetArc =
        targetHex && attackRange > 0
          ? determineArc(
              {
                unitId,
                coord: unit.position,
                facing: unit.facing,
                prone: false,
              },
              targetHex,
            ).arc
          : null;
      const rangeAndArcWeaponAttacks =
        targetArc === null
          ? []
          : weaponAttacks.filter(
              (weapon) =>
                isWeaponInRange(weapon, attackRange) &&
                weaponCoversTargetArc(weapon, targetArc),
            );
      const attackerGameUnit = updatedSession.units.find(
        (entry) => entry.id === unitId,
      );
      const attackerIsRepresentedVehicle = isRepresentedVehicleAttacker({
        unitType: attackerGameUnit?.unitType,
        combatStateKind: unit.combatState?.kind,
      });
      const usableWeaponAttacks =
        grid && targetHex
          ? rangeAndArcWeaponAttacks.filter(
              (weapon) =>
                weaponPassesRepresentedWaterAttackRules({
                  grid,
                  attackerPosition: unit.position,
                  targetPosition: targetHex,
                  weapon,
                }) &&
                !hullDownLegWeaponBlockedReason(unit.hullDown, weapon) &&
                !hullDownVehicleFrontWeaponBlockedReason(
                  unit.hullDown,
                  attackerIsRepresentedVehicle,
                  weapon,
                ),
            )
          : rangeAndArcWeaponAttacks.filter(
              (weapon) =>
                !hullDownLegWeaponBlockedReason(unit.hullDown, weapon) &&
                !hullDownVehicleFrontWeaponBlockedReason(
                  unit.hullDown,
                  attackerIsRepresentedVehicle,
                  weapon,
                ),
            );
      const attackRangeBracket = bestAttackRangeBracket(
        attackRange,
        usableWeaponAttacks,
      );
      if (
        usableWeaponAttacks.length === 0 ||
        attackRangeBracket === RangeBracket.OutOfRange
      ) {
        updatedSession = lockAttack(updatedSession, unitId);
        continue;
      }
      const attackPreResolution =
        grid && targetHex && targetUnit && usableWeaponAttacks.length > 0
          ? prepareAttackContext(
              unitId,
              usableWeaponAttacks.map((weapon) => weapon.weaponId),
              atkEvt.payload.targetId,
              updatedSession.currentState,
              grid,
            )
          : undefined;
      const indirectFireResolution: IIndirectFireResolution | undefined =
        attackPreResolution?.kind === 'indirect'
          ? attackPreResolution.resolution
          : undefined;
      const targetPartialCover =
        grid && targetHex
          ? getTargetCoverInfo(grid, unit.position, targetHex, {
              horizontalCoverEligible: gameUnitUsesMekHorizontalCover(
                updatedSession.units.find(
                  (entry) => entry.id === atkEvt.payload.targetId,
                ),
              ),
              targetHexWaterCoverEligible: gameUnitUsesMekWaterCover(
                updatedSession.units.find(
                  (entry) => entry.id === atkEvt.payload.targetId,
                ),
              ),
            }).partialCover
          : false;
      const targetTerrainModifier =
        grid && targetHex
          ? calculateTargetTerrainModifierFromHex(
              grid.hexes.get(coordToKey(targetHex)),
            )
          : null;
      const directLos =
        grid && targetHex
          ? calculateLOS(unit.position, targetHex, grid)
          : undefined;
      // Arc is computed inside resolveAttack at resolve time.
      updatedSession = declareAttack(
        updatedSession,
        unitId,
        atkEvt.payload.targetId,
        usableWeaponAttacks,
        attackRange,
        attackRangeBracket,
        attackPreResolution,
        targetHex,
        targetPartialCover,
        directLos?.hasLOS
          ? directLos.interveningTerrainEffects
          : grid && targetHex
            ? indirectInterveningTerrainEffects({
                session: updatedSession,
                grid,
                targetHex,
                indirectFireResolution,
              })
            : [],
        targetTerrainModifier,
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
    if (unit.destroyed) continue;

    const weapons = weaponsByUnit.get(unitId) ?? [];
    const gunnery = gunneryByUnit.get(unitId) ?? 4;
    const aiUnit = toAIUnitState(unit, weapons, gunnery);
    const enemies = allAIUnits.filter(
      (a) =>
        !a.destroyed &&
        updatedSession.currentState.units[a.unitId].side !== unit.side,
    );

    const physEvt = botPlayer.playPhysicalAttackPhase(aiUnit, enemies);
    if (physEvt) {
      const piloting = pilotingByUnit.get(unitId) ?? DEFAULT_PILOTING_SKILL;
      const targetState =
        updatedSession.currentState.units[physEvt.payload.targetId] ?? null;
      const attackerBinding = updatedSession.units.find(
        (entry) => entry.id === physEvt.payload.attackerId,
      );
      const targetBinding = updatedSession.units.find(
        (entry) => entry.id === physEvt.payload.targetId,
      );
      updatedSession = declarePhysicalAttack(
        updatedSession,
        physEvt.payload.attackerId,
        physEvt.payload.targetId,
        physEvt.payload.attackType,
        {
          attackerTonnage: DEFAULT_ATTACKER_TONNAGE,
          pilotingSkill: piloting,
          hexesMoved: unit.hexesMovedThisTurn,
          attackerUnitType: attackerBinding?.unitType,
          attackerMovementMode: attackerBinding?.movementMode,
          optionalRules: updatedSession.config.optionalRules,
          targetUnitType: targetBinding?.unitType,
          elevationContext:
            grid && targetState
              ? buildPhysicalElevationContext(unit, targetState, grid)
              : undefined,
          terrainContext:
            grid && targetState
              ? buildPhysicalTerrainContext(unit, targetState, grid)
              : undefined,
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
      hexesMoved: u.hexesMovedThisTurn,
      attackerMovementMode: updatedSession.units.find((unit) => unit.id === uid)
        ?.movementMode,
      optionalRules: updatedSession.config.optionalRules,
    });
  }
  // Per `add-quick-resolve-monte-carlo`: thread the seeded roller into
  // physical-attack resolution so Monte Carlo batches stay deterministic.
  updatedSession = resolveAllPhysicalAttacks(
    updatedSession,
    contextMap,
    toDiceRoller(d6Roller),
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
