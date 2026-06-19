import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  type IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';

import type { IAttackEvent } from '../../ai/AIPlayerEvents';
import type { IWeapon } from '../../ai/types';
import type { WeaponAttackManifestResolver } from './weaponAttackManifest';

import { createMinimalWeapon } from '../SimulationRunnerSupport';
import {
  appendWeaponAttackInvalidEvent,
  declaredAttackPayloadMaps,
  isInactiveWeaponPhaseUnit,
  isUnavailableWeaponAttackTarget,
} from './weaponAttackContext';
import { findINarcNemesisRedirectTarget } from './weaponAttackDesignatorMarkers';
import {
  getSelectedFiringMode,
  selectedAmmoWeaponType,
} from './weaponAttackFiringModes';
import { buildWeaponAttackShotContext } from './weaponAttackShotContext';
import { runWeaponAttackShots } from './weaponAttackShots';
import { validateDeclaredAttackTarget } from './weaponAttackTargetValidation';

export function runWeaponAttackMount(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly unitId: string;
  readonly weaponId: string;
  readonly attackEvent: IAttackEvent;
  readonly primaryTargetId?: string;
  readonly hydratedWeapons?: readonly IWeapon[];
  readonly weaponLookup: ReadonlyMap<string, IWeapon>;
  readonly d6Roller: () => number;
  readonly grid?: IHexGrid;
  readonly optionalRules?: readonly string[];
  readonly manifestsByUnit?: Map<string, CriticalSlotManifest>;
  readonly getOrSeedManifest: WeaponAttackManifestResolver;
  readonly weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  readonly environmentalConditions?: IEnvironmentalConditions;
}): { readonly state: IGameState; readonly stopUnitAttack: boolean } {
  let targetId = attackTargetIdForWeapon(options.attackEvent, options.weaponId);
  const targetValidation = validateDeclaredAttackTarget({
    currentState: options.currentState,
    events: options.events,
    gameId: options.gameId,
    unitId: options.unitId,
    targetId,
    declaredWeaponIds: [options.weaponId],
  });
  if (!targetValidation.permitted) {
    return { state: options.currentState, stopUnitAttack: false };
  }

  const hydratedWeapon = options.weaponLookup.get(options.weaponId);
  if (!hydratedWeapon && options.hydratedWeapons) {
    appendWeaponAttackInvalidEvent({
      events: options.events,
      gameId: options.gameId,
      turn: options.currentState.turn,
      attackerId: options.unitId,
      targetId,
      weaponId: options.weaponId,
      reason: 'UnknownWeapon',
      details:
        'Declared weapon id was not present in the hydrated catalog weapon map',
    });
    return { state: options.currentState, stopUnitAttack: false };
  }

  const baseWeapon = hydratedWeapon ?? createMinimalWeapon(options.weaponId);
  if (baseWeapon.destroyed) {
    appendWeaponAttackInvalidEvent({
      events: options.events,
      gameId: options.gameId,
      turn: options.currentState.turn,
      attackerId: options.unitId,
      targetId,
      weaponId: options.weaponId,
      reason: 'WeaponDestroyed',
    });
    return { state: options.currentState, stopUnitAttack: false };
  }

  const selectedModeId =
    options.attackEvent.payload.weaponModes?.[options.weaponId];
  const selectedMode = getSelectedFiringMode(baseWeapon, selectedModeId);
  const ammoWeaponType = selectedAmmoWeaponType(baseWeapon, selectedMode);
  const selectedAMSWeaponId =
    options.attackEvent.payload.selectedAMSWeaponIds?.[options.weaponId];
  const { declaredSelectedAMSWeaponIds, declaredWeaponModes } =
    declaredAttackPayloadMaps({
      weaponId: options.weaponId,
      selectedModeId,
      selectedMode,
      selectedAMSWeaponId,
    });
  const nemesisRedirectTargetId = findINarcNemesisRedirectTarget({
    currentState: options.currentState,
    attackerId: options.unitId,
    targetId,
    weapon: baseWeapon,
    selectedMode,
    ammoWeaponType,
  });
  if (nemesisRedirectTargetId !== undefined) {
    targetId = nemesisRedirectTargetId;
  }

  const attackerNow = options.currentState.units[options.unitId];
  const targetNow = options.currentState.units[targetId];
  if (isInactiveWeaponPhaseUnit(attackerNow)) {
    return { state: options.currentState, stopUnitAttack: true };
  }
  if (isUnavailableWeaponAttackTarget(targetNow)) {
    return { state: options.currentState, stopUnitAttack: true };
  }

  const shotContext = buildWeaponAttackShotContext({
    ...options,
    attackerNow,
    targetNow,
    targetId,
    baseWeapon,
    selectedMode,
    ammoWeaponType,
  });
  if (shotContext === undefined) {
    return { state: options.currentState, stopUnitAttack: false };
  }

  return {
    state: runWeaponAttackShots({
      currentState: options.currentState,
      events: options.events,
      gameId: options.gameId,
      attackerId: options.unitId,
      targetId,
      weaponId: options.weaponId,
      selectedShotWeapons: shotContext.selectedShotWeapons,
      baseWeapon,
      selectedMode,
      d6Roller: options.d6Roller,
      indirectFireResolution: shotContext.indirectFireResolution,
      targetHex: targetNow.position,
      indirectFirePenalty: shotContext.indirectFirePenalty,
      ammoWeaponType,
      declaredAttack: shotContext.declaredAttack,
      declaredWeaponModes,
      declaredSelectedAMSWeaponIds,
      rangeBracket: shotContext.rangeBracket,
      firingArc: shotContext.firingArc,
      targetPartialCover: shotContext.targetPartialCover,
      damageableCoverProvider: shotContext.damageableCoverProvider,
      grid: options.grid,
      optionalRules: options.optionalRules,
      getOrSeedManifest: options.getOrSeedManifest,
      manifestsByUnit: options.manifestsByUnit,
      weaponsByUnit: options.weaponsByUnit,
      selectedAMSWeaponId,
      distance: shotContext.distance,
    }),
    stopUnitAttack: false,
  };
}

function attackTargetIdForWeapon(
  attackEvent: IAttackEvent,
  weaponId: string,
): string {
  return (
    attackEvent.payload.weaponTargets?.[weaponId] ??
    attackEvent.payload.targetId
  );
}
