import {
  CombatLocation,
  GamePhase,
  IAmmoSlotState,
  IGameSession,
} from '@/types/gameplay';

import type { CriticalHitEvent } from './criticalHitResolution';

import {
  applyAmmoExplosionRearArmorBlowout,
  resolveAmmoExplosion,
  resolveBattleMechAmmoExplosionPilotDamage,
  resolveCaseAdjustedAmmoExplosionDamage,
  type CASEProtectionLevel,
} from './ammoTracking';
import {
  PILOT_DEATH_WOUND_THRESHOLD,
  resolveInternalDamage as resolveInternalDamagePipeline,
  resolvePilotConsciousnessCheck,
} from './damage';
import { type D6Roller } from './diceTypes';
import {
  createAmmoConsumedEvent,
  createAmmoExplosionEvent,
  createDamageAppliedEvent,
  createLocationDestroyedEvent,
  createPilotHitEvent,
  createTransferDamageEvent,
} from './gameEvents';
import {
  appendUnitDestroyedEvent,
  buildDamageStateFromUnit,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';

function findExplodingAmmoBin(
  ammoState: Record<string, IAmmoSlotState>,
  location: string,
  ammoBinId?: string,
): IAmmoSlotState | undefined {
  if (ammoBinId !== undefined) {
    const bin = ammoState[ammoBinId];
    return bin && bin.remainingRounds > 0 && bin.isExplosive ? bin : undefined;
  }

  return Object.values(ammoState).find(
    (bin) =>
      bin.location === location && bin.remainingRounds > 0 && bin.isExplosive,
  );
}

function criticalExplosionBin(
  event: CriticalHitEvent,
  unit: IGameSession['currentState']['units'][string],
): IAmmoSlotState | undefined {
  if (event.type !== 'critical_hit_resolved') return undefined;
  const payload = event.payload;
  if (payload.componentType !== 'ammo' || !payload.destroyed) {
    return undefined;
  }

  return findExplodingAmmoBin(
    unit.ammoState ?? {},
    payload.location,
    payload.ammoBinId,
  );
}

function cascadedArmFor(
  location: CombatLocation,
  newlyDestroyed: readonly CombatLocation[],
): CombatLocation | undefined {
  if (
    location === 'left_torso' &&
    newlyDestroyed.includes('left_arm' as CombatLocation)
  ) {
    return 'left_arm' as CombatLocation;
  }
  if (
    location === 'right_torso' &&
    newlyDestroyed.includes('right_arm' as CombatLocation)
  ) {
    return 'right_arm' as CombatLocation;
  }
  return undefined;
}

function appendWeaponAttackAmmoExplosionDamageCascade(
  session: IGameSession,
  unitId: string,
  location: string,
  damage: number,
  caseProtection: CASEProtectionLevel,
  d6Roller: D6Roller,
): { readonly session: IGameSession; readonly unitDestroyed: boolean } {
  const unit = session.currentState.units[unitId];
  if (!unit || damage <= 0) {
    return { session, unitDestroyed: false };
  }

  const blowout = applyAmmoExplosionRearArmorBlowout(
    buildDamageStateFromUnit(unit),
    location as CombatLocation,
    caseProtection,
    damage,
  );
  const damageResult = resolveInternalDamagePipeline(
    blowout.state,
    location as CombatLocation,
    damage,
    d6Roller,
    { applyHeadPilotDamage: false },
  );
  const locationDamages = [
    ...blowout.locationDamages,
    ...damageResult.result.locationDamages,
  ];
  const preDestroyedSet = new Set<CombatLocation>(
    unit.destroyedLocations as readonly CombatLocation[],
  );
  const newlyDestroyed = damageResult.state.destroyedLocations.filter(
    (loc) => !preDestroyedSet.has(loc),
  );

  let currentSession = session;
  const turn = currentSession.currentState.turn;
  for (const locationDamage of locationDamages) {
    currentSession = appendEvent(
      currentSession,
      createDamageAppliedEvent({
        gameId: currentSession.id,
        sequence: currentSession.events.length,
        turn,
        phase: GamePhase.WeaponAttack,
        unitId,
        location: locationDamage.location,
        damage: locationDamage.damage,
        armorRemaining: locationDamage.armorRemaining,
        structureRemaining: locationDamage.structureRemaining,
        locationDestroyed: locationDamage.destroyed,
      }),
    );

    if (locationDamage.destroyed) {
      const cascadedArm = cascadedArmFor(
        locationDamage.location,
        newlyDestroyed,
      );
      currentSession = appendEvent(
        currentSession,
        createLocationDestroyedEvent({
          gameId: currentSession.id,
          sequence: currentSession.events.length,
          turn,
          phase: GamePhase.WeaponAttack,
          unitId,
          location: locationDamage.location,
          cascadedTo: cascadedArm,
        }),
      );
      if (cascadedArm) {
        currentSession = appendEvent(
          currentSession,
          createLocationDestroyedEvent({
            gameId: currentSession.id,
            sequence: currentSession.events.length,
            turn,
            phase: GamePhase.WeaponAttack,
            unitId,
            location: cascadedArm,
          }),
        );
      }
    }

    if (
      locationDamage.transferredDamage > 0 &&
      locationDamage.transferLocation
    ) {
      currentSession = appendEvent(
        currentSession,
        createTransferDamageEvent({
          gameId: currentSession.id,
          sequence: currentSession.events.length,
          turn,
          phase: GamePhase.WeaponAttack,
          unitId,
          fromLocation: locationDamage.location,
          toLocation: locationDamage.transferLocation,
          damage: locationDamage.transferredDamage,
        }),
      );
    }
  }

  return {
    session: currentSession,
    unitDestroyed: damageResult.result.unitDestroyed && !unit.destroyed,
  };
}

function appendWeaponAttackAmmoExplosionPilotDamage(
  session: IGameSession,
  unitId: string,
  totalExplosionDamage: number,
  caseProtection: CASEProtectionLevel,
  d6Roller: D6Roller,
): { readonly session: IGameSession; readonly pilotDestroyed: boolean } {
  const unit = session.currentState.units[unitId];
  if (!unit) {
    return { session, pilotDestroyed: false };
  }

  const wounds = resolveBattleMechAmmoExplosionPilotDamage({
    totalDamage: totalExplosionDamage,
    caseProtection,
    pilotAbilities: unit.abilities,
  });
  if (wounds <= 0) {
    return { session, pilotDestroyed: false };
  }

  const totalWounds = unit.pilotWounds + wounds;
  const consciousnessCheck = resolvePilotConsciousnessCheck(
    totalWounds,
    wounds,
    unit.abilities,
    d6Roller,
    unit.pilotToughness,
    {
      edgePointsRemaining: unit.edgePointsRemaining,
      turn: session.currentState.turn,
      unitId,
    },
  );
  const consciousnessPassed =
    unit.pilotConscious &&
    (consciousnessCheck.conscious ?? true) &&
    totalWounds < PILOT_DEATH_WOUND_THRESHOLD;
  const currentSession = appendEvent(
    session,
    createPilotHitEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      GamePhase.WeaponAttack,
      unitId,
      wounds,
      totalWounds,
      'ammo_explosion',
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

  return {
    session: currentSession,
    pilotDestroyed: totalWounds >= PILOT_DEATH_WOUND_THRESHOLD,
  };
}

export function appendCritInducedAmmoExplosionEvents(input: {
  readonly session: IGameSession;
  readonly criticalEvents: readonly CriticalHitEvent[];
  readonly targetId: string;
  readonly d6Roller: D6Roller;
}): IGameSession {
  let currentSession = input.session;

  for (const criticalEvent of input.criticalEvents) {
    const unit = currentSession.currentState.units[input.targetId];
    if (!unit || unit.destroyed) break;

    const bin = criticalExplosionBin(criticalEvent, unit);
    if (!bin || typeof bin.damagePerRound !== 'number') {
      continue;
    }

    const explosion = resolveAmmoExplosion(
      unit.ammoState ?? {},
      bin.binId,
      bin.damagePerRound,
      bin.caseProtection ?? 'none',
    );
    if (!explosion || explosion.totalDamage <= 0) {
      continue;
    }

    const caseAdjustedDamage = resolveCaseAdjustedAmmoExplosionDamage(
      unit,
      explosion.location,
      explosion.totalDamage,
    );
    currentSession = appendEvent(
      currentSession,
      createAmmoExplosionEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        input.targetId,
        explosion.location,
        explosion.totalDamage,
        'CritInduced',
        {
          binId: explosion.binId,
          weaponType: explosion.weaponType,
          roundsDestroyed: bin.remainingRounds,
          caseProtection: caseAdjustedDamage.caseProtection,
        },
      ),
    );
    currentSession = appendEvent(
      currentSession,
      createAmmoConsumedEvent(
        currentSession.id,
        currentSession.events.length,
        currentSession.currentState.turn,
        GamePhase.WeaponAttack,
        input.targetId,
        explosion.binId,
        explosion.weaponType,
        bin.remainingRounds,
        0,
      ),
    );

    const cascadeResult = appendWeaponAttackAmmoExplosionDamageCascade(
      currentSession,
      input.targetId,
      explosion.location,
      caseAdjustedDamage.damageToApply,
      caseAdjustedDamage.caseProtection,
      input.d6Roller,
    );
    currentSession = cascadeResult.session;

    const pilotResult = appendWeaponAttackAmmoExplosionPilotDamage(
      currentSession,
      input.targetId,
      explosion.totalDamage,
      caseAdjustedDamage.caseProtection,
      input.d6Roller,
    );
    currentSession = pilotResult.session;

    if (
      (cascadeResult.unitDestroyed || pilotResult.pilotDestroyed) &&
      !unit.destroyed
    ) {
      currentSession = appendUnitDestroyedEvent(currentSession, {
        turn: currentSession.currentState.turn,
        phase: GamePhase.WeaponAttack,
        unitId: input.targetId,
        cause: pilotResult.pilotDestroyed ? 'pilot_death' : 'ammo_explosion',
      });
    }
  }

  return currentSession;
}
