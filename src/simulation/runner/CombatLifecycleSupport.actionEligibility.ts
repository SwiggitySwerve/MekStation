/* oxlint-disable max-lines -- Combat support catalogs stay centralized until the OpenSpec change is archived. */
import { PSRTrigger } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  integrated,
  outOfScope,
  type ICombatFeatureSourceReference,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  ACTION_REMOVAL_SOURCE_REFS,
  EJECTED_ACTION_SOURCE_REFS,
  EJECTED_TARGETABILITY_SOURCE_REFS,
  LOCAL_EJECTION_SOURCE_REFS,
  LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  RETREATED_ACTION_SOURCE_REFS,
  RETREATED_TARGETABILITY_SOURCE_REFS,
  SHUTDOWN_TARGETABILITY_SOURCE_REFS,
} from './CombatLifecycleSourceRefs';
import {
  MEGAMEK_COMBAT_SOURCE_VERSION,
  MEKSTATION_SOURCE_VERSION,
  OUT_OF_CONTROL_PSR_SOURCE_REFS,
  CONTROLLED_SIDESLIP_PSR_SOURCE_REFS,
  FLANKING_AND_TURNING_PSR_SOURCE_REFS,
  MEGAMEK_PSR_QUEUE_SOURCE_REFS,
  MEGAMEK_FAILED_PSR_FALL_SOURCE_REFS,
  LOCAL_PSR_RESOLUTION_SOURCE_REFS,
  LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS,
  LOCAL_PSR_REASON_CODE_SOURCE_REFS,
  PSR_ROLL_RESOLUTION_SOURCE_REFS,
  PSR_REASON_CODE_SOURCE_REFS,
  PSR_FALL_SOURCE_REFS,
} from './CombatLifecycleSupport.sourceRefs';
import {
  PHYSICAL_CHARGE_MISS_SOURCE_REFS,
  PHYSICAL_CHARGE_PSR_SOURCE_REFS,
  PHYSICAL_DFA_TARGET_PSR_SOURCE_REFS,
  PHYSICAL_DOMINO_EFFECT_PSR_SOURCE_REFS,
  PHYSICAL_KICK_PSR_SOURCE_REFS,
  PHYSICAL_PUSH_PSR_SOURCE_REFS,
} from './CombatPhysicalPsrSourceRefs';
import {
  DAMAGE_THRESHOLD_PSR_SOURCE_REFS,
  ENGINE_CRITICAL_PSR_SOURCE_REFS,
  GYRO_CRITICAL_PSR_SOURCE_REFS,
  HEAT_SHUTDOWN_PSR_SOURCE_REFS,
  HIP_ACTUATOR_CRITICAL_PSR_SOURCE_REFS,
  LEG_ACTUATOR_CRITICAL_PSR_SOURCE_REFS,
  LEG_STRUCTURE_DAMAGE_PSR_SOURCE_REFS,
  MEGAMEK_DFA_ATTACKER_PSR_SOURCE_REFS,
  MEGAMEK_DFA_MISS_FALL_SOURCE_REFS,
  MEGAMEK_MP_BOOSTER_FAILURE_SOURCE_REFS,
  RUNNING_WITH_DAMAGE_PSR_SOURCE_REFS,
  STANDING_UP_PSR_SOURCE_REFS,
} from './CombatPsrTriggerSourceRefs';
import {
  LOCAL_TERRAIN_PSR_SOURCE_REFS,
  terrainPsrSourceRefs,
} from './CombatTerrainEnvironmentSourceRefs';

export const ACTION_ELIGIBILITY_COMBAT_SUPPORT = {
  destroyed: integrated(
    'destroyed',
    'gameStateReducer action predicates plus runner movement/weapon/physical phases skip destroyed units',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  shutdown: integrated(
    'shutdown',
    'gameStateReducer action predicates, interactive action queries, and runner action phases skip shutdown units',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  unconscious: integrated(
    'unconscious',
    'gameStateReducer action predicates, interactive action queries, and runner action phases skip pilotConscious=false units',
    ACTION_REMOVAL_SOURCE_REFS,
  ),
  retreated: integrated(
    'retreated',
    'gameStateReducer action predicates, target filters, and runner attack phases skip hasRetreated units',
    RETREATED_ACTION_SOURCE_REFS,
  ),
  ejected: integrated(
    'ejected',
    'UnitEjected reducer, interactive action queries, and runner attack phases skip hasEjected units',
    EJECTED_ACTION_SOURCE_REFS,
  ),
  'shutdown-targetability': integrated(
    'shutdown-targetability',
    'interactive target filtering keeps shutdown enemy units targetable while removing them as actors',
    SHUTDOWN_TARGETABILITY_SOURCE_REFS,
  ),
  'retreated-targetability': integrated(
    'retreated-targetability',
    'interactive, runner, ranged attack, physical attack, and objective target filters reject hasRetreated units as targets',
    RETREATED_TARGETABILITY_SOURCE_REFS,
  ),
  'ejected-targetability': integrated(
    'ejected-targetability',
    'interactive, runner, ranged attack, physical attack, and objective target filters reject hasEjected units as targets',
    EJECTED_TARGETABILITY_SOURCE_REFS,
  ),
  'ejection-damage-preservation': integrated(
    'ejection-damage-preservation',
    'UnitEjected reducer marks hasEjected without mutating armor, structure, destroyed, or pilotConscious',
    LOCAL_EJECTION_SOURCE_REFS,
  ),
  'force-survivor-counts': integrated(
    'force-survivor-counts',
    'checkVictoryConditions excludes destroyed, retreated, and ejected units from remaining force counts',
    LOCAL_SURVIVOR_COUNT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
