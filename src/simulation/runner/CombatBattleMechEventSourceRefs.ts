import { GameEventType } from '@/types/gameplay';

import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

const MEKSTATION_SOURCE_VERSION = 'MekStation working-tree';

function mekstationDeviationSourceRef(
  citation: string,
  path: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return {
    kind: 'mekstation-deviation',
    citation,
    url: `${path}#${lineRange}`,
    sourceVersion: MEKSTATION_SOURCE_VERSION,
  };
}

const BATTLEMECH_LIFECYCLE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation lifecycle event factories create GameCreated, GameStarted, and GameEnded payloads.',
    'src/utils/gameplay/gameEvents/lifecycle.ts',
    'L32-L91',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends GameCreated, GameStarted, and GameEnded events to interactive logs.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L110-L196',
  ),
  mekstationDeviationSourceRef(
    'MekStation SimulationRunner emits runner GameCreated and terminal GameEnded events for automated BattleMech combat.',
    'src/simulation/runner/SimulationRunner.ts',
    'L181-L405',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_TURN_PHASE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation phase and initiative factories create PhaseChanged, InitiativeRolled, and InitiativeOrderSet payloads.',
    'src/utils/gameplay/gameEvents/turnPhase.ts',
    'L10-L22',
  ),
  mekstationDeviationSourceRef(
    'MekStation initiative factories create InitiativeRolled and InitiativeOrderSet payloads.',
    'src/utils/gameplay/gameEvents/initiative.ts',
    'L11-L85',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends PhaseChanged, InitiativeRolled, and InitiativeOrderSet events.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L258-L380',
  ),
  mekstationDeviationSourceRef(
    'MekStation reducer handles GameStarted, PhaseChanged, TurnStarted, InitiativeRolled, and InitiativeOrderSet while treating TurnEnded and reveal events as no-op log entries.',
    'src/utils/gameplay/gameState/gameStateReducer.ts',
    'L99-L253',
  ),
  mekstationDeviationSourceRef(
    'MekStation SimulationRunner emits TurnEnded at the End phase after objective control resolution.',
    'src/simulation/runner/SimulationRunner.ts',
    'L321-L345',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_ATTACK_REVEAL_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create AttacksRevealed with revealed unit ids and the current-turn attack count.',
    'src/utils/gameplay/gameEvents/attackReveal.ts',
    'L1-L28',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends AttackLocked and routes reveal checks through the attack reveal helper.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L667-L679',
  ),
  mekstationDeviationSourceRef(
    'MekStation attack reveal helper emits AttacksRevealed after every active weapon-phase unit has locked attacks.',
    'src/utils/gameplay/gameSessionAttackReveal.ts',
    'L22-L87',
  ),
  mekstationDeviationSourceRef(
    'MekStation reducer applies AttacksRevealed by moving locked weapon-phase units to the replayable Revealed lock state.',
    'src/utils/gameplay/gameState/actionLocking.ts',
    'L157-L205',
  ),
  mekstationDeviationSourceRef(
    'MekStation reducer routes AttacksRevealed events into the action-locking replay helper.',
    'src/utils/gameplay/gameState/gameStateReducer.ts',
    'L161-L165',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_MOVEMENT_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation movement event factories create MovementDeclared, MovementLocked, MovementEnhancementActivated, and FacingChanged payloads.',
    'src/utils/gameplay/gameEvents/movement.ts',
    'L22-L166',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends MovementDeclared and MovementLocked events.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L395-L424',
  ),
  mekstationDeviationSourceRef(
    'MekStation movement-enhancement session helper appends MovementEnhancementActivated events.',
    'src/utils/gameplay/gameSessionMovementEnhancements.ts',
    'L1-L45',
  ),
  mekstationDeviationSourceRef(
    'MekStation torso-twist session helper appends FacingChanged events for replayable secondary facing.',
    'src/utils/gameplay/gameSessionTorsoTwist.ts',
    'L1-L55',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_RANGED_ATTACK_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create AttackDeclared, AttackLocked, AttackResolved, and AttackInvalid payloads.',
    'src/utils/gameplay/gameEvents/combat.ts',
    'L27-L145',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends AttackDeclared, indirect-fire marker events, and AttackLocked events.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L564-L639',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack phase emits AttackInvalid, AttackDeclared, AttackResolved, AmmoConsumed, AMSInterception, and special marker events.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L395-L1320',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner hit resolution emits AttackResolved and follows with damage, ammo, and marker event side effects.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts',
    'L114-L430',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_INDIRECT_FIRE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create IndirectFireSpotterSelected, IndirectFireNarcOverride, IndirectFireForwardObserver, and IndirectFireSpotterLost payloads.',
    'src/utils/gameplay/gameEvents/combat.ts',
    'L310-L449',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends indirect-fire NARC override, spotter selection, and Forward Observer events during declaration.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L596-L630',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive attack resolution appends IndirectFireSpotterLost before the final AttackResolved event when a selected spotter is destroyed.',
    'src/utils/gameplay/gameSessionAttackResolution.ts',
    'L156-L217',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_DAMAGE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation combat event factories create DamageApplied, LocationDestroyed, TransferDamage, and ComponentDestroyed payloads.',
    'src/utils/gameplay/gameEvents/combat.ts',
    'L154-L292',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner hit resolution emits AttackResolved, DamageApplied, LocationDestroyed, TransferDamage, CriticalHit, CriticalHitResolved, ComponentDestroyed, PSRTriggered, PilotHit, and UnitDestroyed chains.',
    'src/simulation/runner/phases/weaponAttackHitResolution.ts',
    'L114-L430',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive attack resolution emits damage, transfer, critical, PSR, pilot, and destruction events after valid hit resolution.',
    'src/utils/gameplay/gameSessionAttackResolution.ts',
    'L256-L474',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_CRITICAL_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation status event factories create CriticalHitResolved payloads.',
    'src/utils/gameplay/gameEvents/status.ts',
    'L185-L214',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner critical-hit helper emits CriticalHit before CriticalHitResolved and ComponentDestroyed payloads.',
    'src/simulation/runner/phases/weaponAttackHelpers.ts',
    'L180-L335',
  ),
  mekstationDeviationSourceRef(
    'MekStation heat critical damage path emits CriticalHit, CriticalHitResolved, ComponentDestroyed, PSRTriggered, PilotHit, and UnitDestroyed chains.',
    'src/simulation/runner/phases/heatCriticalDamage.ts',
    'L73-L278',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_HEAT_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation status event factories create HeatGenerated, HeatDissipated, PilotHit, UnitDestroyed, and AmmoExplosion payloads.',
    'src/utils/gameplay/gameEvents/status.ts',
    'L14-L176',
  ),
  mekstationDeviationSourceRef(
    'MekStation status-check factories create ShutdownCheck, StartupAttempt, PSRTriggered, and AmmoConsumed payloads.',
    'src/utils/gameplay/gameEvents/statusChecks.ts',
    'L18-L243',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive heat resolution appends heat generation, heat dissipation, startup, shutdown, ammo explosion, ammo consumption, PSR, pilot, and destruction events.',
    'src/utils/gameplay/gameSessionHeat.ts',
    'L345-L1013',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner heat threshold helper emits HeatEffectApplied events for Total Warfare heat thresholds.',
    'src/simulation/runner/phases/heatThresholdEvents.ts',
    'L1-L65',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_PSR_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation status-check factories create PSRTriggered, PSRResolved, UnitFell, UnitStood, ShutdownCheck, StartupAttempt, and AmmoConsumed payloads.',
    'src/utils/gameplay/gameEvents/statusChecks.ts',
    'L18-L243',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive PSR resolver emits PSRResolved, UnitFell, PilotHit, UnitDestroyed, and UnitStood paths.',
    'src/utils/gameplay/gameSessionPSR.ts',
    'L44-L388',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner post-combat phase resolves queued PSRs, failed falls, stand-up attempts, shutdown checks, and startup attempts.',
    'src/simulation/runner/phases/postCombat.ts',
    'L101-L469',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner stand-up helper emits PSRTriggered, PSRResolved, and UnitStood events.',
    'src/simulation/runner/phases/movementStandUp.ts',
    'L33-L80',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_PHYSICAL_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation physical event factories create PhysicalAttackDeclared and PhysicalAttackResolved payloads.',
    'src/utils/gameplay/gameEvents/statusPhysical.ts',
    'L19-L89',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner physical event helpers emit PhysicalAttackDeclared and PhysicalAttackResolved payloads.',
    'src/simulation/runner/phases/physicalAttackEvents.ts',
    'L17-L72',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner physical attack phase emits declarations, resolved hits/misses/rejections, displacement, fall, and PSR fallout events.',
    'src/simulation/runner/phases/physicalAttack.ts',
    'L448-L605',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive physical resolver emits PhysicalAttackResolved, DamageApplied, PSRTriggered, and UnitFell outcomes from PhysicalAttackDeclared records.',
    'src/utils/gameplay/gameSessionPhysical.ts',
    'L360-L1082',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_SPECIAL_PROJECTILE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation runner AMS helpers resolve cluster and single-missile interception payloads before AMSInterception emission.',
    'src/simulation/runner/phases/weaponAttackAMS.ts',
    'L69-L160',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner weapon attack phase converts AMS interception results into AMSInterception events.',
    'src/simulation/runner/phases/weaponAttack.ts',
    'L395-L475',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner designator marker helper emits DesignatorMarkerApplied events for NARC, iNARC, and TAG state mutations.',
    'src/simulation/runner/phases/weaponAttackDesignatorMarkers.ts',
    'L238-L269',
  ),
  mekstationDeviationSourceRef(
    'MekStation extended combat reducer replays DesignatorMarkerApplied state onto targets.',
    'src/utils/gameplay/gameState/extendedCombat.ts',
    'L276-L310',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_RETREAT_EJECTION_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation physical/status event factories create RetreatTriggered, UnitRetreated, and UnitEjected payloads.',
    'src/utils/gameplay/gameEvents/statusPhysical.ts',
    'L105-L171',
  ),
  mekstationDeviationSourceRef(
    'MekStation game-engine phases append RetreatTriggered and UnitRetreated events during forced-withdrawal movement.',
    'src/engine/GameEngine.phases.ts',
    'L123-L270',
  ),
  mekstationDeviationSourceRef(
    'MekStation AI turn handling appends RetreatTriggered and UnitRetreated events for bot withdrawal behavior.',
    'src/engine/InteractiveSession.ai.ts',
    'L218-L270',
  ),
  mekstationDeviationSourceRef(
    'MekStation ejection reducer removes ejected units from active targeting and action participation while preserving damage state.',
    'src/utils/gameplay/gameState/extendedCombat.ts',
    'L418-L450',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_OBJECTIVE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation objective event factories create ObjectiveCaptured, ObjectiveLost, and ObjectiveProgress payloads.',
    'src/utils/gameplay/objectives/objectiveEvents.ts',
    'L26-L110',
  ),
  mekstationDeviationSourceRef(
    'MekStation objective control pass emits ObjectiveCaptured, ObjectiveLost, and ObjectiveProgress events deterministically.',
    'src/utils/gameplay/objectives/objectiveEvents.ts',
    'L119-L209',
  ),
  mekstationDeviationSourceRef(
    'MekStation SimulationRunner runs the objective control event pass at the End phase before terminal checks.',
    'src/simulation/runner/SimulationRunner.ts',
    'L321-L338',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

const BATTLEMECH_MORALE_WITHDRAWAL_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation morale event factories create MoraleShifted, WithdrawalDeclared, and ForcedWithdrawalTriggered payloads.',
    'src/utils/gameplay/gameEvents/morale.ts',
    'L29-L109',
  ),
  mekstationDeviationSourceRef(
    'MekStation withdrawal integration tests assert player WithdrawalDeclared and UnitRetreated event behavior.',
    'src/engine/__tests__/InteractiveSession.withdrawal.test.ts',
    'L129-L163',
  ),
  mekstationDeviationSourceRef(
    'MekStation withdrawal processing tests assert ForcedWithdrawalTriggered event behavior.',
    'src/utils/gameplay/morale/__tests__/withdrawalProcessing.test.ts',
    'L254-L290',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_EVENT_SOURCE_REFS: Readonly<
  Partial<Record<GameEventType, readonly ICombatFeatureSourceReference[]>>
> = {
  [GameEventType.GameCreated]: BATTLEMECH_LIFECYCLE_EVENT_SOURCE_REFS,
  [GameEventType.GameStarted]: BATTLEMECH_LIFECYCLE_EVENT_SOURCE_REFS,
  [GameEventType.GameEnded]: BATTLEMECH_LIFECYCLE_EVENT_SOURCE_REFS,
  [GameEventType.TurnStarted]: BATTLEMECH_TURN_PHASE_EVENT_SOURCE_REFS,
  [GameEventType.TurnEnded]: BATTLEMECH_TURN_PHASE_EVENT_SOURCE_REFS,
  [GameEventType.PhaseChanged]: BATTLEMECH_TURN_PHASE_EVENT_SOURCE_REFS,
  [GameEventType.InitiativeRolled]: BATTLEMECH_TURN_PHASE_EVENT_SOURCE_REFS,
  [GameEventType.InitiativeOrderSet]: BATTLEMECH_TURN_PHASE_EVENT_SOURCE_REFS,
  [GameEventType.MovementDeclared]: BATTLEMECH_MOVEMENT_EVENT_SOURCE_REFS,
  [GameEventType.MovementLocked]: BATTLEMECH_MOVEMENT_EVENT_SOURCE_REFS,
  [GameEventType.MovementEnhancementActivated]:
    BATTLEMECH_MOVEMENT_EVENT_SOURCE_REFS,
  [GameEventType.FacingChanged]: BATTLEMECH_MOVEMENT_EVENT_SOURCE_REFS,
  [GameEventType.AttackDeclared]: BATTLEMECH_RANGED_ATTACK_EVENT_SOURCE_REFS,
  [GameEventType.AttackLocked]: BATTLEMECH_RANGED_ATTACK_EVENT_SOURCE_REFS,
  [GameEventType.AttacksRevealed]: BATTLEMECH_ATTACK_REVEAL_EVENT_SOURCE_REFS,
  [GameEventType.AttackResolved]: BATTLEMECH_RANGED_ATTACK_EVENT_SOURCE_REFS,
  [GameEventType.AttackInvalid]: BATTLEMECH_RANGED_ATTACK_EVENT_SOURCE_REFS,
  [GameEventType.DamageApplied]: BATTLEMECH_DAMAGE_EVENT_SOURCE_REFS,
  [GameEventType.IndirectFireSpotterSelected]:
    BATTLEMECH_INDIRECT_FIRE_EVENT_SOURCE_REFS,
  [GameEventType.IndirectFireSpotterLost]:
    BATTLEMECH_INDIRECT_FIRE_EVENT_SOURCE_REFS,
  [GameEventType.IndirectFireForwardObserver]:
    BATTLEMECH_INDIRECT_FIRE_EVENT_SOURCE_REFS,
  [GameEventType.IndirectFireNarcOverride]:
    BATTLEMECH_INDIRECT_FIRE_EVENT_SOURCE_REFS,
  [GameEventType.HeatGenerated]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.HeatDissipated]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.HeatEffectApplied]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.PilotHit]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.UnitDestroyed]: BATTLEMECH_DAMAGE_EVENT_SOURCE_REFS,
  [GameEventType.AmmoExplosion]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.CriticalHit]: BATTLEMECH_CRITICAL_EVENT_SOURCE_REFS,
  [GameEventType.CriticalHitResolved]: BATTLEMECH_CRITICAL_EVENT_SOURCE_REFS,
  [GameEventType.PSRTriggered]: BATTLEMECH_PSR_EVENT_SOURCE_REFS,
  [GameEventType.PSRResolved]: BATTLEMECH_PSR_EVENT_SOURCE_REFS,
  [GameEventType.UnitFell]: BATTLEMECH_PSR_EVENT_SOURCE_REFS,
  [GameEventType.UnitStood]: BATTLEMECH_PSR_EVENT_SOURCE_REFS,
  [GameEventType.PhysicalAttackDeclared]: BATTLEMECH_PHYSICAL_EVENT_SOURCE_REFS,
  [GameEventType.PhysicalAttackResolved]: BATTLEMECH_PHYSICAL_EVENT_SOURCE_REFS,
  [GameEventType.ShutdownCheck]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.StartupAttempt]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.AmmoConsumed]: BATTLEMECH_HEAT_EVENT_SOURCE_REFS,
  [GameEventType.AMSInterception]:
    BATTLEMECH_SPECIAL_PROJECTILE_EVENT_SOURCE_REFS,
  [GameEventType.DesignatorMarkerApplied]:
    BATTLEMECH_SPECIAL_PROJECTILE_EVENT_SOURCE_REFS,
  [GameEventType.LocationDestroyed]: BATTLEMECH_DAMAGE_EVENT_SOURCE_REFS,
  [GameEventType.TransferDamage]: BATTLEMECH_DAMAGE_EVENT_SOURCE_REFS,
  [GameEventType.ComponentDestroyed]: BATTLEMECH_CRITICAL_EVENT_SOURCE_REFS,
  [GameEventType.RetreatTriggered]:
    BATTLEMECH_RETREAT_EJECTION_EVENT_SOURCE_REFS,
  [GameEventType.UnitRetreated]: BATTLEMECH_RETREAT_EJECTION_EVENT_SOURCE_REFS,
  [GameEventType.UnitEjected]: BATTLEMECH_RETREAT_EJECTION_EVENT_SOURCE_REFS,
  [GameEventType.ObjectiveCaptured]: BATTLEMECH_OBJECTIVE_EVENT_SOURCE_REFS,
  [GameEventType.ObjectiveLost]: BATTLEMECH_OBJECTIVE_EVENT_SOURCE_REFS,
  [GameEventType.ObjectiveProgress]: BATTLEMECH_OBJECTIVE_EVENT_SOURCE_REFS,
  [GameEventType.MoraleShifted]: BATTLEMECH_MORALE_WITHDRAWAL_EVENT_SOURCE_REFS,
  [GameEventType.WithdrawalDeclared]:
    BATTLEMECH_MORALE_WITHDRAWAL_EVENT_SOURCE_REFS,
  [GameEventType.ForcedWithdrawalTriggered]:
    BATTLEMECH_MORALE_WITHDRAWAL_EVENT_SOURCE_REFS,
};
