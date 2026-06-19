import { RangeBracket } from '@/types/gameplay';

import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import { MEGAMEK_TAC_OPS_EVADE_SOURCE_REFS } from './CombatPilotModifierSourceRefs';
import {
  MEGAMEK_EXTREME_RANGE_BRACKET_SOURCE_REFS,
  MEGAMEK_MINIMUM_RANGE_SOURCE_REFS,
  MEGAMEK_OUT_OF_RANGE_SOURCE_REFS,
  MEGAMEK_STANDARD_RANGE_BRACKET_SOURCE_REFS,
} from './CombatRangeSourceRefs';
import { MEGAMEK_TO_HIT_SOURCE_VERSION } from './CombatRuleSupport.sourceRefs';
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
