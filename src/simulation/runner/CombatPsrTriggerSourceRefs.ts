import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEGAMEK_COMBAT_SOURCE_VERSION =
  '325b2504c7b7750ecdcb85468621fb2de2ad8e60';
const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

function megaMekSourceRef(
  citation: string,
  path: string,
  lineAnchor: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'megamek-source',
    citation,
    url: `https://github.com/MegaMek/megamek/blob/${MEGAMEK_COMBAT_SOURCE_VERSION}/${path}#${lineAnchor}`,
    sourceVersion: MEGAMEK_COMBAT_SOURCE_VERSION,
  };
}

function mekstationDeviationRef(
  citation: string,
  path: string,
  lineAnchor: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineAnchor}`,
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  };
}

const LOCAL_CRITICAL_PSR_BRIDGE_SOURCE_REFS = [
  mekstationDeviationRef(
    'MekStation applyCriticalPSRTriggers forwards crit-origin psr_triggered events into unit.pendingPSRs unless the unit is destroyed, retreated, or ejected.',
    'src/simulation/runner/phases/weaponAttackPsrTriggers.ts',
    'L82-L120',
  ),
  mekstationDeviationRef(
    'MekStation weaponAttackHelpers converts crit-origin psr_triggered events into runner PSRTriggered events with canonical reasonCode values.',
    'src/simulation/runner/phases/weaponAttackHelpers.ts',
    'L329-L357',
  ),
  mekstationDeviationRef(
    'MekStation heatCriticalDamage converts heat-critical psr_triggered events into runner PSRTriggered events with canonical reasonCode values.',
    'src/simulation/runner/phases/heatCriticalDamage.ts',
    'L145-L169',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_DFA_ATTACKER_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek resolveDfaAttack queues attacker PilotingRollData +4 for "executed death from above" after a successful DFA.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L15417-L15422',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_DFA_MISS_FALL_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek resolveDfaAttack displaces the target on a missed DFA, then immediately calls doEntityFall on the attacker with fall height 2 and facing 3.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L15225-L15245',
  ),
  megaMekSourceRef(
    'MegaMek doEntityFall rolls checkPilotAvoidFallDamage after fall damage and adds fallHeight - 1 to the pilot-damage avoidance target.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L23233-L23357',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEGAMEK_MP_BOOSTER_FAILURE_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek MovePathHandler invokes MASC and Supercharger failure checks during movement resolution when a path has active boosters.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java',
    'L1507-L1519',
  ),
  megaMekSourceRef(
    'MegaMek Entity stores standard fixed MASC/Supercharger failure target numbers and maps them from prior consecutive-use turns.',
    'megamek/src/megamek/common/units/Entity.java',
    'L858-L860',
  ),
  megaMekSourceRef(
    'MegaMek Entity derives current MASC/Supercharger failure targets from previous consecutive-use counters, then increments used boosters, clears active-use flags, and applies the idle decay marker.',
    'megamek/src/megamek/common/units/Entity.java',
    'L13660-L13770',
  ),
  megaMekSourceRef(
    'MegaMek MASC failure applies one random hittable critical slot in each leg and explicitly does not destroy the MASC system.',
    'megamek/src/megamek/common/units/Entity.java',
    'L13966-L13976',
  ),
  megaMekSourceRef(
    'MegaMek Supercharger failure rolls a separate engine-damage table, damages the Supercharger slot, and then applies the resulting critical slots.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L6022-L6048',
  ),
  megaMekSourceRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed MASC checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L5944-L5974',
  ),
  megaMekSourceRef(
    'MegaMek TWGameManager consumes EDGE_WHEN_MASC_FAILS to reroll failed Supercharger checks, spends Edge, and suppresses failure processing when the reroll passes.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L5994-L6024',
  ),
  mekstationDeviationRef(
    'MekStation runPSRPhase routes failed MASCFailure and SuperchargerFailure resolution through movement-enhancement failure critical-damage helpers.',
    'src/simulation/runner/phases/postCombat.ts',
    'L138-L176',
  ),
  mekstationDeviationRef(
    'MekStation psrEdgeRerolls consumes edge_when_masc_fails to reroll failed MASCFailure and SuperchargerFailure PSRs before applying fall or booster-failure aftermath.',
    'src/simulation/runner/phases/psrEdgeRerolls.ts',
    'L23-L193',
  ),
  mekstationDeviationRef(
    'MekStation movement-enhancement failure critical-damage helpers use the critical-slot manifest/effect pipeline for failed MASC and Supercharger checks.',
    'src/simulation/runner/phases/movementEnhancementFailureDamage.ts',
    'L157-L326',
  ),
  mekstationDeviationRef(
    'MekStation movement-enhancement failure event translation emits CriticalHit/CriticalHitResolved/ComponentDestroyed events for failed MASC and Supercharger checks.',
    'src/simulation/runner/phases/movementEnhancementFailureEvents.ts',
    'L11-L138',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const HEAT_SHUTDOWN_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek HeatResolver queues PilotingRollData +3 for "reactor shutdown" when automatic or failed avoidable heat shutdown occurs.',
    'megamek/src/megamek/server/totalWarfare/HeatResolver.java',
    'L561-L637',
  ),
  mekstationDeviationRef(
    'MekStation runHeatPhase routes heat shutdown into queueRunnerShutdownPSR after emitting the ShutdownCheck event and before persisting shutdown state.',
    'src/simulation/runner/phases/postCombat.ts',
    'L389-L497',
  ),
  mekstationDeviationRef(
    'MekStation queueRunnerShutdownPSR emits PSRTriggered with PSRTrigger.Shutdown and appends the pending createShutdownPSR entry for later PSR phase resolution.',
    'src/simulation/runner/phases/heatShutdownPsr.ts',
    'L11-L36',
  ),
  mekstationDeviationRef(
    'MekStation createShutdownPSR stamps Reactor shutdown with PSRTrigger.Shutdown reasonCode and triggerSource.',
    'src/utils/gameplay/pilotingSkillRolls/environmentFactories.ts',
    'L45-L58',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const STANDING_UP_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek Entity.checkGetUp creates the getting-up piloting roll for GET_UP/CAREFUL_STAND movement steps and applies terrain and damage modifiers.',
    'megamek/src/megamek/common/units/Entity.java',
    'L7800-L7849',
  ),
  megaMekSourceRef(
    'MegaMek MovePathHandler resolves checkGetUp through doSkillCheckInPlace during movement and changes prone state around the stand attempt.',
    'megamek/src/megamek/server/totalWarfare/MovePathHandler.java',
    'L2026-L2055',
  ),
  megaMekSourceRef(
    'MegaMek doSkillCheckInPlace routes failed in-place stand-up piloting rolls into doEntityFall unless the unit qualifies for hull-down handling.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L8539-L8599',
  ),
  mekstationDeviationRef(
    'MekStation resolveRunnerStandUpAttempt emits PSRTriggered/PSRResolved/UnitStood and currently leaves failed stand-up attempts prone without emitting UnitFell or fall damage.',
    'src/simulation/runner/phases/movementStandUp.ts',
    'L19-L99',
  ),
  mekstationDeviationRef(
    'MekStation createStandingUpPSR stamps Standing up with PSRTrigger.StandingUp reasonCode and optional movement-step triggerSource.',
    'src/utils/gameplay/pilotingSkillRolls/environmentFactories.ts',
    'L72-L84',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const RUNNING_WITH_DAMAGE_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek Entity.checkRunningWithDamage queues one combined running-with-damaged-hip-actuator-or-gyro piloting roll for running or sprinting fall-capable units.',
    'megamek/src/megamek/common/units/Entity.java',
    'L7868-L7894',
  ),
  mekstationDeviationRef(
    'MekStation queueMovementDamagePSRs emits separate RunningDamagedHip and RunningDamagedGyro PSRTriggered events from runner movement steps.',
    'src/simulation/runner/phases/movementDamagePsr.ts',
    'L18-L44',
  ),
  mekstationDeviationRef(
    'MekStation movementDamagePSRsForUnit queues RunningDamagedHip per forward step and RunningDamagedGyro once at the first movement/turn step when the unit runs.',
    'src/simulation/runner/phases/movementDamagePsr.ts',
    'L46-L84',
  ),
  mekstationDeviationRef(
    'MekStation running-with-damage PSR factories stamp separate RunningDamagedHip and RunningDamagedGyro reasonCode/triggerSource rows.',
    'src/utils/gameplay/pilotingSkillRolls/systemFactories.ts',
    'L36-L62',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const DAMAGE_THRESHOLD_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek TWPhaseEndManager calls checkForPSRFromDamage at the end of movement, firing, physical, and offboard phases before resolving piloting rolls.',
    'megamek/src/megamek/server/totalWarfare/TWPhaseEndManager.java',
    'L104-L236',
  ),
  megaMekSourceRef(
    'MegaMek checkForPSRFromDamage queues a pending PSR when a fall-capable entity takes 20+ phase damage, adjusted to 30+ for a dual cockpit with dedicated pilot, unless hull down.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L15924-L15979',
  ),
  mekstationDeviationRef(
    'MekStation applyDamageThresholdPSR queues createDamagePSR once damageThisPhase reaches the local 20+ threshold and avoids duplicate phase-damage PSRs.',
    'src/simulation/runner/phases/weaponAttackHitResolution.helpers.ts',
    'L415-L442',
  ),
  mekstationDeviationRef(
    'MekStation createDamagePSR stamps PhaseDamage20Plus as the reasonCode and triggerSource for the pending PSR.',
    'src/utils/gameplay/pilotingSkillRolls/damageFactories.ts',
    'L13-L21',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const LEG_STRUCTURE_DAMAGE_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek Mek.destroyLocation queues an automatic-fail PSR when an entire leg location is destroyed; MekStation leg-structure PSRs are broader local coverage and remain source-visible as a deviation.',
    'megamek/src/megamek/common/units/Mek.java',
    'L5269-L5286',
  ),
  mekstationDeviationRef(
    'MekStation applyLegDamagePSR queues a LegDamage PSR when weapon damage reports structure damage in a leg location.',
    'src/simulation/runner/phases/weaponAttackPsrTriggers.ts',
    'L21-L75',
  ),
  mekstationDeviationRef(
    'MekStation createLegDamagePSR stamps LegDamage as the reasonCode and triggerSource for the pending PSR.',
    'src/utils/gameplay/pilotingSkillRolls/damageFactories.ts',
    'L26-L34',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const HIP_ACTUATOR_CRITICAL_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek applyMekCritical queues hip actuator PSRs during actuator critical-hit processing.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L19201-L19225',
  ),
  mekstationDeviationRef(
    'MekStation applyActuatorHit maps hip actuator criticals to PSRTrigger.HipActuatorDestroyed and emits psr_triggered.',
    'src/utils/gameplay/criticalHitResolution/actuatorEffects.ts',
    'L26-L87',
  ),
  mekstationDeviationRef(
    'MekStation createHipActuatorPSR stamps HipActuatorDestroyed as the reasonCode and triggerSource for the pending PSR.',
    'src/utils/gameplay/pilotingSkillRolls/damageFactories.ts',
    'L39-L47',
  ),
  ...LOCAL_CRITICAL_PSR_BRIDGE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const GYRO_CRITICAL_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek handleGyroCriticalHit queues gyro-hit or gyro-destroyed PSRs for fall-capable Meks according to gyro type and hit count.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L20328-L20451',
  ),
  megaMekSourceRef(
    'MegaMek Mek.addEntityBonuses applies ongoing gyro-hit modifiers to later piloting rolls.',
    'megamek/src/megamek/common/units/Mek.java',
    'L3323-L3360',
  ),
  mekstationDeviationRef(
    'MekStation applyGyroHit emits a crit-origin psr_triggered event with PSRTrigger.GyroHit and a hit-count-based modifier.',
    'src/utils/gameplay/criticalHitResolution/engineEffects.ts',
    'L60-L90',
  ),
  mekstationDeviationRef(
    'MekStation createGyroPSR stamps GyroHit as the reasonCode and triggerSource for the pending PSR.',
    'src/utils/gameplay/pilotingSkillRolls/damageFactories.ts',
    'L52-L60',
  ),
  ...LOCAL_CRITICAL_PSR_BRIDGE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const ENGINE_CRITICAL_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek applyMekCritical handles engine criticals by counting engine hits, checking explosion/destruction, and not queuing a normal fall PSR in the engine branch.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L19142-L19164',
  ),
  megaMekSourceRef(
    'MegaMek checkEngineExplosion handles engine-explosion rolls from engineHitsThisPhase rather than adding an engine-hit PSR.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L17759-L17830',
  ),
  mekstationDeviationRef(
    'MekStation applyEngineHit emits an EngineHit psr_triggered event as a local catalog behavior alongside heat/destruction effects.',
    'src/utils/gameplay/criticalHitResolution/engineEffects.ts',
    'L17-L57',
  ),
  mekstationDeviationRef(
    'MekStation createEngineHitPSR stamps EngineHit as the reasonCode and triggerSource for the pending PSR.',
    'src/utils/gameplay/pilotingSkillRolls/damageFactories.ts',
    'L62-L84',
  ),
  ...LOCAL_CRITICAL_PSR_BRIDGE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];

export const LEG_ACTUATOR_CRITICAL_PSR_SOURCE_REFS = [
  megaMekSourceRef(
    'MegaMek applyMekCritical queues leg/foot actuator PSRs during actuator critical-hit processing.',
    'megamek/src/megamek/server/totalWarfare/TWGameManager.java',
    'L19166-L19200',
  ),
  mekstationDeviationRef(
    'MekStation applyActuatorHit maps upper-leg, lower-leg, and foot actuator criticals to canonical PSRTrigger reason codes and emits psr_triggered.',
    'src/utils/gameplay/criticalHitResolution/actuatorEffects.ts',
    'L26-L87',
  ),
  mekstationDeviationRef(
    'MekStation leg-actuator PSR factories stamp upper-leg, lower-leg, and foot actuator trigger codes as reasonCode and triggerSource values.',
    'src/utils/gameplay/pilotingSkillRolls/damageFactories.ts',
    'L89-L122',
  ),
  ...LOCAL_CRITICAL_PSR_BRIDGE_SOURCE_REFS,
] satisfies readonly ICombatFeatureSourceReference[];
