/**
 * Session-level physical attack wiring.
 *
 * Bridges the standalone `physicalAttacks/` module (to-hit, damage,
 * restrictions) into the event-sourced session: declarations emit
 * `PhysicalAttackDeclared`; resolution emits `PhysicalAttackResolved`,
 * `DamageApplied` (via `resolveDamagePipeline`), and `PSRTriggered` for
 * post-attack PSR triggers (target on hit; attacker on charge / kick /
 * DFA miss).
 *
 * @spec openspec/changes/implement-physical-attack-phase/tasks.md
 */

import {
  CombatLocation,
  GamePhase,
  GameEventType,
  IGameEvent,
  IGameSession,
  IHexGrid,
  IPhysicalDisplacement,
  IPhysicalAttackDeclaredPayload,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';

import type { IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

import {
  PILOT_DEATH_WOUND_THRESHOLD,
  resolveDamage as resolveDamagePipeline,
  resolvePilotConsciousnessCheck,
} from './damage';
import { type D6Roller, type DiceRoller } from './diceTypes';
import {
  createDamageAppliedEvent,
  createPilotHitEvent,
  createPhysicalAttackDeclaredEvent,
  createPhysicalAttackResolvedEvent,
  createPSRTriggeredEvent,
  createUnitDestroyedEvent,
  createUnitFellEvent,
} from './gameEvents';
import {
  buildDefaultComponentDamageState,
  buildDamageStateFromUnit,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import {
  buildRestrictionEventReason,
  firedWeaponIdsFromMountedArm,
  firedWeaponIdsFromMountedLeg,
} from './gameSessionPhysicalHelpers';
import { hexDistance } from './hexMath';
import { roll2d6 as rollDice } from './hitLocation';
import {
  canCharge,
  canDFA,
  canBrushOffPhysical,
  canBreakGrapplePhysical,
  canGrapplePhysical,
  canKick,
  canJumpJetAttackPhysical,
  canMeleeWeapon,
  canPunch,
  canPush,
  canThrashPhysical,
  canTripPhysical,
  computeChargeDisplacementOutcome,
  computeBreakGrappleDisplacementOutcome,
  computeDfaDisplacementOutcome,
  computeDisplacementWithDominoChain,
  calculatePhysicalToHit,
  computeMissedChargeDisplacement,
  computePushDisplacementOutcome,
  CHARGE_HIT_PSR_MODIFIER,
  DFA_TARGET_PSR_MODIFIER,
  determinePhysicalHitLocation,
  getAllowedPhysicalAttackCount,
  IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  isPhysicalAirborneVtolOrWigeTarget,
  isTargetDirectlyAhead,
  isTargetInFrontArc,
  physicalAttackDeclarationsForTurn,
  physicalAttackLimbForDeclaration,
  physicalAttackLimbsUsedThisTurn,
  physicalTargetObjectTypeForUnitType,
  physicalTargetObjectInvalidReason,
  PhysicalAttackType,
  type JumpJetAttackSelectedLeg,
  isSupportedPhysicalAttackType,
  isZweihanderPhysicalAttackType,
  resolveDfaMissFallDamage,
  resolveDfaMissFallPilotDamageAvoidance,
  resolvePhysicalAttack,
  selectPhysicalHitTable,
  sourceContainsGroundedDropShip,
  splitPhysicalDamageIntoClusters,
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  thrashBlockingTerrainsForHexTerrain,
  type IDisplacementBlockerStepOutDecision,
} from './physicalAttacks';
import { createDominoEffectPSR } from './pilotingSkillRolls';
import { waterDepthAtPosition } from './waterDepth';

interface IResolvedPhysicalDisplacementOutcome {
  readonly displacements: readonly IPhysicalDisplacement[];
  readonly impossibleDisplacementDestroyedUnitId?: string;
}

function computeResolvedPhysicalDisplacementOutcome(options: {
  readonly grid?: IHexGrid;
  readonly attackType: PhysicalAttackType;
  readonly attacker: IGameSession['currentState']['units'][string];
  readonly target: IGameSession['currentState']['units'][string];
  readonly hit: boolean;
  readonly d6Roller: D6Roller;
  readonly friendlyUnitIds?: readonly string[];
  readonly targetSourceContainsGroundedDropShip?: boolean;
  readonly blockerStepOutDecision?: IDisplacementBlockerStepOutDecision;
}): IResolvedPhysicalDisplacementOutcome {
  const { attackType, attacker, d6Roller, friendlyUnitIds, grid, hit, target } =
    options;
  if (!grid) {
    return { displacements: [] };
  }

  if (!hit && attackType === 'charge') {
    const destination = computeMissedChargeDisplacement(
      grid,
      attacker.id,
      attacker.position,
      attacker.facing,
      d6Roller,
    );
    if (
      destination.q === attacker.position.q &&
      destination.r === attacker.position.r
    ) {
      return { displacements: [] };
    }
    const displacements = computeDisplacementWithDominoChain({
      grid,
      unitId: attacker.id,
      from: attacker.position,
      to: destination,
      reason: 'charge_miss',
      blockerStepOutDecision: options.blockerStepOutDecision,
    });
    return {
      displacements: displacements ?? [],
    };
  }

  if (attackType === 'dfa') {
    return computeDfaDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      attackerPosition: attacker.position,
      attackerFacing: attacker.facing,
      targetId: target.id,
      targetPosition: target.position,
      hit,
      targetFriendlyUnitIds: friendlyUnitIds,
      targetSourceContainsGroundedDropShip:
        options.targetSourceContainsGroundedDropShip,
      blockerStepOutDecision: options.blockerStepOutDecision,
    });
  }

  if (hit && attackType === 'charge') {
    return computeChargeDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      attackerPosition: attacker.position,
      attackerFacing: attacker.facing,
      targetId: target.id,
      targetPosition: target.position,
      blockerStepOutDecision: options.blockerStepOutDecision,
    });
  }

  if (hit && attackType === 'break-grapple') {
    return computeBreakGrappleDisplacementOutcome({
      grid,
      attackerId: attacker.id,
      targetId: target.id,
      attackerPosition: attacker.position,
      targetPosition: target.position,
      attackerIsGrappleAttacker: attacker.isGrappleAttacker,
    });
  }

  if (!hit || attackType !== 'push') {
    return { displacements: [] };
  }

  return computePushDisplacementOutcome({
    grid,
    attackerId: attacker.id,
    attackerPosition: attacker.position,
    attackerFacing: attacker.facing,
    targetId: target.id,
    targetPosition: target.position,
    blockerStepOutDecision: options.blockerStepOutDecision,
  });
}

function dfaMissDropsAttacker(
  displacements: readonly IPhysicalDisplacement[],
  attackerId: string,
): boolean {
  return displacements.some(
    (displacement) =>
      displacement.unitId === attackerId && displacement.reason === 'dfa_miss',
  );
}

function dominoEffectDisplacedUnitIds(
  displacements: readonly IPhysicalDisplacement[],
): readonly string[] {
  return displacements
    .filter((displacement) => displacement.reason === 'domino')
    .map((displacement) => displacement.unitId);
}

function friendlyUnitIdsForDisplacement(
  units: IGameSession['currentState']['units'],
  displacedUnit: IGameSession['currentState']['units'][string],
): readonly string[] {
  return Object.values(units)
    .filter(
      (unit) =>
        unit.id !== displacedUnit.id && unit.side === displacedUnit.side,
    )
    .map((unit) => unit.id);
}

function appendDfaMissFallDamage(
  session: IGameSession,
  options: {
    readonly turn: number;
    readonly attackerId: string;
    readonly attackerTonnage: number;
    readonly attackerPilotingSkill: number;
    readonly attackerPilotAbilities?: readonly string[];
    readonly attackerFacing: IGameSession['currentState']['units'][string]['facing'];
    readonly d6Roller: D6Roller;
  },
): IGameSession {
  const {
    attackerFacing,
    attackerId,
    attackerPilotingSkill,
    attackerPilotAbilities,
    attackerTonnage,
    d6Roller,
    turn,
  } = options;
  const fall = resolveDfaMissFallDamage(
    attackerTonnage,
    attackerFacing,
    d6Roller,
  );

  let currentSession = session;
  for (const cluster of fall.clusters) {
    const attacker = currentSession.currentState.units[attackerId];
    if (!attacker || attacker.destroyed) break;

    const damageState = buildDamageStateFromUnit(attacker);
    const damageResult = resolveDamagePipeline(
      damageState,
      cluster.location,
      cluster.damage,
    );
    for (const locationDamage of damageResult.result.locationDamages) {
      const damageSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createDamageAppliedEvent(
          currentSession.id,
          damageSeq,
          turn,
          attackerId,
          locationDamage.location,
          locationDamage.damage,
          locationDamage.armorRemaining,
          locationDamage.structureRemaining,
          locationDamage.destroyed,
        ),
      );
    }
  }

  const fallSeq = currentSession.events.length;
  const attacker = currentSession.currentState.units[attackerId];
  const pilotAbilities = attackerPilotAbilities ?? attacker?.abilities ?? [];
  const pilotDamageAvoidance = resolveDfaMissFallPilotDamageAvoidance(
    attackerPilotingSkill,
    fall.fallHeight,
    d6Roller,
    pilotAbilities,
  );
  currentSession = appendEvent(
    currentSession,
    createUnitFellEvent(
      currentSession.id,
      fallSeq,
      turn,
      GamePhase.PhysicalAttack,
      attackerId,
      fall.fallDamage,
      fall.newFacing,
      pilotDamageAvoidance.pilotDamage,
      'dfa_miss',
      'Missed DFA',
      PSRTrigger.DFAMiss,
    ),
  );
  return appendDfaMissFallPilotDamage(currentSession, {
    turn,
    attackerId,
    pilotDamage: pilotDamageAvoidance.pilotDamage,
    pilotAbilities,
    d6Roller,
  });
}

function appendDfaMissFallPilotDamage(
  session: IGameSession,
  options: {
    readonly turn: number;
    readonly attackerId: string;
    readonly pilotDamage: number;
    readonly pilotAbilities: readonly string[];
    readonly d6Roller: D6Roller;
  },
): IGameSession {
  const { attackerId, d6Roller, pilotAbilities, pilotDamage, turn } = options;
  if (pilotDamage <= 0) {
    return session;
  }

  const attacker = session.currentState.units[attackerId];
  if (!attacker) {
    return session;
  }

  const totalWounds = attacker.pilotWounds + pilotDamage;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    pilotDamage,
    pilotAbilities,
    d6Roller,
    attacker.pilotToughness,
    {
      edgePointsRemaining: attacker.edgePointsRemaining,
      turn,
      unitId: attackerId,
    },
  );
  const consciousnessPassed =
    totalWounds < PILOT_DEATH_WOUND_THRESHOLD &&
    attacker.pilotConscious &&
    (consciousnessCheck.conscious ?? true);
  const pilotKilled =
    totalWounds >= PILOT_DEATH_WOUND_THRESHOLD && !attacker.destroyed;

  let currentSession = appendEvent(
    session,
    createPilotHitEvent(
      session.id,
      session.events.length,
      turn,
      GamePhase.PhysicalAttack,
      attackerId,
      pilotDamage,
      totalWounds,
      'fall',
      consciousnessCheck.consciousnessCheckRequired,
      consciousnessPassed,
      {
        edgeReroll: consciousnessCheck.edgeReroll,
        edgeSuperseded: consciousnessCheck.edgeSuperseded,
        edgeTrigger: consciousnessCheck.edgeTrigger,
        edgePointsRemaining: consciousnessCheck.edgePointsRemaining,
      },
    ),
  );

  if (pilotKilled) {
    currentSession = appendEvent(
      currentSession,
      createUnitDestroyedEvent(
        currentSession.id,
        currentSession.events.length,
        turn,
        GamePhase.PhysicalAttack,
        attackerId,
        'pilot_death',
      ),
    );
  }

  return currentSession;
}

/**
 * Per `implement-physical-attack-phase` task 2: declare a physical
 * attack. Validates restrictions; on rejection emits `AttackInvalid`
 * with the restriction reason. On accept emits
 * `PhysicalAttackDeclared`.
 */
export { type IPhysicalAttackContext } from './gameSessionPhysicalHelpers';

function weaponsFiredFromArmForAttack(
  attackerState: IGameSession['currentState']['units'][string],
  attackType: PhysicalAttackType,
  context: IPhysicalAttackContext,
): readonly string[] | undefined {
  if (
    context.twoHandedZweihander === true &&
    isZweihanderPhysicalAttackType(attackType)
  ) {
    return firedWeaponIdsFromMountedArm(attackerState);
  }
  if (context.weaponsFiredFromArm !== undefined) {
    return context.weaponsFiredFromArm;
  }
  if (attackType === 'thrash') return attackerState.weaponsFiredThisTurn ?? [];
  if (attackType === 'grapple') return attackerState.weaponsFiredThisTurn ?? [];
  if (attackType === 'push') return firedWeaponIdsFromMountedArm(attackerState);
  if (
    attackType === 'brush-off' ||
    attackType === 'punch' ||
    (SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES as readonly string[]).includes(
      attackType,
    )
  ) {
    return firedWeaponIdsFromMountedArm(attackerState, context.arm);
  }
  return undefined;
}

function jumpJetAttackSelectedLegForLimb(
  limb: IPhysicalAttackDeclaredPayload['limb'] | undefined,
  context: IPhysicalAttackContext,
): JumpJetAttackSelectedLeg | undefined {
  if (context.jumpJetAttackSelectedLeg) return context.jumpJetAttackSelectedLeg;
  if (limb === 'leftLeg') return 'left';
  if (limb === 'rightLeg') return 'right';
  return undefined;
}

function legWeaponFiredThisTurn(
  attackerState: IGameSession['currentState']['units'][string],
  context: IPhysicalAttackContext,
  leg: 'left' | 'right',
): boolean | undefined {
  const explicit =
    leg === 'left'
      ? context.leftLegWeaponFiredThisTurn
      : context.rightLegWeaponFiredThisTurn;
  if (explicit !== undefined) return explicit;
  return firedWeaponIdsFromMountedLeg(attackerState, leg).length > 0;
}

function isTargetDirectlyBehindFeet(
  attacker: IGameSession['currentState']['units'][string],
  target: IGameSession['currentState']['units'][string],
): boolean {
  const oppositeFacing = ((attacker.facing + 3) % 6) as typeof attacker.facing;
  return isTargetDirectlyAhead(
    attacker.position,
    oppositeFacing,
    target.position,
  );
}

function terrainAtPosition(
  grid: IHexGrid | undefined,
  position: IGameSession['currentState']['units'][string]['position'],
): string | undefined {
  if (!grid) return undefined;
  return grid.hexes.get(`${position.q},${position.r}`)?.terrain;
}

function canonicalBrushOffTargetUnitType(unitType: string | undefined): string {
  return unitType?.toLowerCase().replace(/[^a-z0-9]/g, '') ?? '';
}

function swarmingHostId(
  target: IGameSession['currentState']['units'][string] | undefined,
): string | undefined {
  if (target?.combatState?.kind !== 'squad') return undefined;
  return target.combatState.state.swarmingUnitId;
}

function targetIsSwarmingInfantryOnAttacker(
  attackerId: string,
  target: IGameSession['currentState']['units'][string] | undefined,
): boolean | undefined {
  if (!target?.isSwarming) return undefined;
  const targetType = canonicalBrushOffTargetUnitType(target.unitType);
  if (
    targetType !== 'infantry' &&
    targetType !== 'battlearmor' &&
    target.combatState?.kind !== 'squad'
  ) {
    return false;
  }

  const hostId = swarmingHostId(target);
  return hostId === undefined || hostId === attackerId;
}

function appendInvalidPhysicalResolution(
  session: IGameSession,
  turn: number,
  payload: IPhysicalAttackDeclaredPayload,
  reason: string,
): IGameSession {
  return appendEvent(
    session,
    createPhysicalAttackResolvedEvent(
      session.id,
      session.events.length,
      turn,
      payload.attackerId,
      payload.targetId,
      payload.attackType,
      0,
      Infinity,
      false,
      undefined,
      reason,
    ),
  );
}

function targetHasINarcPods(
  target: IGameSession['currentState']['units'][string] | undefined,
): boolean {
  return (target?.iNarcPods?.length ?? 0) > 0;
}

function selectedINarcPodForBrushOff(
  attackType: PhysicalAttackType | string,
  context: IPhysicalAttackContext,
  target: IGameSession['currentState']['units'][string] | undefined,
): IPhysicalAttackDeclaredPayload['selectedINarcPod'] | undefined {
  if (attackType !== 'brush-off') return undefined;
  return context.selectedINarcPod ?? target?.iNarcPods?.[0];
}

export function declarePhysicalAttack(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  attackType: PhysicalAttackType | string,
  context: IPhysicalAttackContext,
): IGameSession {
  const attackerState = session.currentState.units[attackerId];
  if (!attackerState || attackerState.destroyed) {
    return session;
  }
  const targetState = session.currentState.units[targetId];
  if (!isSupportedPhysicalAttackType(attackType)) {
    return session;
  }

  const componentDamage =
    attackerState.componentDamage ?? buildDefaultComponentDamageState();
  const declaredLimb = physicalAttackLimbForDeclaration(attackType, {
    limb: context.limb,
    arm: context.arm,
  });
  const priorPhysicalDeclarations = physicalAttackDeclarationsForTurn(
    session.events,
    session.currentState.turn,
    attackerId,
  );
  const allowedPhysicalAttacks = getAllowedPhysicalAttackCount(
    context.pilotAbilities ?? attackerState.abilities,
  );
  if (priorPhysicalDeclarations.length >= allowedPhysicalAttacks) {
    return appendEvent(
      session,
      createPhysicalAttackResolvedEvent(
        session.id,
        session.events.length,
        session.currentState.turn,
        attackerId,
        targetId,
        attackType,
        0,
        Infinity,
        false,
        undefined,
        'PhysicalAttackLimitReached',
      ),
    );
  }

  const targetObjectType =
    context.targetObjectType ??
    physicalTargetObjectTypeForUnitType(targetState?.unitType);
  const attackerUnit = session.units.find((unit) => unit.id === attackerId);
  const targetUnit = session.units.find((unit) => unit.id === targetId);

  const input: IPhysicalAttackInput = {
    attackerId,
    targetId,
    attackerTonnage: context.attackerTonnage,
    pilotingSkill: context.pilotingSkill,
    componentDamage,
    attackType,
    arm: context.arm,
    twoHandedZweihander: context.twoHandedZweihander,
    hexesMoved: context.hexesMoved,
    heat: attackerState.heat,
    hasTSM: context.hasTSM,
    isUnderwater: context.isUnderwater ?? false,
    attackerWaterDepth: context.attackerWaterDepth,
    weaponsFiredFromArm: weaponsFiredFromArmForAttack(
      attackerState,
      attackType,
      context,
    ),
    attackerDestroyedLocations: attackerState.destroyedLocations,
    attackerUnitType:
      context.attackerUnitType ??
      attackerState.unitType ??
      attackerUnit?.unitType,
    attackerMovementMode:
      context.attackerMovementMode ?? attackerState.motionType,
    attackerConversionMode:
      context.attackerConversionMode ?? attackerState.conversionMode,
    attackerIsAirborneVTOLOrWiGE: context.attackerIsAirborneVTOLOrWiGE,
    attackerVehicleCrewStunned:
      attackerState.combatState?.kind === 'vehicle'
        ? attackerState.combatState.state.motive.crewStunnedPhases > 0
        : undefined,
    attackerIsQuad: attackerState.isQuad,
    attackerIsAirborne: attackerState.isAirborne,
    attackerArmsFlipped: attackerState.armsFlipped,
    targetUnitType:
      context.targetUnitType ?? targetState?.unitType ?? targetUnit?.unitType,
    targetPilotingSkill: targetState?.piloting,
    attackerEvading: attackerState.isEvading,
    attackerSpotting: attackerState.isSpotting,
    attackerLoadingOrUnloadingCargo: attackerState.isLoadingOrUnloadingCargo,
    attackerTargetedByDisplacementAttackerId:
      attackerState.targetedByDisplacementAttackerId,
    attackerProne: attackerState.prone,
    attackerHullDown: attackerState.hullDown,
    attackerStuck: attackerState.isStuck,
    targetProne: targetState?.prone,
    targetMovementComplete: context.targetMovementComplete,
    targetImmobile: targetState?.shutdown,
    targetExists: targetState !== undefined || targetObjectType !== undefined,
    targetObjectType,
    targetDestroyed: targetState?.destroyed,
    targetRetreated: targetState?.hasRetreated,
    targetEjected: targetState?.hasEjected,
    attackerBoardId: attackerState.boardId,
    targetBoardId: targetState?.boardId,
    targetIsPassenger: targetState?.isPassenger,
    targetIsSwarming: targetState?.isSwarming,
    targetIsMakingDFA: targetState?.isMakingDFA,
    targetIsMakingDisplacementAttack: targetState?.isMakingDisplacementAttack,
    targetIsPushing: targetState?.isPushing,
    targetDisplacementAttackTargetId: targetState?.displacementAttackTargetId,
    targetedByDisplacementAttackerId:
      targetState?.targetedByDisplacementAttackerId,
    targetIsAirborne: targetState?.isAirborne,
    targetIsAirborneVTOLorWIGE:
      context.attackerJumpMP !== undefined &&
      context.elevationDifference !== undefined &&
      isPhysicalAirborneVtolOrWigeTarget(
        targetState?.unitType,
        targetState?.motionType,
        targetState?.isAirborne,
      ),
    attackerJumpMP: context.attackerJumpMP,
    attackerOccupiedBuildingId: attackerState.occupiedBuildingId,
    targetOccupiedBuildingId: targetState?.occupiedBuildingId,
    targetIsSelf: attackerId === targetId,
    targetIsFriendly: targetState
      ? attackerState.side === targetState.side
      : undefined,
    targetDistance: targetState
      ? hexDistance(attackerState.position, targetState.position)
      : undefined,
    targetTonnage: context.targetTonnage,
    targetMovementModifier: context.targetMovementModifier,
    targetEvading: targetState?.isEvading,
    targetEvasionBonus: targetState?.evasionBonus,
    attackerMovementModifier: context.attackerMovementModifier,
    retractableBladeExtended: context.retractableBladeExtended,
    attackerJumpedThisTurn:
      context.attackerJumpedThisTurn ??
      attackerState.movementThisTurn === MovementType.Jump,
    attackerUsedMechanicalJumpBooster:
      context.attackerUsedMechanicalJumpBooster ??
      attackerState.usedMechanicalJumpBoosterThisTurn,
    attackerRanThisTurn: context.attackerRanThisTurn,
    attackerMovedBackwardThisTurn:
      context.attackerMovedBackwardThisTurn ??
      attackerState.movedBackwardThisTurn,
    limbsUsedThisTurn:
      context.limbsUsedThisTurn ??
      physicalAttackLimbsUsedThisTurn(
        session.events,
        session.currentState.turn,
        attackerId,
      ),
    limb: declaredLimb,
    lowerArmActuatorPresent: context.lowerArmActuatorPresent,
    handActuatorPresent: context.handActuatorPresent,
    upperLegActuatorPresent: context.upperLegActuatorPresent,
    footActuatorPresent: context.footActuatorPresent,
    leftLegHasTalons:
      context.leftLegHasTalons ?? attackerState.leftLegHasTalons,
    rightLegHasTalons:
      context.rightLegHasTalons ?? attackerState.rightLegHasTalons,
    leftArmHasTalons:
      context.leftArmHasTalons ?? attackerState.leftArmHasTalons,
    rightArmHasTalons:
      context.rightArmHasTalons ?? attackerState.rightArmHasTalons,
    leftFootActuatorPresent: context.leftFootActuatorPresent,
    rightFootActuatorPresent: context.rightFootActuatorPresent,
    leftArmFootActuatorPresent: context.leftArmFootActuatorPresent,
    rightArmFootActuatorPresent: context.rightArmFootActuatorPresent,
    leftArmHasClaw: context.leftArmHasClaw ?? attackerState.leftArmHasClaw,
    rightArmHasClaw: context.rightArmHasClaw ?? attackerState.rightArmHasClaw,
    leftArmCarryingCargo:
      context.leftArmCarryingCargo ?? attackerState.leftArmCarryingCargo,
    rightArmCarryingCargo:
      context.rightArmCarryingCargo ?? attackerState.rightArmCarryingCargo,
    optionalRules: context.optionalRules ?? session.config.optionalRules,
    tacOpsTripAttackEnabled: context.tacOpsTripAttackEnabled,
    tacOpsGrapplingEnabled: context.tacOpsGrapplingEnabled,
    grappleSide: context.grappleSide,
    attackerGrappledTargetId:
      context.attackerGrappledTargetId ?? attackerState.grappledUnitId,
    targetGrappledTargetId:
      context.targetGrappledTargetId ?? targetState?.grappledUnitId,
    attackerIsGrappleAttacker:
      context.attackerIsGrappleAttacker ?? attackerState.isGrappleAttacker,
    targetIsGrappleAttacker:
      context.targetIsGrappleAttacker ?? targetState?.isGrappleAttacker,
    attackerChainWhipGrappled:
      context.attackerChainWhipGrappled ?? attackerState.isChainWhipGrappled,
    leftArmAesFunctional: context.leftArmAesFunctional,
    rightArmAesFunctional: context.rightArmAesFunctional,
    attackerWeightClass: context.attackerWeightClass,
    targetWeightClass: context.targetWeightClass,
    attackerAlreadyGrappled: context.attackerAlreadyGrappled,
    targetInFrontArc: targetState
      ? (context.targetInFrontArc ??
        isTargetInFrontArc(
          attackerState.position,
          attackerState.facing,
          targetState.position,
        ))
      : context.targetInFrontArc,
    leftTripLimbUsable: context.leftTripLimbUsable,
    rightTripLimbUsable: context.rightTripLimbUsable,
    legAesFunctional: context.legAesFunctional,
    thrashBlockingTerrains: context.thrashBlockingTerrains,
    hasWorkingThrashArmOrLeg: context.hasWorkingThrashArmOrLeg,
    tacOpsJumpJetAttackEnabled: context.tacOpsJumpJetAttackEnabled,
    jumpJetAttackSelectedLeg: jumpJetAttackSelectedLegForLimb(
      declaredLimb,
      context,
    ),
    leftReadyJumpJetCount: context.leftReadyJumpJetCount,
    rightReadyJumpJetCount: context.rightReadyJumpJetCount,
    leftLegWet: context.leftLegWet,
    rightLegWet: context.rightLegWet,
    leftLegWeaponFiredThisTurn: legWeaponFiredThisTurn(
      attackerState,
      context,
      'left',
    ),
    rightLegWeaponFiredThisTurn: legWeaponFiredThisTurn(
      attackerState,
      context,
      'right',
    ),
    standingAttackerHeightAboveTargetHeight:
      context.standingAttackerHeightAboveTargetHeight,
    proneTargetElevationInRange: context.proneTargetElevationInRange,
    targetDirectlyAheadOfFeet: targetState
      ? (context.targetDirectlyAheadOfFeet ??
        isTargetDirectlyAhead(
          attackerState.position,
          attackerState.facing,
          targetState.position,
        ))
      : context.targetDirectlyAheadOfFeet,
    targetDirectlyBehindFeet: targetState
      ? (context.targetDirectlyBehindFeet ??
        isTargetDirectlyBehindFeet(attackerState, targetState))
      : context.targetDirectlyBehindFeet,
    targetIsSwarmingInfantryOnAttacker:
      context.targetIsSwarmingInfantryOnAttacker ??
      targetIsSwarmingInfantryOnAttacker(attackerId, targetState),
    targetIsINarcPod:
      context.targetIsINarcPod ?? targetHasINarcPods(targetState),
    armAesFunctional: context.armAesFunctional,
    torsoMountedCockpit: context.torsoMountedCockpit,
    headSensorHits: context.headSensorHits,
    centerTorsoSensorHits: context.centerTorsoSensorHits,
    defenderHasMagneticClaws: context.defenderHasMagneticClaws,
    pushDestinationValid: context.pushDestinationValid,
    pushTargetDirectlyAhead: targetState
      ? isTargetDirectlyAhead(
          attackerState.position,
          attackerState.facing,
          targetState.position,
        )
      : undefined,
    pilotAbilities: context.pilotAbilities ?? attackerState.abilities,
    unitQuirks: context.unitQuirks ?? attackerState.unitQuirks,
    designatedEnvironment:
      context.designatedEnvironment ?? attackerState.designatedEnvironment,
    environmentalLight:
      context.environmentalLight ??
      session.config.environmentalConditions?.light,
    targetIlluminated: context.targetIlluminated,
    elevationDifference: context.elevationDifference,
    elevationContext: context.elevationContext,
    terrainContext: context.terrainContext,
  };

  // Per task 3.1 / 3.2 / 3.3 / 3.4 / 3.5 / 3.6 / 3.7: restrictions run
  // per attack type. Charge / DFA / melee gate on the same helpers used
  // by the to-hit layer.
  let restriction: IPhysicalAttackRestriction;
  if (attackType === 'punch') {
    restriction = canPunch(input);
  } else if (attackType === 'kick') {
    restriction = canKick(input);
  } else if (attackType === 'charge') {
    restriction = canCharge(input);
  } else if (attackType === 'dfa') {
    restriction = canDFA(input);
  } else if (attackType === 'push') {
    restriction = canPush(input);
  } else if (attackType === 'trip') {
    restriction = canTripPhysical(input);
  } else if (attackType === 'thrash') {
    restriction = canThrashPhysical(input);
  } else if (attackType === 'jump-jet-attack') {
    restriction = canJumpJetAttackPhysical(input);
  } else if (attackType === 'brush-off') {
    restriction = canBrushOffPhysical(input);
  } else if (attackType === 'grapple') {
    restriction = canGrapplePhysical(input);
  } else if (attackType === 'break-grapple') {
    restriction = canBreakGrapplePhysical(input);
  } else if (
    attackType === 'hatchet' ||
    attackType === 'sword' ||
    attackType === 'mace' ||
    attackType === 'lance' ||
    attackType === 'retractable-blade'
  ) {
    restriction = canMeleeWeapon(input);
  } else {
    restriction = { allowed: true };
  }

  if (!restriction.allowed) {
    // Per spec task 3.8: rejections surface as a
    // `PhysicalAttackResolved { hit:false, roll:0, toHitNumber:Infinity }`
    // event whose `location` field carries the reason code so replay +
    // UI can distinguish rejections from rolled misses. A future change
    // can promote this to a dedicated `PhysicalAttackInvalid` event.
    const sequence = session.events.length;
    const { turn } = session.currentState;
    return appendEvent(
      session,
      createPhysicalAttackResolvedEvent(
        session.id,
        sequence,
        turn,
        attackerId,
        targetId,
        attackType,
        0,
        Infinity,
        false,
        undefined,
        buildRestrictionEventReason(restriction),
      ),
    );
  }

  const sequence = session.events.length;
  const { turn } = session.currentState;
  // Pre-declaration to-hit calc — the resolver re-rolls, but the
  // declared event carries the calculated TN so UI can show the
  // forecast modal before resolution.
  const declaredTN = calculatePhysicalToHit(input).finalToHit;
  const hitTable = selectPhysicalHitTable(input);

  return appendEvent(
    session,
    createPhysicalAttackDeclaredEvent(
      session.id,
      sequence,
      turn,
      attackerId,
      targetId,
      attackType,
      declaredTN,
      declaredLimb,
      hitTable,
      context.twoHandedZweihander,
      selectedINarcPodForBrushOff(attackType, context, targetState),
      context.blockerStepOutDecision,
    ),
  );
}

/**
 * Resolve all PhysicalAttackDeclared events for the current turn.
 * Each declaration runs through `resolvePhysicalAttack` (to-hit, hit
 * location, damage). On hit emits `PhysicalAttackResolved` +
 * `DamageApplied` chain via the same `resolveDamagePipeline` used by
 * weapon attacks; queues `PhysicalAttackTarget` PSR for the target.
 * On miss for kick / charge / DFA queues an attacker PSR
 * (`KickMiss` / `MissedCharge` / `MissedDFA`).
 *
 * `contextByAttacker` carries the per-unit static data (tonnage,
 * piloting skill, etc.) — callers (InteractiveSession, GameEngine)
 * supply it from catalog data.
 */
export function resolveAllPhysicalAttacks(
  session: IGameSession,
  contextByAttacker: Map<string, IPhysicalAttackContext>,
  diceRoller: DiceRoller = rollDice,
  grid?: IHexGrid,
): IGameSession {
  const { turn } = session.currentState;
  const declarations = session.events.filter(
    (e: IGameEvent) =>
      e.type === GameEventType.PhysicalAttackDeclared && e.turn === turn,
  );

  let currentSession = session;
  for (const declaration of declarations) {
    const payload = declaration.payload as IPhysicalAttackDeclaredPayload;
    const context = contextByAttacker.get(payload.attackerId);
    if (!context) continue;

    const attackerState = currentSession.currentState.units[payload.attackerId];
    const targetState = currentSession.currentState.units[payload.targetId];
    if (!attackerState) {
      continue;
    }
    if (!targetState) {
      const targetObjectReason = physicalTargetObjectInvalidReason(
        payload.attackType,
        context.targetObjectType,
      );
      currentSession = appendInvalidPhysicalResolution(
        currentSession,
        turn,
        payload,
        targetObjectReason ?? 'TargetMissing',
      );
      continue;
    }
    if (targetState.destroyed) {
      currentSession = appendInvalidPhysicalResolution(
        currentSession,
        turn,
        payload,
        'TargetDestroyed',
      );
      continue;
    }
    if (targetState.hasRetreated) {
      currentSession = appendInvalidPhysicalResolution(
        currentSession,
        turn,
        payload,
        'TargetRetreated',
      );
      continue;
    }
    if (targetState.hasEjected) {
      currentSession = appendInvalidPhysicalResolution(
        currentSession,
        turn,
        payload,
        'TargetEjected',
      );
      continue;
    }
    const targetContext = contextByAttacker.get(payload.targetId);

    const componentDamage =
      attackerState.componentDamage ?? buildDefaultComponentDamageState();
    const attackerUnit = currentSession.units.find(
      (unit) => unit.id === payload.attackerId,
    );
    const targetUnit = currentSession.units.find(
      (unit) => unit.id === payload.targetId,
    );
    const targetObjectType =
      context.targetObjectType ??
      physicalTargetObjectTypeForUnitType(targetState.unitType);
    const resolvedLimb = payload.limb ?? context.limb;

    const input: IPhysicalAttackInput = {
      attackerId: payload.attackerId,
      targetId: payload.targetId,
      attackerTonnage: context.attackerTonnage,
      pilotingSkill: context.pilotingSkill,
      componentDamage,
      attackType: payload.attackType,
      arm: context.arm,
      twoHandedZweihander:
        payload.twoHandedZweihander ?? context.twoHandedZweihander,
      hexesMoved: context.hexesMoved,
      heat: attackerState.heat,
      hasTSM: context.hasTSM,
      isUnderwater:
        (context.isUnderwater ?? false) ||
        (targetContext?.isUnderwater ?? false),
      attackerWaterDepth:
        context.attackerWaterDepth ??
        (grid ? waterDepthAtPosition(grid, attackerState.position) : undefined),
      weaponsFiredFromArm: weaponsFiredFromArmForAttack(
        attackerState,
        payload.attackType,
        context,
      ),
      attackerDestroyedLocations: attackerState.destroyedLocations,
      attackerUnitType:
        context.attackerUnitType ??
        attackerState.unitType ??
        attackerUnit?.unitType,
      attackerMovementMode:
        context.attackerMovementMode ?? attackerState.motionType,
      attackerConversionMode:
        context.attackerConversionMode ?? attackerState.conversionMode,
      attackerIsAirborneVTOLOrWiGE: context.attackerIsAirborneVTOLOrWiGE,
      attackerVehicleCrewStunned:
        attackerState.combatState?.kind === 'vehicle'
          ? attackerState.combatState.state.motive.crewStunnedPhases > 0
          : undefined,
      attackerIsQuad: attackerState.isQuad,
      attackerIsAirborne: attackerState.isAirborne,
      attackerArmsFlipped: attackerState.armsFlipped,
      targetUnitType:
        context.targetUnitType ?? targetState.unitType ?? targetUnit?.unitType,
      targetPilotingSkill: targetState.piloting,
      attackerEvading: attackerState.isEvading,
      attackerSpotting: attackerState.isSpotting,
      attackerLoadingOrUnloadingCargo: attackerState.isLoadingOrUnloadingCargo,
      attackerTargetedByDisplacementAttackerId:
        attackerState.targetedByDisplacementAttackerId,
      attackerProne: attackerState.prone,
      attackerHullDown: attackerState.hullDown,
      attackerStuck: attackerState.isStuck,
      targetProne: targetState.prone,
      targetMovementComplete: context.targetMovementComplete,
      targetImmobile: targetState.shutdown,
      targetExists: true,
      targetObjectType,
      targetDestroyed: targetState.destroyed,
      targetRetreated: targetState.hasRetreated,
      targetEjected: targetState.hasEjected,
      attackerBoardId: attackerState.boardId,
      targetBoardId: targetState.boardId,
      targetIsPassenger: targetState.isPassenger,
      targetIsSwarming: targetState.isSwarming,
      targetIsMakingDFA: targetState.isMakingDFA,
      targetIsMakingDisplacementAttack: targetState.isMakingDisplacementAttack,
      targetIsPushing: targetState.isPushing,
      targetDisplacementAttackTargetId: targetState.displacementAttackTargetId,
      targetedByDisplacementAttackerId:
        targetState.targetedByDisplacementAttackerId,
      targetIsAirborne: targetState.isAirborne,
      targetIsAirborneVTOLorWIGE:
        context.attackerJumpMP !== undefined &&
        context.elevationDifference !== undefined &&
        isPhysicalAirborneVtolOrWigeTarget(
          targetState.unitType,
          targetState.motionType,
          targetState.isAirborne,
        ),
      attackerJumpMP: context.attackerJumpMP,
      attackerOccupiedBuildingId: attackerState.occupiedBuildingId,
      targetOccupiedBuildingId: targetState.occupiedBuildingId,
      targetIsSelf: payload.attackerId === payload.targetId,
      targetIsFriendly: attackerState.side === targetState.side,
      targetDistance: hexDistance(attackerState.position, targetState.position),
      targetTonnage: context.targetTonnage,
      targetMovementModifier: context.targetMovementModifier,
      targetEvading: targetState.isEvading,
      targetEvasionBonus: targetState.evasionBonus,
      attackerMovementModifier: context.attackerMovementModifier,
      retractableBladeExtended: context.retractableBladeExtended,
      attackerJumpedThisTurn:
        context.attackerJumpedThisTurn ??
        attackerState.movementThisTurn === MovementType.Jump,
      attackerUsedMechanicalJumpBooster:
        context.attackerUsedMechanicalJumpBooster ??
        attackerState.usedMechanicalJumpBoosterThisTurn,
      attackerRanThisTurn: context.attackerRanThisTurn,
      attackerMovedBackwardThisTurn:
        context.attackerMovedBackwardThisTurn ??
        attackerState.movedBackwardThisTurn,
      limbsUsedThisTurn: context.limbsUsedThisTurn,
      limb: resolvedLimb,
      lowerArmActuatorPresent: context.lowerArmActuatorPresent,
      handActuatorPresent: context.handActuatorPresent,
      upperLegActuatorPresent: context.upperLegActuatorPresent,
      footActuatorPresent: context.footActuatorPresent,
      leftLegHasTalons:
        context.leftLegHasTalons ?? attackerState.leftLegHasTalons,
      rightLegHasTalons:
        context.rightLegHasTalons ?? attackerState.rightLegHasTalons,
      leftArmHasTalons:
        context.leftArmHasTalons ?? attackerState.leftArmHasTalons,
      rightArmHasTalons:
        context.rightArmHasTalons ?? attackerState.rightArmHasTalons,
      leftFootActuatorPresent: context.leftFootActuatorPresent,
      rightFootActuatorPresent: context.rightFootActuatorPresent,
      leftArmFootActuatorPresent: context.leftArmFootActuatorPresent,
      rightArmFootActuatorPresent: context.rightArmFootActuatorPresent,
      leftArmHasClaw: context.leftArmHasClaw ?? attackerState.leftArmHasClaw,
      rightArmHasClaw: context.rightArmHasClaw ?? attackerState.rightArmHasClaw,
      leftArmCarryingCargo:
        context.leftArmCarryingCargo ?? attackerState.leftArmCarryingCargo,
      rightArmCarryingCargo:
        context.rightArmCarryingCargo ?? attackerState.rightArmCarryingCargo,
      optionalRules:
        context.optionalRules ?? currentSession.config.optionalRules,
      tacOpsTripAttackEnabled: context.tacOpsTripAttackEnabled,
      tacOpsGrapplingEnabled: context.tacOpsGrapplingEnabled,
      grappleSide: context.grappleSide,
      attackerGrappledTargetId:
        context.attackerGrappledTargetId ?? attackerState.grappledUnitId,
      targetGrappledTargetId:
        context.targetGrappledTargetId ?? targetState.grappledUnitId,
      attackerIsGrappleAttacker:
        context.attackerIsGrappleAttacker ?? attackerState.isGrappleAttacker,
      targetIsGrappleAttacker:
        context.targetIsGrappleAttacker ?? targetState.isGrappleAttacker,
      attackerChainWhipGrappled:
        context.attackerChainWhipGrappled ?? attackerState.isChainWhipGrappled,
      leftArmAesFunctional: context.leftArmAesFunctional,
      rightArmAesFunctional: context.rightArmAesFunctional,
      attackerWeightClass: context.attackerWeightClass,
      targetWeightClass: context.targetWeightClass,
      attackerAlreadyGrappled: context.attackerAlreadyGrappled,
      targetInFrontArc:
        context.targetInFrontArc ??
        isTargetInFrontArc(
          attackerState.position,
          attackerState.facing,
          targetState.position,
        ),
      leftTripLimbUsable: context.leftTripLimbUsable,
      rightTripLimbUsable: context.rightTripLimbUsable,
      legAesFunctional: context.legAesFunctional,
      thrashBlockingTerrains:
        context.thrashBlockingTerrains ??
        thrashBlockingTerrainsForHexTerrain(
          terrainAtPosition(grid, attackerState.position),
        ),
      hasWorkingThrashArmOrLeg: context.hasWorkingThrashArmOrLeg,
      tacOpsJumpJetAttackEnabled: context.tacOpsJumpJetAttackEnabled,
      jumpJetAttackSelectedLeg: jumpJetAttackSelectedLegForLimb(
        resolvedLimb,
        context,
      ),
      leftReadyJumpJetCount: context.leftReadyJumpJetCount,
      rightReadyJumpJetCount: context.rightReadyJumpJetCount,
      leftLegWet: context.leftLegWet,
      rightLegWet: context.rightLegWet,
      leftLegWeaponFiredThisTurn: legWeaponFiredThisTurn(
        attackerState,
        context,
        'left',
      ),
      rightLegWeaponFiredThisTurn: legWeaponFiredThisTurn(
        attackerState,
        context,
        'right',
      ),
      standingAttackerHeightAboveTargetHeight:
        context.standingAttackerHeightAboveTargetHeight,
      proneTargetElevationInRange: context.proneTargetElevationInRange,
      targetDirectlyAheadOfFeet:
        context.targetDirectlyAheadOfFeet ??
        isTargetDirectlyAhead(
          attackerState.position,
          attackerState.facing,
          targetState.position,
        ),
      targetDirectlyBehindFeet:
        context.targetDirectlyBehindFeet ??
        isTargetDirectlyBehindFeet(attackerState, targetState),
      targetIsSwarmingInfantryOnAttacker:
        context.targetIsSwarmingInfantryOnAttacker ??
        targetIsSwarmingInfantryOnAttacker(payload.attackerId, targetState),
      targetIsINarcPod:
        context.targetIsINarcPod ?? targetHasINarcPods(targetState),
      armAesFunctional: context.armAesFunctional,
      torsoMountedCockpit: context.torsoMountedCockpit,
      headSensorHits: context.headSensorHits,
      centerTorsoSensorHits: context.centerTorsoSensorHits,
      defenderHasMagneticClaws: context.defenderHasMagneticClaws,
      pushDestinationValid: context.pushDestinationValid,
      pushTargetDirectlyAhead: isTargetDirectlyAhead(
        attackerState.position,
        attackerState.facing,
        targetState.position,
      ),
      pilotAbilities: context.pilotAbilities ?? attackerState.abilities,
      unitQuirks: context.unitQuirks ?? attackerState.unitQuirks,
      designatedEnvironment:
        context.designatedEnvironment ?? attackerState.designatedEnvironment,
      environmentalLight:
        context.environmentalLight ??
        currentSession.config.environmentalConditions?.light,
      targetIlluminated: context.targetIlluminated,
      elevationDifference: context.elevationDifference,
      elevationContext: context.elevationContext,
      terrainContext: context.terrainContext,
      hitTableOverride: payload.hitTable,
    };

    // The standalone module uses a d6 roller; wrap our 2d6 roller's
    // first die value to feed it.
    const d6Roller = () => {
      const roll = diceRoller();
      return roll.dice[0];
    };

    const result = resolvePhysicalAttack(input, d6Roller);
    const displacementOutcome = computeResolvedPhysicalDisplacementOutcome({
      grid,
      attackType: payload.attackType,
      attacker: attackerState,
      target: targetState,
      hit: result.hit,
      d6Roller,
      friendlyUnitIds: friendlyUnitIdsForDisplacement(
        currentSession.currentState.units,
        targetState,
      ),
      targetSourceContainsGroundedDropShip: sourceContainsGroundedDropShip(
        Object.values(currentSession.currentState.units),
        targetState,
      ),
      blockerStepOutDecision: payload.blockerStepOutDecision,
    });
    const displacements = displacementOutcome.displacements;
    const impossibleDisplacementDestroyedUnitId =
      displacementOutcome.impossibleDisplacementDestroyedUnitId;
    const chargeHitDisplacementBlocked =
      result.hit &&
      payload.attackType === 'charge' &&
      Boolean(grid) &&
      displacements.length === 0;
    const dfaMissFallApplies =
      !result.hit &&
      payload.attackType === 'dfa' &&
      impossibleDisplacementDestroyedUnitId !== payload.attackerId &&
      dfaMissDropsAttacker(displacements, payload.attackerId);

    const resolvedSeq = currentSession.events.length;
    currentSession = appendEvent(
      currentSession,
      createPhysicalAttackResolvedEvent(
        currentSession.id,
        resolvedSeq,
        turn,
        payload.attackerId,
        payload.targetId,
        payload.attackType,
        result.roll,
        result.toHitNumber,
        result.hit,
        result.hit ? result.targetDamage : undefined,
        result.hit ? result.hitLocation : result.restrictionReasonCode,
        undefined,
        displacements.length > 0 ? displacements : undefined,
        result.automaticHit,
        result.automaticHitReason,
        selectedINarcPodForBrushOff(payload.attackType, context, targetState),
      ),
    );

    if (result.hit && result.targetDamage > 0 && result.hitLocation) {
      // Per `implement-physical-attack-phase` tasks 6.4 / 7.4: charge +
      // DFA damage SHALL split into 5-point clusters with a hit-location
      // roll per cluster. Punch / kick / push / club apply as a single
      // chunk via the existing damage pipeline (their damage is rarely
      // > 5 and tabletop applies them as one cluster).
      const usesClusters =
        payload.attackType === 'charge' || payload.attackType === 'dfa';
      const clusters: readonly number[] = usesClusters
        ? splitPhysicalDamageIntoClusters(result.targetDamage)
        : [result.targetDamage];

      for (const clusterDamage of clusters) {
        // Per task 6.5 / 7.4-7.5: each cluster rolls its own hit-location
        // (using the same hit-table the resolver already chose). The first
        // cluster reuses the hit-location the resolver computed; later
        // clusters re-roll.
        const clusterIndex = clusters.indexOf(clusterDamage);
        const clusterHitLocation =
          clusterIndex === 0
            ? result.hitLocation
            : determinePhysicalHitLocation(
                payload.attackType === 'kick' ? 'kick' : 'punch',
                d6Roller,
              );

        const damageState = buildDamageStateFromUnit(targetState);
        const damageResult = resolveDamagePipeline(
          damageState,
          clusterHitLocation as CombatLocation,
          clusterDamage,
        );
        for (const locationDamage of damageResult.result.locationDamages) {
          const damageSeq = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createDamageAppliedEvent(
              currentSession.id,
              damageSeq,
              turn,
              payload.targetId,
              locationDamage.location,
              locationDamage.damage,
              locationDamage.armorRemaining,
              locationDamage.structureRemaining,
              locationDamage.destroyed,
            ),
          );
        }
      }
    }

    if (
      !result.hit &&
      payload.attackType === 'brush-off' &&
      result.attackerDamage > 0 &&
      result.hitLocation
    ) {
      const damageState = buildDamageStateFromUnit(attackerState);
      const damageResult = resolveDamagePipeline(
        damageState,
        result.hitLocation,
        result.attackerDamage,
      );
      for (const locationDamage of damageResult.result.locationDamages) {
        const damageSeq = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createDamageAppliedEvent(
            currentSession.id,
            damageSeq,
            turn,
            payload.attackerId,
            locationDamage.location,
            locationDamage.damage,
            locationDamage.armorRemaining,
            locationDamage.structureRemaining,
            locationDamage.destroyed,
          ),
        );
      }
    }

    // Per task 7.4 / 7.5: DFA also damages the attacker's legs. Split
    // attacker leg damage into 5-point clusters; alternate legs.
    if (
      result.hit &&
      payload.attackType === 'dfa' &&
      result.attackerLegDamagePerLeg > 0
    ) {
      const legClusters = splitPhysicalDamageIntoClusters(
        result.attackerLegDamagePerLeg * 2,
      );
      let legIndex = 0;
      for (const clusterDamage of legClusters) {
        const leg = legIndex % 2 === 0 ? 'left_leg' : 'right_leg';
        legIndex += 1;
        const damageState = buildDamageStateFromUnit(attackerState);
        const damageResult = resolveDamagePipeline(
          damageState,
          leg as CombatLocation,
          clusterDamage,
        );
        for (const locationDamage of damageResult.result.locationDamages) {
          const damageSeq = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createDamageAppliedEvent(
              currentSession.id,
              damageSeq,
              turn,
              payload.attackerId,
              locationDamage.location,
              locationDamage.damage,
              locationDamage.armorRemaining,
              locationDamage.structureRemaining,
              locationDamage.destroyed,
            ),
          );
        }
      }
    }

    // Per task 6.3: charge also damages the attacker. Apply as clusters.
    if (
      result.hit &&
      payload.attackType === 'charge' &&
      result.attackerDamage > 0
    ) {
      const attackerClusters = splitPhysicalDamageIntoClusters(
        result.attackerDamage,
      );
      for (const clusterDamage of attackerClusters) {
        const hitLocation = determinePhysicalHitLocation('punch', d6Roller);
        const damageState = buildDamageStateFromUnit(attackerState);
        const damageResult = resolveDamagePipeline(
          damageState,
          hitLocation as CombatLocation,
          clusterDamage,
        );
        for (const locationDamage of damageResult.result.locationDamages) {
          const damageSeq = currentSession.events.length;
          currentSession = appendEvent(
            currentSession,
            createDamageAppliedEvent(
              currentSession.id,
              damageSeq,
              turn,
              payload.attackerId,
              locationDamage.location,
              locationDamage.damage,
              locationDamage.armorRemaining,
              locationDamage.structureRemaining,
              locationDamage.destroyed,
            ),
          );
        }
      }
    }

    // PSR queueing: target gets PhysicalAttackTarget on hit; attacker
    // gets the per-attack-type miss PSR on miss. Per task 6.6 / 7.5,
    // charge + DFA hits queue PSRs for BOTH attacker and target.
    //
    // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
    // (piloting-skill-rolls delta — PSRTriggered Carries Base Skill):
    // pass the unit's base piloting skill (looked up from `IGameUnit`).
    // For the attacker the runner already has `context.pilotingSkill`;
    // for the target we look it up from `currentSession.units`.
    if (
      result.hit &&
      result.targetPSR &&
      impossibleDisplacementDestroyedUnitId !== payload.targetId &&
      !chargeHitDisplacementBlocked
    ) {
      // Per `structure-psr-reason-as-discriminated-code` (PR E): map the
      // generic `physical_attack_target` trigger source to the canonical
      // `PSRTrigger` matching the originating attack type so consumers
      // can filter target PSRs by attack family.
      const targetPsr =
        payload.attackType === 'kick'
          ? {
              reason: 'Kicked',
              additionalModifier: 0,
              triggerSource: PSRTrigger.Kicked,
              reasonCode: PSRTrigger.Kicked,
            }
          : payload.attackType === 'charge'
            ? {
                reason: 'Charged',
                additionalModifier: CHARGE_HIT_PSR_MODIFIER,
                triggerSource: PSRTrigger.Charged,
                reasonCode: PSRTrigger.Charged,
              }
            : payload.attackType === 'dfa'
              ? {
                  reason: 'Hit by DFA',
                  additionalModifier: DFA_TARGET_PSR_MODIFIER,
                  triggerSource: PSRTrigger.DFATarget,
                  reasonCode: PSRTrigger.DFATarget,
                }
              : payload.attackType === 'push'
                ? {
                    reason: 'Pushed',
                    additionalModifier: 0,
                    triggerSource: PSRTrigger.Pushed,
                    reasonCode: PSRTrigger.Pushed,
                  }
                : payload.attackType === 'trip'
                  ? {
                      reason: 'Tripped',
                      additionalModifier: 0,
                      triggerSource: 'trip',
                      reasonCode: undefined,
                    }
                  : {
                      reason: 'Hit by physical attack',
                      additionalModifier: 0,
                      triggerSource: 'physical_attack_target',
                      reasonCode: undefined,
                    };
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.PhysicalAttack,
          payload.targetId,
          targetPsr.reason,
          targetPsr.additionalModifier,
          targetPsr.triggerSource,
          targetUnit?.piloting,
          targetPsr.reasonCode,
        ),
      );
    }
    if (result.hit && result.attackerPSR && !chargeHitDisplacementBlocked) {
      // Per task 6.6 / 7.5: on charge / DFA hit the attacker also rolls a
      // PSR. Use a typed trigger source so the PSR resolver can apply the
      // attack-specific modifier table.
      const attackerHitTrigger =
        payload.attackType === 'charge'
          ? 'charge_attacker_hit'
          : payload.attackType === 'dfa'
            ? 'dfa_attacker_hit'
            : payload.attackType === 'thrash'
              ? 'thrash_attacker_hit'
              : 'physical_attacker_hit';
      // Attacker-on-hit PSRs share the canonical movement codes for the
      // attack family — Charged / DFATarget mirror the target codes per
      // the PSR Trigger Catalog. Kept undefined when no canonical code
      // applies (e.g. generic `physical_attacker_hit`).
      const attackerHitReasonCode =
        payload.attackType === 'charge'
          ? PSRTrigger.Charged
          : payload.attackType === 'dfa'
            ? PSRTrigger.DFATarget
            : undefined;
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.PhysicalAttack,
          payload.attackerId,
          payload.attackType === 'dfa'
            ? 'Executed DFA'
            : payload.attackType === 'thrash'
              ? 'Thrashing attack'
              : `Hit ${payload.attackType}`,
          result.attackerPSRModifier,
          attackerHitTrigger,
          context.pilotingSkill,
          attackerHitReasonCode,
        ),
      );
    }
    if (
      !result.hit &&
      result.attackerPSR &&
      impossibleDisplacementDestroyedUnitId !== payload.attackerId &&
      !dfaMissFallApplies
    ) {
      const triggerSource =
        payload.attackType === 'kick'
          ? 'kick_miss'
          : payload.attackType === 'charge'
            ? 'charge_miss'
            : payload.attackType === 'dfa'
              ? 'dfa_miss'
              : 'physical_miss';
      const missReasonCode =
        payload.attackType === 'kick'
          ? PSRTrigger.KickMiss
          : payload.attackType === 'charge'
            ? PSRTrigger.ChargeMiss
            : payload.attackType === 'dfa'
              ? PSRTrigger.DFAMiss
              : undefined;
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.PhysicalAttack,
          payload.attackerId,
          `Missed ${payload.attackType}`,
          result.attackerPSRModifier,
          triggerSource,
          context.pilotingSkill,
          missReasonCode,
        ),
      );
    }

    for (const dominoUnitId of dominoEffectDisplacedUnitIds(displacements)) {
      const dominoPsr = createDominoEffectPSR(dominoUnitId);
      const dominoUnit =
        currentSession.currentState.units[dominoUnitId] ??
        currentSession.units.find((unit) => unit.id === dominoUnitId);
      const psrSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          psrSeq,
          turn,
          GamePhase.PhysicalAttack,
          dominoUnitId,
          dominoPsr.reason,
          dominoPsr.additionalModifier,
          dominoPsr.triggerSource,
          dominoUnit?.piloting,
          dominoPsr.reasonCode,
        ),
      );
    }

    if (dfaMissFallApplies) {
      currentSession = appendDfaMissFallDamage(currentSession, {
        turn,
        attackerId: payload.attackerId,
        attackerTonnage: context.attackerTonnage,
        attackerPilotingSkill: context.pilotingSkill,
        attackerPilotAbilities:
          context.pilotAbilities ?? attackerState.abilities,
        attackerFacing: attackerState.facing,
        d6Roller,
      });
    }

    if (
      impossibleDisplacementDestroyedUnitId !== undefined &&
      !currentSession.currentState.units[impossibleDisplacementDestroyedUnitId]
        ?.destroyed
    ) {
      const destroyedSeq = currentSession.events.length;
      currentSession = appendEvent(
        currentSession,
        createUnitDestroyedEvent(
          currentSession.id,
          destroyedSeq,
          turn,
          GamePhase.PhysicalAttack,
          impossibleDisplacementDestroyedUnitId,
          'impossible_displacement',
          impossibleDisplacementDestroyedUnitId === payload.targetId
            ? { killerUnitId: payload.attackerId }
            : undefined,
        ),
      );
    }
  }

  return currentSession;
}
