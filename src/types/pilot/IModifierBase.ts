/**
 * Base interface for modifier parameters.
 * Captures common patterns across different modifier types.
 *
 * @example
 * // To-hit modifier extends base
 * interface IToHitModifierParams extends IModifierBase {
 *   readonly range?: 'short' | 'medium' | 'long';
 * }
 *
 * @example
 * // Damage modifier uses multiplier instead of modifier
 * interface IDamageModifierParams extends IWeaponFilterable {
 *   readonly multiplier?: number;
 *   readonly clusterColumnShift?: number;
 * }
 */
export interface IModifierBase {
  /** Numeric modifier value (negative typically means "better") */
  readonly modifier?: number;

  /** Condition when this modifier applies */
  readonly condition?: string;
}

/**
 * Interface for modifiers that can filter by weapon properties.
 * Extends IModifierBase with weapon-specific filters.
 *
 * @example
 * // To-hit modifier with weapon filtering
 * interface IToHitModifierParams extends IWeaponFilterable {
 *   readonly range?: 'short' | 'medium' | 'long';
 * }
 *
 * @example
 * // Damage modifier with weapon filtering
 * interface IDamageModifierParams extends IWeaponFilterable {
 *   readonly multiplier?: number;
 *   readonly clusterColumnShift?: number;
 * }
 */
export interface IWeaponFilterable extends IModifierBase {
  /** Weapon type filter (e.g., 'selected', specific weapon name) */
  readonly weaponType?: string;

  /** Weapon category filter (e.g., 'direct_fire', 'missile', 'ballistic', 'energy') */
  readonly weaponCategory?: string;
}
