import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import {
  GamePhase,
  IGameSession,
  IUnitGameState,
  IWeaponAttackData,
  VehicleAttackDirection,
} from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { type D6Roller, type DiceRoller } from './diceTypes';
import {
  createAttackResolvedEvent,
  createDamageAppliedEvent,
  createLocationDestroyedEvent,
  createMotiveDamagedEvent,
  createMotivePenaltyAppliedEvent,
  createVehicleImmobilizedEvent,
  createVTOLCrashCheckEvent,
} from './gameEvents';
import { appendUnitDestroyedEvent } from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { resolveVehicleCriticalIfTriggered } from './gameSessionVehicleCriticalResolution';
import { computeEffectiveMP } from './motiveDamage';
import {
  vehicleHitLocationToArmorKey,
  vehicleResolveDamage,
} from './vehicleDamage';
import {
  determineVehicleHitLocationFromRoll,
  getHullDownVehicleFixedLocation,
  type IVehicleHitLocationOptions,
} from './vehicleHitLocation';

export interface IResolveVehicleAttackHitParams {
  readonly session: IGameSession;
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponId: string;
  readonly weaponData: IWeaponAttackData;
  readonly attackRollTotal: number;
  readonly toHitNumber: number;
  readonly attackDirection: VehicleAttackDirection;
  readonly ammoBinId?: string | null;
  readonly targetState: IUnitGameState;
  readonly diceRoller: DiceRoller;
  readonly d6Roller: D6Roller;
}

export function tryResolveVehicleAttackHit(
  params: IResolveVehicleAttackHitParams,
): IGameSession | null {
  const targetCombatState = params.targetState.combatState;
  if (targetCombatState?.kind !== 'vehicle') {
    return null;
  }

  const vehicleState = targetCombatState.state;
  const hitOptions = buildVehicleHitLocationOptions(
    params.targetState,
    vehicleState.motionType,
  );
  const fixedLocation = getHullDownVehicleFixedLocation(
    params.attackDirection,
    hitOptions,
  );
  const locationRoll = fixedLocation ? undefined : params.diceRoller();
  const locationDice = fixedLocation
    ? ([0, 0] as const)
    : ([locationRoll!.dice[0] ?? 0, locationRoll!.dice[1] ?? 0] as const);
  const hitLocation = determineVehicleHitLocationFromRoll(
    params.attackDirection,
    locationDice,
    hitOptions,
  );
  const armorLocation = vehicleHitLocationToArmorKey(hitLocation.location);

  let currentSession = appendEvent(
    params.session,
    createAttackResolvedEvent(
      params.session.id,
      params.session.events.length,
      params.session.currentState.turn,
      params.attackerId,
      params.targetId,
      params.weaponId,
      params.attackRollTotal,
      params.toHitNumber,
      true,
      armorLocation,
      params.weaponData.damage,
      params.weaponData.heat,
      params.attackDirection,
      params.ammoBinId,
    ),
  );

  const damageResult = vehicleResolveDamage(
    vehicleState,
    hitLocation,
    params.weaponData.damage,
    { diceRoller: params.d6Roller },
  );

  for (const locationDamage of damageResult.locationDamages) {
    currentSession = appendEvent(
      currentSession,
      createDamageAppliedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        params.targetId,
        locationDamage.location,
        locationDamage.damage,
        locationDamage.armorRemaining,
        locationDamage.structureRemaining,
        locationDamage.destroyed,
      ),
    );

    if (locationDamage.destroyed) {
      currentSession = appendEvent(
        currentSession,
        createLocationDestroyedEvent(
          currentSession.id,
          currentSession.events.length,
          currentSession.currentState.turn,
          params.targetId,
          locationDamage.location,
        ),
      );
    }
  }

  if (damageResult.motiveRoll) {
    const previousMP = computeEffectiveMP(vehicleState.motive);
    const nextMP = computeEffectiveMP(damageResult.state.motive);
    const motiveRoll = damageResult.motiveRoll;

    currentSession = appendEvent(
      currentSession,
      createMotiveDamagedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        params.targetId,
        motiveRoll.severity,
        motiveRoll.mpPenalty,
        motiveRoll.dice,
      ),
    );

    if (
      previousMP.cruiseMP !== nextMP.cruiseMP ||
      previousMP.flankMP !== nextMP.flankMP
    ) {
      currentSession = appendEvent(
        currentSession,
        createMotivePenaltyAppliedEvent(
          currentSession.id,
          currentSession.events.length,
          currentSession.currentState.turn,
          GamePhase.WeaponAttack,
          params.targetId,
          previousMP.cruiseMP,
          nextMP.cruiseMP,
          nextMP.flankMP,
        ),
      );
    }
  }

  const wasImmobilized = vehicleState.motive.immobilized;
  const nowImmobilized = damageResult.state.motive.immobilized;
  if (!wasImmobilized && nowImmobilized) {
    currentSession = appendEvent(
      currentSession,
      createVehicleImmobilizedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        params.targetId,
        damageResult.crashCheckTriggered
          ? 'rotor_destroyed'
          : motiveImmobilizationCause(damageResult.motiveRoll),
      ),
    );
  }

  if (damageResult.crashCheckTriggered) {
    const altitude = vehicleState.altitude ?? 0;
    currentSession = appendEvent(
      currentSession,
      createVTOLCrashCheckEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        params.targetId,
        altitude,
        altitude * 10,
      ),
    );
  }

  const critSession = resolveVehicleCriticalIfTriggered({
    session: currentSession,
    targetId: params.targetId,
    location: armorLocation,
    hitLocation,
    damageResult,
    targetState: params.targetState,
    d6Roller: params.d6Roller,
  });
  currentSession = critSession.session;

  const unitDestroyed = damageResult.unitDestroyed || critSession.unitDestroyed;
  const destructionCause =
    critSession.destructionCause ?? damageResult.destructionCause;

  if (unitDestroyed) {
    currentSession = appendUnitDestroyedEvent(currentSession, {
      turn: currentSession.currentState.turn,
      phase: GamePhase.WeaponAttack,
      unitId: params.targetId,
      cause: mapVehicleDestructionCause(destructionCause),
    });
  }

  return currentSession;
}

function buildVehicleHitLocationOptions(
  targetState: IUnitGameState,
  motionType: GroundMotionType,
): IVehicleHitLocationOptions {
  return {
    isVTOL: motionType === GroundMotionType.VTOL,
    hullDown: {
      active: targetState.hullDown === true,
      backedIntoHullDown: targetState.hullDownEnteredBackwards === true,
      hasTurret: hasAvailableTurret(targetState),
    },
  };
}

function hasAvailableTurret(targetState: IUnitGameState): boolean {
  if (targetState.combatState?.kind !== 'vehicle') {
    return false;
  }

  const vehicleState = targetState.combatState.state;
  const turretType = vehicleState.turretType;
  const representedTurret =
    turretType === TurretType.SINGLE ||
    turretType === TurretType.DUAL ||
    turretType === TurretType.CHIN;
  if (!representedTurret) {
    return false;
  }

  const armor = vehicleState.armor as Record<string, number>;
  const structure = vehicleState.structure as Record<string, number>;
  const turretKey = motionTypeIsVTOL(vehicleState.motionType)
    ? VTOLLocation.TURRET
    : VehicleLocation.TURRET;
  return (
    !vehicleState.destroyedLocations.includes(turretKey) &&
    (armor[turretKey] !== undefined || structure[turretKey] !== undefined)
  );
}

function motionTypeIsVTOL(motionType: GroundMotionType): boolean {
  return motionType === GroundMotionType.VTOL;
}

function motiveImmobilizationCause(
  motiveRoll: { readonly roll: number } | undefined,
): 'motive_roll' | 'aggravation' {
  return motiveRoll && motiveRoll.roll < 12 ? 'aggravation' : 'motive_roll';
}

function mapVehicleDestructionCause(
  cause: string | undefined,
): 'damage' | 'ammo_explosion' | 'engine_destroyed' {
  if (cause === 'ammo_explosion' || cause === 'engine_destroyed') {
    return cause;
  }
  return 'damage';
}
