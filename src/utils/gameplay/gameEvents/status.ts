import {
  GameEventType,
  GamePhase,
  ICriticalHitResolvedPayload,
  ICriticalHitPayload,
  IAmmoExplosionPayload,
  IGameEvent,
  IHeatPayload,
  IMinefieldChangedPayload,
  IPilotHitPayload,
  ISpottingDeclaredPayload,
  ITerrainChangedPayload,
  IUnitDestroyedPayload,
} from '@/types/gameplay';

import { createEventBase } from './base';

export function createHeatGeneratedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  amount: number,
  source: IHeatPayload['source'],
  newTotal: number,
): IGameEvent {
  const payload: IHeatPayload = { unitId, amount, source, newTotal };
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatGenerated,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createHeatDissipatedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  amount: number,
  newTotal: number,
  breakdown?: IHeatPayload['breakdown'],
): IGameEvent {
  const payload: IHeatPayload = {
    unitId,
    amount: -Math.abs(amount),
    source: 'dissipation',
    newTotal,
    ...(breakdown ? { breakdown } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.HeatDissipated,
      turn,
      GamePhase.Heat,
      unitId,
    ),
    payload,
  };
}

export function createPilotHitEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  wounds: number,
  totalWounds: number,
  source: IPilotHitPayload['source'],
  consciousnessCheckRequired: boolean,
  consciousnessCheckPassed?: boolean,
  edge?: Pick<
    IPilotHitPayload,
    'edgeReroll' | 'edgeSuperseded' | 'edgeTrigger' | 'edgePointsRemaining'
  >,
): IGameEvent {
  const payload: IPilotHitPayload = {
    unitId,
    wounds,
    totalWounds,
    source,
    consciousnessCheckRequired,
    consciousnessCheckPassed,
    ...(edge?.edgeReroll !== undefined ? { edgeReroll: edge.edgeReroll } : {}),
    ...(edge?.edgeSuperseded !== undefined
      ? { edgeSuperseded: edge.edgeSuperseded }
      : {}),
    ...(edge?.edgeTrigger !== undefined
      ? { edgeTrigger: edge.edgeTrigger }
      : {}),
    ...(edge?.edgePointsRemaining !== undefined
      ? { edgePointsRemaining: edge.edgePointsRemaining }
      : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.PilotHit,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createUnitDestroyedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  cause:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'impossible_displacement'
    | 'ct_destroyed'
    | 'head_destroyed',
  options?: { readonly killerUnitId?: string },
): IGameEvent {
  const payload: IUnitDestroyedPayload = {
    unitId,
    cause,
    ...(options?.killerUnitId !== undefined
      ? { killerUnitId: options.killerUnitId }
      : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.UnitDestroyed,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createSpottingDeclaredEvent(
  gameId: string,
  sequence: number,
  turn: number,
  unitId: string,
  targetId: string,
): IGameEvent {
  const payload: ISpottingDeclaredPayload = { unitId, targetId, turn };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.SpottingDeclared,
      turn,
      GamePhase.WeaponAttack,
      unitId,
    ),
    payload,
  };
}

export function createTerrainChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  payload: ITerrainChangedPayload,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.TerrainChanged,
      turn,
      phase,
      payload.sourceUnitId,
    ),
    payload,
  };
}

export function createMinefieldChangedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  payload: IMinefieldChangedPayload,
): IGameEvent {
  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.MinefieldChanged,
      turn,
      phase,
      payload.sourceUnitId,
    ),
    payload,
  };
}

/**
 * Per `wire-heat-generation-and-effects` task 11.4: emitted when an
 * explosive ammo bin detonates. `source` distinguishes heat-induced
 * (rolled during the heat phase) from crit-induced explosions.
 */
export function createAmmoExplosionEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  location: string,
  damage: number,
  source: IAmmoExplosionPayload['source'],
  options?: {
    readonly binId?: string;
    readonly equipmentName?: string;
    readonly weaponType?: string;
    readonly roundsDestroyed?: number;
    readonly caseProtection?: IAmmoExplosionPayload['caseProtection'];
  },
): IGameEvent {
  const payload: IAmmoExplosionPayload = {
    unitId,
    location,
    damage,
    source,
    ...(options?.binId !== undefined ? { binId: options.binId } : {}),
    ...(options?.equipmentName !== undefined
      ? { equipmentName: options.equipmentName }
      : {}),
    ...(options?.weaponType !== undefined
      ? { weaponType: options.weaponType }
      : {}),
    ...(options?.roundsDestroyed !== undefined
      ? { roundsDestroyed: options.roundsDestroyed }
      : {}),
    ...(options?.caseProtection !== undefined
      ? { caseProtection: options.caseProtection }
      : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.AmmoExplosion,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export function createCriticalHitEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  location: string,
  sourceUnitId?: string,
  component?: string,
  count?: number,
): IGameEvent {
  const payload: ICriticalHitPayload = {
    unitId,
    location,
    ...(sourceUnitId !== undefined ? { sourceUnitId } : {}),
    ...(component !== undefined ? { component } : {}),
    ...(count !== undefined ? { count } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.CriticalHit,
      turn,
      phase,
      sourceUnitId ?? unitId,
    ),
    payload,
  };
}

export function createCriticalHitResolvedEvent(
  gameId: string,
  sequence: number,
  turn: number,
  phase: GamePhase,
  unitId: string,
  location: string,
  slotIndex: number,
  componentType: string,
  componentName: string,
  effect: string,
  destroyed: boolean,
  ammoBinId?: string,
  edgePointsRemaining?: number,
  weaponId?: string,
  flags?: {
    readonly missing?: boolean;
    readonly breached?: boolean;
    readonly hotLoaded?: boolean;
    readonly linkedCriticalWeaponId?: string;
    readonly linkedCriticalWeaponName?: string;
    readonly explosionDamage?: number;
  },
): IGameEvent {
  const payload: ICriticalHitResolvedPayload = {
    unitId,
    location,
    slotIndex,
    componentType,
    componentName,
    ...(weaponId !== undefined ? { weaponId } : {}),
    effect,
    destroyed,
    ...(ammoBinId !== undefined ? { ammoBinId } : {}),
    ...(flags?.missing !== undefined ? { missing: flags.missing } : {}),
    ...(flags?.breached !== undefined ? { breached: flags.breached } : {}),
    ...(flags?.hotLoaded !== undefined ? { hotLoaded: flags.hotLoaded } : {}),
    ...(flags?.linkedCriticalWeaponId !== undefined
      ? { linkedCriticalWeaponId: flags.linkedCriticalWeaponId }
      : {}),
    ...(flags?.linkedCriticalWeaponName !== undefined
      ? { linkedCriticalWeaponName: flags.linkedCriticalWeaponName }
      : {}),
    ...(flags?.explosionDamage !== undefined
      ? { explosionDamage: flags.explosionDamage }
      : {}),
    ...(edgePointsRemaining !== undefined ? { edgePointsRemaining } : {}),
  };

  return {
    ...createEventBase(
      gameId,
      sequence,
      GameEventType.CriticalHitResolved,
      turn,
      phase,
      unitId,
    ),
    payload,
  };
}

export {
  createAmmoConsumedEvent,
  createPSRResolvedEvent,
  createPSRTriggeredEvent,
  createShutdownCheckEvent,
  createStartupAttemptEvent,
  createUnitFellEvent,
  createUnitStoodEvent,
} from './statusChecks';

export {
  createPhysicalAttackDeclaredEvent,
  createPhysicalAttackResolvedEvent,
  createRetreatTriggeredEvent,
  createUnitRetreatedEvent,
} from './statusPhysical';
