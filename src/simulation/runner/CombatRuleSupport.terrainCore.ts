import {
  integrated,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  MEGAMEK_EXTERNAL_HEAT_CAP_SOURCE_REF,
  MEGAMEK_EXTREME_TEMPERATURE_HEAT_SOURCE_REF,
  MEGAMEK_FIRE_HEAT_SOURCE_REF,
  MEGAMEK_HEAT_DISSIPATION_SOURCE_REF,
  MEGAMEK_WATER_COOLING_SOURCE_REF,
  MEKSTATION_ATMOSPHERE_HEAT_SOURCE_REF,
} from './CombatRuleSupport.heat';
import {
  megamekTerrainSourceRef,
  mekstationDeviationSourceRef,
} from './CombatRuleSupport.sourceRefs';
import {
  MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
  MEGAMEK_PARTIAL_COVER_TO_HIT_SOURCE_REFS,
  MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS,
} from './CombatToHitSourceRefs';

const MEKSTATION_ENVIRONMENTAL_TO_HIT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation IEnvironmentalConditions carries explicit blowingSand state alongside light, precipitation, fog, wind, gravity, atmosphere, and temperature.',
    'src/types/gameplay/EnvironmentalConditions.ts',
    'L17-L26',
  ),
  mekstationDeviationSourceRef(
    'MekStation calculateEnvironmentalModifiers applies Blowing Sand only when blowingSand is active and the attack weapon is classified as energy.',
    'src/utils/gameplay/environmentalModifiers.ts',
    'L49-L352',
  ),
  mekstationDeviationSourceRef(
    'MekStation runAttackPhase passes energy-weapon and missile-weapon classification into environmental to-hit modifier calculation before emitting AttackDeclared.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1044-L1062',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_TERRAIN_TYPE_SOURCE_REF = megamekTerrainSourceRef(
  'MegaMek Terrains enumerates core terrain ids for woods, water, rough, rubble, swamp, ice, fire, and smoke with level semantics.',
  'common/units/Terrains.java',
  'L53-L86',
);

const MEGAMEK_TERRAIN_MOVEMENT_COST_SOURCE_REF = megamekTerrainSourceRef(
  'MegaMek Terrain.movementCost maps additional movement cost for rubble, woods, snow, mud, swamp, ice, rough, sand, and industrial terrain by movement mode and pilot abilities.',
  'common/units/Terrain.java',
  'L402-L604',
);
const MEKSTATION_WATER_GROUND_DISALLOW_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation getHexMovementCost currently treats walk/run entry into TerrainType.Water as impassable before path side effects.',
    'src/utils/gameplay/movement/calculations.ts',
    'L170-L195',
  );

export const TERRAIN_MOVEMENT_COST_COMBAT_SUPPORT = {
  'terrain-movement-costs': integrated(
    'terrain-movement-costs',
    'validateMovement consumes per-motive, per-level TERRAIN_PROPERTIES entry costs summed across every terrain feature in the hex (audit 2026-06-09 C-3/C-4)',
    [MEGAMEK_TERRAIN_TYPE_SOURCE_REF, MEGAMEK_TERRAIN_MOVEMENT_COST_SOURCE_REF],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const TERRAIN_ENVIRONMENT_CONDITION_COMBAT_SUPPORT = {
  'terrain-partial-cover': integrated(
    'terrain-partial-cover',
    'runAttackPhase derives partial cover from target hex terrain and represented horizontal cover from the shared terrain cover helper',
    MEGAMEK_PARTIAL_COVER_TO_HIT_SOURCE_REFS,
  ),
  'terrain-to-hit-features': integrated(
    'terrain-to-hit-features',
    'runAttackPhase applies target-in terrain modifiers from the target hex and non-blocking intervening terrain feature modifiers from LOS hexes',
    MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS,
  ),
  'water-ground-disallow': integrated(
    'water-ground-disallow',
    'MekStation-local movement validation rejects walk/run entry into TerrainType.Water before path side effects',
    [MEKSTATION_WATER_GROUND_DISALLOW_SOURCE_REF],
  ),
  'water-cooling': integrated(
    'water-cooling',
    'runHeatPhase consumes occupied water terrain via getGridTerrainHeatEffect and emits waterBonus in the HeatDissipated breakdown',
    [MEGAMEK_HEAT_DISSIPATION_SOURCE_REF, MEGAMEK_WATER_COOLING_SOURCE_REF],
  ),
  'fire-heat': integrated(
    'fire-heat',
    'runHeatPhase consumes occupied fire terrain via getGridTerrainHeatEffect and emits environment-sourced HeatGenerated',
    [MEGAMEK_FIRE_HEAT_SOURCE_REF, MEGAMEK_EXTERNAL_HEAT_CAP_SOURCE_REF],
  ),
  'smoke-to-hit': integrated(
    'smoke-to-hit',
    'runAttackPhase applies smoke as both a target-in terrain modifier and non-blocking intervening terrain modifier',
    MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS,
  ),
  fog: integrated(
    'fog',
    'runAttackPhase consumes calculateEnvironmentalModifiers fog output in AttackDeclared to-hit modifiers',
    MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
  ),
  night: integrated(
    'night',
    'runAttackPhase consumes calculateEnvironmentalModifiers light output in AttackDeclared to-hit modifiers',
    MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
  ),
  wind: integrated(
    'wind',
    'runAttackPhase consumes missile wind to-hit modifiers and runMovementPhase passes environmental wind into validateMovement jump-distance reduction',
    MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
  ),
  'extreme-temperature': integrated(
    'extreme-temperature',
    'runHeatPhase and resolveHeatPhase consume getTemperatureHeatModifier through calculateEnvironmentalHeatModifier',
    [
      MEGAMEK_EXTREME_TEMPERATURE_HEAT_SOURCE_REF,
      MEGAMEK_EXTERNAL_HEAT_CAP_SOURCE_REF,
    ],
  ),
  atmosphere: integrated(
    'atmosphere',
    'runHeatPhase and resolveHeatPhase consume getAtmosphereHeatModifier through calculateEnvironmentalHeatModifier',
    [MEKSTATION_ATMOSPHERE_HEAT_SOURCE_REF],
  ),
  dust: integrated(
    'dust',
    'runAttackPhase consumes environmental blowingSand state and applies the source-backed +1 modifier to energy-weapon attacks while non-energy weapons receive no blowing-sand modifier',
    [
      ...MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
      ...MEKSTATION_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
