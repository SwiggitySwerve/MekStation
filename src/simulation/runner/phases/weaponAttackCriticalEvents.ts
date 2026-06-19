import type { IGameEvent } from '@/types/gameplay';
import type { CriticalHitEvent } from '@/utils/gameplay/criticalHitResolution/types';

import { GameEventType, GamePhase } from '@/types/gameplay';

import type { DestructionCause } from './weaponAttackHitResolution.helpers';

import { createGameEvent } from './utils';

type ResolvedCriticalHitEvent = Extract<
  CriticalHitEvent,
  { type: 'critical_hit_resolved' }
>;
type PsrTriggeredCriticalEvent = Extract<
  CriticalHitEvent,
  { type: 'psr_triggered' }
>;
type PilotHitCriticalEvent = Extract<CriticalHitEvent, { type: 'pilot_hit' }>;
type UnitDestroyedCriticalEvent = Extract<
  CriticalHitEvent,
  { type: 'unit_destroyed' }
>;

export interface IEmitCritEventsOptions {
  events: IGameEvent[];
  gameId: string;
  turn: number;
  attackerId: string;
  targetId: string;
  critEvents: readonly CriticalHitEvent[];
  targetAlreadyDestroyed: boolean;
  /**
   * The target's base piloting skill, threaded onto each emitted
   * `psr_triggered` event so consumers do not have to join back to the
   * unit record. Optional for synthetic-unit fixtures that do not seed
   * `IUnitGameState.piloting`.
   */
  targetPilotingSkill?: number;
}

export interface IEmitCritEventsResult {
  unitDestroyed: boolean;
  destructionCause: DestructionCause | undefined;
}

function emitCriticalHitEvent(
  options: IEmitCritEventsOptions,
  event: ResolvedCriticalHitEvent,
): void {
  const p = event.payload;
  options.events.push(
    createGameEvent(
      options.gameId,
      options.events.length,
      GameEventType.CriticalHit,
      options.turn,
      GamePhase.WeaponAttack,
      {
        unitId: options.targetId,
        location: p.location,
        sourceUnitId: options.attackerId,
        component: p.componentType,
        count: 1,
      },
      options.attackerId,
    ),
  );
}

function criticalHitResolvedPayload(event: ResolvedCriticalHitEvent) {
  const p = event.payload;
  return {
    unitId: p.unitId,
    location: p.location,
    slotIndex: p.slotIndex,
    componentType: p.componentType,
    componentName: p.componentName,
    ...(p.weaponId !== undefined ? { weaponId: p.weaponId } : {}),
    ...(p.ammoBinId !== undefined ? { ammoBinId: p.ammoBinId } : {}),
    ...(p.hotLoaded !== undefined ? { hotLoaded: p.hotLoaded } : {}),
    ...(p.linkedCriticalWeaponId !== undefined
      ? { linkedCriticalWeaponId: p.linkedCriticalWeaponId }
      : {}),
    ...(p.linkedCriticalWeaponName !== undefined
      ? { linkedCriticalWeaponName: p.linkedCriticalWeaponName }
      : {}),
    ...(p.explosionDamage !== undefined
      ? { explosionDamage: p.explosionDamage }
      : {}),
    effect: p.effect,
    destroyed: p.destroyed,
    ...(p.missing !== undefined ? { missing: p.missing } : {}),
    ...(p.breached !== undefined ? { breached: p.breached } : {}),
    ...(p.edgePointsRemaining !== undefined
      ? { edgePointsRemaining: p.edgePointsRemaining }
      : {}),
  };
}

function emitCriticalHitResolvedEvent(
  options: IEmitCritEventsOptions,
  event: ResolvedCriticalHitEvent,
): void {
  options.events.push(
    createGameEvent(
      options.gameId,
      options.events.length,
      GameEventType.CriticalHitResolved,
      options.turn,
      GamePhase.WeaponAttack,
      criticalHitResolvedPayload(event),
      options.attackerId,
    ),
  );
}

function emitComponentDestroyedEvent(
  options: IEmitCritEventsOptions,
  event: ResolvedCriticalHitEvent,
): void {
  const p = event.payload;
  options.events.push(
    createGameEvent(
      options.gameId,
      options.events.length,
      GameEventType.ComponentDestroyed,
      options.turn,
      GamePhase.WeaponAttack,
      {
        unitId: p.unitId,
        location: p.location,
        componentType: p.componentType,
        slotIndex: p.slotIndex,
        componentName: p.componentName,
        ...(p.ammoBinId !== undefined ? { ammoBinId: p.ammoBinId } : {}),
      },
      options.attackerId,
    ),
  );
}

function emitResolvedCriticalEventSequence(
  options: IEmitCritEventsOptions,
  event: ResolvedCriticalHitEvent,
): void {
  emitCriticalHitEvent(options, event);
  emitCriticalHitResolvedEvent(options, event);
  if (event.payload.destroyed) {
    emitComponentDestroyedEvent(options, event);
  }
}

function psrTriggeredPayload(
  event: PsrTriggeredCriticalEvent,
  targetPilotingSkill: number | undefined,
) {
  const p = event.payload;
  return {
    unitId: p.unitId,
    reason: p.reason,
    additionalModifier: p.additionalModifier,
    triggerSource: p.triggerSource,
    ...(targetPilotingSkill !== undefined
      ? { basePilotingSkill: targetPilotingSkill }
      : {}),
    // Preserve canonical reason codes from the critical-hit pipeline.
    ...(p.reasonCode !== undefined ? { reasonCode: p.reasonCode } : {}),
  };
}

function emitPsrTriggeredEvent(
  options: IEmitCritEventsOptions,
  event: PsrTriggeredCriticalEvent,
): void {
  options.events.push(
    createGameEvent(
      options.gameId,
      options.events.length,
      GameEventType.PSRTriggered,
      options.turn,
      GamePhase.WeaponAttack,
      psrTriggeredPayload(event, options.targetPilotingSkill),
      options.attackerId,
    ),
  );
}

function emitPilotHitEvent(
  options: IEmitCritEventsOptions,
  event: PilotHitCriticalEvent,
): void {
  const p = event.payload;
  options.events.push(
    createGameEvent(
      options.gameId,
      options.events.length,
      GameEventType.PilotHit,
      options.turn,
      GamePhase.WeaponAttack,
      {
        unitId: p.unitId,
        wounds: p.wounds,
        totalWounds: p.totalWounds,
        source: p.source,
        consciousnessCheckRequired: p.consciousnessCheckRequired,
        consciousnessCheckPassed: p.consciousnessCheckPassed,
      },
      options.attackerId,
    ),
  );
}

function mapCriticalDestructionCause(
  event: UnitDestroyedCriticalEvent,
): DestructionCause {
  const rawCause = event.payload.cause;
  if (rawCause === 'damage') {
    return 'engine_destroyed';
  }
  if (rawCause === 'pilot_death') {
    return 'pilot_death';
  }
  return rawCause as
    | 'ammo_explosion'
    | 'impossible_displacement'
    | 'ct_destroyed'
    | 'head_destroyed';
}

/**
 * Translate resolver critical events into runner game events.
 *
 * Ordering remains: CriticalHit, CriticalHitResolved, ComponentDestroyed,
 * PSRTriggered, PilotHit, then a deferred UnitDestroyed signal returned to
 * the caller. The caller emits the actual UnitDestroyed event once after the
 * full damage chain resolves.
 */
export function emitCritEvents(
  options: IEmitCritEventsOptions,
): IEmitCritEventsResult {
  let destructionCause: DestructionCause | undefined;

  for (const event of options.critEvents) {
    switch (event.type) {
      case 'critical_hit_resolved':
        emitResolvedCriticalEventSequence(options, event);
        break;
      case 'psr_triggered':
        emitPsrTriggeredEvent(options, event);
        break;
      case 'pilot_hit':
        emitPilotHitEvent(options, event);
        break;
      case 'unit_destroyed':
        destructionCause = mapCriticalDestructionCause(event);
        break;
    }
  }

  return {
    unitDestroyed:
      !options.targetAlreadyDestroyed && destructionCause !== undefined,
    destructionCause: options.targetAlreadyDestroyed
      ? undefined
      : destructionCause,
  };
}
