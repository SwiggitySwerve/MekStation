import Database from 'better-sqlite3';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { EventEmitter, once } from 'node:events';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import * as selector from '@/lib/campaign/encounter/materializeCampaignMissionEncounter.forceUnits';
import {
  CampaignPublicAppliedViewStore,
  campaignViewerAuthorityFingerprint,
  readCampaignPublicAppliedView,
  type CampaignLaunchView,
} from '@/lib/campaign/sync/campaignPublicAppliedView';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import {
  bindCampaignSessionParticipant,
  listActiveCampaignSessionParticipants,
  revokeCampaignSessionParticipant,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import {
  GameEventType,
  GamePhase,
  LockState,
} from '@/types/gameplay/GameSessionInterfaces';

import type { ICampaignHostBatchDoors } from '../campaignHostDoors';
import type { ICampaignHostRegistryEntry } from '../CampaignHostRegistry';

import { getCampaignHostRegistry } from '../CampaignHostRegistry';
import { createDurableCampaignLaunchView } from '../campaignProgressionReaders.durable';
import {
  CoopMissionCommitError,
  createCoopMissionMatch,
  createPreparedCoopMissionMatch,
} from '../coopMissionCreate';
import { DurableMatchStore } from '../DurableMatchStore';
import { _setDefaultMatchStoreForTests } from '../getDefaultMatchStore';
import {
  COORDINATED_CORRECTION_SAGA_TABLE,
  migrateCoordinatedCorrectionSaga,
} from '../history/CoordinatedOutcomeCorrectionSaga';
import { MatchStoreSequenceCollisionError } from '../IMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { getMatchHostRegistry, MatchHostRegistry } from '../MatchHostRegistry';
import { foldMatchSession } from '../MatchSessionProjector';
import { digestCommandPostState } from '../ServerMatchHostDecision';
import {
  acceptFixtureParticipation,
  archiveRouteFixture,
  expectedOpponents,
  FIXTURE_AT,
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

/**
 * P2CG1C: the prepared create is callable and not route-reached. Readiness
 * comes only from P2CA offer acceptance on the real campaign handle.
 */
describe('P2CG1C prepared co-op mission create (callable, not route-reached)', () => {
  let fixture: Awaited<ReturnType<typeof openRouteFixture>>;
  let campaignPath: string;

  beforeEach(async () => {
    fixture = await openRouteFixture();
    campaignPath = path.join(fixture.root, 'campaign.db');
  });
  afterEach(async () => {
    jest.restoreAllMocks();
    archiveRouteFixture(fixture.root);
    await fixture.close();
  });

  const campaignDb = () => getSQLiteService().getDatabase();
  const matchDb = () => fixture.store.getDatabase();
  const missionId = (request = fixture.request) =>
    'coop-' +
    createHash('sha256')
      .update(
        JSON.stringify([
          request.coopCampaign.campaignId,
          request.coopCampaign.sessionId,
          request.coopCampaign.missionId,
        ]),
      )
      .digest('hex');

  /** Durable rows on both files, read through fresh connections. */
  function census() {
    const campaign = new Database(campaignPath, { readonly: true });
    try {
      const count = (sql: string) =>
        (campaign.prepare(sql).get() as { readonly n: number }).n;
      return {
        ...fixture.census(),
        journal: count('SELECT COUNT(*) AS n FROM event_journal_events'),
        launches: count(
          `SELECT COUNT(*) AS n FROM event_journal_events
            WHERE event_type LIKE '%MissionLaunched%'`,
        ),
      };
    } finally {
      campaign.close();
    }
  }

  /** Every active seat accepts a P2CA offer at the current head. */
  function acknowledgeAll(entry: ICampaignHostRegistryEntry = fixture.entry) {
    const db = campaignDb();
    const stream = { streamType: 'campaign', streamId: entry.campaignId };
    const branches = new SQLiteEventHistoryBranchStore(db);
    const head = readEffectiveStreamHead(db, branches, stream);
    const { effectiveGeneration } = branches.requireEffectiveHead(stream);
    for (const member of listActiveCampaignSessionParticipants(
      entry.campaignId,
      entry.matchId,
    )) {
      const key = {
        campaignId: entry.campaignId,
        sessionId: entry.matchId,
        participantId: member.participantId,
      };
      const viewer = {
        participantId: member.participantId,
        isGm: member.seat === 'gm',
      };
      const previous = readCampaignPublicAppliedView(db, key);
      const offer = {
        ...key,
        receiptId: `${member.participantId}@${head.revision}`,
        branchId: head.branchId,
        effectiveGeneration,
        acknowledgedJournalCut: head.revision,
        viewerAuthorityFingerprint: campaignViewerAuthorityFingerprint(
          member,
          viewer,
        ),
        kind: previous === null ? 'baseline' : 'delta',
        predecessorReceiptId: previous?.receiptId ?? null,
      } as const;
      const accepted = new CampaignPublicAppliedViewStore(db, {
        resolveDeliveredOffer: () => offer,
        readCurrentContext: () => ({
          branchId: head.branchId,
          effectiveGeneration,
          headRevision: head.revision,
          viewer,
          membership: member,
          participantRemoved: false,
        }),
      }).accept({ ...key, receiptId: offer.receiptId });
      expect(['accepted', 'duplicate']).toContain(accepted.kind);
    }
  }

  function view(): CampaignLaunchView {
    const launch = createDurableCampaignLaunchView();
    assert.ok(launch);
    return launch;
  }

  const create = (
    launch: CampaignLaunchView | null = view(),
    request = fixture.request,
    actor = fixture.host.playerId,
  ) => createPreparedCoopMissionMatch(request, actor, launch);

  /** Records transaction-control SQL issued through `exec` on one handle. */
  function traceExec(
    db: Database.Database,
    label: string,
    trail: string[],
    before?: (sql: string) => void,
    after?: (sql: string) => void,
  ) {
    const exec = db.exec.bind(db);
    return jest.spyOn(db, 'exec').mockImplementation((sql: string) => {
      if (/^(BEGIN|COMMIT|ROLLBACK)/.test(sql)) trail.push(`${label}:${sql}`);
      before?.(sql);
      const result = exec(sql);
      after?.(sql);
      return result;
    });
  }

  /** Whether a separate connection could take the file's write lock now. */
  function writable(file: string): boolean {
    const other = new Database(file, { timeout: 0 });
    try {
      other.exec('BEGIN IMMEDIATE');
      other.exec('ROLLBACK');
      return true;
    } catch (error) {
      expect(String(error)).toMatch(/SQLITE_BUSY|database is locked/);
      return false;
    } finally {
      other.close();
    }
  }

  const refusal = (code: string) =>
    expect.objectContaining({ name: 'CoopMissionRefusal', status: 409, code });

  /** Public refusals carry their code only: no cuts, digests or ids. */
  function expectPublicOnly(error: unknown) {
    const { code } = error as { readonly code: string };
    expect(JSON.parse(JSON.stringify(error))).toEqual({
      status: 409,
      code,
      name: 'CoopMissionRefusal',
    });
    expect((error as Error).message).toBe(code);
  }

  it('refuses before any effect without a capability, a view or readiness, and the route keeps the old create', async () => {
    // Given
    const before = census();
    const prepared = jest.spyOn(fixture.store, 'createMatchPrepared');
    const memory = new InMemoryMatchStore({ quiet: true });
    // When: no launch view.
    await expect(create(null)).rejects.toEqual(
      refusal('COOP_MISSION_LAUNCH_UNSUPPORTED'),
    );
    // When: a store without the capability.
    _setDefaultMatchStoreForTests(memory);
    await expect(create()).rejects.toEqual(
      refusal('COOP_MISSION_LAUNCH_UNSUPPORTED'),
    );
    _setDefaultMatchStoreForTests(fixture.store);
    // When: genuine membership but no accepted application offer.
    const trail: string[] = [];
    traceExec(campaignDb(), 'C', trail);
    const notReady = await create().catch((error: unknown) => error);
    // Then
    expect(notReady).toEqual(refusal('COOP_MISSION_NOT_CONVERGED'));
    expectPublicOnly(notReady);
    expect(trail).toEqual([]);
    expect(prepared).not.toHaveBeenCalled();
    expect(await memory.listMatches()).toEqual([]);
    expect(census()).toEqual(before);
    expect(getMatchHostRegistry().size()).toBe(0);
    // When: ready, but C is already inside someone else's transaction.
    acknowledgeAll();
    const ready = census();
    campaignDb().exec('BEGIN');
    const borrowed = await create().catch((error: unknown) => error);
    campaignDb().exec('ROLLBACK');
    expect(borrowed).toEqual(
      new Error('Prepared create needs an idle campaign connection'),
    );
    expect(census()).toEqual(ready);
    expect(prepared).not.toHaveBeenCalled();
    // The route still reaches only the old create, which needs no readiness.
    const routed = await post(fixture.request, fixture.host);
    expect(routed.status).toBe(201);
    expect(prepared).not.toHaveBeenCalled();
    expect(MissionReplySchema.parse(routed.body).missionMatchId).toBe(
      missionId(),
    );
  });

  it('holds C then M IMMEDIATE, commits M while C is held, and releases both before seed, recovery and announcement', async () => {
    // Given
    acknowledgeAll();
    const before = census();
    const launch = view();
    const preparedCalls = jest.spyOn(fixture.store, 'createMatchPrepared');
    const trail: string[] = [];
    const observed: Record<string, unknown>[] = [];
    traceExec(campaignDb(), 'C', trail);
    traceExec(matchDb(), 'M', trail, (sql) => {
      if (sql !== 'COMMIT') return;
      const others = new Database(fixture.matchPath, { readonly: true });
      try {
        observed.push({
          at: 'M:COMMIT',
          campaignHeld: campaignDb().inTransaction,
          campaignWritable: writable(campaignPath),
          ownRows: fixture.store.size(),
          otherRows: (
            others.prepare('SELECT COUNT(*) AS n FROM mp_matches').get() as {
              readonly n: number;
            }
          ).n,
        });
      } finally {
        others.close();
      }
    });
    const revalidate = launch.revalidate.bind(launch);
    jest.spyOn(launch, 'revalidate').mockImplementation((db, prepared) => {
      observed.push({
        at: 'guard',
        ownHandle: db === campaignDb(),
        campaignHeld: campaignDb().inTransaction,
        matchHeld: matchDb().inTransaction,
        campaignWritable: writable(campaignPath),
        matchWritable: writable(fixture.matchPath),
        rowsBeforeInsert: fixture.store.size(),
      });
      return revalidate(db, prepared);
    });
    const released = (at: string) =>
      observed.push({
        at,
        campaignHeld: campaignDb().inTransaction,
        matchHeld: matchDb().inTransaction,
      });
    const seed = fixture.store.seedJournalFromInitialEvents;
    jest
      .spyOn(fixture.store, 'seedJournalFromInitialEvents')
      .mockImplementation(async (...args) => {
        released('seed');
        return seed(...args);
      });
    const recover = getMatchHostRegistry().getOrCreate.bind(
      getMatchHostRegistry(),
    );
    jest
      .spyOn(getMatchHostRegistry(), 'getOrCreate')
      .mockImplementation(async (...args) => {
        released('recovery');
        return recover(...args);
      });
    const announce = fixture.entry.host.announceMissionLaunched.bind(
      fixture.entry.host,
    );
    jest
      .spyOn(fixture.entry.host, 'announceMissionLaunched')
      .mockImplementation(async (meta) => {
        released('announce');
        return announce(meta);
      });
    // When
    const created = await create(launch);
    // Then
    expect(trail).toEqual([
      'C:BEGIN IMMEDIATE',
      'M:BEGIN IMMEDIATE',
      'M:COMMIT',
      'C:ROLLBACK',
    ]);
    expect(observed).toEqual([
      {
        at: 'guard',
        ownHandle: true,
        campaignHeld: true,
        matchHeld: true,
        campaignWritable: false,
        matchWritable: false,
        rowsBeforeInsert: before.matches,
      },
      {
        at: 'M:COMMIT',
        campaignHeld: true,
        campaignWritable: false,
        ownRows: before.matches + 1,
        otherRows: before.matches,
      },
      { at: 'seed', campaignHeld: false, matchHeld: false },
      { at: 'recovery', campaignHeld: false, matchHeld: false },
      { at: 'announce', campaignHeld: false, matchHeld: false },
    ]);
    expect(created.matchId).toBe(missionId());
    const after = census();
    expect(after.matches).toBe(before.matches + 1);
    expect(after.launches).toBe(before.launches + 1);
    expect(getMatchHostRegistry().get(created.matchId)).not.toBeNull();
    // Cold reopen of the match file: one deterministic match and opening log.
    const reopened = new DurableMatchStore({ path: fixture.matchPath });
    try {
      expect(await reopened.getMatchMeta(created.matchId)).toEqual(created);
      const events = await reopened.getEvents(created.matchId);
      expect(events).toEqual(await fixture.store.getEvents(created.matchId));
      expect(events.slice(0, 2).map((event) => event.type)).toEqual([
        GameEventType.GameCreated,
        GameEventType.GameStarted,
      ]);
    } finally {
      reopened.close();
    }
    // The route reaches the stored identity through the old door only.
    const routed = await post(fixture.request, fixture.host);
    expect(MissionReplySchema.parse(routed.body).missionMatchId).toBe(
      created.matchId,
    );
    expect(preparedCalls).toHaveBeenCalledTimes(1);
    expect(census().launches).toBe(before.launches + 1);
    expect(census().matches).toBe(before.matches + 1);
  });

  /** Seeds one inbox outcome (campaign) whose saga lives on the match file. */
  function seedInboxOutcome() {
    campaignDb()
      .prepare(
        `INSERT INTO campaign_combat_outcome_inbox
           (outcome_id, outcome_version, campaign_id, command_id, command_digest,
            first_stream_revision, last_stream_revision, first_commit_position,
            last_commit_position, received_at)
         VALUES ('p2cg1c-outcome', 1, ?, 'p2cg1c-command', ?, 1, 1, 1, 1, ?)`,
      )
      .run(fixture.entry.campaignId, 'c'.repeat(64), FIXTURE_AT);
  }

  const drifts: readonly (readonly [string, () => void, string, number])[] = [
    [
      'a newly bound seat',
      () =>
        bindCampaignSessionParticipant({
          campaignId: fixture.entry.campaignId,
          sessionId: fixture.entry.matchId,
          participantId: 'late-seat',
          seat: 'player',
          boundAt: FIXTURE_AT,
        }),
      'COOP_MISSION_NOT_CONVERGED',
      0,
    ],
    [
      'a revoked membership incarnation',
      () =>
        revokeCampaignSessionParticipant({
          campaignId: fixture.entry.campaignId,
          sessionId: fixture.entry.matchId,
          participantId: fixture.guest.playerId,
          revokedAt: FIXTURE_AT,
        }),
      'COOP_MISSION_NOT_CONVERGED',
      0,
    ],
    [
      'a changed applied row',
      () =>
        campaignDb()
          .prepare(
            `UPDATE campaign_public_applied_view SET applied_at = 'drifted'
              WHERE participant_id = ?`,
          )
          .run(fixture.guest.playerId),
      'COOP_MISSION_NOT_CONVERGED',
      0,
    ],
    [
      'an open correction saga',
      () => {
        seedInboxOutcome();
        migrateCoordinatedCorrectionSaga(matchDb());
        matchDb()
          .prepare(
            `INSERT INTO mp_matches
               (match_id, status, room_code, created_at, updated_at, meta_json)
             VALUES ('saga-match', 'completed', NULL, ?, ?, '{}')`,
          )
          .run(FIXTURE_AT, FIXTURE_AT);
        matchDb()
          .prepare(
            `INSERT INTO ${COORDINATED_CORRECTION_SAGA_TABLE}
               (match_id, outcome_id, outcome_version, target_revision, state,
                source_recorded_at, updated_at)
             VALUES ('saga-match', 'p2cg1c-outcome', 1, 1, 'source-recorded', ?, ?)`,
          )
          .run(FIXTURE_AT, FIXTURE_AT);
      },
      'COOP_MISSION_LAUNCH_REFUSED',
      1,
    ],
    [
      'an unreadable saga context (unavailable, not known absence)',
      () => {
        seedInboxOutcome();
        matchDb().exec(
          `CREATE TABLE ${COORDINATED_CORRECTION_SAGA_TABLE} (unrelated TEXT)`,
        );
      },
      'COOP_MISSION_LAUNCH_REFUSED',
      0,
    ],
  ];

  it.each(drifts)(
    'refuses inside the held guard after %s, with nothing written',
    async (_name, drift, code, injectedMatches) => {
      // Given: drift lands after preparation and re-admission, before C.
      acknowledgeAll();
      const before = census();
      const trail: string[] = [];
      let drifted = false;
      traceExec(campaignDb(), 'C', trail, (sql) => {
        if (sql !== 'BEGIN IMMEDIATE' || drifted) return;
        drifted = true;
        drift();
      });
      traceExec(matchDb(), 'M', trail);
      // When
      const error = await create().catch((caught: unknown) => caught);
      // Then
      expect(error).toEqual(refusal(code));
      expectPublicOnly(error);
      expect(trail).toEqual([
        'C:BEGIN IMMEDIATE',
        'M:BEGIN IMMEDIATE',
        'M:ROLLBACK',
        'C:ROLLBACK',
      ]);
      expect(census()).toEqual({
        ...before,
        matches: before.matches + injectedMatches,
      });
      await expect(fixture.store.getMatchMeta(missionId())).rejects.toThrow();
      expect(getMatchHostRegistry().size()).toBe(0);
      expect([campaignDb().inTransaction, matchDb().inTransaction]).toEqual([
        false,
        false,
      ]);
    },
  );
  /** A writer in a separate OS process; it reports on stdout as JSON. */
  function spawnWriter(
    mode: 'blocked' | 'competing',
    file: string,
    marker: string,
  ) {
    const script = `
      const Database = require(process.argv[1]);
      const fs = require('fs');
      const [file, marker, mode] = process.argv.slice(2);
      const pause = (ms) =>
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
      if (mode === 'competing') {
        const db = new Database(file, { timeout: 5000 });
        db.exec('BEGIN IMMEDIATE');
        db.prepare("UPDATE campaign_public_applied_view SET applied_at = 'competing'").run();
        fs.writeFileSync(marker + '.holding', '');
        const until = Date.now() + 4000;
        while (!fs.existsSync(marker + '.go') && Date.now() < until) pause(2);
        pause(150);
        const committedAt = Date.now();
        db.exec('COMMIT');
        process.stdout.write(JSON.stringify({ committedAt }));
      } else {
        const db = new Database(file, { timeout: 0 });
        fs.writeFileSync(marker + '.ready', '');
        const deadline = Date.now() + 15000;
        let busyAt = null;
        while (busyAt === null && Date.now() < deadline) {
          try {
            db.exec('BEGIN IMMEDIATE');
            db.exec('ROLLBACK');
            pause(2);
          } catch (error) {
            if (error.code !== 'SQLITE_BUSY') throw error;
            busyAt = Date.now();
            fs.writeFileSync(marker + '.busy', '');
          }
        }
        db.pragma('busy_timeout = 15000');
        db.exec('BEGIN IMMEDIATE');
        const acquiredAt = Date.now();
        db.exec('CREATE TABLE IF NOT EXISTS p2cg1c_probe (at INTEGER)');
        db.prepare('INSERT INTO p2cg1c_probe VALUES (?)').run(acquiredAt);
        db.exec('COMMIT');
        process.stdout.write(JSON.stringify({ busyAt, acquiredAt }));
      }`;
    const child = spawn(
      process.execPath,
      ['-e', script, require.resolve('better-sqlite3'), file, marker, mode],
      { stdio: ['ignore', 'pipe', 'pipe'] },
    );
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk: Buffer) => (out += chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => (err += chunk.toString()));
    return once(child, 'exit').then(([exitCode]) => {
      expect({ exitCode, err }).toEqual({ exitCode: 0, err: '' });
      return JSON.parse(out) as Record<string, number | null>;
    });
  }

  async function waitForFile(file: string) {
    const until = Date.now() + 10_000;
    while (!existsSync(file)) {
      if (Date.now() > until) throw new Error(`timed out on ${file}`);
      await delay(5);
    }
  }

  /** Synchronous bounded wait, used while this process holds the locks. */
  function blockUntilFile(file: string) {
    const until = Date.now() + 10_000;
    const cell = new Int32Array(new SharedArrayBuffer(4));
    while (!existsSync(file)) {
      if (Date.now() > until) throw new Error(`timed out on ${file}`);
      Atomics.wait(cell, 0, 0, 5);
    }
  }

  it('blocks writers in other processes while C and M are held, then lets them commit', async () => {
    // Given
    acknowledgeAll();
    const marks = {
      campaign: path.join(fixture.root, 'campaign-writer'),
      match: path.join(fixture.root, 'saga-writer'),
    };
    const campaignWriter = spawnWriter('blocked', campaignPath, marks.campaign);
    const sagaWriter = spawnWriter('blocked', fixture.matchPath, marks.match);
    await waitForFile(`${marks.campaign}.ready`);
    await waitForFile(`${marks.match}.ready`);
    const launch = view();
    const revalidate = launch.revalidate.bind(launch);
    let guardAt = 0;
    jest.spyOn(launch, 'revalidate').mockImplementation((db, prepared) => {
      blockUntilFile(`${marks.campaign}.busy`);
      blockUntilFile(`${marks.match}.busy`);
      guardAt = Date.now();
      return revalidate(db, prepared);
    });
    const times: Record<string, number> = {};
    traceExec(matchDb(), 'M', [], (sql) => {
      if (sql === 'COMMIT') times.matchCommit = Date.now();
    });
    traceExec(campaignDb(), 'C', [], (sql) => {
      if (sql === 'ROLLBACK') times.campaignRelease = Date.now();
    });
    // When
    const created = await create(launch);
    const [campaign, saga] = await Promise.all([campaignWriter, sagaWriter]);
    // Then: each writer saw BUSY during the hold and committed after it.
    expect(created.matchId).toBe(missionId());
    assert.ok(campaign.busyAt !== null && saga.busyAt !== null);
    expect(campaign.busyAt).toBeLessThanOrEqual(guardAt);
    expect(saga.busyAt).toBeLessThanOrEqual(guardAt);
    expect(saga.acquiredAt).toBeGreaterThanOrEqual(times.matchCommit);
    expect(campaign.acquiredAt).toBeGreaterThanOrEqual(times.campaignRelease);
  });

  it('refuses when a competing writer commits first, where a deferred snapshot stays stale', async () => {
    // Given: another process holds C with an uncommitted applied-row change.
    acknowledgeAll();
    const before = census();
    const mark = path.join(fixture.root, 'competing-writer');
    const competing = spawnWriter('competing', campaignPath, mark);
    await waitForFile(`${mark}.holding`);
    const deferred = new Database(campaignPath, { timeout: 0 });
    const guestRow = (db: Database.Database) =>
      (
        db
          .prepare(
            `SELECT applied_at AS appliedAt FROM campaign_public_applied_view
              WHERE participant_id = ?`,
          )
          .get(fixture.guest.playerId) as { readonly appliedAt: string }
      ).appliedAt;
    deferred.exec('BEGIN');
    const snapshot = guestRow(deferred);
    let acquiredAt = 0;
    traceExec(
      campaignDb(),
      'C',
      [],
      (sql) => {
        if (sql === 'BEGIN IMMEDIATE') writeFileSync(`${mark}.go`, '');
      },
      (sql) => {
        if (sql === 'BEGIN IMMEDIATE') acquiredAt = Date.now();
      },
    );
    try {
      // When
      const error = await create().catch((caught: unknown) => caught);
      const { committedAt } = await competing;
      // Then: IMMEDIATE waited for the competing commit and saw it.
      expect(error).toEqual(refusal('COOP_MISSION_NOT_CONVERGED'));
      assert.ok(committedAt !== null);
      expect(acquiredAt).toBeGreaterThanOrEqual(committedAt);
      expect(census()).toEqual(before);
      // A deferred reader keeps its pre-commit snapshot and cannot upgrade.
      expect(snapshot).not.toBe('competing');
      expect(guestRow(deferred)).toBe(snapshot);
      let upgrade: unknown = null;
      try {
        deferred
          .prepare(`UPDATE campaign_public_applied_view SET applied_at = 'x'`)
          .run();
      } catch (caught) {
        upgrade = caught;
      }
      expect(upgrade).toMatchObject({
        code: expect.stringMatching(/^SQLITE_BUSY/),
      });
      const fresh = new Database(campaignPath, { readonly: true });
      try {
        expect(guestRow(fresh)).toBe('competing');
      } finally {
        fresh.close();
      }
    } finally {
      deferred.exec('ROLLBACK');
      deferred.close();
    }
  });

  it('rolls back every precommit failure, keeps the original error, and creates once on retry', async () => {
    // Given
    acknowledgeAll();
    const before = census();
    const launch = view();
    jest.spyOn(launch, 'revalidate').mockImplementationOnce(() => {
      throw new Error('guard exploded');
    });
    // When / Then: failure before insert.
    await expect(create(launch)).rejects.toThrow('guard exploded');
    expect(census()).toEqual(before);
    // Failure after insert, at an M COMMIT that never happened.
    const exec = matchDb().exec.bind(matchDb());
    const commit = jest
      .spyOn(matchDb(), 'exec')
      .mockImplementation((sql: string) => {
        if (sql === 'COMMIT') throw new Error('commit refused');
        return exec(sql);
      });
    await expect(create()).rejects.toThrow('commit refused');
    commit.mockRestore();
    expect(census()).toEqual(before);
    expect([campaignDb().inTransaction, matchDb().inTransaction]).toEqual([
      false,
      false,
    ]);
    expect(getMatchHostRegistry().size()).toBe(0);
    // Exact retry after failure creates once.
    const created = await create();
    expect(created.matchId).toBe(missionId());
    expect(census().matches).toBe(before.matches + 1);
    expect(census().launches).toBe(before.launches + 1);
  });

  it('keeps a known M commit through uncertain completion, C finalization and post-release failures', async () => {
    // Given: an M COMMIT that lands but reports failure.
    acknowledgeAll();
    const before = census();
    const exec = matchDb().exec.bind(matchDb());
    const landed = jest
      .spyOn(matchDb(), 'exec')
      .mockImplementation((sql: string) => {
        const result = exec(sql);
        if (sql === 'COMMIT') throw new Error('commit reported failure');
        return result;
      });
    // When: the owner's readback classifies it as committed.
    const created = await create();
    landed.mockRestore();
    // Then
    expect(created.matchId).toBe(missionId());
    expect(census().matches).toBe(before.matches + 1);
    expect(census().launches).toBe(before.launches + 1);

    // Given: a second mission whose C release fails after M committed.
    acceptFixtureParticipation(
      fixture.entry,
      fixture.contributors,
      'mission-2',
    );
    acknowledgeAll();
    const second = missionRequest(fixture.entry, 'mission-2');
    const cExec = campaignDb().exec.bind(campaignDb());
    const cRelease = jest
      .spyOn(campaignDb(), 'exec')
      .mockImplementation((sql: string) => {
        const result = cExec(sql);
        if (sql === 'ROLLBACK') throw new Error('campaign release failed');
        return result;
      });
    const announce = jest.spyOn(fixture.entry.host, 'announceMissionLaunched');
    // When
    const unsettled = await create(view(), second).catch(
      (caught: unknown) => caught,
    );
    cRelease.mockRestore();
    // Then: an identity, never a zero-create; nothing announced while unsettled.
    expect(unsettled).toBeInstanceOf(CoopMissionCommitError);
    expect(unsettled).toMatchObject({
      matchId: missionId(second),
      outcome: 'committed',
      errors: [new Error('campaign release failed')],
    });
    expect(await fixture.store.getMatchMeta(missionId(second))).toBeDefined();
    expect(announce).not.toHaveBeenCalled();
    // Exact retry settles once from the stored match, granting no readiness.
    const prepare = jest.spyOn(launchViewPrototype(), 'prepare');
    const retried = await create(view(), second);
    expect(retried.matchId).toBe(missionId(second));
    expect(prepare).not.toHaveBeenCalled();
    expect(announce).toHaveBeenCalledTimes(1);
    expect(census().matches).toBe(before.matches + 2);
    expect(census().launches).toBe(before.launches + 2);
  });

  it('keeps the match and the original error when announcement fails after release, then announces once on retry', async () => {
    // Given
    acknowledgeAll();
    const before = census();
    const announce = jest
      .spyOn(fixture.entry.host, 'announceMissionLaunched')
      .mockRejectedValueOnce(new Error('announce failed'));
    // When / Then
    await expect(create()).rejects.toThrow('announce failed');
    expect(census().matches).toBe(before.matches + 1);
    expect(census().launches).toBe(before.launches);
    expect([campaignDb().inTransaction, matchDb().inTransaction]).toEqual([
      false,
      false,
    ]);
    expect((await create()).matchId).toBe(missionId());
    expect(announce).toHaveBeenCalledTimes(2);
    expect(census().matches).toBe(before.matches + 1);
    expect(census().launches).toBe(before.launches + 1);
    expect((await create()).matchId).toBe(missionId());
    expect(census().launches).toBe(before.launches + 1);
  });

  it('reports an unreadable commit outcome as uncertain and resolves it by readback on retry', async () => {
    // Given
    acknowledgeAll();
    const before = census();
    const exec = matchDb().exec.bind(matchDb());
    const prepareSql = matchDb().prepare.bind(matchDb());
    let unreadable = false;
    jest.spyOn(matchDb(), 'exec').mockImplementation((sql: string) => {
      if (sql !== 'COMMIT') return exec(sql);
      unreadable = true;
      throw new Error('commit outcome unknown');
    });
    jest.spyOn(matchDb(), 'prepare').mockImplementation((sql: string) => {
      if (unreadable && sql.startsWith('SELECT * FROM mp_matches')) {
        unreadable = false;
        throw new Error('readback failed');
      }
      return prepareSql(sql);
    });
    // When
    const error = await create().catch((caught: unknown) => caught);
    jest.restoreAllMocks();
    // Then
    expect(error).toBeInstanceOf(CoopMissionCommitError);
    expect(error).toMatchObject({
      matchId: missionId(),
      outcome: 'uncertain',
      errors: [new Error('commit outcome unknown')],
    });
    expect([campaignDb().inTransaction, matchDb().inTransaction]).toEqual([
      false,
      false,
    ]);
    // Readback on retry finds no row, and the retry creates exactly once.
    expect(census()).toEqual(before);
    expect((await create()).matchId).toBe(missionId());
    expect(census().matches).toBe(before.matches + 1);
  });

  it('reuses the stored identity after campaign advancement and still applies identity and membership', async () => {
    // Given
    acknowledgeAll();
    const created = await create();
    const advanced = await fixture.entry.host.applyHostIntent({
      kind: 'AdvanceDay',
      campaignId: fixture.entry.campaignId,
      intentId: 'p2cg1c-advance',
      payload: { days: 1 },
    });
    expect(advanced.ok).toBe(true);
    const before = census();
    const prepare = jest.spyOn(launchViewPrototype(), 'prepare');
    // When
    const retried = await create();
    const divergent = await create(view(), {
      ...fixture.request,
      config: { ...fixture.request.config, mapRadius: 9 },
    }).catch((caught: unknown) => caught);
    revokeCampaignSessionParticipant({
      campaignId: fixture.entry.campaignId,
      sessionId: fixture.entry.matchId,
      participantId: fixture.guest.playerId,
      revokedAt: FIXTURE_AT,
    });
    const revoked = await create(
      view(),
      fixture.request,
      fixture.guest.playerId,
    ).catch((caught: unknown) => caught);
    // Then
    expect(retried).toEqual(created);
    expect(prepare).not.toHaveBeenCalled();
    expect(divergent).toEqual(refusal('COOP_MISSION_IDENTITY_CONFLICT'));
    expect(revoked).toMatchObject({ name: 'CoopMissionRefusal', status: 403 });
    expect(census()).toEqual(before);
    expect(getMatchHostRegistry().size()).toBe(1);
  });

  it("refuses another module graph's view on this graph's handle and leaves both files unwritten", async () => {
    // Given: a second campaign graph on the same file, with its own handle.
    acknowledgeAll();
    const before = census();
    const foreign: {
      view?: CampaignLaunchView | null;
      db?: Database.Database;
      reset?: () => void;
    } = {};
    jest.isolateModules(() => {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const sqlite =
        require('@/services/persistence/SQLiteService') as typeof import('@/services/persistence/SQLiteService');
      const readers =
        require('../campaignProgressionReaders.durable') as typeof import('../campaignProgressionReaders.durable');
      /* eslint-enable @typescript-eslint/no-require-imports */
      sqlite.getSQLiteService({ path: campaignPath }).initialize();
      foreign.db = sqlite.getSQLiteService().getDatabase();
      foreign.view = readers.createDurableCampaignLaunchView();
      foreign.reset = sqlite.resetSQLiteService;
    });
    try {
      assert.ok(foreign.view);
      expect(foreign.db).not.toBe(campaignDb());
      // When
      const error = await create(foreign.view).catch(
        (caught: unknown) => caught,
      );
      // Then
      expect(error).toEqual(refusal('COOP_MISSION_LAUNCH_REFUSED'));
      expectPublicOnly(error);
      expect(census()).toEqual(before);
      expect([campaignDb().inTransaction, matchDb().inTransaction]).toEqual([
        false,
        false,
      ]);
    } finally {
      foreign.reset?.();
    }
    // A cold reopen of the match file shows nothing was written.
    const reopened = new DurableMatchStore({ path: fixture.matchPath });
    try {
      await expect(reopened.getMatchMeta(missionId())).rejects.toThrow();
    } finally {
      reopened.close();
    }
    // This graph's own view still succeeds on the same readiness.
    expect((await create()).matchId).toBe(missionId());
  });
});

function launchViewPrototype(): CampaignLaunchView {
  const launch = createDurableCampaignLaunchView();
  assert.ok(launch);
  return Object.getPrototypeOf(launch) as CampaignLaunchView;
}
