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
  [PSRTrigger.AirMekLanding]: integrated(
    PSRTrigger.AirMekLanding,
    'airMekLandingPsr queues createAirMekLandingPSR for LAM AirMek landings and resolves landing-control PSRs with represented gyro and optional-rule modifiers',
    LOCAL_TERRAIN_PSR_SOURCE_REFS,
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
  [PSRTrigger.ControlledSideslip]: integrated(
    PSRTrigger.ControlledSideslip,
    'movementControlPsr queues createControlledSideslipPSR for represented lateral movement steps and suppresses the check for walking Maneuvering Ace units',
    CONTROLLED_SIDESLIP_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.FlankingAndTurning]: integrated(
    PSRTrigger.FlankingAndTurning,
    'movementControlPsr queues represented flanking-and-turning PSRs for BattleMech run/sprint movement that turns after moving more than one hex, createFlankingAndTurningPSR stamps the movement-step trigger source, and calculatePSRModifiers applies Maneuvering Ace target-number relief',
    FLANKING_AND_TURNING_PSR_SOURCE_REFS,
  ),
  [PSRTrigger.OutOfControl]: integrated(
    PSRTrigger.OutOfControl,
    'createOutOfControlPSR stamps represented out_of_control pending PSRs and runPSRPhase resolves them through source-backed PSR target-number modifiers; BattleMech out-of-control movement production remains tracked by pilotSkills.pilotModifierResolvers.maneuvering-ace-out-of-control-producer-application',
    OUT_OF_CONTROL_PSR_SOURCE_REFS,
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
