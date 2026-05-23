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

const MEGAMEK_HEAT_AMMO_EXPLOSION_ROLL_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver checks heat >= 19 and routes failed ammo-explosion checks through explodeAmmoFromHeat',
  'server/totalWarfare/HeatResolver.java',
  'L1182-L1217',
);

const MEGAMEK_HEAT_AMMO_SELECTION_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek TWGameManager.explodeAmmoFromHeat selects the most destructive hittable explosive ammo bin before explosion resolution',
  'server/totalWarfare/TWGameManager.java',
  'L22855-L22923',
);

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

export const RUNNER_RANGE_BRACKET_COMBAT_SUPPORT = {
  [RangeBracket.Short]: integrated(
    RangeBracket.Short,
    'runAttackPhase emits AttackDeclared.range="short" with range modifier 0',
  ),
  [RangeBracket.Medium]: integrated(
    RangeBracket.Medium,
    'runAttackPhase emits AttackDeclared.range="medium" with range modifier 2',
  ),
  [RangeBracket.Long]: integrated(
    RangeBracket.Long,
    'runAttackPhase emits AttackDeclared.range="long" with range modifier 4',
  ),
  [RangeBracket.Extreme]: integrated(
    RangeBracket.Extreme,
    'IWeapon.extremeRange hydrates from catalog/adapter data and runAttackPhase emits AttackDeclared.range="extreme" with range modifier 6',
  ),
  [RangeBracket.OutOfRange]: integrated(
    RangeBracket.OutOfRange,
    'runAttackPhase emits AttackInvalid before heat, ammo, or damage side effects',
  ),
} satisfies Record<RangeBracket, ICombatFeatureSupportEntry>;

export const RUNNER_TO_HIT_MODIFIER_COMBAT_SUPPORT = {
  gunnery: integrated(
    'gunnery',
    'runAttackPhase emits AttackDeclared modifiers with IUnitGameState.gunnery',
  ),
  range: integrated(
    'range',
    'runAttackPhase derives short/medium/long brackets and emits AttackDeclared.range',
  ),
  'minimum-range': integrated(
    'minimum-range',
    'runAttackPhase passes baseWeapon.minRange into calculateToHit',
  ),
  'attacker-movement': integrated(
    'attacker-movement',
    'runAttackPhase emits AttackDeclared modifiers with attacker movementThisTurn, and runPhysicalAttackPhase feeds attacker movement into charge to-hit',
  ),
  'target-movement': integrated(
    'target-movement',
    'runAttackPhase emits AttackDeclared modifiers with target movementThisTurn and hexesMovedThisTurn, and runPhysicalAttackPhase feeds target TMM into physical to-hit',
  ),
  heat: integrated(
    'heat',
    'runAttackPhase emits AttackDeclared modifiers with attacker heat',
  ),
  'environmental-conditions': integrated(
    'environmental-conditions',
    'runAttackPhase appends calculateEnvironmentalModifiers for light, precipitation, fog, and missile wind to AttackDeclared modifiers',
  ),
  'partial-cover': integrated(
    'partial-cover',
    'runAttackPhase emits AttackDeclared partial-cover modifiers from target hex terrain',
  ),
  'target-prone': integrated(
    'target-prone',
    'runAttackPhase emits AttackDeclared modifiers with target prone state',
  ),
  'target-immobile': integrated(
    'target-immobile',
    'runAttackPhase emits AttackDeclared immobile modifiers from target shutdown state',
  ),
  'indirect-fire': integrated(
    'indirect-fire',
    'runAttackPhase applies validateLineOfSightForAttack indirect-fire penalty to declared/resolved TN',
  ),
  'pilot-wounds': integrated(
    'pilot-wounds',
    'runAttackPhase passes attacker pilotWounds into calculateToHit',
  ),
  'sensor-damage': integrated(
    'sensor-damage',
    'runAttackPhase passes attacker componentDamage.sensorHits into calculateToHit',
  ),
  'actuator-damage': integrated(
    'actuator-damage',
    'runAttackPhase maps coarse arm actuator damage from componentDamage into calculateToHit',
  ),
  'attacker-prone': integrated(
    'attacker-prone',
    'runAttackPhase passes attacker prone state into calculateToHit',
  ),
  'hull-down': helperOnly(
    'hull-down',
    'calculateHullDownModifier + calculateToHit',
    'runAttackPhase does not derive target hull-down state',
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
    'calculateEcmModifier + calculateToHit optional ecmContext',
    'runAttackPhase does not derive ECM coverage or weapon guidance context',
  ),
  c3: helperOnly(
    'c3',
    'calculateToHitWithC3 + c3Network helpers',
    'runAttackPhase does not call calculateToHitWithC3 or hydrate C3 network state',
  ),
  'terrain-features': integrated(
    'terrain-features',
    'runAttackPhase applies getTerrainToHitModifier for target-in and non-blocking intervening terrain features',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PHYSICAL_DAMAGE_MODIFIER_COMBAT_SUPPORT = {
  tsm: integrated(
    'tsm',
    'UnitHydration, game/session physical contexts, and runPhysicalAttackPhase thread hasTSM into resolvePhysicalAttack so active TSM doubles physical damage at heat 9+',
  ),
  underwater: integrated(
    'underwater',
    'runPhysicalAttackPhase and session physical contexts derive isUnderwater from water-tagged hexes before calculatePhysicalDamage/applyUnderwaterModifier halves physical damage',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const MOVEMENT_RULE_COMBAT_SUPPORT = {
  walk: integrated(
    'walk',
    'validateMovement + GameEngine/InteractiveSession movement validation consume walking MP',
  ),
  run: integrated(
    'run',
    'validateMovement consumes running MP and movement modifiers expose run heat/to-hit cost',
  ),
  jump: integrated(
    'jump',
    'validateMovement enforces jump MP/no-jump-jets and ignores ground terrain entry modifiers',
  ),
  stand: integrated(
    'stand',
    'runMovementPhase resolves stand-up PSRs for prone units and emits UnitStood on success',
  ),
  prone: helperOnly(
    'prone',
    'unit prone state + fall/standing helpers',
    'Voluntary go-prone movement action is not wired through runner/interactive turn resolution',
  ),
  facing: integrated(
    'facing',
    'movement declarations commit final facing and eventPath reports turning MP',
  ),
  'torso-twist': helperOnly(
    'torso-twist',
    'firingArc helpers, AttackAI arc filtering, and TacticalActionDock command surface',
    'No authoritative torso-twist state/intent is persisted through combat resolution',
  ),
  occupancy: integrated(
    'occupancy',
    'validateMovement rejects occupied destination hexes before MP or heat side effects',
  ),
  elevation: integrated(
    'elevation',
    'getHexMovementCost and pathfinding reject ground climbs above legal elevation delta',
  ),
  'heat-mp-penalty': integrated(
    'heat-mp-penalty',
    'validateMovement applies getHeatMovementPenalty to effective MP',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const MOVEMENT_ENHANCEMENT_COMBAT_SUPPORT = {
  [MovementEnhancementType.MASC]: helperOnly(
    MovementEnhancementType.MASC,
    'MovementEnhancement definitions, equipment utilities, sprint_masc formula, and createMASCFailurePSR factory represent the construction/helper layer',
    'No combat MovementType, game intent, wire payload, runner movement activation state, sprint MP validation, or MASC failure trigger is wired',
  ),
  [MovementEnhancementType.SUPERCHARGER]: helperOnly(
    MovementEnhancementType.SUPERCHARGER,
    'MovementEnhancement definitions, equipment utilities, sprint_combined formula, and createSuperchargerFailurePSR factory represent the construction/helper layer',
    'No combat MovementType, game intent, wire payload, runner movement activation state, sprint MP validation, or supercharger failure trigger is wired',
  ),
  [MovementEnhancementType.TSM]: helperOnly(
    MovementEnhancementType.TSM,
    'UnitHydration and physical damage resolution consume TSM for heat-gated melee damage',
    'TSM movement-speed effects are not applied to combat movement capabilities or movement validation',
  ),
  [MovementEnhancementType.PARTIAL_WING]: helperOnly(
    MovementEnhancementType.PARTIAL_WING,
    'MovementEnhancement definitions and equipment utilities represent partial-wing construction data',
    'Partial-wing jump MP effects are not hydrated into combat movement capabilities or movement validation',
  ),
} satisfies Record<
  (typeof MOVEMENT_ENHANCEMENT_DEFINITIONS)[number]['type'],
  ICombatFeatureSupportEntry
>;

export const TERRAIN_ENVIRONMENT_COMBAT_SUPPORT = {
  'terrain-movement-costs': integrated(
    'terrain-movement-costs',
    'validateMovement consumes TERRAIN_PROPERTIES movementCostModifier for every TerrainType',
  ),
  'terrain-los-blocking': integrated(
    'terrain-los-blocking',
    'lineOfSight consumes TerrainType blocksLOS for woods/buildings',
  ),
  'terrain-partial-cover': integrated(
    'terrain-partial-cover',
    'runAttackPhase derives partial cover from target hex terrain',
  ),
  'terrain-to-hit-features': integrated(
    'terrain-to-hit-features',
    'runAttackPhase applies target-in terrain modifiers from the target hex and non-blocking intervening terrain feature modifiers from LOS hexes',
  ),
  'water-ground-disallow': integrated(
    'water-ground-disallow',
    'validateMovement rejects walk/run entry into TerrainType.Water',
  ),
  'water-cooling': integrated(
    'water-cooling',
    'runHeatPhase consumes occupied water terrain via getGridTerrainHeatEffect and emits waterBonus in the HeatDissipated breakdown',
  ),
  'fire-heat': integrated(
    'fire-heat',
    'runHeatPhase consumes occupied fire terrain via getGridTerrainHeatEffect and emits environment-sourced HeatGenerated',
  ),
  'smoke-to-hit': integrated(
    'smoke-to-hit',
    'runAttackPhase applies smoke as both a target-in terrain modifier and non-blocking intervening terrain modifier',
  ),
  fog: integrated(
    'fog',
    'runAttackPhase consumes calculateEnvironmentalModifiers fog output in AttackDeclared to-hit modifiers',
  ),
  night: integrated(
    'night',
    'runAttackPhase consumes calculateEnvironmentalModifiers light output in AttackDeclared to-hit modifiers',
  ),
  wind: integrated(
    'wind',
    'runAttackPhase consumes missile wind to-hit modifiers and runMovementPhase passes environmental wind into validateMovement jump-distance reduction',
  ),
  'extreme-temperature': integrated(
    'extreme-temperature',
    'runHeatPhase and resolveHeatPhase consume getTemperatureHeatModifier through calculateEnvironmentalHeatModifier',
  ),
  atmosphere: integrated(
    'atmosphere',
    'runHeatPhase and resolveHeatPhase consume getAtmosphereHeatModifier through calculateEnvironmentalHeatModifier',
  ),
  dust: helperOnly(
    'dust',
    'No Dust enum; closest modeled weather modifiers are fog/precipitation helpers',
    'dust storms are not represented as a first-class battlefield condition',
  ),
  mines: helperOnly(
    'mines',
    'No TerrainType.Mines entry in the BattleMech movement validator',
    'minefields do not trigger movement damage or PSR resolution',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const HEAT_RULE_COMBAT_SUPPORT = {
  'weapon-heat': integrated(
    'weapon-heat',
    'runHeatPhase sums weaponsFiredThisTurn against weaponsByUnit catalog heat',
  ),
  'movement-heat': integrated(
    'movement-heat',
    'runHeatPhase emits movement-sourced HeatGenerated for walk/run/jump movement types',
  ),
  'jump-distance-heat': integrated(
    'jump-distance-heat',
    'runHeatPhase applies max(JUMP_HEAT, unit.hexesMovedThisTurn) for jump movement heat',
  ),
  'engine-heat': integrated(
    'engine-heat',
    'runHeatPhase adds componentDamage.engineHits * ENGINE_HEAT_PER_CRITICAL',
  ),
  dissipation: integrated(
    'dissipation',
    'runHeatPhase subtracts unit heatSinks * heatSinkType rating, defaulting legacy fixtures to 10 single sinks',
  ),
  'heat-sink-damage': integrated(
    'heat-sink-damage',
    'runHeatPhase reduces dissipation by componentDamage.heatSinksDestroyed at the unit heat-sink rating',
  ),
  'threshold-effects': integrated(
    'threshold-effects',
    'runHeatPhase emits HeatEffectApplied for each met Total Warfare heat threshold',
  ),
  'shutdown-check': integrated(
    'shutdown-check',
    'runHeatPhase emits avoidable ShutdownCheck events at heat 14-29',
  ),
  'auto-shutdown': integrated(
    'auto-shutdown',
    'runHeatPhase emits automatic ShutdownCheck and persists shutdown at heat 30+',
  ),
  startup: integrated(
    'startup',
    'runHeatPhase and resolveHeatPhase emit StartupAttempt and update shutdown state for shutdown units after dissipation',
  ),
  'ammo-explosion-risk': integrated(
    'ammo-explosion-risk',
    'runHeatPhase marks ammoExplosionRisk and emits heat threshold events at risk bands',
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
  ),
  'water-cooling': integrated(
    'water-cooling',
    'runHeatPhase consumes occupied water terrain via getGridTerrainHeatEffect and emits waterBonus in the HeatDissipated breakdown',
  ),
  'fire-heat': integrated(
    'fire-heat',
    'runHeatPhase consumes occupied fire terrain via getGridTerrainHeatEffect and emits environment-sourced HeatGenerated',
  ),
  'environmental-heat': integrated(
    'environmental-heat',
    'runHeatPhase and resolveHeatPhase consume calculateEnvironmentalHeatModifier for atmosphere/temperature dissipation adjustments',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const TERRAIN_TYPE_MOVEMENT_COVERAGE = Object.values(TerrainType);
