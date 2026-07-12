import type { IWeapon } from '@/simulation/ai/types';
import type { IWeaponAttack } from '@/types/gameplay/CombatInterfaces';

import { BotPlayer } from '@/simulation/ai/BotPlayer';
import { hasReachedEdge } from '@/simulation/ai/RetreatAI';
import {
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
  createUnitRetreatedEvent,
} from '@/utils/gameplay/gameEvents';
import {
  appendEvent,
  declareMovement,
  lockMovement,
  declareAttack,
  lockAttack,
  declarePhysicalAttack,
  resolveAllPhysicalAttacks,
  type IPhysicalAttackContext,
} from '@/utils/gameplay/gameSession';
import {
  canUnitGoProne,
  getGoProneMpCost,
} from '@/utils/gameplay/gameSessionProne';
import {
  buildMovementEventPath,
  maxMovementCostForCapability,
} from '@/utils/gameplay/movement/eventPath';
import { validateMovement } from '@/utils/gameplay/movement/validation';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import { prepareAttackContext } from './attackContext';
import { toAIUnitState } from './GameEngine.helpers';
import { canUnitAct, canUnitBeTargeted } from './GameEngine.phaseGuards';
import { emitRetreatTriggers } from './GameEngine.retreat';

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

function isGoProneMovementPayload(
  payload: IMovementDeclaredPayload | undefined,
): boolean {
  return payload?.steps?.some((step) => step.kind === 'goProne') ?? false;
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
          isStuck: unit.isStuck ?? false,
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

    // Emit UnitRetreated once the unit reaches its declared retreat edge.
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
  optionalRules?: readonly string[],
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
        undefined,
        {
          calledShots: atkEvt.payload.calledShots,
          teammateCalledShots: atkEvt.payload.teammateCalledShots,
        },
      );

      // Delegate indirect-fire pre-resolution to prepareAttackContext.
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
              undefined,
              optionalRules,
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
        false,
        [],
        null,
        atkEvt.payload.selectedAMSWeaponIds,
      );
    }
    updatedSession = lockAttack(updatedSession, unitId);
  }

  return updatedSession;
}

/** Run autonomous physical attack declarations and resolution. */
export function runPhysicalAttackPhase(input: {
  readonly session: IGameSession;
  readonly botPlayer: BotPlayer;
  readonly weaponsByUnit: Map<string, readonly IWeapon[]>;
  readonly gunneryByUnit: Map<string, number>;
  readonly pilotingByUnit: Map<string, number>;
  readonly d6Roller?: D6Roller;
  readonly grid?: IHexGrid;
}): IGameSession {
  const {
    session,
    botPlayer,
    weaponsByUnit,
    gunneryByUnit,
    pilotingByUnit,
    d6Roller = defaultD6Roller,
    grid,
  } = input;
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

export { runInteractivePhaseAdvance } from './GameEngine.interactivePhase';
