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
import {
  MEGAMEK_DROPSHIP_SPECIAL_BUILDING_LOS_SOURCE_REFS,
  MEGAMEK_TACOPS_DIAGRAM_LOS_SOURCE_REFS,
  terrainLosSourceRefs,
} from './CombatTerrainEnvironmentSourceRefs';
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

function unsupported(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'unsupported', evidence, gap, sourceRefs }
    : { id, level: 'unsupported', evidence, gap };
}

function outOfScope(
  id: string,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  return sourceRefs
    ? { id, level: 'out-of-scope', evidence, gap, sourceRefs }
    : { id, level: 'out-of-scope', evidence, gap };
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
const MEGAMEK_EMP_MINEFIELD_SOURCE_VERSION =
  '55584ec7529b944fca3216965697e9fa1115dced';

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

function megamekEmpMinefieldSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_EMP_MINEFIELD_SOURCE_VERSION}/megamek/src/megamek/${path}#${lineRange}`,
    sourceVersion: MEGAMEK_EMP_MINEFIELD_SOURCE_VERSION,
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

const MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS = [
  megamekTerrainSourceRef(
    'MegaMek Minefield represents minefield state separately from terrain ids, including conventional, command-detonated, vibrabomb, active, EMP, inferno, density, sea mine, and depth fields.',
    'common/equipment/Minefield.java',
    'L47-L125',
  ),
  megamekTerrainSourceRef(
    'MegaMek Game stores minefields by coordinate, supports add/set/reset/remove/clear minefield operations, and keeps minefield visibility/state outside board terrain.',
    'common/game/Game.java',
    'L178-L343',
  ),
  megamekTerrainSourceRef(
    'MegaMek TWGameManager.enterMinefield resolves minefield detonations when an entity enters a mined coordinate.',
    'server/totalWarfare/TWGameManager.java',
    'L7348-L7590',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_VIBRABOMB_MINEFIELD_SOURCE_REFS = [
  ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
  megamekTerrainSourceRef(
    'MegaMek TWGameManager.checkVibraBombs triggers vibrabombs from BattleMech mass versus mine setting, supports proximity detonation, and skips non-Mek triggers.',
    'server/totalWarfare/TWGameManager.java',
    'L7762-L7859',
  ),
  megamekTerrainSourceRef(
    'MegaMek TWGameManager.explodeVibrabomb applies mine density in 5-point kick-table damage clusters, resolves piloting fallout, then reduces and marks the vibrabomb detonated.',
    'server/totalWarfare/TWGameManager.java',
    'L8061-L8120',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_COMMAND_DETONATED_MINEFIELD_SOURCE_REF = megamekTerrainSourceRef(
  'MegaMek mine-laying still carries command-detonated mines as a TODO rather than a represented layMine producer branch.',
  'server/totalWarfare/TWGameManager.java',
  'L29499-L29500',
);

const MEGAMEK_EMP_MINEFIELD_EFFECT_SOURCE_REFS = [
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPMineEffectsTable defines BattleMek EMP thresholds as 2-6 no effect, 7-8 interference, and 9+ shutdown.',
    'common/equipment/EMPMineEffectsTable.java',
    'L631-L670',
  ),
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPMineEffectsTable.determineEffect maps modified EMP rolls to none, interference, or shutdown outcomes.',
    'common/equipment/EMPMineEffectsTable.java',
    'L753-L784',
  ),
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPMineEffectsTable.rollForEffect applies a +2 drone OS modifier, rolls 2d6 for effect, and rolls 1d6 duration for interference or shutdown.',
    'common/equipment/EMPMineEffectsTable.java',
    'L786-L830',
  ),
  megamekEmpMinefieldSourceRef(
    'MegaMek EMPEffectResult carries EMP effect, durationTurns, modified roll value, and modifier for replayable reporting.',
    'common/equipment/EMPEffectResult.java',
    'L35-L90',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const MEKSTATION_SCENARIO_MINEFIELD_MODIFIER_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation MINEFIELD is scenario-generation modifier data with mineCount, mineDamage, and deploymentZone parameters, not battlefield minefield terrain/state consumed by movement or damage resolution.',
    'src/constants/scenario/modifiers/equipmentModifiers.ts',
    'L5-L27',
  );

const MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation TerrainType enum carries Mines as a zero-cost terrain marker; runner movement treats represented Mines entry as a bounded conventional minefield damage marker while broader reveal variants remain unmodeled.',
  'src/types/gameplay/TerrainTypes.ts',
  'L15-L35',
);

const MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation runMovementPhase calls applyMovementMinefieldEffects after movement declaration to apply represented TerrainType.Mines and conventional IGameState.minefields entry damage to BattleMech legs; explicit inferno coordinate entries with positive density queue pending external heat and infernoBurning state without leg damage; explicit active coordinate entries suppress ground BattleMech entry without damage or MinefieldChanged side effects, and represented BattleMech jump entry triggers active minefield leg damage plus MinefieldChanged detonation/reduction state; explicit EMP coordinate entries roll source-backed BattleMech EMP no-effect/interference/shutdown outcomes and emit EmpMinefieldEffectApplied; explicit vibrabomb coordinate entries with density, setting, and BattleMech tonnage resolve same-hex kick-table 5-point damage clusters plus proximity detonation/reduction. Explicit detonated coordinate entries and unsupported coordinate-state variants do not trigger represented damage, represented density adjusts detonation target thresholds, and successful represented density-reduction rolls emit MinefieldChanged state updates.',
  'src/simulation/runner/phases/movementMines.ts',
  'L1-L1090',
);

const MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation IGameState.minefields stores represented battle-wide minefield entry damage, optional density, optional setting/sensitivity, optional detonated state, and explicit conventional, command-detonated, vibrabomb, active, EMP, and inferno type tags by canonical coordToKey q,r keys while runtime behavior resolves conventional semantics, explicit inferno density external-heat entry, explicit active ground-entry suppression, represented active BattleMech jump-entry triggering, represented EMP effect state, represented vibrabomb density/setting triggers, and fail-closes unsupported non-conventional tags.',
    'src/types/gameplay/GameSessionStateTypes.ts',
    'L720-L748',
  );

const MEKSTATION_GAME_CREATED_MINEFIELDS_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation createGameSession and GameCreated payloads seed explicit coordinate-authored represented minefield state into derived combat state, and prebattle skirmish config can pass through only already-authored coordinate entries.',
    'src/utils/gameplay/gameEvents/lifecycle.ts',
    'L43-L78',
  );

const MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation MinefieldChanged event replay applies represented add, set, remove, clear, reset, and detonate operations to IGameState.minefields.',
    'src/utils/gameplay/gameState/terrainReducer.ts',
    'L35-L109',
  );

const MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation minefield action helpers emit replayable MinefieldChanged manual conventional detonation, command-detonated detonation, clearing, mine-sweeper, collateral reset, and detection events without damage or PSR side effects.',
  'src/simulation/runner/phases/minefieldActions.ts',
  'L1-L234',
);

const MEKSTATION_WATER_GROUND_DISALLOW_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation getHexMovementCost currently treats walk/run entry into TerrainType.Water as impassable before path side effects.',
    'src/utils/gameplay/movement/calculations.ts',
    'L170-L195',
  );

const MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF = mekstationDeviationSourceRef(
  'MekStation calculateLOS owns represented TerrainType LOS tracing, divided side-path selection, endpoint LOS elevation inputs, and optional TacOps diagram terrain-effect checks for woods, smoke, heavy industrial, and planted fields.',
  'src/utils/gameplay/lineOfSight.ts',
  'L1-L825',
);

const MEKSTATION_TACOPS_LOS_CALLER_OPTION_SOURCE_REFS = [
  MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF,
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack LOS validation threads combat optionalRules into calculateLOS through lineOfSightOptionsFromOptionalRules.',
    'src/simulation/runner/phases/weaponAttackLineOfSight.ts',
    'L1-L94',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack C3 spotter LOS checks thread combat optionalRules into calculateLOS through lineOfSightOptionsFromOptionalRules.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L1-L1353',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive attack declarations and indirect spotter terrain effects thread session optionalRules into calculateLOS through lineOfSightOptionsFromOptionalRules.',
    'src/engine/InteractiveSession.actions.ts',
    'L1-L1634',
  ),
  mekstationDeviationSourceRef(
    'MekStation indirect-fire context and spotter election carry LOS calculation options from session or runner optional rules into the pure indirect-fire helper.',
    'src/engine/InteractiveSession.indirectFire.ts',
    'L1-L207',
  ),
] as const;

const MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS = [
  megamekTerrainSourceRef(
    'MegaMek LosEffects.calculateLos selects divided LOS when the attack-target bearing follows a hexside and otherwise uses straight LOS, while TacOps LOS1 enables diagram LOS.',
    'common/LosEffects.java',
    'L783-L790',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losDivided evaluates non-split coordinates and left/right split-side LOS effects separately before choosing defender-favorable cover or blocking.',
    'common/LosEffects.java',
    'L993-L1040',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losStraight counts endpoint elevation differences as building hexes passed through when both endpoints are in a building.',
    'common/LosEffects.java',
    'L949-L958',
  ),
  megamekTerrainSourceRef(
    'MegaMek LosEffects.losForCoords tracks underwater minimum-water depth, clear-hex underwater blocking, TacOps diagram elevation, and grounded Dropship/building-height blocking during LOS tracing.',
    'common/LosEffects.java',
    'L1252-L1348',
  ),
  ...terrainLosSourceRefs(TerrainType.Water),
];

const TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS = [
  ...MEGAMEK_TACOPS_DIAGRAM_LOS_SOURCE_REFS,
  MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF,
  ...terrainLosSourceRefs(TerrainType.Building),
  ...terrainLosSourceRefs(TerrainType.HeavyIndustrial),
  ...terrainLosSourceRefs(TerrainType.PlantedField),
];

const DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS = [
  ...MEGAMEK_DROPSHIP_SPECIAL_BUILDING_LOS_SOURCE_REFS,
  ...terrainLosSourceRefs(TerrainType.Building),
];

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
      'MegaMek MovePathHandler checks active MASC/Supercharger on the first movement step and invokes the failure checks during movement resolution.',
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

const MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS = [
  ...MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MPBoosters.calculateSprintMP uses ceil(walk MP * 2.5) for one active MASC/Supercharger booster and 3x walk MP when both are active.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/enums/MPBoosters.java#L89-L97`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity stores standard, alternate, and alternate-enhanced MASC/Supercharger failure target-number tables selected by advanced game options.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L858-L860`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity chooses the active MASC/Supercharger failure target table from alternate_masc and alternate_masc_enhanced game options.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13763-L13769`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_SUPERCHARGER_NON_BATTLEMECH_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Supercharger equipment is legal for Mek, Tank, and Support Tank unit families, so vehicle branches are separate from the BattleMech suite.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/equipment/MiscType.java#L2415-L2426`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek applies a -1 Supercharger failure roll adjustment for IndustrialMek, SupportTank, and SupportVTOL units.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13846-L13852`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek non-Mek Supercharger failure maps engine-table hits into Tank and VTOL motive-system critical branches rather than BattleMech center-torso engine slots.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/common/units/Entity.java#L13915-L13954`,
    sourceVersion: MEGAMEK_MOVEMENT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek TWGameManager marks a non-Mek Supercharger mount hit directly, while Mek Supercharger failure applies the matching mounted critical slot first.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_MOVEMENT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L6022-L6048`,
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
  ecm: integrated(
    'ecm',
    'MegaMek-source-checked: runAttackPhase suppresses source-backed Artemis, NARC/iNARC Homing, semi-guided TAG, and C3 guidance benefits through explicit ECM/C3/special-weapon state instead of adding a generic ECM to-hit penalty',
    MEGAMEK_ECM_GUIDANCE_TO_HIT_SOURCE_REFS,
  ),
  c3: integrated(
    'c3',
    'runAttackPhase and interactive declareAttack consume explicit IGameState.c3Network state for direct weapon attacks; runner refreshes C3 member positions, operational lifecycle state, matching C3 critical-slot damage, and ECM/iNARC ECM disruption from current unit state, while GameCreated C3 state from explicit session payloads is replayed and refreshed through hydrateC3NetworkStateFromGameState before calculateToHitWithC3; default C3 range sharing does not require spotter LOS, while optional PLAYTEST_3 gates runner C3 spotters on spotter-to-target LOS',
    MEGAMEK_C3_RANGE_SOURCE_REFS,
  ),
  'c3-equipment-conservative-network-seeding': integrated(
    'c3-equipment-conservative-network-seeding',
    'UnitHydration derives BattleMech mounted C3 master/slave/C3i equipment roles from catalog equipment and critical slots; synthesizeGameUnits, CompendiumAdapter, and preBattleSessionBuilder carry adapted C3 equipment into GameCreated unit seeds; createInitialState and GameCreated replay seed unambiguous per-side C3 master/slave and C3i equipment into conservative single-network groups; SimulationRunner.run stamps non-empty state.c3Network into GameCreated payloads; hydrateC3NetworkStateFromGameState refreshes that seeded state before calculateToHitWithC3 consumes it',
    [...MEGAMEK_C3_RANGE_SOURCE_REFS, ...MEGAMEK_C3_EQUIPMENT_SOURCE_REFS],
  ),
  'c3-equipment-unambiguous-network-formation': integrated(
    'c3-equipment-unambiguous-network-formation',
    'evaluateConservativeC3NetworkFormationFromUnits forms only unambiguous per-side single C3 master/slave and C3i networks from mounted equipment; createInitialState and GameCreated replay consume those formed networks through c3Network state before hydrateC3NetworkStateFromGameState refreshes them for calculateToHitWithC3',
    [...MEGAMEK_C3_RANGE_SOURCE_REFS, ...MEGAMEK_C3_EQUIPMENT_SOURCE_REFS],
  ),
  'c3-equipment-independent-side-formation': integrated(
    'c3-equipment-independent-side-formation',
    'evaluateConservativeC3NetworkFormationFromUnits evaluates mounted C3 equipment independently per side, preserving a valid unambiguous network for one side even when the opposing side is denied as ambiguous instead of treating one side denial as a battlefield-wide formation failure',
    [...MEGAMEK_C3_RANGE_SOURCE_REFS, ...MEGAMEK_C3_EQUIPMENT_SOURCE_REFS],
  ),
  'c3-equipment-denial-boundaries': integrated(
    'c3-equipment-denial-boundaries',
    'evaluateConservativeC3NetworkFormationFromUnits explicitly denies ambiguous multi-role equipment, mixed C3i/master-slave families, multiple masters, oversized master/slave groups, oversized C3i groups, incomplete pairs, and singleton C3i without guessing player intent or synthesizing multiple same-side networks',
    [...MEGAMEK_C3_RANGE_SOURCE_REFS, ...MEGAMEK_C3_EQUIPMENT_SOURCE_REFS],
  ),
  'c3-equipment-network-formation': outOfScope(
    'c3-equipment-network-formation',
    'Residual authoring row only: represented BattleMech C3 runtime behavior is covered by explicit session-authored IGameState.c3Network consumption, mounted equipment role hydration, conservative single-network seeding, unambiguous per-side C3/C3i formation, independent side-by-side formation/denial evaluation, and fail-closed denial boundaries; this broad row intentionally does not claim authored network assignment or partitioning support',
    'Manual C3 network authoring UI, manual C3 assignment controls, automatic same-side multiple-network partitioning, ambiguous multiple-master partitioning, mixed C3i/master-slave family selection, and authoritative oversized network splitting are outside this BattleMech runtime to-hit validation slice instead of being inferred by the conservative equipment helper',
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
  claws: integrated(
    'claws',
    'calculatePunchDamage, calculatePunchToHit, eligibility projection, session physical contexts, UnitHydration, critical-event replay, destroyed-location replay, and runPhysicalAttackPhase consume claw arm state for source-backed punch damage/to-hit modifiers; PLAYTEST_3 removes only the claw punch to-hit penalty while preserving claw punch damage; critical-event replay removes claw state when the mount is destroyed, missing, or breached, and destroyed arm state clears the represented modifier',
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
  'claw-equipment-lifecycle': outOfScope(
    'claw-equipment-lifecycle',
    'Represented runtime claw lifecycle paths are covered: core claw punch damage, punch to-hit, PLAYTEST_3 to-hit relief, destroyed/missing/breached CriticalHitResolved replay cleanup, physical-phase destroyed Claw critical production, explicit missing/breached physical critical-manifest cleanup, destroyed-location replay, UnitHydration, and runner/session consumption are integrated under the claws row and claw split rows',
    'The remaining claw-only residual is outside the BattleMech combat runtime validation matrix: source-construction/editor authoring of automatic claw mounted-equipment lifecycle events when no represented CriticalHitResolved payload, physical critical-manifest entry, or destroyed-location event exists, plus claw club-with-hand interactions; this row must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
    [
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
  'claw-physical-critical-production': integrated(
    'claw-physical-critical-production',
    'runPhysicalAttackPhase receives the runner critical-manifest side table, physicalAttackDamage threads physical damage through resolveDamage criticalContext, emits physical-phase CriticalHit/CriticalHitResolved/ComponentDestroyed events for destroyed Claw equipment slots, persists the updated manifest, and applies physical equipment lifecycle cleanup to remove the hit arm claw modifier',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L7328-L7341`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'claw-represented-equipment-cleanup': integrated(
    'claw-represented-equipment-cleanup',
    'applyDamagedPhysicalEquipmentCritical, applyPhysicalEquipmentCriticalEvents, reducer event replay, destroyed-location replay, and runner/unit-state consumers clear represented left/right arm claw modifier state when CriticalHitResolved marks Claws destroyed, missing, or breached, or when the arm location is destroyed',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L7328-L7341`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
      megamekPhysicalSourceRef(
        'MegaMek Entity.destroyLocation marks blown-off critical slots, mounted equipment, and dependent locations missing',
        'common/units/Entity.java',
        'L11864-L11939',
      ),
    ],
  ),
  'claw-source-mount-missing-breached-cleanup': integrated(
    'claw-source-mount-missing-breached-cleanup',
    'physical critical manifest entries that explicitly mark Claw equipment missing or breached are skipped by critical-slot selection, emitted as PhysicalAttack CriticalHitResolved lifecycle events when the represented claw modifier is still active, and replayed through applyPhysicalEquipmentCriticalEvents without producing ComponentDestroyed',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek Mek.hasClaw checks arm critical slots for a non-destroyed, non-missing, non-breached hand-weapon claw mount',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/units/Mek.java#L7328-L7341`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
    ],
  ),
  talons: integrated(
    'talons',
    'calculateKickDamage, calculateDFADamageToTarget, eligibility projection, session physical contexts, UnitHydration, critical-event replay, destroyed-location replay, and runPhysicalAttackPhase consume biped leg plus quad/non-biped arm-location talon state for source-backed +50% kick/DFA damage; critical-event replay removes talon state when the mount is destroyed, missing, or breached, and destroyed location state clears the represented modifier',
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
  'talon-equipment-lifecycle': outOfScope(
    'talon-equipment-lifecycle',
    'Represented runtime talon lifecycle paths are covered: core talon kick/DFA damage, biped and quad/non-biped location mapping, destroyed/missing/breached CriticalHitResolved replay cleanup, physical-phase destroyed Talons critical production, explicit missing/breached physical critical-manifest cleanup, destroyed-location replay, UnitHydration, and runner/session consumption are integrated under the talons row and talon split rows',
    'The remaining talon-only residual is outside the BattleMech combat runtime validation matrix: source-construction/editor authoring of automatic talon mounted-equipment lifecycle events when no represented CriticalHitResolved payload, physical critical-manifest entry, or destroyed-location event exists; this row must not be used as evidence that broad automatic lifecycle producer behavior is integrated',
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
  'talon-physical-critical-production': integrated(
    'talon-physical-critical-production',
    'runPhysicalAttackPhase receives the runner critical-manifest side table, physicalAttackDamage threads physical damage through resolveDamage criticalContext, emits physical-phase CriticalHit/CriticalHitResolved/ComponentDestroyed events for destroyed Talons equipment slots, persists the updated manifest, and applies physical equipment lifecycle cleanup to remove the hit leg or quad/non-biped arm talon modifier',
    [
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
  'talon-represented-equipment-cleanup': integrated(
    'talon-represented-equipment-cleanup',
    'applyDamagedPhysicalEquipmentCritical, applyPhysicalEquipmentCriticalEvents, reducer event replay, destroyed-location replay, and runner/unit-state consumers clear represented biped leg and quad/non-biped arm-location talon modifier state when CriticalHitResolved marks Talons destroyed, missing, or breached, or when the represented leg/arm location is destroyed',
    [
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
  'talon-source-mount-missing-breached-cleanup': integrated(
    'talon-source-mount-missing-breached-cleanup',
    'physical critical manifest entries that explicitly mark Talons equipment missing or breached are skipped by critical-slot selection, emitted as PhysicalAttack CriticalHitResolved lifecycle events when the represented talon modifier is still active, and replayed through applyPhysicalEquipmentCriticalEvents without producing ComponentDestroyed',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek DfaAttackAction.hasTalons checks working talons and working foot actuators on qualifying biped legs plus non-biped leg and arm locations.',
        url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/actions/DfaAttackAction.java#L427-L445',
        sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
      },
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
    // Audit 2026-06-09 C-13: validateMovement now enforces the jump
    // elevation/clearance terrain gates the reachability projection already
    // used — the old blurb claimed integration while only reachable.ts gated.
    'validateMovement enforces jump MP/no-jump-jets plus the shared jump elevation/clearance terrain gates and ignores ground terrain entry modifiers',
    MEGAMEK_JUMP_MOVEMENT_SOURCE_REFS,
  ),
  stand: integrated(
    'stand',
    'runMovementPhase resolves stand-up PSRs for prone units and emits UnitStood on success',
    MEGAMEK_STAND_MOVEMENT_SOURCE_REFS,
  ),
  prone: integrated(
    'prone',
    'unit prone state, fall/standing helpers, explicit non-Mek/already-prone/stuck go-prone legality, hull-down zero-MP go-prone transition clearing hull-down state, voluntary go-prone game-session/interactive action path, and opt-in BotPlayer/runner AI same-hex go-prone movement-step handling',
    MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
  ),
  'go-prone-battlemech-swarmer-dislodgement': integrated(
    'go-prone-battlemech-swarmer-dislodgement',
    'Represented BattleMech go-prone swarmer dislodgement emits replayable SwarmDismounted events with cause go_prone_dislodgement and clears attached squad swarming state in runner and replay paths',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation ISwarmDismountedPayload includes go_prone_dislodgement as a replayable dismount cause.',
        'src/types/gameplay/BattleArmorCombatInterfaces.ts',
        'L296-L302',
      ),
      mekstationDeviationSourceRef(
        'MekStation clearGoProneSwarmers clears attached squad swarm state and emits SwarmDismounted with cause go_prone_dislodgement.',
        'src/simulation/runner/phases/movement.ts',
        'L97-L143',
      ),
      mekstationDeviationSourceRef(
        'MekStation GO_PRONE movement calls clearGoProneSwarmers after the BattleMech prone state is committed.',
        'src/simulation/runner/phases/movement.ts',
        'L251-L259',
      ),
      mekstationDeviationSourceRef(
        'MekStation applySwarmDismounted clears isSwarming and swarmingUnitId from replayed swarmer state.',
        'src/utils/gameplay/gameState/gameStateReducer.ts',
        'L136-L164',
      ),
      mekstationDeviationSourceRef(
        'MekStation gameStateReducer replays SwarmDismounted through applySwarmDismounted.',
        'src/utils/gameplay/gameState/gameStateReducer.ts',
        'L354-L358',
      ),
    ],
  ),
  'go-prone-hull-down-zero-mp-transition': integrated(
    'go-prone-hull-down-zero-mp-transition',
    'Represented hull-down go-prone resolves as a zero-MP same-hex GO_PRONE movement step and clears hull-down posture when the runner commits the prone state',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation getGoProneMpCost returns zero MP for hull-down go-prone and one MP otherwise.',
        'src/utils/gameplay/gameSessionProne.ts',
        'L27-L31',
      ),
      mekstationDeviationSourceRef(
        'MekStation createGoPronePayload records the go-prone MP cost into the MovementDeclared payload and go-prone movement step.',
        'src/simulation/runner/phases/movement.ts',
        'L58-L85',
      ),
      mekstationDeviationSourceRef(
        'MekStation applyMovementEvent marks committed go-prone movement prone and clears hullDown on go-prone steps.',
        'src/simulation/runner/SimulationRunnerState.ts',
        'L397-L434',
      ),
    ],
  ),
  'go-prone-enemy-occupied-start-follow-up-block': integrated(
    'go-prone-enemy-occupied-start-follow-up-block',
    'Represented enemy-occupied-start follow-up movement is blocked by movement validation/projection while same-hex GO_PRONE posture remains legal',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation validateMovement rejects follow-up movement from a start hex occupied by another unit while leaving same-hex posture actions legal.',
        'src/utils/gameplay/movement/validation.ts',
        'L80-L101',
      ),
      mekstationDeviationSourceRef(
        'MekStation deriveMovementRangeHexForDestination marks follow-up movement from another-unit occupied start hexes blocked in movement projection.',
        'src/utils/gameplay/movement/reachable.ts',
        'L447-L472',
      ),
    ],
  ),
  'go-prone-side-paths': integrated(
    'go-prone-side-paths',
    'Core same-hex voluntary go-prone posture is integrated under the prone row, represented BattleMech swarmer dislodgement is integrated under go-prone-battlemech-swarmer-dislodgement, hull-down zero-MP posture transition is integrated under go-prone-hull-down-zero-mp-transition, enemy-occupied-start follow-up blocking is integrated under go-prone-enemy-occupied-start-follow-up-block, and runner plus interactive GO_PRONE reducers clear explicit BattleMech infernoBurning state instead of inferring coverage from Inferno ammo catalog rows',
    [
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      mekstationDeviationSourceRef(
        'MekStation IUnitGameState carries explicit infernoBurning BattleMech effect state that GO_PRONE movement can clear.',
        'src/types/gameplay/GameSessionStateTypes.ts',
        'L318-L326',
      ),
      mekstationDeviationSourceRef(
        'MekStation runner applyMovementEvent clears infernoBurning when a GO_PRONE movement step is committed.',
        'src/simulation/runner/SimulationRunnerState.ts',
        'L411-L433',
      ),
      mekstationDeviationSourceRef(
        'MekStation interactive applyMovementDeclared clears infernoBurning for GO_PRONE movement events.',
        'src/utils/gameplay/gameState/actionLocking.ts',
        'L29-L82',
      ),
      mekstationDeviationSourceRef(
        'MekStation runner movement tests prove GO_PRONE clears explicit infernoBurning state while preserving source-backed posture behavior.',
        'src/simulation/runner/__tests__/movementPhase.behavior.test.ts',
        'L1855-L1935',
      ),
      mekstationDeviationSourceRef(
        'MekStation interactive goProne tests prove local movement events clear explicit infernoBurning state.',
        'src/utils/gameplay/__tests__/gameSessionGoProne.test.ts',
        'L55-L190',
      ),
    ],
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
    'validateMovement applies getHeatMovementPenalty to walk MP and re-derives run/sprint MP from the heat-adjusted walk; jump MP is heat-immune',
    MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT = {
  [MovementEnhancementType.MASC]: integrated(
    MovementEnhancementType.MASC,
    'UnitHydration detects installed MASC, runMovementPhase consumes explicit active MASC run and sprint MP, movementEnhancementPsr queues createMASCFailurePSR before MovementDeclared with source-backed standard, alternate_masc, and alternate_masc_enhanced fixed failure target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and applies one critical hit to each leg when the final check fails, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers expose sprint_masc formula support',
    MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  ),
  'masc-battlemech-represented-side-paths': integrated(
    'masc-battlemech-represented-side-paths',
    'Represented BattleMech MASC side-path accounting covers replayable activation, active run/sprint MP expansion, pre-MovementDeclared failure trigger stamping, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge reroll consumption, failed-check leg critical damage, prior-use counter lifecycle, active-use clearing, and construction sprint_masc formula support',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  'masc-side-paths': integrated(
    'masc-side-paths',
    'Represented BattleMech MASC side-path accounting covers replayable activation, active run/sprint MP expansion, named MASC failure trigger source stamping before MovementDeclared, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge rerolls, failed-check leg critical damage, prior-use counter lifecycle, and active-use clearing without queuing side effects for validation-rejected movement',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  [MovementEnhancementType.SUPERCHARGER]: integrated(
    MovementEnhancementType.SUPERCHARGER,
    'UnitHydration detects installed Supercharger, runMovementPhase consumes explicit active Supercharger run and sprint MP, movementEnhancementPsr queues createSuperchargerFailurePSR before MovementDeclared with source-backed standard, alternate_masc, and alternate_masc_enhanced fixed failure target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and destroys the Supercharger slot plus applies the source-backed engine critical table when the final check fails, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers expose sprint_combined formula support',
    MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  ),
  'supercharger-battlemech-represented-side-paths': integrated(
    'supercharger-battlemech-represented-side-paths',
    'Represented BattleMech Supercharger side-path accounting covers replayable activation, active run/sprint MP expansion, pre-MovementDeclared failure trigger stamping, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge reroll consumption, failed-check Supercharger slot plus engine-table damage, prior-use counter lifecycle, active-use clearing, and construction sprint_combined formula support',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  'supercharger-side-paths': integrated(
    'supercharger-side-paths',
    'Represented BattleMech Supercharger side-path accounting covers replayable activation, active run/sprint MP expansion, named Supercharger failure trigger source stamping before MovementDeclared, standard plus alternate_masc and alternate_masc_enhanced fixed failure target numbers, Edge rerolls, failed-check Supercharger slot plus engine-table damage, prior-use counter lifecycle, and active-use clearing without queuing side effects for validation-rejected movement',
    MEGAMEK_MASC_SUPERCHARGER_SIDE_PATH_SOURCE_REFS,
  ),
  'supercharger-non-battlemech-side-paths': outOfScope(
    'supercharger-non-battlemech-side-paths',
    'MegaMek Supercharger has explicit Tank, SupportTank, SupportVTOL, and non-Mek failure-damage branches, but this catalog is scoped to BattleMech combat validation',
    'Non-BattleMech Supercharger support-unit roll adjustment and vehicle motive-damage branches stay outside this BattleMech suite instead of being counted as BattleMech movement-enhancement blockers',
    MEGAMEK_SUPERCHARGER_NON_BATTLEMECH_SOURCE_REFS,
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
> &
  Record<string, ICombatFeatureSupportEntry>;

export const MINEFIELD_VARIANT_SIDE_PATH_UNSUPPORTED_IDS = [] as const;

export const TERRAIN_LOS_SIDE_PATH_UNSUPPORTED_IDS = [] as readonly string[];

export const TERRAIN_ENVIRONMENT_COMBAT_SUPPORT = {
  'terrain-movement-costs': integrated(
    'terrain-movement-costs',
    'validateMovement consumes per-motive, per-level TERRAIN_PROPERTIES entry costs summed across every terrain feature in the hex (audit 2026-06-09 C-3/C-4)',
    [MEGAMEK_TERRAIN_TYPE_SOURCE_REF, MEGAMEK_TERRAIN_MOVEMENT_COST_SOURCE_REF],
  ),
  'terrain-los-blocking': integrated(
    'terrain-los-blocking',
    'lineOfSight consumes TerrainType direct blockers, cumulative woods/smoke density, and source-backed land-to-depth-2+ water endpoint state for MekStation LOS blocking',
    [
      ...terrainLosSourceRefs(TerrainType.HeavyWoods),
      ...terrainLosSourceRefs(TerrainType.Water),
    ],
  ),
  'terrain-los-water-endpoint-blocking': integrated(
    'terrain-los-water-endpoint-blocking',
    'calculateLOS blocks source-backed land-to-depth-2+ water endpoint sightlines in both directions and validateLineOfSightForAttack converts those direct-fire declarations into no-side-effect AttackInvalid events',
    terrainLosSourceRefs(TerrainType.Water),
  ),
  'terrain-los-underwater-clear-hex-blocking': integrated(
    'terrain-los-underwater-clear-hex-blocking',
    'calculateLOS blocks source-backed underwater-to-underwater sightlines and underwater-combat sightlines from represented non-land endpoints when they trace through any clear/non-water depth-0 intervening hex, matching MegaMek direct LOS underwater-combat blocking; validateLineOfSightForAttack converts those direct-fire declarations into no-side-effect AttackInvalid events',
    terrainLosSourceRefs(TerrainType.Water),
  ),
  'terrain-los-underwater-depth-height-side-paths': integrated(
    'terrain-los-underwater-depth-height-side-paths',
    'calculateLOS classifies represented water endpoints from explicit endpoint LOS elevations when supplied, preserves legacy depth-only classification otherwise, exposes minimumWaterDepth across endpoints and traced side paths for torpedo-style metadata, and blocks underwater combat when the traced minimum depth drops below 1',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-same-building-hex-blocking': integrated(
    'terrain-los-same-building-hex-blocking',
    'calculateLOS counts intervening building terrain sharing both endpoint buildingId values and blocks once represented same-building building hexes exceed two; runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    terrainLosSourceRefs(TerrainType.Building),
  ),
  'terrain-los-same-building-level-count': integrated(
    'terrain-los-same-building-level-count',
    'calculateLOS counts represented endpoint base-elevation differences and explicit endpoint LOS-height differences as same-building building levels when both endpoints share a buildingId, then blocks once the combined same-building level/hex count exceeds two; runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events without claiming broader building-level parity',
    [
      ...MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
      ...terrainLosSourceRefs(TerrainType.Building),
    ],
  ),
  'terrain-los-building-height-blocking': integrated(
    'terrain-los-building-height-blocking',
    'calculateLOS blocks represented non-diagram building sightlines when an intervening Building terrain feature level plus hex elevation rises above the taller endpoint or an adjacent endpoint, allows non-adjacent sightlines over buildings no higher than the taller endpoint, and runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    [
      ...MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
      ...terrainLosSourceRefs(TerrainType.Building),
    ],
  ),
  'terrain-los-divided-side-path-blocking': integrated(
    'terrain-los-divided-side-path-blocking',
    'calculateLOS detects represented degree % 60 == 30 divided LOS bearings, traces both adjacent split-side paths, and keeps the defender-favorable blocker or intervening terrain modifier result instead of silently using the rounded single hexLine path; runAttackPhase converts represented divided-LOS blockers into no-side-effect AttackInvalid events',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-divided-elevation-blocking': integrated(
    'terrain-los-divided-elevation-blocking',
    'calculateLOS applies the same pure-elevation blocker test to represented divided LOS side paths, keeps the defender-favorable split-side elevation blocker, reports blockingElevation without synthesizing blocking terrain, and runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-intervening-elevation-blocking': integrated(
    'terrain-los-intervening-elevation-blocking',
    'calculateLOS blocks represented single-path sightlines when an intervening clear hex elevation rises above the interpolated LOS height, reports blockingElevation without synthesizing a blocking terrain feature, and runAttackPhase converts those direct-fire declarations into no-side-effect AttackInvalid events',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-represented-pure-elevation': integrated(
    'terrain-los-tacops-diagram-represented-pure-elevation',
    'Split sub-branch: calculateLOS represents the terrain-height side of MegaMek TacOps diagram elevation checks only for clear-hex pure elevation on straight and divided side paths, reports blockingElevation, and converts direct-fire declarations into no-side-effect AttackInvalid events; this row does not claim ADVANCED_COMBAT_TAC_OPS_LOS1 option state or diagram-height terrain-effect parity',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-represented-terrain-effects': integrated(
    'terrain-los-tacops-diagram-represented-terrain-effects',
    'Split sub-branch: calculateLOS exposes explicit TacOps diagram LOS option state for represented woods and smoke terrain effects, preserving current diagram-style defaults while allowing non-diagram endpoint-height checks to omit terrain effects that only the interpolated diagram LOS line reaches',
    [
      ...TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
      MEKSTATION_LINE_OF_SIGHT_HELPER_SOURCE_REF,
    ],
  ),
  'terrain-los-side-paths': integrated(
    'terrain-los-side-paths',
    'Split-accounting row: core direct TerrainType blockers and single-path calculateLOS/hexLine cumulative woods/smoke LOS density are integrated under terrain-los-blocking and per-TerrainType LOS rows; source-backed land-to-depth-2+ water endpoint blocking is split under terrain-los-water-endpoint-blocking; represented underwater clear/non-water depth-0 sightline blocking is split under terrain-los-underwater-clear-hex-blocking; represented underwater endpoint-height classification and minimum-water-depth metadata are split under terrain-los-underwater-depth-height-side-paths; represented same-building building-hex blocking is split under terrain-los-same-building-hex-blocking; represented same-building endpoint base-elevation and explicit LOS-height difference counting is split under terrain-los-same-building-level-count; represented non-diagram building feature height blocking and taller-endpoint/adjacent-endpoint building-level cases are split under terrain-los-building-height-blocking; represented fuel-tank elevation metadata is split under terrain-los-fuel-tank-elevation; represented grounded DropShip entity cover, represented hard/soft building classification, represented building/fuel-tank damageable cover-provider metadata, and represented cover-hit damage routing into constructionFactor terrain state are split under terrain-los-grounded-dropship-cover-providers, terrain-los-hard-soft-building-cover-providers, terrain-los-fuel-tank-damageable-cover-providers, and terrain-los-damageable-cover-hit-resolution-routing; represented divided LOS side-path blocking and modifier selection is split under terrain-los-divided-side-path-blocking; represented divided LOS pure-elevation blocking is split under terrain-los-divided-elevation-blocking; represented single-path pure elevation blocking with direct-fire invalidation is split under terrain-los-intervening-elevation-blocking; represented clear-hex pure-elevation overlap with TacOps diagram terrain-height checks is split under terrain-los-tacops-diagram-represented-pure-elevation; represented woods/smoke/heavy-industrial/planted-field TacOps diagram terrain-effect option state is split under terrain-los-tacops-diagram-represented-terrain-effects, terrain-los-tacops-diagram-industrial-zone-side-paths, and terrain-los-tacops-diagram-planted-field-side-paths; represented combat-caller TacOps LOS1 option propagation is split under terrain-los-tacops-diagram-combat-caller-option-propagation; no represented BattleMech terrain LOS side-path leaf remains unsupported',
    MEGAMEK_TERRAIN_LOS_SIDE_PATH_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-industrial-zone-side-paths': integrated(
    'terrain-los-tacops-diagram-industrial-zone-side-paths',
    'calculateLOS models represented HeavyIndustrial terrain as the MegaMek heavy-industrial TacOps LOS1 side-path terrain class, applies explicit diagram-height gating on straight and divided side paths, adds +1 intervening modifier per counted hex, and blocks LOS once the represented count exceeds two',
    TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-planted-field-side-paths': integrated(
    'terrain-los-tacops-diagram-planted-field-side-paths',
    'calculateLOS models represented PlantedField terrain as the MegaMek planted-field TacOps LOS1 side-path terrain class, applies explicit diagram-height gating on straight and divided side paths, adds +1 intervening modifier per two counted fields, and blocks LOS once the represented count exceeds five',
    TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-tacops-diagram-combat-caller-option-propagation': integrated(
    'terrain-los-tacops-diagram-combat-caller-option-propagation',
    'Runner weapon attack LOS validation, runner C3 spotter LOS checks, interactive direct attack declarations, interactive indirect spotter terrain effects, and indirect-fire spotter election thread explicit optionalRules through lineOfSightOptionsFromOptionalRules so represented woods/smoke TacOps LOS1 diagram terrain effects turn on only when a recognized ADVANCED_COMBAT_TAC_OPS_LOS1-style rule is present',
    [
      ...TACOPS_DIAGRAM_LOS_BLOCKER_SOURCE_REFS,
      ...MEKSTATION_TACOPS_LOS_CALLER_OPTION_SOURCE_REFS,
    ],
  ),
  'terrain-los-grounded-dropship-cover-providers': integrated(
    'terrain-los-grounded-dropship-cover-providers',
    'calculateLOS consumes represented occupant state keyed by hex occupantId, treats non-destroyed grounded DropShip occupants as level-10 LOS cover, records grounded DropShip damageable-cover provider metadata for partial-cover consumers, and runner weapon LOS plus C3 spotter LOS now thread combat-state occupants through that helper while leaving destroyed, airborne, and non-DropShip occupants inert',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-fuel-tank-elevation': integrated(
    'terrain-los-fuel-tank-elevation',
    'calculateLOS consumes explicit Building feature fuelTankElevation metadata as the FUEL_TANK_ELEV-derived LOS height and preserves fuelTankId in terrain encoding for future cover-provider routing; this covers fuel-tank elevation only, not damageable cover-provider output',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-fuel-tank-damageable-cover-providers': integrated(
    'terrain-los-fuel-tank-damageable-cover-providers',
    'calculateLOS records represented fuel-tank terrain features with explicit fuelTankElevation/fuelTankId metadata as damageable cover providers for horizontal partial-cover situations without treating them as generic building providers',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-hard-soft-building-cover-providers': integrated(
    'terrain-los-hard-soft-building-cover-providers',
    'calculateLOS records represented Building features as damageable cover providers for horizontal partial-cover situations and classifies them through constructionFactor metadata, matching the BLDG_CF > 90 hard-building branch while treating represented non-hard building elevation as soft',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
  'terrain-los-damageable-cover-hit-resolution-routing': integrated(
    'terrain-los-damageable-cover-hit-resolution-routing',
    'resolveWeaponHit consumes represented LOS building/fuel-tank damageable cover-provider metadata on covered leg-hit absorption, emits TerrainChanged with damageable_cover_hit, reduces provider constructionFactor terrain state, removes exhausted represented providers, and mutates the runner grid so later same-phase shots see the changed cover state',
    DROPSHIP_SPECIAL_BUILDING_LOS_BLOCKER_SOURCE_REFS,
  ),
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
  mines: integrated(
    'mines',
    'represented TerrainType.Mines hex entry applies default or encoded feature-level BattleMech leg damage plus resulting damage PSR evidence during runner movement, including forward, lateral, and jump entry steps, while explicit non-Mek units receive no invented minefield damage',
    [
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-entry-side-paths': integrated(
    'minefield-represented-entry-side-paths',
    'represented TerrainType.Mines BattleMech entry side paths are integrated for forward, lateral, and jump entry, same-hex non-entry suppression, per-declaration duplicate-coordinate suppression, and default or encoded feature-level leg damage while lifecycle replay is covered by the coordinate-state lifecycle row',
    [
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-encoded-damage-levels': integrated(
    'minefield-represented-encoded-damage-levels',
    'represented TerrainType.Mines feature levels are integrated as a bounded local per-leg BattleMech damage amount, with movement behavior coverage proving encoded level 6 applies 6 damage to each leg without treating that marker as full MegaMek minefield density/type semantics',
    [
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-coordinate-state-entry-damage': integrated(
    'minefield-represented-coordinate-state-entry-damage',
    'represented battle-wide IGameState.minefields coordinate state is cataloged for canonical coordToKey q,r lookup of conventional minefield entry damage, with BattleMech movement applying explicit per-leg damage on visible, detected, or hidden conventional minefield entry while non-conventional type behavior remains in the unsupported variant row',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-conventional-detonated-state': integrated(
    'minefield-represented-conventional-detonated-state',
    'represented battle-wide IGameState.minefields coordinate entries support explicit conventional minefield state plus already-detonated suppression, proving an inert detonated entry produces no BattleMech damage without claiming hidden/reveal, placement, clearing, command detonation, or non-conventional type behavior',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-coordinate-state-lifecycle': integrated(
    'minefield-represented-coordinate-state-lifecycle',
    'represented battle-wide IGameState.minefields coordinate entries support event-sourced add, set, remove, clear, reset, and detonate lifecycle replay plus density preservation for conventional minefield state without claiming hidden/reveal, placement authoring, clearing/sweeper behavior, command-detonated type controls, or non-conventional type variants',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-manual-conventional-detonation': integrated(
    'minefield-represented-manual-conventional-detonation',
    'represented manual conventional coordinate minefield detonation emits a replayable MinefieldChanged manual_adjustment detonate event, marks the coordinate inert for later movement entry, and produces no damage or PSR side effects at command time while non-conventional coordinate variants remain fail-closed',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-movement-detonation-event': integrated(
    'minefield-represented-movement-detonation-event',
    'represented battle-wide IGameState.minefields coordinate entries without explicit density emit and apply a MinefieldChanged movement_detonation event when BattleMech movement trips the represented conventional minefield, preserving legacy detonated state for replay without claiming collateral reset, hidden/reveal, clearing/sweeper behavior, command-detonated type controls, or non-conventional type variants',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-density-trigger-target': integrated(
    'minefield-represented-density-trigger-target',
    'represented coordinate minefield density is integrated for MegaMek-aligned detonation target thresholds: omitted or density <15 uses target 9, density 20 uses target 8, and density 25 uses target 7 before existing Eagle Eyes relief is applied',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-density-reduction': integrated(
    'minefield-represented-density-reduction',
    'represented coordinate minefield detonation reduces represented conventional and inferno density by one 5-point step when the source-backed density reduction roll succeeds, preserves a minimum density of 5, emits MinefieldChanged with movement_detonation reason, and leaves non-density legacy coordinate entries on the explicit detonated-state path',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-inferno-entry-heat': integrated(
    'minefield-represented-inferno-entry-heat',
    'represented explicit inferno coordinate minefields with positive density follow MegaMek enterMinefield inferno damage shape by converting density/2 missiles into pendingExternalHeat, marking infernoBurning for later GO_PRONE wash-off, reducing represented density through the shared minefield density-reduction roll, and emitting no conventional leg damage, damage PSR, or immediate HeatGenerated event',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-active-ground-suppression': integrated(
    'minefield-represented-active-ground-suppression',
    'represented active minefield coordinate entries follow MegaMek enterMinefield active-mine branching for BattleMech ground entry by suppressing detonation before trigger rolling, leaving state unchanged, and emitting no damage, MinefieldChanged, PSR, or heat side effects; represented BattleMech jump entry is covered by the active non-ground trigger row',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-non-conventional-type-guard': integrated(
    'minefield-represented-non-conventional-type-guard',
    'represented coordinate minefield state is explicitly typed and fail-closed for non-conventional movement-entry data that is not handled by its source-specific branch: command-detonated entries, malformed vibrabomb entries without positive density/setting, and inferno entries without positive density are not treated as conventional BattleMech leg-damage minefields; represented EMP, command-detonated manual control, active ground-entry suppression, and vibrabomb triggers are covered separately with no fallback to conventional damage',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-non-battlemech-sea-variants': outOfScope(
    'minefield-non-battlemech-sea-variants',
    'MegaMek Minefield carries sea/depth state and TWGameManager routes minefield entry through broad Entity handling, but this BattleMech validation catalog only represents ground BattleMech TerrainType.Mines entry damage',
    'Non-BattleMech minefield entry behavior and sea-mine/depth variants stay outside this BattleMech suite instead of being counted as BattleMech terrain-environment blockers',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-variant-side-paths': integrated(
    'minefield-variant-side-paths',
    'Split-accounting row: MegaMek minefield source truth, MekStation scenario MINEFIELD modifier data, represented TerrainType.Mines BattleMech entry damage, represented encoded damage levels, represented entry side paths, represented battle-wide coordinate-state entry damage, represented inferno density external-heat entry and GO_PRONE residual wash-off, represented active ground-entry suppression plus represented BattleMech jump-entry active mine triggers, represented EMP no-effect/interference/shutdown events and state, represented vibrabomb density/setting same-hex and proximity triggers, represented conventional/detonated coordinate state, represented coordinate-state lifecycle replay, represented explicit GameCreated/prebattle coordinate minefield authoring, represented manual conventional detonation control, represented command-detonated manual detonation control, represented movement detonation event emission, represented density trigger targets, represented density reduction, represented hidden conventional coordinate minefield detection/reveal state, represented conventional minefield clearing/sweeper/reset actions, represented typed non-conventional no-fallback guards, and non-BattleMech/sea-mine scope are source-pinned separately; no represented BattleMech minefield variant side-path row remains unsupported',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_SCENARIO_MINEFIELD_MODIFIER_SOURCE_REF,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_GAME_CREATED_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_TERRAIN_TYPE_ENUM_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-hidden-reveal-detection': integrated(
    'minefield-hidden-reveal-detection',
    'represented hidden conventional coordinate minefields preserve hidden/revealed/detectedBySides state, apply side-scoped MinefieldChanged detection events without damage side effects, and reveal publicly when movement detonates the represented conventional minefield',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-campaign-placement-authoring': integrated(
    'minefield-campaign-placement-authoring',
    'MekStation campaign/scenario placement authoring is represented only when a producer supplies explicit coordinate-authored IGameState.minefields through GameCreated or prebattle skirmish config; the abstract MINEFIELD modifier remains source-pinned context and does not synthesize random, hidden, typed, or density-aware minefields without explicit combat state',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_SCENARIO_MINEFIELD_MODIFIER_SOURCE_REF,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_GAME_CREATED_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-clearing-sweeper-collateral-reset': integrated(
    'minefield-clearing-sweeper-collateral-reset',
    'represented conventional coordinate minefields support explicit clearing and mine-sweeper events that step density down to the minimum or remove the minefield, plus collateral reset events that replay a supplied minefield map, without damage or PSR side effects and without promoting non-conventional minefield variants',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_MINEFIELD_EVENT_REDUCER_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-vibrabomb-effects': integrated(
    'minefield-represented-vibrabomb-effects',
    'Represented coordinate vibrabomb minefields require explicit density and setting/sensitivity, trigger from BattleMech tonnage versus setting, apply same-hex damage in 5-point kick-table clusters, support proximity detonation without damaging the moving unit outside the mined hex, and emit MinefieldChanged movement_detonation reduction/removal state without claiming minesweeper or optional no-pre-move side paths',
    [
      ...MEGAMEK_VIBRABOMB_MINEFIELD_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-represented-command-detonation': integrated(
    'minefield-represented-command-detonation',
    'represented command-detonated coordinate minefields preserve their explicit type tag, reject conventional entry damage, and support replayable manual detonation through MinefieldChanged manual_adjustment events without damage, PSR, or movement-entry side effects',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEGAMEK_COMMAND_DETONATED_MINEFIELD_SOURCE_REF,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_MINEFIELD_ACTIONS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-emp-effects': integrated(
    'minefield-emp-effects',
    'Represented EMP coordinate minefields trigger only through BattleMech movement entry, keep detonation separate from conventional leg damage, apply source-backed BattleMech 2-6 no effect / 7-8 interference / 9+ shutdown thresholds, apply explicit hasDroneOS +2 modifier when represented, roll 1d6 duration for interference or shutdown, mutate empInterferenceTurns or shutdown/empShutdownTurns, emit EmpMinefieldEffectApplied for replay, and still use MinefieldChanged for represented detonation/density state',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      ...MEGAMEK_EMP_MINEFIELD_EFFECT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-active-non-ground-triggers': integrated(
    'minefield-active-non-ground-triggers',
    'Represented active coordinate minefields suppress BattleMech ground-entry damage and MinefieldChanged side effects, while represented BattleMech jump entry triggers active-mine leg damage, MinefieldChanged detonation/reduction state, and density target-number handling without promoting command-detonated, EMP, vibrabomb side paths beyond the represented density/setting slice, or non-BattleMech minefield behavior',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
    ],
  ),
  'minefield-inferno-residual-controls': integrated(
    'minefield-inferno-residual-controls',
    'Represented BattleMech inferno coordinate minefields with positive density queue pending external heat plus infernoBurning state, share density reduction, and clear the residual infernoBurning state through runner and interactive GO_PRONE movement; inferno entries without positive density still fail closed without damage or MinefieldChanged side effects',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      ...MEGAMEK_GO_PRONE_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
      mekstationDeviationSourceRef(
        'MekStation runner applyMovementEvent clears infernoBurning when a GO_PRONE movement step is committed.',
        'src/simulation/runner/SimulationRunnerState.ts',
        'L420-L459',
      ),
      mekstationDeviationSourceRef(
        'MekStation interactive movement reducer clears infernoBurning for GO_PRONE movement events.',
        'src/utils/gameplay/gameState/actionLocking.ts',
        'L69-L93',
      ),
    ],
  ),
  'minefield-non-conventional-type-semantics': integrated(
    'minefield-non-conventional-type-semantics',
    'Split-accounting row: represented coordinate minefield state preserves command-detonated, EMP, active, inferno, and malformed vibrabomb type data as explicit tags and fail-closed no-damage/no-side-effect guards, while conventional minefield entry, inferno density external-heat entry, active ground-entry suppression, active jump-entry triggering, represented vibrabomb density/setting triggers, lifecycle, density, hidden/reveal, clearing, and manual conventional detonation behavior are represented separately; remaining non-conventional semantics are narrowed into exact unsupported branch rows',
    [
      ...MEGAMEK_MINEFIELD_MOVEMENT_SOURCE_REFS,
      MEKSTATION_GAME_STATE_MINEFIELDS_SOURCE_REF,
      MEKSTATION_RUNNER_MINEFIELD_SOURCE_REF,
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
    'runHeatPhase emits movement-sourced HeatGenerated for walk/run/sprint/evade/jump movement types, with Sprint using the source-backed normal-engine sprint heat path',
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
