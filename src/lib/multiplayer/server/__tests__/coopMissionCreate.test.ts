import assert from 'node:assert/strict';
import { EventEmitter, once } from 'node:events';

import * as selector from '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits';
import {
  GameEventType,
  GamePhase,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';

import type { ICampaignHostBatchDoors } from '../campaignHostDoors';

import { getCampaignHostRegistry } from '../CampaignHostRegistry';
import { createCoopMissionMatch } from '../coopMissionCreate';
import { DurableMatchStore } from '../DurableMatchStore';
import { MatchStoreSequenceCollisionError } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { getMatchHostRegistry, MatchHostRegistry } from '../MatchHostRegistry';
import { foldMatchSession } from '../MatchSessionProjector';
import { digestCommandPostState } from '../ServerMatchHostDecision';
import {
  acceptFixtureParticipation,
  archiveRouteFixture,
  expectedOpponents,
  missionRequest,
} from './coopMissionCreate.fixture';
import {
  MissionMetaSchema,
  MissionReplySchema,
  openRouteFixture,
  post,
} from './coopMissionCreate.harness';

jest.mock(
  '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits',
  () => ({
    __esModule: true,
    ...jest.requireActual<
      typeof import('@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits')
    >(
      '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits',
    ),
  }),
);

describe('co-op mission create through real auth, SQLite and combat hosts', () => {
  let fixture: Awaited<ReturnType<typeof openRouteFixture>>;

  beforeEach(async () => {
    fixture = await openRouteFixture();
  });
  afterEach(async () => {
    archiveRouteFixture(fixture.root);
    await fixture.close();
    jest.restoreAllMocks();
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
    expect(created.meta.unitBootstrap).toEqual([
      {
        unitId: 'unit-host',
        unitRef: 'atlas-as7-d',
        side: 'player',
        ownerPlayerId: fixture.host.playerId,
      },
      {
        unitId: 'unit-guest',
        unitRef: 'marauder-mad-3r',
        side: 'player',
        ownerPlayerId: fixture.guest.playerId,
      },
      ...expectedOpponents(fixture.entry.campaignId, 'mission-1', 2),
    ]);
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
      ...expectedOpponents(fixture.entry.campaignId, 'mission-2', 1).map(
        (unit) => ({ id: unit.unitId, owner: undefined }),
      ),
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
      undefined,
    ]);
  });

  it('advances player -> server opponent -> next player in a player-only route-created match', async () => {
    // Given: no fixture-injected combat roster or engine configuration.
    const response = await post(fixture.request, fixture.host);
    assert.equal(response.status, 201, JSON.stringify(response.body));
    const created = MissionReplySchema.parse(response.body);
    const combat = getMatchHostRegistry().get(created.matchId);
    assert.ok(combat);
    fixture.entry.syncSession.noteGmConnected();
    const socket = () => ({
      readyState: 1,
      send: (_data: string) => undefined,
      close: () => undefined,
    });
    await combat.admitSocket(socket(), fixture.host.playerId);
    await combat.admitSocket(socket(), fixture.guest.playerId);
    const command = (
      playerId: string,
      intentId: string,
      intent: Parameters<typeof combat.handleIntent>[0]['intent'],
    ) =>
      combat.handleIntent(
        {
          kind: 'Intent',
          matchId: created.matchId,
          ts: new Date().toISOString(),
          playerId,
          intentId,
          intent,
        },
        'route-connection',
        playerId,
      );
    await command(fixture.host.playerId, 'route-start', {
      kind: 'AdvancePhase',
    });
    const before = combat.getSessionForTests().currentState;
    expect(before.phase).toBe(GamePhase.Movement);
    const player = before.units['unit-host'];
    assert.ok(player);
    // When: the real serialized host owns and awaits its command lifecycle.
    const frames = await command(fixture.host.playerId, 'route-player-move', {
      kind: 'Move',
      unitId: player.id,
      to: player.position,
      facing: player.facing,
      movementType: 'stationary',
    });
    // Then: AI command identity and engine activation are durable, not browser grants.
    expect(frames.filter((frame) => frame.kind === 'Error')).toEqual([]);
    const receipt = await fixture.store.getLastCommandReceipt(created.matchId);
    expect(receipt?.actorId).toBe('server:coop-opponent');
    expect(receipt?.commandId.startsWith('coop-ai:')).toBe(true);
    const after = combat.getSessionForTests().currentState;
    expect(after.units['unit-host'].lockState).toBe(LockState.Locked);
    expect(after.units['unit-guest'].lockState).toBe(LockState.Pending);
    expect(after.activationIndex).toBe(before.activationIndex + 2);
    const guest = after.units['unit-guest'];
    expect(
      (
        await command(fixture.guest.playerId, 'route-next-player', {
          kind: 'Move',
          unitId: guest.id,
          to: guest.position,
          facing: guest.facing,
          movementType: 'stationary',
        })
      ).filter((frame) => frame.kind === 'Error'),
    ).toEqual([]);
    const events = await fixture.store.getEvents(created.matchId);
    expect(
      digestCommandPostState(foldMatchSession(created.matchId, events)),
    ).toBe(digestCommandPostState(combat.getSessionForTests()));
    const metadata = await fixture.store.getMatchMeta(created.matchId);
    const lastReceipt = await fixture.store.getLastCommandReceipt(
      created.matchId,
    );
    // A crash drops transports without executing graceful durable completion.
    const durableClose = jest
      .spyOn(fixture.store, 'closeMatch')
      .mockResolvedValue(undefined);
    await combat.closeMatch();
    durableClose.mockRestore();
    const selected = jest
      .spyOn(selector, 'selectOpponentUnits')
      .mockImplementation(() => {
        throw new Error('retry reselected opponents');
      });
    const retry = await post(
      {
        ...fixture.request,
        unitBootstrap: [
          ...fixture.request.unitBootstrap,
          ...(metadata.unitBootstrap ?? []).filter(
            (unit) => unit.side === 'opponent',
          ),
        ],
      },
      fixture.host,
    );
    expect(retry.status).toBe(201);
    const recovered = getMatchHostRegistry().get(created.matchId);
    assert.ok(recovered);
    expect(recovered).not.toBe(combat);
    expect(selected).not.toHaveBeenCalled();
    expect(await fixture.store.getMatchMeta(created.matchId)).toEqual(metadata);
    expect(await fixture.store.getEvents(created.matchId)).toEqual(events);
    expect(await fixture.store.getLastCommandReceipt(created.matchId)).toEqual(
      lastReceipt,
    );
    expect(digestCommandPostState(recovered.getSessionForTests())).toBe(
      digestCommandPostState(foldMatchSession(created.matchId, events)),
    );
  });

  it('normalizes exact and omitted assertions without mutating caller parameters', async () => {
    // Given
    const original = JSON.stringify(fixture.request);
    const asserted = {
      ...fixture.request,
      unitBootstrap: [
        ...fixture.request.unitBootstrap,
        ...expectedOpponents(fixture.entry.campaignId, 'mission-1', 2),
      ],
    };
    const created = await createCoopMissionMatch(
      asserted,
      fixture.host.playerId,
    );
    const before = fixture.census();
    const selected = jest
      .spyOn(selector, 'selectOpponentUnits')
      .mockImplementation(() => {
        throw new Error('stored retry selected');
      });
    // When
    const retry = await createCoopMissionMatch(
      fixture.request,
      fixture.host.playerId,
    );
    // Then
    expect(retry).toEqual(created);
    expect(JSON.stringify(fixture.request)).toBe(original);
    expect(
      asserted.unitBootstrap.every((unit) => !('ownerPlayerId' in unit)),
    ).toBe(true);
    expect(selected).not.toHaveBeenCalled();
    expect(fixture.census()).toEqual(before);
  });

  it.each([false, true])(
    'validates a durable race winner when divergent=%s',
    async (divergent) => {
      // Given: a real durable handle commits before the simulated uniqueness race.
      const create = fixture.store.createMatch;
      const recovery = jest.spyOn(getMatchHostRegistry(), 'getOrCreate');
      jest
        .spyOn(fixture.store, 'createMatch')
        .mockImplementation(async (meta, opening) => {
          const winner = divergent
            ? {
                ...meta,
                unitBootstrap: meta.unitBootstrap?.map((unit) =>
                  unit.side === 'opponent'
                    ? {
                        ...unit,
                        unitRef:
                          'locust-lct-1v' === unit.unitRef
                            ? 'atlas-as7-d'
                            : 'locust-lct-1v',
                      }
                    : unit,
                ),
              }
            : meta;
          await create(winner, opening);
          throw new Error('injected durable winner');
        });
      // When
      const response = await post(fixture.request, fixture.host);
      // Then
      expect(response.status).toBe(divergent ? 409 : 201);
      expect(
        (await fixture.store.listMatches()).filter((meta) => meta.coopMission),
      ).toHaveLength(1);
      if (divergent) expect(recovery).not.toHaveBeenCalled();
    },
  );

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
        post(
          {
            ...fixture.request,
            unitBootstrap: [
              ...fixture.request.unitBootstrap,
              ...expectedOpponents(fixture.entry.campaignId, 'mission-1', 2),
            ],
          },
          fixture.host,
        ),
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
