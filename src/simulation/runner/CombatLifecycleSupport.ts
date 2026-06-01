/* oxlint-disable max-lines -- Combat support catalogs stay centralized until the OpenSpec change is archived. */
import { PSRTrigger } from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
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
    url: 'src/simulation/runner/phases/postCombat.ts#L50-L282',
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
    DAMAGE_THRESHOLD_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.LegDamage]: integrated(
    PSRTrigger.LegDamage,
    'weaponAttackHitResolution emits PSRTriggered and queues createLegDamagePSR when leg structure takes damage',
    LEG_STRUCTURE_DAMAGE_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.HipActuatorDestroyed]: integrated(
    PSRTrigger.HipActuatorDestroyed,
    'critical hit actuator pipeline emits PSRTriggered reasonCode hip_actuator_destroyed',
    HIP_ACTUATOR_CRITICAL_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.GyroHit]: integrated(
    PSRTrigger.GyroHit,
    'critical hit gyro pipeline emits PSRTriggered reasonCode gyro_hit',
    GYRO_CRITICAL_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.EngineHit]: integrated(
    PSRTrigger.EngineHit,
    'critical hit engine pipeline emits local PSRTriggered reasonCode engine_hit and runner queues the pending PSR for resolution',
    ENGINE_CRITICAL_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.UpperLegActuatorHit]: integrated(
    PSRTrigger.UpperLegActuatorHit,
    'critical hit actuator pipeline emits PSRTriggered reasonCode upper_leg_actuator_hit',
    LEG_ACTUATOR_CRITICAL_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.LowerLegActuatorHit]: integrated(
    PSRTrigger.LowerLegActuatorHit,
    'critical hit actuator pipeline emits PSRTriggered reasonCode lower_leg_actuator_hit',
    LEG_ACTUATOR_CRITICAL_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.FootActuatorHit]: integrated(
    PSRTrigger.FootActuatorHit,
    'critical hit actuator pipeline emits PSRTriggered reasonCode foot_actuator_hit',
    LEG_ACTUATOR_CRITICAL_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.Kicked]: integrated(
    PSRTrigger.Kicked,
    'physicalAttackPsr queues createKickedPSR for kick target falls',
    PHYSICAL_KICK_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.Charged]: integrated(
    PSRTrigger.Charged,
    'physicalAttackPsr queues source-backed +2 createChargedPSR for charge target and attacker falls after valid displacement',
    PHYSICAL_CHARGE_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.DFATarget]: integrated(
    PSRTrigger.DFATarget,
    'physicalAttackPsr queues createDFATargetPSR for DFA target falls and createDFAAttackerPSR +4 for successful DFA attackers',
    [
      ...PHYSICAL_DFA_TARGET_PSR_SOURCE_REFS,
      ...MEGAMEK_DFA_ATTACKER_PSR_SOURCE_REFS,
    ],
  ),
  [PSRTrigger.Pushed]: integrated(
    PSRTrigger.Pushed,
    'physicalAttackPsr queues createPushedPSR for push target falls',
    PHYSICAL_PUSH_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.DominoEffect]: integrated(
    PSRTrigger.DominoEffect,
    'runner and event-sourced physical displacement queue createDominoEffectPSR for units forced along occupied-hex domino displacement chains',
    PHYSICAL_DOMINO_EFFECT_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.KickMiss]: integrated(
    PSRTrigger.KickMiss,
    'physicalAttackPsr queues createKickMissPSR for attacker kick misses',
    PHYSICAL_KICK_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.ChargeMiss]: outOfScope(
    PSRTrigger.ChargeMiss,
    'createChargeMissPSR remains available as a legacy/local factory, but source-backed charge misses displace without a normal ChargeMiss PSR',
    'Normal source-backed missed-charge BattleMech behavior is covered by displacement; the ChargeMiss PSR factory is a local/legacy compatibility row outside unresolved BattleMech blocker accounting',
    PHYSICAL_CHARGE_MISS_SOURCE_REFS,
  ),
  [PSRTrigger.DFAMiss]: outOfScope(
    PSRTrigger.DFAMiss,
    'createDFAMissPSR remains available for legacy/no-grid fallback coverage',
    'Source-backed missed-DFA BattleMech behavior is covered by immediate fall, fall damage, UnitFell, and pilot-damage avoidance; the DFAMiss PSR factory is a local/no-grid fallback row outside unresolved BattleMech blocker accounting',
    MEGAMEK_DFA_MISS_FALL_SOURCE_REFS,
  ),
  [PSRTrigger.Shutdown]: integrated(
    PSRTrigger.Shutdown,
    'runHeatPhase emits PSRTriggered and queues createShutdownPSR when heat shutdown occurs; MegaMek resolves the shutdown PSR immediately while MekStation queues it for the PSR phase',
    HEAT_SHUTDOWN_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.StandingUp]: integrated(
    PSRTrigger.StandingUp,
    'runMovementPhase resolves createStandingUpPSR attempts for prone units before movement commit; failed stand-up fall damage remains a source-visible local boundary',
    STANDING_UP_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.EnteringRubble]: integrated(
    PSRTrigger.EnteringRubble,
    'movementTerrainPsr queues createRubblePSR from MovementDeclared step terrain',
    terrainPsrSourceRefs(TerrainType.Rubble),
  ),
  [PSRTrigger.RunningRoughTerrain]: integrated(
    PSRTrigger.RunningRoughTerrain,
    'local movementTerrainPsr queues createRunningRoughTerrainPSR when running through rough terrain',
    LOCAL_TERRAIN_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.MovingOnIce]: integrated(
    PSRTrigger.MovingOnIce,
    'local movementTerrainPsr queues createIcePSR from MovementDeclared step terrain',
    LOCAL_TERRAIN_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.EnteringWater]: integrated(
    PSRTrigger.EnteringWater,
    'movementTerrainPsr queues createEnteringWaterPSR for valid water entry such as jump landings',
    terrainPsrSourceRefs(TerrainType.Water),
  ),
  [PSRTrigger.ExitingWater]: integrated(
    PSRTrigger.ExitingWater,
    'local movementTerrainPsr queues createExitingWaterPSR when movement leaves water terrain',
    LOCAL_TERRAIN_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.Skidding]: integrated(
    PSRTrigger.Skidding,
    'movementTerrainPsr queues createSkiddingPSR for running turn steps on pavement or ice',
    terrainPsrSourceRefs(TerrainType.Pavement),
  ),
  [PSRTrigger.SwampBogDown]: integrated(
    PSRTrigger.SwampBogDown,
    'movementTerrainPsr queues createSwampBogDownPSR for non-jump BattleMech swamp entry and emits UnitStuck immediately for jump entry; failed swamp bog-down PSRs set isStuck instead of UnitFell/PilotHit',
    terrainPsrSourceRefs(TerrainType.Swamp),
  ),
  [PSRTrigger.RunningDamagedHip]: integrated(
    PSRTrigger.RunningDamagedHip,
    'movementDamagePsr queues createRunningDamagedHipPSR when a unit runs with hip actuator damage; MegaMek combines hip and gyro into one running-with-damage PSR while MekStation keeps separate reason codes',
    RUNNING_WITH_DAMAGE_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.RunningDamagedGyro]: integrated(
    PSRTrigger.RunningDamagedGyro,
    'movementDamagePsr queues createRunningDamagedGyroPSR when a unit runs with gyro damage; MegaMek combines hip and gyro into one running-with-damage PSR while MekStation keeps separate reason codes',
    RUNNING_WITH_DAMAGE_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.BuildingCollapse]: integrated(
    PSRTrigger.BuildingCollapse,
    'movementTerrainPsr queues createBuildingCollapsePSR when explicit unit tonnage exceeds Building constructionFactor, and resolveAllPSRs applies normal terrain PSR modifier math',
    terrainPsrSourceRefs(TerrainType.Building),
  ),
  [PSRTrigger.MASCFailure]: integrated(
    PSRTrigger.MASCFailure,
    'movementEnhancementPsr queues createMASCFailurePSR for explicit active MASC run movement with source-backed standard fixed target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and applies one critical hit to each leg when the final check fails, and resetTurnState advances/decays prior-use counters before clearing active use',
    MEGAMEK_MP_BOOSTER_FAILURE_SOURCE_REFS,
  ),
  [PSRTrigger.SuperchargerFailure]: integrated(
    PSRTrigger.SuperchargerFailure,
    'movementEnhancementPsr queues createSuperchargerFailurePSR for explicit active Supercharger run movement with source-backed standard fixed target numbers, runPSRPhase consumes edge_when_masc_fails rerolls and destroys the Supercharger slot plus applies the source-backed engine critical table when the final check fails, and resetTurnState advances/decays prior-use counters before clearing active use',
    MEGAMEK_MP_BOOSTER_FAILURE_SOURCE_REFS,
  ),
} satisfies Record<PSRTrigger, ICombatFeatureSupportEntry>;
