import {
  type MovementEnhancementActivationKind,
  MovementType,
} from '@/types/gameplay';
import { getMASCOrSuperchargerFailureTargetNumber } from '@/utils/gameplay/pilotingSkillRolls';

import { isBattleMechLikeUnitType } from './terrainPsrTriggers';

/** What the planner needs to know about one booster on the moving unit. */
export interface IBoosterPlanState {
  /** The booster is armed (MekStation: `activeMASC` / `activeSupercharger`). */
  readonly armed: boolean;
  /** Consecutive-use level (MekStation: `mascTurnsUsed` / `superchargerTurnsUsed`). */
  readonly level: number;
  /** A check was already made this turn (pin: `isMASCUsed` / `isSuperchargerUsed`). */
  readonly usedThisTurn: boolean;
}

/**
 * The unit's MP figures with the boosters taken out or left in. The caller
 * derives these from one movement capability, so this module copies no MP
 * formula (`applyActiveMPBoosters` owns them).
 */
export interface IBoosterMPFigures {
  readonly runNoBoost: number;
  readonly runSingleBoost: number;
  readonly runMax: number;
  readonly sprintNoBoost: number;
  readonly sprintSingleBoost: number;
  readonly sprintMax: number;
}

/** One failure check a move must make before it moves. */
export interface IMovementEnhancementCheck {
  readonly enhancement: MovementEnhancementActivationKind;
  readonly targetNumber: number;
  readonly level: number;
  /** Added to the 2d6 total: -1 for the Supercharger of an Industrial Mek. */
  readonly rollModifier: number;
}

/**
 * The failure checks one move needs, in the order they are made. Pure: no
 * dice. MegaMek 48fcb2f64:
 * - a step uses a booster only when its MP exceeds the unboosted figure
 *   (`MoveStep.java` L2308-L2335, L2499-L2548), so an armed booster alone is
 *   no trigger; Walk, Jump, Evade and Stationary never use one (Evade is
 *   illegal with a booster, L2511-L2513);
 * - up to the single-boost figure one booster is used: the lower target
 *   number, a tie going to the Supercharger (L3217-L3236), and none at all
 *   once either booster was already used this turn (L3222);
 * - above it both are used, each unless already used (L3238-L3250), MASC
 *   checked first (`MovePathHandler.java` L2467-L2468);
 * - a booster already used this turn is never checked again, so a replotted
 *   path after a failed check may spend boosted MP with no second roll
 *   (L2329-L2335).
 * Only BattleMech-like units are planned; Tanks and VTOLs belong to C-4.
 */
export function planMovementEnhancementChecks(options: {
  readonly movementType: MovementType;
  readonly mpUsed: number;
  readonly unitType?: string;
  readonly masc: IBoosterPlanState;
  readonly supercharger: IBoosterPlanState;
  readonly mp: IBoosterMPFigures;
  readonly industrialMech?: boolean;
  readonly optionalRules?: readonly string[];
}): readonly IMovementEnhancementCheck[] {
  const { masc, mpUsed, supercharger } = options;
  if (!isBattleMechLikeUnitType(options.unitType)) return [];
  const figures = figuresFor(options.movementType, options.mp);
  if (!figures || mpUsed <= figures.noBoost) return [];

  const check = (
    enhancement: MovementEnhancementActivationKind,
    state: IBoosterPlanState,
  ): IMovementEnhancementCheck => ({
    enhancement,
    targetNumber: getMASCOrSuperchargerFailureTargetNumber(
      state.level,
      options.optionalRules,
    ),
    level: sanitizedLevel(state.level),
    rollModifier:
      enhancement === 'Supercharger' && options.industrialMech === true
        ? -1
        : 0,
  });

  if (mpUsed <= figures.singleBoost) {
    if (masc.usedThisTurn || supercharger.usedThisTurn) return [];
    const candidates = [
      ...(masc.armed ? [check('MASC', masc)] : []),
      ...(supercharger.armed ? [check('Supercharger', supercharger)] : []),
    ];
    if (candidates.length < 2) return candidates;
    const [mascCheck, superchargerCheck] = candidates;
    return [
      mascCheck.targetNumber < superchargerCheck.targetNumber
        ? mascCheck
        : superchargerCheck,
    ];
  }

  return [
    ...(masc.armed && !masc.usedThisTurn ? [check('MASC', masc)] : []),
    ...(supercharger.armed && !supercharger.usedThisTurn
      ? [check('Supercharger', supercharger)]
      : []),
  ];
}

function figuresFor(
  movementType: MovementType,
  mp: IBoosterMPFigures,
): { readonly noBoost: number; readonly singleBoost: number } | undefined {
  if (movementType === MovementType.Run) {
    return { noBoost: mp.runNoBoost, singleBoost: mp.runSingleBoost };
  }
  if (movementType === MovementType.Sprint) {
    return { noBoost: mp.sprintNoBoost, singleBoost: mp.sprintSingleBoost };
  }
  return undefined;
}

function sanitizedLevel(level: number): number {
  return Number.isFinite(level) ? Math.max(0, Math.trunc(level)) : 0;
}
