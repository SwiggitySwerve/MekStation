import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import { MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS } from './CombatToHitSourceRefs';

const MEGAMEK_TERRAIN_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function mekstationDeviationSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineRange}`,
    sourceVersion: 'MekStation working-tree',
  };
}

const MEGAMEK_INTERVENING_TERRAIN_TO_HIT_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek LosEffects.losModifiers adds intervening building, heavy woods, light smoke, heavy smoke, and partial-cover to-hit modifiers from LOS terrain.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/LosEffects.java#L882-L929`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_CUMULATIVE_LOS_BLOCKING_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek LosEffects derives final LOS from blocked terrain plus cumulative woods, smoke, planted fields, heavy industrial, and screen thresholds.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/LosEffects.java#L793-L863`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_INTERVENING_LOS_FEATURE_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek LosEffects.losForCoords evaluates intervening building elevation, water, woods, smoke, and other terrain effects before accumulating LOS blockers.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/LosEffects.java#L1210-L1455`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEKSTATION_TERRAIN_TO_HIT_PROPERTIES_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation TERRAIN_PROPERTIES defines target-in and intervening to-hit modifiers for every local TerrainType row.',
    'src/types/gameplay/TerrainTypes.ts',
    'L146-L488',
  );

const MEKSTATION_TERRAIN_LOS_PROPERTIES_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation TERRAIN_PROPERTIES defines blocksLOS and losBlockHeight for every local TerrainType row.',
    'src/types/gameplay/TerrainTypes.ts',
    'L146-L488',
  );

const MEKSTATION_LOS_FEATURE_PARSE_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation parseTerrainFeatures turns a terrain string into local TerrainType feature rows before LOS checks.',
  'src/utils/gameplay/lineOfSight.ts',
  'L50-L70',
);

const MEKSTATION_LOS_BLOCKING_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation calculateLOS checks intervening hexes for blocksLOS terrain, computes local blocking height, and returns blockingTerrain when the simplified sight line is blocked.',
  'src/utils/gameplay/lineOfSight.ts',
  'L137-L232',
);

const MEKSTATION_ATTACK_LOS_PHASE_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation validateLineOfSightForAttack consumes calculateLOS and emits AttackInvalid when no direct LOS or indirect spotter path exists.',
  'src/simulation/runner/phases/weaponAttackLineOfSight.ts',
  'L48-L88',
);

const MEKSTATION_TERRAIN_TO_HIT_UTILITY_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation getTerrainToHitModifier sums intervening TerrainType modifiers and applies the largest target-in TerrainType modifier.',
    'src/utils/gameplay/toHit/environmentModifiers.ts',
    'L65-L88',
  );

const MEKSTATION_RUNNER_TERRAIN_TO_HIT_HELPER_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation weapon attack terrain helpers convert LOS and target hex terrain into target and intervening to-hit modifier details.',
    'src/simulation/runner/phases/weaponAttackTerrainModifiers.ts',
    'L13-L64',
  );

const MEKSTATION_RUNNER_TERRAIN_TO_HIT_PHASE_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation runAttackPhase adds target and intervening terrain modifiers into final AttackDeclared to-hit math.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L969-L1004',
  );

const sourceBackedAttackModifierTerrains = new Set<TerrainType>([
  TerrainType.Building,
  TerrainType.HeavyWoods,
  TerrainType.LightWoods,
  TerrainType.Smoke,
]);

const megaMekComparedLosTerrains = new Set<TerrainType>([
  TerrainType.Building,
  TerrainType.HeavyWoods,
  TerrainType.LightWoods,
  TerrainType.Smoke,
  TerrainType.Water,
]);

export function terrainLosSourceRefs(
  terrain: TerrainType,
): readonly ICombatFeatureSourceReference[] {
  const localLosRefs = [
    MEKSTATION_TERRAIN_LOS_PROPERTIES_SOURCE_REF,
    MEKSTATION_LOS_FEATURE_PARSE_SOURCE_REF,
    MEKSTATION_LOS_BLOCKING_SOURCE_REF,
    MEKSTATION_ATTACK_LOS_PHASE_SOURCE_REF,
  ];

  if (megaMekComparedLosTerrains.has(terrain)) {
    return [
      MEGAMEK_CUMULATIVE_LOS_BLOCKING_SOURCE_REF,
      MEGAMEK_INTERVENING_LOS_FEATURE_SOURCE_REF,
      ...localLosRefs,
    ];
  }

  return localLosRefs;
}

export function terrainAttackModifierSourceRefs(
  terrain: TerrainType,
): readonly ICombatFeatureSourceReference[] {
  const localToHitRefs = [
    MEKSTATION_TERRAIN_TO_HIT_PROPERTIES_SOURCE_REF,
    MEKSTATION_TERRAIN_TO_HIT_UTILITY_SOURCE_REF,
    MEKSTATION_RUNNER_TERRAIN_TO_HIT_HELPER_SOURCE_REF,
    MEKSTATION_RUNNER_TERRAIN_TO_HIT_PHASE_SOURCE_REF,
  ];

  if (sourceBackedAttackModifierTerrains.has(terrain)) {
    return [
      ...MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS,
      MEGAMEK_INTERVENING_TERRAIN_TO_HIT_SOURCE_REF,
      ...localToHitRefs,
    ];
  }

  return localToHitRefs;
}
