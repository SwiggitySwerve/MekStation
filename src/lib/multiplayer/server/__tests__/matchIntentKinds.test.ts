import type { InteractiveSession } from '@/engine/InteractiveSession';

import {
  IntentPayloadSchema,
  type IIntentPayload,
} from '@/types/multiplayer/Protocol';

import { MATCH_INTENT_KINDS, isLobbyIntentKind } from '../matchIntentKinds';
import { dispatchToEngine } from '../ServerMatchHostEngineDispatch';

it('classifies every wire intent and refuses every lobby kind at the engine boundary', () => {
  const kinds = IntentPayloadSchema.options.map(
    (option) => option.shape.kind.value,
  );
  expect(Object.keys(MATCH_INTENT_KINDS).sort()).toEqual([...kinds].sort());
  for (const kind of kinds) {
    if (!isLobbyIntentKind(kind)) continue;
    // The boundary must refuse by kind before inspecting a payload or session.
    expect(() =>
      dispatchToEngine({} as InteractiveSession, { kind } as IIntentPayload),
    ).toThrow(`Lobby intent ${kind} routed to engine dispatcher`);
  }
  expect(isLobbyIntentKind('RewindRequest')).toBe(false);
  expect(isLobbyIntentKind('Attack')).toBe(false);
});
