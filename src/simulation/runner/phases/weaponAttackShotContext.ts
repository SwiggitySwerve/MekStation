import type { CriticalSlotManifest } from '@/utils/gameplay/criticalHitResolution/types';

import {
  type IEnvironmentalConditions,
  IGameEvent,
  IGameState,
  IHexGrid,
} from '@/types/gameplay';
import { getECMProtectedFlag } from '@/utils/gameplay/electronicWarfare';
import { calculateFiringArc } from '@/utils/gameplay/firingArc';
import { hexDistance } from '@/utils/gameplay/hexMath';
import { hasSPA } from '@/utils/gameplay/spaModifiers';
import { getTargetCoverInfo } from '@/utils/gameplay/terrainCover';
import {
  buildWeaponAttackAttackerToHitState,
  buildWeaponAttackTargetToHitState,
} from '@/utils/gameplay/toHit';

import type { IAttackEvent } from '../../ai/AIPlayerEvents';
import type { IWeapon } from '../../ai/types';

import { DEFAULT_GUNNERY } from '../SimulationRunnerConstants';
import { getRangeBracket } from '../SimulationRunnerSupport';
import {
  hydrateC3StateForAttack,
  iNarcHaywireToHitModifier,
  iNarcHomingToHitModifier,
} from './weaponAttackC3';
import {
  appendWeaponAttackInvalidEvent,
  buildSecondaryTargetState,
  weaponAttackRangeInvalidReason,
} from './weaponAttackContext';
import { iNarcHomingTeams } from './weaponAttackDesignatorMarkers';
import {
  expandSelectedModeIntoShots,
  getSelectedFiringMode,
  isSemiGuidedAmmoSelectedForWeapon,
  isWeaponJammed,
  resolveSandblasterAutocannonRateOfFireShotCount,
  selectedModeToHitModifier,
} from './weaponAttackFiringModes';
import { validateLineOfSightForAttack } from './weaponAttackLineOfSight';
import { buildWeaponAttackModifierPayload } from './weaponAttackModifierPayload';
import { targetTerrainFeatures } from './weaponAttackTerrainModifiers';
import { calculateWeaponAttackToHit } from './weaponAttackToHit';

export function buildWeaponAttackShotContext(options: {
  readonly currentState: IGameState;
  readonly events: IGameEvent[];
  readonly gameId: string;
  readonly unitId: string;
  readonly weaponId: string;
  readonly primaryTargetId?: string;
  readonly d6Roller: () => number;
  readonly grid?: IHexGrid;
  readonly optionalRules?: readonly string[];
  readonly manifestsByUnit?: Map<string, CriticalSlotManifest>;
  readonly environmentalConditions?: IEnvironmentalConditions;
  readonly attackEvent: IAttackEvent;
  readonly attackerNow: IGameState['units'][string];
  readonly targetNow: IGameState['units'][string];
  readonly targetId: string;
  readonly baseWeapon: IWeapon;
  readonly selectedMode: ReturnType<typeof getSelectedFiringMode>;
  readonly ammoWeaponType: string;
}):
  | {
      readonly distance: number;
      readonly rangeBracket: ReturnType<typeof getRangeBracket>;
      readonly selectedShotWeapons: readonly IWeapon[];
      readonly indirectFireResolution: ReturnType<
        typeof validateLineOfSightForAttack
      >['indirectFireResolution'];
      readonly indirectFirePenalty: number;
      readonly declaredAttack: ReturnType<
        typeof buildWeaponAttackModifierPayload
      >;
      readonly firingArc: ReturnType<typeof calculateFiringArc>;
      readonly targetPartialCover: boolean;
      readonly damageableCoverProvider: ReturnType<
        typeof validateLineOfSightForAttack
      >['losResult'] extends infer T
        ? T extends { damageableCoverProviders: readonly (infer P)[] }
          ? P | undefined
          : undefined
        : undefined;
    }
  | undefined {
  const calledShot =
    options.attackEvent.payload.calledShots?.[options.weaponId] === true;
  const teammateCalledShot =
    options.attackEvent.payload.teammateCalledShots?.[options.weaponId] ===
    true;
  const distance = hexDistance(
    options.attackerNow.position,
    options.targetNow.position,
  );
  const rangeBracket = getRangeBracket(
    distance,
    options.baseWeapon.shortRange,
    options.baseWeapon.mediumRange,
    options.baseWeapon.longRange,
    options.baseWeapon.extremeRange,
  );
  const rangeInvalidReason = weaponAttackRangeInvalidReason(
    distance,
    rangeBracket,
  );
  if (rangeInvalidReason) {
    appendWeaponAttackInvalidEvent({
      events: options.events,
      gameId: options.gameId,
      turn: options.currentState.turn,
      attackerId: options.unitId,
      targetId: options.targetId,
      weaponId: options.weaponId,
      reason: rangeInvalidReason,
    });
    return undefined;
  }

  const selectedShotWeapons = selectedShotWeaponsForAttack({
    ...options,
    distance,
  });
  const attackerState = buildWeaponAttackAttackerToHitState(
    options.attackerNow,
    options.attackerNow.gunnery ?? DEFAULT_GUNNERY,
    options.baseWeapon,
    options.targetId,
    buildSecondaryTargetState(
      options.currentState,
      options.unitId,
      options.targetId,
      options.primaryTargetId,
    ),
    {
      calledShot,
      teammateCalledShot,
      applyLocalCalledShotAbilityReduction: false,
    },
  );
  const targetCoverInfo = options.grid
    ? getTargetCoverInfo(
        options.grid,
        options.attackerNow.position,
        options.targetNow.position,
      )
    : null;
  const targetPartialCover = targetCoverInfo?.partialCover ?? false;
  const targetState = buildWeaponAttackTargetToHitState(
    options.targetNow,
    targetPartialCover,
    targetTerrainFeatures(options.grid, options.targetNow.position),
  );
  const lineOfSight = validateLineOfSightForAttack({
    currentState: options.currentState,
    events: options.events,
    gameId: options.gameId,
    grid: options.grid,
    unitId: options.unitId,
    targetId: options.targetId,
    weaponId: options.weaponId,
    attackerPosition: options.attackerNow.position,
    targetPosition: options.targetNow.position,
    optionalRules: options.optionalRules,
  });
  if (!lineOfSight.permitted) {
    return undefined;
  }

  const indirectFireResolution = lineOfSight.indirectFireResolution;
  const isIndirectFire =
    indirectFireResolution?.permitted === true &&
    indirectFireResolution.isIndirect;
  const indirectFirePenalty =
    isIndirectFire && indirectFireResolution
      ? indirectFireResolution.toHitPenalty
      : 0;
  const targetEcmProtected = targetEcmProtectedForWeaponAttack({
    ...options,
    targetId: options.targetId,
  });
  const semiGuidedAmmoSelected = isSemiGuidedAmmoSelectedForWeapon(
    options.attackerNow,
    options.baseWeapon,
    options.selectedMode,
  );
  const c3State = hydrateC3StateForAttack(
    options.currentState,
    options.manifestsByUnit,
  );
  const toHitCalc = calculateWeaponAttackToHit({
    attackerState,
    targetState,
    rangeBracket,
    distance,
    attackerId: options.unitId,
    targetPosition: options.targetNow.position,
    weapon: options.baseWeapon,
    c3State,
    isIndirectFire,
    optionalRules: options.optionalRules,
    grid: options.grid,
    currentState: options.currentState,
    semiGuidedTagContext: {
      isSemiGuided: semiGuidedAmmoSelected,
      targetTagDesignated: options.targetNow.tagDesignated,
      targetEcmProtected,
      isIndirectFire,
      indirectFirePenalty,
    },
  });
  const iNarcHomingModifier = iNarcHomingToHitModifier({
    attackerTeamId: options.attackerNow.side as string,
    targetINarcedBy: iNarcHomingTeams(options.targetNow),
    targetEcmProtected,
    weapon: options.baseWeapon,
  });
  const iNarcHaywireModifier = iNarcHaywireToHitModifier(options.attackerNow);
  const modeToHitModifier = selectedModeToHitModifier(
    options.baseWeapon,
    options.selectedMode,
  );
  const firingArc = calculateFiringArc(
    options.attackerNow.position,
    options.targetNow.position,
    options.targetNow.facing,
  );
  const declaredAttack = buildWeaponAttackModifierPayload({
    toHitCalc,
    indirectFirePenalty,
    modeToHitModifier,
    iNarcHomingModifier,
    iNarcHaywireModifier,
    grid: options.grid,
    lineOfSight,
    targetPosition: options.targetNow.position,
    environmentalConditions: options.environmentalConditions,
    weapon: options.baseWeapon,
    attacker: options.attackerNow,
    target: options.targetNow,
  });

  if (
    isWeaponJammed(
      options.currentState.units[options.unitId],
      options.baseWeapon.id,
    )
  ) {
    appendWeaponAttackInvalidEvent({
      events: options.events,
      gameId: options.gameId,
      turn: options.currentState.turn,
      attackerId: options.unitId,
      targetId: options.targetId,
      weaponId: options.weaponId,
      reason: 'WeaponJammed',
    });
    return undefined;
  }

  return {
    distance,
    rangeBracket,
    selectedShotWeapons,
    indirectFireResolution,
    indirectFirePenalty,
    declaredAttack,
    firingArc,
    targetPartialCover,
    damageableCoverProvider: targetPartialCover
      ? lineOfSight.losResult?.damageableCoverProviders.find(
          (provider) => provider.side === 'target',
        )
      : undefined,
  };
}

function selectedShotWeaponsForAttack(options: {
  readonly attackerNow: IGameState['units'][string];
  readonly baseWeapon: IWeapon;
  readonly selectedMode: ReturnType<typeof getSelectedFiringMode>;
  readonly d6Roller: () => number;
  readonly distance: number;
}): readonly IWeapon[] {
  const sandblasterRateOfFireShotCount =
    resolveSandblasterAutocannonRateOfFireShotCount({
      baseWeapon: options.baseWeapon,
      selectedMode: options.selectedMode,
      d6Roller: options.d6Roller,
      clusterContext: {
        sandblasterSPA: hasSPA(
          options.attackerNow.abilities ?? [],
          'sandblaster',
        ),
        designatedWeaponType: options.attackerNow.designatedWeaponType,
        attackRange: options.distance,
      },
    });
  return expandSelectedModeIntoShots(
    options.baseWeapon,
    options.selectedMode,
    sandblasterRateOfFireShotCount?.shotCount,
  );
}

function targetEcmProtectedForWeaponAttack(options: {
  readonly currentState: IGameState;
  readonly unitId: string;
  readonly targetId: string;
  readonly attackerNow: IGameState['units'][string];
  readonly targetNow: IGameState['units'][string];
}): boolean | undefined {
  return options.currentState.electronicWarfare
    ? getECMProtectedFlag(
        options.attackerNow.position,
        options.attackerNow.side as string,
        options.unitId,
        options.targetNow.position,
        options.targetNow.side as string,
        options.targetId,
        options.currentState.electronicWarfare,
      )
    : undefined;
}
