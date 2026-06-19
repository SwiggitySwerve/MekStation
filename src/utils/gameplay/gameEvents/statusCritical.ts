import {
  GameEventType,
  GamePhase,
  IAmmoExplosionPayload,
  ICriticalHitPayload,
  ICriticalHitResolvedPayload,
  IGameEvent,
} from '@/types/gameplay';

import type { IGameplayEventContext } from './eventContext';

import { createEventBase } from './base';

/**
 * Per `wire-heat-generation-and-effects` task 11.4: emitted when an
 * explosive ammo bin detonates. `source` distinguishes heat-induced
 * (rolled during the heat phase) from crit-induced explosions.
 */
interface IAmmoExplosionEventOptions {
  readonly binId?: string;
  readonly equipmentName?: string;
  readonly weaponType?: string;
  readonly roundsDestroyed?: number;
  readonly caseProtection?: IAmmoExplosionPayload['caseProtection'];
}

export interface ICreateAmmoExplosionEventInput extends IGameplayEventContext {
  readonly location: string;
  readonly damage: number;
  readonly source: IAmmoExplosionPayload['source'];
  readonly options?: IAmmoExplosionEventOptions;
}

export function createAmmoExplosionEvent(
  input: ICreateAmmoExplosionEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        location: string,
        damage: number,
        source: IAmmoExplosionPayload['source'],
        options?: IAmmoExplosionEventOptions,
      ]
): IGameEvent {
  const [sequence, turn, phase, unitId, location, damage, source, options] =
    legacy as [
      number,
      number,
      GamePhase,
      string,
      string,
      number,
      IAmmoExplosionPayload['source'],
      IAmmoExplosionEventOptions | undefined,
    ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          phase,
          unitId,
          location,
          damage,
          source,
          options,
        };
  const payload: IAmmoExplosionPayload = {
    unitId: eventInput.unitId,
    location: eventInput.location,
    damage: eventInput.damage,
    source: eventInput.source,
    ...(eventInput.options?.binId !== undefined
      ? { binId: eventInput.options.binId }
      : {}),
    ...(eventInput.options?.equipmentName !== undefined
      ? { equipmentName: eventInput.options.equipmentName }
      : {}),
    ...(eventInput.options?.weaponType !== undefined
      ? { weaponType: eventInput.options.weaponType }
      : {}),
    ...(eventInput.options?.roundsDestroyed !== undefined
      ? { roundsDestroyed: eventInput.options.roundsDestroyed }
      : {}),
    ...(eventInput.options?.caseProtection !== undefined
      ? { caseProtection: eventInput.options.caseProtection }
      : {}),
  };

  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.AmmoExplosion,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}

export interface ICreateCriticalHitEventInput extends IGameplayEventContext {
  readonly location: string;
  readonly sourceUnitId?: string;
  readonly component?: string;
  readonly count?: number;
}

export function createCriticalHitEvent(
  input: ICreateCriticalHitEventInput | string,
  ...legacy:
    | []
    | [
        sequence: number,
        turn: number,
        phase: GamePhase,
        unitId: string,
        location: string,
        sourceUnitId?: string,
        component?: string,
        count?: number,
      ]
): IGameEvent {
  const [
    sequence,
    turn,
    phase,
    unitId,
    location,
    sourceUnitId,
    component,
    count,
  ] = legacy as [
    number,
    number,
    GamePhase,
    string,
    string,
    string | undefined,
    string | undefined,
    number | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          phase,
          unitId,
          location,
          sourceUnitId,
          component,
          count,
        };
  const payload: ICriticalHitPayload = {
    unitId: eventInput.unitId,
    location: eventInput.location,
    ...(eventInput.sourceUnitId !== undefined
      ? { sourceUnitId: eventInput.sourceUnitId }
      : {}),
    ...(eventInput.component !== undefined
      ? { component: eventInput.component }
      : {}),
    ...(eventInput.count !== undefined ? { count: eventInput.count } : {}),
  };

  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.CriticalHit,
      eventInput.turn,
      eventInput.phase,
      eventInput.sourceUnitId ?? eventInput.unitId,
    ),
    payload,
  };
}

interface ICriticalHitResolvedEventFlags {
  readonly missing?: boolean;
  readonly breached?: boolean;
  readonly hotLoaded?: boolean;
  readonly linkedCriticalWeaponId?: string;
  readonly linkedCriticalWeaponName?: string;
  readonly explosionDamage?: number;
}

export interface ICreateCriticalHitResolvedEventInput extends IGameplayEventContext {
  readonly location: string;
  readonly slotIndex: number;
  readonly componentType: string;
  readonly componentName: string;
  readonly effect: string;
  readonly destroyed: boolean;
  readonly ammoBinId?: string;
  readonly edgePointsRemaining?: number;
  readonly weaponId?: string;
  readonly flags?: ICriticalHitResolvedEventFlags;
}

export function createCriticalHitResolvedEvent(
  input: ICreateCriticalHitResolvedEventInput | string,
  ...legacy:
    | []
    | [
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
        flags?: ICriticalHitResolvedEventFlags,
      ]
): IGameEvent {
  const [
    sequence,
    turn,
    phase,
    unitId,
    location,
    slotIndex,
    componentType,
    componentName,
    effect,
    destroyed,
    ammoBinId,
    edgePointsRemaining,
    weaponId,
    flags,
  ] = legacy as [
    number,
    number,
    GamePhase,
    string,
    string,
    number,
    string,
    string,
    string,
    boolean,
    string | undefined,
    number | undefined,
    string | undefined,
    ICriticalHitResolvedEventFlags | undefined,
  ];
  const eventInput =
    typeof input !== 'string'
      ? input
      : {
          gameId: input,
          sequence,
          turn,
          phase,
          unitId,
          location,
          slotIndex,
          componentType,
          componentName,
          effect,
          destroyed,
          ammoBinId,
          edgePointsRemaining,
          weaponId,
          flags,
        };
  const payload: ICriticalHitResolvedPayload = {
    unitId: eventInput.unitId,
    location: eventInput.location,
    slotIndex: eventInput.slotIndex,
    componentType: eventInput.componentType,
    componentName: eventInput.componentName,
    ...(eventInput.weaponId !== undefined
      ? { weaponId: eventInput.weaponId }
      : {}),
    effect: eventInput.effect,
    destroyed: eventInput.destroyed,
    ...(eventInput.ammoBinId !== undefined
      ? { ammoBinId: eventInput.ammoBinId }
      : {}),
    ...(eventInput.flags?.missing !== undefined
      ? { missing: eventInput.flags.missing }
      : {}),
    ...(eventInput.flags?.breached !== undefined
      ? { breached: eventInput.flags.breached }
      : {}),
    ...(eventInput.flags?.hotLoaded !== undefined
      ? { hotLoaded: eventInput.flags.hotLoaded }
      : {}),
    ...(eventInput.flags?.linkedCriticalWeaponId !== undefined
      ? { linkedCriticalWeaponId: eventInput.flags.linkedCriticalWeaponId }
      : {}),
    ...(eventInput.flags?.linkedCriticalWeaponName !== undefined
      ? { linkedCriticalWeaponName: eventInput.flags.linkedCriticalWeaponName }
      : {}),
    ...(eventInput.flags?.explosionDamage !== undefined
      ? { explosionDamage: eventInput.flags.explosionDamage }
      : {}),
    ...(eventInput.edgePointsRemaining !== undefined
      ? { edgePointsRemaining: eventInput.edgePointsRemaining }
      : {}),
  };

  return {
    ...createEventBase(
      eventInput.gameId,
      eventInput.sequence,
      GameEventType.CriticalHitResolved,
      eventInput.turn,
      eventInput.phase,
      eventInput.unitId,
    ),
    payload,
  };
}
