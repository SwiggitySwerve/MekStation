import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution';

import {
  CombatLocation,
  GameEventType,
  GamePhase,
  IGameEvent,
  IGameState,
  IHexCoordinate,
  IHexGrid,
  IMovementCapability,
  IPendingPSR,
  type IPhysicalDominoStepOutDecisionPayload,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import {
  TerrainType,
  type ITerrainFeature,
} from '@/types/gameplay/TerrainTypes';
import { resolvePilotConsciousnessCheck } from '@/utils/gameplay/damage';
import { createPSRTriggeredEvent } from '@/utils/gameplay/gameEvents/statusChecks';
import {
  firedWeaponIdsFromMountedArm,
  firedWeaponIdsFromMountedLeg,
} from '@/utils/gameplay/gameSessionPhysicalHelpers';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { parseTerrainFeatures } from '@/utils/gameplay/lineOfSight';
import {
  applyJumpJetCriticalDamage,
  applyPartialWingJumpBonus,
} from '@/utils/gameplay/movement/calculations';
import {
  chooseBestPhysicalAttack,
  computePushDisplacement,
  BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
  IPhysicalAttackInput,
  type PhysicalAttackINarcPodSelection,
  type PhysicalAttackLimb,
  isPhysicalAirborneVtolOrWigeTarget,
  isTargetDirectlyAhead,
  isTargetInFrontArc,
  isValidDisplacement,
  isZweihanderPhysicalAttackType,
  physicalTargetObjectTypeForUnitType,
  PhysicalAttackType,
  resolveDfaMissFallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
  resolvePhysicalAttack,
  sourceContainsGroundedDropShip,
  splitPhysicalDamageIntoClusters,
  thrashBlockingTerrainsForHexTerrain,
  translateHex,
} from '@/utils/gameplay/physicalAttacks';
import {
  createBuildingCollapsePSR,
  createEnteringWaterPSR,
  createExitingWaterPSR,
  createIcePSR,
  createRubblePSR,
  createSwampBogDownPSR,
} from '@/utils/gameplay/pilotingSkillRolls';
import { removeEquivalentINarcPod } from '@/utils/gameplay/specialWeaponMechanics';
import {
  calculateAttackerMovementModifier,
  calculateTMM,
} from '@/utils/gameplay/toHit/movementModifiers';
import { waterDepthAtPosition } from '@/utils/gameplay/waterDepth';

import type { IAIPlayer } from '../../ai/IAIPlayer';

import { SeededRandom } from '../../core/SeededRandom';
import { InvariantRunner } from '../../invariants/InvariantRunner';
import { IViolation } from '../../invariants/types';
import {
  DEFAULT_COMPONENT_DAMAGE,
  LETHAL_PILOT_WOUNDS,
  DEFAULT_PILOTING,
  DEFAULT_TONNAGE,
} from '../SimulationRunnerConstants';
import { toAIUnitState } from '../SimulationRunnerSupport';
import { applyRepresentedMinefieldEntryDamage } from './movementMines';
import {
  applyPhysicalDamageClusterLocations,
  applyDfaAttackerLegDamage,
  applyPhysicalCriticalHits,
  applyPhysicalDamageClusters,
} from './physicalAttackDamage';
import {
  applyPhysicalDisplacementsToGrid,
  computePhysicalDisplacementOutcome,
  displaceUnit,
  elevationDifferenceBetween,
} from './physicalAttackDisplacement';
import {
  applyImpossibleDisplacementDestruction,
  emitPhysicalAttackDeclaredEvent,
  emitPhysicalAttackResolvedEvent,
} from './physicalAttackEvents';
import {
  attackerHitPSRForAttack,
  attackerMissPSRForAttack,
  dominoEffectPSRForDisplacement,
  queuePendingPSR,
  targetPSRForAttack,
} from './physicalAttackPsr';
import {
  appendUnitDestroyedEvent,
  createD6Roller,
  createGameEvent,
} from './utils';

export function applyGrappleState(
  state: IGameState,
  attackerId: string,
  targetId: string,
): IGameState {
  const attacker = state.units[attackerId];
  const target = state.units[targetId];
  if (!attacker || !target) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [attackerId]: {
        ...attacker,
        grappledUnitId: targetId,
        isGrappleAttacker: true,
        grappledThisRound: true,
        grappleSide: 'both',
        position: target.position,
      },
      [targetId]: {
        ...target,
        grappledUnitId: attackerId,
        isGrappleAttacker: false,
        grappledThisRound: true,
        grappleSide: 'both',
        facing: ((attacker.facing + 3) % 6) as typeof target.facing,
      },
    },
  };
}

export function facingToward(
  source: IGameState['units'][string]['position'],
  destination: IGameState['units'][string]['position'],
  fallback: IGameState['units'][string]['facing'],
): IGameState['units'][string]['facing'] {
  for (let facing = 0; facing < 6; facing++) {
    const translated = translateHex(source, facing as typeof fallback);
    if (translated.q === destination.q && translated.r === destination.r) {
      return facing as typeof fallback;
    }
  }
  return fallback;
}

export function applyBreakGrappleState(options: {
  readonly state: IGameState;
  readonly attackerId: string;
  readonly targetId: string;
  readonly displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[];
}): IGameState {
  const { attackerId, displacements, state, targetId } = options;
  const attacker = state.units[attackerId];
  const target = state.units[targetId];
  if (!attacker || !target) return state;

  const attackerMoved = displacements.some(
    (displacement) =>
      displacement.reason === 'break-grapple' &&
      displacement.unitId === attackerId,
  );
  const targetMoved = displacements.some(
    (displacement) =>
      displacement.reason === 'break-grapple' &&
      displacement.unitId === targetId,
  );

  return {
    ...state,
    units: {
      ...state.units,
      [attackerId]: {
        ...attacker,
        grappledUnitId: undefined,
        isGrappleAttacker: undefined,
        grappledThisRound: false,
        grappleSide: undefined,
        isChainWhipGrappled: false,
        facing: attackerMoved
          ? facingToward(attacker.position, target.position, attacker.facing)
          : attacker.facing,
      },
      [targetId]: {
        ...target,
        grappledUnitId: undefined,
        isGrappleAttacker: undefined,
        grappledThisRound: false,
        grappleSide: undefined,
        isChainWhipGrappled: false,
        facing: targetMoved
          ? facingToward(target.position, attacker.position, target.facing)
          : target.facing,
      },
    },
  };
}

export function markUnitFallenAfterDfaMiss(
  state: IGameState,
  unitId: string,
  newFacing: IGameState['units'][string]['facing'],
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        prone: true,
        facing: newFacing,
        pendingPSRs: [],
      },
    },
  };
}

export function applyDfaMissFallPilotDamage(options: {
  readonly state: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly unitId: string;
  readonly pilotDamage: number;
  readonly d6Roller: () => number;
}): IGameState {
  const { d6Roller, events, gameId, pilotDamage, state, unitId } = options;
  if (pilotDamage <= 0) {
    return state;
  }

  const unit = state.units[unitId];
  if (!unit) {
    return state;
  }

  const totalWounds = unit.pilotWounds + pilotDamage;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    pilotDamage,
    unit.abilities ?? [],
    d6Roller,
    unit.pilotToughness,
    {
      edgePointsRemaining: unit.edgePointsRemaining,
      turn: state.turn,
      unitId,
    },
  );
  const pilotConscious =
    totalWounds < LETHAL_PILOT_WOUNDS &&
    unit.pilotConscious &&
    (consciousnessCheck.conscious ?? true);
  const pilotKilled = totalWounds >= LETHAL_PILOT_WOUNDS && !unit.destroyed;

  events.push(
    createGameEvent(
      gameId,
      events.length,
      GameEventType.PilotHit,
      state.turn,
      GamePhase.PhysicalAttack,
      {
        unitId,
        wounds: pilotDamage,
        totalWounds,
        source: 'fall',
        consciousnessCheckRequired:
          consciousnessCheck.consciousnessCheckRequired,
        consciousnessCheckPassed: pilotConscious,
        edgeReroll: consciousnessCheck.edgeReroll,
        edgeSuperseded: consciousnessCheck.edgeSuperseded,
        edgeTrigger: consciousnessCheck.edgeTrigger,
        edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
      },
      unitId,
    ),
  );

  if (pilotKilled) {
    appendUnitDestroyedEvent({
      events,
      gameId,
      turn: state.turn,
      phase: GamePhase.PhysicalAttack,
      unitId,
      cause: 'pilot_death',
      actorId: unitId,
    });
  }

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        pilotWounds: totalWounds,
        pilotConscious,
        edgePointsRemaining:
          consciousnessCheck.edgePointsRemaining ?? unit.edgePointsRemaining,
        destroyed: pilotKilled ? true : unit.destroyed,
      },
    },
  };
}
