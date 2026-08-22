/**
 * Human command and read authorization gate (authority-audit PR 3).
 *
 * Pins: each of the six request kinds refuses with a typed error when
 * no current viewer exists; a seated member cannot send an
 * engine-mutating intent as the other player (no event appended); a
 * seated member acting as themselves still dispatches and appends; force
 * scope must be a subset of server-derived ownedForceIds; a principal
 * with no membership row cannot pass any kind; stream requests for
 * another match refuse with wrong-session without revealing whether
 * that match exists; a broken store surfaces
 * MembershipSourceUnavailableError rather than an authorization refusal.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/multiplayer-server/spec.md
 */

import type { IGameUnit } from '@/types/gameplay';
import type { IIntent } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../../ServerMatchHost';
import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
  type IMembershipRecord,
  type IMembershipSource,
} from '../AuthorizedViewer';
import {
  HUMAN_ACTION_KINDS,
  HumanActionAuthorizationError,
  authorizeHumanAction,
  type HumanActionKind,
  type IHumanActionRequest,
} from '../HumanActionAuthorizationGate';
import {
  MatchSeatMembershipSource,
  MembershipSourceUnavailableError,
} from '../MatchSeatMembershipSource';

interface IRecorded {
  parsed: { kind: string; code?: string; reason?: string };
}

const HUMAN_ROW: IMembershipRecord = {
  principalId: 'user-player',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: 'session-1',
  matchId: 'match-9',
  participantId: 'participant-player',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 3,
  active: true,
};

class FakeMembershipSource implements IMembershipSource {
  public rows = new Map<string, IMembershipRecord>();
  public revisions = new Map<string, number>();

  /** Records a membership row and its session epoch. */
  public set(row: IMembershipRecord): void {
    this.rows.set(
      JSON.stringify([row.principalId, row.campaignSessionId]),
      row,
    );
    this.revisions.set(row.campaignSessionId, row.membershipRevision);
  }

  /** Returns the row for the principal/session pair, or null. */
  async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    return (
      this.rows.get(JSON.stringify([principalId, campaignSessionId])) ?? null
    );
  }

  /** Returns the session epoch, or 0 when the session is unknown. */
  async currentMembershipRevision(campaignSessionId: string): Promise<number> {
    return this.revisions.get(campaignSessionId) ?? 0;
  }
}

const STREAM_KINDS: ReadonlyArray<Exclude<HumanActionKind, 'command'>> = [
  'history-read',
  'branch',
  'timeline',
  'export',
  'private-audit',
];

/**
 * Minimal request per kind. Stream kinds name `session-1` so a viewer
 * of that session is in-scope unless a test overrides streamId.
 */
function requestForKind(
  kind: HumanActionKind,
  streamId = 'session-1',
): IHumanActionRequest {
  if (kind === 'command') return { kind: 'command' };
  return { kind, streamType: kind, streamId };
}

/**
 * Records outbound frames and close() for admission/command proofs.
 */
function makeMockSocket(): IMatchSocket & {
  sent: IRecorded[];
  closed: boolean;
} {
  const sent: IRecorded[] = [];
  const socket = {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IRecorded['parsed'] });
    },
    close() {
      socket.closed = true;
    },
    get readyState() {
      return 1;
    },
    sent,
    closed: false,
  } as IMatchSocket & { sent: IRecorded[]; closed: boolean };
  return socket;
}

/**
 * Real ServerMatchHost plus in-memory store with both 1v1 seats occupied.
 */
async function makeSeatedHost(): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
  matchId: string;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-human-action';
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_guest'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_guest', side: 'opponent' },
    ],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1')
        return {
          ...seat,
          occupant: { playerId: 'pid_host', displayName: 'Host' },
        };
      if (seat.slotId === 'bravo-1')
        return {
          ...seat,
          occupant: { playerId: 'pid_guest', displayName: 'Guest' },
        };
      return seat;
    }),
    roomCode: 'ACTION',
  });

  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(7),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

/**
 * Engine-mutating AdvancePhase envelope used by the real-host proofs.
 */
function advanceIntent(matchId: string, playerId: string): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId,
    intentId: `intent-${playerId}`,
    intent: { kind: 'AdvancePhase' },
  };
}

/**
 * Asserts the gate threw HumanActionAuthorizationError and returns it.
 */
async function expectHumanRefusal(
  run: () => Promise<unknown>,
): Promise<HumanActionAuthorizationError> {
  try {
    await run();
  } catch (error) {
    if (error instanceof HumanActionAuthorizationError) return error;
    throw error;
  }
  throw new Error('expected HumanActionAuthorizationError');
}

describe('human action authorization gate', () => {
  it('each of the six kinds refuses when no current viewer exists', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);

    for (const kind of HUMAN_ACTION_KINDS) {
      const error = await expectHumanRefusal(() =>
        authorizeHumanAction(
          resolver,
          'user-stranger',
          'session-1',
          requestForKind(kind),
        ),
      );
      expect(error.code).toBe('no-viewer');
      expect(error.message).toBe('Authorization refused');
      expect(error.message).not.toContain('user-stranger');
      expect(error.message).not.toContain('session-1');
    }
  });

  it('command scope escalation on a real host appends no event', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    const guestSocket = makeMockSocket();
    expect(await host.admitSocket(guestSocket, 'pid_guest')).not.toBeNull();
    const before = (await store.getEvents(matchId)).length;

    const broadcasts = await host.handleIntent(
      advanceIntent(matchId, 'pid_host'),
      'conn-guest',
      'pid_guest',
    );

    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]?.kind).toBe('Error');
    if (broadcasts[0]?.kind === 'Error') {
      expect(broadcasts[0].code).toBe('AUTH_REJECTED');
      expect(broadcasts[0].reason).toBe('player-mismatch');
    }
    expect((await store.getEvents(matchId)).length).toBe(before);
    expect(
      guestSocket.sent.some((frame) => frame.parsed.kind === 'Event'),
    ).toBe(false);
  });

  it('a seated member acting as themselves dispatches and appends', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    const guestSocket = makeMockSocket();
    expect(await host.admitSocket(guestSocket, 'pid_guest')).not.toBeNull();
    const before = (await store.getEvents(matchId)).length;

    const broadcasts = await host.handleIntent(
      advanceIntent(matchId, 'pid_guest'),
      'conn-guest',
      'pid_guest',
    );

    expect(broadcasts.some((frame) => frame.kind === 'Event')).toBe(true);
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(before);
    expect(
      guestSocket.sent.some((frame) => frame.parsed.kind === 'Event'),
    ).toBe(true);
  });

  it('an admitted member whose membership was revoked cannot command', async () => {
    const { host, store, matchId } = await makeSeatedHost();
    const guestSocket = makeMockSocket();
    expect(await host.admitSocket(guestSocket, 'pid_guest')).not.toBeNull();

    // Revoke durably: start the match with the guest's seat vacated.
    const meta = await store.getMatchMeta(matchId);
    await store.updateMatchMeta(matchId, {
      status: 'active',
      seats: (meta.seats ?? []).map((seat) =>
        seat.slotId === 'bravo-1' ? { ...seat, occupant: null } : seat,
      ),
    });
    const before = (await store.getEvents(matchId)).length;

    // playerId matches the connection principal, so only the gate's
    // fresh membership recheck can refuse this envelope.
    const broadcasts = await host.handleIntent(
      advanceIntent(matchId, 'pid_guest'),
      'conn-guest',
      'pid_guest',
    );

    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0]?.kind).toBe('Error');
    if (broadcasts[0]?.kind === 'Error') {
      expect(broadcasts[0].code).toBe('AUTH_REJECTED');
      expect(broadcasts[0].reason).toBe('command refused: no-viewer');
    }
    expect((await store.getEvents(matchId)).length).toBe(before);
  });

  it('command force scope must be a subset of server-derived ownedForceIds', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);

    const foreign = await expectHumanRefusal(() =>
      authorizeHumanAction(resolver, 'user-player', 'session-1', {
        kind: 'command',
        claimedForceIds: ['force-other'],
      }),
    );
    expect(foreign.code).toBe('scope-escalation');
    expect(foreign.message).toBe('Authorization refused');

    const owned = await authorizeHumanAction(
      resolver,
      'user-player',
      'session-1',
      { kind: 'command', claimedForceIds: ['force-1'] },
    );
    expect(owned.ownedForceIds).toEqual(['force-1']);

    const { store, matchId } = await makeSeatedHost();
    const seatedResolver = new AuthorizedViewerResolver(
      new MatchSeatMembershipSource(store),
    );
    const foreignSeat = await expectHumanRefusal(() =>
      authorizeHumanAction(seatedResolver, 'pid_guest', matchId, {
        kind: 'command',
        claimedForceIds: ['alpha-1'],
      }),
    );
    expect(foreignSeat.code).toBe('scope-escalation');
    const ownSeat = await authorizeHumanAction(
      seatedResolver,
      'pid_guest',
      matchId,
      { kind: 'command', claimedForceIds: ['bravo-1'] },
    );
    expect(ownSeat.ownedForceIds).toEqual(['bravo-1']);
  });

  it('non-human capability cannot pass the gate for any kind', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    source.set({
      ...HUMAN_ROW,
      principalId: 'job-effects-runner',
      principalKind: 'service',
    });
    const resolver = new AuthorizedViewerResolver(source);

    for (const kind of HUMAN_ACTION_KINDS) {
      const missingRow = await expectHumanRefusal(() =>
        authorizeHumanAction(
          resolver,
          'job-no-row',
          'session-1',
          requestForKind(kind),
        ),
      );
      expect(missingRow.code).toBe('no-viewer');

      const serviceRow = await expectHumanRefusal(() =>
        authorizeHumanAction(
          resolver,
          'job-effects-runner',
          'session-1',
          requestForKind(kind),
        ),
      );
      expect(serviceRow.code).toBe('no-viewer');
      expect(serviceRow.message).toBe(missingRow.message);
    }

    const control = await authorizeHumanAction(
      resolver,
      'user-player',
      'session-1',
      { kind: 'command' },
    );
    expect(control.principalId).toBe('user-player');
  });

  it('read kinds refuse another match without revealing whether it exists', async () => {
    const { store, matchId } = await makeSeatedHost();
    const otherMatchId = 'match-other-session';
    const now = new Date().toISOString();
    await store.createMatch({
      matchId: otherMatchId,
      hostPlayerId: 'pid_other',
      playerIds: ['pid_other'],
      sideAssignments: [{ playerId: 'pid_other', side: 'player' }],
      status: 'lobby',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 4, turnLimit: 5 },
    });
    const resolver = new AuthorizedViewerResolver(
      new MatchSeatMembershipSource(store),
    );
    const missingId = 'match-does-not-exist';

    for (const kind of STREAM_KINDS) {
      const existingForeign = await expectHumanRefusal(() =>
        authorizeHumanAction(resolver, 'pid_guest', matchId, {
          kind,
          streamType: kind,
          streamId: otherMatchId,
        }),
      );
      const missingForeign = await expectHumanRefusal(() =>
        authorizeHumanAction(resolver, 'pid_guest', matchId, {
          kind,
          streamType: kind,
          entityRef: { matchId: missingId },
        }),
      );
      expect(existingForeign.code).toBe('wrong-session');
      expect(missingForeign.code).toBe('wrong-session');
      expect(existingForeign.message).toBe(missingForeign.message);
      expect(existingForeign.message).not.toContain(otherMatchId);
      expect(existingForeign.message).not.toContain(missingId);
    }
  });

  it('a broken store surfaces MembershipSourceUnavailableError from the gate', async () => {
    const { store, matchId } = await makeSeatedHost();
    const originalGet = store.getMatchMeta.bind(store);
    store.getMatchMeta = async () => {
      throw new Error('disk exploded');
    };
    const resolver = new AuthorizedViewerResolver(
      new MatchSeatMembershipSource(store),
    );

    await expect(
      authorizeHumanAction(resolver, 'pid_guest', matchId, {
        kind: 'command',
      }),
    ).rejects.toBeInstanceOf(MembershipSourceUnavailableError);

    store.getMatchMeta = originalGet;
  });
});

describe('human action authorization gate extras', () => {
  it('a mismatched participant claim is scope-escalation, never a fallback', async () => {
    const source = new FakeMembershipSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);
    const error = await expectHumanRefusal(() =>
      authorizeHumanAction(resolver, 'user-player', 'session-1', {
        kind: 'command',
        claimedParticipantId: 'participant-other',
      }),
    );
    expect(error.code).toBe('scope-escalation');

    const matched = await authorizeHumanAction(
      resolver,
      'user-player',
      'session-1',
      {
        kind: 'command',
        claimedParticipantId: 'participant-player',
      },
    );
    expect(matched.participantId).toBe('participant-player');
  });

  it('does not convert AuthorizedViewerError integrity failures into no-viewer', async () => {
    class TreacherousSource extends FakeMembershipSource {
      override async lookupMembership(): Promise<IMembershipRecord> {
        return { ...HUMAN_ROW, principalId: 'user-someone-else' };
      }
    }
    const source = new TreacherousSource();
    source.set(HUMAN_ROW);
    const resolver = new AuthorizedViewerResolver(source);
    await expect(
      authorizeHumanAction(resolver, 'user-player', 'session-1', {
        kind: 'command',
      }),
    ).rejects.toBeInstanceOf(AuthorizedViewerError);
  });
});
