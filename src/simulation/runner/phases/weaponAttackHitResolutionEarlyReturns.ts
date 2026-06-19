import type { ILOSDamageableCoverProvider } from '@/utils/gameplay/lineOfSight';

import {
  IGameEvent,
  IGameState,
  IHexGrid,
  type CombatLocation,
} from '@/types/gameplay';
import { isLegLocation } from '@/utils/gameplay/hitLocation';

import type { IWeapon } from '../../ai/types';

import { appendAttackResolvedEvent } from './utils';
import { applyDamageableCoverProviderHit } from './weaponAttackDamageableCover';
import {
  emitDesignatorMarkerApplied,
  iNarcPodTypeFromAmmoWeaponType,
  emitZeroDamageDesignatorHit,
  isINarcBeaconWeapon,
  isINarcExplosiveAmmoWeaponType,
  isNarcBeaconWeapon,
  isTagDesignatorWeapon,
  markTargetINarcPod,
  markTargetNarcedBy,
  markTargetTagDesignated,
} from './weaponAttackDesignatorMarkers';
import {
  consumeWeaponAmmo,
  emitCoveredLegMiss,
} from './weaponAttackHitResolution.helpers';
import {
  applyPlasmaCannonTargetHeat,
  isPlasmaCannonWeapon,
} from './weaponAttackPlasmaCannon';

type WeaponHitFiringArc = 'front' | 'left' | 'right' | 'rear';

interface IWeaponHitCommonOptions {
  currentState: IGameState;
  events: IGameEvent[];
  gameId: string;
  unitId: string;
  targetId: string;
  weaponId: string;
  weapon: IWeapon;
  ammoWeaponType?: string;
  projectileCount?: number;
  attackRoll: number;
  toHitNumber: number;
  firingArc: WeaponHitFiringArc;
}

interface IResolveWeaponHitEarlyOptions extends IWeaponHitCommonOptions {
  location: CombatLocation;
  partialCover: boolean;
  damageableCoverProvider?: ILOSDamageableCoverProvider;
  grid?: IHexGrid;
  d6Roller: () => number;
  optionalRules?: readonly string[];
}

type WeaponHitEarlyResolution =
  | {
      readonly resolved: true;
      readonly currentState: IGameState;
      readonly isINarcExplosiveAmmo: boolean;
    }
  | {
      readonly resolved: false;
      readonly currentState: IGameState;
      readonly isINarcExplosiveAmmo: boolean;
    };

export function resolveZeroProjectileWeaponHit(
  options: IWeaponHitCommonOptions,
): IGameState {
  const {
    attackRoll,
    ammoWeaponType,
    currentState,
    events,
    firingArc,
    gameId,
    projectileCount,
    targetId,
    toHitNumber,
    unitId,
    weapon,
    weaponId,
  } = options;

  appendAttackResolvedEvent({
    events,
    gameId,
    turn: currentState.turn,
    payload: {
      attackerId: unitId,
      targetId,
      weaponId,
      roll: attackRoll,
      toHitNumber,
      hit: false,
      damage: 0,
      heat: weapon.heat,
      projectileCount,
      attackerArc: firingArc,
    },
    actorId: unitId,
  });

  return consumeWeaponAmmo({
    currentState,
    events,
    gameId,
    attackerId: unitId,
    weapon,
    ammoWeaponType,
  });
}

export function resolveWeaponHitEarlyReturn(
  options: IResolveWeaponHitEarlyOptions,
): WeaponHitEarlyResolution {
  const isINarcExplosiveAmmo = isINarcExplosiveAmmoWeaponType(
    options.ammoWeaponType,
  );

  const partialCoverResult = resolvePartialCoverLegHit(options);
  if (partialCoverResult !== undefined) {
    return {
      resolved: true,
      currentState: partialCoverResult,
      isINarcExplosiveAmmo,
    };
  }

  const markerResult = resolveDesignatorMarkerHit(
    options,
    isINarcExplosiveAmmo,
  );
  if (markerResult !== undefined) {
    return {
      resolved: true,
      currentState: markerResult,
      isINarcExplosiveAmmo,
    };
  }

  const plasmaResult = resolvePlasmaCannonHit(options);
  if (plasmaResult !== undefined) {
    return {
      resolved: true,
      currentState: plasmaResult,
      isINarcExplosiveAmmo,
    };
  }

  return {
    resolved: false,
    currentState: options.currentState,
    isINarcExplosiveAmmo,
  };
}

function resolvePartialCoverLegHit(
  options: IResolveWeaponHitEarlyOptions,
): IGameState | undefined {
  if (!options.partialCover || !isLegLocation(options.location)) {
    return undefined;
  }

  emitCoveredLegMiss({
    events: options.events,
    gameId: options.gameId,
    turn: options.currentState.turn,
    attackerId: options.unitId,
    targetId: options.targetId,
    weaponId: options.weaponId,
    weapon: options.weapon,
    projectileCount: options.projectileCount,
    attackRoll: options.attackRoll,
    toHitNumber: options.toHitNumber,
    firingArc: options.firingArc,
  });

  const coverHitState = applyDamageableCoverProviderHit({
    currentState: options.currentState,
    events: options.events,
    gameId: options.gameId,
    attackerId: options.unitId,
    provider: options.damageableCoverProvider,
    grid: options.grid,
    damage: options.weapon.damage,
  });

  return consumeWeaponAmmo({
    currentState: coverHitState,
    events: options.events,
    gameId: options.gameId,
    attackerId: options.unitId,
    weapon: options.weapon,
    ammoWeaponType: options.ammoWeaponType,
  });
}

function resolveDesignatorMarkerHit(
  options: IResolveWeaponHitEarlyOptions,
  isINarcExplosiveAmmo: boolean,
): IGameState | undefined {
  if (isINarcBeaconWeapon(options.weapon) && !isINarcExplosiveAmmo) {
    return resolveINarcMarkerHit(options);
  }
  if (isNarcBeaconWeapon(options.weapon)) return resolveNarcMarkerHit(options);
  if (isTagDesignatorWeapon(options.weapon))
    return resolveTagMarkerHit(options);
  return undefined;
}

function resolveINarcMarkerHit(
  options: IResolveWeaponHitEarlyOptions,
): IGameState {
  const attackerTeamId = options.currentState.units[options.unitId]?.side as
    | string
    | undefined;
  const podType = iNarcPodTypeFromAmmoWeaponType(options.ammoWeaponType);
  const wasAlreadyINarced =
    attackerTeamId !== undefined &&
    (options.currentState.units[options.targetId].iNarcPods ?? []).some(
      (pod) => pod.teamId === attackerTeamId && pod.podType === podType,
    );
  const currentState =
    podType !== undefined
      ? markTargetINarcPod({
          currentState: options.currentState,
          targetId: options.targetId,
          attackerTeamId,
          location: options.location,
          podType,
        })
      : options.currentState;

  emitMarkerHit(options, currentState);

  if (
    podType !== undefined &&
    !wasAlreadyINarced &&
    attackerTeamId !== undefined
  ) {
    emitDesignatorMarkerApplied({
      events: options.events,
      gameId: options.gameId,
      turn: currentState.turn,
      unitId: options.unitId,
      targetId: options.targetId,
      weaponId: options.weaponId,
      marker: 'inarc',
      podType,
      persistent: true,
      location: options.location,
      teamId: attackerTeamId,
    });
  }

  return consumeHitAmmo(options, currentState);
}

function resolveNarcMarkerHit(
  options: IResolveWeaponHitEarlyOptions,
): IGameState {
  const attackerTeamId = options.currentState.units[options.unitId]?.side as
    | string
    | undefined;
  const wasAlreadyNarced =
    attackerTeamId !== undefined &&
    (options.currentState.units[options.targetId].narcedBy ?? []).includes(
      attackerTeamId,
    );
  const currentState = markTargetNarcedBy({
    currentState: options.currentState,
    targetId: options.targetId,
    attackerTeamId,
  });

  emitMarkerHit(options, currentState);

  if (!wasAlreadyNarced && attackerTeamId !== undefined) {
    emitDesignatorMarkerApplied({
      events: options.events,
      gameId: options.gameId,
      turn: currentState.turn,
      unitId: options.unitId,
      targetId: options.targetId,
      weaponId: options.weaponId,
      marker: 'narc',
      persistent: true,
      location: options.location,
      teamId: attackerTeamId,
    });
  }

  return consumeHitAmmo(options, currentState);
}

function resolveTagMarkerHit(
  options: IResolveWeaponHitEarlyOptions,
): IGameState {
  const wasAlreadyTagged =
    options.currentState.units[options.targetId].tagDesignated === true;
  const currentState = markTargetTagDesignated(
    options.currentState,
    options.targetId,
  );

  emitMarkerHit(options, currentState);

  if (!wasAlreadyTagged) {
    emitDesignatorMarkerApplied({
      events: options.events,
      gameId: options.gameId,
      turn: currentState.turn,
      unitId: options.unitId,
      targetId: options.targetId,
      weaponId: options.weaponId,
      marker: 'tag',
      persistent: false,
      location: options.location,
    });
  }

  return consumeHitAmmo(options, currentState);
}

function emitMarkerHit(
  options: IResolveWeaponHitEarlyOptions,
  currentState: IGameState,
): void {
  emitZeroDamageDesignatorHit({
    events: options.events,
    gameId: options.gameId,
    turn: currentState.turn,
    unitId: options.unitId,
    targetId: options.targetId,
    weaponId: options.weaponId,
    attackRoll: options.attackRoll,
    toHitNumber: options.toHitNumber,
    location: options.location,
    weapon: options.weapon,
    projectileCount: options.projectileCount,
    firingArc: options.firingArc,
  });
}

function resolvePlasmaCannonHit(
  options: IResolveWeaponHitEarlyOptions,
): IGameState | undefined {
  if (!isPlasmaCannonWeapon(options.weapon)) return undefined;

  const currentState = applyPlasmaCannonTargetHeat({
    currentState: options.currentState,
    events: options.events,
    gameId: options.gameId,
    attackerId: options.unitId,
    targetId: options.targetId,
    weaponId: options.weaponId,
    weapon: options.weapon,
    projectileCount: options.projectileCount,
    attackRoll: options.attackRoll,
    toHitNumber: options.toHitNumber,
    location: options.location,
    firingArc: options.firingArc,
    d6Roller: options.d6Roller,
    optionalRules: options.optionalRules,
  });

  return consumeHitAmmo(options, currentState);
}

function consumeHitAmmo(
  options: IResolveWeaponHitEarlyOptions,
  currentState: IGameState,
): IGameState {
  return consumeWeaponAmmo({
    currentState,
    events: options.events,
    gameId: options.gameId,
    attackerId: options.unitId,
    weapon: options.weapon,
    ammoWeaponType: options.ammoWeaponType,
  });
}
