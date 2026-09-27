import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';

import { GameEventType } from '@/types/gameplay/GameSessionInterfaces';

import type { ICampaignHostBatchDoors } from '../campaignHostDoors';

import { getCampaignHostRegistry } from '../CampaignHostRegistry';
import { DurableMatchStore } from '../DurableMatchStore';
import { MatchStoreSequenceCollisionError } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { getMatchHostRegistry, MatchHostRegistry } from '../MatchHostRegistry';
import {
  acceptFixtureParticipation,
  missionRequest,
} from './coopMissionCreate.fixture';
import {
  MissionMetaSchema,
  MissionReplySchema,
  openRouteFixture,
  post,
} from './coopMissionCreate.harness';

describe('co-op mission create through real auth, SQLite and combat hosts', () => {
  let fixture: Awaited<ReturnType<typeof openRouteFixture>>;

  beforeEach(async () => {
    fixture = await openRouteFixture();
  });
  afterEach(async () => {
    await fixture.close();
  });

  it('creates an owner-bound combat match when both contributors deployed', async () => {
    // Given
    const before = fixture.census();
    // When
    const response = await post(fixture.request, fixture.host);
    // Then
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const created = MissionReplySchema.parse(response.body);
    expect(created.matchId).toBe(created.missionMatchId);
    expect(created.matchId).not.toBe(fixture.entry.matchId);
    expect(created.meta.coopMission).toMatchObject({
      campaignId: fixture.entry.campaignId,
      sessionId: fixture.entry.matchId,
      missionId: 'mission-1',
      acceptedHead: fixture.request.coopCampaign.expectedHead,
    });
    expect(
      Object.fromEntries(
        created.meta.unitBootstrap.map((unit) => [
          unit.unitId,
          { side: unit.side, owner: unit.ownerPlayerId },
        ]),
      ),
    ).toEqual({
      'unit-host': { side: 'player', owner: fixture.host.playerId },
      'unit-guest': { side: 'player', owner: fixture.guest.playerId },
      'opfor-1': { side: 'opponent', owner: undefined },
    });
    const stored = await fixture.store.getMatchMeta(created.matchId);
    expect(MissionMetaSchema.parse(stored)).toEqual(created.meta);
    expect(stored.coopCampaign).toBeUndefined();
    expect(created.meta.status).toBe('active');
    expect(fixture.census().matches).toBe(before.matches + 1);
    const host = getMatchHostRegistry().get(created.matchId);
    assert.ok(host);
    expect(host.isClosed()).toBe(false);
    expect(getMatchHostRegistry().size()).toBe(1);
    expect(getCampaignHostRegistry().get(created.matchId)).toBeNull();
    const events = await fixture.store.getEvents(created.matchId);
    expect(events.map((event) => event.type)).toEqual(
      expect.arrayContaining([
        GameEventType.GameCreated,
        GameEventType.GameStarted,
      ]),
    );
    expect(events).toEqual(host.getSessionForTests().events);
  });

  it('excludes a command-HQ contribution from the combat bootstrap', async () => {
    // Given
    acceptFixtureParticipation(
      fixture.entry,
      fixture.contributors.map((contributor) => ({
        ...contributor,
        choice:
          contributor.playerId === fixture.guest.playerId
            ? 'command-hq'
            : 'deploy',
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
          .map((record) => ({
            forceId: record.force.id,
            choice: record.choice,
            unitIds: record.force.unitIds,
          })),
      },
      unitBootstrap: mission.unitBootstrap.filter(
        (unit) => unit.unitId !== 'unit-guest',
      ),
    };
    // When
    const response = await post(request, fixture.host);
    // Then
    expect(response.status).toBe(201);
    expect(
      MissionReplySchema.parse(response.body).meta.unitBootstrap.map(
        (unit) => ({
          id: unit.unitId,
          owner: unit.ownerPlayerId,
        }),
      ),
    ).toEqual([
      { id: 'unit-host', owner: fixture.host.playerId },
      { id: 'opfor-1', owner: undefined },
    ]);
  });

  it('retains opening events and owners in the memory store', async () => {
    // Given
    const created = MissionReplySchema.parse(
      (await post(fixture.request, fixture.host)).body,
    );
    const meta = await fixture.store.getMatchMeta(created.matchId);
    const events = await fixture.store.getEvents(created.matchId);
    const memory = new InMemoryMatchStore({ quiet: true });
    // When
    await memory.createMatch(meta, events);
    // Then
    expect(await memory.getEvents(meta.matchId)).toEqual(events);
    expect(await memory.getMatchMeta(meta.matchId)).toEqual(meta);
  });

  it('leaves no memory-store match when opening event sequences collide', async () => {
    // Given
    const created = MissionReplySchema.parse(
      (await post(fixture.request, fixture.host)).body,
    );
    const meta = await fixture.store.getMatchMeta(created.matchId);
    const [opening] = await fixture.store.getEvents(created.matchId);
    assert.ok(opening);
    const memory = new InMemoryMatchStore({ quiet: true });
    // When
    const creation = memory.createMatch(meta, [opening, opening]);
    // Then
    await expect(creation).rejects.toBeInstanceOf(
      MatchStoreSequenceCollisionError,
    );
    expect(await memory.listMatches()).toEqual([]);
  });

  it('ignores client player and side assignments when deriving mission owners', async () => {
    // Given
    const request = {
      ...fixture.request,
      playerIds: ['forged-player'],
      sideAssignments: [{ playerId: 'forged-player', side: 'opponent' }],
    };
    // When
    const response = await post(request, fixture.host);
    // Then
    expect(response.status).toBe(201);
    const { meta } = MissionReplySchema.parse(response.body);
    expect(meta.playerIds.slice().sort()).toEqual(
      [fixture.host.playerId, fixture.guest.playerId].sort(),
    );
    expect(meta.unitBootstrap.map((unit) => unit.ownerPlayerId)).toEqual([
      fixture.host.playerId,
      fixture.guest.playerId,
      undefined,
    ]);
  });

  it('returns the stored identity without appending when the campaign advanced', async () => {
    // Given
    const first = await post(fixture.request, fixture.host);
    expect(first.status).toBe(201);
    const created = MissionReplySchema.parse(first.body);
    const advanced = await fixture.entry.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: fixture.entry.campaignId,
      intentId: 'advance-after-create',
      payload: { days: 1 },
    });
    expect(advanced.ok).toBe(true);
    const before = fixture.census();
    const events = await fixture.store.getEvents(created.matchId);
    // When
    const retry = await post(fixture.request, fixture.host);
    // Then
    expect([200, 201]).toContain(retry.status);
    expect(MissionReplySchema.parse(retry.body).missionMatchId).toBe(
      created.matchId,
    );
    expect(fixture.census()).toEqual(before);
    expect(await fixture.store.getEvents(created.matchId)).toEqual(events);
  });

  it('creates once when identical requests queue behind the campaign authority lock', async () => {
    // Given: observe both real lock admissions before releasing the held door.
    const entered = Promise.withResolvers<void>();
    const release = Promise.withResolvers<void>();
    const original = fixture.entry.host.runBatchExclusive;
    const held = original(async () => {
      entered.resolve();
      await release.promise;
    });
    await entered.promise;
    const queued = new EventEmitter();
    const bothQueued = once(queued, 'both', {
      signal: AbortSignal.timeout(5000),
    });
    let admissions = 0;
    const spy = jest
      .spyOn(fixture.entry.host, 'runBatchExclusive')
      .mockImplementation(
        <T>(work: (doors: ICampaignHostBatchDoors) => Promise<T>) => {
          admissions += 1;
          if (admissions === 2) queued.emit('both');
          return original(work);
        },
      );
    const before = fixture.census();
    try {
      // When
      const responses = Promise.all([
        post(fixture.request, fixture.host),
        post(fixture.request, fixture.host),
      ]);
      // Baseline schema refusals complete before reaching this lock.
      await Promise.race([bothQueued, responses]);
      release.resolve();
      const results = await responses;
      // Then
      expect(
        results.every((result) => [200, 201].includes(result.status)),
      ).toBe(true);
      expect(admissions).toBe(2);
      expect(
        new Set(
          results.map(
            (result) => MissionReplySchema.parse(result.body).missionMatchId,
          ),
        ).size,
      ).toBe(1);
      expect(fixture.census().matches).toBe(before.matches + 1);
      expect(getMatchHostRegistry().size()).toBe(1);
    } finally {
      release.resolve();
      await held;
      spy.mockRestore();
    }
  });

  it('recovers the same owner map and combat kind through an independent durable handle', async () => {
    // Given
    const first = await post(fixture.request, fixture.host);
    expect(first.status).toBe(201);
    const created = MissionReplySchema.parse(first.body);
    const reopened = new DurableMatchStore({ path: fixture.matchPath });
    const registry = new MatchHostRegistry({ store: reopened });
    try {
      // When
      const recovery = await registry.recoverActiveMatches();
      // Then
      expect(recovery.failed).toBe(0);
      expect(registry.get(created.matchId)).not.toBeNull();
      expect(
        MissionMetaSchema.parse(await reopened.getMatchMeta(created.matchId)),
      ).toEqual(created.meta);
      expect(getCampaignHostRegistry().get(created.matchId)).toBeNull();
    } finally {
      await registry.closeMatch(created.matchId);
      reopened.close();
    }
  });

  it('keeps vessel requests distinct when their bodies are repeated', async () => {
    // Given
    const original = fixture.entry.matchId;
    // When
    const response = await post(fixture.vessel, fixture.host);
    // Then
    expect(response.status).toBe(201);
    const matches = await fixture.store.listMatches();
    expect(matches).toHaveLength(2);
    expect(
      matches.filter((meta) => meta.matchId !== original)[0]?.coopCampaign,
    ).toBeDefined();
    expect(getCampaignHostRegistry().size()).toBe(2);
    expect(getMatchHostRegistry().size()).toBe(0);
  });
});
