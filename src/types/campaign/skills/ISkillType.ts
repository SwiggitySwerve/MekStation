import { IAttributes } from './IAttributes';
import { IEntity } from '@/types/core/IEntity';

/**
 * Metadata definition for a skill type in the MekStation campaign system.
 *
 * A skill type defines the core properties of a skill category, including its name,
 * description, difficulty, progression costs, and which attribute it's linked to.
 * Individual character skills reference a skill type to inherit these properties.
 *
 * Extends IEntity for universal identification (id + name).
 *
 * @example
 * const gunnerySkillType: ISkillType = {
 *   id: 'gunnery',
 *   name: 'Gunnery',
 *   description: 'Ability to aim and fire ballistic weapons',
 *   targetNumber: 4,
 *   costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
 *   linkedAttribute: 'DEX'
 * };
 */
export interface ISkillType extends IEntity {
  /**
   * Unique identifier for this skill type.
   *
   * Used to reference the skill type from skill instances and skill definitions.
   * Should be lowercase with hyphens (e.g., "gunnery", "piloting-mech", "first-aid").
   *
   * @example "gunnery"
   * @example "piloting-mech"
   */
  readonly id: string;

  /**
   * Display name of the skill type.
   *
   * Human-readable name shown in UI and character sheets.
   *
   * @example "Gunnery"
   * @example "Piloting (Mech)"
   */
  readonly name: string;

  /**
   * Description of what this skill represents and what it's used for.
   *
   * Explains the mechanical purpose and narrative context of the skill.
   *
   * @example "Ability to aim and fire ballistic weapons in combat"
   */
  readonly description: string;

  /**
   * Base target number for skill checks using this skill.
   *
   * The target number is the difficulty threshold for skill checks. A character
   * rolls 2d6 and adds their skill rating plus the linked attribute modifier.
   * If the total meets or exceeds the target number, the check succeeds.
   *
   * Typical range: 2-6 (lower is easier, higher is harder)
   *
   * @example 4 // Standard difficulty
   * @example 2 // Easy skill
   * @example 6 // Very difficult skill
   */
  readonly targetNumber: number;

  /**
   * XP cost progression for each skill level.
   *
   * Array of 10 elements where index N represents the XP cost to advance from
   * level N to level N+1. For example:
   * - costs[0] = XP to reach level 1 from level 0
   * - costs[1] = XP to reach level 2 from level 1
   * - costs[9] = XP to reach level 10 from level 9
   *
   * Costs typically increase with level to reflect increasing difficulty.
   *
   * @example [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
   * @example [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
   */
  readonly costs: number[];

  /**
   * The attribute that modifies this skill.
   *
   * When making a skill check, the character adds the modifier of this attribute
   * to their skill rating. This creates a mechanical link between attributes and
   * skills, making certain attributes more valuable for certain skills.
   *
   * Must be a valid key from the IAttributes interface (STR, BOD, REF, DEX, INT, WIL, CHA, or Edge).
   *
   * @example "DEX" // Gunnery is modified by Dexterity
   * @example "INT" // Hacking is modified by Intelligence
   * @example "CHA" // Negotiation is modified by Charisma
   */
  readonly linkedAttribute: keyof IAttributes;
}
