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

export const PSR_RESOLUTION_COMBAT_SUPPORT = {
  'pending-psr-resolution': integrated(
    'pending-psr-resolution',
    'runPSRPhase resolves unit.pendingPSRs through resolveAllPSRs',
    PSR_ROLL_RESOLUTION_SOURCE_REFS,
  ),
  'psr-resolved-events': integrated(
    'psr-resolved-events',
    'runPSRPhase emits PSRResolved with canonical reasonCode when present',
    PSR_ROLL_RESOLUTION_SOURCE_REFS,
  ),
  'psr-reason-code-preservation': integrated(
    'psr-reason-code-preservation',
    'PSRTriggered reducers preserve canonical reasonCode into pendingPSRs and heat shutdown triggers stamp PSRTrigger.Shutdown',
    PSR_REASON_CODE_SOURCE_REFS,
  ),
  'failed-psr-fall': integrated(
    'failed-psr-fall',
    'runPSRPhase marks the unit prone and emits UnitFell when resolveAllPSRs reports unitFell',
    PSR_FALL_SOURCE_REFS,
  ),
  'fall-pilot-wound': integrated(
    'fall-pilot-wound',
    'runPSRPhase adds one pilot wound on failed PSR fall',
    PSR_FALL_SOURCE_REFS,
  ),
  'fall-pilot-death': integrated(
    'fall-pilot-death',
    'runPSRPhase emits UnitDestroyed cause pilot_death when fall wounds reach the lethal threshold',
    PSR_FALL_SOURCE_REFS,
  ),
  'fall-pilot-hit-event': integrated(
    'fall-pilot-hit-event',
    'runPSRPhase and resolvePendingPSRs emit PilotHit source=fall when a failed PSR causes a pilot wound',
    PSR_FALL_SOURCE_REFS,
  ),
  'pending-psr-clear': integrated(
    'pending-psr-clear',
    'runPSRPhase clears pendingPSRs after pass or fall resolution',
    PSR_ROLL_RESOLUTION_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
