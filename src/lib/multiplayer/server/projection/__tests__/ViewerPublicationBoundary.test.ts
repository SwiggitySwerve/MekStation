/**
 * Viewer publication boundary and match-wire catalog (authority-audit
 * PR 8). Pins: public identity parity, hidden-gap adjacency,
 * projection-failure fail-closed, wire-format public pin, and import
 * hygiene for projection/delivery plus wiring-only ServerMatchHost.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import type { IGameEvent, IGameState, IGameUnit } from '@/types/gameplay';
import type { IEventMessage, IIntent } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType, GamePhase } from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { nowIso } from '@/types/multiplayer/Protocol';

import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
  type IAuthorizedViewer,
  type IMembershipRecord,
  type IMembershipSource,
} from '../../authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '../../authorization/MatchSeatMembershipSource';
import { InMemoryMatchStore } from '../../InMemoryMatchStore';
import { streamReplay } from '../../reconnection/replayStream';
import { ServerMatchHost, type IMatchSocket } from '../../ServerMatchHost';
import {
  MATCH_WIRE_PROJECTOR_VERSION,
  MATCH_WIRE_PUBLICATION_BOUNDARY,
  MATCH_WIRE_SEALED_DECLARATION_TYPES,
  MATCH_WIRE_V2_DECISIONS,
  ViewerPublicationBoundary,
  createMatchWireSealedChoiceAudienceContext,
  listedMatchWireEventTypes,
} from '../index';
import { ViewerAudienceProjector } from '../ViewerAudienceProjector';
import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
  type JsonValue,
} from '../ViewerProjectionTypes';

const HIDDEN_MARKER = 'HIDDEN-PAYLOAD-MARKER';
const SECRET_FRAGMENT = 'SECRET-FRAGMENT';
const SESSION_ID = 'session-pub';
const MATCH_ID = 'match-pub';

const PLAYER_ROW: IMembershipRecord = {
  principalId: 'user-player',
  principalKind: 'human',
  campaignId: 'campaign-alpha',
  campaignSessionId: SESSION_ID,
  matchId: MATCH_ID,
  participantId: 'participant-player',
  role: 'player',
  ownedForceIds: ['force-1'],
  membershipRevision: 3,
  active: true,
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_ROW,
  principalId: 'user-gm',
  participantId: 'participant-gm',
  role: 'gm',
  ownedForceIds: ['force-gm'],
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
  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    return (
      this.rows.get(JSON.stringify([principalId, campaignSessionId])) ?? null
    );
  }

  /** Returns the session epoch, or 0 when the session is unknown. */
  public async currentMembershipRevision(
    campaignSessionId: string,
  ): Promise<number> {
    return this.revisions.get(campaignSessionId) ?? 0;
  }
}

/** Mints a branded viewer from a membership row. */
async function resolveViewer(
  row: IMembershipRecord,
): Promise<IAuthorizedViewer> {
  const source = new FakeMembershipSource();
  source.set(row);
  const resolver = new AuthorizedViewerResolver(source);
  return resolver.resolve(
    mintVerifiedPrincipal(row.principalId),
    row.campaignSessionId,
  );
}

/** Identity project used by synthetic catalogs. */
function projectIdentity(payload: unknown): JsonValue {
  return payload as JsonValue;
}

interface IRecorded {
  payload: string;
  parsed: { kind: string; event?: unknown; events?: unknown[] };
}

/** Records outbound frames for real-host proofs. */
function makeMockSocket(): IMatchSocket & {
  sent: IRecorded[];
  closed: boolean;
} {
  const sent: IRecorded[] = [];
  const socket = {
    send(data: string) {
      sent.push({
        payload: data,
        parsed: JSON.parse(data) as IRecorded['parsed'],
      });
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

/** Real host with both 1v1 seats occupied. */
async function makeSeatedHost(): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
  matchId: string;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-publication';
  const now = '2026-08-21T23:00:00.000Z';
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
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: 'pid_host', displayName: 'Host' },
        };
      }
      if (seat.slotId === 'bravo-1') {
        return {
          ...seat,
          occupant: { playerId: 'pid_guest', displayName: 'Guest' },
        };
      }
      return seat;
    }),
    roomCode: 'PUBLISH',
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(11),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

/** Engine-mutating AdvancePhase envelope. */
function advanceIntent(matchId: string, playerId: string): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId,
    intentId: `intent-${playerId}-pub`,
    intent: { kind: 'AdvancePhase' },
  };
}

/** Builds a live Event envelope around a synthetic typed payload. */
function liveEvent(type: string, payload: unknown): IEventMessage {
  return {
    kind: 'Event',
    matchId: MATCH_ID,
    ts: '2026-08-21T23:00:00.000Z',
    event: { type, payload },
  };
}

/** Authoritative rows shaped like the emitter's, stamp included. */
function paginationEvents(count: number): readonly IGameEvent[] {
  return Array.from({ length: count }, (_unused, index) => ({
    id: `evt-page-${index}`,
    gameId: MATCH_ID,
    sequence: index,
    timestamp: '2026-08-21T23:00:00.000Z',
    type: 'phase_changed',
    turn: 1,
    phase: 'movement',
    visibility: 'public',
    payload: { fromPhase: 'initiative', toPhase: 'movement' },
  })) as unknown as readonly IGameEvent[];
}

/** The same row as a player viewer holds it, stamps removed. */
function withoutVisibility(event: IGameEvent): Record<string, unknown> {
  const kept: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(event)) {
    if (key === 'visibility' || key === 'sequence') continue;
    kept[key] = value;
  }
  return kept;
}

/** Test-only catalog: public, hidden, gm-only. Not the production v1 map. */
function hiddenGapBoundary(): ViewerPublicationBoundary {
  return new ViewerPublicationBoundary(
    new ViewerAudienceProjector({
      projectorVersion: 1,
      streamType: 'hidden-gap-proof',
      decisions: [
        {
          eventType: 'public_alpha',
          decision: { kind: 'public', project: projectIdentity },
        },
        { eventType: 'hidden_gap', decision: { kind: 'hidden' } },
        {
          eventType: 'public_beta',
          decision: { kind: 'public', project: projectIdentity },
        },
        {
          eventType: 'gm_briefing',
          decision: { kind: 'gm-only', project: projectIdentity },
        },
      ],
    }),
  );
}

/** Test-only catalog whose project throws for one type. */
function throwingBoundary(): ViewerPublicationBoundary {
  return new ViewerPublicationBoundary(
    new ViewerAudienceProjector({
      projectorVersion: 1,
      streamType: 'throw-proof',
      decisions: [
        {
          eventType: 'boom_type',
          decision: {
            kind: 'public',
            project: (): JsonValue => {
              throw new Error(`${SECRET_FRAGMENT} leaked`);
            },
          },
        },
      ],
    }),
  );
}

/** Walks non-test TypeScript sources under a folder. */
function runtimeSourceFiles(relativeDir: string): readonly string[] {
  const files: string[] = [];
  function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== '__tests__' && entry.name !== '__fixtures__') {
          walk(full);
        }
      } else if (entry.name.endsWith('.ts')) {
        files.push(full);
      }
    }
  }
  walk(path.join(process.cwd(), relativeDir));
  return files;
}

describe('viewer publication boundary', () => {
  describe('live parity on a real host', () => {
    it('projected Event frames equal raw socket frames, stamps included', async () => {
      const { host, store, matchId } = await makeSeatedHost();
      const hostSock = makeMockSocket();
      const guestSock = makeMockSocket();
      expect(await host.admitSocket(hostSock, 'pid_host')).not.toBeNull();
      expect(await host.admitSocket(guestSock, 'pid_guest')).not.toBeNull();
      hostSock.sent.length = 0;
      guestSock.sent.length = 0;

      await host.handleIntent(
        advanceIntent(matchId, 'pid_host'),
        'conn-host',
        'pid_host',
      );

      const hostEvents = hostSock.sent.filter(
        (row) => row.parsed.kind === 'Event',
      );
      const guestEvents = guestSock.sent.filter(
        (row) => row.parsed.kind === 'Event',
      );
      expect(hostEvents.length).toBeGreaterThan(0);
      expect(guestEvents).toEqual(hostEvents);

      const resolver = new AuthorizedViewerResolver(
        new MatchSeatMembershipSource(store),
      );
      const hostViewer = await resolver.resolve(
        mintVerifiedPrincipal('pid_host'),
        matchId,
      );
      const guestViewer = await resolver.resolve(
        mintVerifiedPrincipal('pid_guest'),
        matchId,
      );
      for (const row of hostEvents) {
        const raw = JSON.parse(row.payload) as IEventMessage;
        const hostGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
          hostViewer,
          raw,
        );
        const guestGuarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
          guestViewer,
          raw,
        );
        expect(hostGuarded).toEqual({ kind: 'send', value: raw });
        expect(guestGuarded).toEqual({ kind: 'send', value: raw });
        if (hostGuarded.kind === 'send') {
          expect(hostGuarded.value).toBe(raw);
        }
        const event = raw.event as { payload?: { intentId?: string } };
        if (event.payload?.intentId !== undefined) {
          expect(event.payload.intentId).toBe('intent-pid_host-pub');
        }
      }
    });
  });

  describe('hidden gap', () => {
    it('omits the hidden frame with no marker and delivers gm-only only to gm', async () => {
      const boundary = hiddenGapBoundary();
      const player = await resolveViewer(PLAYER_ROW);
      const gm = await resolveViewer(GM_ROW);
      const alpha = liveEvent('public_alpha', { headline: 'A' });
      const hidden = liveEvent('hidden_gap', { secret: HIDDEN_MARKER });
      const beta = liveEvent('public_beta', { headline: 'B' });
      const briefing = liveEvent('gm_briefing', { briefing: 'GM-ONLY' });

      const playerSequence = [
        boundary.guardLiveEvent(player, alpha),
        boundary.guardLiveEvent(player, hidden),
        boundary.guardLiveEvent(player, beta),
      ];
      expect(playerSequence.map((row) => row.kind)).toEqual([
        'send',
        'omit',
        'send',
      ]);
      const serialized = JSON.stringify(
        playerSequence.filter((row) => row.kind === 'send'),
      );
      expect(serialized).not.toContain(HIDDEN_MARKER);
      expect(serialized).toContain('A');
      expect(serialized).toContain('B');

      const playerBriefing = boundary.guardLiveEvent(player, briefing);
      const gmBriefing = boundary.guardLiveEvent(gm, briefing);
      expect(playerBriefing.kind).toBe('omit');
      expect(gmBriefing).toEqual({ kind: 'send', value: briefing });

      const mixedFrames = {
        start: {
          kind: 'ReplayStart' as const,
          matchId: MATCH_ID,
          ts: '2026-08-21T23:00:00.000Z',
          fromSeq: 0,
          totalEvents: 3,
        },
        chunks: [
          {
            kind: 'ReplayChunk' as const,
            matchId: MATCH_ID,
            ts: '2026-08-21T23:00:00.000Z',
            events: [
              { type: 'public_alpha', payload: { headline: 'A' }, sequence: 1 },
              {
                type: 'hidden_gap',
                payload: { secret: HIDDEN_MARKER },
                sequence: 2,
              },
              { type: 'public_beta', payload: { headline: 'B' }, sequence: 3 },
            ],
          },
        ],
        end: {
          kind: 'ReplayEnd' as const,
          matchId: MATCH_ID,
          ts: '2026-08-21T23:00:00.000Z',
          toSeq: 3,
        },
      };
      const guardedReplay = boundary.guardReplayFrames(player, mixedFrames);
      expect(guardedReplay.kind).toBe('send');
      if (guardedReplay.kind !== 'send') return;
      const replayJson = JSON.stringify(guardedReplay.frames);
      expect(replayJson).not.toContain(HIDDEN_MARKER);
      expect(guardedReplay.frames.chunks[0]?.kind).toBe('ReplayChunk');
      if (guardedReplay.frames.chunks[0]?.kind !== 'ReplayChunk') return;
      expect(guardedReplay.frames.chunks[0].events).toEqual([
        { type: 'public_alpha', payload: { headline: 'A' } },
        { type: 'public_beta', payload: { headline: 'B' } },
      ]);
      if (guardedReplay.frames.start.kind === 'ReplayStart') {
        expect(guardedReplay.frames.start.totalEvents).toBe(2);
      }
    });
  });

  describe('replay pagination', () => {
    it("keeps the caller's chunk boundaries when every event is rewritten", async () => {
      const player = await resolveViewer(PLAYER_ROW);
      const events = paginationEvents(5);
      const frames = streamReplay(MATCH_ID, events, 0, 2);
      expect(frames.chunks).toHaveLength(3);

      const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardReplayFrames(
        player,
        frames,
      );
      expect(guarded.kind).toBe('send');
      if (guarded.kind !== 'send') return;

      // The authority stamps `visibility` on everything it emits, so the
      // removal touches EVERY event and the bundle is always rebuilt.
      // The rebuild must not re-chunk: `streamReplay` paginates so a
      // long match does not push one megabyte payload, and concatenating
      // the pages would undo that for every replay in production.
      expect(guarded.frames.chunks).toHaveLength(frames.chunks.length);
      expect(
        guarded.frames.chunks.map((chunk) =>
          chunk.kind === 'ReplayChunk' ? chunk.events.length : -1,
        ),
      ).toEqual([2, 2, 1]);

      // CONTROL: the pages still carry every event, minus the field.
      const delivered = guarded.frames.chunks.flatMap((chunk) =>
        chunk.kind === 'ReplayChunk' ? chunk.events : [],
      );
      expect(delivered).toEqual(events.map(withoutVisibility));
      if (guarded.frames.start.kind === 'ReplayStart') {
        expect(guarded.frames.start.totalEvents).toBe(5);
        expect(guarded.frames.start.fromSeq).toBeUndefined();
      }
      if (guarded.frames.end.kind === 'ReplayEnd') {
        expect(guarded.frames.end.toSeq).toBeUndefined();
      }
    });

    it('returns the identical bundle for a GM when nothing needs removing', async () => {
      const gm = await resolveViewer(GM_ROW);
      const events = paginationEvents(5).map((event) => {
        const kept: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(event)) {
          if (key === 'visibility') continue;
          kept[key] = value;
        }
        return kept;
      });
      const frames = streamReplay(
        MATCH_ID,
        events as unknown as readonly IGameEvent[],
        0,
        2,
      );

      const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardReplayFrames(
        gm,
        frames,
      );
      expect(guarded.kind).toBe('send');
      if (guarded.kind !== 'send') return;
      // Identity, not deep equality. The docblock promises the ORIGINAL
      // bundle back when the projector touched nothing, stamps included;
      // a rebuild that happened to produce an equal object would still
      // break that promise, so this compares by reference.
      expect(guarded.frames).toBe(frames);
    });

    it('rewrites player envelopes while keeping already-projected chunks by identity', async () => {
      const player = await resolveViewer(PLAYER_ROW);
      const events = paginationEvents(5).map(withoutVisibility);
      const frames = streamReplay(
        MATCH_ID,
        events as unknown as readonly IGameEvent[],
        0,
        2,
      );

      const guarded = MATCH_WIRE_PUBLICATION_BOUNDARY.guardReplayFrames(
        player,
        frames,
      );
      expect(guarded.kind).toBe('send');
      if (guarded.kind !== 'send') return;
      expect(guarded.frames).not.toBe(frames);
      expect(guarded.frames.chunks).toBe(frames.chunks);
      if (guarded.frames.start.kind === 'ReplayStart') {
        expect(guarded.frames.start.fromSeq).toBeUndefined();
        expect(guarded.frames.start.totalEvents).toBe(5);
      }
      if (guarded.frames.end.kind === 'ReplayEnd') {
        expect(guarded.frames.end.toSeq).toBeUndefined();
      }
    });
  });

  describe('sealed tactical declarations', () => {
    it('omits an opponent attack declaration while retaining immediate public phase publication', async () => {
      const opponent = await resolveViewer({
        ...PLAYER_ROW,
        principalId: 'user-opponent',
        participantId: 'participant-opponent',
      });
      const declaration = liveEvent('attack_declared', {
        attackerId: 'unit-alpha',
        targetId: 'unit-bravo',
        weapons: ['medium-laser'],
        toHitNumber: 7,
      });
      const publicPhase = liveEvent('phase_changed', {
        fromPhase: 'movement',
        toPhase: 'weapon_attack',
      });

      expect(
        MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(opponent, declaration),
      ).toEqual({ kind: 'omit' });
      expect(
        MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(opponent, publicPhase),
      ).toEqual({ kind: 'send', value: publicPhase });
    });

    it('releases an attack declaration to the opponent only after its committed attacks reveal', async () => {
      const opponent = await resolveViewer({
        ...PLAYER_ROW,
        principalId: 'user-opponent',
        participantId: 'participant-opponent',
      });
      const attack = {
        id: 'attack-sealed',
        gameId: MATCH_ID,
        sequence: 11,
        timestamp: '2026-08-30T00:00:00.000Z',
        type: GameEventType.AttackDeclared,
        turn: 3,
        phase: GamePhase.WeaponAttack,
        actorId: 'unit-alpha',
        payload: {
          attackerId: 'unit-alpha',
          targetId: 'unit-bravo',
          weapons: ['medium-laser'],
          toHitNumber: 7,
        },
      } as IGameEvent;
      const reveal = {
        id: 'attacks-revealed',
        gameId: MATCH_ID,
        sequence: 12,
        timestamp: '2026-08-30T00:00:00.000Z',
        type: GameEventType.AttacksRevealed,
        turn: 3,
        phase: GamePhase.WeaponAttack,
        payload: { unitIds: ['unit-alpha'], attackCount: 1 },
      } as IGameEvent;
      const context = createMatchWireSealedChoiceAudienceContext(
        [attack, reveal],
        { units: {} } as IGameState,
        reveal.sequence,
      );
      const message: IEventMessage = {
        kind: 'Event',
        matchId: MATCH_ID,
        ts: reveal.timestamp,
        event: attack,
      };

      const released = MATCH_WIRE_PUBLICATION_BOUNDARY.guardLiveEvent(
        opponent,
        message,
        context,
      );
      expect(released.kind).toBe('send');
      if (released.kind !== 'send') return;
      const event = released.value.event;
      expect(typeof event).toBe('object');
      if (typeof event !== 'object' || event === null) return;
      expect(event).toMatchObject({
        id: attack.id,
        payload: attack.payload,
      });
      expect('sequence' in event).toBe(false);
    });
  });

  describe('projection failure', () => {
    it('returns a typed failure with no raw fallback or payload fragment', async () => {
      const boundary = throwingBoundary();
      const player = await resolveViewer(PLAYER_ROW);
      const message = liveEvent('boom_type', { leak: SECRET_FRAGMENT });
      const result = boundary.guardLiveEvent(player, message);
      expect(result.kind).toBe('failure');
      if (result.kind !== 'failure') return;
      expect(result.error).toBeInstanceOf(ViewerProjectionError);
      expect(result.error.code).toBe('projection-failed');
      expect(result.error.message).toBe(
        VIEWER_PROJECTION_MESSAGES.projectionFailed,
      );
      const encoded = JSON.stringify(result.error);
      expect(encoded).not.toContain(SECRET_FRAGMENT);
      expect(encoded).not.toContain('boom_type');
      expect(encoded).not.toContain('leak');
    });
  });

  describe('wire-format pin', () => {
    it('seals only tactical declarations at projectorVersion 2', () => {
      const types = listedMatchWireEventTypes();
      expect(types.length).toBe(Object.keys(MATCH_WIRE_V2_DECISIONS).length);
      expect(MATCH_WIRE_PROJECTOR_VERSION).toBe(2);
      for (const eventType of types) {
        expect(MATCH_WIRE_V2_DECISIONS[eventType].kind).toBe(
          MATCH_WIRE_SEALED_DECLARATION_TYPES.has(eventType)
            ? 'sealed-to-actor-until-revealed'
            : 'public',
        );
      }
    });
  });

  describe('boundary hygiene', () => {
    it('keeps projection and delivery free of events/privacy imports', () => {
      const offenders: string[] = [];
      const privacy = /events[/\\]privacy/;
      for (const file of [
        ...runtimeSourceFiles('src/lib/multiplayer/server/projection'),
        ...runtimeSourceFiles('src/lib/multiplayer/server/delivery'),
      ]) {
        const text = fs.readFileSync(file, 'utf8');
        if (privacy.test(text)) {
          offenders.push(`${path.basename(file)}: privacy import`);
        }
      }
      expect(offenders).toEqual([]);
    });

    it('keeps ServerMatchHost free of publication policy logic', () => {
      const text = fs.readFileSync(
        path.join(
          process.cwd(),
          'src/lib/multiplayer/server/ServerMatchHost.ts',
        ),
        'utf8',
      );
      expect(text).not.toMatch(/ViewerPublicationBoundary/);
      expect(text).not.toMatch(/MatchWireAudienceCatalog/);
      expect(text).not.toMatch(/kind:\s*'hidden'/);
      expect(text).not.toMatch(/kind:\s*'gm-only'/);
      expect(text).not.toMatch(/kind:\s*'owner-only'/);
    });
  });
});
