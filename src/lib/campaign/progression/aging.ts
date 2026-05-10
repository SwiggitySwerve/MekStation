/**
 * Aging System - Personnel attribute decay and trait application
 *
 * Implements age-based attribute modifiers and automatic trait application
 * for personnel aging through defined milestones. Modifiers are cumulative
 * across milestones and only applied on birthdays when crossing milestone boundaries.
 *
 * All mutating functions use (entry: ICampaignRosterEntry, pilot: IPilot | null)
 * and return delta objects rather than mutated entities.
 * NPC rule: if pilot === null or pilot has no birthDate, return empty delta.
 *
 * @module campaign/progression/aging
 */

import type { ICampaignOptions } from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type {
  IAgingDelta,
  IAgingMilestone,
} from '@/types/campaign/progression/progressionTypes';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

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
 * Calculates the attribute changes for a given aging milestone.
 *
 * Returns a map of attribute name → cumulative modifier value for all attributes
 * that have a non-zero modifier at the given age. Excludes zero-value entries
 * to keep the delta compact.
 *
 * @param age - The age at the milestone boundary
 * @returns Map of attribute changes (empty if no non-zero modifiers)
 */
function computeAttributeChanges(age: number): Record<string, number> {
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
  const changes: Record<string, number> = {};

  for (const attr of attributeNames) {
    const modifier = getAgingAttributeModifier(age, attr);
    if (modifier !== 0) {
      changes[attr] = modifier;
    }
  }

  return changes;
}

/**
 * Processes aging for a pilot on their birthday.
 *
 * Returns an IAgingDelta describing the changes to apply — does NOT mutate any entity.
 * The caller (PR3) applies vault.attributeChanges and roster.traitsDelta atomically.
 *
 * NPC rule: if pilot === null or pilot has no birthDate, return empty delta.
 *
 * Only applies effects if:
 * - useAgingEffects is true in campaign options
 * - pilot has a birthDate
 * - It's the pilot's birthday
 * - They're crossing into a new milestone (label changed from previous year)
 *
 * Glass Jaw is not applied if entry has Toughness trait.
 * Slow Learner is not applied if entry has Fast Learner trait.
 *
 * @param entry - The roster entry (source for trait checks)
 * @param pilot - The vault pilot (null for NPCs — returns empty delta)
 * @param currentDate - Current date (ISO 8601 string or Date)
 * @param options - Campaign options
 * @returns IAgingDelta describing vault and roster changes
 *
 * @example
 * const delta = processAging(entry, pilot, '3025-01-15', options);
 * if (delta.vault || delta.roster) {
 *   // commit delta to store
 * }
 */
export function processAging(
  entry: ICampaignRosterEntry,
  pilot: IPilot | null,
  currentDate: string | Date,
  options: ICampaignOptions,
): IAgingDelta {
  const empty: IAgingDelta = { vault: null, roster: null, events: [] };

  // NPC rule: skip
  if (pilot === null) {
    return empty;
  }

  // Skip if aging effects are disabled
  if (!options.useAgingEffects) {
    return empty;
  }

  // Skip if no birth date on the vault pilot
  if (!pilot.birthDate) {
    return empty;
  }

  // Skip if not birthday
  if (!isBirthday(pilot.birthDate, currentDate)) {
    return empty;
  }

  // Calculate current and previous age
  const age = calculateAge(pilot.birthDate, currentDate);
  const milestone = getMilestoneForAge(age);
  const previousMilestone = getMilestoneForAge(age - 1);

  // Only apply if crossing into new milestone
  if (milestone.label === previousMilestone.label) {
    return empty;
  }

  // Build attribute changes delta (vault)
  const attributeChanges = computeAttributeChanges(age);
  const hasAttributeChanges = Object.keys(attributeChanges).length > 0;

  // Build traits delta (roster) — only include new trait flags.
  // Declared as a plain mutable object to allow property assignment;
  // structurally compatible with the persisted traits shape (readonly on the
  // type is an interface contract, not an object seal).
  const traitsDelta: { glassJaw?: boolean; slowLearner?: boolean } = {};

  // Apply Glass Jaw at age 61+ (unless has Toughness or already has Glass Jaw)
  if (
    milestone.appliesGlassJaw &&
    !entry.traits?.toughness &&
    !entry.traits?.glassJaw
  ) {
    traitsDelta.glassJaw = true;
  }

  // Apply Slow Learner at age 61+ (unless has Fast Learner or already has Slow Learner)
  if (
    milestone.appliesSlowLearner &&
    !entry.traits?.fastLearner &&
    !entry.traits?.slowLearner
  ) {
    traitsDelta.slowLearner = true;
  }

  const hasTraitChanges = Object.keys(traitsDelta).length > 0;

  return {
    vault: hasAttributeChanges
      ? { pilotId: entry.pilotId, attributeChanges }
      : null,
    roster: hasTraitChanges ? { pilotId: entry.pilotId, traitsDelta } : null,
    events: [{ type: 'aging', personId: entry.pilotId, milestone, age }],
  };
}
