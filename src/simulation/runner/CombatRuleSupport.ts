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
const MEGAMEK_PHYSICAL_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEGAMEK_MOVEMENT_SOURCE_VERSION =
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
    'calculateEcmModifier + calculateToHit optional ecmContext',
    'runAttackPhase does not derive ECM coverage or weapon guidance context',
  ),
  c3: integrated(
    'c3',
    'runAttackPhase consumes explicit IGameState.c3Network state, refreshes C3 member positions and ECM/iNARC ECM disruption from current unit state, and calls calculateToHitWithC3 for direct weapon attacks; default C3 range sharing does not require spotter LOS',
    MEGAMEK_C3_RANGE_SOURCE_REFS,
  ),
  'c3-equipment-network-formation': helperOnly(
    'c3-equipment-network-formation',
    'UnitHydration derives BattleMech mounted C3 master/slave/C3i equipment roles from catalog equipment and critical slots, c3Network creation helpers validate explicit C3 master/slave and C3i membership, and runAttackPhase consumes prebuilt IGameState.c3Network state',
    'Runner/session state builders do not yet assemble battle-wide C3 or C3i network membership automatically from hydrated mounted equipment',
    [...MEGAMEK_C3_RANGE_SOURCE_REFS, ...MEGAMEK_C3_EQUIPMENT_SOURCE_REFS],
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
  claws: helperOnly(
    'claws',
    'calculatePunchDamage, calculatePunchToHit, eligibility projection, session physical contexts, UnitHydration, and runPhysicalAttackPhase consume claw arm state for source-backed punch damage/to-hit modifiers',
    'Destroyed/missing/breached claw equipment lifecycle, the PLAYTEST_3 no-modifier option, and claw club-with-hand interactions are not modeled',
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
          'MegaMek PunchAttackAction.toHit adds the claw punch modifier and suppresses hand actuator missing/destroyed penalties when claws replace the hand',
        url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_PHYSICAL_SOURCE_VERSION}/megamek/src/megamek/common/actions/PunchAttackAction.java#L309-L333`,
        sourceVersion: MEGAMEK_PHYSICAL_SOURCE_VERSION,
      },
    ],
  ),
  talons: helperOnly(
    'talons',
    'calculateKickDamage, calculateDFADamageToTarget, eligibility projection, session physical contexts, UnitHydration, and runPhysicalAttackPhase consume talon leg state for source-backed +50% kick/DFA damage',
    'Destroyed/missing/breached talon equipment lifecycle and non-biped talon arm-location behavior are not modeled',
    [
      {
        kind: 'megamek-source',
        citation:
          'MegaMek KickAttackAction.getDamageFor applies a 1.5 talon multiplier when the kicking leg has working talons and a working foot actuator',
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
    ],
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
    'unit prone state, fall/standing helpers, and voluntary go-prone game-session/interactive action path',
    'Runner movement AI/planning cannot choose voluntary go-prone, and hull-down, swarmer dislodge, and inferno wash-off nuances are not modeled',
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
    'UnitHydration detects installed MASC, runMovementPhase consumes explicit active MASC run MP, movementEnhancementPsr queues createMASCFailurePSR with source-backed standard fixed failure target numbers, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers still expose sprint_masc formula support',
    'No combat MovementType.Sprint, activation game intent, wire payload, alternate MASC option tables, Edge reroll, or failure critical-slot damage is wired',
    MEGAMEK_MASC_SUPERCHARGER_MOVEMENT_SOURCE_REFS,
  ),
  [MovementEnhancementType.SUPERCHARGER]: helperOnly(
    MovementEnhancementType.SUPERCHARGER,
    'UnitHydration detects installed Supercharger, runMovementPhase consumes explicit active Supercharger run MP, movementEnhancementPsr queues createSuperchargerFailurePSR with source-backed standard fixed failure target numbers, resetTurnState advances/decays prior-use counters and clears active use, and construction helpers still expose sprint_combined formula support',
    'No combat MovementType.Sprint, activation game intent, wire payload, IndustrialMek/support-unit supercharger roll adjustment, Edge reroll, or failure critical-slot damage is wired',
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
