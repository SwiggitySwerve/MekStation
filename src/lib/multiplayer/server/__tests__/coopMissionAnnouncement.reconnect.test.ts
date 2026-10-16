import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { readParticipantDeliveryCursor } from '@/lib/campaign/delivery/participantDeliveryCursor';
import { signCampaignGrantToken } from '@/lib/campaign/grants/campaignGrantToken';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { generateKeyPair, toBase64 } from '@/services/vault/IdentityService';
import {
  CampaignApplicationServerMessageSchema,
  ServerMessageSchema,
} from '@/types/multiplayer/Protocol';

import type { ICampaignHostRegistryEntry } from '../CampaignHostRegistry';

import * as participation from '../authorizeCampaignParticipation';
import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import {
  createCampaignGrantChannelDepsFromSqlite,
  createCampaignReplicaStoreFromSqlite,
} from '../campaignGrantChannelDeps';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '../CampaignHostRegistry';
import { createCampaignSessionMembershipPort } from '../campaignSessionMembershipPort';
import { RESYNC_SNAPSHOT_GAP } from '../CampaignSyncSession';
import * as grantAck from '../handleCampaignGrantAck';
import * as grantJoin from '../handleCampaignGrantJoin';
import { MAX_BUFFERED_BYTES } from '../ServerMatchBroadcaster';
import {
  framesOf,
  grantJoinEnvelope,
  quietLogger,
} from './campaignGrantChannel.test-helpers';
import {
  LAUNCH,
  launches,
  nextFrame,
  ObservedSocket,
  openAnnouncementFixture,
} from './coopMissionAnnouncement.harness';
import {
  acceptFixtureParticipation,
  missionRequest,
} from './coopMissionCreate.fixture';

// Preserve the real implementations while allowing completion observers on
// SWC's otherwise non-configurable module exports. No delivery is mocked.
jest.mock('../authorizeCampaignParticipation', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('../authorizeCampaignParticipation')>(
    '../authorizeCampaignParticipation',
  ),
}));
jest.mock('../handleCampaignGrantJoin', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('../handleCampaignGrantJoin')>(
    '../handleCampaignGrantJoin',
  ),
}));
jest.mock('../handleCampaignGrantAck', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('../handleCampaignGrantAck')>(
    '../handleCampaignGrantAck',
  ),
}));

const SECRET = 'PRIVATE-PILOT-SENTINEL';
const signal = () => ({ signal: AbortSignal.timeout(10000) });
type Path = 'member' | 'room-new' | 'room-retained' | 'fallback';

// A deadline only bounds a missing signal; it never schedules test progress.
async function bounded<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('missing barrier signal')),
          10000,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

describe('durable mission launch reconnect', () => {
  let fixture: Awaited<ReturnType<typeof openAnnouncementFixture>>;
  const sockets: ObservedSocket[] = [];
  const signals = new EventEmitter();

  beforeEach(async () => {
    fixture = await openAnnouncementFixture();
    const capture = participation.captureCampaignConnectionBaseline;
    jest
      .spyOn(participation, 'captureCampaignConnectionBaseline')
      .mockImplementation((socket, baseline) => {
        capture(socket, baseline);
        // This is the binder's completed join, AFTER replay and buffer release.
        if (socket instanceof ObservedSocket) socket.emit('joined');
      });
    const join = grantJoin.handleCampaignGrantJoin;
    jest
      .spyOn(grantJoin, 'handleCampaignGrantJoin')
      .mockImplementation(async (deps) => {
        await join(deps);
        signals.emit('grant-joined');
      });
    const ack = grantAck.handleCampaignGrantAck;
    jest
      .spyOn(grantAck, 'handleCampaignGrantAck')
      .mockImplementation(async (deps) => {
        const result = await ack(deps);
        signals.emit('grant-acked', result);
        return result;
      });
  });

  afterEach(async () => {
    sockets.splice(0).forEach((socket) => socket.close());
    jest.restoreAllMocks();
    await fixture.close();
    signals.removeAllListeners();
  });

  const channel = () =>
    createCampaignGrantChannelDepsFromSqlite({
      clock: () => new Date().toISOString(),
      nowIso: () => new Date().toISOString(),
      nowMs: () => Date.now(),
    });

  async function privateHistory(entry = fixture.entry) {
    const host = entry.host;
    await host._commitEventsForTests([
      {
        type: 'PilotHired',
        campaignId: host.campaignId,
        ts: new Date().toISOString(),
        authorPlayerId: fixture.host.playerId,
        scope: 'gm',
        payload: { pilot: { pilotId: SECRET, name: SECRET }, cost: 0 },
      },
      {
        type: 'CampaignSnapshotPublished',
        campaignId: host.campaignId,
        ts: new Date().toISOString(),
        authorPlayerId: fixture.host.playerId,
        scope: 'campaign',
        payload: {
          state: {
            ...host.getState(),
            pilots: { [SECRET]: { pilotId: SECRET, name: SECRET } },
          },
        },
      },
    ]);
  }

  async function createMission(entry = fixture.entry, missionId = 'mission-1') {
    acceptFixtureParticipation(entry, fixture.contributors, missionId);
    const matchId = await fixture.create(missionRequest(entry, missionId));
    const meta = await fixture.store.getMatchMeta(matchId);
    assert.ok(meta.coopMission);
    const event = (await entry.host.getEventLog().getCampaignEvents(0)).find(
      (row): row is ICampaignEvent<'CampaignMissionLaunched'> =>
        row.type === LAUNCH && row.payload.missionMatchId === matchId,
    );
    assert.ok(event);
    expect(event.payload).toEqual({
      missionId,
      missionMatchId: matchId,
      acceptedHead: meta.coopMission.acceptedHead,
      deployingPlayerIds: meta.coopMission.deployingPlayerIds,
    });
    return event;
  }

  async function reopen() {
    sockets.forEach((socket) => socket.close());
    const prior = getCampaignHostRegistry();
    _resetCampaignHostRegistry();
    const registry = getCampaignHostRegistry();
    expect(registry).not.toBe(prior);
    const entry = await registry.getOrCreate(fixture.entry.matchId);
    assert.ok(entry);
    expect(entry.host).not.toBe(fixture.entry.host);
    expect(entry.syncSession.isPaused()).toBe(true);
    expect(
      createCampaignSessionMembershipPort().isActive(
        entry.campaignId,
        entry.matchId,
        fixture.guest.playerId,
      ),
    ).toBe(true);
    return entry;
  }

  async function bind(fallback = false) {
    const socket = new ObservedSocket();
    sockets.push(socket);
    await bindCampaignSyncConnection({
      socket,
      registry: getCampaignHostRegistry(),
      matchId: fixture.entry.matchId,
      verifiedPlayerId: fixture.guest.playerId,
      logger: quietLogger,
      membership: createCampaignSessionMembershipPort(),
      ...(fallback ? { grantChannel: null, replicaStore: null } : {}),
    });
    return socket;
  }

  function startJoin(socket: ObservedSocket, lastSeq?: number) {
    const ready = once(socket, 'joined', signal());
    socket.inbound({
      kind: 'CampaignJoin',
      matchId: fixture.entry.matchId,
      ts: new Date().toISOString(),
      playerId: fixture.guest.playerId,
      role: 'guest',
      roomCode: fixture.entry.roomCode ?? undefined,
      ...(lastSeq === undefined ? {} : { lastSeq }),
    });
    return ready;
  }

  async function census(entry: ICampaignHostRegistryEntry) {
    const history = await entry.host.getEventLog().getCampaignEvents(0);
    const batches = getSQLiteService()
      .getDatabase()
      .prepare(
        "SELECT * FROM event_journal_batches WHERE stream_type = 'campaign' AND stream_id = ? ORDER BY command_id",
      )
      .all(entry.campaignId);
    return {
      history,
      batches,
      matches: (await fixture.store.listMatches()).length,
    };
  }

  async function evidence(
    row: string,
    socket: ObservedSocket,
    entry: ICampaignHostRegistryEntry,
    before: Awaited<ReturnType<typeof census>>,
  ) {
    const after = await census(entry);
    process.stdout.write(
      JSON.stringify({ row, frames: socket.sent, before, after }) + '\n',
    );
    expect(after).toEqual(before);
    expect(JSON.stringify(socket.sent)).not.toContain(SECRET);
    expect(
      socket.sent.every(
        (frame) => ServerMessageSchema.safeParse(frame).success,
      ),
    ).toBe(true);
    const snapshots = framesOf(socket, 'CampaignSnapshot');
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].event.sequence).toBe(-1);
    expect(JSON.stringify(before.history)).toContain(SECRET);
  }

  async function livePrivacy(
    socket: ObservedSocket,
    entry: ICampaignHostRegistryEntry,
  ) {
    const snapshots = framesOf(socket, 'CampaignSnapshot').length;
    const observed = nextFrame(socket, 'ParticipantRemoved');
    await entry.host._commitEventsForTests([
      {
        type: 'CampaignSnapshotPublished',
        campaignId: entry.campaignId,
        ts: new Date().toISOString(),
        authorPlayerId: fixture.host.playerId,
        scope: 'campaign',
        payload: { state: entry.host.getState() },
      },
      {
        type: 'ParticipantRemoved',
        campaignId: entry.campaignId,
        ts: new Date().toISOString(),
        authorPlayerId: fixture.host.playerId,
        scope: 'campaign',
        payload: { participantId: 'privacy-completion-marker' },
      },
    ]);
    await observed;
    expect(framesOf(socket, 'CampaignSnapshot')).toHaveLength(snapshots);
    expect(JSON.stringify(socket.sent)).not.toContain(SECRET);
  }

  async function preparePath(path: Path) {
    const entry = await reopen();
    if (path === 'member') {
      const gm = await fixture.join(getCampaignHostRegistry(), fixture.host);
      sockets.push(gm);
      expect(entry.syncSession.isPaused()).toBe(false);
    }
    return entry;
  }

  async function seedReplica() {
    await reopen();
    const socket = await bind();
    await startJoin(socket);
    socket.close();
    const grant = channel().projectDeps.grantStore.listGrants(
      fixture.entry.campaignId,
    )[0];
    assert.ok(grant);
    const replica = createCampaignReplicaStoreFromSqlite(() =>
      new Date().toISOString(),
    );
    expect(
      await replica.lastCursor(grant.campaignId, grant.grantId),
    ).not.toBeNull();
  }

  it('member: the actual live launch is replayed after an independent cold authority rebuild', async () => {
    await privateHistory();
    const live = await fixture.join();
    sockets.push(live);
    const observedLive = nextFrame(live);
    const event = await createMission();
    await observedLive;
    expect(launches(live).map((frame) => frame.event)).toEqual([event]);
    // A later full checkpoint must not become a vehicle for the linkage.
    await privateHistory();
    const entry = await preparePath('member');
    const before = await census(entry);
    const socket = await bind();
    const launch = nextFrame(socket).then(
      () => null,
      (error: unknown) => error,
    );
    await startJoin(socket);
    await evidence('member-cold', socket, entry, before);
    expect(await launch).toBeNull();
    expect(launches(socket).map((frame) => frame.event)).toEqual([event]);
    expect(await fixture.census(event.payload.missionMatchId)).toEqual({
      matches: 2,
      events: 1,
      receipts: 1,
    });
    await livePrivacy(socket, entry);
  });

  it.each(['room-new', 'room-retained'] as const)(
    '%s: guest-before-GM reaches room-code hydration with durable membership intact',
    async (path) => {
      await privateHistory();
      if (path === 'room-retained') await seedReplica();
      const source = getCampaignHostRegistry().get(fixture.entry.matchId)!;
      const event = await createMission(source);
      const entry = await preparePath(path);
      const before = await census(entry);
      const socket = await bind();
      const launch = nextFrame(socket).then(
        () => null,
        (error: unknown) => error,
      );
      await startJoin(socket);
      await evidence(path, socket, entry, before);
      expect(entry.syncSession.isPaused()).toBe(true);
      expect(await launch).toBeNull();
      expect(launches(socket).map((frame) => frame.event)).toEqual([event]);
      const grant = channel().projectDeps.grantStore.listGrants(
        entry.campaignId,
      )[0];
      expect(
        await createCampaignReplicaStoreFromSqlite(() =>
          new Date().toISOString(),
        ).lastCursor(entry.campaignId, grant.grantId),
      ).not.toBeNull();
      await livePrivacy(socket, entry);
    },
  );

  it.each([
    ['member', 'before-read'],
    ['member', 'after-read'],
    ['room-new', 'before-read'],
    ['room-new', 'after-read'],
    ['room-retained', 'before-read'],
    ['room-retained', 'after-read'],
    ['fallback', 'before-read'],
    ['fallback', 'after-read'],
  ] as const)(
    '%s race: pre-cut launch and append during hydration (%s) each arrive once',
    async (path, timing) => {
      await privateHistory();
      if (path === 'room-retained') await seedReplica();
      let source = getCampaignHostRegistry().get(fixture.entry.matchId)!;
      const first = await createMission(source);
      if (path === 'fallback') {
        await source.host._commitEventsForTests(
          Array.from({ length: RESYNC_SNAPSHOT_GAP + 1 }, (_, index) => ({
            type: 'ParticipantRemoved' as const,
            campaignId: source.campaignId,
            ts: new Date().toISOString(),
            authorPlayerId: fixture.host.playerId,
            scope: 'campaign' as const,
            payload: { participantId: `historical-${index}` },
          })),
        );
      }
      source = await preparePath(path);
      acceptFixtureParticipation(source, fixture.contributors, 'mission-2');
      const request = missionRequest(source, 'mission-2');
      const log = source.host.getEventLog();
      const read = log.getCampaignEvents.bind(log);
      const entered = Promise.withResolvers<void>();
      const release = Promise.withResolvers<void>();
      let holding = true;
      const spy = jest
        .spyOn(log, 'getCampaignEvents')
        .mockImplementation(async (from = 0) => {
          if (from !== 0 || !holding) return read(from);
          const captured =
            timing === 'after-read' ? await read(from) : undefined;
          entered.resolve();
          await bounded(release.promise);
          return captured ?? read(from);
        });
      const socket = await bind(path === 'fallback');
      const launch = nextFrame(socket).then(
        () => null,
        (error: unknown) => error,
      );
      const joined = startJoin(socket, path === 'fallback' ? 0 : undefined);
      try {
        await bounded(entered.promise);
        const matchId = await fixture.create(request);
        const second = (await read(0)).find(
          (event) =>
            event.type === LAUNCH && event.payload.missionMatchId === matchId,
        );
        assert.ok(second);
        holding = false;
        const before = await census(source);
        release.resolve();
        await joined;
        spy.mockRestore();
        await evidence(`${path}-${timing}`, socket, source, before);
        expect(await launch).toBeNull();
        expect(launches(socket).map((frame) => frame.event)).toEqual([
          first,
          second,
        ]);
        // Arbitrary no-op history must NOT be replayed over the safe baseline.
        expect(
          framesOf(socket, 'CampaignEvent').every(
            (frame) => frame.event.type === LAUNCH,
          ),
        ).toBe(true);
        const head = (await log.nextSequence()) - 1;
        const ack = source.syncSession.noteParticipantAcknowledged(
          fixture.guest.playerId,
          head,
        );
        expect(ack).not.toBe('ahead-of-delivery');
        await livePrivacy(socket, source);
        expect(launches(socket)).toHaveLength(2);
      } finally {
        holding = false;
        release.resolve();
        await joined;
        spy.mockRestore();
      }
    },
  );

  it('room-code covers an append between joinHead and live attachment using the history read frontier', async () => {
    await privateHistory();
    const entry = await preparePath('room-new');
    acceptFixtureParticipation(entry, fixture.contributors);
    const request = missionRequest(entry);
    const log = entry.host.getEventLog();
    const next = log.nextSequence.bind(log);
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const spy = jest
      .spyOn(log, 'nextSequence')
      .mockImplementationOnce(async () => {
        const head = await next();
        entered.resolve();
        await bounded(release.promise);
        return head;
      });
    const socket = await bind();
    const launch = nextFrame(socket).then(
      () => null,
      (error: unknown) => error,
    );
    const joined = startJoin(socket);
    try {
      await bounded(entered.promise);
      const matchId = await fixture.create(request);
      const before = await census(entry);
      release.resolve();
      await joined;
      await evidence('room-joinHead-gap', socket, entry, before);
      expect(await launch).toBeNull();
      expect(launches(socket).map((frame) => frame.event.payload)).toEqual([
        expect.objectContaining({ missionMatchId: matchId }),
      ]);
    } finally {
      release.resolve();
      await joined;
      spy.mockRestore();
    }
  });

  it('adapter-unavailable large-gap resync replays launches without lowering its settled delivery watermark', async () => {
    await privateHistory();
    const event = await createMission();
    await fixture.entry.host._commitEventsForTests(
      Array.from({ length: RESYNC_SNAPSHOT_GAP + 1 }, (_, index) => ({
        type: 'ParticipantRemoved' as const,
        campaignId: fixture.entry.campaignId,
        ts: new Date().toISOString(),
        authorPlayerId: fixture.host.playerId,
        scope: 'campaign' as const,
        payload: { participantId: `gap-${index}` },
      })),
    );
    const entry = await preparePath('fallback');
    entry.syncSession.retainHydratedParticipant(fixture.guest.playerId, 0);
    const socket = await bind(true);
    const before = await census(entry);
    const launch = nextFrame(socket).then(
      () => null,
      (error: unknown) => error,
    );
    await startJoin(socket, 0);
    await evidence('fallback-large', socket, entry, before);
    expect(await launch).toBeNull();
    expect(launches(socket).map((frame) => frame.event)).toEqual([event]);
    expect(
      entry.syncSession.noteParticipantAcknowledged(
        fixture.guest.playerId,
        before.history.at(-1)!.sequence,
      ),
    ).toBe('applied');
    await livePrivacy(socket, entry);
  });

  it('small-gap cursor resync streams a missing launch, but never replays an acknowledged launch', async () => {
    await privateHistory();
    const event = await createMission();
    const entry = await preparePath('fallback');
    const before = await census(entry);
    for (const lastSeq of [event.sequence - 1, event.sequence]) {
      const socket = await bind(true);
      const launch = lastSeq < event.sequence ? nextFrame(socket) : null;
      await startJoin(socket, lastSeq);
      if (launch) await launch;
      expect(framesOf(socket, 'CampaignSnapshot')).toHaveLength(0);
      expect(launches(socket).map((frame) => frame.event)).toEqual(
        lastSeq < event.sequence ? [event] : [],
      );
      expect(JSON.stringify(socket.sent)).not.toContain(SECRET);
      socket.close();
    }
    expect(await census(entry)).toEqual(before);
  });

  it('grant channel: fresh and zero cursors receive real projected linkage; acknowledged resume does not duplicate it', async () => {
    await privateHistory();
    const event = await createMission();
    const entry = await reopen();
    const deps = channel();
    const keys = await generateKeyPair();
    const signer = {
      publicKey: toBase64(keys.publicKey),
      privateKey: toBase64(keys.privateKey),
    };
    const grant = deps.projectDeps.grantStore.issueGrant({
      campaignId: entry.campaignId,
      participantId: fixture.guest.playerId,
      issuerPublicKey: signer.publicKey,
      scopes: ['campaign'],
      issuedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
    const token = await signCampaignGrantToken(grant, signer);
    const before = await census(entry);
    const join = async (
      cursor: { deliveryEpochId: string; afterSequence: number } | null,
    ) => {
      const socket = await bind();
      const delivery = nextFrame(socket, 'CampaignGrantDelivery');
      const completed = once(signals, 'grant-joined', signal());
      socket.inbound(
        grantJoinEnvelope({
          campaignId: entry.campaignId,
          matchId: entry.matchId,
          grantId: grant.grantId,
          playerId: fixture.guest.playerId,
          token,
          cursor,
        }),
      );
      await Promise.all([delivery, completed]);
      const frames = framesOf(socket, 'CampaignGrantDelivery');
      frames.forEach((frame) =>
        expect(ServerMessageSchema.parse(frame)).toEqual(frame),
      );
      expect(JSON.stringify(socket.sent)).not.toContain(SECRET);
      return { socket, frames, items: frames.flatMap((frame) => frame.items) };
    };
    const first = await join(null);
    const expected = { ...event };
    const { sequence: _sequence, ...projected } = expected;
    expect(
      first.items
        .filter((item) => item.event.type === LAUNCH)
        .map((item) => item.event),
    ).toEqual([projected]);
    const epoch = first.frames[0].deliveryEpochId;
    const ackedSequence = first.items.at(-1)!.deliverySequence;
    const acked = once(signals, 'grant-acked', signal());
    first.socket.inbound({
      kind: 'CampaignGrantAck',
      matchId: entry.matchId,
      ts: new Date().toISOString(),
      playerId: fixture.guest.playerId,
      campaignId: entry.campaignId,
      grantId: grant.grantId,
      deliveryEpochId: epoch,
      ackedSequence,
    });
    expect((await acked)[0]).toMatchObject({ kind: 'applied' });
    expect(
      readParticipantDeliveryCursor(getSQLiteService().getDatabase(), grant),
    ).toMatchObject({ ackedSequence });
    first.socket.close();
    const resumed = await join(null);
    expect(resumed.items).toEqual([]);
    resumed.socket.close();
    const zero = await join({ deliveryEpochId: epoch, afterSequence: 0 });
    expect(
      zero.items
        .filter((item) => item.event.type === LAUNCH)
        .map((item) => item.event),
    ).toEqual([projected]);
    expect(await census(entry)).toEqual(before);
    const afterLive = nextFrame(zero.socket, 'CampaignGrantDelivery');
    await entry.host._commitEventsForTests([
      {
        type: 'CampaignSnapshotPublished',
        campaignId: entry.campaignId,
        ts: new Date().toISOString(),
        authorPlayerId: fixture.host.playerId,
        scope: 'campaign',
        payload: { state: entry.host.getState() },
      },
      {
        type: 'ParticipantRemoved',
        campaignId: entry.campaignId,
        ts: new Date().toISOString(),
        authorPlayerId: fixture.host.playerId,
        scope: 'campaign',
        payload: { participantId: 'grant-privacy-completion' },
      },
    ]);
    await afterLive;
    expect(JSON.stringify(zero.socket.sent)).not.toContain(SECRET);
    process.stdout.write(
      JSON.stringify({
        row: 'grant-cursors',
        first: first.socket.sent,
        resumed: resumed.socket.sent,
        zero: zero.socket.sent,
        before,
      }) + '\n',
    );
  });

  it.each(['out-of-scope', 'foreign-campaign'] as const)(
    'grant channel %s receives no mission linkage',
    async (control) => {
      await privateHistory();
      await createMission();
      const entry = await reopen();
      const deps = channel();
      const keys = await generateKeyPair();
      const signer = {
        publicKey: toBase64(keys.publicKey),
        privateKey: toBase64(keys.privateKey),
      };
      const grant = deps.projectDeps.grantStore.issueGrant({
        campaignId:
          control === 'foreign-campaign' ? 'other-campaign' : entry.campaignId,
        participantId: fixture.guest.playerId,
        issuerPublicKey: signer.publicKey,
        scopes:
          control === 'out-of-scope'
            ? [`player:${fixture.guest.playerId}`]
            : ['campaign'],
        issuedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
      });
      const token = await signCampaignGrantToken(grant, signer);
      const socket = await bind();
      const completed = once(signals, 'grant-joined', signal());
      socket.inbound(
        grantJoinEnvelope({
          campaignId: grant.campaignId,
          matchId: entry.matchId,
          grantId: grant.grantId,
          playerId: fixture.guest.playerId,
          token,
          cursor: null,
        }),
      );
      await completed;
      socket.sent.forEach((frame) =>
        expect(ServerMessageSchema.parse(frame)).toEqual(frame),
      );
      expect(
        framesOf(socket, 'CampaignGrantDelivery').flatMap(
          (frame) => frame.items,
        ),
      ).toEqual([]);
      expect(launches(socket)).toEqual([]);
      expect(JSON.stringify(socket.sent)).not.toContain(SECRET);
      if (control === 'out-of-scope')
        expect(framesOf(socket, 'CampaignGrantDelivery')).toHaveLength(1);
      else
        expect(framesOf(socket, 'Error')[0]).toMatchObject({
          code: 'AUTH_REJECTED',
        });
      process.stdout.write(
        JSON.stringify({ row: control, frames: socket.sent }) + '\n',
      );
    },
  );

  /**
   * P2CE2: socket offers over one same-cut viewer-safe public bundle, each
   * established only by a confirmed write. Real SQLite and verified journal;
   * the only double is a callback-aware socket whose write completion the
   * test controls. No receipt ACK or P2CA commit exists yet (P2CE3).
   */
  describe('application offers (P2CE2)', () => {
    type SendCallback = (error?: Error) => void;
    class ReceiptSocket extends ObservedSocket {
      mode: 'auto' | 'hold' | 'fail' = 'auto';
      readonly held: SendCallback[] = [];
      bufferedAmount = 0;
      override send(data: string, onSent?: SendCallback): void {
        super.send(data);
        if (!onSent) return;
        if (this.mode === 'hold') {
          this.held.push(onSent);
          return;
        }
        const error = this.mode === 'fail' ? new Error('write failed') : null;
        queueMicrotask(() => onSent(error ?? undefined));
      }
    }
    type Offer = {
      kind: string;
      event: ICampaignEvent;
      appliedView: {
        viewId: string;
        receiptId: string;
        previousReceiptId: string | null;
      };
      hydrationFacts?: ICampaignEvent[];
    };
    type Player = { readonly playerId: string };
    const newcomer: Player = { playerId: 'pid-room-newcomer' };

    const db = () => getSQLiteService().getDatabase();
    const offers = (socket: ReceiptSocket): Offer[] =>
      socket.sent.filter(
        (frame) =>
          (frame.kind === 'CampaignSnapshot' ||
            frame.kind === 'CampaignEvent') &&
          frame.appliedView !== undefined,
      ) as unknown as Offer[];

    async function bindReceipts(
      player: Player,
      ports: {
        membership?: boolean;
        receipts?: boolean;
        adapters?: boolean;
      } = {},
    ) {
      const socket = new ReceiptSocket();
      sockets.push(socket);
      await bindCampaignSyncConnection({
        socket,
        registry: getCampaignHostRegistry(),
        matchId: fixture.entry.matchId,
        verifiedPlayerId: player.playerId,
        logger: quietLogger,
        ...(ports.membership === false
          ? {}
          : { membership: createCampaignSessionMembershipPort() }),
        ...(ports.receipts === false
          ? {}
          : { applicationReceipts: { database: db } }),
        ...(ports.adapters === false
          ? { grantChannel: null, replicaStore: null }
          : {}),
      });
      return socket;
    }

    function joinMessage(player: Player, lastSeq?: number) {
      return {
        kind: 'CampaignJoin',
        matchId: fixture.entry.matchId,
        ts: new Date().toISOString(),
        playerId: player.playerId,
        role: player.playerId === fixture.host.playerId ? 'host' : 'guest',
        roomCode: fixture.entry.roomCode ?? undefined,
        ...(lastSeq === undefined ? {} : { lastSeq }),
      } as const;
    }

    async function joinReceipts(
      player: Player,
      ports?: Parameters<typeof bindReceipts>[1],
    ) {
      const socket = await bindReceipts(player, ports);
      const joined = once(socket, 'joined', signal());
      socket.inbound(joinMessage(player));
      await joined;
      return socket;
    }

    /** Commit, then wait for each named socket's next delta. */
    async function commitSeenBy(
      recipients: ReceiptSocket[],
      events: Parameters<typeof fixture.entry.host._commitEventsForTests>[0],
    ) {
      const seen = recipients.map((socket) =>
        once(socket, 'CampaignEvent', signal()),
      );
      await fixture.entry.host._commitEventsForTests(events);
      await Promise.all(seen);
    }

    const visibleFunds = (reason: string) => ({
      type: 'FundsChanged' as const,
      campaignId: fixture.entry.campaignId,
      ts: new Date().toISOString(),
      authorPlayerId: fixture.host.playerId,
      scope: 'campaign' as const,
      payload: { delta: 0, reason, balance: 7 },
    });
    const hiddenFunds = (reason: string) => ({
      ...visibleFunds(reason),
      scope: 'gm' as const,
    });

    it('hydrates GM, returning member and room-code newcomer from one viewer-safe public bundle, each on its own view', async () => {
      await privateHistory();
      const launch = await createMission();
      const gm = await joinReceipts(fixture.host);
      const member = await joinReceipts(fixture.guest);
      const joiner = await joinReceipts(newcomer);

      const views = new Set<string>();
      for (const socket of [gm, member, joiner]) {
        socket.sent.forEach((frame) =>
          expect(
            CampaignApplicationServerMessageSchema.safeParse(frame).success,
          ).toBe(true),
        );
        // The one public bundle: no legacy replay or launch frames.
        expect(framesOf(socket, 'CampaignEvent')).toEqual([]);
        expect(offers(socket)).toHaveLength(1);
        const [snapshot] = offers(socket);
        expect(snapshot.kind).toBe('CampaignSnapshot');
        expect(snapshot.event.sequence).toBe(-1);
        expect(snapshot.appliedView.previousReceiptId).toBeNull();
        expect(snapshot.hydrationFacts).toEqual([launch]);
        // No public journal position rides the baseline.
        expect(snapshot.event.payload).not.toHaveProperty('revision');
        views.add(snapshot.appliedView.viewId);
      }
      expect(views.size).toBe(3);
      expect(JSON.stringify(gm.sent)).toContain(SECRET);
      expect(JSON.stringify(member.sent)).not.toContain(SECRET);
      expect(JSON.stringify(joiner.sent)).not.toContain(SECRET);
      // Both join paths reach the same viewer-safe state.
      expect(offers(joiner)[0].event.payload).toEqual(
        offers(member)[0].event.payload,
      );
      expect(
        createCampaignSessionMembershipPort().isActive(
          fixture.entry.campaignId,
          fixture.entry.matchId,
          newcomer.playerId,
        ),
      ).toBe(true);

      // A returning member's new connection mints a new view.
      member.close();
      const returning = await joinReceipts(fixture.guest);
      const [rebaseline] = offers(returning);
      expect(views.has(rebaseline.appliedView.viewId)).toBe(false);
      expect(rebaseline.appliedView.previousReceiptId).toBeNull();
      expect(rebaseline.hydrationFacts).toEqual([launch]);
      expect(JSON.stringify(returning.sent)).not.toContain(SECRET);
    });

    it('links each newly visible delta to the latest established offer and withholds hidden progress', async () => {
      await privateHistory();
      const gm = await joinReceipts(fixture.host);
      const guest = await joinReceipts(fixture.guest);

      await commitSeenBy([gm], [hiddenFunds(SECRET)]);
      await commitSeenBy([gm, guest], [visibleFunds('first-visible')]);
      await commitSeenBy([gm, guest], [visibleFunds('second-visible')]);

      const [baseline, ...deltas] = offers(guest);
      expect(deltas.map((offer) => offer.event.payload)).toEqual([
        expect.objectContaining({ reason: 'first-visible' }),
        expect.objectContaining({ reason: 'second-visible' }),
      ]);
      expect(deltas.map((offer) => offer.appliedView)).toEqual([
        {
          viewId: baseline.appliedView.viewId,
          receiptId: expect.any(String),
          previousReceiptId: baseline.appliedView.receiptId,
        },
        {
          viewId: baseline.appliedView.viewId,
          receiptId: expect.any(String),
          previousReceiptId: deltas[0].appliedView.receiptId,
        },
      ]);
      expect(
        new Set(offers(guest).map((offer) => offer.appliedView.receiptId)).size,
      ).toBe(3);
      expect(JSON.stringify(guest.sent)).not.toContain(SECRET);

      // The GM's own view carries the hidden progress, in order.
      const [gmBaseline, ...gmDeltas] = offers(gm);
      expect(gmDeltas.map((offer) => offer.event.payload)).toEqual([
        expect.objectContaining({ reason: SECRET }),
        expect.objectContaining({ reason: 'first-visible' }),
        expect.objectContaining({ reason: 'second-visible' }),
      ]);
      expect(gmDeltas[0].appliedView.previousReceiptId).toBe(
        gmBaseline.appliedView.receiptId,
      );
    });

    it('establishes the baseline only on its confirmed write; a commit meanwhile follows it, linked to it', async () => {
      await privateHistory();
      const gm = await joinReceipts(fixture.host);
      const guest = await bindReceipts(fixture.guest);
      guest.mode = 'hold';
      const written = once(guest, 'CampaignSnapshot', signal());
      let joined = false;
      const ready = once(guest, 'joined', signal()).then(() => {
        joined = true;
      });
      guest.inbound(joinMessage(fixture.guest));
      await written;
      // The GM's delta shows the same commit has woken every view.
      await commitSeenBy([gm], [visibleFunds('during-hydration')]);
      expect(offers(guest)).toHaveLength(1);
      expect(joined).toBe(false);

      const delta = once(guest, 'CampaignEvent', signal());
      guest.mode = 'auto';
      guest.held.splice(0).forEach((callback) => callback());
      await Promise.all([ready, delta]);
      const [baseline, ...suffix] = offers(guest);
      expect(suffix).toHaveLength(1);
      expect(suffix[0].event.payload).toMatchObject({
        reason: 'during-hydration',
      });
      expect(suffix[0].appliedView.previousReceiptId).toBe(
        baseline.appliedView.receiptId,
      );
    });

    it.each(['failed', 'backpressured', 'closing'] as const)(
      'a %s write establishes nothing and closes for rejoin while a healthy recipient keeps receiving',
      async (failure) => {
        const gm = await joinReceipts(fixture.host);
        const guest = await bindReceipts(fixture.guest);
        if (failure === 'failed') guest.mode = 'fail';
        if (failure === 'backpressured') {
          guest.bufferedAmount = MAX_BUFFERED_BYTES + 1;
        }
        if (failure === 'closing') guest.readyState = 2;
        const closed = once(guest, 'close', signal());
        guest.inbound(joinMessage(fixture.guest));
        await closed;
        expect(guest.closes).toEqual([
          { code: 1008, reason: 'campaign-application-send-failed' },
        ]);
        // A failed write was handed over; the refused ones never were.
        expect(offers(guest)).toHaveLength(failure === 'failed' ? 1 : 0);
        const frames = guest.sent.length;

        await commitSeenBy([gm], [visibleFunds('healthy')]);
        const [gmBaseline, gmDelta] = offers(gm);
        expect(gmDelta.appliedView.previousReceiptId).toBe(
          gmBaseline.appliedView.receiptId,
        );
        expect(guest.sent).toHaveLength(frames);
      },
    );

    it('a committed removal ends the view, and the removed participant cannot rehydrate', async () => {
      const gm = await joinReceipts(fixture.host);
      const guest = await joinReceipts(fixture.guest);
      const closed = once(guest, 'close', signal());
      await commitSeenBy(
        [gm],
        [
          {
            type: 'ParticipantRemoved',
            campaignId: fixture.entry.campaignId,
            ts: new Date().toISOString(),
            authorPlayerId: fixture.host.playerId,
            scope: 'campaign',
            payload: { participantId: fixture.guest.playerId },
          },
        ],
      );
      await closed;
      expect(guest.closes).toEqual([
        { code: 1008, reason: 'membership-revoked' },
      ]);
      expect(offers(guest)).toHaveLength(1);

      const returning = await bindReceipts(fixture.guest);
      const refusal = once(returning, 'Error', signal());
      returning.inbound(joinMessage(fixture.guest));
      await refusal;
      expect(offers(returning)).toEqual([]);
      expect(framesOf(returning, 'Error')).toEqual([
        expect.objectContaining({ reason: 'membership-revoked' }),
      ]);
    });

    it('an authority change under the view ends it for rejoin', async () => {
      const guest = await joinReceipts(fixture.guest);
      // A re-bound seat changes the prepared viewer authority.
      db()
        .prepare(
          'UPDATE campaign_session_participant SET bound_at = ? WHERE participant_id = ?',
        )
        .run(new Date(Date.now() + 1000).toISOString(), fixture.guest.playerId);
      const closed = once(guest, 'close', signal());
      await fixture.entry.host._commitEventsForTests([
        visibleFunds('after-reseat'),
      ]);
      await closed;
      expect(guest.closes).toEqual([
        { code: 1008, reason: 'campaign-application-replaced' },
      ]);
      expect(offers(guest)).toHaveLength(1);
    });

    it('a revocation while the baseline write is unsettled establishes nothing', async () => {
      const guest = await bindReceipts(fixture.guest);
      guest.mode = 'hold';
      let joined = false;
      guest.once('joined', () => {
        joined = true;
      });
      const written = once(guest, 'CampaignSnapshot', signal());
      guest.inbound(joinMessage(fixture.guest));
      await written;
      createCampaignSessionMembershipPort().revoke({
        campaignId: fixture.entry.campaignId,
        sessionId: fixture.entry.matchId,
        participantId: fixture.guest.playerId,
        revokedAt: new Date().toISOString(),
      });
      const closed = once(guest, 'close', signal());
      guest.mode = 'auto';
      guest.held.splice(0).forEach((callback) => callback());
      await closed;
      expect(guest.closes).toEqual([
        { code: 1008, reason: 'membership-revoked' },
      ]);
      expect(joined).toBe(false);
    });

    it('closing the socket ends the view and releases its commit subscription', async () => {
      const host = fixture.entry.host;
      const subscribe = host.subscribe;
      let live = 0;
      jest.spyOn(host, 'subscribe').mockImplementation((subscriber) => {
        live += 1;
        const unsubscribe = subscribe(subscriber);
        return () => {
          live -= 1;
          unsubscribe();
        };
      });
      const guest = await joinReceipts(fixture.guest);
      expect(live).toBeGreaterThan(0);
      guest.close();
      expect(live).toBe(0);
    });

    it('refuses to hydrate a cut whose verified history does not reach the head digest', async () => {
      await privateHistory();
      db()
        .prepare(
          "UPDATE event_journal_stream_heads SET event_digest = ? WHERE stream_type = 'campaign' AND stream_id = ?",
        )
        .run('f'.repeat(64), fixture.entry.campaignId);
      const guest = await bindReceipts(fixture.guest);
      const closed = once(guest, 'close', signal());
      guest.inbound(joinMessage(fixture.guest));
      await closed;
      expect(guest.closes).toEqual([
        { code: 1008, reason: 'campaign-application-unavailable' },
      ]);
      expect(offers(guest)).toEqual([]);
      expect(JSON.stringify(guest.sent)).not.toContain(SECRET);
    });

    it('a newcomer quoting lastSeq without grant adapters still gets the public bundle, not a legacy resync', async () => {
      await privateHistory();
      const launch = await createMission();
      const socket = await bindReceipts(newcomer, { adapters: false });
      const joined = once(socket, 'joined', signal());
      socket.inbound(joinMessage(newcomer, 0));
      await joined;
      expect(framesOf(socket, 'CampaignEvent')).toEqual([]);
      const [baseline] = offers(socket);
      expect(offers(socket)).toHaveLength(1);
      expect(baseline.kind).toBe('CampaignSnapshot');
      expect(baseline.hydrationFacts).toEqual([launch]);
      expect(JSON.stringify(socket.sent)).not.toContain(SECRET);
    });

    it.each([
      ['durable membership alone', { receipts: false }],
      ['the receipt port alone', { membership: false }],
    ] as const)('stays a legacy connection with %s', async (_label, ports) => {
      await privateHistory();
      const launch = await createMission();
      const socket = await joinReceipts(fixture.guest, ports);
      expect(offers(socket)).toEqual([]);
      expect(framesOf(socket, 'CampaignSnapshot')).toHaveLength(1);
      expect(launches(socket).map((frame) => frame.event)).toEqual([launch]);
    });
  });
});
