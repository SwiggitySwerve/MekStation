/**
 * Fog of war on the HTTP history chain (review N6, 2026-10-17).
 *
 * `/export` and `/private-preview` project the journal's `match` stream
 * for one viewer. Under fog that projection must give each viewer what
 * the live WebSocket path gives it, never more: the opponent's saved
 * design and critical-slot manifest stripped from `GameCreated`, every
 * fog-withheld event dropped, and sealed declarations held to their
 * actor until reveal. `/timeline` carries audit rows only and is pinned
 * here so it cannot start carrying events unnoticed. Fog off is
 * byte-for-byte the stored envelope, as before.
 *
 * Real SQLite, a real DurableMatchStore and the real route modules: the
 * leak was in the service graph, so a mocked graph would pass with it.
 *
 * @spec openspec/specs/fog-of-war/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IVaultIdentity } from '@/types/vault';

import { ROOT_EVENT_BRANCH_ID } from '@/lib/events/journal/EventJournalContract';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS } from '@/lib/events/replay/__fixtures__/CombatLifecycleBaselineSchemaPack.fixture';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { addSpectatorSeat } from '@/lib/multiplayer/server/lobby/spectatorSeats';
import { withoutUndefinedProperties } from '@/lib/multiplayer/server/MatchStreamJournalMirror';
import exportHandler from '@/pages-modules/api/matchHistoryExportRoute';
import timelineHandler from '@/pages-modules/api/matchHistoryTimelineRoute';
import privatePreviewHandler from '@/pages-modules/api/matchPrivatePreviewRoute';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameCreatedPayload,
  type IGameEvent,
} from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const MATCH_ID = 'match-history-fog';
const AT = '2026-10-17T12:00:00.000Z';
const HOST_DESIGN = 'HOST-SAVED-DESIGN-SECRET';
const OPPONENT_DESIGN = 'OPPONENT-SAVED-DESIGN-SECRET';
const HOST_SLOT = 'HOST-CRIT-SLOT-SECRET';
const OPPONENT_SLOT = 'OPPONENT-CRIT-SLOT-SECRET';
const HOST_LOCK = 'HOST-ATTACK-LOCK-WITHHELD';
const OPPONENT_LOCK = 'OPPONENT-ATTACK-LOCK-WITHHELD';
const HOST_SEALED = 'HOST-SEALED-DECLARATION';
const POST_STATE_DIGEST = 'POST-STATE-DIGEST-SERVER-ONLY';

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

interface IResult {
  statusCode: number;
  body: unknown;
}

interface IMatchFact {
  readonly factType: string;
  readonly sequenceHint: number;
  readonly payload: {
    readonly matchEvent: IGameEvent;
    readonly expectedPostStateDigest: string | null;
  };
}

function mockReqRes(
  query: Record<string, unknown>,
  wire: string,
): { req: NextApiRequest; res: NextApiResponse; result: IResult } {
  const result: IResult = { statusCode: 0, body: undefined };
  const req = {
    method: 'GET',
    headers: { authorization: `Bearer ${wire}` },
    query,
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      result.body = payload;
      return this;
    },
    setHeader() {
      return this;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}

async function mintHolder(name: string): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: `identity-${name}`,
    displayName: name,
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: AT,
  };
  const token = await issuePlayerToken(identity, {
    scope: { kind: 'match', id: MATCH_ID },
  });
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

function slotManifest(secret: string) {
  return {
    right_torso: [
      {
        slotIndex: 0,
        componentType: 'weapon',
        componentName: secret,
        destroyed: false,
      },
    ],
  };
}

/** GameCreated with a saved design + crit layout on both sides, then
 * one actor-only lock per side and one unrevealed sealed declaration. */
function matchEvents(): readonly IGameEvent[] {
  const baseline = JSON.parse(
    JSON.stringify(VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS.game_created),
  ) as IGameCreatedPayload;
  const base = {
    gameId: MATCH_ID,
    timestamp: AT,
    turn: 1,
    phase: GamePhase.WeaponAttack,
  };
  const created = {
    ...base,
    id: 'evt-created',
    sequence: 0,
    turn: 0,
    phase: GamePhase.Initiative,
    type: GameEventType.GameCreated,
    payload: {
      ...baseline,
      config: { ...baseline.config, fogOfWar: true },
      units: [
        {
          ...baseline.units[0],
          id: 'host-unit',
          side: GameSide.Player,
          unitRef: 'custom-host',
          customUnitDefinition: { id: 'custom-host', marker: HOST_DESIGN },
          criticalSlotManifest: slotManifest(HOST_SLOT),
        },
        {
          ...baseline.units[0],
          id: 'opponent-unit',
          side: GameSide.Opponent,
          unitRef: 'custom-opponent',
          customUnitDefinition: {
            id: 'custom-opponent',
            marker: OPPONENT_DESIGN,
          },
          criticalSlotManifest: slotManifest(OPPONENT_SLOT),
        },
      ],
    },
  };
  const lock = (unitId: string, sequence: number, marker: string) => ({
    ...base,
    id: `evt-lock-${unitId}`,
    sequence,
    type: GameEventType.AttackLocked,
    actorId: unitId,
    payload: { unitId, marker },
  });
  const sealed = {
    ...base,
    id: 'evt-sealed-host',
    sequence: 3,
    type: GameEventType.AttackDeclared,
    actorId: 'host-unit',
    payload: {
      attackerId: 'host-unit',
      targetId: 'opponent-unit',
      weapons: [],
      marker: HOST_SEALED,
    },
  };
  return [
    created,
    lock('host-unit', 1, HOST_LOCK),
    lock('opponent-unit', 2, OPPONENT_LOCK),
    sealed,
  ].map((event) => withoutUndefinedProperties(event) as unknown as IGameEvent);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchFacts(body: unknown): readonly IMatchFact[] {
  if (!isRecord(body) || !isRecord(body['stream'])) {
    throw new Error(`expected an export stream, got ${JSON.stringify(body)}`);
  }
  const facts = body['stream']['facts'];
  if (!Array.isArray(facts)) throw new Error('expected stream.facts');
  return facts as readonly IMatchFact[];
}

function factTypes(body: unknown): readonly string[] {
  return matchFacts(body).map((fact) => fact.factType);
}

describe('fog of war on the HTTP match-history chain', () => {
  let dir: string;
  let store: DurableMatchStore;
  let host: IHolder;
  let opponent: IHolder;
  let spectator: IHolder;

  async function setUp(fogOfWar: boolean): Promise<void> {
    dir = await mkdtemp(path.join(tmpdir(), 'match-history-fog-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'history.db') }).initialize();
    host = await mintHolder('host');
    opponent = await mintHolder('opponent');
    spectator = await mintHolder('spectator');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    await store.createMatch(meta(fogOfWar));
    await seedMatchStream();
  }

  afterEach(async () => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function meta(fogOfWar: boolean): IMatchMeta {
    const playing = defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: host.playerId, displayName: 'Host' },
          ready: true,
        };
      }
      if (seat.slotId === 'bravo-1') {
        return {
          ...seat,
          occupant: { playerId: opponent.playerId, displayName: 'Opponent' },
          ready: true,
        };
      }
      return seat;
    });
    return {
      matchId: MATCH_ID,
      hostPlayerId: host.playerId,
      playerIds: [host.playerId, opponent.playerId],
      sideAssignments: [
        { playerId: host.playerId, side: 'player' },
        { playerId: opponent.playerId, side: 'opponent' },
      ],
      status: 'active',
      createdAt: AT,
      updatedAt: AT,
      config: { mapRadius: 4, turnLimit: 5, fogOfWar },
      layout: '1v1',
      seats: addSpectatorSeat(playing, {
        playerId: spectator.playerId,
        displayName: 'Spectator',
      }),
    };
  }

  /** The `match` stream as the S1 mirror writes it: one envelope per
   * match event, eventType = the match event's type. */
  async function seedMatchStream(): Promise<void> {
    const journal = new SQLiteEventJournal(
      getSQLiteService().getDatabase(),
      () => AT,
    );
    const events = matchEvents();
    const appended = await journal.append({
      streamType: 'match',
      streamId: MATCH_ID,
      expectedBranchId: ROOT_EVENT_BRANCH_ID,
      expectedRevision: 0,
      commandId: 'cmd-fog-history',
      principal: {
        actorKind: 'human',
        actorId: host.playerId,
        authorityType: 'match',
        authorityId: MATCH_ID,
      },
      events: events.map((matchEvent, index) => ({
        eventId: `cmd-fog-history:${index}`,
        eventType: matchEvent.type,
        eventVersion: 1,
        correlationId: 'cmd-fog-history',
        causationEventIds: [],
        occurredAt: AT,
        payload: { matchEvent, expectedPostStateDigest: POST_STATE_DIGEST },
        entityRefs: [
          { entityType: 'match', entityId: MATCH_ID, role: 'stream' },
        ],
      })),
    });
    expect(appended.kind).toBe('committed');
  }

  async function getExport(holder: IHolder): Promise<IResult> {
    const { req, res, result } = mockReqRes(
      { id: MATCH_ID, streamType: 'match' },
      holder.wire,
    );
    await exportHandler(req, res);
    return result;
  }

  async function getTimeline(holder: IHolder): Promise<IResult> {
    const { req, res, result } = mockReqRes({ id: MATCH_ID }, holder.wire);
    await timelineHandler(req, res);
    return result;
  }

  async function getPrivatePreview(holder: IHolder): Promise<IResult> {
    const { req, res, result } = mockReqRes(
      { id: MATCH_ID, ref: 'no-such-private-ref' },
      holder.wire,
    );
    await privatePreviewHandler(req, res);
    return result;
  }

  function createdUnits(body: unknown) {
    const created = matchFacts(body).find(
      (fact) => fact.factType === GameEventType.GameCreated,
    );
    if (created === undefined) throw new Error('expected GameCreated');
    return (created.payload.matchEvent.payload as IGameCreatedPayload).units;
  }

  describe('fog on', () => {
    beforeEach(async () => {
      await setUp(true);
    });

    it('opponent export: own construction only, no withheld or sealed host event', async () => {
      const exported = await getExport(opponent);
      expect(exported.statusCode).toBe(200);
      const blob = JSON.stringify(exported.body);
      expect(blob).toContain(OPPONENT_DESIGN);
      expect(blob).toContain(OPPONENT_SLOT);
      expect(blob).toContain(OPPONENT_LOCK);
      for (const secret of [HOST_DESIGN, HOST_SLOT, HOST_LOCK, HOST_SEALED]) {
        expect(blob).not.toContain(secret);
      }
      expect(blob).not.toContain(POST_STATE_DIGEST);
      // Both units stay listed: identity is public, construction is not.
      expect(createdUnits(exported.body).map((unit) => unit.id)).toEqual([
        'host-unit',
        'opponent-unit',
      ]);
      expect(factTypes(exported.body)).toEqual([
        GameEventType.GameCreated,
        GameEventType.AttackLocked,
      ]);
      // sequenceHint stays gapless over what this viewer received.
      expect(
        matchFacts(exported.body).map((fact) => fact.sequenceHint),
      ).toEqual([1, 2]);
    });

    it('spectator export: no construction for anyone and only public events', async () => {
      const exported = await getExport(spectator);
      expect(exported.statusCode).toBe(200);
      const blob = JSON.stringify(exported.body);
      expect(blob).not.toContain('customUnitDefinition');
      expect(blob).not.toContain('criticalSlotManifest');
      for (const secret of [
        HOST_DESIGN,
        OPPONENT_DESIGN,
        HOST_SLOT,
        OPPONENT_SLOT,
        HOST_LOCK,
        OPPONENT_LOCK,
        HOST_SEALED,
        POST_STATE_DIGEST,
      ]) {
        expect(blob).not.toContain(secret);
      }
      expect(factTypes(exported.body)).toEqual([GameEventType.GameCreated]);
      expect(createdUnits(exported.body)).toHaveLength(2);
    });

    it('owner export: sees its own construction, lock and sealed choice, not the opponent', async () => {
      const exported = await getExport(host);
      expect(exported.statusCode).toBe(200);
      const blob = JSON.stringify(exported.body);
      for (const own of [HOST_DESIGN, HOST_SLOT, HOST_LOCK, HOST_SEALED]) {
        expect(blob).toContain(own);
      }
      for (const secret of [OPPONENT_DESIGN, OPPONENT_SLOT, OPPONENT_LOCK]) {
        expect(blob).not.toContain(secret);
      }
      expect(factTypes(exported.body)).toEqual([
        GameEventType.GameCreated,
        GameEventType.AttackLocked,
        GameEventType.AttackDeclared,
      ]);
    });

    it('host private-preview: the same fogged stream as its export', async () => {
      const preview = await getPrivatePreview(host);
      expect(preview.statusCode).toBe(200);
      const blob = JSON.stringify(preview.body);
      expect(blob).toContain(HOST_DESIGN);
      for (const secret of [OPPONENT_DESIGN, OPPONENT_SLOT, OPPONENT_LOCK]) {
        expect(blob).not.toContain(secret);
      }
      const exported = await getExport(host);
      expect(matchFacts(preview.body)).toEqual(matchFacts(exported.body));
    });

    it.each(['opponent', 'spectator'] as const)(
      '%s timeline carries audit rows only, never match events',
      async (who) => {
        const timeline = await getTimeline(
          who === 'opponent' ? opponent : spectator,
        );
        expect(timeline.statusCode).toBe(200);
        const blob = JSON.stringify(timeline.body);
        for (const secret of [
          HOST_DESIGN,
          HOST_SLOT,
          HOST_LOCK,
          HOST_SEALED,
          'customUnitDefinition',
          'criticalSlotManifest',
        ]) {
          expect(blob).not.toContain(secret);
        }
      },
    );

    it('fails closed on a match envelope it cannot read', async () => {
      const journal = new SQLiteEventJournal(
        getSQLiteService().getDatabase(),
        () => AT,
      );
      const appended = await journal.append({
        streamType: 'match',
        streamId: MATCH_ID,
        expectedBranchId: ROOT_EVENT_BRANCH_ID,
        expectedRevision: 4,
        commandId: 'cmd-malformed',
        principal: {
          actorKind: 'human',
          actorId: host.playerId,
          authorityType: 'match',
          authorityId: MATCH_ID,
        },
        events: [
          {
            eventId: 'cmd-malformed:0',
            eventType: GameEventType.AttackLocked,
            eventVersion: 1,
            correlationId: 'cmd-malformed',
            causationEventIds: [],
            occurredAt: AT,
            payload: { notAnEnvelope: HOST_LOCK },
            entityRefs: [],
          },
        ],
      });
      expect(appended.kind).toBe('committed');
      const exported = await getExport(opponent);
      expect(exported.statusCode).toBeGreaterThanOrEqual(500);
      const blob = JSON.stringify(exported.body);
      expect(blob).not.toContain(HOST_LOCK);
      expect(blob).not.toContain(HOST_DESIGN);
    });
  });

  describe('fog off', () => {
    beforeEach(async () => {
      await setUp(false);
    });

    it('every viewer still receives the stored envelopes unchanged', async () => {
      const stored = matchEvents().map((matchEvent) => ({
        factType: matchEvent.type,
        payload: { matchEvent, expectedPostStateDigest: POST_STATE_DIGEST },
      }));
      for (const holder of [host, opponent, spectator]) {
        const exported = await getExport(holder);
        expect(exported.statusCode).toBe(200);
        expect(
          matchFacts(exported.body).map((fact) => ({
            factType: fact.factType,
            payload: fact.payload,
          })),
        ).toEqual(stored);
      }
    });
  });
});
