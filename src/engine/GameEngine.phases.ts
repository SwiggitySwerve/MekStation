import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import {
  GamePhase,
  LockState,
  type IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  Facing,
  RangeBracket,
  type IHexGrid,
  type IMovementCapability,
} from '@/types/gameplay/HexGridInterfaces';
import { createRetreatTriggeredEvent } from '@/utils/gameplay/gameEvents';
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
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import { toAIUnitState } from './GameEngine.helpers';

/**
 * Per `wire-bot-ai-helpers-and-capstone`: default attacker tonnage
 * shared with `SimulationRunnerConstants` (65t). Catalog data isn't
 * plumbed through to the engine yet — Phase 2 will swap this for a
 * per-unit lookup.
 */
const DEFAULT_ATTACKER_TONNAGE = 65;
/** Default piloting skill when no `IGameUnit` lookup is available. */
const DEFAULT_PILOTING_SKILL = 5;

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
      updatedSession = declareMovement(
        updatedSession,
        unitId,
        unit.position,
        moveEvt.payload.to,
        moveEvt.payload.facing as Facing,
        moveEvt.payload.movementType,
        moveEvt.payload.mpUsed,
        moveEvt.payload.heatGenerated,
      );
    }
    updatedSession = lockMovement(updatedSession, unitId);
  }

  return updatedSession;
}

export function runAttackPhase(
  session: IGameSession,
  botPlayer: BotPlayer,
  weaponsByUnit: Map<string, readonly IWeapon[]>,
  gunneryByUnit: Map<string, number>,
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

      // Arc is computed inside resolveAttack at resolve time.
      updatedSession = declareAttack(
        updatedSession,
        unitId,
        atkEvt.payload.targetId,
        weaponAttacks,
        3,
        RangeBracket.Short,
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
      updatedSession = declarePhysicalAttack(
        updatedSession,
        physEvt.payload.attackerId,
        physEvt.payload.targetId,
        physEvt.payload.attackType,
        {
          attackerTonnage: DEFAULT_ATTACKER_TONNAGE,
          pilotingSkill: piloting,
          hexesMoved: unit.hexesMovedThisTurn,
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
    });
  }
  updatedSession = resolveAllPhysicalAttacks(updatedSession, contextMap);

  return updatedSession;
}

export function runInteractivePhaseAdvance(
  session: IGameSession,
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
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.PhysicalAttack) {
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.Heat) {
    updatedSession = resolveHeatPhase(updatedSession);
    updatedSession = advancePhase(updatedSession);
  } else if (phase === GamePhase.End) {
    updatedSession = advancePhase(updatedSession);
  }

  return updatedSession;
}
