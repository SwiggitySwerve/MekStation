/**
 * Infantry Cover + Terrain To-Hit Modifiers
 *
 * When infantry is the TARGET of an attack, cover terrain and hull-down
 * posture make them harder to hit. Per TW "Infantry in Cover":
 *
 *   Light woods          → +1 to attacker
 *   Light building       → +2
 *   Heavy building       → +3
 *   Hardened building    → +4
 *   Hull-down terrain    → +1
 *
 * Modifiers stack (woods + hull-down = +2). Cover never reduces the base
 * to-hit below 2.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §10 (Cover and Terrain Modifiers)
 */

// ============================================================================
// Cover descriptor
// ============================================================================

/**
 * Terrain / cover tag for the target infantry hex.
 */
export enum InfantryCoverType {
  NONE = 'none',
  WOODS_LIGHT = 'woods_light',
  WOODS_HEAVY = 'woods_heavy',
  BUILDING_LIGHT = 'building_light',
  BUILDING_HEAVY = 'building_heavy',
  BUILDING_HARDENED = 'building_hardened',
  HULL_DOWN = 'hull_down',
}

// ============================================================================
// Per-cover modifier table
// ============================================================================

const COVER_MODIFIER: Readonly<Record<InfantryCoverType, number>> =
  Object.freeze({
    [InfantryCoverType.NONE]: 0,
    [InfantryCoverType.WOODS_LIGHT]: 1,
    [InfantryCoverType.WOODS_HEAVY]: 1,
    [InfantryCoverType.BUILDING_LIGHT]: 2,
    [InfantryCoverType.BUILDING_HEAVY]: 3,
    [InfantryCoverType.BUILDING_HARDENED]: 4,
    [InfantryCoverType.HULL_DOWN]: 1,
  });

/**
 * Return the to-hit modifier contributed by a single cover tag.
 */
export function infantryCoverModifier(cover: InfantryCoverType): number {
  return COVER_MODIFIER[cover] ?? 0;
}

// ============================================================================
// Combined modifier helper
// ============================================================================

/**
 * Sum the to-hit modifiers for a list of active cover tags (e.g. woods +
 * hull-down). Caller decides which tags apply based on hex geometry.
 */
export function sumInfantryCoverModifiers(
  covers: readonly InfantryCoverType[],
): number {
  let total = 0;
  for (const c of covers) total += infantryCoverModifier(c);
  return total;
}
