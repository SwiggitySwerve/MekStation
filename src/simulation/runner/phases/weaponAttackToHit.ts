import type {
  IC3NetworkUnit,
  IC3NetworkState,
} from '@/utils/gameplay/c3Network';

import { lineOfSightOptionsFromGameState } from '@/engine/InteractiveSession.indirectFire';
import {
  IAttackerState,
  IGameState,
  IHexGrid,
  ITargetState,
  RangeBracket,
} from '@/types/gameplay';
import { calculateLOS } from '@/utils/gameplay/lineOfSight';
import {
  calculateToHit,
  calculateToHitWithC3,
  type ISemiGuidedTagToHitContext,
} from '@/utils/gameplay/toHit';

import type { IWeapon } from '../../ai/types';

import { hasPlaytest3C3SpotterLineOfSightRule } from './weaponAttackC3';

export function calculateWeaponAttackToHit(options: {
  readonly attackerState: IAttackerState;
  readonly targetState: ITargetState;
  readonly rangeBracket: RangeBracket;
  readonly distance: number;
  readonly attackerId: string;
  readonly targetPosition: IGameState['units'][string]['position'];
  readonly weapon: IWeapon;
  readonly c3State: IC3NetworkState | undefined;
  readonly isIndirectFire: boolean;
  readonly optionalRules: readonly string[] | undefined;
  readonly grid: IHexGrid | undefined;
  readonly currentState: IGameState;
  readonly semiGuidedTagContext: ISemiGuidedTagToHitContext;
}): ReturnType<typeof calculateToHit> {
  const {
    attackerId,
    attackerState,
    c3State,
    currentState,
    distance,
    grid,
    isIndirectFire,
    optionalRules,
    rangeBracket,
    semiGuidedTagContext,
    targetPosition,
    targetState,
    weapon,
  } = options;

  if (c3State === undefined || isIndirectFire) {
    return calculateToHit(
      attackerState,
      targetState,
      rangeBracket,
      distance,
      weapon.minRange,
      weapon.id,
      semiGuidedTagContext,
    );
  }

  const c3RequiresSpotterLineOfSight =
    hasPlaytest3C3SpotterLineOfSightRule(optionalRules);
  return calculateToHitWithC3(
    attackerState,
    targetState,
    rangeBracket,
    distance,
    {
      attackerEntityId: attackerId,
      targetPosition,
      weaponRangeProfile: {
        short: weapon.shortRange,
        medium: weapon.mediumRange,
        long: weapon.longRange,
        ...(weapon.extremeRange !== undefined
          ? { extreme: weapon.extremeRange }
          : {}),
        ...(weapon.minRange > 0 ? { minimum: weapon.minRange } : {}),
      },
      c3State,
      ...(c3RequiresSpotterLineOfSight
        ? {
            targetingOptions: {
              requireSpotterTargetLineOfSight: true,
              spotterHasTargetLineOfSight: (spotter: IC3NetworkUnit) =>
                grid
                  ? calculateLOS(
                      spotter.position,
                      targetPosition,
                      grid,
                      undefined,
                      undefined,
                      lineOfSightOptionsFromGameState(
                        currentState,
                        optionalRules,
                      ),
                    ).hasLOS
                  : false,
            },
          }
        : {}),
    },
    weapon.minRange,
    weapon.id,
    semiGuidedTagContext,
  );
}
