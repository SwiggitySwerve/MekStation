/**
 * Infantry Damage Divisor Table
 *
 * Per TW / TechManual "Damage Vs. Infantry" rules: incoming weapon damage is
 * multiplied by a category-specific anti-infantry factor before it is
 * converted to trooper casualties. Flamer / MG / Burst-fire weapons double
 * damage; Inferno rounds apply doubled damage as well; most mech-scale
 * ballistic / energy weapons apply at ×1; a few niche categories attenuate.
 *
 * The lookup is keyed by a short, stable weapon-category string so callers do
 * not have to import the whole equipment catalog. `classifyInfantryWeaponCategory`
 * is a best-effort heuristic for the common weapon names / types but is
 * intentionally conservative — when in doubt it returns `'other'` which
 * resolves to a ×1 multiplier.
 *
 * @spec openspec/changes/add-infantry-combat-behavior/specs/combat-resolution/spec.md
 *       #requirement Infantry Damage Divisor
 * @spec openspec/changes/add-infantry-combat-behavior/tasks.md §3
 */

// ============================================================================
// Weapon categories
// ============================================================================

/**
 * Weapon category tag used by `infantryDamageMultiplier`.
 *
 *  - `flamer`        — any flamer variant (×2)
 *  - `mg`            — any machine gun or rifle burst (×2)
 *  - `burst_fire`    — weapons with the Burst-Fire quirk (×1.5)
 *  - `inferno`       — Inferno SRM rounds (×2)
 *  - `explosion`     — area explosions (grenades, bombs) (×2)
 *  - `ballistic`     — autocannon / Gauss / LB-X slug / rifle (×1)
 *  - `energy`        — laser / PPC / plasma (×1)
 *  - `missile`       — generic LRM / SRM missile damage (×1)
 *  - `other`         — fallback (×1)
 */
export type InfantryWeaponCategory =
  | 'flamer'
  | 'mg'
  | 'burst_fire'
  | 'inferno'
  | 'explosion'
  | 'ballistic'
  | 'energy'
  | 'missile'
  | 'other';

// ============================================================================
// Lookup table
// ============================================================================

/**
 * Raw multipliers per category. Callers call `infantryDamageMultiplier` rather
 * than hitting this table directly.
 */
const ANTI_INFANTRY_MULTIPLIER: Readonly<
  Record<InfantryWeaponCategory, number>
> = Object.freeze({
  flamer: 2,
  mg: 2,
  burst_fire: 1.5,
  inferno: 2,
  explosion: 2,
  ballistic: 1,
  energy: 1,
  missile: 1,
  other: 1,
});

/**
 * Return the anti-infantry damage multiplier for a given weapon category.
 * Unknown categories resolve to 1 (no amplification, no attenuation).
 */
export function infantryDamageMultiplier(
  category: InfantryWeaponCategory,
): number {
  return ANTI_INFANTRY_MULTIPLIER[category] ?? 1;
}

const INFANTRY_WEAPON_CATEGORY_PATTERNS: readonly {
  readonly category: InfantryWeaponCategory;
  readonly matches: readonly string[];
}[] = [
  { category: 'inferno', matches: ['inferno'] },
  { category: 'flamer', matches: ['flamer'] },
  { category: 'mg', matches: ['machine gun', 'machinegun'] },
  {
    category: 'ballistic',
    matches: [
      'gauss',
      'ac/',
      'autocannon',
      'lb ',
      'lb-',
      'ultra ac',
      'rotary ac',
      'rifle',
    ],
  },
  { category: 'energy', matches: ['laser', 'ppc', 'plasma'] },
  {
    category: 'missile',
    matches: ['lrm', 'srm', 'streak', 'mrm', 'atm', 'mml'],
  },
];

// ============================================================================
// Heuristic classifier (optional convenience for callers with a name / type)
// ============================================================================

/**
 * Best-effort classification of a weapon by its lowercase name or type tag.
 * This is a shortcut for callers who do not already know the category; it is
 * NOT exhaustive — uncommon / homebrew weapons resolve to `'other'`.
 *
 * Accepts the weapon *name* OR an explicit `type` string (e.g. 'laser', 'ac').
 */
export function classifyInfantryWeaponCategory(
  weaponNameOrType: string,
): InfantryWeaponCategory {
  const key = weaponNameOrType.toLowerCase();
  if (key === 'mg') {
    return 'mg';
  }

  return (
    INFANTRY_WEAPON_CATEGORY_PATTERNS.find(({ matches }) =>
      matches.some((pattern) => key.includes(pattern)),
    )?.category ?? 'other'
  );
}

// ============================================================================
// Effective damage computation
// ============================================================================

/**
 * Apply the anti-infantry multiplier to a raw damage value.
 *
 * Returns `raw × multiplier(category)` — the caller may then divide by trooper
 * resilience / apply flak reduction to turn the result into casualties.
 */
export function computeEffectiveInfantryDamage(
  rawDamage: number,
  category: InfantryWeaponCategory,
): number {
  if (rawDamage <= 0) return 0;
  return rawDamage * infantryDamageMultiplier(category);
}
