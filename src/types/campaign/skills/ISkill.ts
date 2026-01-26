import { ISkillType } from './ISkillType';
import { IAttributes, getAttributeModifier } from './IAttributes';

/**
 * Represents a character's proficiency in a specific skill.
 *
 * A skill combines a skill type (which defines the skill's properties) with
 * a character's personal progression in that skill, including their level,
 * any bonuses, and experience progress toward the next level.
 *
 * @example
 * const gunnerySkill: ISkill = {
 *   level: 5,
 *   bonus: 1,
 *   xpProgress: 250,
 *   typeId: 'gunnery'
 * };
 */
export interface ISkill {
  /**
   * The character's proficiency level in this skill.
   *
   * Range: 0-10
   * - 0: Untrained (no ranks purchased)
   * - 1-10: Trained levels
   *
   * @example 5 // Competent level
   * @example 0 // Untrained
   * @example 10 // Master level
   */
  readonly level: number;

  /**
   * Additional modifier applied to skill checks.
   *
   * Can be positive (bonus) or negative (penalty). Applied after level
   * and attribute modifier are calculated.
   *
   * @example 1 // +1 bonus
   * @example -2 // -2 penalty
   * @example 0 // No bonus or penalty
   */
  readonly bonus: number;

  /**
   * Experience points accumulated toward the next skill level.
   *
   * Ranges from 0 to the XP cost for the next level (defined in ISkillType.costs).
   * When xpProgress reaches the cost threshold, the skill levels up and xpProgress resets.
   *
   * @example 250 // 250 XP toward next level
   * @example 0 // Just leveled up or newly trained
   */
  readonly xpProgress: number;

  /**
   * Reference to the skill type that defines this skill's properties.
   *
   * Must match an ISkillType.id value. The skill type provides the skill's
   * name, description, target number, XP costs, and linked attribute.
   *
   * @example "gunnery"
   * @example "piloting-mech"
   */
  readonly typeId: string;
}

/**
 * Calculates the effective value of a skill for skill checks.
 *
 * The skill value combines the character's skill level, any bonuses or penalties,
 * and the modifier from the linked attribute. This total is compared against the
 * skill type's target number to determine success on skill checks.
 *
 * Formula: `level + bonus + attributeModifier`
 *
 * Where attributeModifier is calculated from the attribute linked to the skill type
 * using the standard attribute modifier formula (attribute - 5).
 *
 * @param skill - The skill instance to evaluate
 * @param skillType - The skill type that defines the skill's properties
 * @param attributes - The character's attributes
 *
 * @returns The effective skill value for skill checks
 *
 * @throws Error if skill.level is outside the valid range (0-10)
 * @throws Error if the linked attribute is not found in the attributes object
 *
 * @example
 * const skill: ISkill = { level: 5, bonus: 1, xpProgress: 0, typeId: 'gunnery' };
 * const skillType: ISkillType = {
 *   id: 'gunnery',
 *   name: 'Gunnery',
 *   description: 'Ability to aim and fire ballistic weapons',
 *   targetNumber: 4,
 *   costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
 *   linkedAttribute: 'DEX'
 * };
 * const attributes: IAttributes = {
 *   STR: 5, BOD: 5, REF: 5, DEX: 7, INT: 5, WIL: 5, CHA: 5, Edge: 0
 * };
 *
 * const skillValue = getSkillValue(skill, skillType, attributes);
 * // skillValue = 5 (level) + 1 (bonus) + 2 (DEX modifier: 7-5) = 8
 */
export function getSkillValue(
  skill: ISkill,
  skillType: ISkillType,
  attributes: IAttributes
): number {
  // Validate skill level
  if (skill.level < 0 || skill.level > 10) {
    throw new Error(
      `Invalid skill level: ${skill.level}. Skill level must be between 0 and 10.`
    );
  }

  // Get the linked attribute value
  const linkedAttributeValue = attributes[skillType.linkedAttribute];

  // Validate that the attribute exists and is a number
  if (typeof linkedAttributeValue !== 'number') {
    throw new Error(
      `Invalid linked attribute: ${skillType.linkedAttribute}. Attribute not found or invalid.`
    );
  }

  // Calculate attribute modifier
  const attributeModifier = getAttributeModifier(linkedAttributeValue);

  // Calculate and return skill value
  return skill.level + skill.bonus + attributeModifier;
}
