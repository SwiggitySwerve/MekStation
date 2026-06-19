import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS } from './CombatMovementSourceRefs';
import {
  MEGAMEK_HEAT_SOURCE_VERSION,
  megamekHeatSourceRef,
  mekstationDeviationSourceRef,
} from './CombatRuleSupport.sourceRefs';

export const MEGAMEK_WEAPON_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek WeaponHandler.addHeat adds weapon heat to heatBuildup for possible attacks and skips impossible to-hit attacks.',
  'common/weapons/handlers/WeaponHandler.java',
  'L1924-L1942',
);

export const MEGAMEK_MOVEMENT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek TWGameManager.addMovementHeat adds heat for standing, walking, running, jumping, sprinting, swimming, and damaged radical heat sinks.',
  'server/totalWarfare/TWGameManager.java',
  'L8200-L8231',
);

export const MEGAMEK_MEK_STANDING_WALK_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getStandingHeat and getWalkHeat delegate BattleMech standing/walking heat to the engine and damaged coolant system state.',
  'common/units/Mek.java',
  'L943-L989',
);

export const MEGAMEK_MEK_RUN_SPRINT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getRunHeat and getSprintHeat delegate running/sprinting heat to the engine and add damaged coolant or evasion heat where applicable.',
  'common/units/Mek.java',
  'L1034-L1077',
);

export const MEGAMEK_ENGINE_RUN_SPRINT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Engine.getRunHeat and getSprintHeat provide the normal-engine 2 run heat and 3 sprint heat values used by BattleMechs without working supercooling myomer.',
  'common/equipment/Engine.java',
  'L693-L713',
);

export const MEGAMEK_MEK_JUMP_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getJumpHeat computes BattleMech jump heat from moved MP, damaged coolant state, partial-wing reduction, and jump-jet type.',
  'common/units/Mek.java',
  'L1281-L1302',
);

export const MEGAMEK_ENGINE_CRIT_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getEngineCritHeat adds 5 heat per fusion-engine critical while the Mek is not shutdown and includes partial-repair heat.',
  'common/units/Mek.java',
  'L1444-L1468',
);

export const MEGAMEK_MEK_HEAT_CAPACITY_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getHeatCapacity counts active heat sinks, double/prototype sinks, partial-wing bonus, radical heat sinks, and damaged/coolant-failure reductions.',
  'common/units/Mek.java',
  'L1552-L1612',
);

export const MEGAMEK_WATER_COOLING_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Mek.getHeatCapacityWithWater adds up to six underwater heat sinks after checking water depth, prone state, and destroyed or breached sink mounts.',
  'common/units/Mek.java',
  'L1616-L1654',
);

export const MEGAMEK_HEAT_DISSIPATION_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver adds heat buildup, sinks heat with getHeatCapacityWithWater plus coolant-pod/radical heat-sink bonuses, reports the sink amount, and clears heatBuildup.',
  'server/totalWarfare/HeatResolver.java',
  'L383-L445',
);

export const MEGAMEK_FIRE_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver adds 5 external heat for units spending a full round in fire terrain, halved by intact heat-dissipating armor.',
  'server/totalWarfare/HeatResolver.java',
  'L157-L177',
);

export const MEGAMEK_EXTERNAL_HEAT_CAP_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver caps external heat at the configured/default 15 points and external cooling at 9 points before adding heat buildup.',
  'server/totalWarfare/HeatResolver.java',
  'L347-L357',
);

export const MEGAMEK_EXTREME_TEMPERATURE_HEAT_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver.adjustHeatExtremeTemp adds or subtracts external heat for planetary temperature outside the 50/-30 thresholds.',
  'server/totalWarfare/HeatResolver.java',
  'L1253-L1285',
);

export const MEGAMEK_HEAT_TO_HIT_THRESHOLD_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek Entity.getHeatFiringModifier applies heat firing modifiers at heat 8/13/17/24 and optional TacOps thresholds 33/41/48, with Some Like It Hot relief.',
  'common/units/Entity.java',
  'L4188-L4216',
);

export const MEKSTATION_ATMOSPHERE_HEAT_SOURCE_REF =
  mekstationDeviationSourceRef(
    'MekStation calculateEnvironmentalHeatModifier applies local atmosphere heat-dissipation adjustments alongside temperature modifiers.',
    'src/utils/gameplay/environmentalModifiers.ts',
    'L257-L359',
  );
export const MEGAMEK_HEAT_AMMO_EXPLOSION_ROLL_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver checks heat >= 19 and routes failed ammo-explosion checks through explodeAmmoFromHeat',
  'server/totalWarfare/HeatResolver.java',
  'L1182-L1217',
);

export const MEGAMEK_HEAT_STARTUP_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver automatically restarts shutdown Meks below heat 14 and rolls startup at heat 14+ when they are not manually shut down',
  'server/totalWarfare/HeatResolver.java',
  'L500-L547',
);

export const MEGAMEK_HEAT_SHUTDOWN_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver applies avoidable shutdown checks at heat 14+ and automatic shutdown at the default heat 30 threshold',
  'server/totalWarfare/HeatResolver.java',
  'L561-L637',
);

export const MEGAMEK_HEAT_AMMO_SELECTION_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek TWGameManager.explodeAmmoFromHeat selects the most destructive hittable explosive ammo bin before explosion resolution',
  'server/totalWarfare/TWGameManager.java',
  'L22855-L22923',
);

export const MEGAMEK_HEAT_PILOT_DAMAGE_SOURCE_REF = megamekHeatSourceRef(
  'MegaMek HeatResolver applies deterministic life-support heat pilot damage at heat 15/25+ and resolves crew death after heat damage',
  'server/totalWarfare/HeatResolver.java',
  'L734-L829',
);

export const MEGAMEK_HEAT_MAXTECH_PILOT_DAMAGE_SOURCE_REF =
  megamekHeatSourceRef(
    'MegaMek HeatResolver applies optional MaxTech heat-scale pilot damage avoid rolls at heat 32/39/47+ and subtracts hotDogMod from the avoid number',
    'server/totalWarfare/HeatResolver.java',
    'L795-L817',
  );

export const MEGAMEK_HEAT_MAXTECH_CRITICAL_DAMAGE_SOURCE_REF =
  megamekHeatSourceRef(
    'MegaMek HeatResolver applies optional MaxTech heat-scale critical damage avoid rolls at heat 36/44+, subtracts hotDogMod, and routes failed rolls to one random BattleMech critical location',
    'server/totalWarfare/HeatResolver.java',
    'L847-L862',
  );

export const MEGAMEK_HEAT_THRESHOLD_SOURCE_REFS = [
  MEGAMEK_HEAT_TO_HIT_THRESHOLD_SOURCE_REF,
  ...MEGAMEK_HEAT_MOVEMENT_PENALTY_SOURCE_REFS,
  MEGAMEK_HEAT_SHUTDOWN_SOURCE_REF,
  MEGAMEK_HEAT_AMMO_EXPLOSION_ROLL_SOURCE_REF,
  MEGAMEK_HEAT_PILOT_DAMAGE_SOURCE_REF,
] satisfies readonly ICombatFeatureSourceReference[];

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
