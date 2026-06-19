import type { IUnitDestroyedPayload } from '@/types/gameplay/GameSessionInterfaces';

import {
  CombatLocation,
  GamePhase,
  IGameSession,
  PSRTrigger,
} from '@/types/gameplay';

import {
  checkTACTrigger,
  processTAC,
  resolveCriticalHits,
  buildDefaultCriticalSlotManifest,
} from './criticalHitResolution';
import { resolveDamage as resolveDamagePipeline } from './damage';
import { type D6Roller } from './diceTypes';
import {
  createDamageAppliedEvent,
  createLocationDestroyedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createTransferDamageEvent,
} from './gameEvents';
import {
  appendUnitDestroyedEvent,
  buildDefaultComponentDamageState,
  emitCriticalEvents,
  firingArcToString,
} from './gameSessionAttackResolutionHelpers';
import { appendEvent } from './gameSessionCore';
import { isLegLocation } from './pilotingSkillRolls';

export type AttackDamageResult = ReturnType<typeof resolveDamagePipeline>;

type AttackLocationDamage =
  AttackDamageResult['result']['locationDamages'][number];

export type CriticalEdgeOptionsFactory = () => Parameters<
  typeof resolveCriticalHits
>[7];

function newlyDestroyedLocations(
  previousDestroyedLocations: readonly CombatLocation[],
  currentDestroyedLocations: readonly CombatLocation[],
): readonly CombatLocation[] {
  const previousDestroyedSet = new Set<CombatLocation>(
    previousDestroyedLocations,
  );
  return currentDestroyedLocations.filter(
    (location) => !previousDestroyedSet.has(location),
  );
}

function cascadedArmForLocationDamage(
  locationDamage: AttackLocationDamage,
  newlyDestroyed: readonly CombatLocation[],
): CombatLocation | undefined {
  if (
    locationDamage.location === 'left_torso' &&
    newlyDestroyed.includes('left_arm' as CombatLocation)
  ) {
    return 'left_arm' as CombatLocation;
  }

  if (
    locationDamage.location === 'right_torso' &&
    newlyDestroyed.includes('right_arm' as CombatLocation)
  ) {
    return 'right_arm' as CombatLocation;
  }

  return undefined;
}

export function emitLocationDamageEvents(input: {
  readonly session: IGameSession;
  readonly damageResult: AttackDamageResult;
  readonly previousDestroyedLocations: readonly CombatLocation[];
  readonly turn: number;
  readonly targetId: string;
}): IGameSession {
  let currentSession = input.session;
  const newlyDestroyed = newlyDestroyedLocations(
    input.previousDestroyedLocations,
    input.damageResult.state.destroyedLocations,
  );

  for (const locationDamage of input.damageResult.result.locationDamages) {
    currentSession = appendEvent(
      currentSession,
      createDamageAppliedEvent(
        currentSession.id,
        currentSession.events.length,
        input.turn,
        input.targetId,
        locationDamage.location,
        locationDamage.damage,
        locationDamage.armorRemaining,
        locationDamage.structureRemaining,
        locationDamage.destroyed,
      ),
    );

    if (locationDamage.destroyed) {
      const cascadedArm = cascadedArmForLocationDamage(
        locationDamage,
        newlyDestroyed,
      );
      currentSession = appendEvent(
        currentSession,
        createLocationDestroyedEvent(
          currentSession.id,
          currentSession.events.length,
          input.turn,
          input.targetId,
          locationDamage.location,
          cascadedArm,
        ),
      );

      if (cascadedArm) {
        currentSession = appendEvent(
          currentSession,
          createLocationDestroyedEvent(
            currentSession.id,
            currentSession.events.length,
            input.turn,
            input.targetId,
            cascadedArm,
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
          input.turn,
          input.targetId,
          locationDamage.location,
          locationDamage.transferLocation,
          locationDamage.transferredDamage,
        ),
      );
    }
  }

  return currentSession;
}

export function emitDamageCriticalEvents(input: {
  readonly session: IGameSession;
  readonly damageResult: AttackDamageResult;
  readonly targetStateForDamage: IGameSession['currentState']['units'][string];
  readonly turn: number;
  readonly targetId: string;
  readonly arcString: ReturnType<typeof firingArcToString>;
  readonly hitLocationRollTotal: number;
  readonly d6Roller: D6Roller;
  readonly buildTargetCriticalEdgeOptions: CriticalEdgeOptionsFactory;
}): IGameSession {
  let currentSession = input.session;
  const manifest = buildDefaultCriticalSlotManifest();
  const targetComponentDamage =
    input.targetStateForDamage.componentDamage ??
    buildDefaultComponentDamageState();

  for (const locationDamage of input.damageResult.result.locationDamages) {
    if (locationDamage.structureDamage > 0 && !locationDamage.destroyed) {
      const criticalResult = resolveCriticalHits(
        input.targetId,
        locationDamage.location as CombatLocation,
        manifest,
        targetComponentDamage,
        input.d6Roller,
        undefined,
        undefined,
        input.buildTargetCriticalEdgeOptions(),
      );
      currentSession = emitCriticalEvents(
        currentSession,
        criticalResult.events,
        input.turn,
        input.targetId,
      );
    }
  }

  if (input.hitLocationRollTotal === 2) {
    const tacLocation = checkTACTrigger(2, input.arcString);
    if (tacLocation) {
      const tacResult = processTAC(
        input.targetId,
        tacLocation,
        manifest,
        targetComponentDamage,
        input.d6Roller,
        undefined,
        input.buildTargetCriticalEdgeOptions(),
      );
      currentSession = emitCriticalEvents(
        currentSession,
        tacResult.events,
        input.turn,
        input.targetId,
      );
    }
  }

  return currentSession;
}

export function emitDamagePsrEvents(input: {
  readonly session: IGameSession;
  readonly damageResult: AttackDamageResult;
  readonly preAttackDamageThisPhase: number;
  readonly turn: number;
  readonly targetId: string;
}): IGameSession {
  let currentSession = input.session;
  const targetUnit = currentSession.units.find(
    (unit) => unit.id === input.targetId,
  );

  for (const locationDamage of input.damageResult.result.locationDamages) {
    if (
      isLegLocation(locationDamage.location) &&
      locationDamage.structureDamage > 0
    ) {
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          currentSession.events.length,
          input.turn,
          GamePhase.WeaponAttack,
          input.targetId,
          'Leg damage (internal structure exposed)',
          0,
          'leg_damage',
          targetUnit?.piloting,
          PSRTrigger.LegDamage,
        ),
      );
      break;
    }
  }

  const postAttackDamageThisPhase =
    currentSession.currentState.units[input.targetId]?.damageThisPhase ?? 0;
  if (input.preAttackDamageThisPhase < 20 && postAttackDamageThisPhase >= 20) {
    currentSession = appendEvent(
      currentSession,
      createPSRTriggeredEvent(
        currentSession.id,
        currentSession.events.length,
        input.turn,
        GamePhase.WeaponAttack,
        input.targetId,
        '20+ damage this phase',
        0,
        'phase_damage_20_plus',
        targetUnit?.piloting,
        PSRTrigger.PhaseDamage20Plus,
      ),
    );
  }

  return currentSession;
}

export function emitPilotAndDestructionEvents(input: {
  readonly session: IGameSession;
  readonly damageResult: AttackDamageResult;
  readonly turn: number;
  readonly targetId: string;
}): IGameSession {
  let currentSession = input.session;
  const pilotDamage = input.damageResult.result.pilotDamage;

  if (pilotDamage) {
    currentSession = appendEvent(
      currentSession,
      createPilotHitEvent(
        currentSession.id,
        currentSession.events.length,
        input.turn,
        GamePhase.WeaponAttack,
        input.targetId,
        pilotDamage.woundsInflicted,
        pilotDamage.totalWounds,
        pilotDamage.source as
          | 'head_hit'
          | 'ammo_explosion'
          | 'mech_destruction',
        pilotDamage.consciousnessCheckRequired,
        pilotDamage.conscious,
        {
          edgeReroll: pilotDamage.edgeReroll,
          edgeSuperseded: pilotDamage.edgeSuperseded,
          edgeTrigger: pilotDamage.edgeTrigger,
          edgePointsRemaining: pilotDamage.edgePointsRemaining,
        },
      ),
    );
  }

  if (input.damageResult.result.unitDestroyed) {
    currentSession = appendUnitDestroyedEvent(currentSession, {
      turn: input.turn,
      phase: GamePhase.WeaponAttack,
      unitId: input.targetId,
      cause:
        (input.damageResult.result
          .destructionCause as IUnitDestroyedPayload['cause']) ?? 'damage',
    });
  }

  return currentSession;
}
