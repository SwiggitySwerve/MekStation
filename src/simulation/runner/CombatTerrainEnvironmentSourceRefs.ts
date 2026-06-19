import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  megamekPackageSourceRefWithLineAnchor as megamekTerrainSourceRef,
  mekstationDeviationSourceRefWithLineAnchor as mekstationDeviationSourceRef,
  type ICombatFeatureSourceReference,
} from './CombatFeatureSourceReference';
import { MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS } from './CombatToHitSourceRefs';

const MEGAMEK_TERRAIN_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

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

const MEGAMEK_LAND_UNDERWATER_LOS_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek LosEffects blocks LOS when one endpoint is on land and the other endpoint is underwater before divided or straight LOS tracing.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/LosEffects.java#L763-L768`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_INTERVENING_LOS_FEATURE_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek LosEffects.losForCoords evaluates intervening building elevation, water, woods, smoke, and other terrain effects before accumulating LOS blockers.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/LosEffects.java#L1210-L1455`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

export const MEGAMEK_TACOPS_DIAGRAM_LOS_SOURCE_REFS = [
  megamekTerrainSourceRef(
    'MegaMek LosEffects.calculateLos gates TacOps LOS1 diagram LOS through ADVANCED_COMBAT_TAC_OPS_LOS1 before selecting straight or divided LOS tracing.',
    'common/LosEffects.java',
    'L783-L790',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losDivided evaluates non-split coordinates and left/right split-side LOS effects separately before choosing defender-favorable cover or blocking.',
    'common/LosEffects.java',
    'L993-L1040',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losForCoords computes TacOps diagram losElevation and blocks terrain when totalEl >= losElevation instead of using only non-diagram endpoint-height comparisons.',
    'common/LosEffects.java',
    'L1310-L1329',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_DROPSHIP_SPECIAL_BUILDING_LOS_SOURCE_REFS = [
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losForCoords considers BLDG_ELEV, FUEL_TANK_ELEV, and same-hex grounded Dropship entities as LOS building elevation, treating grounded Dropships as level-10 cover.',
    'common/LosEffects.java',
    'L1264-L1293',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losForCoords distinguishes hard buildings from soft buildings through BLDG_CF while recording building LOS blockers.',
    'common/LosEffects.java',
    'L1331-L1339',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losForCoords records damageable cover providers for partial-cover situations, including grounded Dropships and buildings.',
    'common/LosEffects.java',
    'L1488-L1502',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_RUBBLE_PSR_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.checkRubbleMove queues the entering-rubble piloting roll, applies terrain and difficult-terrain modifiers, and applies -1 Mountaineer relief.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L8237-L8256`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_WATER_PSR_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.checkWaterMove gates depth-1+ water entry, applies depth-based PSR modifiers, and applies -1 Frogman relief for Mek or ProtoMek units in depth-2+ water.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L8299-L8358`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_SKID_PSR_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.checkSkid queues skidding PSRs for turning on ice, black ice, or pavement while running or sprinting, then applies difficult-terrain modifiers.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L8169-L8231`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_SKID_DISTANCE_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.getMovementBeforeSkidPSRModifier maps distance moved to the skidding PSR modifier and subtracts one for Maneuvering Ace.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L8638-L8661`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_SWAMP_BOG_DOWN_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Entity.checkBogDown queues an avoid-bogging-down piloting roll when a unit enters bog-down terrain and applies -1 Swamp Beast relief.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L8263-L8288`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_SWAMP_BOG_DOWN_TERRAIN_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek Terrain.getBogDownModifier makes swamp a BattleMech bog-down terrain while mud does not bog down biped or quad movement modes.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/common/units/Terrain.java#L616-L637`,
  sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
} satisfies ICombatFeatureSourceReference;

const MEGAMEK_BUILDING_COLLAPSE_SOURCE_REF = {
  kind: 'megamek-source',
  citation:
    'MegaMek BuildingCollapseHandler.checkForCollapse resolves overloaded or damaged building collapse, basement collapse, and top-floor collapse before applying collapseBuilding.',
  url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/BuildingCollapseHandler.java#L104-L275`,
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

const MEKSTATION_TERRAIN_PSR_PROPERTIES_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation TERRAIN_PROPERTIES defines local TerrainType metadata for every row, while terrain PSRs are queued by the movement runner rather than this static table.',
    'src/types/gameplay/TerrainTypes.ts',
    'L146-L488',
  );

const MEKSTATION_TERRAIN_PSR_RUNNER_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation queueMovementTerrainPSRs queues water entry/exit, rubble, running rough terrain, ice, swamp bog-down, overloaded building-collapse, and pavement-or-ice skidding PSRs from movement-step terrain features, and emits UnitStuck for jump-entry bog-down.',
  'src/simulation/runner/phases/movementTerrainPsr.ts',
  'L75-L325',
);

const MEKSTATION_TERRAIN_PSR_FACTORY_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation terrain PSR factories define rubble, running-rough, ice, water, swamp bog-down, skidding, and movement-step stamped building-collapse pending PSRs plus local water-depth and swamp-depth modifiers.',
  'src/utils/gameplay/pilotingSkillRolls/environmentFactories.ts',
  'L94-L245',
);

const MEKSTATION_TERRAIN_PSR_CLASSIFICATION_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation PSR resolution classifies terrain PSRs for quirk handling before resolving terrain and pilot-ability modifiers.',
    'src/utils/gameplay/pilotingSkillRolls/modifierResolution.ts',
    'L75-L92',
  );

const MEKSTATION_TERRAIN_PSR_SPA_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation PSR resolution applies Maneuvering Ace to skidding, Frogman to entering-water, Mountaineer to entering-rubble, and Swamp Beast to swamp bog-down pending PSRs.',
  'src/utils/gameplay/pilotingSkillRolls/modifierResolution.ts',
  'L326-L377',
);

const MEKSTATION_LOS_FEATURE_PARSE_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation parseTerrainFeatures turns a terrain string into local TerrainType feature rows before LOS checks.',
  'src/utils/gameplay/lineOfSight.ts',
  'L65-L69',
);

const MEKSTATION_LOS_BLOCKING_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation calculateLOS gates land-to-underwater endpoint sightlines, exposes minimumWaterDepth, then checks intervening hexes for direct blocks and cumulative woods or smoke density; destroyed-unit markers never block LOS per align-wreck-los-with-megamek.',
  'src/utils/gameplay/lineOfSight.ts',
  'L451-L789',
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
    'L13-L55',
  );

const MEKSTATION_RUNNER_TERRAIN_TO_HIT_PHASE_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation runAttackPhase adds target and intervening terrain modifiers into final AttackDeclared to-hit math.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L969-L1004',
  );

const sourceBackedAttackModifierTerrains = new Set<TerrainType>([
  TerrainType.Building,
  TerrainType.HeavyIndustrial,
  TerrainType.HeavyWoods,
  TerrainType.LightWoods,
  TerrainType.PlantedField,
  TerrainType.Smoke,
]);

const megaMekComparedLosTerrains = new Set<TerrainType>([
  TerrainType.Building,
  TerrainType.HeavyIndustrial,
  TerrainType.HeavyWoods,
  TerrainType.LightWoods,
  TerrainType.PlantedField,
  TerrainType.Smoke,
  TerrainType.Water,
]);

export const LOCAL_TERRAIN_PSR_SOURCE_REFS = [
  MEKSTATION_TERRAIN_PSR_PROPERTIES_SOURCE_REF,
  MEKSTATION_TERRAIN_PSR_RUNNER_SOURCE_REF,
  MEKSTATION_TERRAIN_PSR_FACTORY_SOURCE_REF,
  MEKSTATION_TERRAIN_PSR_CLASSIFICATION_SOURCE_REF,
  MEKSTATION_TERRAIN_PSR_SPA_SOURCE_REF,
];

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
    const sourceRefs = [
      MEGAMEK_CUMULATIVE_LOS_BLOCKING_SOURCE_REF,
      MEGAMEK_INTERVENING_LOS_FEATURE_SOURCE_REF,
      ...localLosRefs,
    ];

    return terrain === TerrainType.Water
      ? [MEGAMEK_LAND_UNDERWATER_LOS_SOURCE_REF, ...sourceRefs]
      : sourceRefs;
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

export function terrainPsrSourceRefs(
  terrain: TerrainType,
): readonly ICombatFeatureSourceReference[] {
  if (terrain === TerrainType.Rubble) {
    return [MEGAMEK_RUBBLE_PSR_SOURCE_REF, ...LOCAL_TERRAIN_PSR_SOURCE_REFS];
  }

  if (terrain === TerrainType.Water) {
    return [MEGAMEK_WATER_PSR_SOURCE_REF, ...LOCAL_TERRAIN_PSR_SOURCE_REFS];
  }

  if (terrain === TerrainType.Pavement || terrain === TerrainType.Ice) {
    return [
      MEGAMEK_SKID_PSR_SOURCE_REF,
      MEGAMEK_SKID_DISTANCE_SOURCE_REF,
      ...LOCAL_TERRAIN_PSR_SOURCE_REFS,
    ];
  }

  if (terrain === TerrainType.Swamp) {
    return [
      MEGAMEK_SWAMP_BOG_DOWN_SOURCE_REF,
      MEGAMEK_SWAMP_BOG_DOWN_TERRAIN_SOURCE_REF,
      ...LOCAL_TERRAIN_PSR_SOURCE_REFS,
    ];
  }

  if (terrain === TerrainType.Building) {
    return [
      MEGAMEK_BUILDING_COLLAPSE_SOURCE_REF,
      ...LOCAL_TERRAIN_PSR_SOURCE_REFS,
    ];
  }

  return LOCAL_TERRAIN_PSR_SOURCE_REFS;
}
