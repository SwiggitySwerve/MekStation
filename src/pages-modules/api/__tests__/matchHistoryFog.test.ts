/**
 * Fog of war on the HTTP match-history chain (review N6; PR #2212
 * review F1-F3).
 *
 * `/export` and `/private-preview` project the journal's `match` stream
 * for one viewer. Under fog that projection must give each viewer what
 * the live WebSocket path gives it, never more: the opponent's saved
 * design and critical-slot manifest stripped from `GameCreated`, every
 * fog-withheld event dropped, sealed declarations held to their actor
 * until reveal (a host-as-GM brand does not change that), and the
 * authority-only fields the wire strips stripped here too.
 *
 * SEEDED THROUGH THE REAL S1 MIRROR. `mirrorMatchBatchToJournal` writes
 * the stream on the baseline branch `main` with an effective head, the
 * shape production writes; the first assertion pins that, so a fixture
 * on `root` cannot quietly come back.
 *
 * `/timeline` carries audit rows only and is pinned so it cannot start
 * carrying events unnoticed. Fog off is the parent projection unchanged.
 *
 * @spec openspec/specs/fog-of-war/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { readdirSync, readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';
import type { IVaultIdentity } from '@/types/vault';

import { canonicalizeEventDigestV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS } from '@/lib/events/replay/__fixtures__/CombatLifecycleBaselineSchemaPack.fixture';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import {
  AuthorizedViewerResolver,
  mintVerifiedPrincipal,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '@/lib/multiplayer/server/authorization/MatchSeatMembershipSource';
import { DurableMatchStore } from '@/lib/multiplayer/server/DurableMatchStore';
import {
  _resetDefaultMatchStore,
  _setDefaultMatchStoreForTests,
} from '@/lib/multiplayer/server/getDefaultMatchStore';
import { addSpectatorSeat } from '@/lib/multiplayer/server/lobby/spectatorSeats';
import { resolveMatchCommitExpectedRevision } from '@/lib/multiplayer/server/matchCommitJournalHead';
import { mirrorMatchBatchToJournal } from '@/lib/multiplayer/server/MatchStreamJournalMirror';
import { FogAwareMatchProjectionService } from '@/lib/multiplayer/server/projection/FogAwareMatchProjection';
import { matchWireAudienceDefinition } from '@/lib/multiplayer/server/projection/MatchWireAudienceCatalog';
import { ViewerAudienceProjectorRegistry } from '@/lib/multiplayer/server/projection/ViewerAudienceProjector';
import { ViewerProjectionService } from '@/lib/multiplayer/server/projection/ViewerProjectionService';
import { ViewerProjectionError } from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';
import exportHandler from '@/pages-modules/api/matchHistoryExportRoute';
import timelineHandler from '@/pages-modules/api/matchHistoryTimelineRoute';
import privatePreviewHandler from '@/pages-modules/api/matchPrivatePreviewRoute';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  type IGameCreatedPayload,
  type IGameEvent,
} from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { encodeTokenForWire } from '@/types/multiplayer/Player';
import { deriveState } from '@/utils/gameplay/gameState';

const MATCH_ID = 'match-history-fog';
const AT = '2026-10-17T12:00:00.000Z';
const HOST_DESIGN = 'HOST-SAVED-DESIGN-SECRET';
const OPPONENT_DESIGN = 'OPPONENT-SAVED-DESIGN-SECRET';
const HOST_SLOT = 'HOST-CRIT-SLOT-SECRET';
const OPPONENT_SLOT = 'OPPONENT-CRIT-SLOT-SECRET';
const HOST_LOCK = 'HOST-ATTACK-LOCK-WITHHELD';
const OPPONENT_LOCK = 'OPPONENT-ATTACK-LOCK-WITHHELD';
const HOST_SEALED = 'HOST-SEALED-DECLARATION';
const OPPONENT_SEALED = 'OPPONENT-SEALED-DECLARATION';
const HOST_OUT_OF_LOS = 'HOST-LOCK-OUT-OF-LOS';
const HOST_IN_LOS = 'HOST-LOCK-IN-LOS';
const POST_STATE_DIGEST = 'POST-STATE-DIGEST-SERVER-ONLY';

const ID = {
  created: 'evt-created',
  moveOut: 'evt-move-out',
  lockOut: 'evt-lock-out',
  moveBack: 'evt-move-back',
  lockBack: 'evt-lock-back',
  hostLock: 'evt-attack-lock-host',
  opponentLock: 'evt-attack-lock-opponent',
  hostSealed: 'evt-sealed-host',
  opponentSealed: 'evt-sealed-opponent',
} as const;

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

interface IResult {
  statusCode: number;
  body: unknown;
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

function createdEvent(): IGameEvent {
  const baseline = JSON.parse(
    JSON.stringify(VALID_COMBAT_LIFECYCLE_EVENT_PAYLOADS.game_created),
  ) as IGameCreatedPayload;
  return {
    id: ID.created,
    gameId: MATCH_ID,
    sequence: 0,
    timestamp: AT,
    type: GameEventType.GameCreated,
    turn: 0,
    phase: GamePhase.Initiative,
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
  } as unknown as IGameEvent;
}

/**
 * The host's unit walks out of the opponent's sensor range and locks
 * (withheld from the opponent), walks back beside it and locks again
 * (delivered) - the live suite's "leaves LOS" case. Then one actor-only
 * lock and one UNREVEALED sealed attack declaration per side.
 */
function matchEvents(): readonly IGameEvent[] {
  const created = createdEvent();
  const opponentAt = deriveState(MATCH_ID, [created]).units['opponent-unit']
    .position;
  const beside = { q: opponentAt.q + 1, r: opponentAt.r };
  const far = { q: opponentAt.q + 60, r: opponentAt.r };
  const at = (
    id: string,
    sequence: number,
    phase: GamePhase,
    type: GameEventType,
    actorId: string,
    payload: Record<string, unknown>,
    visibility?: string,
  ) =>
    ({
      id,
      gameId: MATCH_ID,
      sequence,
      timestamp: AT,
      type,
      turn: 1,
      phase,
      actorId,
      ...(visibility === undefined ? {} : { visibility }),
      payload,
    }) as unknown as IGameEvent;
  const move = (id: string, sequence: number, to: object) =>
    at(
      id,
      sequence,
      GamePhase.Movement,
      GameEventType.MovementDeclared,
      'host-unit',
      {
        unitId: 'host-unit',
        from: opponentAt,
        to,
        facing: Facing.North,
        movementType: MovementType.Walk,
        mpUsed: 1,
        heatGenerated: 0,
      },
    );
  return [
    created,
    move(ID.moveOut, 1, far),
    at(
      ID.lockOut,
      2,
      GamePhase.Movement,
      GameEventType.MovementLocked,
      'host-unit',
      { unitId: 'host-unit', marker: HOST_OUT_OF_LOS },
      'observer-visible',
    ),
    move(ID.moveBack, 3, beside),
    at(
      ID.lockBack,
      4,
      GamePhase.Movement,
      GameEventType.MovementLocked,
      'host-unit',
      { unitId: 'host-unit', marker: HOST_IN_LOS },
      'observer-visible',
    ),
    at(
      ID.hostLock,
      5,
      GamePhase.WeaponAttack,
      GameEventType.AttackLocked,
      'host-unit',
      { unitId: 'host-unit', marker: HOST_LOCK },
      'actor-only',
    ),
    at(
      ID.opponentLock,
      6,
      GamePhase.WeaponAttack,
      GameEventType.AttackLocked,
      'opponent-unit',
      { unitId: 'opponent-unit', marker: OPPONENT_LOCK },
      'actor-only',
    ),
    at(
      ID.hostSealed,
      7,
      GamePhase.WeaponAttack,
      GameEventType.AttackDeclared,
      'host-unit',
      {
        attackerId: 'host-unit',
        targetId: 'opponent-unit',
        weapons: [],
        marker: HOST_SEALED,
      },
    ),
    at(
      ID.opponentSealed,
      8,
      GamePhase.WeaponAttack,
      GameEventType.AttackDeclared,
      'opponent-unit',
      {
        attackerId: 'opponent-unit',
        targetId: 'host-unit',
        weapons: [],
        marker: OPPONENT_SEALED,
      },
    ),
  ];
}

const ALL_SECRETS = [
  HOST_DESIGN,
  OPPONENT_DESIGN,
  HOST_SLOT,
  OPPONENT_SLOT,
  HOST_LOCK,
  OPPONENT_LOCK,
  HOST_SEALED,
  OPPONENT_SEALED,
  HOST_OUT_OF_LOS,
  HOST_IN_LOS,
  POST_STATE_DIGEST,
];

/** The stored mirror envelope fields the digest census mutates. */
interface ICensusEnvelope {
  readonly matchEvent: {
    readonly payload: { readonly units: IGameCreatedPayload['units'] };
  };
  readonly expectedPostStateDigest?: string | null;
}

function expectOnly(body: unknown, allowed: readonly string[]): void {
  const blob = JSON.stringify(body);
  for (const secret of ALL_SECRETS) {
    if (allowed.includes(secret)) expect(blob).toContain(secret);
    else expect(blob).not.toContain(secret);
  }
}

describe('fog of war on the HTTP match-history chain', () => {
  let dir: string;
  let store: DurableMatchStore;
  let host: IHolder;
  let opponent: IHolder;
  let spectator: IHolder;

  async function setUp(
    fogOfWar: boolean,
    options: { readonly staleSpectatorAssignment?: boolean } = {},
  ): Promise<void> {
    dir = await mkdtemp(path.join(tmpdir(), 'match-history-fog-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'history.db') }).initialize();
    host = await mintHolder('host');
    opponent = await mintHolder('opponent');
    spectator = await mintHolder('spectator');
    store = new DurableMatchStore({ path: ':memory:' });
    _setDefaultMatchStoreForTests(store);
    await store.createMatch(meta(fogOfWar, options));
    await mirrorMatchStream();
  }

  afterEach(async () => {
    store.close();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function meta(
    fogOfWar: boolean,
    options: { readonly staleSpectatorAssignment?: boolean },
  ): IMatchMeta {
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
        // A stale assignment naming the spectator for a side must not
        // outrank the spectator seat (live checks the seat first).
        {
          playerId: options.staleSpectatorAssignment
            ? spectator.playerId
            : opponent.playerId,
          side: 'opponent',
        },
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

  /** One batch per event through the production S1 mirror. */
  async function mirrorMatchStream(): Promise<void> {
    const db = getSQLiteService().getDatabase();
    for (const event of matchEvents()) {
      const mirrored = await mirrorMatchBatchToJournal(db, {
        matchId: MATCH_ID,
        commandId: `cmd-${event.id}`,
        actorId: host.playerId,
        expected: resolveMatchCommitExpectedRevision(
          db,
          MATCH_ID,
          event.sequence,
        ),
        events: [event],
        expectedPostStateDigest: POST_STATE_DIGEST,
      });
      expect(mirrored.kind).toBe('mirrored');
    }
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

  function registry(): ViewerAudienceProjectorRegistry {
    const registered = new ViewerAudienceProjectorRegistry();
    registered.register({
      ...matchWireAudienceDefinition(),
      streamType: 'match',
    });
    return registered;
  }

  async function viewerFor(holder: IHolder) {
    return new AuthorizedViewerResolver(
      new MatchSeatMembershipSource(store),
    ).resolve(mintVerifiedPrincipal(holder.playerId), MATCH_ID);
  }

  describe('fog on', () => {
    beforeEach(async () => {
      await setUp(true);
    });
    it('B14 census: a mirrored journal event digest changes with hidden payload or post-state digest alone', async () => {
      const journal = new SQLiteEventJournal<ICensusEnvelope>(
        getSQLiteService().getDatabase(),
      );
      const events = await journal.readStream({
        streamType: 'match',
        streamId: MATCH_ID,
        branchId: 'main',
        afterRevision: 0,
        limit: 1,
      });
      const stored = events[0];
      expect(stored).toBeDefined();
      expect(canonicalizeEventDigestV1(stored).digest).toBe(stored.eventDigest);
      const payload = stored.payload;
      const units = payload.matchEvent.payload.units;
      const changed = {
        ...payload,
        matchEvent: {
          ...payload.matchEvent,
          payload: {
            ...payload.matchEvent.payload,
            units: units.map((unit, index) =>
              index === 1 ? { ...unit, gunnery: unit.gunnery + 1 } : unit,
            ),
          },
        },
      };
      expect(
        canonicalizeEventDigestV1({ ...stored, payload: changed }).digest,
      ).not.toBe(stored.eventDigest);
      expect(
        canonicalizeEventDigestV1({
          ...stored,
          payload: {
            ...payload,
            expectedPostStateDigest: 'changed-hidden-state',
          },
        }).digest,
      ).not.toBe(stored.eventDigest);
    });
    it.each(['host', 'opponent', 'spectator'])(
      'B14 refuses export and private preview for %s',
      async (role) => {
        const holder =
          role === 'host' ? host : role === 'opponent' ? opponent : spectator;
        for (const result of [
          await getExport(holder),
          await getPrivatePreview(holder),
        ]) {
          expect(result.statusCode).toBe(500);
          expect(result.body).toEqual({ error: 'fog-projection-unavailable' });
          expect(JSON.stringify(result.body)).not.toMatch(
            /host-unit|opponent-unit|SAVED-DESIGN|POST-STATE|digest|gunnery/,
          );
        }
      },
    );
    it.each(['opponent', 'spectator'] as const)(
      '%s timeline carries audit rows only, never match events',
      async (who) => {
        const timeline = await getTimeline(
          who === 'opponent' ? opponent : spectator,
        );
        expect(timeline.statusCode).toBe(200);
        expectOnly(timeline.body, []);
        const blob = JSON.stringify(timeline.body);
        expect(blob).not.toContain('customUnitDefinition');
        expect(blob).not.toContain('criticalSlotManifest');
      },
    );
    it('B14 policy throws before journal projection for admitted viewer', async () => {
      const service = new FogAwareMatchProjectionService({
        journal: new SQLiteEventJournal(getSQLiteService().getDatabase()),
        registry: registry(),
        matchMeta: store,
        seatMembership: new MatchSeatMembershipSource(store),
        heads: {
          branches: new SQLiteEventHistoryBranchStore(
            getSQLiteService().getDatabase(),
          ),
          readEffectiveStreamHead: () => ({ branchId: 'main', revision: 1 }),
        },
      });
      await expect(
        service.projectWithIdentities(await viewerFor(host), {
          streamType: 'match',
          streamId: MATCH_ID,
        }),
      ).rejects.toMatchObject({ message: 'fog-projection-unavailable' });
    });
    it('B14 membership precedes fog policy: no seat or seat failure discloses no fog', async () => {
      const db = getSQLiteService().getDatabase();
      const build = (
        lookupMembership: () => Promise<null>,
      ): FogAwareMatchProjectionService =>
        new FogAwareMatchProjectionService({
          journal: new SQLiteEventJournal(db),
          registry: registry(),
          matchMeta: store,
          seatMembership: {
            lookupMembership,
            currentMembershipRevision: async () => 0,
          },
          heads: {
            branches: new SQLiteEventHistoryBranchStore(db),
            readEffectiveStreamHead: () => ({ branchId: 'main', revision: 1 }),
          },
        });
      const request = { streamType: 'match', streamId: MATCH_ID } as const;
      const absent = await build(async () => null)
        .project(await viewerFor(opponent), request)
        .catch((error: unknown) => error);
      expect(absent).toMatchObject({
        code: 'wrong-session',
        message: 'Authorization refused',
      });
      const failed = await build(async () => {
        throw new Error('private-seat-secret');
      })
        .project(await viewerFor(opponent), request)
        .catch((error: unknown) => error);
      expect(failed).toBeInstanceOf(ViewerProjectionError);
      expect((failed as ViewerProjectionError).code).toBe('projection-failed');
      expect(JSON.stringify([absent, failed, String(failed)])).not.toMatch(
        /fog|private-seat/,
      );
    });
  });

  describe('fog off', () => {
    beforeEach(async () => {
      await setUp(false);
    });

    it('B14 known-off configuration needs no projection-head metadata; unknown configuration refuses', async () => {
      const db = getSQLiteService().getDatabase();
      const m = await store.getMatchMeta(MATCH_ID);
      const deps = {
        journal: new SQLiteEventJournal(db),
        registry: registry(),
        seatMembership: new MatchSeatMembershipSource(store),
        heads: {
          branches: new SQLiteEventHistoryBranchStore(db),
          readEffectiveStreamHead: () => {
            throw Error('projection metadata unavailable');
          },
        },
      };
      const knownOff = new FogAwareMatchProjectionService({
        ...deps,
        matchMeta: {
          getMatchMeta: async () => ({ config: m.config }) as IMatchMeta,
        },
      });
      await expect(
        knownOff.project(await viewerFor(host), {
          streamType: 'match',
          streamId: MATCH_ID,
        }),
      ).resolves.toBeDefined();
      const unknown = new FogAwareMatchProjectionService({
        ...deps,
        matchMeta: {
          getMatchMeta: async () => {
            throw Error('unknown');
          },
        },
      });
      await expect(
        unknown.project(await viewerFor(host), {
          streamType: 'match',
          streamId: MATCH_ID,
        }),
      ).rejects.toMatchObject({ message: 'fog-projection-unavailable' });
    });
    it('every viewer gets exactly the parent projection, unchanged', async () => {
      const db = getSQLiteService().getDatabase();
      const plain = new ViewerProjectionService({
        journal: new SQLiteEventJournal(db, () => AT),
        registry: registry(),
      });
      for (const holder of [host, opponent, spectator]) {
        const exported = await getExport(holder);
        expect(exported.statusCode).toBe(200);
        const expected = await plain.project(await viewerFor(holder), {
          streamType: 'match',
          streamId: MATCH_ID,
        });
        expect((exported.body as { stream: unknown }).stream).toEqual(
          JSON.parse(JSON.stringify(expected)),
        );
      }
    });
  });
});

/**
 * B14 legacy-filter availability seam: only the registered suites may mock
 * the capability module, each with the canonical comment and overrides.
 * B14-0A owns the first four; B14-0B adds the rest; B14-0 pins equality.
 */
const B14_SEAM_ALLOWLIST: Readonly<Record<string, 'B14-0A' | 'B14-0B'>> = {
  'src/lib/multiplayer/server/__tests__/CoopOpponentDriver.test.ts': 'B14-0A',
  'src/lib/multiplayer/server/__tests__/customCombatRecovery.recoveryDelivery.test.ts':
    'B14-0A',
  'src/lib/multiplayer/server/__tests__/customConstructionTransport.test.ts':
    'B14-0A',
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.fogOfWarIntegration.test.ts':
    'B14-0A',
  'src/lib/multiplayer/server/__tests__/viewerFrameRawNegativeSweep.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindLiveReplay.test.ts':
    'B14-0B',
  'src/lib/multiplayer/__tests__/clientAgainstFogServer.integration.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/viewerFrameAuthorityFieldLeak.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/ServerMatchHostCommandResults.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/viewerSequenceConcealmentLeak.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/matchmaking.integration.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/viewerDeliverySequence.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.spectator.test.ts':
    'B14-0B',
  'src/lib/multiplayer/server/__tests__/fogViewerSequenceSparsity.test.ts':
    'B14-0B',
};

describe('B14 legacy-filter seam allowlist', () => {
  const repo = path.resolve(__dirname, '../../../..');
  const mocksCapability =
    /jest\.(?:mock|doMock|unstable_mockModule|setMock)\(\s*['"`][^'"`]*fogMatchAdmission['"`]/;
  function suitesMockingCapability(): string[] {
    const found: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (
          /\.(test|spec)\.tsx?$/.test(entry.name) &&
          mocksCapability.test(readFileSync(full, 'utf8'))
        )
          found.push(path.relative(repo, full).split(path.sep).join('/'));
      }
    };
    walk(path.join(repo, 'src'));
    return found.sort();
  }

  it('confines the capability mock to registered suites with the canonical seam', () => {
    const found = suitesMockingCapability();
    expect(found.filter((file) => !(file in B14_SEAM_ALLOWLIST))).toEqual([]);
    for (const file of found) {
      const text = readFileSync(path.join(repo, file), 'utf8');
      expect(text).toContain(
        '// B14 seam: this suite pins the existing per-viewer fog filter beneath the',
      );
      expect(text).toContain('noPerViewerRevealProjection: () => false,');
      expect(text).toContain('matchLacksRevealProjection: async () => false,');
    }
    // B14-0A lands its four seams; B14-0B's land with B14-0B.
    expect(
      Object.entries(B14_SEAM_ALLOWLIST)
        .filter(([, unit]) => unit === 'B14-0A')
        .map(([file]) => file)
        .filter((file) => !found.includes(file)),
    ).toEqual([]);
  });
});
