/**
 * Core attributes for a character in the MekStation campaign system.
 *
 * Attributes represent the fundamental capabilities of a character, ranging from 1-10
 * (except Edge which ranges from 0-10). Each attribute contributes to skill checks and
 * other mechanical calculations through the attribute modifier system.
 *
 * @see getAttributeModifier
 */
export interface IAttributes {
  /** Strength (STR): Physical power and muscle. Range: 1-10 */
  readonly STR: number;

  /** Body (BOD): Overall fitness and physical endurance. Range: 1-10 */
  readonly BOD: number;

  /** Reflexes (REF): Reaction speed and agility. Range: 1-10 */
  readonly REF: number;

  /** Dexterity (DEX): Fine motor skills and hand-eye coordination. Range: 1-10 */
  readonly DEX: number;

  /** Intelligence (INT): Cognitive abilities and reasoning capacity. Range: 1-10 */
  readonly INT: number;

  /** Willpower (WIL): Mental determination and perseverance. Range: 1-10 */
  readonly WIL: number;

  /** Charisma (CHA): Social skills and personal magnetism. Range: 1-10 */
  readonly CHA: number;

  /** Edge (EDG): Luck and special abilities. Range: 0-10 */
  readonly Edge: number;
}

/**
 * Calculates the modifier for an attribute value.
 *
 * The modifier is derived from the attribute value using the formula: (value - 5).
 * This produces a range of -4 to +5 for attribute values 1-10.
 *
 * Mapping:
 * - 1 → -4
 * - 2 → -3
 * - 3 → -2
 * - 4 → -1
 * - 5 → 0
 * - 6 → +1
 * - 7 → +2
 * - 8 → +3
 * - 9 → +4
 * - 10 → +5
 *
 * @param value - The attribute value (1-10)
 * @returns The attribute modifier (-4 to +5)
 * @throws Error if value is outside the valid range (1-10)
 *
 * @example
 * getAttributeModifier(5) // returns 0
 * getAttributeModifier(8) // returns 3
 * getAttributeModifier(2) // returns -3
 */
export function getAttributeModifier(value: number): number {
  if (value < 1 || value > 10) {
    throw new Error(
      `Invalid attribute value: ${value}. Attribute values must be between 1 and 10.`,
    );
  }

  return value - 5;
}
