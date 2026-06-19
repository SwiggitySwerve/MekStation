import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from '../CombatFeatureSupport';

import {
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
} from '../CombatRuleSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_COMBAT_COVERAGE,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  TERRAIN_TYPES_WITH_PSR_GAPS,
} from '../CombatTerrainEnvironmentSupport';
import {
  getCombatValidationOutOfScopeRefs,
  getCombatValidationUnresolvedRefs,
} from '../CombatValidationGapInventory';

export function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

export function supportGaps(
  support: Record<string, ICombatFeatureSupportEntry>,
): readonly string[] {
  return Object.values(support)
    .filter(
      (entry) =>
        entry.evidence.length === 0 ||
        (entry.level !== 'integrated' &&
          (entry.gap === undefined || entry.gap.length === 0)),
    )
    .map((entry) => entry.id)
    .sort();
}

export function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

export function expectHelperOnlyRowPinsNamedGaps(
  entry: ICombatFeatureSupportEntry,
  namedGaps: readonly string[],
): void {
  expect(entry.level).toBe('helper-only');
  namedGaps.forEach((gap) => {
    expect(entry.gap).toEqual(expect.stringContaining(gap));
  });
}

export function expectLineAnchoredSourceRef(
  ref: ICombatFeatureSourceReference,
): void {
  expect(ref.citation.length).toBeGreaterThan(0);
  expect(ref.url).toContain('#L');
  expect(ref.sourceVersion.length).toBeGreaterThan(0);
}

export function terrainTypesWithAttackModifiers(): readonly string[] {
  return Object.entries(TERRAIN_PROPERTIES)
    .filter(
      ([, properties]) =>
        properties.toHitInterveningModifier !== 0 ||
        properties.toHitTargetInModifier !== 0,
    )
    .map(([terrain]) => terrain)
    .sort();
}

export function terrainTypesWithHeatEffects(): readonly string[] {
  return Object.entries(TERRAIN_PROPERTIES)
    .filter(([, properties]) => properties.heatEffect !== 0)
    .map(([terrain]) => terrain)
    .sort();
}

export {
  TERRAIN_PROPERTIES,
  TerrainType,
  MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS,
  TERRAIN_ENVIRONMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_COMBAT_COVERAGE,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  TERRAIN_TYPES_WITH_PSR_GAPS,
  getCombatValidationOutOfScopeRefs,
  getCombatValidationUnresolvedRefs,
};

export type { ICombatFeatureSourceReference, ICombatFeatureSupportEntry };
