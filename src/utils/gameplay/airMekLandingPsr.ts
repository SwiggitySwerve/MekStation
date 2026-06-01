import type { CombatLocation } from '@/types/gameplay';
import type { IRuntimeMovementStateChangedPayload } from '@/types/gameplay/GameSessionMovementEvents';
import type {
  IComponentDamageState,
  IGameSession,
} from '@/types/gameplay/GameSessionStateTypes';

import type { D6Roller } from './diceTypes';

import { buildDefaultCriticalSlotManifest } from './criticalHitResolution';
import { resolveDamage as resolveDamagePipeline } from './damage';
import { resolveFall } from './fallMechanics';
import {
  createDamageAppliedEvent,
  createLocationDestroyedEvent,
  createPilotHitEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createTransferDamageEvent,
  createUnitFellEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import {
  buildDamageStateFromUnit,
  emitCriticalEvents,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { defaultD6Roller } from './hitLocation';
import { createAirMekLandingPSR, resolvePSR } from './pilotingSkillRolls';

const DEFAULT_COMPONENT_DAMAGE: IComponentDamageState = {
  engineHits: 0,
  gyroHits: 0,
  sensorHits: 0,
  lifeSupport: 0,
  cockpitHit: false,
  actuators: {},
  weaponsDestroyed: [],
  heatSinksDestroyed: 0,
  jumpJetsDestroyed: 0,
};

const DEFAULT_AIRMEK_LANDING_TONNAGE = 50;

export function applyAirMekLandingControlPSR(
  session: IGameSession,
  unitId: string,
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
  diceRoller: D6Roller = defaultD6Roller,
  unitTonnage?: number,
): IGameSession {
  if (patch.lamAirMekLandingControlRequired !== true) return session;

  const unitState = session.currentState.units[unitId];
  if (!unitState || unitState.destroyed || !unitState.pilotConscious) {
    return session;
  }

  const unit = session.units.find((entry) => entry.id === unitId);
  const psr = createAirMekLandingPSR(
    unitId,
    patch.lamAirMekLandingControlModifier ?? 0,
  );

  let currentSession = appendEvent(
    session,
    createPSRTriggeredEvent(
      session.id,
      session.events.length,
      session.currentState.turn,
      session.currentState.phase,
      unitId,
      psr.reason,
      psr.additionalModifier,
      psr.triggerSource,
      unit?.piloting,
      psr.reasonCode,
    ),
  );

  const componentDamage = unitState.componentDamage ?? DEFAULT_COMPONENT_DAMAGE;
  const result = resolvePSR(
    unit?.piloting ?? 5,
    psr,
    componentDamage,
    unitState.pilotWounds,
    diceRoller,
    {
      gyroType: unitState.gyroType ?? unit?.gyroType,
      optionalRules: session.config.optionalRules,
    },
  );

  currentSession = appendEvent(
    currentSession,
    createPSRResolvedEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      currentSession.currentState.phase,
      unitId,
      result.targetNumber,
      result.roll,
      result.modifiers.reduce((sum, modifier) => sum + modifier.value, 0),
      result.passed,
      result.psr.reason,
      result.psr.reasonCode,
    ),
  );

  if (result.passed) {
    return currentSession;
  }

  const latestUnitState = currentSession.currentState.units[unitId];
  const fallHeight = landingFallHeight(patch);
  const fallResult = resolveFall(
    landingFallTonnage(unitTonnage),
    latestUnitState?.facing ?? unitState.facing,
    fallHeight,
    diceRoller,
  );

  currentSession = appendEvent(
    currentSession,
    createUnitFellEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      currentSession.currentState.phase,
      unitId,
      fallResult.totalDamage,
      fallResult.newFacing,
      fallResult.pilotDamage,
      `${unitState.position.q},${unitState.position.r}`,
      psr.reason,
      psr.reasonCode,
    ),
  );
  currentSession = appendAirMekLandingFallDamageClusters(
    currentSession,
    unitId,
    fallResult.clusters,
    diceRoller,
  );

  const currentUnitState = currentSession.currentState.units[unitId];
  const totalWounds = currentUnitState.pilotWounds + 1;
  return appendEvent(
    currentSession,
    createPilotHitEvent(
      currentSession.id,
      currentSession.events.length,
      currentSession.currentState.turn,
      currentSession.currentState.phase,
      unitId,
      1,
      totalWounds,
      'head_hit',
      true,
      totalWounds < 6,
    ),
  );
}

function appendAirMekLandingFallDamageClusters(
  session: IGameSession,
  unitId: string,
  clusters: readonly {
    readonly damage: number;
    readonly location: CombatLocation;
  }[],
  diceRoller: D6Roller,
): IGameSession {
  let currentSession = session;
  for (const cluster of clusters) {
    const currentUnitState = currentSession.currentState.units[unitId];
    if (!currentUnitState || currentUnitState.destroyed) {
      return currentSession;
    }

    const damageState = {
      ...buildDamageStateFromUnit(currentUnitState),
      criticalContext: {
        unitId,
        manifest: buildDefaultCriticalSlotManifest(),
        componentDamage:
          currentUnitState.componentDamage ?? DEFAULT_COMPONENT_DAMAGE,
      },
    };
    const damageResult = resolveDamagePipeline(
      damageState,
      cluster.location,
      cluster.damage,
      diceRoller,
    );
    const hasCriticalDestruction =
      damageResult.criticalEvents?.some(
        (event) => event.type === 'unit_destroyed',
      ) === true;
    const preDestroyedSet = new Set<CombatLocation>(
      damageState.destroyedLocations,
    );
    const newlyDestroyed = damageResult.state.destroyedLocations.filter(
      (location) => !preDestroyedSet.has(location),
    );
    const phase = currentSession.currentState.phase;
    for (const locationDamage of damageResult.result.locationDamages) {
      currentSession = appendEvent(
        currentSession,
        createDamageAppliedEvent(
          currentSession.id,
          currentSession.events.length,
          currentSession.currentState.turn,
          unitId,
          locationDamage.location,
          locationDamage.damage,
          locationDamage.armorRemaining,
          locationDamage.structureRemaining,
          locationDamage.destroyed,
          undefined,
          phase,
        ),
      );
      if (locationDamage.destroyed) {
        const cascadedArm = airMekFallCascadedArm(
          locationDamage.location,
          newlyDestroyed,
        );
        currentSession = appendEvent(
          currentSession,
          createLocationDestroyedEvent(
            currentSession.id,
            currentSession.events.length,
            currentSession.currentState.turn,
            unitId,
            locationDamage.location,
            cascadedArm,
            false,
            phase,
          ),
        );
        if (cascadedArm) {
          currentSession = appendEvent(
            currentSession,
            createLocationDestroyedEvent(
              currentSession.id,
              currentSession.events.length,
              currentSession.currentState.turn,
              unitId,
              cascadedArm,
              undefined,
              false,
              phase,
            ),
          );
        }
      }
      if (
        locationDamage.transferredDamage > 0 &&
        locationDamage.transferLocation
      ) {
        currentSession = appendEvent(
          currentSession,
          createTransferDamageEvent(
            currentSession.id,
            currentSession.events.length,
            currentSession.currentState.turn,
            unitId,
            locationDamage.location,
            locationDamage.transferLocation,
            locationDamage.transferredDamage,
            phase,
          ),
        );
      }
    }
    if (damageResult.criticalEvents?.length) {
      currentSession = emitCriticalEvents(
        currentSession,
        damageResult.criticalEvents,
        currentSession.currentState.turn,
        unitId,
        {
          phase,
          sourceUnitId: unitId,
          emitCriticalHitPrelude: true,
        },
      );
    }
    if (damageResult.result.unitDestroyed && !hasCriticalDestruction) {
      currentSession = appendEvent(
        currentSession,
        createUnitDestroyedEvent(
          currentSession.id,
          currentSession.events.length,
          currentSession.currentState.turn,
          phase,
          unitId,
          damageResult.result.destructionCause ?? 'damage',
        ),
      );
    }
  }
  return currentSession;
}

function airMekFallCascadedArm(
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

function landingFallTonnage(tonnage: number | undefined): number {
  if (tonnage === undefined || !Number.isFinite(tonnage) || tonnage <= 0) {
    return DEFAULT_AIRMEK_LANDING_TONNAGE;
  }
  return tonnage;
}

function landingFallHeight(
  patch: Omit<IRuntimeMovementStateChangedPayload, 'unitId'>,
): number {
  const height = patch.lamAirMekLandingControlFallHeight;
  if (height === undefined || !Number.isFinite(height)) return 1;
  return Math.max(0, Math.floor(height));
}
