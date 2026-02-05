/**
 * Random Event Types - Type definitions for the campaign random event system
 *
 * Defines categories, severities, effects, and specific event types for
 * prisoner events, life events, and historical events.
 *
 * @module campaign/events/randomEventTypes
 */

// =============================================================================
// Core Types
// =============================================================================

/** Function type for random number generation (returns 0-1) */
export type RandomFn = () => number;

// =============================================================================
// Enums
// =============================================================================

/** Categories of random events */
export enum RandomEventCategory {
  PRISONER = 'prisoner',
  LIFE = 'life',
  CONTRACT = 'contract',
  HISTORICAL = 'historical',
}

/** Severity levels for random events */
export enum RandomEventSeverity {
  MINOR = 'minor',
  MAJOR = 'major',
  CRITICAL = 'critical',
}

// =============================================================================
// Effect Types (Discriminated Union)
// =============================================================================

/** Discriminated union of all possible random event effects */
export type IRandomEventEffect =
  | { readonly type: 'morale_change'; readonly value: number }
  | {
      readonly type: 'financial';
      readonly amount: number;
      readonly description: string;
    }
  | { readonly type: 'prisoner_escape'; readonly percentage: number }
  | { readonly type: 'prisoner_casualty'; readonly count: number }
  | { readonly type: 'scenario_trigger'; readonly scenarioType: string }
  | {
      readonly type: 'personnel_status_change';
      readonly personId: string;
      readonly newStatus: string;
    }
  | {
      readonly type: 'xp_award';
      readonly personId: string;
      readonly amount: number;
    }
  | {
      readonly type: 'notification';
      readonly message: string;
      readonly severity: string;
    };

// =============================================================================
// Event Interface
// =============================================================================

/** A random event that occurred during campaign advancement */
export interface IRandomEvent {
  readonly id: string;
  readonly category: RandomEventCategory;
  readonly severity: RandomEventSeverity;
  readonly title: string;
  readonly description: string;
  readonly effects: readonly IRandomEventEffect[];
  readonly timestamp: string;
}

// =============================================================================
// Prisoner Event Types (30 total: 20 minor + 10 major)
// =============================================================================

export enum PrisonerEventType {
  // Minor events (20)
  ARGUMENT = 'argument',
  WILD_STORIES = 'wild_stories',
  CONVERSATIONS = 'conversations',
  RATIONS = 'rations',
  TRADE = 'trade',
  VETERAN = 'veteran',
  GRAFFITI = 'graffiti',
  PRAYER = 'prayer',
  BARTERING = 'bartering',
  SONGS = 'songs',
  PROPAGANDA = 'propaganda',
  PLOTTING = 'plotting',
  LETTER = 'letter',
  ILLNESS = 'illness',
  PARANOIA = 'paranoia',
  SINGING = 'singing',
  HOLIDAY = 'holiday',
  WHISPERS = 'whispers',
  SENTIMENTAL_ITEM = 'sentimental_item',
  PHOTO = 'photo',
  // Major events (10)
  BREAKOUT = 'breakout',
  RIOT = 'riot',
  MURDER = 'murder',
  FIRE = 'fire',
  POISON = 'poison',
  HOSTAGE = 'hostage',
  ESCAPE_ROPE = 'escape_rope',
  TUNNEL = 'tunnel',
  UNDERCOVER = 'undercover',
  UNITED = 'united',
}

// =============================================================================
// Life Event Types
// =============================================================================

export enum LifeEventType {
  NEW_YEARS = 'new_years',
  COMMANDERS_DAY = 'commanders_day',
  FREEDOM_DAY = 'freedom_day',
  WINTER_HOLIDAY = 'winter_holiday',
  COMING_OF_AGE = 'coming_of_age',
}

// =============================================================================
// Historical Event Types
// =============================================================================

export enum HistoricalEventType {
  GRAY_MONDAY_START = 'gray_monday_start',
  GRAY_MONDAY_BANKRUPTCY = 'gray_monday_bankruptcy',
  GRAY_MONDAY_EMPLOYER_BEGGING = 'gray_monday_employer_begging',
  GRAY_MONDAY_END = 'gray_monday_end',
}

// =============================================================================
// Prisoner Event Classification
// =============================================================================

/** All 20 minor prisoner event types */
export const MINOR_PRISONER_EVENTS: readonly PrisonerEventType[] = [
  PrisonerEventType.ARGUMENT,
  PrisonerEventType.WILD_STORIES,
  PrisonerEventType.CONVERSATIONS,
  PrisonerEventType.RATIONS,
  PrisonerEventType.TRADE,
  PrisonerEventType.VETERAN,
  PrisonerEventType.GRAFFITI,
  PrisonerEventType.PRAYER,
  PrisonerEventType.BARTERING,
  PrisonerEventType.SONGS,
  PrisonerEventType.PROPAGANDA,
  PrisonerEventType.PLOTTING,
  PrisonerEventType.LETTER,
  PrisonerEventType.ILLNESS,
  PrisonerEventType.PARANOIA,
  PrisonerEventType.SINGING,
  PrisonerEventType.HOLIDAY,
  PrisonerEventType.WHISPERS,
  PrisonerEventType.SENTIMENTAL_ITEM,
  PrisonerEventType.PHOTO,
] as const;

/** All 10 major prisoner event types */
export const MAJOR_PRISONER_EVENTS: readonly PrisonerEventType[] = [
  PrisonerEventType.BREAKOUT,
  PrisonerEventType.RIOT,
  PrisonerEventType.MURDER,
  PrisonerEventType.FIRE,
  PrisonerEventType.POISON,
  PrisonerEventType.HOSTAGE,
  PrisonerEventType.ESCAPE_ROPE,
  PrisonerEventType.TUNNEL,
  PrisonerEventType.UNDERCOVER,
  PrisonerEventType.UNITED,
] as const;

/** All 30 prisoner event types (minor + major) */
export const ALL_PRISONER_EVENT_TYPES: readonly PrisonerEventType[] = [
  ...MINOR_PRISONER_EVENTS,
  ...MAJOR_PRISONER_EVENTS,
] as const;

// =============================================================================
// Type Guards
// =============================================================================

const randomEventCategoryValues = new Set<string>(
  Object.values(RandomEventCategory),
);
const randomEventSeverityValues = new Set<string>(
  Object.values(RandomEventSeverity),
);
const prisonerEventTypeValues = new Set<string>(
  Object.values(PrisonerEventType),
);

/** Type guard for RandomEventCategory */
export function isRandomEventCategory(
  value: unknown,
): value is RandomEventCategory {
  return typeof value === 'string' && randomEventCategoryValues.has(value);
}

/** Type guard for RandomEventSeverity */
export function isRandomEventSeverity(
  value: unknown,
): value is RandomEventSeverity {
  return typeof value === 'string' && randomEventSeverityValues.has(value);
}

/** Type guard for PrisonerEventType */
export function isPrisonerEventType(
  value: unknown,
): value is PrisonerEventType {
  return typeof value === 'string' && prisonerEventTypeValues.has(value);
}
