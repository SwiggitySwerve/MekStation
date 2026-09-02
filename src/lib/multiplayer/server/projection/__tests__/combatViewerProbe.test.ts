/**
 * The combat viewer probe: what one audience's view of a history digests
 * to (add-authoritative-history-branches; umbrella 13.5).
 *
 * The impact derivation asks "did what this viewer sees change?" and can
 * only answer it through a probe. This is the combat one, and it is a
 * composition rather than a new rule: `audienceDigest` already fogs and
 * field-projects exactly the way the live broadcaster does, and it is
 * consumed here UNTOUCHED so the field policy keeps its one owner.
 *
 * The non-vacuity control matters more than the equality: digests that
 * agree prove nothing unless disagreeing was possible. So the GM and a
 * player must come out different, and an authority-only field must be
 * the thing that makes them different.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-combat-interventions/spec.md
 */

import type { IProjectableBranchEvent } from '@/lib/events/journal/EventHistoryCandidateVerification';
import type { IShadowAudienceInput } from '@/lib/multiplayer/server/journalAuthorityShadow';
import type {
  IGameEvent,
  IGameState,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';

import { combatViewerProbe } from '../combatViewerProbe';

const GM = 'pid_gm';
const P1 = 'pid_one';
const P2 = 'pid_two';

const AUDIENCE: IShadowAudienceInput = {
  gmPlayerId: GM,
  playerIds: [P1, P2],
  // Fog is OFF. `filterEventForPlayer` short-circuits, so per-player
  // separation collapses to viewer CLASSES - stated, never hidden.
  config: { fogOfWar: false },
  sideAssignments: [
    { playerId: P1, side: 'player' },
    { playerId: P2, side: 'opponent' },
  ],
};

/** Fog-off never reads state; it is threaded so the day fog lands is a flip. */
const STATE = { units: {}, phase: GamePhase.Movement } as unknown as IGameState;

function gameEvent(overrides: Partial<IGameEvent> = {}): IGameEvent {
  return {
    id: 'event-1',
    gameId: 'match-1',
    sequence: 0,
    timestamp: '2026-09-02T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: {},
    ...overrides,
  } as IGameEvent;
}

/** The journal-shaped wrapper the derivation hands the probe. */
function projectable(event: IGameEvent): IProjectableBranchEvent {
  return {
    eventId: event.id,
    branchId: 'root',
    streamRevision: event.sequence + 1,
    eventVersion: 1,
    previousStreamEventDigest: null,
    eventDigest: 'a'.repeat(64),
    entityRefs: [],
    eventType: String(event.type),
    payload: event,
  };
}

describe('combatViewerProbe', () => {
  function probe() {
    return combatViewerProbe({ state: STATE, audience: AUDIENCE });
  }

  it('digests the GM and a player view differently', () => {
    // The non-vacuity control. An authority-only field is present, so
    // the two classes MUST diverge - if they did not, the probe would be
    // reporting agreement it never established.
    const events = [projectable(gameEvent({ visibility: 'public' }))];

    expect(probe().digest('gm', events)).not.toBe(
      probe().digest(`player:${P1}`, events),
    );
  });

  it('never lets an authority-only field reach a player digest', () => {
    // `sequence` is in AUTHORITY_ONLY_EVENT_FIELDS. Changing it must move
    // the GM digest and leave every player digest exactly where it was:
    // that is the projector doing its job, and a probe that bypassed it
    // would move both.
    const before = [projectable(gameEvent({ sequence: 0 }))];
    const after = [projectable(gameEvent({ sequence: 7 }))];

    expect(probe().digest(`player:${P1}`, after)).toBe(
      probe().digest(`player:${P1}`, before),
    );
    expect(probe().digest('gm', after)).not.toBe(probe().digest('gm', before));
  });

  it('answers the same twice for the same events', () => {
    // The derivation refuses a probe that will not reproduce, so the
    // probe has to earn that: no shared mutable cache across calls, no
    // dependence on call order.
    const events = [
      projectable(gameEvent({ id: 'event-1', sequence: 0 })),
      projectable(gameEvent({ id: 'event-2', sequence: 1 })),
    ];
    const subject = probe();

    expect(subject.digest('gm', events)).toBe(subject.digest('gm', events));
  });

  it('refuses a viewer it cannot classify rather than guessing', () => {
    // Defaulting an unknown viewer to `player` would hand the most
    // permissive projection to whoever we failed to recognise, and
    // defaulting to `gm` would leak. Neither is a safe guess.
    expect(() => probe().digest('player:stranger', [])).toThrow(
      /unknown viewer/i,
    );
    expect(() => probe().digest('spectator', [])).toThrow(/unknown viewer/i);
  });
});
