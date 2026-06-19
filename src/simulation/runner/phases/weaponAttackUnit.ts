import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  type IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';

import type { IAttackEvent } from '../../ai/AIPlayerEvents';
import type { IAIPlayer } from '../../ai/IAIPlayer';
import type { IAIUnitState, IWeapon } from '../../ai/types';
import type { WeaponAttackManifestResolver } from './weaponAttackManifest';

import { toAIUnitState } from '../SimulationRunnerSupport';
import {
  buildWeaponLookup,
  hasDeclaredWeaponAttackEvent,
  isInactiveWeaponPhaseUnit,
  selectPrimaryWeaponAttackTargetId,
  weaponPhaseEnemyUnits,
} from './weaponAttackContext';
import { runWeaponAttackMount } from './weaponAttackMount';

export function runWeaponAttackForUnit(options: {
  readonly currentState: IGameState;
  readonly unitId: string;
  readonly botPlayer: IAIPlayer;
  readonly allAIUnits: readonly IAIUnitState[];
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly d6Roller: () => number;
  readonly grid?: IHexGrid;
  readonly weaponsByUnit?: ReadonlyMap<string, readonly IWeapon[]>;
  readonly manifestsByUnit?: Map<string, CriticalSlotManifest>;
  readonly getOrSeedManifest: WeaponAttackManifestResolver;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly optionalRules?: readonly string[];
}): IGameState {
  const unit = options.currentState.units[options.unitId];
  if (isInactiveWeaponPhaseUnit(unit)) {
    return options.currentState;
  }

  const aiUnit = toAIUnitState(
    unit,
    options.weaponsByUnit?.get(options.unitId),
  );
  const enemyUnits = weaponPhaseEnemyUnits({
    state: options.currentState,
    attacker: unit,
    allAIUnits: [...options.allAIUnits],
  });
  const attackEvent = options.botPlayer.playAttackPhase(aiUnit, enemyUnits);
  if (!hasDeclaredWeaponAttackEvent(attackEvent)) {
    return options.currentState;
  }

  const declaredWeaponIds = attackEvent.payload.weapons;
  const primaryTargetId = selectPrimaryWeaponAttackTargetId(
    options.currentState,
    options.unitId,
    declaredTargetIdsForWeapons(attackEvent),
  );
  const hydratedWeapons = options.weaponsByUnit?.get(options.unitId);
  const weaponLookup = buildWeaponLookup(unit, hydratedWeapons);

  let currentState = options.currentState;
  for (const weaponId of declaredWeaponIds) {
    const mountResult = runWeaponAttackMount({
      currentState,
      events: options.events,
      gameId: options.gameId,
      unitId: options.unitId,
      weaponId,
      attackEvent,
      primaryTargetId,
      hydratedWeapons,
      weaponLookup,
      d6Roller: options.d6Roller,
      grid: options.grid,
      optionalRules: options.optionalRules,
      manifestsByUnit: options.manifestsByUnit,
      getOrSeedManifest: options.getOrSeedManifest,
      weaponsByUnit: options.weaponsByUnit,
      environmentalConditions: options.environmentalConditions,
    });
    currentState = mountResult.state;
    if (mountResult.stopUnitAttack) break;
  }
  return currentState;
}

function declaredTargetIdsForWeapons(
  attackEvent: IAttackEvent,
): readonly string[] {
  return attackEvent.payload.weapons.map(
    (weaponId) =>
      attackEvent.payload.weaponTargets?.[weaponId] ??
      attackEvent.payload.targetId,
  );
}
