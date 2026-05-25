import { PSRTrigger } from '@/types/gameplay';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

const MEGAMEK_COMBAT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

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

const MEGAMEK_MP_BOOSTER_FAILURE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek MovePathHandler invokes MASC and Supercharger failure checks during movement resolution when a path has active boosters.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/server/totalWarfare/MovePathHandler.java#L1507-L1519',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity stores standard fixed MASC/Supercharger failure target numbers and maps them from prior consecutive-use turns.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L858-L860',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Entity derives current MASC/Supercharger failure targets from previous consecutive-use counters, then increments used boosters, clears active-use flags, and applies the idle decay marker.',
    url: 'https://github.com/MegaMek/megamek/blob/325b2504c7b7750ecdcb85468621fb2de2ad8e60/megamek/src/megamek/common/units/Entity.java#L13660-L13770',
    sourceVersion: '325b2504c7b7750ecdcb85468621fb2de2ad8e60',
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_PSR_QUEUE_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek Game.addPSR stores PilotingRollData in the pending phase queue and Game.getPSRs exposes that queue for later resolution.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/common/game/Game.java#L2505-L2521`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek resolvePilotingRolls consumes game.getPSRs, combines cumulative PSR modifiers, rolls piloting skill, applies fall handling on failure, and resets the PSR queue.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L16289-L16636`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const MEGAMEK_FAILED_PSR_FALL_SOURCE_REFS = [
  {
    kind: 'megamek-source',
    citation:
      'MegaMek doSkillCheckWhileMoving rolls piloting skill and routes failed fall PSRs into doEntityFallsInto when the failure should cause a fall.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L8666-L8736`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
  {
    kind: 'megamek-source',
    citation:
      'MegaMek doEntityFall rolls pilot fall-damage avoidance after fall damage and applies pilot damage when that avoidance roll fails.',
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/megamek/src/megamek/server/totalWarfare/TWGameManager.java#L23233-L23357`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const LOCAL_PSR_RESOLUTION_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation runPSRPhase resolves unit.pendingPSRs, emits PSRResolved/UnitFell/PilotHit/UnitDestroyed, and clears pendingPSRs after resolution.',
    url: 'src/simulation/runner/phases/postCombat.ts#L50-L219',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation resolveAllPSRs computes target numbers, rolls each pending PSR, reports first failure as unitFell, and returns clearedPSRs for skipped queue entries.',
    url: 'src/utils/gameplay/pilotingSkillRolls/resolution.ts#L46-L158',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation resolvePendingPSRs mirrors interactive/session PSR resolution, fall emission, fall-sourced PilotHit emission, and reasonCode propagation.',
    url: 'src/utils/gameplay/gameSessionPSR.ts#L63-L292',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const LOCAL_PSR_REASON_CODE_SOURCE_REFS = [
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation applyPSRTriggered preserves PSRTriggered.reasonCode into unit.pendingPSRs and applyUnitFell clears pending PSRs after fall resolution.',
    url: 'src/utils/gameplay/gameState/extendedCombat.ts#L23-L104',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
  {
    kind: 'mekstation-deviation',
    citation:
      'MekStation queueRunnerShutdownPSR stamps heat-shutdown PSR triggers with createShutdownPSR reasonCode and appends the pending PSR.',
    url: 'src/simulation/runner/phases/heatShutdownPsr.ts#L9-L37',
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  },
] satisfies readonly ICombatFeatureSourceReference[];

const PSR_ROLL_RESOLUTION_SOURCE_REFS = [
  ...MEGAMEK_PSR_QUEUE_SOURCE_REFS,
  ...LOCAL_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const PSR_REASON_CODE_SOURCE_REFS = [
  ...LOCAL_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_PSR_REASON_CODE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

const PSR_FALL_SOURCE_REFS = [
  ...MEGAMEK_FAILED_PSR_FALL_SOURCE_REFS,
  ...LOCAL_PSR_RESOLUTION_SOURCE_REFS,
  ...LOCAL_INTERACTIVE_PSR_RESOLUTION_SOURCE_REFS,
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
    'interactive, runner, ranged attack, physical attack, and objective target filters reject hasRetreated units as targets',
  ),
  'ejected-targetability': integrated(
    'ejected-targetability',
    'interactive, runner, ranged attack, physical attack, and objective target filters reject hasEjected units as targets',
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
    'movementEnhancementPsr queues createMASCFailurePSR for explicit active MASC run movement with source-backed standard fixed target numbers, and resetTurnState advances/decays prior-use counters before clearing active use',
    'Alternate MASC option tables, Edge reroll, and failure critical-slot damage are not wired',
    MEGAMEK_MP_BOOSTER_FAILURE_SOURCE_REFS,
  ),
  [PSRTrigger.SuperchargerFailure]: helperOnly(
    PSRTrigger.SuperchargerFailure,
    'movementEnhancementPsr queues createSuperchargerFailurePSR for explicit active Supercharger run movement with source-backed standard fixed target numbers, and resetTurnState advances/decays prior-use counters before clearing active use',
    'IndustrialMek/support-unit supercharger roll adjustment, Edge reroll, and failure critical-slot damage are not wired',
    MEGAMEK_MP_BOOSTER_FAILURE_SOURCE_REFS,
  ),
} satisfies Record<PSRTrigger, ICombatFeatureSupportEntry>;
