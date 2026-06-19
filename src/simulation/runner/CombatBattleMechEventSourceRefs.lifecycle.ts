import { GameEventType } from '@/types/gameplay';

import type { ICombatFeatureSourceReference } from './CombatFeatureSourceReference';

import { remappedMekStationDeviationSourceRef as mekstationDeviationSourceRef } from './CombatRemappedSourceReference';
import { BATTLEMECH_SPOTTING_EVENT_SOURCE_REFS } from './CombatSpottingSourceRefs';

export const BATTLEMECH_LIFECYCLE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation lifecycle event factories create GameCreated, GameStarted, and GameEnded payloads.',
    'src/utils/gameplay/gameEvents/lifecycle.ts',
    'L72-L180',
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

export const BATTLEMECH_TURN_PHASE_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation phase and initiative factories create PhaseChanged, InitiativeRolled, and InitiativeOrderSet payloads.',
    'src/utils/gameplay/gameEvents/turnPhase.ts',
    'L10-L22',
  ),
  mekstationDeviationSourceRef(
    'MekStation initiative factories create InitiativeRolled and InitiativeOrderSet payloads.',
    'src/utils/gameplay/gameEvents/initiative.ts',
    'L47-L146',
  ),
  mekstationDeviationSourceRef(
    'MekStation session core appends PhaseChanged, InitiativeRolled, and InitiativeOrderSet events.',
    'src/utils/gameplay/gameSessionCore.ts',
    'L258-L380',
  ),
  mekstationDeviationSourceRef(
    'MekStation event dispatch handles GameStarted, PhaseChanged, TurnStarted, InitiativeRolled, and InitiativeOrderSet while treating TurnEnded and reveal events as no-op log entries.',
    'src/utils/gameplay/gameState/eventDispatch.ts',
    'L192-L312',
  ),
  mekstationDeviationSourceRef(
    'MekStation SimulationRunner emits TurnStarted through the runner turn-boundary factory and TurnEnded at the End phase after objective control resolution.',
    'src/simulation/runner/SimulationRunner.ts',
    'L257-L369',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_ATTACK_REVEAL_EVENT_SOURCE_REFS = [
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
    'MekStation event dispatch routes AttacksRevealed events into the action-locking replay helper.',
    'src/utils/gameplay/gameState/eventDispatch.ts',
    'L224-L225',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_MOVEMENT_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation movement declaration factories create MovementDeclared payloads.',
    'src/utils/gameplay/gameEvents/movementDeclared.ts',
    'L1-L339',
  ),
  mekstationDeviationSourceRef(
    'MekStation movement event factories create MovementLocked, MovementEnhancementActivated, and FacingChanged payloads.',
    'src/utils/gameplay/gameEvents/movement.ts',
    'L1-L141',
  ),
  mekstationDeviationSourceRef(
    'MekStation movement invalidation factory creates MovementInvalid payloads.',
    'src/utils/gameplay/gameEvents/movementInvalid.ts',
    'L1-L119',
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

export const BATTLEMECH_MINEFIELD_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation status event factories create MinefieldChanged payloads for represented coordinate minefield state changes.',
    'src/utils/gameplay/gameEvents/status.ts',
    'L1-L116',
  ),
  mekstationDeviationSourceRef(
    'MekStation movement minefield resolver emits represented minefield movement events, including MinefieldChanged state updates and EmpMinefieldEffectApplied payloads for represented EMP minefield entry.',
    'src/simulation/runner/phases/movementMines.ts',
    'L189-L314',
  ),
  mekstationDeviationSourceRef(
    'MekStation minefield reducer replays add, set, remove, clear, reset, detonate, detect, and reveal operations onto IGameState.minefields.',
    'src/utils/gameplay/gameState/terrainReducer.ts',
    'L40-L216',
  ),
  mekstationDeviationSourceRef(
    'MekStation event dispatch routes MinefieldChanged and EmpMinefieldEffectApplied events into replay reducers.',
    'src/utils/gameplay/gameState/eventDispatch.ts',
    'L291-L296',
  ),
  mekstationDeviationSourceRef(
    'MekStation status replay reducer replays EmpMinefieldEffectApplied into EMP interference or shutdown unit state.',
    'src/utils/gameplay/gameState/statusReplay.ts',
    'L43-L63',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const BATTLEMECH_GROUND_OBJECT_EVENT_SOURCE_REFS = [
  mekstationDeviationSourceRef(
    'MekStation ground-object event factories create GroundObjectPickedUp and GroundObjectDropped payloads for represented carry-object lifecycle state.',
    'src/utils/gameplay/gameEvents/groundObjects.ts',
    'L54-L156',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive ground-object actions validate pickup/drop legality and append replayable ground-object events.',
    'src/utils/gameplay/groundObjectActions.ts',
    'L193-L274',
  ),
  mekstationDeviationSourceRef(
    'MekStation ground-object reducer replays pickup/drop events into carried object state, arm occupancy, and loading flags.',
    'src/utils/gameplay/gameState/groundObjects.ts',
    'L54-L123',
  ),
  mekstationDeviationSourceRef(
    'MekStation runner ground-object phase helpers emit GroundObjectPickedUp and GroundObjectDropped events before applying reducer state.',
    'src/simulation/runner/phases/groundObjectActions.ts',
    'L39-L124',
  ),
  mekstationDeviationSourceRef(
    'MekStation interactive and runner ground-object tests cover pickup/drop event emission, replay, and invalid no-side-effect paths.',
    'src/simulation/runner/__tests__/groundObjectActions.behavior.test.ts',
    'L83-L194',
  ),
] satisfies readonly ICombatFeatureSourceReference[];
