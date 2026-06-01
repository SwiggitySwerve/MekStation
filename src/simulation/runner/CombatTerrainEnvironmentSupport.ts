import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  terrainAttackModifierSourceRefs,
  terrainLosSourceRefs,
  terrainPsrSourceRefs,
} from './CombatTerrainEnvironmentSourceRefs';

const MEGAMEK_TERRAIN_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_HEAT_SOURCE_VERSION = '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

function megamekHeatSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_HEAT_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_HEAT_SOURCE_VERSION,
  };
}

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

const MEGAMEK_TERRAIN_MOVEMENT_COST_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Terrain.movementCost maps additional movement costs for rubble, woods, snow, mud, swamp, ice, rough, sand, industrial terrain, and default zero-cost terrain.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/units/Terrain.java#L402-L604`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_PAVEMENT_ROAD_BRIDGE_MOVEMENT_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Compute.canMoveOnPavement treats pavement, paved roads, and bridges as movement surfaces that may change costs or override prohibited terrain.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L5955-L6004`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEKSTATION_TERRAIN_MOVEMENT_PROPERTIES_SOURCE_REF = {
  kind: 'mekstation-deviation',
  citation:
    'MekStation TERRAIN_PROPERTIES defines the simplified movementCostModifier table consumed by getHexMovementCost for every local TerrainType row.',
  url: 'src/types/gameplay/TerrainTypes.ts#L146-L488',
  sourceVersion: 'MekStation working-tree',
} satisfies ICombatFeatureSourceReference;

const MEKSTATION_WATER_GROUND_DISALLOW_SOURCE_REF = {
  kind: 'mekstation-deviation',
  citation:
    'MekStation getHexMovementCost treats walk and run entry into TerrainType.Water as impassable before movement side effects.',
  url: 'src/utils/gameplay/movement/calculations.ts#L170-L195',
  sourceVersion: 'MekStation working-tree',
} satisfies ICombatFeatureSourceReference;

const MEKSTATION_BUILDING_MOVEMENT_COST_SOURCE_REF = {
  kind: 'mekstation-deviation',
  citation:
    'MekStation currently models Building as a flat local movementCostModifier row without claiming MegaMek building-collapse movement parity.',
  url: 'src/types/gameplay/TerrainTypes.ts#L409-L428',
  sourceVersion: 'MekStation working-tree',
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_WATER_COOLING_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getHeatCapacityWithWater adds up to six underwater heat sinks after checking water depth, prone state, and destroyed or breached sink mounts.',
  'common/units/Mek.java',
  'L1616-L1654',
);

const MEGAMEK_HEAT_DISSIPATION_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver adds heat buildup, sinks heat with getHeatCapacityWithWater plus coolant-pod/radical heat-sink bonuses, reports the sink amount, and clears heatBuildup.',
  'server/totalWarfare/HeatResolver.java',
  'L383-L445',
);

const MEGAMEK_FIRE_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver adds 5 external heat for units spending a full round in fire terrain, halved by intact heat-dissipating armor.',
  'server/totalWarfare/HeatResolver.java',
  'L157-L177',
);

const MEGAMEK_EXTERNAL_HEAT_CAP_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver caps external heat at the configured/default 15 points and external cooling at 9 points before adding heat buildup.',
  'server/totalWarfare/HeatResolver.java',
  'L347-L357',
);

const MEKSTATION_TERRAIN_HEAT_PROPERTIES_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation TERRAIN_PROPERTIES defines heatEffect values for every local TerrainType row consumed by getTerrainHeatEffect.',
    'src/types/gameplay/TerrainTypes.ts',
    'L146-L488',
  );

const MEKSTATION_TERRAIN_HEAT_EFFECT_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation getTerrainHeatEffect and getGridTerrainHeatEffect translate occupied TerrainType rows into fire heat, water cooling, or no terrain heat effect.',
  'src/utils/gameplay/heat.ts',
  'L23-L68',
);

const MEKSTATION_RUNNER_TERRAIN_HEAT_PHASE_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation post-combat heat resolution consumes terrainHeatEffect as environmentHeat or waterBonus before computing generated heat and dissipation.',
    'src/simulation/runner/phases/postCombat.ts',
    'L340-L376',
  );

const pavementMovementTerrains = new Set<TerrainType>([
  TerrainType.Pavement,
  TerrainType.Road,
  TerrainType.Bridge,
]);

function integrated(
  id: string,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'integrated', evidence, sourceRefs }
    : { id, level: 'integrated', evidence };
}

function helperOnly(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'helper-only', evidence, gap, sourceRefs }
    : { id, level: 'helper-only', evidence, gap };
}

export const TERRAIN_TYPE_COMBAT_COVERAGE = Object.values(TerrainType);

export const TERRAIN_TYPES_WITH_PSR_GAPS = [] as readonly TerrainType[];

const terrainTypesWithPsrGaps = new Set<TerrainType>(
  TERRAIN_TYPES_WITH_PSR_GAPS,
);

function terrainMovementSourceRefs(
  terrain: TerrainType,
): readonly ICombatFeatureSourceReference[] {
  if (terrain === TerrainType.Water) {
    return [
      MEKSTATION_TERRAIN_MOVEMENT_PROPERTIES_SOURCE_REF,
      MEKSTATION_WATER_GROUND_DISALLOW_SOURCE_REF,
    ];
  }

  if (terrain === TerrainType.Building) {
    return [
      MEKSTATION_TERRAIN_MOVEMENT_PROPERTIES_SOURCE_REF,
      MEKSTATION_BUILDING_MOVEMENT_COST_SOURCE_REF,
    ];
  }

  if (pavementMovementTerrains.has(terrain)) {
    return [
      MEGAMEK_PAVEMENT_ROAD_BRIDGE_MOVEMENT_SOURCE_REF,
      MEKSTATION_TERRAIN_MOVEMENT_PROPERTIES_SOURCE_REF,
    ];
  }

  return [
    MEGAMEK_TERRAIN_MOVEMENT_COST_SOURCE_REF,
    MEKSTATION_TERRAIN_MOVEMENT_PROPERTIES_SOURCE_REF,
  ];
}

function terrainHeatSourceRefs(
  terrain: TerrainType,
): readonly ICombatFeatureSourceReference[] {
  const localHeatRefs = [
    MEKSTATION_TERRAIN_HEAT_PROPERTIES_SOURCE_REF,
    MEKSTATION_TERRAIN_HEAT_EFFECT_SOURCE_REF,
    MEKSTATION_RUNNER_TERRAIN_HEAT_PHASE_SOURCE_REF,
  ];

  if (terrain === TerrainType.Water) {
    return [
      MEGAMEK_WATER_COOLING_SOURCE_REF,
      MEGAMEK_HEAT_DISSIPATION_SOURCE_REF,
      ...localHeatRefs,
    ];
  }

  if (terrain === TerrainType.Fire) {
    return [
      MEGAMEK_FIRE_HEAT_SOURCE_REF,
      MEGAMEK_EXTERNAL_HEAT_CAP_SOURCE_REF,
      ...localHeatRefs,
    ];
  }

  return localHeatRefs;
}

function makeTerrainMovementEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  if (terrain === TerrainType.Water) {
    return integrated(
      terrain,
      'MekStation getHexMovementCost rejects walk/run water entry and validateMovement reports impassable terrain before side effects',
      terrainMovementSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Building) {
    return integrated(
      terrain,
      'MekStation getHexMovementCost consumes the local flat Building movementCostModifier before validateMovement/pathfinding apply the resulting MP cost',
      terrainMovementSourceRefs(terrain),
    );
  }

  return integrated(
    terrain,
    'getHexMovementCost consumes TERRAIN_PROPERTIES movementCostModifier and validateMovement/pathfinding apply the resulting MP cost',
    terrainMovementSourceRefs(terrain),
  );
}

function makeTerrainLosEntry(terrain: TerrainType): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];

  if (terrain === TerrainType.Building) {
    return integrated(
      terrain,
      'MekStation calculateLOS blocks this terrain through local blocksLOS and losBlockHeight rules while leaving richer MegaMek building-level handling visible in aggregate terrain LOS gaps',
      terrainLosSourceRefs(terrain),
    );
  }

  if (
    terrain === TerrainType.LightWoods ||
    terrain === TerrainType.HeavyWoods ||
    terrain === TerrainType.Smoke
  ) {
    return integrated(
      terrain,
      'MekStation calculateLOS accumulates woods and smoke density through intervening hexes and blocks LOS once cumulative density exceeds 2 while still relying on attack modifier rows for local to-hit effects',
      terrainLosSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Water) {
    return integrated(
      terrain,
      'MekStation calculateLOS blocks source-backed land-to-depth-2+ water endpoint sightlines while keeping non-endpoint water non-blocking for local attack modifier and heat rows',
      terrainLosSourceRefs(terrain),
    );
  }

  if (properties.blocksLOS) {
    return integrated(
      terrain,
      'calculateLOS consumes TERRAIN_PROPERTIES blocksLOS and losBlockHeight for blocking terrain',
      terrainLosSourceRefs(terrain),
    );
  }

  return integrated(
    terrain,
    'calculateLOS consumes TERRAIN_PROPERTIES and records this terrain as non-blocking',
    terrainLosSourceRefs(terrain),
  );
}

function makeTerrainAttackModifierEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];
  const hasAttackModifier =
    properties.toHitInterveningModifier !== 0 ||
    properties.toHitTargetInModifier !== 0;

  if (terrain === TerrainType.Water) {
    return integrated(
      terrain,
      'MekStation applies a local target-in water to-hit modifier through TERRAIN_PROPERTIES and runAttackPhase terrain modifier details',
      terrainAttackModifierSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Swamp) {
    return integrated(
      terrain,
      'MekStation applies a local target-in swamp to-hit modifier through TERRAIN_PROPERTIES and runAttackPhase terrain modifier details',
      terrainAttackModifierSourceRefs(terrain),
    );
  }

  if (!hasAttackModifier) {
    return integrated(
      terrain,
      'TERRAIN_PROPERTIES records no target-in or intervening to-hit modifier for this terrain type',
      terrainAttackModifierSourceRefs(terrain),
    );
  }

  return integrated(
    terrain,
    'runAttackPhase consumes TERRAIN_PROPERTIES target-in and intervening to-hit modifiers from target and LOS hexes',
    terrainAttackModifierSourceRefs(terrain),
  );
}

function makeTerrainHeatEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];

  if (terrain === TerrainType.Water) {
    return integrated(
      terrain,
      'runHeatPhase consumes occupied water terrain via getGridTerrainHeatEffect and applies the resulting waterBonus to dissipation',
      terrainHeatSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Fire) {
    return integrated(
      terrain,
      'runHeatPhase consumes occupied fire terrain via getGridTerrainHeatEffect and emits environment-sourced HeatGenerated',
      terrainHeatSourceRefs(terrain),
    );
  }

  if (properties.heatEffect === 0) {
    return integrated(
      terrain,
      'TERRAIN_PROPERTIES records no heat effect for this terrain type',
      terrainHeatSourceRefs(terrain),
    );
  }

  return integrated(
    terrain,
    'runHeatPhase consumes occupied terrain heat/cooling via getGridTerrainHeatEffect',
    terrainHeatSourceRefs(terrain),
  );
}

function makeTerrainPsrEntry(terrain: TerrainType): ICombatFeatureSupportEntry {
  if (terrainTypesWithPsrGaps.has(terrain)) {
    return helperOnly(
      terrain,
      'MekStation exposes local terrain PSR helpers while this TerrainType still lacks runner integration',
      'terrain PSRs are not wired into runner movement or damage resolution for this TerrainType',
      terrainPsrSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Building) {
    return integrated(
      terrain,
      'runMovementPhase queues source-backed building-collapse PSRs when explicit BattleMech tonnage exceeds a destination Building constructionFactor; richer damage-triggered, basement, top-floor, and WiGE collapse branches remain requirement-level gaps',
      terrainPsrSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Rubble) {
    return integrated(
      terrain,
      'runMovementPhase queues entering-rubble PSRs from movement terrain and resolvePSR applies Mountaineer relief when present',
      terrainPsrSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Water) {
    return integrated(
      terrain,
      'runMovementPhase queues depth-aware water entry and exit PSRs from movement terrain and resolvePSR applies Frogman relief when present',
      terrainPsrSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Pavement || terrain === TerrainType.Ice) {
    return integrated(
      terrain,
      'runMovementPhase queues local skidding PSRs for running turn steps on pavement or ice, with source-backed movement-before-skid distance modifiers',
      terrainPsrSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Swamp) {
    return integrated(
      terrain,
      'runMovementPhase queues source-backed swamp bog-down PSRs for non-jump BattleMech entry, emits UnitStuck immediately for jump entry, and resolvePSR applies Swamp Beast relief while failed bog-down PSRs set isStuck without UnitFell/PilotHit',
      terrainPsrSourceRefs(terrain),
    );
  }

  if (terrain === TerrainType.Rough) {
    return integrated(
      terrain,
      'runMovementPhase queues a local running-through-rough-terrain PSR when a running movement step enters rough terrain',
      terrainPsrSourceRefs(terrain),
    );
  }

  return integrated(
    terrain,
    'runMovementPhase does not queue a terrain-entry PSR for this TerrainType in the current local BattleMech movement model',
    terrainPsrSourceRefs(terrain),
  );
}

function terrainSupportMap(
  makeEntry: (terrain: TerrainType) => ICombatFeatureSupportEntry,
): Record<string, ICombatFeatureSupportEntry> {
  return Object.fromEntries(
    TERRAIN_TYPE_COMBAT_COVERAGE.map((terrain) => [
      terrain,
      makeEntry(terrain),
    ]),
  );
}

export const TERRAIN_TYPE_MOVEMENT_COMBAT_SUPPORT = terrainSupportMap(
  makeTerrainMovementEntry,
);

export const TERRAIN_TYPE_LOS_COMBAT_SUPPORT =
  terrainSupportMap(makeTerrainLosEntry);

export const TERRAIN_TYPE_ATTACK_MODIFIER_COMBAT_SUPPORT = terrainSupportMap(
  makeTerrainAttackModifierEntry,
);

export const TERRAIN_TYPE_HEAT_COMBAT_SUPPORT =
  terrainSupportMap(makeTerrainHeatEntry);

export const TERRAIN_TYPE_PSR_COMBAT_SUPPORT =
  terrainSupportMap(makeTerrainPsrEntry);
