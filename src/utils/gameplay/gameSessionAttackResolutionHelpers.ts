import type {
  IComponentDamageState,
  IUnitDestroyedPayload,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  CombatLocation,
  FiringArc,
  GamePhase,
  IGameSession,
  IUnitGameState,
} from '@/types/gameplay';

import { type CriticalHitEvent } from './criticalHitResolution';
import { type IUnitDamageState } from './damage';
import {
  createComponentDestroyedEvent,
  createCriticalHitEvent,
  createCriticalHitResolvedEvent,
  createPilotHitEvent,
  createPSRTriggeredEvent,
  createUnitDestroyedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionCore';

export function firingArcToString(
  arc: FiringArc,
): 'front' | 'rear' | 'left' | 'right' {
  switch (arc) {
    case FiringArc.Front:
      return 'front';
    case FiringArc.Rear:
      return 'rear';
    case FiringArc.Left:
      return 'left';
    case FiringArc.Right:
      return 'right';
    default:
      return 'front';
  }
}

export function emitCriticalEvents(
  session: IGameSession,
  events: readonly CriticalHitEvent[],
  turn: number,
  unitId: string,
  options?: {
    readonly phase?: GamePhase;
    readonly sourceUnitId?: string;
    readonly emitCriticalHitPrelude?: boolean;
  },
): IGameSession {
  let currentSession = session;
  const phase = options?.phase ?? GamePhase.WeaponAttack;

  for (const event of events) {
    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      if (options?.emitCriticalHitPrelude === true) {
        currentSession = appendEvent(
          currentSession,
          createCriticalHitEvent(
            currentSession.id,
            currentSession.events.length,
            turn,
            phase,
            payload.unitId,
            payload.location,
            options.sourceUnitId ?? payload.unitId,
            payload.componentType,
            1,
          ),
        );
      }
      currentSession = appendEvent(
        currentSession,
        createCriticalHitResolvedEvent(
          currentSession.id,
          currentSession.events.length,
          turn,
          phase,
          payload.unitId,
          payload.location,
          payload.slotIndex,
          payload.componentType,
          payload.componentName,
          payload.effect,
          payload.destroyed,
          payload.ammoBinId,
          payload.edgePointsRemaining,
          payload.weaponId,
          {
            ...(payload.missing !== undefined
              ? { missing: payload.missing }
              : {}),
            ...(payload.breached !== undefined
              ? { breached: payload.breached }
              : {}),
            ...(payload.hotLoaded !== undefined
              ? { hotLoaded: payload.hotLoaded }
              : {}),
            ...(payload.linkedCriticalWeaponId !== undefined
              ? { linkedCriticalWeaponId: payload.linkedCriticalWeaponId }
              : {}),
            ...(payload.linkedCriticalWeaponName !== undefined
              ? { linkedCriticalWeaponName: payload.linkedCriticalWeaponName }
              : {}),
            ...(payload.explosionDamage !== undefined
              ? { explosionDamage: payload.explosionDamage }
              : {}),
          },
        ),
      );
      // Per `integrate-damage-pipeline` task 8 + 0.5.4: when a
      // `CriticalHitResolved` flags the component as destroyed, also
      // emit a `ComponentDestroyed` event so UI + replay consumers
      // can render the slot-specific destruction without re-parsing
      // the `effect` string.
      if (payload.destroyed) {
        const componentSequence = currentSession.events.length;
        currentSession = appendEvent(
          currentSession,
          createComponentDestroyedEvent(
            currentSession.id,
            componentSequence,
            turn,
            payload.unitId,
            payload.location,
            payload.componentType,
            payload.slotIndex,
            payload.componentName,
            phase,
            payload.ammoBinId,
          ),
        );
      }
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      // Per `denormalize-event-envelope-and-close-emission-contract-gaps`
      // (piloting-skill-rolls delta — PSRTriggered Carries Base Skill):
      // pass the unit's base piloting skill so consumers can render the
      // full PSR target-number arithmetic.
      const psrUnit = currentSession.units.find((u) => u.id === payload.unitId);
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          currentSession.events.length,
          turn,
          phase,
          payload.unitId,
          payload.reason,
          payload.additionalModifier,
          payload.triggerSource,
          psrUnit?.piloting,
          payload.reasonCode,
        ),
      );
      continue;
    }

    if (event.type === 'unit_destroyed') {
      const payload = event.payload;
      currentSession = appendUnitDestroyedEvent(currentSession, {
        turn,
        phase,
        unitId,
        cause: payload.cause as IUnitDestroyedPayload['cause'],
      });
      continue;
    }

    if (event.type === 'pilot_hit') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          currentSession.events.length,
          turn,
          phase,
          payload.unitId,
          payload.wounds,
          payload.totalWounds,
          payload.source,
          payload.consciousnessCheckRequired,
          payload.consciousnessCheckPassed,
        ),
      );
    }
  }

  return currentSession;
}

export function appendUnitDestroyedEvent(
  session: IGameSession,
  input: {
    readonly turn: number;
    readonly phase: GamePhase;
    readonly unitId: string;
    readonly cause: IUnitDestroyedPayload['cause'];
  },
): IGameSession {
  return appendEvent(
    session,
    createUnitDestroyedEvent(
      session.id,
      session.events.length,
      input.turn,
      input.phase,
      input.unitId,
      input.cause,
    ),
  );
}

const DEFAULT_REAR_ARMOR: Record<
  'center_torso' | 'left_torso' | 'right_torso',
  number
> = {
  center_torso: 10,
  left_torso: 7,
  right_torso: 7,
};

export function buildDamageStateFromUnit(
  unit: IUnitGameState,
): IUnitDamageState {
  const armorRecord = unit.armor as Record<CombatLocation, number>;
  const structureRecord = unit.structure as Record<CombatLocation, number>;

  return {
    armor: armorRecord,
    rearArmor: {
      center_torso:
        armorRecord.center_torso_rear ?? DEFAULT_REAR_ARMOR.center_torso,
      left_torso: armorRecord.left_torso_rear ?? DEFAULT_REAR_ARMOR.left_torso,
      right_torso:
        armorRecord.right_torso_rear ?? DEFAULT_REAR_ARMOR.right_torso,
    },
    structure: structureRecord,
    destroyedLocations: unit.destroyedLocations as CombatLocation[],
    pilotWounds: unit.pilotWounds,
    pilotToughness: unit.pilotToughness,
    pilotConscious: unit.pilotConscious,
    pilotAbilities: unit.abilities,
    edgePointsRemaining: unit.edgePointsRemaining,
    unitId: unit.id,
    destroyed: unit.destroyed,
  };
}

export function buildDefaultComponentDamageState(): IComponentDamageState {
  return {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
    superCooledMyomerHits: 0,
    emergencyCoolantSystemDamaged: false,
    playtestAutocannonFirstCrits: [],
    breachedLocations: [],
  } as const;
}

export function buildWeaponAttackDataMap<
  T extends { readonly weaponId: string },
>(weaponAttacks: readonly T[] | undefined): Map<string, T> {
  const weaponDataMap = new Map<string, T>();
  if (weaponAttacks) {
    for (const weaponAttack of weaponAttacks) {
      weaponDataMap.set(weaponAttack.weaponId, weaponAttack);
    }
  }
  return weaponDataMap;
}
