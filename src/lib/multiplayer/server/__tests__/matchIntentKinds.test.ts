import type { InteractiveSession } from '@/engine/InteractiveSession';

import {
  ENGINE_WIRE_COMBAT_INTENT_KINDS,
  NON_COMBAT_WIRE_INTENT_KINDS,
} from '@/simulation/runner/CombatActionSupport.wireIntentSupport';
import {
  IntentPayloadSchema,
  type IIntentPayload,
} from '@/types/multiplayer/Protocol';

import {
  MATCH_INTENT_KINDS,
  isLobbyIntentKind,
  lobbyIntentAllowedInStatus,
} from '../matchIntentKinds';
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

it('keeps the runner wire-intent lists in step with the intent table routes', () => {
  const kindsWhere = (isMember: (route: string) => boolean): string[] =>
    Object.entries(MATCH_INTENT_KINDS)
      .filter(([, policy]) => isMember(policy.route))
      .map(([kind]) => kind)
      .sort();

  // Engine intents are the combat actions; lobby and rewind intents never are.
  expect([...ENGINE_WIRE_COMBAT_INTENT_KINDS].sort()).toEqual(
    kindsWhere((route) => route === 'engine'),
  );
  expect([...NON_COMBAT_WIRE_INTENT_KINDS].sort()).toEqual(
    kindsWhere((route) => route === 'lobby' || route === 'rewind'),
  );
});

it('admits MarkSeatAi only in an active match and no lobby intent in a completed one', () => {
  expect(lobbyIntentAllowedInStatus('MarkSeatAi', 'lobby')).toBe(false);
  expect(lobbyIntentAllowedInStatus('MarkSeatAi', 'active')).toBe(true);
  for (const option of IntentPayloadSchema.options) {
    const kind = option.shape.kind.value;
    if (isLobbyIntentKind(kind)) {
      expect(lobbyIntentAllowedInStatus(kind, 'completed')).toBe(false);
    }
  }
});
