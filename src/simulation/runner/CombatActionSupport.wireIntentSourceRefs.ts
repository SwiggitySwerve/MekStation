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
    'L116-L132',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_RECONNECT_WIRE_INTENT_SOURCE_REFS = [
  wireProtocolSourceRef(
    'MekStation Protocol defines MarkSeatAi and ForfeitMatch as reconnection/lobby timeout intents rather than BattleMech combat actions.',
    'L219-L245',
  ),
  wireDispatchSourceRef(
    'MekStation dispatchToEngine rejects reconnect and lobby timeout wire intents as non-engine intents instead of treating them as BattleMech combat actions.',
    'L116-L132',
  ),
] satisfies readonly ICombatFeatureSourceReference[];

export const MEKSTATION_WIRE_INTENT_SOURCE_REFS = {
  AdvancePhase: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes AdvancePhase wire intents to InteractiveSession.advancePhase.',
      'L79-L81',
    ),
  ],
  Attack: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Attack wire intents to InteractiveSession.applyAttack.',
      'L63-L66',
    ),
  ],
  Concede: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Concede wire intents to InteractiveSession.concede after normalizing the side payload.',
      'L88-L91',
    ),
  ],
  Eject: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Eject wire intents to InteractiveSession.ejectUnit.',
      'L82-L84',
    ),
  ],
  Move: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Move wire intents to InteractiveSession.applyMovement.',
      'L41-L50',
    ),
    wireDispatchSourceRef(
      'MekStation parseMovementType normalizes Move wire movement strings before engine dispatch.',
      'L149-L155',
    ),
  ],
  Physical: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Physical wire intents to InteractiveSession.applyPhysicalAttack.',
      'L67-L75',
    ),
  ],
  RequestSpot: [
    wireProtocolSourceRef(
      'MekStation Protocol defines RequestSpot wire intents with spotting unit id and target id.',
      'L127-L132',
    ),
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes RequestSpot wire intents to InteractiveSession.requestSpot.',
      'L76-L78',
    ),
  ],
  GoProne: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes GoProne wire intents to InteractiveSession.goProne.',
      'L54-L56',
    ),
  ],
  ActivateMovementEnhancement: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes ActivateMovementEnhancement wire intents to InteractiveSession.activateMovementEnhancement.',
      'L57-L59',
    ),
  ],
  TorsoTwist: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes TorsoTwist wire intents to InteractiveSession.torsoTwist.',
      'L60-L62',
    ),
  ],
  Stand: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Stand wire intents to InteractiveSession.attemptStandUp.',
      'L51-L53',
    ),
  ],
  Withdraw: [
    wireDispatchSourceRef(
      'MekStation dispatchToEngine routes Withdraw wire intents to InteractiveSession.declareWithdrawal.',
      'L85-L87',
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
  RewindRequest: [
    wireProtocolSourceRef(
      'MekStation Protocol defines RewindRequest as a non-mutating player rewind request carrying targetRevision and a reason, not a BattleMech combat action.',
      'L342-L351',
    ),
    wireDispatchSourceRef(
      'MekStation dispatchToEngine excludes RewindRequest from EngineIntent so it is not treated as a BattleMech combat action.',
      'L14-L29',
    ),
  ],
} satisfies Record<
  IIntentPayload['kind'],
  readonly ICombatFeatureSourceReference[]
>;
