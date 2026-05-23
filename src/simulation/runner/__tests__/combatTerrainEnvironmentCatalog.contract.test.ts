import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type { ICombatFeatureSupportEntry } from '../CombatFeatureSupport';

import { TERRAIN_ENVIRONMENT_COMBAT_SUPPORT } from '../CombatRuleSupport';
import {
  TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
  TERRAIN_TYPE_COMBAT_COVERAGE,
  TERRAIN_TYPE_HEAT_COMBAT_SUPPORT,
  TERRAIN_TYPE_LOS_COMBAT_SUPPORT,
  TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT,
  TERRAIN_TYPE_PSR_COMBAT_SUPPORT,
  TERRAIN_TYPES_WITH_PSR_GAPS,
} from '../CombatTerrainEnvironmentSupport';

function sortedKeys(record: Record<string, unknown>): readonly string[] {
  return Object.keys(record).sort();
}

function supportGaps(
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

function supportIdsByLevel(
  support: Record<string, ICombatFeatureSupportEntry>,
  level: ICombatFeatureSupportEntry['level'],
): readonly string[] {
  return Object.values(support)
    .filter((entry) => entry.level === level)
    .map((entry) => entry.id)
    .sort();
}

function terrainTypesWithAttackModifiers(): readonly string[] {
  return Object.entries(TERRAIN_PROPERTIES)
    .filter(
      ([, properties]) =>
        properties.toHitInterveningModifier !== 0 ||
        properties.toHitTargetInModifier !== 0,
    )
    .map(([terrain]) => terrain)
    .sort();
}

function terrainTypesWithHeatEffects(): readonly string[] {
  return Object.entries(TERRAIN_PROPERTIES)
    .filter(([, properties]) => properties.heatEffect !== 0)
    .map(([terrain]) => terrain)
    .sort();
}

describe('BattleMech terrain and environment combat support catalog', () => {
  it('indexes every TerrainType across movement, LOS, attack modifier, heat, and PSR responsibilities', () => {
    const terrainTypes = Object.values(TerrainType).sort();

    expect([...TERRAIN_TYPE_COMBAT_COVERAGE].sort()).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_PROPERTIES)).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT)).toEqual(
      terrainTypes,
    );
    expect(sortedKeys(TERRAIN_TYPE_LOS_COMBAT_SUPPORT)).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT)).toEqual(
      terrainTypes,
    );
    expect(sortedKeys(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT)).toEqual(terrainTypes);
    expect(sortedKeys(TERRAIN_TYPE_PSR_COMBAT_SUPPORT)).toEqual(terrainTypes);

    expect(supportGaps(TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(TERRAIN_TYPE_LOS_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT)).toEqual(
      [],
    );
    expect(supportGaps(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT)).toEqual([]);
    expect(supportGaps(TERRAIN_TYPE_PSR_COMBAT_SUPPORT)).toEqual([]);
  });

  it('treats non-zero terrain attack modifiers as integrated runner to-hit behavior', () => {
    expect(terrainTypesWithAttackModifiers()).toEqual(
      [
        TerrainType.Building,
        TerrainType.HeavyWoods,
        TerrainType.LightWoods,
        TerrainType.Smoke,
        TerrainType.Swamp,
        TerrainType.Water,
      ].sort(),
    );
    expect(
      supportIdsByLevel(
        TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
        'helper-only',
      ),
    ).toEqual([]);
    expect(
      supportIdsByLevel(
        TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT,
        'integrated',
      ),
    ).toEqual(Object.values(TerrainType).sort());
  });

  it('tracks terrain heat effects as integrated runner occupied-terrain heat behavior', () => {
    expect(terrainTypesWithHeatEffects()).toEqual(
      [TerrainType.Fire, TerrainType.Water].sort(),
    );
    expect(
      supportIdsByLevel(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_TYPE_HEAT_COMBAT_SUPPORT, 'integrated'),
    ).toEqual(Object.values(TerrainType).sort());
  });

  it('keeps building-collapse PSR responsibility visible without inventing PSR gaps for movement-cost terrain', () => {
    expect([...TERRAIN_TYPES_WITH_PSR_GAPS].sort()).toEqual([
      TerrainType.Building,
    ]);
    expect(
      supportIdsByLevel(TERRAIN_TYPE_PSR_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual([...TERRAIN_TYPES_WITH_PSR_GAPS].sort());
    expect(
      [
        TerrainType.Mud,
        TerrainType.Sand,
        TerrainType.Snow,
        TerrainType.Swamp,
      ].map((terrain) => TERRAIN_TYPE_PSR_COMBAT_SUPPORT[terrain].level),
    ).toEqual(['integrated', 'integrated', 'integrated', 'integrated']);
  });

  it('keeps environment requirements without TerrainType enum values explicitly cataloged', () => {
    expect(supportGaps(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT)).toEqual([]);
    expect(
      supportIdsByLevel(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT, 'helper-only'),
    ).toEqual(expect.arrayContaining(['dust', 'mines']));
    expect(TERRAIN_ENVIRONMENT_COMBAT_SUPPORT.wind).toMatchObject({
      level: 'integrated',
    });
  });
});
