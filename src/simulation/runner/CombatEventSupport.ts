import { GameEventType } from '@/types/gameplay';

import type {
  ICombatFeatureSourceReference,
  ICombatFeatureSupportEntry,
} from './CombatFeatureSupport';

import { BATTLEMECH_EVENT_SOURCE_REFS } from './CombatBattleMechEventSourceRefs';
import {
  BATTLE_ARMOR_CASUALTY_EVENT_SOURCE_REFS,
  BATTLE_ARMOR_LEG_EVENT_SOURCE_REFS,
  BATTLE_ARMOR_STEALTH_EVENT_SOURCE_REFS,
  BATTLE_ARMOR_SWARM_EVENT_SOURCE_REFS,
  VEHICLE_EVENT_SCOPE_SOURCE_REFS,
} from './CombatEventSourceRefs';

function integrated(
  eventType: GameEventType,
  evidence: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  const refs = sourceRefs ?? BATTLEMECH_EVENT_SOURCE_REFS[eventType];

  return refs
    ? { id: eventType, level: 'integrated', evidence, sourceRefs: refs }
    : { id: eventType, level: 'integrated', evidence };
}

function helperOnly(
  eventType: GameEventType,
  evidence: string,
  gap: string,
  sourceRefs?: readonly ICombatFeatureSourceReference[],
): ICombatFeatureSupportEntry {
  const refs = sourceRefs ?? BATTLEMECH_EVENT_SOURCE_REFS[eventType];

  return refs
    ? { id: eventType, level: 'helper-only', evidence, gap, sourceRefs: refs }
    : { id: eventType, level: 'helper-only', evidence, gap };
}

export const BATTLEMECH_COMBAT_EVENT_SUPPORT = {
  [GameEventType.GameCreated]: integrated(
    GameEventType.GameCreated,
    'SimulationRunner.run and createGameSession emit GameCreated with unit/objective seed payloads',
  ),
  [GameEventType.GameStarted]: integrated(
    GameEventType.GameStarted,
    'startGame emits GameStarted and applyGameStarted opens the active session',
  ),
  [GameEventType.GameEnded]: integrated(
    GameEventType.GameEnded,
    'endGame, InteractiveSession terminal paths, and SimulationRunner.run emit GameEnded while SimulationRunner also reports matchTerminalState',
  ),
  [GameEventType.TurnStarted]: integrated(
    GameEventType.TurnStarted,
    'applyTurnStarted and replay/session tests cover turn-start state restoration',
  ),
  [GameEventType.TurnEnded]: integrated(
    GameEventType.TurnEnded,
    'SimulationRunner.run emits TurnEnded at the End phase after objective resolution',
  ),
  [GameEventType.PhaseChanged]: integrated(
    GameEventType.PhaseChanged,
    'advancePhase emits PhaseChanged and applyPhaseChanged drives phase queue state',
  ),
  [GameEventType.InitiativeRolled]: integrated(
    GameEventType.InitiativeRolled,
    'rollInitiative emits InitiativeRolled and applyInitiativeRolled records turn order',
  ),
  [GameEventType.InitiativeOrderSet]: integrated(
    GameEventType.InitiativeOrderSet,
    'rollInitiative emits InitiativeOrderSet after InitiativeRolled and applyInitiativeOrderSet records replayable turn order',
  ),
  [GameEventType.MovementDeclared]: integrated(
    GameEventType.MovementDeclared,
    'runMovementPhase and declareMovement emit MovementDeclared with path, facing, MP, and heat payloads',
  ),
  [GameEventType.MovementLocked]: integrated(
    GameEventType.MovementLocked,
    'lockMovement emits MovementLocked and applyMovementLocked closes movement action eligibility',
  ),
  [GameEventType.MovementEnhancementActivated]: integrated(
    GameEventType.MovementEnhancementActivated,
    'activateMovementEnhancement emits MovementEnhancementActivated and applyMovementEnhancementActivated records replayable active MASC/Supercharger state before movement is locked',
  ),
  [GameEventType.FacingChanged]: integrated(
    GameEventType.FacingChanged,
    'torsoTwist emits replayable FacingChanged secondary-facing events through session, interactive, game intent, wire intent, P2P, and server dispatch paths while replay and runner arc math consume the same state',
  ),
  [GameEventType.AttackDeclared]: integrated(
    GameEventType.AttackDeclared,
    'runAttackPhase and declareAttack emit AttackDeclared with weapon ids, to-hit, and modifiers',
  ),
  [GameEventType.AttackLocked]: integrated(
    GameEventType.AttackLocked,
    'lockAttack emits AttackLocked and applyAttackLocked closes weapon action eligibility',
  ),
  [GameEventType.AttacksRevealed]: integrated(
    GameEventType.AttacksRevealed,
    'lockAttack emits AttacksRevealed after every active unit has locked weapon attacks, and applyAttacksRevealed replays the reveal boundary',
  ),
  [GameEventType.AttackResolved]: integrated(
    GameEventType.AttackResolved,
    'weapon attack resolution emits AttackResolved for hit, miss, and special projectile outcomes',
  ),
  [GameEventType.DamageApplied]: integrated(
    GameEventType.DamageApplied,
    'weapon and physical attack damage pipelines emit DamageApplied with armor/structure remnants',
  ),
  [GameEventType.IndirectFireSpotterSelected]: integrated(
    GameEventType.IndirectFireSpotterSelected,
    'runner and interactive indirect-fire declarations emit elected LOS spotter events',
  ),
  [GameEventType.IndirectFireSpotterLost]: integrated(
    GameEventType.IndirectFireSpotterLost,
    'gameSessionAttackResolution emits IndirectFireSpotterLost when a selected spotter is destroyed before resolution',
  ),
  [GameEventType.IndirectFireForwardObserver]: integrated(
    GameEventType.IndirectFireForwardObserver,
    'createIndirectFireForwardObserverEvent exists and both runner plus interactive attack declarations emit it when Forward Observer cancels the walked-spotter penalty',
  ),
  [GameEventType.IndirectFireNarcOverride]: integrated(
    GameEventType.IndirectFireNarcOverride,
    'runner and interactive indirect-fire declarations emit NARC override events',
  ),
  [GameEventType.HeatGenerated]: integrated(
    GameEventType.HeatGenerated,
    'weapon, movement, and heat phases emit HeatGenerated with source and total heat payloads',
  ),
  [GameEventType.HeatDissipated]: integrated(
    GameEventType.HeatDissipated,
    'runHeatPhase and resolveHeatPhase emit HeatDissipated with sink breakdown payloads',
  ),
  [GameEventType.HeatEffectApplied]: integrated(
    GameEventType.HeatEffectApplied,
    'runHeatPhase emits HeatEffectApplied for heat-scale penalties',
  ),
  [GameEventType.PilotHit]: integrated(
    GameEventType.PilotHit,
    'head damage, cockpit crits, fall, runner/session heat, and runner/session ammo-explosion paths emit PilotHit with wound totals',
  ),
  [GameEventType.UnitDestroyed]: integrated(
    GameEventType.UnitDestroyed,
    'damage, physical, PSR/fall, ammo explosion, and pilot-death paths emit UnitDestroyed',
  ),
  [GameEventType.AmmoExplosion]: integrated(
    GameEventType.AmmoExplosion,
    'critical and heat-induced ammo explosions emit source/rounds/damage payloads before their damage cascade',
  ),
  [GameEventType.CriticalHit]: integrated(
    GameEventType.CriticalHit,
    'weapon critical-hit resolver emits CriticalHit before component resolution',
  ),
  [GameEventType.CriticalHitResolved]: integrated(
    GameEventType.CriticalHitResolved,
    'critical-hit resolver emits CriticalHitResolved with component, slot, and effect data',
  ),
  [GameEventType.PSRTriggered]: integrated(
    GameEventType.PSRTriggered,
    'damage, critical, and physical attack paths queue PSRTriggered records for the PSR phase',
  ),
  [GameEventType.PSRResolved]: integrated(
    GameEventType.PSRResolved,
    'runner and interactive PSR resolution emit PSRResolved with target number, roll, modifiers, and result',
  ),
  [GameEventType.UnitFell]: integrated(
    GameEventType.UnitFell,
    'failed PSRs and source-backed missed-DFA fall resolution emit UnitFell with fall damage, facing, and pilot damage context',
  ),
  [GameEventType.UnitStood]: integrated(
    GameEventType.UnitStood,
    'gameSessionPSR emits UnitStood when an AttemptStand PSR succeeds',
  ),
  [GameEventType.PhysicalAttackDeclared]: integrated(
    GameEventType.PhysicalAttackDeclared,
    'runner and interactive physical phases emit PhysicalAttackDeclared for supported attack types',
  ),
  [GameEventType.PhysicalAttackResolved]: integrated(
    GameEventType.PhysicalAttackResolved,
    'runner and interactive physical phases emit PhysicalAttackResolved for hit, miss, rejection, and automatic-hit outcomes',
  ),
  [GameEventType.ShutdownCheck]: integrated(
    GameEventType.ShutdownCheck,
    'heat resolution emits ShutdownCheck and applyShutdownCheck mutates shutdown state',
  ),
  [GameEventType.StartupAttempt]: integrated(
    GameEventType.StartupAttempt,
    'runHeatPhase and resolveHeatPhase emit StartupAttempt and mutate restart state',
  ),
  [GameEventType.AmmoConsumed]: integrated(
    GameEventType.AmmoConsumed,
    'weapon attack resolution emits AmmoConsumed when ammunition is spent',
  ),
  [GameEventType.AMSInterception]: integrated(
    GameEventType.AMSInterception,
    'runner missile resolution emits AMSInterception when target-mounted AMS reduces an incoming missile cluster and records projectile counts plus AMS ammo use',
  ),
  [GameEventType.DesignatorMarkerApplied]: integrated(
    GameEventType.DesignatorMarkerApplied,
    'runner NARC, iNARC variant, and TAG hits emit DesignatorMarkerApplied when they mutate target marker state',
  ),
  [GameEventType.AttackInvalid]: integrated(
    GameEventType.AttackInvalid,
    'runner target, LOS, ammo, range, evading/sprinting-attacker, destroyed-weapon, and jammed-weapon validation emits AttackInvalid before combat side effects',
  ),
  [GameEventType.LocationDestroyed]: integrated(
    GameEventType.LocationDestroyed,
    'damage and ammo explosion pipelines emit LocationDestroyed for internal-structure loss',
  ),
  [GameEventType.TransferDamage]: integrated(
    GameEventType.TransferDamage,
    'damage and ammo explosion pipelines emit TransferDamage for destroyed-location overflow',
  ),
  [GameEventType.ComponentDestroyed]: integrated(
    GameEventType.ComponentDestroyed,
    'critical-hit resolution emits ComponentDestroyed for destroyed equipment slots',
  ),
  [GameEventType.RetreatTriggered]: integrated(
    GameEventType.RetreatTriggered,
    'bot retreat behavior emits RetreatTriggered when structural or vital-crit thresholds are crossed',
  ),
  [GameEventType.UnitRetreated]: integrated(
    GameEventType.UnitRetreated,
    'retreat movement emits UnitRetreated and the reducer removes the unit from active combat counts',
  ),
  [GameEventType.UnitEjected]: integrated(
    GameEventType.UnitEjected,
    'InteractiveSession.ejectUnit emits UnitEjected and applyUnitEjected removes targetability without damage mutation',
  ),
  [GameEventType.ObjectiveCaptured]: integrated(
    GameEventType.ObjectiveCaptured,
    'objective control pass emits ObjectiveCaptured and the reducer updates marker control',
  ),
  [GameEventType.ObjectiveLost]: integrated(
    GameEventType.ObjectiveLost,
    'objective control pass emits ObjectiveLost when a held marker becomes contested or flips',
  ),
  [GameEventType.ObjectiveProgress]: integrated(
    GameEventType.ObjectiveProgress,
    'objective control pass emits ObjectiveProgress for hold-turn accrual',
  ),
  [GameEventType.MoraleShifted]: integrated(
    GameEventType.MoraleShifted,
    'combat morale evaluation emits MoraleShifted and the reducer reconstructs battle morale',
  ),
  [GameEventType.WithdrawalDeclared]: integrated(
    GameEventType.WithdrawalDeclared,
    'player and forced withdrawal flows emit WithdrawalDeclared and latch withdrawal state',
  ),
  [GameEventType.ForcedWithdrawalTriggered]: integrated(
    GameEventType.ForcedWithdrawalTriggered,
    'forced-withdrawal checks emit ForcedWithdrawalTriggered paired with WithdrawalDeclared',
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;

export const NON_BATTLEMECH_EVENT_SCOPE_SUPPORT = {
  [GameEventType.MotiveDamaged]: helperOnly(
    GameEventType.MotiveDamaged,
    'vehicle motive-damage helpers and vehicle event tests cover this event',
    'vehicle-specific combat belongs in a separate vehicle validation matrix',
    VEHICLE_EVENT_SCOPE_SOURCE_REFS,
  ),
  [GameEventType.MotivePenaltyApplied]: helperOnly(
    GameEventType.MotivePenaltyApplied,
    'vehicle motive-damage helpers and vehicle event tests cover this event',
    'vehicle-specific combat belongs in a separate vehicle validation matrix',
    VEHICLE_EVENT_SCOPE_SOURCE_REFS,
  ),
  [GameEventType.VehicleImmobilized]: helperOnly(
    GameEventType.VehicleImmobilized,
    'vehicle motive-damage helpers and vehicle event tests cover this event',
    'vehicle-specific combat belongs in a separate vehicle validation matrix',
    VEHICLE_EVENT_SCOPE_SOURCE_REFS,
  ),
  [GameEventType.TurretLocked]: helperOnly(
    GameEventType.TurretLocked,
    'vehicle critical-effect helpers and vehicle event tests cover this event',
    'vehicle-specific combat belongs in a separate vehicle validation matrix',
    VEHICLE_EVENT_SCOPE_SOURCE_REFS,
  ),
  [GameEventType.VehicleCrewStunned]: helperOnly(
    GameEventType.VehicleCrewStunned,
    'vehicle critical-effect helpers and vehicle event tests cover this event',
    'vehicle-specific combat belongs in a separate vehicle validation matrix',
    VEHICLE_EVENT_SCOPE_SOURCE_REFS,
  ),
  [GameEventType.VTOLCrashCheck]: helperOnly(
    GameEventType.VTOLCrashCheck,
    'VTOL vehicle helpers and vehicle event tests cover this event',
    'vehicle-specific combat belongs in a separate vehicle validation matrix',
    VEHICLE_EVENT_SCOPE_SOURCE_REFS,
  ),
  [GameEventType.TrooperKilled]: helperOnly(
    GameEventType.TrooperKilled,
    'battle armor combat helpers cover trooper casualty events',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_CASUALTY_EVENT_SOURCE_REFS,
  ),
  [GameEventType.SquadEliminated]: helperOnly(
    GameEventType.SquadEliminated,
    'battle armor combat helpers cover squad elimination events',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_CASUALTY_EVENT_SOURCE_REFS,
  ),
  [GameEventType.SwarmAttached]: helperOnly(
    GameEventType.SwarmAttached,
    'battle armor swarm helpers cover swarm attachment events',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_SWARM_EVENT_SOURCE_REFS,
  ),
  [GameEventType.SwarmDamage]: helperOnly(
    GameEventType.SwarmDamage,
    'battle armor swarm helpers cover swarm damage events',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_SWARM_EVENT_SOURCE_REFS,
  ),
  [GameEventType.SwarmDismounted]: helperOnly(
    GameEventType.SwarmDismounted,
    'battle armor swarm helpers cover swarm dismount events',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_SWARM_EVENT_SOURCE_REFS,
  ),
  [GameEventType.LegAttack]: helperOnly(
    GameEventType.LegAttack,
    'legacy battle armor leg-attack helpers cover LegAttack events',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_LEG_EVENT_SOURCE_REFS,
  ),
  [GameEventType.LegAttackResolved]: helperOnly(
    GameEventType.LegAttackResolved,
    'InteractiveSession battle armor leg-attack scenarios cover LegAttackResolved',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_LEG_EVENT_SOURCE_REFS,
  ),
  [GameEventType.MimeticBonus]: helperOnly(
    GameEventType.MimeticBonus,
    'battle armor mimetic helpers cover this event',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_STEALTH_EVENT_SOURCE_REFS,
  ),
  [GameEventType.StealthBonus]: helperOnly(
    GameEventType.StealthBonus,
    'battle armor stealth helpers cover this event',
    'battle armor combat belongs in a separate battle-armor validation matrix',
    BATTLE_ARMOR_STEALTH_EVENT_SOURCE_REFS,
  ),
} satisfies Record<string, ICombatFeatureSupportEntry>;
