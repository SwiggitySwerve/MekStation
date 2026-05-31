import {
  MOVEMENT_ENHANCEMENT_DEFINITIONS,
  MovementEnhancementType,
} from '@/types/construction/MovementEnhancement';
import { RangeBracket } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import {
  MEGAMEK_ELEVATION_MOVEMENT_SOURCE_REFS,
  MEGAMEK_FACING_MOVEMENT_SOURCE_REFS,
  MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
  MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS,
  MEGAMEK_JUMP_MOVEMENT_SOURCE_REFS,
  MEGAMEK_OCCUPANCY_MOVEMENT_SOURCE_REFS,
  MEGAMEK_RUN_MOVEMENT_SOURCE_REFS,
  MEGAMEK_STAND_MOVEMENT_SOURCE_REFS,
  MEGAMEK_TORSO_TWIST_SOURCE_REFS,
  MEGAMEK_WALK_MOVEMENT_SOURCE_REFS,
} from './CombatMovementSourceRefs';
import { MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS } from './CombatPilotModifierSourceRefs';
import {
  MEGAMEK_EXTREME_RANGE_BRACKET_SOURCE_REFS,
  MEGAMEK_MINIMUM_RANGE_SOURCE_REFS,
  MEGAMEK_OUT_OF_RANGE_SOURCE_REFS,
  MEGAMEK_STANDARD_RANGE_BRACKET_SOURCE_REFS,
} from './CombatRangeSourceRefs';
import { terrainLosSourceRefs } from './CombatTerrainEnvironmentSourceRefs';
import {
  MEGAMEK_ACTUATOR_DAMAGE_TO_HIT_SOURCE_REFS,
  MEGAMEK_ATTACKER_MOVEMENT_TO_HIT_SOURCE_REFS,
  MEGAMEK_ATTACKER_PRONE_TO_HIT_SOURCE_REFS,
  MEGAMEK_ECM_GUIDANCE_TO_HIT_SOURCE_REFS,
  MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
  MEGAMEK_GUNNERY_TO_HIT_SOURCE_REFS,
  MEGAMEK_HEAT_TO_HIT_SOURCE_REFS,
  MEGAMEK_INDIRECT_FIRE_TO_HIT_SOURCE_REFS,
  MEGAMEK_PARTIAL_COVER_TO_HIT_SOURCE_REFS,
  MEGAMEK_PILOT_WOUNDS_TO_HIT_SOURCE_REFS,
  MEGAMEK_SENSOR_DAMAGE_TO_HIT_SOURCE_REFS,
  MEGAMEK_TARGET_IMMOBILE_TO_HIT_SOURCE_REFS,
  MEGAMEK_TARGET_MOVEMENT_TO_HIT_SOURCE_REFS,
  MEGAMEK_TARGET_PRONE_TO_HIT_SOURCE_REFS,
  MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS,
} from './CombatToHitSourceRefs';

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

const MEGAMEK_HEAT_SOURCE_VERSION = '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_TO_HIT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_PHYSICAL_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_MOVEMENT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_TERRAIN_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';

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

function megamekPhysicalSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
  };
}

function megamekTerrainSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TERRAIN_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_TERRAIN_SOURCE_VERSION,
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

const MEGAMEK_WEAPON_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek WeaponHandler.addHeat adds weapon heat to heatBuildup for possible attacks and skips impossible to-hit attacks.',
  'common/weapons/handlers/WeaponHandler.java',
  'L1924-L1942',
);

const MEGAMEK_MOVEMENT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek TWGameManager.addMovementHeat adds heat for standing, walking, running, jumping, sprinting, swimming, and damaged radical heat sinks.',
  'server/totalWarfare/TWGameManager.java',
  'L8200-L8231',
);

const MEGAMEK_MEK_STANDING_WALK_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getStandingHeat and getWalkHeat delegate BattleMech standing/walking heat to the engine and damaged coolant system state.',
  'common/units/Mek.java',
  'L943-L989',
);

const MEGAMEK_MEK_RUN_SPRINT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getRunHeat and getSprintHeat delegate running/sprinting heat to the engine and add damaged coolant or evasion heat where applicable.',
  'common/units/Mek.java',
  'L1034-L1077',
);

const MEGAMEK_ENGINE_RUN_SPRINT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Engine.getRunHeat and getSprintHeat provide the normal-engine 2 run heat and 3 sprint heat values used by BattleMechs without working supercooling myomer.',
  'common/equipment/Engine.java',
  'L693-L713',
);

const MEGAMEK_MEK_JUMP_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getJumpHeat computes BattleMech jump heat from moved MP, damaged coolant state, partial-wing reduction, and jump-jet type.',
  'common/units/Mek.java',
  'L1281-L1302',
);

const MEGAMEK_ENGINE_CRIT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getEngineCritHeat adds 5 heat per fusion-engine critical while the Mek is not shutdown and includes partial-repair heat.',
  'common/units/Mek.java',
  'L1444-L1468',
);

const MEGAMEK_MEK_HEAT_CAPACITY_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getHeatCapacity counts active heat sinks, double/prototype sinks, partial-wing bonus, radical heat sinks, and damaged/coolant-failure reductions.',
  'common/units/Mek.java',
  'L1552-L1612',
);

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

const MEGAMEK_EXTREME_TEMPERATURE_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver.adjustHeatExtremeTemp adds or subtracts external heat for planetary temperature outside the 50/-30 thresholds.',
  'server/totalWarfare/HeatResolver.java',
  'L1253-L1285',
);

const MEGAMEK_HEAT_TO_HIT_THRESHOLD_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Entity.getHeatFiringModifier applies heat firing modifiers at heat 8/13/17/24 and optional TacOps thresholds 33/41/48, with Some Like It Hot relief.',
  'common/units/Entity.java',
  'L4188-L4216',
);

const MEKSTATION_ATMOSPHERE_HEAT_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation calculateEnvironmentalHeatModifier applies local atmosphere heat-dissipation adjustments alongside temperature modifiers.',
  'src/utils/gameplay/environmentalModifiers.ts',
  'L257-L359',
);

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

const MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS = [
  megamekTerrainSourceRef(
    'MegaMek Minefield represents minefield state separately from terrain ids, including type, density, sea mine, and depth fields.',
    'common/equipment/Minefield.java',
    'L47-L125',
  ),
  megamekTerrainSourceRef(
    'MegaMek TWGameManager.enterMinefield resolves minefield detonations when an entity enters a mined coordinate.',
    'server/totalWarfare/TWGameManager.java',
    'L7348-L7434',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation TerrainType enum currently has no Dust or Mines entry; dust storms and minefields are not first-class battlefield terrain conditions.',
  'src/types/gameplay/TerrainTypes.ts',
  'L15-L33',
);

const MEKSTATION_WATER_GROUND_DISALLOW_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation getHexMovementCost currently treats walk/run entry into TerrainType.Water as impassable before path side effects.',
    'src/utils/gameplay/movement/calculations.ts',
    'L170-L195',
  );

const MEGAMEK_HEAT_AMMO_EXPLOSION_ROLL_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver checks heat >= 19 and routes failed ammo-explosion checks through explodeAmmoFromHeat',
  'server/totalWarfare/HeatResolver.java',
  'L1182-L1217',
);

const MEGAMEK_HEAT_STARTUP_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver automatically restarts shutdown Meks below heat 14 and rolls startup at heat 14+ when they are not manually shut down',
  'server/totalWarfare/HeatResolver.java',
  'L500-L547',
);

const MEGAMEK_HEAT_SHUTDOWN_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver applies avoidable shutdown checks at heat 14+ and automatic shutdown at the default heat 30 threshold',
  'server/totalWarfare/HeatResolver.java',
  'L561-L637',
);

const MEGAMEK_HEAT_AMMO_SELECTION_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek TWGameManager.explodeAmmoFromHeat selects the most destructive hittable explosive ammo bin before explosion resolution',
  'server/totalWarfare/TWGameManager.java',
  'L22855-L22923',
);

const MEGAMEK_HEAT_PILOT_DAMAGE_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver applies deterministic life-support heat pilot damage at heat 15/25+ and resolves crew death after heat damage',
  'server/totalWarfare/HeatResolver.java',
  'L734-L829',
);

const MEGAMEK_HEAT_MAXTECH_PILOT_DAMAGE_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver applies optional MaxTech heat-scale pilot damage avoid rolls at heat 32/39/47+ and subtracts hotDogMod from the avoid number',
  'server/totalWarfare/HeatResolver.java',
  'L795-L817',
);

const MEGAMEK_HEAT_MAXTECH_CRITICAL_DAMAGE_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver applies optional MaxTech heat-scale critical damage avoid rolls at heat 36/44+, subtracts hotDogMod, and routes failed rolls to one random BattleMech critical location',
  'server/totalWarfare/HeatResolver.java',
  'L847-L862',
);

const MEGAMEK_HEAT_THRESHOLD_SOURCE_REFS = [
  MEGAMEK_HEAT_TO_HIT_THRESHOLD_SOURCE_REF,
  ...MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS,
  MEGAMEK_HEAT_SHUTDOWN_SOURCE_REF,
  MEGAMEK_HEAT_AMMO_EXPLOSION_ROLL_SOURCE_REF,
  MEGAMEK_HEAT_PILOT_DAMAGE_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_SECONDARY_TARGET_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Compute.getSecondaryTargetMod applies the secondary-target modifier and reduces it for Multi-Tasker.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L2494-L2615`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek OptionsConstants defines GUNNERY_MULTI_TASKER as multi_tasker.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/options/OptionsConstants.java#L192-L200`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_CALLED_SHOT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeAttackerToHitMods applies +3 TacOps called-shot modifiers for high, low, left, and right called shots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeAttackerToHitMods.java#L108-L138`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_C3_RANGE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Compute.getRangeMods asks ComputeC3Spotter for a valid spotter and applies the best C3 range bracket when it improves the attack range.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/compute/Compute.java#L1560-L1700`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeC3Spotter returns the first ECM-connected C3 spotter without LOS gating under default rules, while PLAYTEST_3 adds spotter LOS gating.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/compute/ComputeC3Spotter.java#L214-L250`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeC3Spotter rejects shutdown/off-board C3 attackers and shutdown/off-board/transported C3 spotters before range sharing.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/compute/ComputeC3Spotter.java#L154-L197`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.hasC3M, hasC3S, and hasC3i require mounted C3 equipment to be non-inoperable before C3 can be used.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6122-L6305`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_C3_EQUIPMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.hasC3M detects C3 master and boosted master weapon flags while Entity.hasC3S detects C3 slave and boosted slave misc flags.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6120-L6206`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity.hasC3i detects non-inoperable misc equipment carrying the C3i flag.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L6296-L6305`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek C3 Master weapon defines standard master lookup names and the C3 master flag.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/weapons/c3/ISC3M.java#L54-L82`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek boosted C3 Master weapon defines boosted master lookup names and the boosted C3 master flag.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/weapons/c3/ISC3MBS.java#L54-L84`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MiscType creates C3 Slave, C3i, Boosted Slave, and Battle Armor C3 variants with distinct Mek versus BA equipment flags.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/equipment/MiscType.java#L4308-L4504`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_HULL_DOWN_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek ComputeTerrainMods applies WeaponAttackAction.HullDown as a +2 terrain modifier for hull-down Mek targets with LOS cover.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/actions/compute/ComputeTerrainMods.java#L215-L218`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_TSM_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek BipedMek.getWalkMP applies active TSM as +2 walk MP at heat 9+ after heat movement penalties.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/BipedMek.java#L258-L268`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek QuadMek.getWalkMP applies the same active TSM +2 walk MP gate for quad BattleMechs.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/QuadMek.java#L342-L352`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getRunMP derives running MP from the heat/TSM-adjusted walk MP.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L993-L1007`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_TSM_PHYSICAL_DAMAGE_SOURCE_REFS = [
  megamekPhysicalSourceRef(
    'MegaMek KickAttackAction.getDamageFor doubles kick damage with active TSM before talon, melee-specialist, underwater, and infantry adjustments.',
    'common/actions/KickAttackAction.java',
    'L123-L138',
  ),
  megamekPhysicalSourceRef(
    'MegaMek PunchAttackAction.getDamageFor doubles punch damage with active TSM before melee-specialist, underwater, and infantry adjustments.',
    'common/actions/PunchAttackAction.java',
    'L452-L460',
  ),
  megamekPhysicalSourceRef(
    'MegaMek ClubAttackAction.getDamageFor doubles active-TSM club damage while explicitly excluding saws, pile drivers, shields, wrecking balls, flails, active vibroblades, and other fixed-damage tools.',
    'common/actions/ClubAttackAction.java',
    'L187-L202',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_UNDERWATER_PHYSICAL_DAMAGE_SOURCE_REFS = [
  megamekPhysicalSourceRef(
    'MegaMek KickAttackAction.getDamageFor halves wet-location kick damage and rounds up.',
    'common/actions/KickAttackAction.java',
    'L135-L138',
  ),
  megamekPhysicalSourceRef(
    'MegaMek PunchAttackAction.getDamageFor halves wet-location punch damage and rounds up.',
    'common/actions/PunchAttackAction.java',
    'L457-L460',
  ),
  megamekPhysicalSourceRef(
    'MegaMek ClubAttackAction.getDamageFor halves wet-location club damage after resolving the mounted club location.',
    'common/actions/ClubAttackAction.java',
    'L203-L211',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getRunMP asks armed MASC/Supercharger boosters to calculate boosted running MP from current walk MP.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L993-L1007`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MPBoosters.calculateRunMP doubles walk MP for MASC xor Supercharger and uses ceil(walk MP * 2.5) when both are active.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/enums/MPBoosters.java#L79-L86`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePathHandler invokes MASC and Supercharger failure checks during movement resolution when the path has active boosters.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L1507-L1519`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity stores the standard MASC/Supercharger fixed failure target-number table used by prior-use turn count.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L858-L860`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity derives MASC and Supercharger failure targets from previous consecutive-use turn counters, then increments used boosters, clears active-use flags, and applies the idle decay marker.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13660-L13770`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MASC failure applies one random hittable critical slot in each leg and explicitly does not destroy the MASC system.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13966-L13976`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Supercharger failure rolls a separate engine-damage table, damages the Supercharger slot, and then applies the resulting critical slots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L6022-L6048`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5944-L5974`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L5994-L6024`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_PARTIAL_WING_MOVEMENT_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getJumpMP applies a Partial Wing jump bonus only when the Mek already has positive jump MP, and getPartialWingJumpBonus subtracts bad torso critical slots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L1081-L1231`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Mek.getJumpHeat subtracts the Partial Wing jump bonus from moved MP before engine jump heat is applied.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L1281-L1301`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MiscType creates IS and Clan Partial Wing equipment with Mek and F_PARTIAL_WING flags.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/equipment/MiscType.java#L2278-L2314`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_DFA_TARGET_CLASS_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek DfaAttackAction.toHit applies +3 for Infantry targets and +1 for Battle Armor targets.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/actions/DfaAttackAction.java#L340-L345`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_DFA_PILOTING_DIFFERENTIAL_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek DfaAttackAction.toHit applies attacker piloting minus target piloting as the piloting skill differential.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_TO_HIT_SOURCE_VERSION}/megamek/src/megamek/common/actions/DfaAttackAction.java#L354-L357`,
    sourceVersion: MEGAMEK_TO_HIT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const RUNNER_RANGE_BRACKET_COMBAT_SUPPORT = {
  [RangeBracket.Short]: integrated(
    RangeBracket.Short,
    'runAttackPhase emits AttackDeclared.range="short" with range modifier 0',
    MEGAMEK_STANDARD_RANGE_BRACKET_SOURCE_REFS,
  ),
  [RangeBracket.Medium]: integrated(
    RangeBracket.Medium,
    'runAttackPhase emits AttackDeclared.range="medium" with range modifier 2',
    MEGAMEK_STANDARD_RANGE_BRACKET_SOURCE_REFS,
  ),
  [RangeBracket.Long]: integrated(
    RangeBracket.Long,
    'runAttackPhase emits AttackDeclared.range="long" with range modifier 4',
    MEGAMEK_STANDARD_RANGE_BRACKET_SOURCE_REFS,
  ),
  [RangeBracket.Extreme]: integrated(
    RangeBracket.Extreme,
    'IWeapon.extremeRange hydrates from catalog/adapter data and runAttackPhase emits AttackDeclared.range="extreme" with range modifier 6',
    MEGAMEK_EXTREME_RANGE_BRACKET_SOURCE_REFS,
  ),
  [RangeBracket.OutOfRange]: integrated(
    RangeBracket.OutOfRange,
    'runAttackPhase emits AttackInvalid before heat, ammo, or damage side effects',
    MEGAMEK_OUT_OF_RANGE_SOURCE_REFS,
  ),
} satisfies Record<RangeBracket, ICombatFeatureSupportEntry>;

export const RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT = {
  gunnery: integrated(
    'gunnery',
    'runAttackPhase emits AttackDeclared modifiers with IUnitGameState.gunnery',
    MEGAMEK_GUNNERY_TO_HIT_SOURCE_REFS,
  ),
  range: integrated(
    'range',
    'runAttackPhase derives short/medium/long brackets and emits AttackDeclared.range',
    [
      ...MEGAMEK_STANDARD_RANGE_BRACKET_SOURCE_REFS,
      ...MEGAMEK_EXTREME_RANGE_BRACKET_SOURCE_REFS,
    ],
  ),
  'minimum-range': integrated(
    'minimum-range',
    'runAttackPhase passes baseWeapon.minRange into calculateToHit',
    MEGAMEK_MINIMUM_RANGE_SOURCE_REFS,
  ),
  'attacker-movement': integrated(
    'attacker-movement',
    'runAttackPhase emits AttackDeclared modifiers with attacker movementThisTurn, and runPhysicalAttackPhase feeds attacker movement into charge to-hit',
    MEGAMEK_ATTACKER_MOVEMENT_TO_HIT_SOURCE_REFS,
  ),
  'target-movement': integrated(
    'target-movement',
    'runAttackPhase emits AttackDeclared modifiers with target movementThisTurn, hexesMovedThisTurn, and explicit target sprintedThisTurn relief, and runPhysicalAttackPhase feeds target TMM into physical to-hit',
    MEGAMEK_TARGET_MOVEMENT_TO_HIT_SOURCE_REFS,
  ),
  'target-evasion': integrated(
    'target-evasion',
    'calculateToHit and calculatePhysicalToHit apply explicit non-prone target isEvading bonuses, defaulting to +1 and consuming explicit 0..3 evasionBonus Skilled Evasion state, while declareAttack, declarePhysicalAttack, runAttackPhase, and runPhysicalAttackPhase hydrate IUnitGameState.isEvading/evasionBonus into ranged and physical to-hit payloads',
    MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS,
  ),
  heat: integrated(
    'heat',
    'runAttackPhase emits AttackDeclared modifiers with attacker heat',
    MEGAMEK_HEAT_TO_HIT_SOURCE_REFS,
  ),
  'environmental-conditions': integrated(
    'environmental-conditions',
    'runAttackPhase appends calculateEnvironmentalModifiers for light, precipitation, fog, and missile wind to AttackDeclared modifiers',
    MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
  ),
  'partial-cover': integrated(
    'partial-cover',
    'runAttackPhase emits AttackDeclared partial-cover modifiers from target hex terrain',
    MEGAMEK_PARTIAL_COVER_TO_HIT_SOURCE_REFS,
  ),
  'physical-dfa-target-class': integrated(
    'physical-dfa-target-class',
    'calculateDFAToHit consumes targetUnitType, and eligibility, event-sourced resolution, and runner physical resolution apply source-backed DFA Infantry/Battle Armor target-class modifiers',
    MEGAMEK_DFA_TARGET_CLASS_SOURCE_REFS,
  ),
  'physical-dfa-piloting-differential': integrated(
    'physical-dfa-piloting-differential',
    'calculateDFAToHit consumes targetPilotingSkill, and eligibility, event-sourced resolution, and runner physical resolution apply source-backed DFA attacker-minus-target piloting differential',
    MEGAMEK_DFA_PILOTING_DIFFERENTIAL_SOURCE_REFS,
  ),
  'target-prone': integrated(
    'target-prone',
    'runAttackPhase emits AttackDeclared modifiers with target prone state',
    MEGAMEK_TARGET_PRONE_TO_HIT_SOURCE_REFS,
  ),
  'target-immobile': integrated(
    'target-immobile',
    'runAttackPhase emits AttackDeclared immobile modifiers from target shutdown state',
    MEGAMEK_TARGET_IMMOBILE_TO_HIT_SOURCE_REFS,
  ),
  'indirect-fire': integrated(
    'indirect-fire',
    'runAttackPhase applies validateLineOfSightForAttack indirect-fire penalty to declared/resolved TN, and explicit sprinting/evading spotter state is rejected before LOS-spotter election',
    MEGAMEK_INDIRECT_FIRE_TO_HIT_SOURCE_REFS,
  ),
  'pilot-wounds': integrated(
    'pilot-wounds',
    'runAttackPhase passes attacker pilotWounds into calculateToHit',
    MEGAMEK_PILOT_WOUNDS_TO_HIT_SOURCE_REFS,
  ),
  'sensor-damage': integrated(
    'sensor-damage',
    'runAttackPhase passes attacker componentDamage.sensorHits into calculateToHit',
    MEGAMEK_SENSOR_DAMAGE_TO_HIT_SOURCE_REFS,
  ),
  'actuator-damage': integrated(
    'actuator-damage',
    'runAttackPhase maps coarse arm actuator damage from componentDamage into calculateToHit',
    MEGAMEK_ACTUATOR_DAMAGE_TO_HIT_SOURCE_REFS,
  ),
  'attacker-prone': integrated(
    'attacker-prone',
    'runAttackPhase passes attacker prone state into calculateToHit',
    MEGAMEK_ATTACKER_PRONE_TO_HIT_SOURCE_REFS,
  ),
  'hull-down': integrated(
    'hull-down',
    'Source-backed calculateHullDownModifier applies +2, runAttackPhase threads explicit IUnitGameState.hullDown into AttackDeclared to-hit, and resolveWeaponHit redirects front-arc hull-down leg hits through hit-location options',
    MEGAMEK_HULL_DOWN_SOURCE_REFS,
  ),
  'secondary-target': integrated(
    'secondary-target',
    'Source-backed runAttackPhase accepts per-weapon target declarations, marks non-primary targets as secondary, and threads secondaryTarget state into calculateToHit',
    MEGAMEK_SECONDARY_TARGET_SOURCE_REFS,
  ),
  'called-shot': integrated(
    'called-shot',
    'Source-backed runAttackPhase and declareAttack carry called-shot intent into calculateCalledShotModifier for the TacOps-style +3 called-shot penalty',
    MEGAMEK_CALLED_SHOT_SOURCE_REFS,
  ),
  ecm: helperOnly(
    'ecm',
    'MegaMek-source-checked: runAttackPhase already suppresses Artemis/NARC/iNARC guidance benefits through special-weapon and C3 ECM state instead of adding a generic to-hit penalty',
    'No source-authoritative generic +1 ECM to-hit modifier exists for Artemis, NARC, C3, or targeting computers; keep ECM helper-classified until every guidance-suppression path has source-backed assertions',
    MEGAMEK_ECM_GUIDANCE_TO_HIT_SOURCE_REFS,
  ),
  c3: integrated(
    'c3',
    'runAttackPhase consumes explicit IGameState.c3Network state, refreshes C3 member positions, operational lifecycle state, matching C3 critical-slot damage, and ECM/iNARC ECM disruption from current unit state, and calls calculateToHitWithC3 for direct weapon attacks; default C3 range sharing does not require spotter LOS, while optional PLAYTEST_3 gates C3 spotters on spotter-to-target LOS',
    MEGAMEK_C3_RANGE_SOURCE_REFS,
  ),
  'c3-equipment-network-formation': helperOnly(
    'c3-equipment-network-formation',
    'UnitHydration derives BattleMech mounted C3 master/slave/C3i equipment roles from catalog equipment and critical slots; createInitialState now seeds unambiguous per-side runner C3 master/slave and C3i networks from hydrated equipment; c3Network creation helpers validate explicit C3 master/slave and C3i membership; and runAttackPhase consumes IGameState.c3Network state while suppressing destroyed matching C3 critical slots',
    'Session builders, player-authored network assignment, multiple same-side C3 networks, ambiguous multi-master equipment, and oversize network splitting are not yet authoritative from hydrated mounted equipment',
    [...MEGAMEK_C3_RANGE_SOURCE_REFS, ...MEGAMEK_C3_EQUIPMENT_SOURCE_REFS],
  ),
  'terrain-features': integrated(
    'terrain-features',
    'runAttackPhase applies getTerrainToHitModifier for target-in and non-blocking intervening terrain features',
    MEGAMEK_TERRAIN_FEATURE_TO_HIT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT = {
  tsm: integrated(
    'tsm',
    'UnitHydration, game/session physical contexts, and runPhysicalAttackPhase thread hasTSM into resolvePhysicalAttack so active TSM doubles physical damage at heat 9+',
    MEGAMEK_TSM_PHYSICAL_DAMAGE_SOURCE_REFS,
  ),
  claws: helperOnly(
    'claws',
    'calculatePunchDamage, calculatePunchToHit, eligibility projection, session physical contexts, UnitHydration, critical-event replay, destroyed-location replay, and runPhysicalAttackPhase consume claw arm state for source-backed punch damage/to-hit modifiers; PLAYTEST_3 removes only the claw punch to-hit penalty while preserving claw punch damage; critical-event replay removes claw state when the mount is destroyed, missing, or breached, and destroyed arm state clears the represented modifier',
    'Automatic missing/breached claw event production from mounted-equipment state beyond represented destroyed-location replay and claw club-with-hand interactions are not modeled',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek PunchAttackAction.getDamageFor uses ceil(weight / 7) when the punching arm has working claws',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L390-L405`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      {
        kind: 'megamek-source',
        citation:
          'MegaMek PunchAttackAction.toHit adds the claw punch modifier outside PLAYTEST_3, records a zero-value Using Claws modifier under PLAYTEST_3, and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L309-L333`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  talons: helperOnly(
    'talons',
    'calculateKickDamage, calculateDFADamageToTarget, eligibility projection, session physical contexts, UnitHydration, critical-event replay, destroyed-location replay, and runPhysicalAttackPhase consume biped leg plus quad/non-biped arm-location talon state for source-backed +50% kick/DFA damage; critical-event replay removes talon state when the mount is destroyed, missing, or breached, and destroyed location state clears the represented modifier',
    'Automatic missing/breached talon event production from mounted-equipment state beyond represented destroyed-location replay remains partial',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator, mapping quad front kicks to arm locations',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/KickAttackAction.java#L95-L122',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.getDamageFor and hasTalons apply 1.5 DFA damage when a qualifying talon leg has a working foot actuator',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L95-L104',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  underwater: integrated(
    'underwater',
    'runPhysicalAttackPhase and session physical contexts derive isUnderwater from water-tagged hexes before calculatePhysicalDamage/applyUnderwaterModifier halves physical damage',
    MEGAMEK_UNDERWATER_PHYSICAL_DAMAGE_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const MOVEMENT_RULE_COMBAT_SUPPORT = {
  walk: integrated(
    'walk',
    'validateMovement + GameEngine/InteractiveSession movement validation consume walking MP',
    MEGAMEK_WALK_MOVEMENT_SOURCE_REFS,
  ),
  run: integrated(
    'run',
    'validateMovement consumes running MP and movement modifiers expose run heat/to-hit cost',
    MEGAMEK_RUN_MOVEMENT_SOURCE_REFS,
  ),
  jump: integrated(
    'jump',
    'validateMovement enforces jump MP/no-jump-jets and ignores ground terrain entry modifiers',
    MEGAMEK_JUMP_MOVEMENT_SOURCE_REFS,
  ),
  stand: integrated(
    'stand',
    'runMovementPhase resolves stand-up PSRs for prone units and emits UnitStood on success',
    MEGAMEK_STAND_MOVEMENT_SOURCE_REFS,
  ),
  prone: helperOnly(
    'prone',
    'unit prone state, fall/standing helpers, and voluntary go-prone game-session/interactive action path',
    'Runner movement AI/planning cannot choose voluntary go-prone, and hull-down, swarmer dislodge, and inferno wash-off nuances are not modeled',
    MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
  ),
  facing: integrated(
    'facing',
    'validateMovement charges path-alignment and terminal facing turns, movement declarations commit final facing, and eventPath reports turning MP',
    MEGAMEK_FACING_MOVEMENT_SOURCE_REFS,
  ),
  'torso-twist': integrated(
    'torso-twist',
    'Source-backed torsoTwist validates BattleMech WeaponAttack legality, no_twist/ext_twist quirks, prone/bracing/already-twisted gates, and emits FacingChanged secondaryFacing state through local UI, game intent, wire, P2P, server dispatch, replay, AI arc projection, and runner secondary-target math',
    MEGAMEK_TORSO_TWIST_SOURCE_REFS,
  ),
  occupancy: integrated(
    'occupancy',
    'validateMovement rejects occupied destination hexes before MP or heat side effects',
    MEGAMEK_OCCUPANCY_MOVEMENT_SOURCE_REFS,
  ),
  elevation: integrated(
    'elevation',
    'getHexMovementCost and pathfinding reject ground climbs above legal elevation delta',
    MEGAMEK_ELEVATION_MOVEMENT_SOURCE_REFS,
  ),
  'heat-mp-penalty': integrated(
    'heat-mp-penalty',
    'validateMovement applies getHeatMovementPenalty to effective MP',
    MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT = {
  [MovementEnhancementType.MASC]: helperOnly(
    MovementEnhancementType.MASC,
    'UnitHydration detects installed MASC, runMovementPhase consumes explicit active MASC run MP, movementEnhancementPsr queues createMASCFailurePSR with source-backed standard fixed failure target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and applies one critical hit to each leg when the final check fails, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers still expose sprint_masc formula support',
    'No combat MovementType.Sprint, alternate MASC option tables, or separate first-step equipment-check timing is wired',
    MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  ),
  [MovementEnhancementType.SUPERCHARGER]: helperOnly(
    MovementEnhancementType.SUPERCHARGER,
    'UnitHydration detects installed Supercharger, runMovementPhase consumes explicit active Supercharger run MP, movementEnhancementPsr queues createSuperchargerFailurePSR with source-backed standard fixed failure target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and destroys the Supercharger slot plus applies the source-backed engine critical table when the final check fails, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers still expose sprint_combined formula support',
    'No combat MovementType.Sprint, IndustrialMek/support-unit supercharger roll adjustment, separate first-step equipment-check timing, or non-BattleMech motive-damage branch is wired',
    MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  ),
  [MovementEnhancementType.TSM]: integrated(
    MovementEnhancementType.TSM,
    'UnitHydration, physical damage resolution, getHeatAdjustedMovementCapability, and runMovementPhase consume source-backed active TSM for heat-gated melee damage and movement validation',
    MEGAMEK_TSM_MOVEMENT_SOURCE_REFS,
  ),
  [MovementEnhancementType.PARTIAL_WING]: integrated(
    MovementEnhancementType.PARTIAL_WING,
    'UnitHydration derives source-backed BattleMech Partial Wing jump bonus state, runMovementPhase applies it only when base jump MP exists, and validateMovement subtracts it from generated jump heat',
    MEGAMEK_PARTIAL_WING_MOVEMENT_SOURCE_REFS,
  ),
} satisfies Record<
  (typeof MOVEMENT_ENHANCEMENT_DEFINITIONS)[number]['type'],
  ICombatFeatureSupportEntry
>;

export const TERRAIN_ENVIRONMENT_COMBAT_SUPPORT = {
  'terrain-movement-costs': integrated(
    'terrain-movement-costs',
    'validateMovement consumes TERRAIN_PROPERTIES movementCostModifier for every TerrainType',
    [MEGAMEK_TERRAIN_TYPE_SOURCE_REF, MEGAMEK_TERRAIN_MOVEMENT_COST_SOURCE_REF],
  ),
  'terrain-los-blocking': helperOnly(
    'terrain-los-blocking',
    'lineOfSight consumes TerrainType blocksLOS for MekStation simplified woods/buildings blocking',
    'MegaMek cumulative woods/smoke thresholds, land-to-underwater LOS blocking, divided LOS, and richer building-level handling are not fully modeled by the local TerrainType LOS helper',
    terrainLosSourceRefs(TerrainType.HeavyWoods),
  ),
  'terrain-partial-cover': integrated(
    'terrain-partial-cover',
    'runAttackPhase derives partial cover from target hex terrain',
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
  dust: helperOnly(
    'dust',
    'No Dust enum; closest modeled weather modifiers are fog/precipitation helpers',
    'dust storms are not represented as a first-class battlefield condition',
    [
      ...MEGAMEK_ENVIRONMENTAL_TO_HIT_SOURCE_REFS,
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
    ],
  ),
  mines: helperOnly(
    'mines',
    'No TerrainType.Mines entry in the BattleMech movement validator',
    'minefields do not trigger movement damage or PSR resolution',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const HEAT_RULE_COMBAT_SUPPORT = {
  'weapon-heat': integrated(
    'weapon-heat',
    'runHeatPhase sums weaponsFiredThisTurn against weaponsByUnit catalog heat',
    [MEGAMEK_WEAPON_HEAT_SOURCE_REF],
  ),
  'movement-heat': integrated(
    'movement-heat',
    'runHeatPhase emits movement-sourced HeatGenerated for walk/run/jump movement types plus explicit optional TacOps sprint and evade state',
    [
      MEGAMEK_MOVEMENT_HEAT_SOURCE_REF,
      MEGAMEK_MEK_STANDING_WALK_HEAT_SOURCE_REF,
      MEGAMEK_MEK_RUN_SPRINT_HEAT_SOURCE_REF,
      MEGAMEK_ENGINE_RUN_SPRINT_HEAT_SOURCE_REF,
    ],
  ),
  'jump-distance-heat': integrated(
    'jump-distance-heat',
    'runHeatPhase applies max(JUMP_HEAT, unit.hexesMovedThisTurn) for jump movement heat',
    [MEGAMEK_MOVEMENT_HEAT_SOURCE_REF, MEGAMEK_MEK_JUMP_HEAT_SOURCE_REF],
  ),
  'engine-heat': integrated(
    'engine-heat',
    'runHeatPhase adds componentDamage.engineHits * ENGINE_HEAT_PER_CRITICAL',
    [MEGAMEK_ENGINE_CRIT_HEAT_SOURCE_REF],
  ),
  dissipation: integrated(
    'dissipation',
    'runHeatPhase subtracts unit heatSinks * heatSinkType rating, defaulting legacy fixtures to 10 single sinks',
    [MEGAMEK_HEAT_DISSIPATION_SOURCE_REF, MEGAMEK_MEK_HEAT_CAPACITY_SOURCE_REF],
  ),
  'heat-sink-damage': integrated(
    'heat-sink-damage',
    'runHeatPhase reduces dissipation by componentDamage.heatSinksDestroyed at the unit heat-sink rating',
    [MEGAMEK_MEK_HEAT_CAPACITY_SOURCE_REF],
  ),
  'threshold-effects': integrated(
    'threshold-effects',
    'runHeatPhase emits HeatEffectApplied for each met Total Warfare heat threshold',
    MEGAMEK_HEAT_THRESHOLD_SOURCE_REFS,
  ),
  'shutdown-check': integrated(
    'shutdown-check',
    'runHeatPhase emits avoidable ShutdownCheck events at heat 14-29',
    [MEGAMEK_HEAT_SHUTDOWN_SOURCE_REF],
  ),
  'auto-shutdown': integrated(
    'auto-shutdown',
    'runHeatPhase emits automatic ShutdownCheck and persists shutdown at heat 30+',
    [MEGAMEK_HEAT_SHUTDOWN_SOURCE_REF],
  ),
  startup: integrated(
    'startup',
    'runHeatPhase and resolveHeatPhase emit StartupAttempt and update shutdown state for shutdown units after dissipation',
    [MEGAMEK_HEAT_STARTUP_SOURCE_REF],
  ),
  'ammo-explosion-risk': integrated(
    'ammo-explosion-risk',
    'runHeatPhase marks ammoExplosionRisk and emits heat threshold events at risk bands',
    [MEGAMEK_HEAT_AMMO_EXPLOSION_ROLL_SOURCE_REF],
  ),
  'heat-induced-ammo-explosion': integrated(
    'heat-induced-ammo-explosion',
    'runHeatPhase emits one AmmoExplosion source HeatInduced for the highest per-round damage loaded ammo bin, reports remaining rounds multiplied by matched weapon damage, empties that bin, and applies the damage cascade',
    [
      MEGAMEK_HEAT_AMMO_EXPLOSION_ROLL_SOURCE_REF,
      MEGAMEK_HEAT_AMMO_SELECTION_SOURCE_REF,
    ],
  ),
  'pilot-heat-damage': integrated(
    'pilot-heat-damage',
    'runHeatPhase and resolveHeatPhase emit PilotHit source heat from getPilotHeatDamage and persist wound totals',
    [MEGAMEK_HEAT_PILOT_DAMAGE_SOURCE_REF],
  ),
  'maxtech-pilot-heat-damage': integrated(
    'maxtech-pilot-heat-damage',
    'runHeatPhase and resolveHeatPhase consume opt-in MaxTech heat-scale pilot damage checks at heat 32+ and apply Hot Dog avoid-number relief',
    [MEGAMEK_HEAT_MAXTECH_PILOT_DAMAGE_SOURCE_REF],
  ),
  'maxtech-heat-critical-damage': integrated(
    'maxtech-heat-critical-damage',
    'runHeatPhase and resolveHeatPhase consume opt-in MaxTech heat-scale critical damage checks at heat 36+, apply Hot Dog avoid-number relief, and route failed rolls through one random BattleMech critical location',
    [MEGAMEK_HEAT_MAXTECH_CRITICAL_DAMAGE_SOURCE_REF],
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
  'environmental-heat': integrated(
    'environmental-heat',
    'runHeatPhase and resolveHeatPhase consume calculateEnvironmentalHeatModifier for source-backed temperature and local atmosphere dissipation adjustments',
    [
      MEGAMEK_EXTREME_TEMPERATURE_HEAT_SOURCE_REF,
      MEGAMEK_EXTERNAL_HEAT_CAP_SOURCE_REF,
      MEKSTATION_ATMOSPHERE_HEAT_SOURCE_REF,
    ],
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const TERRAIN_TYPE_MOVEMENT_COVERAGE = Object.values(TerrainType);
