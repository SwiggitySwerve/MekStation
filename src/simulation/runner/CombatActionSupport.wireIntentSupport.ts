import type { IIntentPayload } from '@/types/multiplayer/Protocol';

import type { ICombatActionSupportEntry } from './CombatActionSupport.types';

import { integrated, outOfScope } from './CombatActionSupport.entries';
import {
  MEGAMEK_GO_PRONE_SOURCE_REFS,
  MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
} from './CombatActionSupport.movementSourceRefs';
import { MEKSTATION_WIRE_INTENT_SOURCE_REFS } from './CombatActionSupport.wireIntentSourceRefs';
import { MEGAMEK_TORSO_TWIST_SOURCE_REFS } from './CombatMovementSourceRefs';
import { MEGAMEK_REQUEST_SPOT_SOURCE_REFS } from './CombatSpottingSourceRefs';

export const ENGINE_WIRE_COMBAT_INTENT_KINDS = [
  'AdvancePhase',
  'Attack',
  'Concede',
  'Eject',
  'Move',
  'Physical',
  'RequestSpot',
  'GoProne',
  'ActivateMovementEnhancement',
  'TorsoTwist',
  'Stand',
  'Withdraw',
] as const satisfies readonly IIntentPayload['kind'][];

export const NON_COMBAT_WIRE_INTENT_KINDS = [
  'ForfeitMatch',
  'LaunchMatch',
  'LeaveSeat',
  'MarkSeatAi',
  'OccupySeat',
  'ReassignSeat',
  'SetAiSlot',
  'SetHumanSlot',
  'SetReady',
] as const satisfies readonly IIntentPayload['kind'][];

export const WIRE_INTENT_KIND_ACTION_SUPPORT = {
  AdvancePhase: integrated(
    'AdvancePhase',
    'wire-intent',
    'dispatchToEngine routes AdvancePhase to InteractiveSession.advancePhase',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.AdvancePhase,
  ),
  Attack: integrated(
    'Attack',
    'wire-intent',
    'dispatchToEngine routes Attack to InteractiveSession.applyAttack',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Attack,
  ),
  Concede: integrated(
    'Concede',
    'wire-intent',
    'dispatchToEngine routes Concede to InteractiveSession.concede',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Concede,
  ),
  Eject: integrated(
    'Eject',
    'wire-intent',
    'dispatchToEngine routes Eject to InteractiveSession.ejectUnit',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Eject,
  ),
  Move: integrated(
    'Move',
    'wire-intent',
    'dispatchToEngine routes Move to InteractiveSession.applyMovement',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Move,
  ),
  GoProne: integrated(
    'GoProne',
    'wire-intent',
    'dispatchToEngine routes GoProne to InteractiveSession.goProne',
    [
      ...MEKSTATION_WIRE_INTENT_SOURCE_REFS.GoProne,
      ...MEGAMEK_GO_PRONE_SOURCE_REFS,
    ],
  ),
  ActivateMovementEnhancement: integrated(
    'ActivateMovementEnhancement',
    'wire-intent',
    'dispatchToEngine routes ActivateMovementEnhancement to InteractiveSession.activateMovementEnhancement',
    [
      ...MEKSTATION_WIRE_INTENT_SOURCE_REFS.ActivateMovementEnhancement,
      ...MEGAMEK_MASC_SUPERCHARGER_ACTION_SOURCE_REFS,
    ],
  ),
  TorsoTwist: integrated(
    'TorsoTwist',
    'wire-intent',
    'dispatchToEngine routes TorsoTwist to InteractiveSession.torsoTwist',
    [
      ...MEKSTATION_WIRE_INTENT_SOURCE_REFS.TorsoTwist,
      ...MEGAMEK_TORSO_TWIST_SOURCE_REFS,
    ],
  ),
  Stand: integrated(
    'Stand',
    'wire-intent',
    'dispatchToEngine routes Stand to InteractiveSession.attemptStandUp',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Stand,
  ),
  Physical: integrated(
    'Physical',
    'wire-intent',
    'dispatchToEngine routes Physical to InteractiveSession.applyPhysicalAttack',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Physical,
  ),
  RequestSpot: integrated(
    'RequestSpot',
    'wire-intent',
    'Protocol accepts RequestSpot and dispatchToEngine routes it to InteractiveSession.requestSpot',
    [
      ...MEKSTATION_WIRE_INTENT_SOURCE_REFS.RequestSpot,
      ...MEGAMEK_REQUEST_SPOT_SOURCE_REFS,
    ],
  ),
  Withdraw: integrated(
    'Withdraw',
    'wire-intent',
    'dispatchToEngine routes Withdraw to InteractiveSession.declareWithdrawal',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.Withdraw,
  ),
  ForfeitMatch: outOfScope(
    'ForfeitMatch',
    'wire-intent',
    'Protocol and dispatch source refs classify ForfeitMatch as a reconnect/lobby timeout intent rejected before BattleMech engine dispatch',
    'Reconnect/lobby timeout intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.ForfeitMatch,
  ),
  LaunchMatch: outOfScope(
    'LaunchMatch',
    'wire-intent',
    'Protocol and dispatch source refs classify LaunchMatch as a lobby setup intent rejected before BattleMech engine dispatch',
    'Lobby setup intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.LaunchMatch,
  ),
  LeaveSeat: outOfScope(
    'LeaveSeat',
    'wire-intent',
    'Protocol and dispatch source refs classify LeaveSeat as a lobby seat intent rejected before BattleMech engine dispatch',
    'Lobby seat intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.LeaveSeat,
  ),
  MarkSeatAi: outOfScope(
    'MarkSeatAi',
    'wire-intent',
    'Protocol and dispatch source refs classify MarkSeatAi as a reconnect/lobby seat intent rejected before BattleMech engine dispatch',
    'Reconnect/lobby seat intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.MarkSeatAi,
  ),
  OccupySeat: outOfScope(
    'OccupySeat',
    'wire-intent',
    'Protocol and dispatch source refs classify OccupySeat as a lobby seat intent rejected before BattleMech engine dispatch',
    'Lobby seat intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.OccupySeat,
  ),
  ReassignSeat: outOfScope(
    'ReassignSeat',
    'wire-intent',
    'Protocol and dispatch source refs classify ReassignSeat as a lobby host intent rejected before BattleMech engine dispatch',
    'Lobby host intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.ReassignSeat,
  ),
  SetAiSlot: outOfScope(
    'SetAiSlot',
    'wire-intent',
    'Protocol and dispatch source refs classify SetAiSlot as a lobby slot intent rejected before BattleMech engine dispatch',
    'Lobby slot intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.SetAiSlot,
  ),
  SetHumanSlot: outOfScope(
    'SetHumanSlot',
    'wire-intent',
    'Protocol and dispatch source refs classify SetHumanSlot as a lobby slot intent rejected before BattleMech engine dispatch',
    'Lobby slot intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.SetHumanSlot,
  ),
  SetReady: outOfScope(
    'SetReady',
    'wire-intent',
    'Protocol and dispatch source refs classify SetReady as a lobby readiness intent rejected before BattleMech engine dispatch',
    'Lobby readiness intent; not a BattleMech combat action',
    MEKSTATION_WIRE_INTENT_SOURCE_REFS.SetReady,
  ),
} satisfies Record<IIntentPayload['kind'], ICombatActionSupportEntry>;
