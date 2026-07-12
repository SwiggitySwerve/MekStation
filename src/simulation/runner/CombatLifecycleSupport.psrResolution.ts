/* oxlint-disable max-lines -- Combat support catalogs stay centralized until the OpenSpec change is archived. */

import {
  integrated,
  type ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';
import {
  PSR_ROLL_RESOLUTION_SOURCE_REFS,
  PSR_REASON_CODE_SOURCE_REFS,
  PSR_FALL_SOURCE_REFS,
} from './CombatLifecycleSupport.sourceRefs';

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
