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
import { createD6Roller, createGameEvent } from './utils';

function dfaMissDropsAttacker(
  displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[],
  attackerId: string,
): boolean {
  return displacements.some(
    (displacement) =>
      displacement.unitId === attackerId && displacement.reason === 'dfa_miss',
  );
}

function dominoEffectDisplacedUnitIds(
  displacements: readonly {
    readonly unitId: string;
    readonly reason: string;
  }[],
): readonly string[] {
  return displacements
    .filter((displacement) => displacement.reason === 'domino')
    .map((displacement) => displacement.unitId);
}

function isBattleMechLikeUnitType(unitType: string | undefined): boolean {
  if (unitType === undefined) return true;
  const canonical = unitType.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    canonical === 'battlemech' ||
    canonical === 'omnimech' ||
    canonical === 'industrialmech'
  );
}

function terrainFeaturesAt(
  grid: IHexGrid,
  coord: IHexCoordinate,
): readonly ITerrainFeature[] {
  return parseTerrainFeatures(
    grid.hexes.get(`${coord.q},${coord.r}`)?.terrain ?? TerrainType.Clear,
  );
}

function hasTerrainFeature(
  features: readonly ITerrainFeature[],
  terrainType: TerrainType,
): boolean {
  return features.some(
    (feature) => feature.type === terrainType && feature.level > 0,
  );
}

function terrainLevelFromFeatures(
  features: readonly ITerrainFeature[],
  terrainType: TerrainType,
): number | undefined {
  const feature = features.find((entry) => entry.type === terrainType);
  if (!feature) return undefined;
  return Math.max(1, feature.level);
}

function hasOverloadedBuildingFeature(
  features: readonly ITerrainFeature[],
  unitTonnage: number | undefined,
): boolean {
  if (unitTonnage === undefined || !Number.isFinite(unitTonnage)) return false;

  const building = features.find(
    (feature) =>
      feature.type === TerrainType.Building &&
      feature.level > 0 &&
      feature.constructionFactor !== undefined &&
      Number.isFinite(feature.constructionFactor),
  );
  if (!building || building.constructionFactor === undefined) return false;

  return unitTonnage > building.constructionFactor;
}

function representedDominoTerrainPSRsForDisplacement(options: {
  readonly state: IGameState;
  readonly grid: IHexGrid;
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly reason: string;
}): readonly IPendingPSR[] {
  if (options.reason !== 'domino') return [];

  const unit = options.state.units[options.unitId];
  if (!unit) return [];

  const fromFeatures = terrainFeaturesAt(options.grid, options.from);
  const enteredFeatures = terrainFeaturesAt(options.grid, options.to);
  const psrs: IPendingPSR[] = [];

  if (
    hasTerrainFeature(fromFeatures, TerrainType.Water) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Water)
  ) {
    psrs.push(createExitingWaterPSR(options.unitId));
  }

  if (
    hasTerrainFeature(enteredFeatures, TerrainType.Water) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Water)
  ) {
    psrs.push(
      createEnteringWaterPSR(options.unitId, undefined, {
        waterDepth: terrainLevelFromFeatures(
          enteredFeatures,
          TerrainType.Water,
        ),
      }),
    );
  }

  if (hasTerrainFeature(enteredFeatures, TerrainType.Rubble)) {
    psrs.push(createRubblePSR(options.unitId));
  }

  if (hasTerrainFeature(enteredFeatures, TerrainType.Ice)) {
    psrs.push(createIcePSR(options.unitId));
  }

  if (
    isBattleMechLikeUnitType(unit.unitType) &&
    hasTerrainFeature(enteredFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(fromFeatures, TerrainType.Swamp) &&
    !hasTerrainFeature(enteredFeatures, TerrainType.Pavement)
  ) {
    psrs.push(
      createSwampBogDownPSR(options.unitId, undefined, {
        swampDepth: terrainLevelFromFeatures(
          enteredFeatures,
          TerrainType.Swamp,
        ),
      }),
    );
  }

  if (
    isBattleMechLikeUnitType(unit.unitType) &&
    hasOverloadedBuildingFeature(enteredFeatures, unit.tonnage)
  ) {
    psrs.push(createBuildingCollapsePSR(options.unitId));
  }

  return psrs;
}

function zweihanderSelfCriticalLocations(
  attackType: IPhysicalAttackInput['attackType'],
  limb?: PhysicalAttackLimb,
): readonly CombatLocation[] {
  if (attackType === 'punch') return ['right_arm', 'left_arm'];
  return limb === 'leftArm' ? ['left_arm'] : ['right_arm'];
}

function armForPhysicalLimb(
  limb: PhysicalAttackLimb | undefined,
): IPhysicalAttackInput['arm'] {
  return limb === 'leftArm' ? 'left' : 'right';
}

function armWeaponsForPhysicalLimb(options: {
  readonly limb: PhysicalAttackLimb | undefined;
  readonly weaponsFiredFromLeftArm: readonly string[];
  readonly weaponsFiredFromRightArm: readonly string[];
}): readonly string[] {
  return options.limb === 'leftArm'
    ? options.weaponsFiredFromLeftArm
    : options.weaponsFiredFromRightArm;
}

function armMountedPhysicalWeaponAttack(
  attackType: PhysicalAttackType,
): boolean {
  return (
    attackType === 'hatchet' ||
    attackType === 'sword' ||
    attackType === 'mace' ||
    attackType === 'lance' ||
    attackType === 'retractable-blade' ||
    attackType === 'flail'
  );
}

function defaultPhysicalAttackLimb(
  attackType: PhysicalAttackType,
): PhysicalAttackLimb | undefined {
  if (
    attackType === 'punch' ||
    attackType === 'brush-off' ||
    armMountedPhysicalWeaponAttack(attackType)
  ) {
    return 'rightArm';
  }
  return undefined;
}

function friendlyUnitIdsForDisplacement(
  state: IGameState,
  displacedUnit: IGameState['units'][string],
): readonly string[] {
  return Object.values(state.units)
    .filter(
      (unit) =>
        unit.id !== displacedUnit.id && unit.side === displacedUnit.side,
    )
    .map((unit) => unit.id);
}

function terrainAtPosition(
  grid: IHexGrid | undefined,
  position: IGameState['units'][string]['position'],
): string | undefined {
  if (!grid) return undefined;
  return grid.hexes.get(`${position.q},${position.r}`)?.terrain;
}

function targetDirectlyBehindFeet(
  attacker: IGameState['units'][string],
  target: IGameState['units'][string],
): boolean {
  const oppositeFacing = ((attacker.facing + 3) % 6) as typeof attacker.facing;
  return isTargetDirectlyAhead(
    attacker.position,
    oppositeFacing,
    target.position,
  );
}

function canonicalBrushOffTargetUnitType(
  unit: IGameState['units'][string],
): string | undefined {
  if (unit.combatState?.kind === 'squad') return 'battlearmor';
  return unit.unitType?.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function swarmingHostId(unit: IGameState['units'][string]): string | undefined {
  if (unit.combatState?.kind !== 'squad') return undefined;
  return unit.combatState.state.swarmingUnitId;
}

function targetIsSwarmingInfantryOnAttacker(
  attackerId: string,
  target: IGameState['units'][string],
): boolean {
  if (target.isSwarming !== true) return false;

  const canonical = canonicalBrushOffTargetUnitType(target);
  if (canonical !== 'infantry' && canonical !== 'battlearmor') return false;

  const hostId = swarmingHostId(target);
  return hostId === undefined || hostId === attackerId;
}

function targetHasBrushOffINarcPods(
  target: IGameState['units'][string],
): boolean {
  return (target.iNarcPods?.length ?? 0) > 0;
}

function clearBrushOffSwarmingState(
  state: IGameState,
  unitId: string,
): IGameState {
  const unit = state.units[unitId];
  if (!unit) return state;

  const combatState =
    unit.combatState?.kind === 'squad'
      ? (() => {
          const { swarmingUnitId: _swarmingUnitId, ...squadState } =
            unit.combatState.state;
          return {
            ...unit.combatState,
            state: squadState,
          };
        })()
      : unit.combatState;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        isSwarming: false,
        ...(combatState ? { combatState } : {}),
      },
    },
  };
}

function removeOneBrushOffINarcPod(
  state: IGameState,
  unitId: string,
  selectedINarcPod?: PhysicalAttackINarcPodSelection,
): IGameState {
  const unit = state.units[unitId];
  const iNarcPods = unit?.iNarcPods;
  if (!unit || !iNarcPods || iNarcPods.length === 0) return state;

  const remainingPods =
    selectedINarcPod === undefined
      ? iNarcPods.slice(1)
      : removeEquivalentINarcPod(iNarcPods, selectedINarcPod);
  if (remainingPods === iNarcPods) return state;

  return {
    ...state,
    units: {
      ...state.units,
      [unitId]: {
        ...unit,
        iNarcPods: remainingPods,
      },
    },
  };
}

function physicalDeclarationSelectedINarcPod(payload: {
  readonly selectedINarcPod?: PhysicalAttackINarcPodSelection;
}): PhysicalAttackINarcPodSelection | undefined {
  return payload.selectedINarcPod;
}

function applyGrappleState(
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

function facingToward(
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

function applyBreakGrappleState(options: {
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

function markUnitFallenAfterDfaMiss(
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

function applyDfaMissFallPilotDamage(options: {
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
    events.push(
      createGameEvent(
        gameId,
        events.length,
        GameEventType.UnitDestroyed,
        state.turn,
        GamePhase.PhysicalAttack,
        {
          unitId,
          cause: 'pilot_death',
        },
        unitId,
      ),
    );
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

export function runPhysicalAttackPhase(options: {
  state: IGameState;
  botPlayer?: IAIPlayer;
  invariantRunner: InvariantRunner;
  violations: IViolation[];
  events: IGameEvent[];
  gameId: string;
  random: SeededRandom;
  grid?: IHexGrid;
  movementCapabilitiesByUnit?: ReadonlyMap<string, IMovementCapability>;
  optionalRules?: readonly string[];
  manifestsByUnit?: Map<string, CriticalSlotManifest>;
}): IGameState {
  const {
    botPlayer,
    events,
    gameId,
    grid,
    invariantRunner,
    manifestsByUnit,
    movementCapabilitiesByUnit,
    optionalRules,
    random,
    state,
    violations,
  } = options;
  let currentState = { ...state, phase: GamePhase.PhysicalAttack };
  let physicalGrid = grid;
  violations.push(...invariantRunner.runAll(currentState));

  const d6Roller = createD6Roller(random);

  for (const unitId of Object.keys(currentState.units)) {
    const unit = currentState.units[unitId];
    if (
      unit.destroyed ||
      unit.hasRetreated ||
      unit.hasEjected ||
      unit.shutdown ||
      !unit.pilotConscious
    ) {
      continue;
    }

    const enemies = Object.values(currentState.units).filter(
      (otherUnit) =>
        !otherUnit.destroyed &&
        !otherUnit.hasRetreated &&
        !otherUnit.hasEjected &&
        otherUnit.side !== unit.side &&
        hexDistance(unit.position, otherUnit.position) <= 1,
    );
    if (enemies.length === 0) {
      continue;
    }

    const componentDamage = unit.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
    const weaponsFiredFromLeftArm = firedWeaponIdsFromMountedArm(unit, 'left');
    const weaponsFiredFromRightArm = firedWeaponIdsFromMountedArm(
      unit,
      'right',
    );
    const weaponsFiredFromEitherArm = firedWeaponIdsFromMountedArm(unit);
    const leftLegWeaponFiredThisTurn =
      firedWeaponIdsFromMountedLeg(unit, 'left').length > 0;
    const rightLegWeaponFiredThisTurn =
      firedWeaponIdsFromMountedLeg(unit, 'right').length > 0;
    const weaponsFiredThisTurn = unit.weaponsFiredThisTurn ?? [];
    const hexesMoved = unit.hexesMovedThisTurn ?? 0;
    const attackerRanThisTurn = unit.movementThisTurn === MovementType.Run;
    const attackerJumpedThisTurn = unit.movementThisTurn === MovementType.Jump;
    const baseMovementCapability = movementCapabilitiesByUnit?.get(unit.id);
    const jumpDamageCapability =
      baseMovementCapability === undefined
        ? undefined
        : applyJumpJetCriticalDamage(
            baseMovementCapability,
            unit.componentDamage?.jumpJetsDestroyed,
          );
    const physicalMovementCapability =
      jumpDamageCapability === undefined
        ? undefined
        : applyPartialWingJumpBonus(
            jumpDamageCapability,
            unit.partialWingJumpBonus,
          );
    const attackerJumpMP = physicalMovementCapability?.jumpMP;
    let bestAttack: PhysicalAttackType | null = null;
    let target = enemies[0];
    let declaredLimb: PhysicalAttackLimb | undefined;
    let declaredTwoHandedZweihander = false;
    let selectedINarcPod: PhysicalAttackINarcPodSelection | undefined;
    let blockerStepOutDecision:
      | IPhysicalDominoStepOutDecisionPayload
      | undefined;

    if (botPlayer) {
      const declaration = botPlayer.playPhysicalAttackPhase(
        toAIUnitState(unit),
        enemies.map((enemy) => toAIUnitState(enemy)),
        {
          attackerTonnage: DEFAULT_TONNAGE,
          pilotingSkill: unit.piloting ?? DEFAULT_PILOTING,
        },
      );
      if (!declaration) continue;
      const declaredTarget = enemies.find(
        (enemy) => enemy.id === declaration.payload.targetId,
      );
      if (!declaredTarget) continue;
      bestAttack = declaration.payload.attackType;
      target = declaredTarget;
      declaredLimb = declaration.payload.limb;
      declaredTwoHandedZweihander =
        declaration.payload.twoHandedZweihander === true;
      selectedINarcPod = physicalDeclarationSelectedINarcPod(
        declaration.payload,
      );
      blockerStepOutDecision = declaration.payload.blockerStepOutDecision;
    } else {
      target = enemies[random.nextInt(enemies.length)];
      const elevationDifference = elevationDifferenceBetween(
        physicalGrid,
        unit,
        target,
      );
      const targetIsAirborneVTOLorWIGE = isPhysicalAirborneVtolOrWigeTarget(
        target.unitType,
        target.motionType,
        target.isAirborne,
      );
      bestAttack = chooseBestPhysicalAttack(
        DEFAULT_TONNAGE,
        unit.piloting ?? DEFAULT_PILOTING,
        componentDamage,
        {
          attackerProne: unit.prone ?? false,
          attackerStuck: unit.isStuck ?? false,
          weaponsFiredFromLeftArm,
          weaponsFiredFromRightArm,
          heat: unit.heat,
          hasTSM: unit.hasTSM ?? false,
          attackerIsQuad: unit.isQuad,
          leftLegHasTalons: unit.leftLegHasTalons,
          rightLegHasTalons: unit.rightLegHasTalons,
          leftArmHasTalons: unit.leftArmHasTalons,
          rightArmHasTalons: unit.rightArmHasTalons,
          leftArmHasClaw: unit.leftArmHasClaw,
          rightArmHasClaw: unit.rightArmHasClaw,
          leftArmCarryingCargo: unit.leftArmCarryingCargo,
          rightArmCarryingCargo: unit.rightArmCarryingCargo,
          canReachForCharge: attackerRanThisTurn && hexesMoved > 1,
          hexesMoved,
          attackerMovedBackwardThisTurn: unit.movedBackwardThisTurn,
          attackerUsedMechanicalJumpBooster:
            unit.usedMechanicalJumpBoosterThisTurn,
          isJumping: attackerJumpedThisTurn,
          pilotAbilities: unit.abilities,
          unitQuirks: unit.unitQuirks,
          attackerEvading: unit.isEvading,
          attackerLoadingOrUnloadingCargo: unit.isLoadingOrUnloadingCargo,
          attackerId: unit.id,
          targetId: target.id,
          attackerTargetedByDisplacementAttackerId:
            unit.targetedByDisplacementAttackerId,
          attackerBoardId: unit.boardId,
          targetBoardId: target.boardId,
          targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
          targetIsPushing: target.isPushing,
          targetDisplacementAttackTargetId: target.displacementAttackTargetId,
          targetedByDisplacementAttackerId:
            target.targetedByDisplacementAttackerId,
          elevationDifference,
          targetUnitType: target.unitType,
          targetDistance: hexDistance(unit.position, target.position),
          targetIsSwarming: target.isSwarming,
          targetIsSwarmingInfantryOnAttacker:
            targetIsSwarmingInfantryOnAttacker(unit.id, target),
          targetIsINarcPod: targetHasBrushOffINarcPods(target),
          targetObjectType: physicalTargetObjectTypeForUnitType(
            target.unitType,
          ),
          weaponsFiredThisTurn,
          optionalRules,
          tacOpsGrapplingEnabled: optionalRules?.includes('tacops_grappling'),
          attackerGrappledTargetId: unit.grappledUnitId,
          targetGrappledTargetId: target.grappledUnitId,
          attackerIsGrappleAttacker: unit.isGrappleAttacker,
          targetIsGrappleAttacker: target.isGrappleAttacker,
          attackerChainWhipGrappled: unit.isChainWhipGrappled,
          tacOpsJumpJetAttackEnabled: optionalRules?.includes(
            'tacops_jump_jet_attack',
          ),
          jumpJetAttackSelectedLeg: 'right',
          rightReadyJumpJetCount: attackerJumpMP,
          leftLegWeaponFiredThisTurn,
          rightLegWeaponFiredThisTurn,
          standingAttackerHeightAboveTargetHeight:
            elevationDifference === undefined
              ? undefined
              : 1 - elevationDifference,
          proneTargetElevationInRange:
            elevationDifference === undefined
              ? undefined
              : elevationDifference === 0,
          targetDirectlyAheadOfFeet: isTargetDirectlyAhead(
            unit.position,
            unit.facing,
            target.position,
          ),
          targetDirectlyBehindFeet: targetDirectlyBehindFeet(unit, target),
          thrashBlockingTerrains: thrashBlockingTerrainsForHexTerrain(
            terrainAtPosition(physicalGrid, unit.position),
          ),
          targetIsAirborne: target.isAirborne,
          targetIsAirborneVTOLorWIGE,
          attackerJumpMP,
        },
      );
    }

    if (!bestAttack) continue;
    if (
      (unit.prone ?? false) &&
      bestAttack !== 'thrash' &&
      bestAttack !== 'jump-jet-attack'
    )
      continue;

    const targetMovementModifier = calculateTMM(
      target.movementThisTurn,
      target.hexesMovedThisTurn ?? 0,
    ).value;
    const attackerMovementModifier = calculateAttackerMovementModifier(
      unit.movementThisTurn,
    ).value;
    const isUnderwater =
      physicalGrid !== undefined &&
      (waterDepthAtPosition(physicalGrid, unit.position) > 0 ||
        waterDepthAtPosition(physicalGrid, target.position) > 0);
    const attackerWaterDepth =
      physicalGrid !== undefined
        ? waterDepthAtPosition(physicalGrid, unit.position)
        : undefined;
    const elevationDifference = elevationDifferenceBetween(
      physicalGrid,
      unit,
      target,
    );
    const targetIsAirborneVTOLorWIGE = isPhysicalAirborneVtolOrWigeTarget(
      target.unitType,
      target.motionType,
      target.isAirborne,
    );
    const targetHasINarcPods = targetHasBrushOffINarcPods(target);
    const pushDestinationValid =
      bestAttack !== 'push' || !physicalGrid
        ? true
        : isValidDisplacement(
            physicalGrid,
            computePushDisplacement(target.position, unit.facing),
            {
              excludeUnitId: target.id,
              source: target.position,
              maxElevationChange: BATTLEMECH_MAX_DISPLACEMENT_ELEVATION_CHANGE,
            },
          );
    const effectiveLimb = declaredLimb ?? defaultPhysicalAttackLimb(bestAttack);
    const selectedArmWeapons = armWeaponsForPhysicalLimb({
      limb: effectiveLimb,
      weaponsFiredFromLeftArm,
      weaponsFiredFromRightArm,
    });

    const attackInput: IPhysicalAttackInput = {
      attackerId: unit.id,
      targetId: target.id,
      attackerTonnage: DEFAULT_TONNAGE,
      pilotingSkill: unit.piloting ?? DEFAULT_PILOTING,
      componentDamage,
      attackType: bestAttack,
      arm: armForPhysicalLimb(effectiveLimb),
      limb: effectiveLimb,
      twoHandedZweihander: declaredTwoHandedZweihander,
      hexesMoved,
      attackerProne: unit.prone ?? false,
      attackerStuck: unit.isStuck ?? false,
      weaponsFiredFromArm:
        declaredTwoHandedZweihander &&
        isZweihanderPhysicalAttackType(bestAttack)
          ? weaponsFiredFromEitherArm
          : bestAttack === 'thrash'
            ? weaponsFiredThisTurn
            : bestAttack === 'grapple'
              ? weaponsFiredThisTurn
              : bestAttack === 'push'
                ? weaponsFiredFromEitherArm
                : bestAttack === 'punch' || bestAttack === 'brush-off'
                  ? selectedArmWeapons
                  : armMountedPhysicalWeaponAttack(bestAttack)
                    ? selectedArmWeapons
                    : undefined,
      attackerDestroyedLocations: unit.destroyedLocations,
      attackerUnitType: unit.unitType,
      attackerIsQuad: unit.isQuad,
      attackerIsAirborne: unit.isAirborne,
      attackerArmsFlipped: unit.armsFlipped,
      targetUnitType: target.unitType,
      targetPilotingSkill: target.piloting,
      attackerEvading: unit.isEvading,
      attackerLoadingOrUnloadingCargo: unit.isLoadingOrUnloadingCargo,
      attackerTargetedByDisplacementAttackerId:
        unit.targetedByDisplacementAttackerId,
      heat: unit.heat,
      hasTSM: unit.hasTSM ?? false,
      leftLegHasTalons: unit.leftLegHasTalons,
      rightLegHasTalons: unit.rightLegHasTalons,
      leftArmHasTalons: unit.leftArmHasTalons,
      rightArmHasTalons: unit.rightArmHasTalons,
      leftArmHasClaw: unit.leftArmHasClaw,
      rightArmHasClaw: unit.rightArmHasClaw,
      leftArmCarryingCargo: unit.leftArmCarryingCargo,
      rightArmCarryingCargo: unit.rightArmCarryingCargo,
      optionalRules,
      tacOpsGrapplingEnabled: optionalRules?.includes('tacops_grappling'),
      attackerGrappledTargetId: unit.grappledUnitId,
      targetGrappledTargetId: target.grappledUnitId,
      attackerIsGrappleAttacker: unit.isGrappleAttacker,
      targetIsGrappleAttacker: target.isGrappleAttacker,
      attackerChainWhipGrappled: unit.isChainWhipGrappled,
      targetInFrontArc: isTargetInFrontArc(
        unit.position,
        unit.facing,
        target.position,
      ),
      thrashBlockingTerrains: thrashBlockingTerrainsForHexTerrain(
        terrainAtPosition(physicalGrid, unit.position),
      ),
      tacOpsJumpJetAttackEnabled: optionalRules?.includes(
        'tacops_jump_jet_attack',
      ),
      jumpJetAttackSelectedLeg: 'right',
      rightReadyJumpJetCount: attackerJumpMP,
      leftLegWeaponFiredThisTurn,
      rightLegWeaponFiredThisTurn,
      standingAttackerHeightAboveTargetHeight:
        elevationDifference === undefined ? undefined : 1 - elevationDifference,
      proneTargetElevationInRange:
        elevationDifference === undefined
          ? undefined
          : elevationDifference === 0,
      targetDirectlyAheadOfFeet: isTargetDirectlyAhead(
        unit.position,
        unit.facing,
        target.position,
      ),
      targetDirectlyBehindFeet: targetDirectlyBehindFeet(unit, target),
      isUnderwater,
      attackerWaterDepth,
      targetTonnage: DEFAULT_TONNAGE,
      targetProne: target.prone ?? false,
      targetEvading: target.isEvading,
      targetEvasionBonus: target.evasionBonus,
      targetMovementComplete: true,
      targetImmobile: target.shutdown ?? false,
      targetExists: true,
      targetObjectType: physicalTargetObjectTypeForUnitType(target.unitType),
      targetDestroyed: target.destroyed,
      targetRetreated: target.hasRetreated,
      targetEjected: target.hasEjected,
      attackerBoardId: unit.boardId,
      targetBoardId: target.boardId,
      targetIsPassenger: target.isPassenger,
      targetIsSwarming: target.isSwarming,
      targetIsSwarmingInfantryOnAttacker: targetIsSwarmingInfantryOnAttacker(
        unit.id,
        target,
      ),
      targetIsINarcPod: targetHasINarcPods,
      targetIsMakingDFA: target.isMakingDFA,
      targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
      targetIsPushing: target.isPushing,
      targetDisplacementAttackTargetId: target.displacementAttackTargetId,
      targetedByDisplacementAttackerId: target.targetedByDisplacementAttackerId,
      targetIsAirborne: target.isAirborne,
      targetIsAirborneVTOLorWIGE,
      attackerJumpMP,
      attackerOccupiedBuildingId: unit.occupiedBuildingId,
      targetOccupiedBuildingId: target.occupiedBuildingId,
      targetIsSelf: unit.id === target.id,
      targetIsFriendly: unit.side === target.side,
      targetDistance: hexDistance(unit.position, target.position),
      targetMovementModifier,
      attackerMovementModifier,
      attackerRanThisTurn,
      attackerMovedBackwardThisTurn: unit.movedBackwardThisTurn,
      attackerUsedMechanicalJumpBooster: unit.usedMechanicalJumpBoosterThisTurn,
      attackerJumpedThisTurn,
      pushDestinationValid,
      pushTargetDirectlyAhead: isTargetDirectlyAhead(
        unit.position,
        unit.facing,
        target.position,
      ),
      pilotAbilities: unit.abilities,
      unitQuirks: unit.unitQuirks,
      elevationDifference,
    };

    const result = resolvePhysicalAttack(attackInput, d6Roller);
    const displacementOutcome =
      result.restrictionReasonCode === undefined
        ? computePhysicalDisplacementOutcome({
            grid: physicalGrid,
            attackType: bestAttack,
            attacker: unit,
            target,
            hit: result.hit,
            d6Roller,
            targetFriendlyUnitIds: friendlyUnitIdsForDisplacement(
              currentState,
              target,
            ),
            targetSourceContainsGroundedDropShip:
              sourceContainsGroundedDropShip(
                Object.values(currentState.units),
                target,
              ),
            blockerStepOutDecision,
          })
        : { displacements: [] };
    const displacements = displacementOutcome.displacements;
    const impossibleDisplacementDestroyedUnitId =
      displacementOutcome.impossibleDisplacementDestroyedUnitId;
    const chargeHitDisplacementBlocked =
      result.hit &&
      bestAttack === 'charge' &&
      Boolean(physicalGrid) &&
      displacements.length === 0;
    const dfaMissFall =
      !result.hit &&
      bestAttack === 'dfa' &&
      impossibleDisplacementDestroyedUnitId !== unitId &&
      dfaMissDropsAttacker(displacements, unitId)
        ? resolveDfaMissFallDamage(DEFAULT_TONNAGE, unit.facing, d6Roller)
        : undefined;
    const brushOffSelectedINarcPod =
      bestAttack === 'brush-off'
        ? (selectedINarcPod ?? target.iNarcPods?.[0])
        : undefined;

    emitPhysicalAttackDeclaredEvent({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      targetId: target.id,
      attackType: bestAttack,
      limb: effectiveLimb,
      toHitNumber: result.toHitNumber,
      twoHandedZweihander: declaredTwoHandedZweihander,
      selectedINarcPod: brushOffSelectedINarcPod,
      blockerStepOutDecision,
    });

    if (result.hit && result.targetDamage > 0 && result.hitLocation) {
      const targetClusters =
        bestAttack === 'charge' || bestAttack === 'dfa'
          ? splitPhysicalDamageIntoClusters(result.targetDamage)
          : [result.targetDamage];
      currentState = applyPhysicalDamageClusters({
        state: currentState,
        events,
        gameId,
        unitId: target.id,
        clusters: targetClusters,
        hitTable: bestAttack === 'kick' ? 'kick' : 'punch',
        d6Roller,
        optionalRules,
        sourceUnitId: unitId,
        firstHitLocation: result.hitLocation,
        manifestsByUnit,
      });
    }

    if (result.hit && bestAttack === 'brush-off') {
      if (attackInput.targetIsSwarmingInfantryOnAttacker === true) {
        currentState = clearBrushOffSwarmingState(currentState, target.id);
      }
      if (targetHasINarcPods) {
        currentState = removeOneBrushOffINarcPod(
          currentState,
          target.id,
          brushOffSelectedINarcPod,
        );
      }
    }

    if (result.hit && bestAttack === 'grapple') {
      currentState = applyGrappleState(currentState, unitId, target.id);
    }

    if (
      declaredTwoHandedZweihander &&
      result.restrictionReasonCode === undefined &&
      isZweihanderPhysicalAttackType(bestAttack)
    ) {
      currentState = applyPhysicalCriticalHits({
        state: currentState,
        events,
        gameId,
        unitId,
        locations: zweihanderSelfCriticalLocations(bestAttack, effectiveLimb),
        d6Roller,
        optionalRules,
        sourceUnitId: unitId,
        manifestsByUnit,
      });
    }

    if (
      !result.hit &&
      bestAttack === 'brush-off' &&
      result.attackerDamage > 0 &&
      result.hitLocation
    ) {
      currentState = applyPhysicalDamageClusters({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: [result.attackerDamage],
        hitTable: 'punch',
        d6Roller,
        optionalRules,
        sourceUnitId: unitId,
        firstHitLocation: result.hitLocation,
        manifestsByUnit,
      });
    }

    if (result.hit && bestAttack === 'charge' && result.attackerDamage > 0) {
      currentState = applyPhysicalDamageClusters({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: splitPhysicalDamageIntoClusters(result.attackerDamage),
        hitTable: 'punch',
        d6Roller,
        optionalRules,
        manifestsByUnit,
      });
    }

    if (
      result.hit &&
      bestAttack === 'dfa' &&
      result.attackerLegDamagePerLeg > 0
    ) {
      const legClusters = splitPhysicalDamageIntoClusters(
        result.attackerLegDamagePerLeg * 2,
      );
      currentState = applyDfaAttackerLegDamage({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: legClusters,
        d6Roller,
        optionalRules,
        manifestsByUnit,
      });
    }

    if (
      result.hit &&
      result.targetPSR &&
      impossibleDisplacementDestroyedUnitId !== target.id &&
      !chargeHitDisplacementBlocked
    ) {
      const psr = targetPSRForAttack(bestAttack, target.id);
      if (psr) currentState = queuePendingPSR(currentState, target.id, psr);
    }

    if (result.hit && result.attackerPSR && !chargeHitDisplacementBlocked) {
      const psr = attackerHitPSRForAttack(bestAttack, unitId, result);
      if (psr) currentState = queuePendingPSR(currentState, unitId, psr);
    }

    if (
      !result.hit &&
      result.attackerPSR &&
      impossibleDisplacementDestroyedUnitId !== unitId &&
      dfaMissFall === undefined
    ) {
      currentState = queuePendingPSR(
        currentState,
        unitId,
        attackerMissPSRForAttack(bestAttack, unitId, result),
      );
    }

    for (const dominoUnitId of dominoEffectDisplacedUnitIds(displacements)) {
      currentState = queuePendingPSR(
        currentState,
        dominoUnitId,
        dominoEffectPSRForDisplacement(dominoUnitId),
      );
    }

    for (const displacement of displacements) {
      currentState = displaceUnit(
        currentState,
        displacement.unitId,
        displacement.to,
      );
      if (physicalGrid) {
        currentState = applyRepresentedMinefieldEntryDamage({
          currentState,
          events,
          gameId,
          grid: physicalGrid,
          unitId: displacement.unitId,
          to: displacement.to,
          phase: GamePhase.PhysicalAttack,
          d6Roller,
        });
        for (const psr of representedDominoTerrainPSRsForDisplacement({
          state: currentState,
          grid: physicalGrid,
          unitId: displacement.unitId,
          from: displacement.from,
          to: displacement.to,
          reason: displacement.reason,
        })) {
          currentState = queuePendingPSR(
            currentState,
            displacement.unitId,
            psr,
          );
          events.push(
            createPSRTriggeredEvent(
              gameId,
              events.length,
              currentState.turn,
              GamePhase.PhysicalAttack,
              displacement.unitId,
              psr.reason,
              psr.additionalModifier,
              psr.triggerSource,
              currentState.units[displacement.unitId]?.piloting,
              psr.reasonCode,
              psr.fixedTargetNumber,
            ),
          );
        }
      }
    }
    if (result.hit && bestAttack === 'break-grapple') {
      currentState = applyBreakGrappleState({
        state: currentState,
        attackerId: unitId,
        targetId: target.id,
        displacements,
      });
    }
    physicalGrid = applyPhysicalDisplacementsToGrid(
      physicalGrid,
      displacements,
    );

    if (dfaMissFall !== undefined) {
      currentState = applyPhysicalDamageClusterLocations({
        state: currentState,
        events,
        gameId,
        unitId,
        clusters: dfaMissFall.clusters,
        d6Roller,
        optionalRules,
        manifestsByUnit,
      });
      const pilotDamageAvoidance = resolveDfaMissFallPilotDamageAvoidance(
        unit.piloting ?? DEFAULT_PILOTING,
        dfaMissFall.fallHeight,
        d6Roller,
        unit.abilities ?? [],
      );
      currentState = markUnitFallenAfterDfaMiss(
        currentState,
        unitId,
        dfaMissFall.newFacing,
      );
      events.push(
        createGameEvent(
          gameId,
          events.length,
          GameEventType.UnitFell,
          currentState.turn,
          GamePhase.PhysicalAttack,
          {
            unitId,
            fallDamage: dfaMissFall.fallDamage,
            newFacing: dfaMissFall.newFacing,
            pilotDamage: pilotDamageAvoidance.pilotDamage,
            location: 'dfa_miss',
            reason: 'Missed DFA',
            reasonCode: PSRTrigger.DFAMiss,
          },
          unitId,
        ),
      );
      currentState = applyDfaMissFallPilotDamage({
        state: currentState,
        events,
        gameId,
        unitId,
        pilotDamage: pilotDamageAvoidance.pilotDamage,
        d6Roller,
      });
    }

    currentState = applyImpossibleDisplacementDestruction({
      state: currentState,
      events,
      gameId,
      turn: currentState.turn,
      destroyedUnitId: impossibleDisplacementDestroyedUnitId,
      attackerId: unitId,
      targetId: target.id,
    });

    emitPhysicalAttackResolvedEvent({
      events,
      gameId,
      turn: currentState.turn,
      attackerId: unitId,
      targetId: target.id,
      attackType: bestAttack,
      result,
      displacements,
      selectedINarcPod: brushOffSelectedINarcPod,
    });
  }

  violations.push(...invariantRunner.runAll(currentState));
  return currentState;
}
