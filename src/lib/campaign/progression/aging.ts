/**
 * Aging System - Personnel attribute decay and trait application
 *
 * Implements age-based attribute modifiers and automatic trait application
 * for personnel aging through defined milestones. Modifiers are cumulative
 * across milestones and only applied on birthdays when crossing milestone boundaries.
 *
 * @module campaign/progression/aging
 */

import { ICampaignOptions } from '@/types/campaign/Campaign';
import { IPerson } from '@/types/campaign/Person';
import { IAgingMilestone } from '@/types/campaign/progression/progressionTypes';

// =============================================================================
// Aging Milestones
// =============================================================================

/**
 * 10 aging milestones from age <25 to 101+
 *
 * Each milestone defines:
 * - Age range (minAge to maxAge, inclusive)
 * - Attribute modifiers (cumulative across milestones)
 * - Whether Glass Jaw and Slow Learner traits apply at this milestone
 *
 * Modifiers are applied cumulatively: a 65-year-old gets all modifiers
 * from milestones <25, 25-30, 31-40, 41-50, 51-60, and 61-70.
 */
export const AGING_MILESTONES: IAgingMilestone[] = [
  {
    minAge: 0,
    maxAge: 24,
    label: '<25',
    attributeModifiers: {
      STR: 0,
      BOD: 0,
      DEX: 0,
      REF: 0,
      INT: 0,
      WIL: 0,
      CHA: 0,
    },
    appliesSlowLearner: false,
    appliesGlassJaw: false,
  },
  {
    minAge: 25,
    maxAge: 30,
    label: '25-30',
    attributeModifiers: {
      STR: 0.5,
      BOD: 0.5,
      DEX: 0,
      REF: 0.5,
      INT: 0.5,
      WIL: 0.5,
      CHA: 0.5,
    },
    appliesSlowLearner: false,
    appliesGlassJaw: false,
  },
  {
    minAge: 31,
    maxAge: 40,
    label: '31-40',
    attributeModifiers: {
      STR: 0.5,
      BOD: 0.5,
      DEX: 0,
      REF: 0.5,
      INT: 0.5,
      WIL: 0.5,
      CHA: 0,
    },
    appliesSlowLearner: false,
    appliesGlassJaw: false,
  },
  {
    minAge: 41,
    maxAge: 50,
    label: '41-50',
    attributeModifiers: {
      STR: 0,
      BOD: 0,
      DEX: -0.5,
      REF: 0,
      INT: 0,
      WIL: 0,
      CHA: 0,
    },
    appliesSlowLearner: false,
    appliesGlassJaw: false,
  },
  {
    minAge: 51,
    maxAge: 60,
    label: '51-60',
    attributeModifiers: {
      STR: 0,
      BOD: -1.0,
      DEX: 0,
      REF: -1.0,
      INT: 0,
      WIL: 0,
      CHA: -0.5,
    },
    appliesSlowLearner: false,
    appliesGlassJaw: false,
  },
  {
    minAge: 61,
    maxAge: 70,
    label: '61-70',
    attributeModifiers: {
      STR: -1.0,
      BOD: -1.0,
      DEX: -1.0,
      REF: 0,
      INT: 0.5,
      WIL: 0,
      CHA: -0.5,
    },
    appliesSlowLearner: true,
    appliesGlassJaw: true,
  },
  {
    minAge: 71,
    maxAge: 80,
    label: '71-80',
    attributeModifiers: {
      STR: -1.0,
      BOD: -1.25,
      DEX: 0,
      REF: -1.0,
      INT: 0,
      WIL: -0.5,
      CHA: -0.75,
    },
    appliesSlowLearner: true,
    appliesGlassJaw: true,
  },
  {
    minAge: 81,
    maxAge: 90,
    label: '81-90',
    attributeModifiers: {
      STR: -1.5,
      BOD: -1.5,
      DEX: -1.0,
      REF: -1.0,
      INT: -1.0,
      WIL: -0.5,
      CHA: -1.0,
    },
    appliesSlowLearner: true,
    appliesGlassJaw: true,
  },
  {
    minAge: 91,
    maxAge: 100,
    label: '91-100',
    attributeModifiers: {
      STR: -1.5,
      BOD: -1.75,
      DEX: -1.5,
      REF: -1.25,
      INT: -1.5,
      WIL: -1.0,
      CHA: -1.0,
    },
    appliesSlowLearner: true,
    appliesGlassJaw: true,
  },
  {
    minAge: 101,
    maxAge: 999,
    label: '101+',
    attributeModifiers: {
      STR: -2.0,
      BOD: -2.0,
      DEX: -2.0,
      REF: -1.5,
      INT: -2.0,
      WIL: -1.0,
      CHA: -1.5,
    },
    appliesSlowLearner: true,
    appliesGlassJaw: true,
  },
];

// =============================================================================
// Aging Event Type
// =============================================================================

/**
 * Event emitted when aging effects are applied to a person.
 */
export interface IAgingEvent {
  /** Event type identifier */
  readonly type: 'aging';

  /** ID of the person affected */
  readonly personId: string;

  /** Milestone that was entered */
  readonly milestone: IAgingMilestone;

  /** Age when milestone was entered */
  readonly age: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the aging milestone for a given age.
 *
 * Finds the milestone where minAge <= age <= maxAge.
 *
 * @param age - The age to look up
 * @returns The milestone for this age
 *
 * @example
 * getMilestoneForAge(30) // Returns '25-30' milestone
 * getMilestoneForAge(65) // Returns '61-70' milestone
 */
export function getMilestoneForAge(age: number): IAgingMilestone {
  const milestone = AGING_MILESTONES.find(
    (m) => age >= m.minAge && age <= m.maxAge,
  );

  if (!milestone) {
    throw new Error(`No aging milestone found for age ${age}`);
  }

  return milestone;
}

/**
 * Gets the cumulative attribute modifier for an age and attribute.
 *
 * Sums all modifiers from milestones up to and including the current age.
 *
 * @param age - The age to calculate modifiers for
 * @param attribute - The attribute name (STR, BOD, DEX, etc.)
 * @returns The cumulative modifier for this attribute at this age
 *
 * @example
 * getAgingAttributeModifier(65, 'STR') // -1.0 (from 61-70 milestone)
 * getAgingAttributeModifier(30, 'STR') // 0.5 (from 25-30 milestone)
 */
export function getAgingAttributeModifier(
  age: number,
  attribute: string,
): number {
  let totalModifier = 0;

  // Sum modifiers from all milestones up to current age
  for (const milestone of AGING_MILESTONES) {
    if (age >= milestone.minAge) {
      // Include this milestone if we've reached it
      totalModifier += milestone.attributeModifiers[attribute] ?? 0;
    }
    if (age <= milestone.maxAge) {
      // Stop once we've passed the current milestone
      break;
    }
  }

  return totalModifier;
}

/**
 * Calculates age from birth date and current date.
 *
 * @param birthDate - Birth date (ISO 8601 string or Date)
 * @param currentDate - Current date (ISO 8601 string or Date)
 * @returns Age in years
 *
 * @example
 * calculateAge('1990-01-15', '2025-01-26') // 35
 * calculateAge('1990-01-15', '2025-01-14') // 34
 */
export function calculateAge(
  birthDate: string | Date,
  currentDate: string | Date,
): number {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const current =
    typeof currentDate === 'string' ? new Date(currentDate) : currentDate;

  let age = current.getFullYear() - birth.getFullYear();

  // Adjust if birthday hasn't occurred yet this year
  const birthMonth = birth.getMonth();
  const birthDay = birth.getDate();
  const currentMonth = current.getMonth();
  const currentDay = current.getDate();

  if (
    currentMonth < birthMonth ||
    (currentMonth === birthMonth && currentDay < birthDay)
  ) {
    age--;
  }

  return age;
}

/**
 * Checks if today is a person's birthday.
 *
 * Compares month and day only (ignores year).
 *
 * @param birthDate - Birth date (ISO 8601 string or Date)
 * @param currentDate - Current date (ISO 8601 string or Date)
 * @returns true if it's the person's birthday
 *
 * @example
 * isBirthday('1990-01-15', '2025-01-15') // true
 * isBirthday('1990-01-15', '2025-01-16') // false
 */
export function isBirthday(
  birthDate: string | Date,
  currentDate: string | Date,
): boolean {
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  const current =
    typeof currentDate === 'string' ? new Date(currentDate) : currentDate;

  return (
    birth.getMonth() === current.getMonth() &&
    birth.getDate() === current.getDate()
  );
}

/**
 * Applies aging attribute modifiers to a person.
 *
 * Calculates cumulative modifiers from all milestones up to the current age
 * and applies them to the person's attributes.
 *
 * @param person - The person to apply modifiers to
 * @param milestone - The milestone being entered
 * @returns A new person with updated attributes
 *
 * @example
 * const aged = applyAgingModifiers(person, milestone);
 * // person.attributes.STR = 5, aged.attributes.STR = 4 (if modifier is -1.0)
 */
export function applyAgingModifiers(
  person: IPerson,
  milestone: IAgingMilestone,
): IPerson {
  // Calculate age from milestone
  const age = milestone.minAge;

  // Calculate cumulative modifiers for all attributes
  const modifiedAttributes = {
    ...person.attributes,
  };

  // Apply cumulative modifiers for each attribute
  const attributeNames = [
    'STR',
    'BOD',
    'DEX',
    'REF',
    'INT',
    'WIL',
    'CHA',
    'Edge',
  ];

  for (const attr of attributeNames) {
    const modifier = getAgingAttributeModifier(age, attr);
    if (modifier !== 0) {
      modifiedAttributes[attr as keyof typeof modifiedAttributes] =
        (modifiedAttributes[attr as keyof typeof modifiedAttributes] ?? 0) +
        modifier;
    }
  }

  return {
    ...person,
    attributes: modifiedAttributes,
  };
}

/**
 * Processes aging for a person on their birthday.
 *
 * Applies attribute modifiers and traits when crossing into a new milestone.
 * Only applies effects if:
 * - useAgingEffects is true in campaign options
 * - It's the person's birthday
 * - They're crossing into a new milestone (label changed from previous year)
 *
 * Glass Jaw is not applied if person has Toughness trait.
 * Slow Learner is not applied if person has Fast Learner trait.
 *
 * @param person - The person to age
 * @param currentDate - Current date (ISO 8601 string or Date)
 * @param options - Campaign options
 * @returns Object with updated person and aging events
 *
 * @example
 * const result = processAging(person, '2025-01-15', options);
 * // result.updatedPerson has new attributes and traits
 * // result.events contains aging event if milestone was crossed
 */
export function processAging(
  person: IPerson,
  currentDate: string | Date,
  options: ICampaignOptions,
): { updatedPerson: IPerson; events: IAgingEvent[] } {
  // Skip if aging effects are disabled
  if (!options.useAgingEffects) {
    return { updatedPerson: person, events: [] };
  }

  // Skip if no birth date
  if (!person.birthDate) {
    return { updatedPerson: person, events: [] };
  }

  // Skip if not birthday
  if (!isBirthday(person.birthDate, currentDate)) {
    return { updatedPerson: person, events: [] };
  }

  // Calculate current and previous age
  const age = calculateAge(person.birthDate, currentDate);
  const milestone = getMilestoneForAge(age);
  const previousMilestone = getMilestoneForAge(age - 1);

  // Only apply if crossing into new milestone
  if (milestone.label === previousMilestone.label) {
    return { updatedPerson: person, events: [] };
  }

  // Apply attribute modifiers
  let updated = applyAgingModifiers(person, milestone);

  // Apply Glass Jaw at age 61+ (unless has Toughness)
  if (
    milestone.appliesGlassJaw &&
    !person.traits?.toughness &&
    !person.traits?.glassJaw
  ) {
    updated = {
      ...updated,
      traits: { ...updated.traits, glassJaw: true },
    };
  }

  // Apply Slow Learner at age 61+ (unless has Fast Learner)
  if (
    milestone.appliesSlowLearner &&
    !person.traits?.fastLearner &&
    !person.traits?.slowLearner
  ) {
    updated = {
      ...updated,
      traits: { ...updated.traits, slowLearner: true },
    };
  }

  return {
    updatedPerson: updated,
    events: [{ type: 'aging', personId: person.id, milestone, age }],
  };
}
