import type { IIntentPayload } from '@/types/multiplayer/Protocol';

import type { ICombatFeatureSourceReference } from './CombatFeatureSupport';

import { mekstationDeviationSourceRef } from './CombatActionSupport.entries';

function wireDispatchSourceRef(
  citation: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return mekstationDeviationSourceRef(
    citation,
    'src/lib/multiplayer/server/ServerMatchHostEngineDispatch.ts',
    lineRange,
  );
}

function wireProtocolSourceRef(
  citation: string,
  lineRange: string,
): ICombatFeatureSourceReference {
  return mekstationDeviationSourceRef(
    citation,
    'src/types/multiplayer/Protocol.ts',
    lineRange,
  );
}

export const MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS = [
  wireProtocolSourceRef(
    'MekStation Protocol defines OccupySeat, LeaveSeat, ReassignSeat, SetAiSlot, SetHumanSlot, SetReady, and LaunchMatch as lobby intents for seat occupancy, readiness, and launch flow.',
    'L158-L213',
  ),
  wireDispatchSourceRef(
    'MekStation dispatchToEngine rejects lobby wire intents as non-engine intents instead of treating them as BattleMech combat actions.',
    'L72-L83',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_RECONNECT_WIRE_INTENT_SOURCE_REFS = [
  wireProtocolSourceRef(
    'MekStation Protocol defines MarkSeatAi and ForfeitMatch as reconnection/lobby timeout intents rather than BattleMech combat actions.',
    'L219-L245',
  ),
  wireDispatchSourceRef(
    'MekStation dispatchToEngine rejects reconnect and lobby timeout wire intents as non-engine intents instead of treating them as BattleMech combat actions.',
    'L72-L83',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_WIRE_INTENT_SOURCE_REFS = {
  AdvancePhase: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes AdvancePhase wire intents to InteractiveSession.advancePhase.',
      'L54-L56',
    ),
  ],
  Attack: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Attack wire intents to InteractiveSession.applyAttack.',
      'L42-L44',
    ),
  ],
  Concede: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Concede wire intents to InteractiveSession.concede after normalizing the side payload.',
      'L66-L70',
    ),
  ],
  Eject: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Eject wire intents to InteractiveSession.ejectUnit.',
      'L58-L60',
    ),
  ],
  Move: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Move wire intents to InteractiveSession.applyMovement.',
      'L15-L24',
    ),
    wireDispatchSourceRef(
      'MekStation parseMovementType normalizes Move wire movement strings before engine dispatch.',
      'L94-L111',
    ),
  ],
  Physical: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Physical wire intents to InteractiveSession.applyPhysicalAttack.',
      'L46-L52',
    ),
  ],
  RequestSpot: [
    wireProtocolSourceRef(
      'MekStation Protocol defines RequestSpot wire intents with spotting unit id and target id.',
      'L127-L132',
    ),
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes RequestSpot wire intents to InteractiveSession.requestSpot.',
      'L54-L58',
    ),
  ],
  GoProne: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes GoProne wire intents to InteractiveSession.goProne.',
      'L30-L32',
    ),
  ],
  ActivateMovementEnhancement: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes ActivateMovementEnhancement wire intents to InteractiveSession.activateMovementEnhancement.',
      'L34-L36',
    ),
  ],
  TorsoTwist: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes TorsoTwist wire intents to InteractiveSession.torsoTwist.',
      'L38-L40',
    ),
  ],
  Stand: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Stand wire intents to InteractiveSession.attemptStandUp.',
      'L26-L28',
    ),
  ],
  Withdraw: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Withdraw wire intents to InteractiveSession.declareWithdrawal.',
      'L62-L64',
    ),
  ],
  ForfeitMatch: MEKSTATION_RECONNECT_WIRE_INTENT_SOURCE_REFS,
  LaunchMatch: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  LeaveSeat: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  MarkSeatAi: MEKSTATION_RECONNECT_WIRE_INTENT_SOURCE_REFS,
  OccupySeat: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  ReassignSeat: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  SetAiSlot: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  SetHumanSlot: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
  SetReady: MEKSTATION_LOBBY_WIRE_INTENT_SOURCE_REFS,
} satisfies Record<
  IIntentPayload['kind'],
  readonly ICombatFeatureSourceReference[]
>;
