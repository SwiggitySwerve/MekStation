/**
 * Contract (enemy) morale: the MekHQ monthly morale check as pure functions.
 *
 * Port of MekHQ `e7adc2c`, `mekhq/campaign/mission/contract/utilities/MHQMorale.java`.
 * The level is the ENEMY's morale on a contract (`ContractMoraleLevel`): a higher
 * level is a stronger enemy, so a player victory pushes it down (WAVERING) and a
 * player defeat lets it recover (RALLYING).
 *
 * This module has no state, no clock, no randomness and no wiring. The 2d6 roll,
 * the date, the scenarios, the reliability inputs and the campaign options are
 * all arguments, so the caller owns every source of nondeterminism. The monthly
 * call site is `CampaignNewDayManager.java:1265-1271` (the 1st of the month, for
 * each active contract).
 *
 * What is NOT here, on purpose:
 * - the ROUTED follow-up (`routedMoraleUpdate`, `MHQMorale.java:646-675`: early
 *   end, payout, rout end date, prisoners) and the rout-end re-spike
 *   (`checkMorale`, `MHQMorale.java:684-743`);
 * - the StratCon escalation roll (`MHQMorale.java:754`);
 * - the per-scenario forced rolls (`processMoraleChangeFromScenario`,
 *   `MHQMorale.java:582-604`).
 *
 * @module campaign/scenario/contractMorale
 */

import { AtBMoraleLevel } from '@/types/campaign/scenario/scenarioTypes';

/** `MHQMorale.java:104-106`. A modified roll at or below this rallies the enemy. */
export const RALLYING_TARGET_NUMBER = 6;
/** `MHQMorale.java:105`. Between the rally and waver thresholds the level holds. */
export const NO_CHANGE_TARGET_NUMBER = 7;
/** `MHQMorale.java:106`. A modified roll at or above this wavers the enemy. */
export const WAVERING_TARGET_NUMBER = 8;

/** `MHQMorale.java:143-147`. */
export type MoraleOutcome = 'RALLYING' | 'WAVERING' | 'UNCHANGED';

/** `MHQMorale.java:129-135`. */
export type PerformanceOutcome =
  | 'DECISIVE_VICTORY'
  | 'VICTORY'
  | 'DRAW'
  | 'DEFEAT'
  | 'DECISIVE_DEFEAT';

/**
 * The four performance modifiers, `CampaignOption.MORALE_*_EFFECT`
 * (`CampaignOption.java:1091-1098`). Added to the roll, so a higher value makes
 * the enemy more likely to waver.
 */
export interface IMoraleModifiers {
  readonly decisiveVictory: number;
  readonly victory: number;
  readonly defeat: number;
  readonly decisiveDefeat: number;
}

/** Pin defaults: decisive victory +2, victory +1, defeat -2, decisive defeat -3. */
export const DEFAULT_MORALE_MODIFIERS: IMoraleModifiers = Object.freeze({
  decisiveVictory: 2,
  victory: 1,
  defeat: -2,
  decisiveDefeat: -3,
});

/**
 * The scenario-status predicates `getPerformanceModifier` reads
 * (`MHQMorale.java:486-515`). They mirror MekHQ's `ScenarioStatus` methods
 * one-to-one and overlap the same way (a decisive victory is also an overall
 * victory), so a caller maps its own statuses onto them. MekStation's
 * `ScenarioStatus` has no decisive, Pyrrhic, refused-engagement or
 * fleet-in-being values, so only the plain victory/defeat flags can be set from
 * it today.
 */
export interface IMoraleScenarioStatus {
  readonly decisiveDefeat: boolean;
  readonly refusedEngagement: boolean;
  readonly decisiveVictory: boolean;
  readonly pyrrhicVictory: boolean;
  readonly fleetInBeing: boolean;
  readonly overallVictory: boolean;
  readonly overallDefeat: boolean;
}

/** One contract scenario. `date` is `YYYY-MM-DD`, or `null` when not yet found. */
export interface IMoraleScenario {
  readonly date: string | null;
  readonly status: IMoraleScenarioStatus;
}

/** The faction predicates `getReliability` reads (`MHQMorale.java:371-390`). */
export interface IEnemyFactionTraits {
  readonly isClan: boolean;
  readonly isRebel: boolean;
  readonly isMinorPower: boolean;
  readonly isMercenary: boolean;
  readonly isPirate: boolean;
}

/**
 * `SkillLevel.getAdjustedValue()` is `experienceLevel - 1`, so ULTRA_GREEN is 0
 * and LEGENDARY is 6 (megamek `SkillLevel.java:46-56, 167`).
 */
const GREEN_ADJUSTED = 1;
const ELITE_ADJUSTED = 4;
const LEGENDARY_ADJUSTED = 6;

/** `MHQMorale.java:270-277`. */
const RALLY: Readonly<Record<AtBMoraleLevel, AtBMoraleLevel>> = {
  [AtBMoraleLevel.ROUTED]: AtBMoraleLevel.CRITICAL,
  [AtBMoraleLevel.CRITICAL]: AtBMoraleLevel.WEAKENED,
  [AtBMoraleLevel.WEAKENED]: AtBMoraleLevel.STALEMATE,
  [AtBMoraleLevel.STALEMATE]: AtBMoraleLevel.ADVANCING,
  [AtBMoraleLevel.ADVANCING]: AtBMoraleLevel.DOMINATING,
  [AtBMoraleLevel.DOMINATING]: AtBMoraleLevel.OVERWHELMING,
  [AtBMoraleLevel.OVERWHELMING]: AtBMoraleLevel.OVERWHELMING,
};

/** `MHQMorale.java:280-287`. */
const WAVER: Readonly<Record<AtBMoraleLevel, AtBMoraleLevel>> = {
  [AtBMoraleLevel.ROUTED]: AtBMoraleLevel.ROUTED,
  [AtBMoraleLevel.CRITICAL]: AtBMoraleLevel.ROUTED,
  [AtBMoraleLevel.WEAKENED]: AtBMoraleLevel.CRITICAL,
  [AtBMoraleLevel.STALEMATE]: AtBMoraleLevel.WEAKENED,
  [AtBMoraleLevel.ADVANCING]: AtBMoraleLevel.STALEMATE,
  [AtBMoraleLevel.DOMINATING]: AtBMoraleLevel.ADVANCING,
  [AtBMoraleLevel.OVERWHELMING]: AtBMoraleLevel.DOMINATING,
};

/**
 * `MHQMorale.getMoraleOutcome` (`MHQMorale.java:263-299`): the level after a
 * morale roll. A lower roll is better for the enemy. Unlike the Java method this
 * does not mutate a contract; it returns the new level.
 */
export function getMoraleOutcome(
  current: AtBMoraleLevel,
  roll: number,
): { readonly outcome: MoraleOutcome; readonly level: AtBMoraleLevel } {
  if (roll <= RALLYING_TARGET_NUMBER) {
    return { outcome: 'RALLYING', level: RALLY[current] };
  }
  if (roll >= WAVERING_TARGET_NUMBER) {
    return { outcome: 'WAVERING', level: WAVER[current] };
  }
  return { outcome: 'UNCHANGED', level: current };
}

/**
 * `MHQMorale.getReliabilityModifier` (`MHQMorale.java:418-428`): +1 for a Green
 * or worse enemy, -1 for an Elite or better one, otherwise 0.
 */
export function getReliabilityModifier(adjustedSkillLevel: number): number {
  if (adjustedSkillLevel <= GREEN_ADJUSTED) return 1;
  if (adjustedSkillLevel >= ELITE_ADJUSTED) return -1;
  return 0;
}

/**
 * `MHQMorale.getReliability` (`MHQMorale.java:367-393`). A Clan enemy gets +1
 * effective skill (capped at Legendary) before the skill modifier is read, then
 * a further -1; rebel, minor-power, mercenary and pirate enemies get +1 instead
 * (the pin tests those first, so they win over the Clan penalty).
 */
export function getReliability(
  adjustedSkillLevel: number,
  traits: IEnemyFactionTraits,
): number {
  const skill = traits.isClan
    ? Math.min(LEGENDARY_ADJUSTED, adjustedSkillLevel + 1)
    : adjustedSkillLevel;
  let modifier = getReliabilityModifier(skill);
  if (
    traits.isRebel ||
    traits.isMinorPower ||
    traits.isMercenary ||
    traits.isPirate
  ) {
    modifier++;
  } else if (traits.isClan) {
    modifier--;
  }
  return modifier;
}

/**
 * `LocalDate.minusMonths(1)` on a `YYYY-MM-DD` string: the day is clamped to the
 * length of the previous month (31 March gives 28 or 29 February). The calendar
 * date is used as written, so no time zone enters.
 */
export function minusOneMonth(isoDate: string): string {
  const year = Number(isoDate.slice(0, 4));
  const month = Number(isoDate.slice(5, 7));
  const day = Number(isoDate.slice(8, 10));
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const clamped = Math.min(day, daysInMonth(prevYear, prevMonth));
  return `${pad(prevYear, 4)}-${pad(prevMonth, 2)}-${pad(clamped, 2)}`;
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return leap ? 29 : 28;
  }
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

/**
 * `MHQMorale.getPerformanceModifier` (`MHQMorale.java:448-528`). Scenarios dated
 * before `today` minus one month are skipped, as are scenarios with no date; a
 * later-dated scenario is still counted (the pin has no upper bound). Victories
 * and defeats are tallied in the pin's order, then the larger side wins: the
 * decisive modifier when it has at least twice the other side, else the plain
 * one, and 0 on a tie.
 */
export function getPerformanceModifier(
  today: string,
  scenarios: readonly IMoraleScenario[],
  modifiers: IMoraleModifiers,
): number {
  let victories = 0;
  let defeats = 0;
  const windowStart = minusOneMonth(today.slice(0, 10));

  for (const scenario of scenarios) {
    if (scenario.date === null) continue;
    // `lastMonth.isAfter(scenarioDate)`: ISO dates compare as strings.
    if (windowStart > scenario.date.slice(0, 10)) continue;

    const status = scenario.status;
    if (status.decisiveDefeat || status.refusedEngagement) {
      defeats += 2;
      continue;
    }
    if (status.decisiveVictory) {
      victories += 2;
      continue;
    }
    if (status.pyrrhicVictory) {
      defeats++;
      victories++;
      continue;
    }
    if (status.fleetInBeing) {
      defeats++;
      continue;
    }
    if (status.overallVictory) {
      victories++;
    } else if (status.overallDefeat) {
      defeats++;
    }
  }

  if (victories > defeats) {
    return victories >= defeats * 2
      ? modifiers.decisiveVictory
      : modifiers.victory;
  }
  if (defeats > victories) {
    return defeats >= victories * 2
      ? modifiers.decisiveDefeat
      : modifiers.defeat;
  }
  return 0;
}

/**
 * `MHQMorale.getOutcome` (`MHQMorale.java:315-328`): the label for a performance
 * modifier, matched by equality with the configured modifiers in the pin's
 * order. A 0 (or any unconfigured value) is a draw.
 */
export function getPerformanceOutcome(
  modifiers: IMoraleModifiers,
  performanceModifier: number,
): PerformanceOutcome {
  if (performanceModifier === modifiers.decisiveVictory) {
    return 'DECISIVE_VICTORY';
  }
  if (performanceModifier === modifiers.victory) return 'VICTORY';
  if (performanceModifier === modifiers.decisiveDefeat) {
    return 'DECISIVE_DEFEAT';
  }
  if (performanceModifier === modifiers.defeat) return 'DEFEAT';
  return 'DRAW';
}

export interface IMoraleCheckInput {
  /** Current enemy morale on the contract. */
  readonly level: AtBMoraleLevel;
  /** Date of the check, `YYYY-MM-DD`. */
  readonly today: string;
  /** The unmodified 2d6 roll, supplied by the caller. */
  readonly roll: number;
  /** `getReliability(...)`, or 0 where the enemy's skill and faction are unknown. */
  readonly reliability: number;
  readonly scenarios: readonly IMoraleScenario[];
  readonly modifiers: IMoraleModifiers;
}

export interface IMoraleCheckResult {
  readonly level: AtBMoraleLevel;
  readonly outcome: MoraleOutcome;
  readonly roll: number;
  readonly reliability: number;
  readonly performanceModifier: number;
  readonly performanceOutcome: PerformanceOutcome;
  readonly modifiedRoll: number;
}

/**
 * `MHQMorale.performMoraleCheck` (`MHQMorale.java:167-189`) without the report
 * text: the modified roll is the 2d6 roll plus reliability plus the performance
 * modifier, and the table above turns it into a new level.
 */
export function performMoraleCheck(
  input: IMoraleCheckInput,
): IMoraleCheckResult {
  const performanceModifier = getPerformanceModifier(
    input.today,
    input.scenarios,
    input.modifiers,
  );
  const modifiedRoll = input.roll + input.reliability + performanceModifier;
  const { outcome, level } = getMoraleOutcome(input.level, modifiedRoll);
  return {
    level,
    outcome,
    roll: input.roll,
    reliability: input.reliability,
    performanceModifier,
    performanceOutcome: getPerformanceOutcome(
      input.modifiers,
      performanceModifier,
    ),
    modifiedRoll,
  };
}
