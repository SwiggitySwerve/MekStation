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
): IGameSession {
  let currentSession = session;

  for (const event of events) {
    const sequence = currentSession.events.length;

    if (event.type === 'critical_hit_resolved') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createCriticalHitResolvedEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
          payload.unitId,
          payload.location,
          payload.slotIndex,
          payload.componentType,
          payload.componentName,
          payload.effect,
          payload.destroyed,
        ),
      );
      continue;
    }

    if (event.type === 'psr_triggered') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createPSRTriggeredEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
          payload.unitId,
          payload.reason,
          payload.additionalModifier,
          payload.triggerSource,
        ),
      );
      continue;
    }

    if (event.type === 'unit_destroyed') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createUnitDestroyedEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
          unitId,
          payload.cause as
            | 'damage'
            | 'ammo_explosion'
            | 'pilot_death'
            | 'shutdown',
        ),
      );
      continue;
    }

    if (event.type === 'pilot_hit') {
      const payload = event.payload;
      currentSession = appendEvent(
        currentSession,
        createPilotHitEvent(
          currentSession.id,
          sequence,
          turn,
          GamePhase.WeaponAttack,
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
    pilotConscious: unit.pilotConscious,
    destroyed: unit.destroyed,
  };
}
