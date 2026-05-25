import { TERRAIN_PROPERTIES, TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

const MEGAMEK_TERRAIN_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

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

const pavementMovementTerrains = new Set<TerrainType>([
  TerrainType.Pavement,
  TerrainType.Road,
  TerrainType.Bridge,
]);

const MEGAMEK_SWAMP_BOG_DOWN_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.checkBogDown queues an avoid-bogging-down piloting roll when a unit enters bog-down terrain and applies -1 Swamp Beast relief.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L8263-L8288',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Terrain.getBogDownModifier makes swamp a BattleMech bog-down terrain while mud does not bog down biped or quad movement modes.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Terrain.java#L616-L637',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

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

export const TERRAIN_TYPES_WITH_PSR_GAPS = [
  TerrainType.Building,
  TerrainType.Swamp,
] as const;

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

  if (properties.blocksLOS) {
    return integrated(
      terrain,
      'calculateLOS consumes TERRAIN_PROPERTIES blocksLOS and losBlockHeight for blocking terrain',
    );
  }

  return integrated(
    terrain,
    'calculateLOS consumes TERRAIN_PROPERTIES and records this terrain as non-blocking',
  );
}

function makeTerrainAttackModifierEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];
  const hasAttackModifier =
    properties.toHitInterveningModifier !== 0 ||
    properties.toHitTargetInModifier !== 0;

  if (!hasAttackModifier) {
    return integrated(
      terrain,
      'TERRAIN_PROPERTIES records no target-in or intervening to-hit modifier for this terrain type',
    );
  }

  return integrated(
    terrain,
    'runAttackPhase consumes TERRAIN_PROPERTIES target-in and intervening to-hit modifiers from target and LOS hexes',
  );
}

function makeTerrainHeatEntry(
  terrain: TerrainType,
): ICombatFeatureSupportEntry {
  const properties = TERRAIN_PROPERTIES[terrain];

  if (properties.heatEffect === 0) {
    return integrated(
      terrain,
      'TERRAIN_PROPERTIES records no heat effect for this terrain type',
    );
  }

  return integrated(
    terrain,
    'runHeatPhase consumes occupied terrain heat/cooling via getGridTerrainHeatEffect',
  );
}

function makeTerrainPsrEntry(terrain: TerrainType): ICombatFeatureSupportEntry {
  if (terrainTypesWithPsrGaps.has(terrain)) {
    if (terrain === TerrainType.Swamp) {
      return helperOnly(
        terrain,
        'MegaMek source shows BattleMechs entering swamp can make a bog-down piloting roll with Terrain Master: Swamp Beast relief',
        'MekStation has no bogged/stuck lifecycle state, so swamp bog-down must not be modeled as a normal failed-PSR fall',
        MEGAMEK_SWAMP_BOG_DOWN_SOURCE_REFS,
      );
    }

    return helperOnly(
      terrain,
      'PSRTrigger terrain factories and resolveAllPSRs can represent terrain-entry/skid checks',
      'building-collapse PSRs are not wired into runner movement or damage resolution',
    );
  }

  return integrated(
    terrain,
    'runMovementPhase queues applicable movement terrain PSRs, or no terrain-entry PSR is represented for this TerrainType',
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
