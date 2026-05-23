import { PSRTrigger } from '@/types/gameplay';

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

const MEGAMEK_DFA_ATTACKER_PSR_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek resolveDfaAttack queues attacker PilotingRollData +4 for "executed death from above" after a successful DFA.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15417-L15422',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_DFA_MISS_FALL_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek resolveDfaAttack displaces the target on a missed DFA, then immediately calls doEntityFall on the attacker with fall height 2 and facing 3.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L15225-L15245',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek doEntityFall rolls checkPilotAvoidFallDamage after fall damage and adds fallHeight - 1 to the pilot-damage avoidance target.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23233-L23357',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

export const ACTION_ELIGIBILITY_COMBAT_SUPPORT = {
  destroyed: integrated(
    'destroyed',
    'gameStateReducer action predicates plus runner movement/weapon/physical phases skip destroyed units',
  ),
  shutdown: integrated(
    'shutdown',
    'gameStateReducer action predicates, interactive action queries, and runner action phases skip shutdown units',
  ),
  unconscious: integrated(
    'unconscious',
    'gameStateReducer action predicates, interactive action queries, and runner action phases skip pilotConscious=false units',
  ),
  retreated: integrated(
    'retreated',
    'gameStateReducer action predicates, target filters, and runner attack phases skip hasRetreated units',
  ),
  ejected: integrated(
    'ejected',
    'UnitEjected reducer, interactive action queries, and runner attack phases skip hasEjected units',
  ),
  'shutdown-targetability': integrated(
    'shutdown-targetability',
    'interactive target filtering keeps shutdown enemy units targetable while removing them as actors',
  ),
  'retreated-targetability': integrated(
    'retreated-targetability',
    'interactive and runner target filters reject hasRetreated units as targets',
  ),
  'ejected-targetability': integrated(
    'ejected-targetability',
    'interactive and runner target filters reject hasEjected units as targets',
  ),
  'ejection-damage-preservation': integrated(
    'ejection-damage-preservation',
    'UnitEjected reducer marks hasEjected without mutating armor, structure, destroyed, or pilotConscious',
  ),
  'force-survivor-counts': integrated(
    'force-survivor-counts',
    'checkVictoryConditions excludes destroyed, retreated, and ejected units from remaining force counts',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const PSR_RESOLUTION_COMBAT_SUPPORT = {
  'pending-psr-resolution': integrated(
    'pending-psr-resolution',
    'runPSRPhase resolves unit.pendingPSRs through resolveAllPSRs',
  ),
  'psr-resolved-events': integrated(
    'psr-resolved-events',
    'runPSRPhase emits PSRResolved with canonical reasonCode when present',
  ),
  'psr-reason-code-preservation': integrated(
    'psr-reason-code-preservation',
    'PSRTriggered reducers preserve canonical reasonCode into pendingPSRs and heat shutdown triggers stamp PSRTrigger.Shutdown',
  ),
  'failed-psr-fall': integrated(
    'failed-psr-fall',
    'runPSRPhase marks the unit prone and emits UnitFell when resolveAllPSRs reports unitFell',
  ),
  'fall-pilot-wound': integrated(
    'fall-pilot-wound',
    'runPSRPhase adds one pilot wound on failed PSR fall',
  ),
  'fall-pilot-death': integrated(
    'fall-pilot-death',
    'runPSRPhase emits UnitDestroyed cause pilot_death when fall wounds reach the lethal threshold',
  ),
  'fall-pilot-hit-event': integrated(
    'fall-pilot-hit-event',
    'runPSRPhase and resolvePendingPSRs emit PilotHit source=fall when a failed PSR causes a pilot wound',
  ),
  'pending-psr-clear': integrated(
    'pending-psr-clear',
    'runPSRPhase clears pendingPSRs after pass or fall resolution',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const RUNNER_PSR_TRIGGER_COMBAT_SUPPORT = {
  [PSRTrigger.PhaseDamage20Plus]: integrated(
    PSRTrigger.PhaseDamage20Plus,
    'weaponAttackHitResolution queues createDamagePSR after 20+ damage in a phase',
  ),
  [PSRTrigger.LegDamage]: integrated(
    PSRTrigger.LegDamage,
    'weaponAttackHitResolution emits PSRTriggered and queues createLegDamagePSR when leg structure takes damage',
  ),
  [PSRTrigger.HipActuatorDestroyed]: integrated(
    PSRTrigger.HipActuatorDestroyed,
    'critical hit actuator pipeline emits PSRTriggered reasonCode hip_actuator_destroyed',
  ),
  [PSRTrigger.GyroHit]: integrated(
    PSRTrigger.GyroHit,
    'critical hit gyro pipeline emits PSRTriggered reasonCode gyro_hit',
  ),
  [PSRTrigger.EngineHit]: integrated(
    PSRTrigger.EngineHit,
    'critical hit engine pipeline emits PSRTriggered reasonCode engine_hit and runner queues the pending PSR for resolution',
  ),
  [PSRTrigger.UpperLegActuatorHit]: integrated(
    PSRTrigger.UpperLegActuatorHit,
    'critical hit actuator pipeline emits PSRTriggered reasonCode upper_leg_actuator_hit',
  ),
  [PSRTrigger.LowerLegActuatorHit]: integrated(
    PSRTrigger.LowerLegActuatorHit,
    'critical hit actuator pipeline emits PSRTriggered reasonCode lower_leg_actuator_hit',
  ),
  [PSRTrigger.FootActuatorHit]: integrated(
    PSRTrigger.FootActuatorHit,
    'critical hit actuator pipeline emits PSRTriggered reasonCode foot_actuator_hit',
  ),
  [PSRTrigger.Kicked]: integrated(
    PSRTrigger.Kicked,
    'physicalAttackPsr queues createKickedPSR for kick target falls',
  ),
  [PSRTrigger.Charged]: integrated(
    PSRTrigger.Charged,
    'physicalAttackPsr queues createChargedPSR for charge target falls',
  ),
  [PSRTrigger.DFATarget]: integrated(
    PSRTrigger.DFATarget,
    'physicalAttackPsr queues createDFATargetPSR for DFA target falls and createDFAAttackerPSR +4 for successful DFA attackers',
    MEGAMEK_DFA_ATTACKER_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.Pushed]: integrated(
    PSRTrigger.Pushed,
    'physicalAttackPsr queues createPushedPSR for push target falls',
  ),
  [PSRTrigger.KickMiss]: integrated(
    PSRTrigger.KickMiss,
    'physicalAttackPsr queues createKickMissPSR for attacker kick misses',
  ),
  [PSRTrigger.ChargeMiss]: integrated(
    PSRTrigger.ChargeMiss,
    'physicalAttackPsr queues createChargeMissPSR for attacker charge misses',
  ),
  [PSRTrigger.DFAMiss]: helperOnly(
    PSRTrigger.DFAMiss,
    'createDFAMissPSR remains available for legacy/no-grid fallback coverage',
    'Source-backed grid resolution applies immediate missed-DFA fall damage, UnitFell, and pilot-damage avoidance instead of queuing a normal DFAMiss PSR',
    MEGAMEK_DFA_MISS_FALL_SOURCE_REFS,
  ),
  [PSRTrigger.Shutdown]: integrated(
    PSRTrigger.Shutdown,
    'runHeatPhase emits PSRTriggered and queues createShutdownPSR when heat shutdown occurs',
  ),
  [PSRTrigger.StandingUp]: integrated(
    PSRTrigger.StandingUp,
    'runMovementPhase resolves createStandingUpPSR attempts for prone units before movement commit',
  ),
  [PSRTrigger.EnteringRubble]: integrated(
    PSRTrigger.EnteringRubble,
    'movementTerrainPsr queues createRubblePSR from MovementDeclared step terrain',
  ),
  [PSRTrigger.RunningRoughTerrain]: integrated(
    PSRTrigger.RunningRoughTerrain,
    'movementTerrainPsr queues createRunningRoughTerrainPSR when running through rough terrain',
  ),
  [PSRTrigger.MovingOnIce]: integrated(
    PSRTrigger.MovingOnIce,
    'movementTerrainPsr queues createIcePSR from MovementDeclared step terrain',
  ),
  [PSRTrigger.EnteringWater]: integrated(
    PSRTrigger.EnteringWater,
    'movementTerrainPsr queues createEnteringWaterPSR for valid water entry such as jump landings',
  ),
  [PSRTrigger.ExitingWater]: integrated(
    PSRTrigger.ExitingWater,
    'movementTerrainPsr queues createExitingWaterPSR when movement leaves water terrain',
  ),
  [PSRTrigger.Skidding]: integrated(
    PSRTrigger.Skidding,
    'movementTerrainPsr queues createSkiddingPSR for running turn steps on pavement or ice',
  ),
  [PSRTrigger.RunningDamagedHip]: integrated(
    PSRTrigger.RunningDamagedHip,
    'movementDamagePsr queues createRunningDamagedHipPSR when a unit runs with hip actuator damage',
  ),
  [PSRTrigger.RunningDamagedGyro]: integrated(
    PSRTrigger.RunningDamagedGyro,
    'movementDamagePsr queues createRunningDamagedGyroPSR when a unit runs with gyro damage',
  ),
  [PSRTrigger.BuildingCollapse]: helperOnly(
    PSRTrigger.BuildingCollapse,
    'createBuildingCollapsePSR factory + resolveAllPSRs modifier math',
    'building collapse movement/damage triggers are not wired into runner combat',
  ),
  [PSRTrigger.MASCFailure]: helperOnly(
    PSRTrigger.MASCFailure,
    'createMASCFailurePSR factory + resolveAllPSRs modifier math',
    'MASC failure checks are not wired into runner movement',
  ),
  [PSRTrigger.SuperchargerFailure]: helperOnly(
    PSRTrigger.SuperchargerFailure,
    'createSuperchargerFailurePSR factory + resolveAllPSRs modifier math',
    'supercharger failure checks are not wired into runner movement',
  ),
} satisfies Record<PSRTrigger, ICombatFeatureSupportEntry>;
