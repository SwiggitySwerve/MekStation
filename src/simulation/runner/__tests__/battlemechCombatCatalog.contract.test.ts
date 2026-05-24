/**
 * Catalog-driven BattleMech combat validation anchors.
 *
 * This is the first lane of the larger combat validation suite: every official
 * ranged weapon and ammo catalog entry must be visible to combat-facing tests,
 * while physical weapons and missing mechanics are tracked as explicit gaps.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { buildUtilityCommands } from '@/components/gameplay/TacticalActionDock/commands/utilityCommands';
import { getWeaponData } from '@/engine/adapters/CompendiumAdapter';
import { WEAPON_DATABASE } from '@/engine/adapters/CompendiumWeaponData';
import { CANONICAL_SPA_CATALOG, getSPADefinition } from '@/lib/spa';
import {
  getLimitationPatternCategory,
  isKnownLimitation,
  type IViolation,
} from '@/simulation/core/knownLimitations';
import {
  MOVEMENT_ENHANCEMENT_DEFINITIONS,
  MovementEnhancementType,
} from '@/types/construction/MovementEnhancement';
import {
  GameEventType,
  GamePhase,
  GameSide,
  GAME_INTENT_TYPES,
  PSRTrigger,
} from '@/types/gameplay';
import {
  AMMUNITION_CATALOG_FILES,
  ELECTRONICS_CATALOG_FILES,
  MISCELLANEOUS_CATALOG_FILES,
  WEAPON_CATALOG_FILES,
} from '@/utils/construction/equipmentBVCatalogData';
import { resolveAmmoBV } from '@/utils/construction/equipmentBVResolver';
import {
  consumeAmmo,
  getTotalAmmo,
  hasAmmoForWeapon,
  initializeAmmoState,
} from '@/utils/gameplay/ammoTracking';
import { createUnitEjectedEvent } from '@/utils/gameplay/gameEvents';
import { SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES } from '@/utils/gameplay/physicalAttacks/types';
import { QUIRK_CATALOG } from '@/utils/gameplay/quirkModifiers';
import { SPA_CATALOG } from '@/utils/gameplay/spaModifiers';
import {
  isAMS,
  isLBXAC,
  isNarc,
  isRotaryAC,
  isStreakSRM,
  isTAG,
  isUltraAC,
  verifyStreakBehavior,
} from '@/utils/gameplay/specialWeaponMechanics';

import officialIndex from '../../../../public/data/equipment/official/index.json';
import { selectWeaponMode } from '../../ai/AIWeaponModeSelector';
import { AMMUNITION_COMPATIBILITY_SUPPORT } from '../CombatAmmunitionSupport';
import { CANONICAL_SPA_COMBAT_SCOPE_SUPPORT } from '../CombatCanonicalSpaSupport';
import {
  CRITICAL_COMPONENT_COMBAT_SUPPORT,
  DAMAGE_RESOLUTION_COMBAT_SUPPORT,
  DESTRUCTION_CAUSE_COMBAT_SUPPORT,
  PILOT_DAMAGE_COMBAT_SUPPORT,
} from '../CombatDamageSupport';
import {
  PHYSICAL_WEAPON_COMBAT_SUPPORT,
  QUIRK_COMBAT_SUPPORT,
  SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT,
  SPA_COMBAT_SUPPORT,
  type ICombatFeatureSupportEntry,
} from '../CombatFeatureSupport';
import {
  ACTION_ELIGIBILITY_COMBAT_SUPPORT,
  PSR_RESOLUTION_COMBAT_SUPPORT,
  RUNNER_PSR_TRIGGER_COMBAT_SUPPORT,
} from '../CombatLifecycleSupport';
import { RUNNER_INTERACTIVE_PARITY_SUPPORT } from '../CombatParitySupport';
import {
  HEAT_RULE_COMBAT_SUPPORT,
  MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT,
  MOVEMENT_RULE_COMBAT_SUPPORT,
  PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT,
  RUNNER_RANGE_BRACKET_COMBAT_SUPPORT,
  RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COVERAGE,
} from '../CombatRuleSupport';
import { SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT } from '../CombatSpecialWeaponSupport';
import {
  resolveSpecialProjectileHit,
  shouldSpendAmmoAndHeatOnMiss,
} from '../phases/weaponAttackFiringModes';
import {
  createMinimalUnitState,
  toCatalogAIUnitState,
  toAIUnitState,
} from '../SimulationRunnerSupport';
import {
  buildWeaponLookupFromCatalogFiles,
  resolveCatalogDamage,
  toAIWeapon,
  type ICatalogWeaponStats,
} from '../UnitHydration';

interface ICatalogFile {
  readonly items?: readonly Record<string, unknown>[];
}

interface IAmmoCatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly variant?: string;
  readonly rulesLevel: string;
  readonly compatibleWeaponIds: readonly string[];
  readonly shotsPerTon: number;
  readonly battleValue: number;
  readonly isExplosive: boolean;
}

type AmmoCompatibilityGapClass =
  | 'battlemech-ammo-missing-compatible-weapon-refs'
  | 'duplicate-runtime-id'
  | 'non-battlemech-aerospace-capital-ammo'
  | 'non-battlemech-battle-armor'
  | 'non-battlemech-protomech'
  | 'nonstandard-empty-compatible-row'
  | 'unsupported-aquatic-torpedo-ammo'
  | 'unsupported-artillery-ammo';

type AmmoCompatibilitySupportId =
  | AmmoCompatibilityGapClass
  | 'battlemech-compatible-ammo';

function flattenItems(
  files: readonly ICatalogFile[],
): readonly Record<string, unknown>[] {
  return files.flatMap((file) => [...(file.items ?? [])]);
}

function isRangedWeapon(
  item: Record<string, unknown>,
): item is Record<string, unknown> & ICatalogWeaponStats {
  const ranges = item.ranges;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    (typeof item.damage === 'number' || typeof item.damage === 'string') &&
    typeof item.heat === 'number' &&
    !!ranges &&
    typeof ranges === 'object'
  );
}

function isPhysicalWeapon(item: Record<string, unknown>): boolean {
  return (
    typeof item.id === 'string' &&
    typeof item.type === 'string' &&
    typeof item.damageFormula === 'string' &&
    !('ranges' in item)
  );
}

function isAmmoEntry(
  item: Record<string, unknown>,
): item is Record<string, unknown> & IAmmoCatalogEntry {
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.category === 'string' &&
    typeof item.rulesLevel === 'string' &&
    Array.isArray(item.compatibleWeaponIds) &&
    item.compatibleWeaponIds.every((id) => typeof id === 'string') &&
    typeof item.shotsPerTon === 'number' &&
    typeof item.battleValue === 'number' &&
    typeof item.isExplosive === 'boolean'
  );
}

const weaponCatalogFiles = WEAPON_CATALOG_FILES as readonly ICatalogFile[];
const ammunitionCatalogFiles =
  AMMUNITION_CATALOG_FILES as readonly ICatalogFile[];
const electronicsCatalogFiles =
  ELECTRONICS_CATALOG_FILES as readonly ICatalogFile[];
const miscellaneousCatalogFiles =
  MISCELLANEOUS_CATALOG_FILES as readonly ICatalogFile[];
const allWeaponCatalogItems = flattenItems(weaponCatalogFiles);
const rangedWeaponItems = allWeaponCatalogItems.filter(isRangedWeapon);
const physicalWeaponItems = allWeaponCatalogItems.filter(isPhysicalWeapon);
const ammoItems = flattenItems(ammunitionCatalogFiles).filter(isAmmoEntry);
const electronicsItems = flattenItems(electronicsCatalogFiles);
const miscellaneousItems = flattenItems(miscellaneousCatalogFiles);
const weaponLookup = buildWeaponLookupFromCatalogFiles(weaponCatalogFiles);
const weaponCatalogIds = new Set(ids(allWeaponCatalogItems));

function itemText(item: Record<string, unknown>): string {
  return [
    item.id,
    item.name,
    item.subType,
    item.category,
    item.variant,
    item.rulesLevel,
    ...(Array.isArray(item.special) ? item.special : []),
  ]
    .filter((part): part is string => typeof part === 'string')
    .join(' ');
}

function ids(items: readonly Record<string, unknown>[]): readonly string[] {
  return items
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string')
    .sort();
}

function familyItems(pattern: RegExp): readonly Record<string, unknown>[] {
  return rangedWeaponItems.filter((item) => pattern.test(itemText(item)));
}

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function countBy<T extends string>(values: readonly T[]): Record<T, number> {
  return values.reduce(
    (counts, value) => ({
      ...counts,
      [value]: (counts[value] ?? 0) + 1,
    }),
    {} as Record<T, number>,
  );
}

function ammoCompatibilityGapClass(
  ammo: IAmmoCatalogEntry & Record<string, unknown>,
): AmmoCompatibilityGapClass | null {
  if (ammo.compatibleWeaponIds.length > 0) return null;

  const text = itemText(ammo).toLowerCase();
  if (weaponCatalogIds.has(ammo.id)) return 'duplicate-runtime-id';
  if (ammo.id.startsWith('ba-') || /\bbattle armor\b/i.test(text)) {
    return 'non-battlemech-battle-armor';
  }
  if (/\bprotomech\b/i.test(text)) return 'non-battlemech-protomech';
  if (
    ammo.category === 'Artillery' ||
    /\barrow|long tom|sniper|thumper/i.test(text)
  ) {
    return 'unsupported-artillery-ammo';
  }
  if (/\btorpedo\b|\blrtorpedo\b|\bsrtorpedo\b/i.test(text)) {
    return 'unsupported-aquatic-torpedo-ammo';
  }
  if (
    /\bnac\b|\bnaval\b|\bcapital\b|\btele-missile\b|\bkiller whale\b|\bwhite shark\b|\bbarracuda\b|\bkraken\b|\bscreen launcher\b/i.test(
      text,
    )
  ) {
    return 'non-battlemech-aerospace-capital-ammo';
  }
  if (ammo.rulesLevel === 'STANDARD' || ammo.rulesLevel === 'ADVANCED') {
    return 'battlemech-ammo-missing-compatible-weapon-refs';
  }
  return 'nonstandard-empty-compatible-row';
}

function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.level !== 'integrated' &&
        (entry.gap === undefined || entry.gap.length === 0),
    )
    .map((entry) => entry.id)
    .sort();
}

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function zeroDamageClassification(
  item: Record<string, unknown>,
):
  | 'defensive-system'
  | 'standard-special-effect'
  | 'nonstandard-data-gap'
  | null {
  if (item.damage !== 0) return null;

  const rulesLevel = typeof item.rulesLevel === 'string' ? item.rulesLevel : '';
  const text = itemText(item);
  if (/Anti-Missile System/i.test(text) && /Defensive/i.test(text)) {
    return 'defensive-system';
  }
  if (rulesLevel === 'STANDARD' && /\b(?:i?NARC|Plasma)\b/i.test(text)) {
    return 'standard-special-effect';
  }
  if (rulesLevel !== 'STANDARD') {
    return 'nonstandard-data-gap';
  }
  return null;
}

describe('BattleMech combat catalog validation lane', () => {
  it('covers every official ranged weapon, physical weapon, and ammo entry', () => {
    expect(rangedWeaponItems).toHaveLength(officialIndex.totalItems.weapons);
    expect(ammoItems).toHaveLength(officialIndex.totalItems.ammunition);
    expect(physicalWeaponItems).toHaveLength(9);

    const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
    const physicalIds = new Set(physicalWeaponItems.map((item) => item.id));
    const ammoIds = new Set(ammoItems.map((item) => item.id));

    expect(rangedIds.size).toBe(rangedWeaponItems.length);
    expect(physicalIds.size).toBe(physicalWeaponItems.length);
    expect(ammoIds.size).toBe(ammoItems.length);
  });

  it('maps every official ranged weapon into a non-synthetic AI weapon', () => {
    const failures: string[] = [];

    for (const item of rangedWeaponItems) {
      const catalogWeapon = weaponLookup(item.id);
      if (!catalogWeapon) {
        failures.push(`${item.id}: missing from combat weapon lookup`);
        continue;
      }

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      if (aiWeapon.name === 'Medium Laser' && item.id !== 'medium-laser') {
        failures.push(`${item.id}: mapped to synthetic medium laser`);
      }
      if (!Number.isFinite(aiWeapon.damage)) {
        failures.push(`${item.id}: non-finite damage ${aiWeapon.damage}`);
      }
      if (typeof item.damage === 'number' && aiWeapon.damage !== item.damage) {
        failures.push(
          `${item.id}: numeric damage drift ${item.damage} -> ${aiWeapon.damage}`,
        );
      }
      if (typeof item.damage === 'string' && aiWeapon.damage <= 0) {
        failures.push(`${item.id}: parsed string damage to ${aiWeapon.damage}`);
      }
      if (typeof item.damage === 'number' && aiWeapon.damage <= 0) {
        const classification = zeroDamageClassification(item);
        if (!classification) {
          failures.push(`${item.id}: zero damage without explicit gap class`);
        }
      }
      if (!Number.isFinite(aiWeapon.heat) || aiWeapon.heat < 0) {
        failures.push(`${item.id}: invalid heat ${aiWeapon.heat}`);
      }
      if (
        catalogWeapon.ranges.minimum < 0 ||
        aiWeapon.shortRange > aiWeapon.mediumRange ||
        aiWeapon.mediumRange > aiWeapon.longRange
      ) {
        failures.push(`${item.id}: non-monotonic range brackets`);
      }
      if (aiWeapon.minRange !== catalogWeapon.ranges.minimum) {
        failures.push(
          `${item.id}: minimum range drift ${catalogWeapon.ranges.minimum} -> ${aiWeapon.minRange}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('keeps the static engine weapon database a legacy subset of the official ranged catalog', () => {
    const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
    const staticIds = Object.keys(WEAPON_DATABASE).sort();

    expect(staticIds.filter((id) => !rangedIds.has(id))).toEqual([]);
    expect(rangedIds.size).toBeGreaterThan(staticIds.length);
    expect(staticIds).not.toContain('uac-5');
    expect(staticIds).not.toContain('mml-9');
    expect(rangedIds.has('uac-5')).toBe(true);
    expect(rangedIds.has('mml-9')).toBe(true);
  });

  it('resolves every official ranged weapon through engine lookup without static fallback drift', () => {
    const failures: string[] = [];

    for (const item of rangedWeaponItems) {
      const weaponData = getWeaponData(item.id);
      if (!weaponData) {
        failures.push(`${item.id}: engine lookup returned undefined`);
        continue;
      }

      const expectedDamage = resolveCatalogDamage(item.damage, item.id);
      const expectedAmmoPerTon =
        typeof item.ammoPerTon === 'number' ? item.ammoPerTon : -1;

      if (weaponData.id !== item.id) {
        failures.push(
          `${item.id}: engine lookup id drifted to ${weaponData.id}`,
        );
      }
      if (weaponData.damage !== expectedDamage) {
        failures.push(
          `${item.id}: engine damage drift ${expectedDamage} -> ${weaponData.damage}`,
        );
      }
      if (weaponData.heat !== item.heat) {
        failures.push(
          `${item.id}: engine heat drift ${item.heat} -> ${weaponData.heat}`,
        );
      }
      if (weaponData.minRange !== item.ranges.minimum) {
        failures.push(
          `${item.id}: engine min range drift ${item.ranges.minimum} -> ${weaponData.minRange}`,
        );
      }
      if (weaponData.shortRange !== item.ranges.short) {
        failures.push(
          `${item.id}: engine short range drift ${item.ranges.short} -> ${weaponData.shortRange}`,
        );
      }
      if (weaponData.mediumRange !== item.ranges.medium) {
        failures.push(
          `${item.id}: engine medium range drift ${item.ranges.medium} -> ${weaponData.mediumRange}`,
        );
      }
      if (weaponData.longRange !== item.ranges.long) {
        failures.push(
          `${item.id}: engine long range drift ${item.ranges.long} -> ${weaponData.longRange}`,
        );
      }
      if (weaponData.ammoPerTon !== expectedAmmoPerTon) {
        failures.push(
          `${item.id}: engine ammo-per-ton drift ${expectedAmmoPerTon} -> ${weaponData.ammoPerTon}`,
        );
      }
    }

    expect(failures).toEqual([]);
  });

  it('classifies zero-damage official ranged weapons as explicit non-damage behavior or data gaps', () => {
    const zeroDamageItems = rangedWeaponItems.filter(
      (item) => item.damage === 0,
    );
    const unclassified = zeroDamageItems
      .filter((item) => !zeroDamageClassification(item))
      .map((item) => item.id)
      .filter((id): id is string => typeof id === 'string')
      .sort();

    expect(zeroDamageItems).toHaveLength(279);
    expect(unclassified).toEqual([]);
    expect(
      ids(
        zeroDamageItems.filter(
          (item) => zeroDamageClassification(item) === 'defensive-system',
        ),
      ),
    ).toEqual(['ams', 'clan-ams', 'clan-laser-ams', 'laser-ams']);
    expect(
      ids(zeroDamageItems.filter((item) => item.rulesLevel === 'STANDARD')),
    ).toEqual([
      'ams',
      'clan-ams',
      'clan-narc',
      'clan-plasma-cannon',
      'inarc',
      'narc',
    ]);
  });

  it('keeps variable missile damage from mapping to zero', () => {
    expect(resolveCatalogDamage('1/missile', 'lrm-20')).toBe(20);
    expect(resolveCatalogDamage('2/missile', 'srm-6')).toBe(12);
    expect(resolveCatalogDamage('1-2/missile', 'mml-9')).toBe(18);
  });

  it('does not let AI unit conversion hide missing hydration with fallback weapons', () => {
    const unit = createMinimalUnitState('player-1', GameSide.Player, {
      q: 0,
      r: 0,
    });
    const hydrated = rangedWeaponItems.map((item, index) => {
      const catalogWeapon = weaponLookup(item.id);
      expect(catalogWeapon).not.toBeNull();
      return toAIWeapon(catalogWeapon as ICatalogWeaponStats, index);
    });
    const syntheticFallback = toAIUnitState(unit, []).weapons[0];

    expect(toCatalogAIUnitState(unit, hydrated).weapons).toEqual(hydrated);
    expect(toCatalogAIUnitState(unit, hydrated).weapons).toHaveLength(
      rangedWeaponItems.length,
    );
    expect(() => toCatalogAIUnitState(unit, [])).toThrow(
      'refusing synthetic Medium Laser fallback',
    );
    expect(toAIUnitState(unit, []).weapons).toHaveLength(1);
    expect(syntheticFallback.id).toBe('player-1-weapon-1');
    expect(syntheticFallback.name).toBe('Medium Laser');
    expect(hydrated.map((weapon) => weapon.id)).not.toContain(
      syntheticFallback.id,
    );
  });

  it('keeps ammunition compatibility references tied to official ranged weapons', () => {
    const rangedIds = new Set(rangedWeaponItems.map((item) => item.id));
    const missingRefs: string[] = [];

    for (const ammo of ammoItems) {
      for (const weaponId of ammo.compatibleWeaponIds) {
        if (!rangedIds.has(weaponId)) {
          missingRefs.push(`${ammo.id} -> ${weaponId}`);
        }
      }
    }

    expect(missingRefs).toEqual([]);
  });

  it('resolves every official non-duplicate ammo row through the equipment BV catalog', () => {
    const failures: string[] = [];

    for (const ammo of ammoItems) {
      const resolution = resolveAmmoBV(ammo.id);
      if (weaponCatalogIds.has(ammo.id)) {
        expect(ammoCompatibilityGapClass(ammo)).toBe('duplicate-runtime-id');
        continue;
      }

      if (!resolution.resolved) {
        failures.push(`${ammo.id}: did not resolve`);
        continue;
      }
      if (resolution.battleValue !== ammo.battleValue) {
        failures.push(
          `${ammo.id}: resolved BV ${resolution.battleValue} !== catalog BV ${ammo.battleValue}`,
        );
      }
      if (resolution.weaponType.length === 0) {
        failures.push(`${ammo.id}: resolved with empty weapon type`);
      }
      if (ammo.shotsPerTon <= 0) {
        failures.push(`${ammo.id}: invalid shotsPerTon ${ammo.shotsPerTon}`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('turns every compatible official ammo row into a consumable combat ammo bin', () => {
    const failures: string[] = [];

    for (const ammo of ammoItems) {
      for (const weaponId of ammo.compatibleWeaponIds) {
        const ammoState = initializeAmmoState([
          {
            binId: `${ammo.id}-${weaponId}-bin`,
            weaponType: weaponId,
            location: 'center_torso',
            maxRounds: ammo.shotsPerTon,
            damagePerRound: 1,
            isExplosive: ammo.isExplosive,
          },
        ]);

        if (!hasAmmoForWeapon(ammoState, weaponId)) {
          failures.push(`${ammo.id} -> ${weaponId}: not available to fire`);
          continue;
        }
        if (getTotalAmmo(ammoState, weaponId) !== ammo.shotsPerTon) {
          failures.push(`${ammo.id} -> ${weaponId}: total ammo mismatch`);
          continue;
        }

        const result = consumeAmmo(ammoState, 'catalog-test-unit', weaponId);
        if (!result?.success) {
          failures.push(`${ammo.id} -> ${weaponId}: could not consume`);
          continue;
        }
        if (result.event.roundsRemaining !== ammo.shotsPerTon - 1) {
          failures.push(
            `${ammo.id} -> ${weaponId}: remaining rounds ${result.event.roundsRemaining}`,
          );
        }
      }
    }

    expect(failures).toEqual([]);
  });

  it('classifies official ammo rows without compatible weapon refs as explicit gaps', () => {
    const ammoClasses: AmmoCompatibilitySupportId[] = ammoItems.map(
      (ammo) => ammoCompatibilityGapClass(ammo) ?? 'battlemech-compatible-ammo',
    );
    const gapClasses = ammoClasses.filter(
      (classification): classification is AmmoCompatibilityGapClass =>
        classification !== 'battlemech-compatible-ammo',
    );
    const ammoCompatibilitySupport: Record<
      AmmoCompatibilitySupportId,
      ICombatFeatureSupportEntry
    > = AMMUNITION_COMPATIBILITY_SUPPORT;
    const untrackedClasses = ammoClasses.filter(
      (classification, index) =>
        ammoClasses.indexOf(classification) === index &&
        ammoCompatibilitySupport[classification] === undefined,
    );

    expect(untrackedClasses).toEqual([]);
    expect(supportGaps(ammoCompatibilitySupport)).toEqual([]);
    expect(ammoCompatibilitySupport['battlemech-compatible-ammo'].level).toBe(
      'integrated',
    );
    expect(
      ammoCompatibilitySupport['battlemech-ammo-missing-compatible-weapon-refs']
        .level,
    ).toBe('helper-only');
    expect(countBy(gapClasses)).toEqual({
      'battlemech-ammo-missing-compatible-weapon-refs': 7,
      'duplicate-runtime-id': 12,
      'non-battlemech-aerospace-capital-ammo': 8,
      'non-battlemech-battle-armor': 17,
      'non-battlemech-protomech': 35,
      'nonstandard-empty-compatible-row': 143,
      'unsupported-aquatic-torpedo-ammo': 11,
      'unsupported-artillery-ammo': 9,
    });
    expect(supportIdsByLevel(ammoCompatibilitySupport, 'helper-only')).toEqual(
      [
        'battlemech-ammo-missing-compatible-weapon-refs',
        'non-battlemech-aerospace-capital-ammo',
        'non-battlemech-battle-armor',
        'non-battlemech-protomech',
        'nonstandard-empty-compatible-row',
        'unsupported-aquatic-torpedo-ammo',
        'unsupported-artillery-ammo',
      ].sort(),
    );
  });

  it('classifies every official special combat family in the catalog', () => {
    const ultraACs = familyItems(/\bUltra AC\b/i);
    const rotaryACs = familyItems(/\bRotary AC\b/i);
    const lbxACs = familyItems(/\bLB-X AC\b|\bLB \d+-X AC\b/i);
    const streakLaunchers = familyItems(/\bStreak\b/i);
    const mmlLaunchers = familyItems(/\bMML\b/i);
    const narcLaunchers = familyItems(/\bNARC\b|\biNARC\b|\bNarc\b/i);
    const amsSystems = familyItems(/\bAnti-Missile System\b|\bAMS\b/i);
    const tagDesignators = electronicsItems.filter((item) =>
      /\bTAG\b/i.test(itemText(item)),
    );
    const artemisFcs = miscellaneousItems.filter((item) =>
      /\bArtemis\b/i.test(itemText(item)),
    );

    expect(ultraACs).toHaveLength(8);
    expect(rotaryACs).toHaveLength(4);
    expect(lbxACs).toHaveLength(8);
    expect(streakLaunchers).toHaveLength(61);
    expect(mmlLaunchers).toHaveLength(4);
    expect(narcLaunchers).toHaveLength(10);
    expect(amsSystems).toHaveLength(4);
    expect(tagDesignators).toHaveLength(4);
    expect(artemisFcs).toHaveLength(3);

    expect(ids(ultraACs).every(isUltraAC)).toBe(true);
    expect(ids(rotaryACs).every(isRotaryAC)).toBe(true);
    expect(ids(lbxACs).every(isLBXAC)).toBe(true);
    expect(ids(streakLaunchers).every(isStreakSRM)).toBe(true);
    expect(ids(streakLaunchers).every(verifyStreakBehavior)).toBe(true);
    expect(ids(narcLaunchers).every(isNarc)).toBe(true);
    expect(ids(amsSystems).every(isAMS)).toBe(true);
    expect(ids(tagDesignators).every(isTAG)).toBe(true);

    expect(sortedKeys(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)).toEqual([
      'ams',
      'artemis',
      'lb-x-ac',
      'mml',
      'narc',
      'rotary-ac',
      'streak-srm',
      'tag',
      'ultra-ac',
    ]);
    expect(supportGaps(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(['lb-x-ac', 'mml', 'rotary-ac', 'streak-srm', 'tag', 'ultra-ac']);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['ams', 'artemis', 'narc']);

    expect(supportGaps(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'active-probe-counter-hydration',
      'ams-ammo-consumption',
      'ams-interception-events',
      'ams-projectile-reduction',
      'ams-single-missile-parity',
      'ams-streak-cluster-parity',
      'artemis-cluster-modifier',
      'artemis-ecm-suite-hydration',
      'artemis-ecm-suppression',
      'artemis-stealth-suppression',
      'inarc-ecm-attacker-flight-path-suppression',
      'inarc-ecm-c3-disruption',
      'inarc-haywire-to-hit-modifier',
      'inarc-homing-cluster-modifier',
      'inarc-homing-marker-attachment',
      'inarc-homing-to-hit-modifier',
      'inarc-nemesis-redirect',
      'inarc-variant-ammo-attachment',
      'lbx-cluster-to-hit',
      'lbx-slug-cluster-modes',
      'mml-srm-lrm-ammo-compatibility',
      'mml-srm-lrm-mode-damage',
      'mml-variable-damage',
      'narc-cluster-modifier',
      'narc-marker-attachment',
      'narc-marker-lifecycle-events',
      'rac-jam-on-natural-two',
      'rac-rate-of-fire',
      'streak-lock-no-spend-on-miss',
      'streak-rack-projectiles',
      'tag-designation-hit',
      'tag-intent-wire-state-replay',
      'tag-marker-lifecycle-events',
      'tag-semi-guided-cluster-bonus',
      'tag-turn-lifecycle-clear',
      'uac-jam-on-natural-two',
      'uac-rate-of-fire',
    ]);
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier']
        .evidence,
    ).toEqual(expect.stringContaining('prototype IV/V'));
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier']
        .evidence,
    ).toEqual(expect.stringContaining('indirect-fire state'));
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['inarc-pod-variants']);
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual([]);
  });

  it('maps every official Streak launcher to runner all-or-none semantics', () => {
    const streakLaunchers = familyItems(/\bStreak\b/i);
    const failures: string[] = [];

    for (const item of streakLaunchers) {
      const weaponId = item.id as string;
      const catalogWeapon = weaponLookup(weaponId);
      if (!catalogWeapon) {
        failures.push(`${weaponId}: missing from combat weapon lookup`);
        continue;
      }

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      const resolved = resolveSpecialProjectileHit({
        baseWeapon: aiWeapon,
        shotWeapon: aiWeapon,
        selectedMode: undefined,
        d6Roller: () => 6,
      });

      if (shouldSpendAmmoAndHeatOnMiss(aiWeapon)) {
        failures.push(`${weaponId}: failed lock would spend ammo or heat`);
      }
      if (
        resolved.projectileCount === undefined ||
        resolved.projectileCount <= 0
      ) {
        failures.push(`${weaponId}: runner could not derive rack size`);
      }
    }

    expect(failures).toEqual([]);
  });

  it('maps official UAC, RAC, LB-X, and MML catalog weapons into AI firing modes', () => {
    const multiModeFamilies = [
      {
        ids: ids(familyItems(/\bUltra AC\b/i)),
        kind: 'rate-of-fire',
        defaultModeId: 'single',
        modeIds: ['single', 'double'],
      },
      {
        ids: ids(familyItems(/\bRotary AC\b/i)),
        kind: 'rate-of-fire',
        defaultModeId: 'rof-1',
        modeIds: ['rof-1', 'rof-2', 'rof-3', 'rof-4', 'rof-5', 'rof-6'],
      },
      {
        ids: ids(familyItems(/\bLB-X AC\b|\bLB \d+-X AC\b/i)),
        kind: 'cluster-slug',
        defaultModeId: 'slug',
        modeIds: ['slug', 'cluster'],
      },
      {
        ids: ids(familyItems(/\bMML\b/i)),
        kind: 'ammo-mode',
        defaultModeId: 'srm',
        modeIds: ['srm', 'lrm'],
      },
    ] as const;

    for (const family of multiModeFamilies) {
      for (const weaponId of family.ids) {
        const catalogWeapon = weaponLookup(weaponId);
        expect(catalogWeapon).not.toBeNull();
        if (!catalogWeapon) continue;

        const aiWeapon = toAIWeapon(catalogWeapon, 0);
        expect(aiWeapon.firingModes?.kind).toBe(family.kind);
        expect(aiWeapon.firingModes?.defaultModeId).toBe(family.defaultModeId);
        expect(aiWeapon.firingModes?.modes.map((mode) => mode.id)).toEqual(
          family.modeIds,
        );
      }
    }
  });

  it('lets hydrated special-mode weapons participate in AI mode selection', () => {
    const uac = toAIWeapon(weaponLookup('uac-5') as ICatalogWeaponStats, 0);
    const rac = toAIWeapon(weaponLookup('rac-5') as ICatalogWeaponStats, 0);
    const lbx = toAIWeapon(
      weaponLookup('lb-10-x-ac') as ICatalogWeaponStats,
      0,
    );
    const mml = toAIWeapon(weaponLookup('mml-9') as ICatalogWeaponStats, 0);

    expect(
      selectWeaponMode(
        uac,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 40,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'double',
      effectiveDamage: 10,
      effectiveHeat: 2,
      effectiveShots: 2,
    });

    expect(
      selectWeaponMode(
        rac,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 60,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'rof-6',
      effectiveDamage: 30,
      effectiveHeat: 6,
      effectiveShots: 6,
    });

    expect(
      selectWeaponMode(
        lbx,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 20,
          targetEvading: true,
        },
        true,
      ).modeId,
    ).toBe('cluster');

    expect(
      selectWeaponMode(
        mml,
        {
          distance: 2,
          heatHeadroom: 99,
          ammoTurnsRemaining: 20,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'srm',
      effectiveDamage: 18,
      effectiveHeat: 5,
      effectiveShots: 1,
    });

    expect(
      selectWeaponMode(
        mml,
        {
          distance: 5,
          heatHeadroom: 99,
          ammoTurnsRemaining: 20,
        },
        true,
      ),
    ).toMatchObject({
      modeId: 'lrm',
      effectiveDamage: 9,
      effectiveHeat: 5,
      effectiveShots: 1,
    });
  });

  it('keeps remaining special-family mechanics visible as helper-only or unsupported gaps', () => {
    const mmlLaunchers = familyItems(/\bMML\b/i);
    const narcLaunchers = familyItems(/\bNARC\b|\biNARC\b|\bNarc\b/i);
    const amsSystems = familyItems(/\bAnti-Missile System\b|\bAMS\b/i);
    const tagDesignators = electronicsItems.filter((item) =>
      /\bTAG\b/i.test(itemText(item)),
    );
    const artemisFcs = miscellaneousItems.filter((item) =>
      /\bArtemis\b/i.test(itemText(item)),
    );

    for (const item of mmlLaunchers) {
      const catalogWeapon = weaponLookup(item.id as string);
      expect(catalogWeapon).not.toBeNull();
      if (!catalogWeapon) continue;

      const aiWeapon = toAIWeapon(catalogWeapon, 0);
      expect(aiWeapon.damage).toBeGreaterThan(0);
      expect(aiWeapon.firingModes).toMatchObject({
        kind: 'ammo-mode',
        defaultModeId: 'srm',
      });
      expect(aiWeapon.firingModes?.modes.map((mode) => mode.id)).toEqual([
        'srm',
        'lrm',
      ]);
    }

    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.mml.level).toBe('integrated');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.level).toBe('helper-only');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.level).toBe('helper-only');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.tag.level).toBe('integrated');
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT['lb-x-ac'].level).toBe(
      'integrated',
    );
    expect(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.level).toBe(
      'helper-only',
    );
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['mml-variable-damage'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['mml-srm-lrm-ammo-compatibility']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-designation-hit'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['tag-intent-wire-state-replay']
        .level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-projectile-reduction'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['ams-interception-events'].level,
    ).toBe('integrated');
    expect(
      SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT['artemis-cluster-modifier'].level,
    ).toBe('integrated');
    expect(
      supportIdsByLevel(SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT, 'unsupported'),
    ).toEqual([]);
    expect(
      [
        SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.narc.gap,
        SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.ams.gap,
        SPECIAL_WEAPON_FAMILY_COMBAT_SUPPORT.artemis.gap,
      ].every((gap) => typeof gap === 'string' && gap.length > 0),
    ).toBe(true);

    expect(ids(narcLaunchers)).toContain('narc');
    expect(ids(amsSystems)).toContain('ams');
    expect(ids(tagDesignators)).toContain('tag');
    expect(ids(artemisFcs)).toEqual([
      'artemisiv',
      'artemisivproto',
      'artemisv',
    ]);
  });

  it('pins TAG and NARC marker mechanics to MegaMek handler refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      sourceRefsFor('narc-marker-attachment').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler creates a standard NarcPod and attaches it to the hit target location.',
    ]);
    expect(
      sourceRefsFor('inarc-pod-variants').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    ]);
    expect(
      sourceRefsFor('inarc-variant-ammo-attachment').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'INarcPod defines Homing, ECM, Haywire, and Nemesis pod type constants.',
    ]);
    expect(
      sourceRefsFor('inarc-ecm-attacker-flight-path-suppression').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
      'MissileWeaponHandler suppresses Artemis, prototype Artemis, and Artemis V cluster guidance when the attacker-to-target missile path is ECM affected.',
    ]);
    expect(
      sourceRefsFor('inarc-ecm-c3-disruption').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'ComputeECM treats an entity with an iNarc ECM pod as ECM-affected at its own position while evaluating the attacker-to-target path.',
      'ComputeC3Spotter rejects C3 node paths when ComputeECM reports ECM effects on either leg of the network connection.',
    ]);
    expect(
      sourceRefsFor('inarc-nemesis-redirect').map(({ citation }) => citation),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'MissileWeaponHandler redirects iNarc Nemesis-confusable missiles to friendly intervening Nemesis pod carriers before returning to the original target on misses.',
      'MissileWeaponHandler scopes iNarc Nemesis confusion to direct ATM, Artemis-linked, NARC-capable, or Listen-Kill LRM/SRM missile attacks.',
      'Game.getNemesisTargets returns friendly entities with iNarc Nemesis pods attached in intervening hexes between attacker and original target.',
    ]);
    expect(
      sourceRefsFor('inarc-homing-to-hit-modifier').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'Entity.isINarcedBy returns true only for Homing iNarc pods from the firing team.',
      'ComputeToHit marks NARC-capable LRM/SRM/MML attacks as iNarc-guided when the target carries a Homing iNarc pod and target ECM does not suppress it.',
      'ComputeToHit applies the -1 iNarc Homing to-hit modifier to iNarc-guided missile attacks.',
      'MissileWeaponHandler applies the NARC cluster modifier to direct NARC-capable missiles when the target is NARCed or iNARC Homing-marked and target ECM does not suppress it.',
    ]);
    expect(
      sourceRefsFor('inarc-haywire-to-hit-modifier').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'NarcHandler splits iNarc ECM, Haywire, Nemesis, and Homing pod variants before attaching the iNarc pod.',
      'Entity.isINarcedWith checks attached iNarc pod type from any team.',
      'ComputeToHit derives isHaywireINarced from the attacker entity before compiling attacker to-hit modifiers.',
      'ComputeAttackerToHitMods applies the +1 iNarc Haywire attacker to-hit modifier.',
    ]);
    expect(
      sourceRefsFor('tag-designation-hit').map(({ citation }) => citation),
    ).toEqual([
      'TAGHandler creates TagInfo, tags the target entity, and marks the attacker as spotting for indirect fire.',
    ]);
    expect(
      sourceRefsFor('tag-turn-lifecycle-clear').map(({ citation }) => citation),
    ).toEqual([
      'TWPhasePreparationManager clears previous-round TAG info during initiative preparation.',
      'Game.resetTagInfo clears the tagInfoForTurn collection.',
    ]);

    const refs = [
      ...sourceRefsFor('narc-marker-attachment'),
      ...sourceRefsFor('inarc-pod-variants'),
      ...sourceRefsFor('inarc-variant-ammo-attachment'),
      ...sourceRefsFor('inarc-ecm-attacker-flight-path-suppression'),
      ...sourceRefsFor('inarc-nemesis-redirect'),
      ...sourceRefsFor('inarc-homing-marker-attachment'),
      ...sourceRefsFor('inarc-homing-cluster-modifier'),
      ...sourceRefsFor('inarc-homing-to-hit-modifier'),
      ...sourceRefsFor('inarc-haywire-to-hit-modifier'),
      ...sourceRefsFor('tag-designation-hit'),
      ...sourceRefsFor('tag-turn-lifecycle-clear'),
      ...sourceRefsFor('tag-marker-lifecycle-events'),
      ...sourceRefsFor('narc-marker-lifecycle-events'),
    ];

    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('pins ECM and active-probe hydration to MegaMek equipment refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      sourceRefsFor('artemis-ecm-suite-hydration').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MiscType defines Guardian, Clan, and Angel ECM suites with ECM flags and ECM modes.',
      'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
    ]);
    expect(
      sourceRefsFor('active-probe-counter-hydration').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MiscType defines Beagle, Bloodhound, and Clan active probes with BAP flags.',
      'MiscType defines Light Active Probe with a BAP flag.',
      'MiscType defines Watchdog and Nova CEWS with both ECM and BAP flags.',
      'Entity.getBAPRange gives Clan Active Probe, Watchdog, and Nova CEWS a 5-hex BAP range.',
    ]);

    const refs = [
      ...sourceRefsFor('artemis-ecm-suite-hydration'),
      ...sourceRefsFor('active-probe-counter-hydration'),
    ];

    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('pins Artemis cluster, ECM, and stealth suppression to MegaMek refs', () => {
    const sourceRefsFor = (
      id: keyof typeof SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT,
    ) => SPECIAL_WEAPON_MECHANIC_COMBAT_SUPPORT[id].sourceRefs ?? [];

    expect(
      sourceRefsFor('artemis-cluster-modifier').map(({ citation }) => citation),
    ).toEqual([
      'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
      'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
    ]);
    expect(
      sourceRefsFor('artemis-ecm-suppression').map(({ citation }) => citation),
    ).toEqual(
      sourceRefsFor('artemis-cluster-modifier').map(({ citation }) => citation),
    );
    expect(
      sourceRefsFor('artemis-stealth-suppression').map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MissileWeaponHandler applies Artemis IV, prototype Artemis IV, and Artemis V cluster modifiers while suppressing ECM and attacker stealth.',
      'LRMHandler skips Artemis cluster modifiers in indirect mode and applies the same Artemis IV, prototype Artemis IV, Artemis V, ECM, and stealth branches for direct LRM fire.',
      'Mek.isStealthActive requires stealth equipment mode On and active ECM support.',
    ]);

    const refs = [
      ...sourceRefsFor('artemis-cluster-modifier'),
      ...sourceRefsFor('artemis-ecm-suppression'),
      ...sourceRefsFor('artemis-stealth-suppression'),
    ];

    expect(
      refs.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });
});

describe('BattleMech combat feature-gap tracking', () => {
  it('classifies every combat-active SPA and quirk as integrated, helper-only, or unsupported', () => {
    expect(sortedKeys(SPA_COMBAT_SUPPORT)).toEqual(sortedKeys(SPA_CATALOG));
    expect(sortedKeys(QUIRK_COMBAT_SUPPORT)).toEqual(sortedKeys(QUIRK_CATALOG));

    expect(supportGaps(SPA_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(QUIRK_COMBAT_SUPPORT)).toEqual([]);
    expect(getSPADefinition('forward_observer')).not.toBeNull();
    expect(SPA_CATALOG.forward_observer).toBeDefined();
    expect(SPA_COMBAT_SUPPORT.forward_observer.level).toBe('integrated');
    expect(SPA_CATALOG.sandblaster).toMatchObject({
      combatEffect: expect.stringContaining('+4/+3/+2'),
      requiresDesignation: true,
      designationType: 'weapon_type',
    });
    expect(getSPADefinition('sandblaster')).toMatchObject({
      requiresDesignation: true,
      designationType: 'weapon_type',
    });

    expect(
      Object.values(SPA_COMBAT_SUPPORT).filter(
        (entry) => entry.level === 'unsupported',
      ).length,
    ).toBeGreaterThan(0);
    expect(
      Object.values(QUIRK_COMBAT_SUPPORT).filter(
        (entry) => entry.level === 'helper-only',
      ).length,
    ).toBeGreaterThan(0);
  });

  it('mirrors the canonical SPA catalog into explicit combat scope support', () => {
    expect(sortedKeys(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)).toEqual(
      sortedKeys(CANONICAL_SPA_CATALOG),
    );
    expect(supportGaps(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT)).toEqual([]);

    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.forward_observer.level).toBe(
      'integrated',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.weapon_specialist.level).toBe(
      'integrated',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.oblique_artillery.level).toBe(
      'helper-only',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.foot_cav.level).toBe(
      'helper-only',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.edge_when_headhit.level).toBe(
      'helper-only',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.sandblaster).toMatchObject({
      level: 'helper-only',
      gap: expect.stringContaining('UAC/RAC'),
    });
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.cluster_master.level).toBe(
      'unsupported',
    );
    expect(CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.shaky_stick).toMatchObject({
      level: 'unsupported',
      evidence: expect.stringContaining('Source-backed'),
      gap: expect.stringContaining('ground-to-air'),
    });
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.shaky_stick.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek ComputeAbilityMods.processDefenderSPAs applies +1 Shaky Stick when an airborne or airborne VTOL/WIGE target is attacked by a non-airborne attacker.',
      'MegaMek OptionsConstants defines PILOT_SHAKY_STICK as shaky_stick.',
    ]);
    expect(
      CANONICAL_SPA_COMBAT_SCOPE_SUPPORT.shaky_stick.sourceRefs?.every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('tracks ejection as UI-visible with lifecycle event and network intent support', () => {
    const ejectCommand = buildUtilityCommands().find(
      (command) => command.id === 'utility.eject',
    );
    const event = createUnitEjectedEvent(
      'catalog-ejection',
      1,
      1,
      GamePhase.Movement,
      'player-1',
      'player_declared',
    );

    expect(ejectCommand?.commit({} as never).actionId).toBe('eject');
    expect(event.type).toBe(GameEventType.UnitEjected);
    expect(event.payload).toMatchObject({
      unitId: 'player-1',
      reason: 'player_declared',
    });
    expect(GAME_INTENT_TYPES).toContain('eject');
    expect(
      isKnownLimitation({
        invariant: 'combat-ejection',
        severity: 'warning',
        message: 'ejection network intent not implemented',
        context: {},
      }),
    ).toBe(false);
  });

  it('tracks official physical catalog entries against runtime attack support', () => {
    expect(sortedKeys(PHYSICAL_WEAPON_COMBAT_SUPPORT)).toEqual(
      ids(physicalWeaponItems),
    );
    expect(supportGaps(PHYSICAL_WEAPON_COMBAT_SUPPORT)).toEqual([]);

    const integrated = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
      .filter((entry) => entry.level === 'integrated')
      .map((entry) => entry.id)
      .sort();
    const unsupported = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
      .filter((entry) => entry.level === 'unsupported')
      .map((entry) => entry.id)
      .sort();
    const helperOnly = Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
      .filter((entry) => entry.level === 'helper-only')
      .map((entry) => entry.id)
      .sort();

    expect(integrated).toEqual(
      [...SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES].sort(),
    );
    expect(
      Object.values(PHYSICAL_WEAPON_COMBAT_SUPPORT)
        .filter((entry) => entry.level === 'integrated')
        .flatMap((entry) =>
          (entry.sourceRefs?.length ?? 0) === 0 ? [entry.id] : [],
        ),
    ).toEqual([]);
    expect(helperOnly).toEqual(['claws', 'talons']);
    expect(unsupported).toEqual([]);
  });

  it('tracks runner range brackets including extreme range support', () => {
    expect(sortedKeys(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT)).toEqual([
      'extreme',
      'long',
      'medium',
      'out_of_range',
      'short',
    ]);
    expect(supportGaps(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(['extreme', 'long', 'medium', 'out_of_range', 'short']);
    expect(
      supportIdsByLevel(RUNNER_RANGE_BRACKET_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
  });

  it('tracks runner to-hit modifiers separately from helper-only modifier math', () => {
    expect(supportGaps(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'actuator-damage',
      'attacker-movement',
      'attacker-prone',
      'c3',
      'called-shot',
      'environmental-conditions',
      'gunnery',
      'heat',
      'hull-down',
      'indirect-fire',
      'minimum-range',
      'partial-cover',
      'physical-dfa-piloting-differential',
      'physical-dfa-target-class',
      'pilot-wounds',
      'range',
      'secondary-target',
      'sensor-damage',
      'target-immobile',
      'target-movement',
      'target-prone',
      'terrain-features',
    ]);
    expect(
      supportIdsByLevel(RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['c3-equipment-network-formation', 'ecm']);
  });

  it('pins source-backed to-hit modifiers to MegaMek refs', () => {
    const secondaryTargetRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['secondary-target'].sourceRefs ??
      [];
    const calledShotRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['called-shot'].sourceRefs ?? [];
    const c3Refs = RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT.c3.sourceRefs ?? [];
    const c3EquipmentFormationRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['c3-equipment-network-formation']
        .sourceRefs ?? [];
    const hullDownRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['hull-down'].sourceRefs ?? [];
    const physicalDfaTargetClassRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT['physical-dfa-target-class']
        .sourceRefs ?? [];
    const physicalDfaPilotingDifferentialRefs =
      RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT[
        'physical-dfa-piloting-differential'
      ].sourceRefs ?? [];

    expect(secondaryTargetRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
      'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
    ]);
    expect(calledShotRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    ]);
    expect(c3Refs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
    ]);
    expect(c3EquipmentFormationRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    ]);
    expect(hullDownRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek ComputeTerrainMods applies WeaponAttackAction.HullDown as a +2 terrain modifier for hull-down Mek targets with LOS cover.',
    ]);
    expect(physicalDfaTargetClassRefs.map(({ citation }) => citation)).toEqual([
      'MegaMek DfaAttackAction.toHit applies +3 for Infantry targets and +1 for Battle Armor targets.',
    ]);
    expect(
      physicalDfaPilotingDifferentialRefs.map(({ citation }) => citation),
    ).toEqual([
      'MegaMek DfaAttackAction.toHit applies attacker piloting minus target piloting as the piloting skill differential.',
    ]);

    expect(
      [
        ...secondaryTargetRefs,
        ...calledShotRefs,
        ...c3Refs,
        ...c3EquipmentFormationRefs,
        ...hullDownRefs,
        ...physicalDfaTargetClassRefs,
        ...physicalDfaPilotingDifferentialRefs,
      ].every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.sourceVersion ===
            '325b2504c7b7750ecdcb85468621fb2de2ad8e60' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('tracks physical damage modifiers separately from helper-only environment inputs', () => {
    expect(supportGaps(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(['tsm', 'underwater']);
    expect(
      supportIdsByLevel(PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['claws', 'talons']);
  });

  it('tracks movement action rules and terrain/environment rule gaps', () => {
    expect(supportGaps(MOVEMENT_RULE_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(MOVEMENT_RULE_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'elevation',
      'facing',
      'heat-mp-penalty',
      'jump',
      'occupancy',
      'run',
      'stand',
      'walk',
    ]);
    expect(
      supportIdsByLevel(MOVEMENT_RULE_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['prone', 'torso-twist']);

    expect(sortedKeys(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT)).toEqual(
      MOVEMENT_ENHANCEMENT_DEFINITIONS.map(({ type }) => type).sort(),
    );
    expect(supportGaps(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        MovementEnhancementType.PARTIAL_WING,
        MovementEnhancementType.TSM,
      ].sort(),
    );
    expect(
      supportIdsByLevel(MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(
      [
        MovementEnhancementType.MASC,
        MovementEnhancementType.SUPERCHARGER,
      ].sort(),
    );

    expect(TERRAIN_TYPE_MOVEMENT_COVERAGE).toHaveLength(17);
    expect(supportGaps(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'atmosphere',
      'extreme-temperature',
      'fire-heat',
      'fog',
      'night',
      'smoke-to-hit',
      'terrain-los-blocking',
      'terrain-movement-costs',
      'terrain-partial-cover',
      'terrain-to-hit-features',
      'water-cooling',
      'water-ground-disallow',
      'wind',
    ]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['dust', 'mines']);
  });

  it('tracks runner heat rules and separates session/helper-only heat mechanics', () => {
    expect(supportGaps(HEAT_RULE_COMBAT_SUPPORT)).toEqual([]);
    expect(supportIdsByLevel(HEAT_RULE_COMBAT_SUPPORT, 'integrated')).toEqual([
      'ammo-explosion-risk',
      'auto-shutdown',
      'dissipation',
      'engine-heat',
      'environmental-heat',
      'fire-heat',
      'heat-induced-ammo-explosion',
      'heat-sink-damage',
      'jump-distance-heat',
      'movement-heat',
      'pilot-heat-damage',
      'shutdown-check',
      'startup',
      'threshold-effects',
      'water-cooling',
      'weapon-heat',
    ]);
    expect(supportIdsByLevel(HEAT_RULE_COMBAT_SUPPORT, 'helper-only')).toEqual(
      [],
    );

    const heatAmmoExplosionRefs =
      HEAT_RULE_COMBAT_SUPPORT['heat-induced-ammo-explosion'].sourceRefs ?? [];
    const heatStartupRefs = HEAT_RULE_COMBAT_SUPPORT.startup.sourceRefs ?? [];
    const heatShutdownRefs =
      HEAT_RULE_COMBAT_SUPPORT['shutdown-check'].sourceRefs ?? [];
    const autoShutdownRefs =
      HEAT_RULE_COMBAT_SUPPORT['auto-shutdown'].sourceRefs ?? [];
    const heatRiskRefs =
      HEAT_RULE_COMBAT_SUPPORT['ammo-explosion-risk'].sourceRefs ?? [];
    const pilotHeatRefs =
      HEAT_RULE_COMBAT_SUPPORT['pilot-heat-damage'].sourceRefs ?? [];

    expect(
      heatAmmoExplosionRefs.map((sourceRef) => sourceRef.citation),
    ).toEqual([
      expect.stringContaining('HeatResolver checks heat >= 19'),
      expect.stringContaining('explodeAmmoFromHeat selects'),
    ]);
    expect(heatStartupRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('automatically restarts'),
    ]);
    expect(heatShutdownRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('avoidable shutdown checks'),
    ]);
    expect(autoShutdownRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('automatic shutdown'),
    ]);
    expect(heatRiskRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('heat >= 19'),
    ]);
    expect(pilotHeatRefs.map((sourceRef) => sourceRef.citation)).toEqual([
      expect.stringContaining('pilot damage at heat 15/25+'),
    ]);
    expect(
      [
        ...heatAmmoExplosionRefs,
        ...heatStartupRefs,
        ...heatShutdownRefs,
        ...autoShutdownRefs,
        ...heatRiskRefs,
        ...pilotHeatRefs,
      ].every(
        (sourceRef) =>
          sourceRef.kind === 'megamek-source' &&
          sourceRef.url.includes('github.com/MegaMek/megamek/blob/') &&
          sourceRef.url.includes(sourceRef.sourceVersion) &&
          sourceRef.url.includes('#L'),
      ),
    ).toBe(true);
  });

  it('tracks damage, pilot injury, critical components, and destruction causes', () => {
    expect(supportGaps(DAMAGE_RESOLUTION_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(PILOT_DAMAGE_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(CRITICAL_COMPONENT_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(DESTRUCTION_CAUSE_COMBAT_SUPPORT)).toEqual([]);

    expect(
      supportIdsByLevel(DAMAGE_RESOLUTION_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'armor-damage',
      'damage-transfer',
      'head-damage-cap',
      'heat-ammo-explosion-damage-cascade',
      'internal-structure-damage',
      'location-destroyed-events',
      'rear-armor-damage',
      'side-torso-arm-cascade',
      'transfer-damage-events',
      'twenty-plus-damage-psr',
    ]);
    expect(
      supportIdsByLevel(DAMAGE_RESOLUTION_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['destruction-cause-state-persistence']);

    expect(
      supportIdsByLevel(PILOT_DAMAGE_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'cockpit-crit-pilot-death',
      'consciousness-check',
      'fall-pilot-damage',
      'head-hit-pilot-event',
      'head-hit-wound',
      'heat-pilot-damage',
      'pilot-death',
      'unconsciousness',
    ]);
    expect(
      supportIdsByLevel(PILOT_DAMAGE_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);

    expect(
      supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'actuator',
      'cockpit',
      'engine',
      'gyro',
      'life_support',
      'sensor',
    ]);
    expect(
      supportIdsByLevel(CRITICAL_COMPONENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['ammo', 'equipment', 'heat_sink', 'jump_jet', 'weapon']);

    expect(
      supportIdsByLevel(DESTRUCTION_CAUSE_COMBAT_SUPPORT, 'integrated'),
    ).toEqual([
      'ammo_explosion',
      'damage',
      'engine_destroyed',
      'impossible_displacement',
      'pilot_death',
    ]);
    expect(
      supportIdsByLevel(DESTRUCTION_CAUSE_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(['ct_destroyed', 'head_destroyed', 'shutdown']);

    expect(
      DESTRUCTION_CAUSE_COMBAT_SUPPORT.impossible_displacement.sourceRefs?.map(
        ({ citation }) => citation,
      ),
    ).toEqual([
      'MegaMek resolveDfaAttack destroys the attacker on a missed DFA when the target cannot be displaced.',
      'MegaMek resolveDfaAttack destroys the target on a successful DFA when the target cannot be displaced.',
    ]);
  });

  it('tracks runner-vs-interactive parity and marks cross-stack gaps', () => {
    expect(supportGaps(RUNNER_INTERACTIVE_PARITY_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(RUNNER_INTERACTIVE_PARITY_SUPPORT, 'integrated'),
    ).toEqual([
      'heat-core-resolution',
      'heat-dissipation-event-payload',
      'heat-environment-and-water',
      'heat-pilot-damage',
      'movement-action-eligibility',
      'movement-heat-and-event-path',
      'movement-validation',
      'objective-outcome',
      'physical-attack-resolution',
      'physical-displacement-grid-occupancy',
      'psr-piloting-skill',
      'psr-resolution',
      'terminal-game-ended-event',
      'weapon-damage-critical-events',
      'weapon-indirect-fire',
      'weapon-range-and-to-hit',
      'weapon-target-validation',
    ]);
    expect(
      supportIdsByLevel(RUNNER_INTERACTIVE_PARITY_SUPPORT, 'helper-only'),
    ).toEqual([]);
  });

  it('tracks lifecycle action eligibility and PSR resolution support', () => {
    expect(supportGaps(ACTION_ELIGIBILITY_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(PSR_RESOLUTION_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT)).toEqual([]);

    expect(
      supportIdsByLevel(ACTION_ELIGIBILITY_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'destroyed',
        'ejected',
        'ejected-targetability',
        'ejection-damage-preservation',
        'force-survivor-counts',
        'retreated',
        'retreated-targetability',
        'shutdown',
        'shutdown-targetability',
        'unconscious',
      ].sort(),
    );
    expect(
      supportIdsByLevel(PSR_RESOLUTION_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        'failed-psr-fall',
        'fall-pilot-death',
        'fall-pilot-hit-event',
        'fall-pilot-wound',
        'pending-psr-clear',
        'pending-psr-resolution',
        'psr-reason-code-preservation',
        'psr-resolved-events',
      ].sort(),
    );
    expect(sortedKeys(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT)).toEqual(
      Object.values(PSRTrigger).sort(),
    );
    expect(
      supportIdsByLevel(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(
      [
        PSRTrigger.PhaseDamage20Plus,
        PSRTrigger.LegDamage,
        PSRTrigger.HipActuatorDestroyed,
        PSRTrigger.GyroHit,
        PSRTrigger.EngineHit,
        PSRTrigger.UpperLegActuatorHit,
        PSRTrigger.LowerLegActuatorHit,
        PSRTrigger.FootActuatorHit,
        PSRTrigger.Kicked,
        PSRTrigger.Charged,
        PSRTrigger.DFATarget,
        PSRTrigger.Pushed,
        PSRTrigger.KickMiss,
        PSRTrigger.ChargeMiss,
        PSRTrigger.Shutdown,
        PSRTrigger.StandingUp,
        PSRTrigger.EnteringRubble,
        PSRTrigger.RunningRoughTerrain,
        PSRTrigger.MovingOnIce,
        PSRTrigger.EnteringWater,
        PSRTrigger.ExitingWater,
        PSRTrigger.Skidding,
        PSRTrigger.RunningDamagedHip,
        PSRTrigger.RunningDamagedGyro,
      ].sort(),
    );
    expect(
      supportIdsByLevel(RUNNER_PSR_TRIGGER_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(
      [
        PSRTrigger.DFAMiss,
        PSRTrigger.BuildingCollapse,
        PSRTrigger.MASCFailure,
        PSRTrigger.SuperchargerFailure,
      ].sort(),
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.DFATarget].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toContain(
      'MegaMek resolveDfaAttack queues attacker PilotingRollData +4 for "executed death from above" after a successful DFA.',
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.DFAMiss].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toContain(
      'MegaMek resolveDfaAttack displaces the target on a missed DFA, then immediately calls doEntityFall on the attacker with fall height 2 and facing 3.',
    );
    expect(
      RUNNER_PSR_TRIGGER_COMBAT_SUPPORT[PSRTrigger.DFAMiss].sourceRefs?.map(
        (sourceRef) => sourceRef.citation,
      ),
    ).toContain(
      'MegaMek doEntityFall rolls checkPilotAvoidFallDamage after fall damage and adds fallHeight - 1 to the pilot-damage avoidance target.',
    );
  });

  it('audits known-limitation traps without filtering combat validation failures', () => {
    const validationTraps: readonly {
      readonly category: string;
      readonly message: string;
    }[] = [
      {
        category: 'physicalAttacks',
        message: 'physical attack charge and death from above',
      },
      {
        category: 'terrainMovement',
        message: 'terrain movement cost water hex cost',
      },
      {
        category: 'heatShutdown',
        message: 'heat induced shutdown restart after shutdown',
      },
      {
        category: 'lineOfSight',
        message: 'line of sight blocked by intervening terrain',
      },
      {
        category: 'specialAbilities',
        message: 'special pilot ability melee specialist',
      },
      {
        category: 'criticalEffects',
        message: 'critical hit effect engine hit heat',
      },
    ];
    const validationTrapViolations: readonly IViolation[] = validationTraps.map(
      ({ message }) => ({
        invariant: 'battlemech-combat-validation',
        severity: 'warning',
        message,
        context: {},
      }),
    );

    expect(validationTrapViolations.every(isKnownLimitation)).toBe(false);
    expect(validationTrapViolations.map(getLimitationPatternCategory)).toEqual(
      validationTraps.map(({ category }) => category),
    );
    expect(validationTrapViolations).toHaveLength(validationTraps.length);
  });

  it('prevents known-limitation filtering from gating the catalog validation lane', () => {
    const source = readFileSync(
      join(
        process.cwd(),
        'src',
        'simulation',
        'runner',
        '__tests__',
        'battlemechCombatCatalog.contract.test.ts',
      ),
      'utf8',
    );
    const forbiddenGateSymbols = [
      'filter' + 'KnownLimitations',
      'partition' + 'Violations',
    ];

    for (const symbol of forbiddenGateSymbols) {
      expect(source).not.toContain(symbol);
    }
  });
});
