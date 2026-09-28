import Database from 'better-sqlite3';
import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CAMPAIGN_BASELINE_SCHEMA_PACK } from '@/lib/events/replay/CampaignBaselineSchemaPack';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import {
  CampaignEventMessageSchema,
  ServerMessageSchema,
} from '@/types/multiplayer/Protocol';

import type { ICampaignHostBatchDoors } from '../campaignHostDoors';

import { getCampaignHostRegistry } from '../CampaignHostRegistry';
import { CampaignIntentIdentityConflictError } from '../campaignIntentIdentity';
import { CampaignMatchHost } from '../CampaignMatchHost';
import {
  LAUNCH,
  launches,
  nextFrame,
  openAnnouncementFixture,
} from './coopMissionAnnouncement.harness';
import {
  acceptFixtureParticipation,
  missionRequest,
} from './coopMissionCreate.fixture';
import { post } from './coopMissionCreate.harness';

const ONE = { matches: 2, events: 1, receipts: 1 };
const UNANNOUNCED = { matches: 2, events: 0, receipts: 0 };
describe('durable campaign mission announcements', () => {
  let fixture: Awaited<ReturnType<typeof openAnnouncementFixture>>;
  beforeEach(async () => {
    fixture = await openAnnouncementFixture();
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    await fixture.close();
  });

  async function interruptAppend() {
    const db = getSQLiteService().getDatabase();
    db.exec(`CREATE TEMP TRIGGER fail_launch BEFORE INSERT ON event_journal_events
      WHEN NEW.event_type = 'CampaignMissionLaunched'
      BEGIN SELECT RAISE(ABORT, 'interrupted-after-create'); END`);
    const response = await post(fixture.request, fixture.host);
    db.exec('DROP TRIGGER fail_launch');
    expect(response.status).toBe(500);
    const meta = (await fixture.store.listMatches()).find(
      (row) => row.coopMission,
    );
    assert.ok(meta?.coopMission);
    expect(await fixture.census(meta.matchId)).toEqual(UNANNOUNCED);
    return meta;
  }

  it('delivers one live strict frame from immutable deployers, excluding command-HQ', async () => {
    acceptFixtureParticipation(
      fixture.entry,
      fixture.contributors.map((row) => ({
        ...row,
        choice:
          row.playerId === fixture.guest.playerId ? 'command-hq' : 'deploy',
      })),
      'mission-2',
    );
    const mission = missionRequest(fixture.entry, 'mission-2');
    const request = {
      ...mission,
      coopCampaign: {
        ...mission.coopCampaign,
        contributions: fixture.entry
          .getParticipationRecords('mission-2')
          .map((row) => ({
            forceId: row.force.id,
            choice: row.choice,
            unitIds: row.force.unitIds,
          })),
      },
      unitBootstrap: mission.unitBootstrap.filter(
        (unit) => unit.unitId !== 'unit-guest',
      ),
    };
    const socket = await fixture.join();
    const observed = nextFrame(socket);
    const [matchId] = await Promise.all([fixture.create(request), observed]);
    const meta = await fixture.store.getMatchMeta(matchId);
    expect(meta.coopMission?.deployingPlayerIds).toEqual([
      fixture.host.playerId,
    ]);
    expect(launches(socket)).toHaveLength(1);
    const frame = launches(socket)[0];
    expect(CampaignEventMessageSchema.parse(frame)).toEqual(frame);
    expect(ServerMessageSchema.parse(frame)).toEqual(frame);
    expect(frame.event.payload).toEqual({
      missionId: meta.coopMission?.missionId,
      missionMatchId: matchId,
      acceptedHead: meta.coopMission?.acceptedHead,
      deployingPlayerIds: meta.coopMission?.deployingPlayerIds,
    });
    const registry = new ReplaySchemaRegistry({
      events: CAMPAIGN_BASELINE_SCHEMA_PACK,
    });
    expect(registry.upcast(LAUNCH, 1, frame.event.payload).payload).toEqual(
      frame.event.payload,
    );
    const events = await fixture.entry.host.getEventLog().getCampaignEvents(0);
    expect(events.filter((event) => event.type === LAUNCH)).toEqual([
      frame.event,
    ]);
    for (const value of [frame, frame.event]) {
      const wire = JSON.stringify(value);
      expect(wire).not.toMatch(
        /pilot|roster|unitBootstrap|ownerPlayerId|ownerMap|sessionToken|grantToken/i,
      );
      expect(wire).not.toContain(fixture.host.wireToken);
      expect(wire).not.toContain(fixture.guest.wireToken);
    }
    process.stdout.write(`P1B2 live frame ${JSON.stringify(frame)}\n`);
    expect(await fixture.census(matchId)).toEqual(ONE);
  });

  it('normal create, duplicate and serialized parallel creates keep one match, event and receipt', async () => {
    const queued = new EventEmitter();
    const entered = once(queued, 'entered', {
      signal: AbortSignal.timeout(2000),
    });
    const release = Promise.withResolvers<void>();
    const original = fixture.entry.host.runBatchExclusive;
    const held = original(async () => {
      queued.emit('entered');
      await release.promise;
    });
    await entered;
    const bothQueued = once(queued, 'both', {
      signal: AbortSignal.timeout(2000),
    });
    let admissions = 0;
    const spy = jest
      .spyOn(fixture.entry.host, 'runBatchExclusive')
      .mockImplementation(
        <T>(work: (doors: ICampaignHostBatchDoors) => Promise<T>) => {
          if (++admissions === 2) queued.emit('both');
          return original(work);
        },
      );
    try {
      const creates = Promise.all([fixture.create(), fixture.create()]);
      await bothQueued;
      release.resolve();
      const [matchId, duplicate] = await creates;
      expect(duplicate).toBe(matchId);
      expect(await fixture.create()).toBe(matchId);
      expect(await fixture.census(matchId)).toEqual(ONE);
    } finally {
      release.resolve();
      await held;
      spy.mockRestore();
    }
  });

  it('recovers an append failure after create persistence through the identical POST', async () => {
    const meta = await interruptAppend();
    await fixture.store.updateMatchMeta(meta.matchId, {
      playerIds: ['FORGED'],
      sideAssignments: [],
      unitBootstrap: [],
    });
    getCampaignHostRegistry().dispose(fixture.entry.matchId);
    const recovered = await getCampaignHostRegistry().getOrCreate(
      fixture.entry.matchId,
    );
    assert.ok(recovered);
    expect(await fixture.create()).toBe(meta.matchId);
    expect(await fixture.census(meta.matchId)).toEqual(ONE);
    const events = await recovered.host.getEventLog().getCampaignEvents(0);
    expect(events.find((row) => row.type === LAUNCH)?.payload).toMatchObject({
      deployingPlayerIds: [
        fixture.host.playerId,
        fixture.guest.playerId,
      ].sort(),
    });
  });

  it('returns prior receipt events after a committed announcement loses its HTTP response', async () => {
    const host = fixture.entry.host;
    const announce = host.announceMissionLaunched;
    jest
      .spyOn(host, 'announceMissionLaunched')
      .mockImplementationOnce(async (meta) => {
        await announce(meta);
        throw new Error('interrupted-after-announcement');
      });
    expect((await post(fixture.request, fixture.host)).status).toBe(500);
    const meta = (await fixture.store.listMatches()).find(
      (row) => row.coopMission,
    );
    assert.ok(meta);
    expect(await fixture.census(meta.matchId)).toEqual(ONE);
    const prior = (await host.getEventLog().getCampaignEvents(0)).filter(
      (row) => row.type === LAUNCH,
    );
    getCampaignHostRegistry().dispose(fixture.entry.matchId);
    const recovered = await getCampaignHostRegistry().getOrCreate(
      fixture.entry.matchId,
    );
    assert.ok(recovered);
    const published = jest.fn();
    const unsubscribe = recovered.host.subscribe(published);
    try {
      expect(await fixture.create()).toBe(meta.matchId);
      jest
        .spyOn(Date.prototype, 'toISOString')
        .mockReturnValue('2099-01-01T00:00:00.000Z');
      expect(await recovered.host.announceMissionLaunched(meta)).toEqual(prior);
      expect(published).not.toHaveBeenCalled();
      expect(await fixture.census(meta.matchId)).toEqual(ONE);
    } finally {
      unsubscribe();
    }
  });

  it('refuses divergent stored and request identities without appending', async () => {
    const matchId = await fixture.create();
    const meta = await fixture.store.getMatchMeta(matchId);
    assert.ok(meta.coopMission);
    await expect(
      fixture.entry.host.announceMissionLaunched({
        ...meta,
        coopMission: { ...meta.coopMission, requestFingerprint: 'divergent' },
      }),
    ).rejects.toBeInstanceOf(CampaignIntentIdentityConflictError);
    const divergent = await post(
      {
        ...fixture.request,
        config: { ...fixture.request.config, turnLimit: 21 },
      },
      fixture.host,
    );
    expect(divergent.status).toBe(409);
    expect(await fixture.census(matchId)).toEqual(ONE);
  });

  it('refuses a persisted legacy receipt with no prior announcement', async () => {
    const meta = await interruptAppend();
    const db = new Database(fixture.matchPath);
    try {
      db.prepare(
        "UPDATE mp_matches SET meta_json = json_remove(meta_json, '$.coopMission.deployingPlayerIds') WHERE match_id = ?",
      ).run(meta.matchId);
    } finally {
      db.close();
    }
    const legacy = await fixture.store.getMatchMeta(meta.matchId);
    expect(legacy.coopMission?.deployingPlayerIds).toBeUndefined();
    await expect(
      fixture.entry.host.announceMissionLaunched(legacy),
    ).rejects.toMatchObject({
      code: 'COOP_MISSION_LEGACY_RECEIPT',
      status: 409,
    });
    const response = await post(fixture.request, fixture.host);
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: 'COOP_MISSION_LEGACY_RECEIPT',
    });
    expect(await fixture.census(meta.matchId)).toEqual(UNANNOUNCED);
  });

  it('refuses an append-only store rather than losing command deduplication', async () => {
    const matchId = await fixture.create();
    const meta = await fixture.store.getMatchMeta(matchId);
    const memory = new InMemoryCampaignEventStore();
    const appendEvent = jest.fn(memory.appendEvent);
    const host = new CampaignMatchHost({
      campaignId: fixture.entry.campaignId,
      hostPlayerId: fixture.host.playerId,
      initialState: fixture.entry.host.getState(),
      eventStore: {
        appendEvent,
        getEvents: memory.getEvents,
        highestSequence: memory.highestSequence,
      },
    });
    await expect(host.announceMissionLaunched(meta)).rejects.toMatchObject({
      code: 'COOP_MISSION_JOURNAL_REQUIRED',
      status: 409,
    });
    expect(appendEvent).not.toHaveBeenCalled();
    expect(await host.getEventLog().getCampaignEvents(0)).toEqual([]);
  });
});
