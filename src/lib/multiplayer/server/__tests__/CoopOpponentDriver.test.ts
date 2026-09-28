import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import {
  GameEventType,
  GamePhase,
  GameSide,
  LockState,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  IntentSchema,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import {
  getCampaignHostRegistry,
  _resetCampaignHostRegistry,
} from '../CampaignHostRegistry';
import * as coopOpponentDriver from '../CoopOpponentDriver';
import { DurableMatchStore } from '../DurableMatchStore';
import {
  _setDefaultMatchStoreForTests,
  _resetDefaultMatchStore,
} from '../getDefaultMatchStore';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
} from '../matchJournalAuthority';
import { foldMatchSession } from '../MatchSessionProjector';
import { buildMatchHostBootstrapFromMeta } from '../matchUnitBootstrap';
import { ServerMatchHost } from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

// Jest's shared environment is jsdom; the production server never writes
// the browser match log. Only this unrelated browser persistence is inert.
jest.mock('@/lib/p2p/matchLogStorage', () => {
  const actual = jest.requireActual<typeof import('@/lib/p2p/matchLogStorage')>(
    '@/lib/p2p/matchLogStorage',
  );
  return {
    ...actual,
    matchLogStorage: {
      ...actual.matchLogStorage,
      appendEvent: jest.fn(async () => undefined),
    },
  };
});

// SWC exports are non-configurable getters. Copy the real exports so spies
// can observe/inject at the driver boundary without replacing its behavior.
jest.mock('../CoopOpponentDriver', () => ({
  __esModule: true,
  ...jest.requireActual<typeof import('../CoopOpponentDriver')>(
    '../CoopOpponentDriver',
  ),
}));

const MATCH = 'coop-opponent-driver';
const AT = '2026-09-28T00:00:00.000Z';
let dir: string;
let store: DurableMatchStore;
let host: ServerMatchHost | undefined;

function bounded<T>(signal: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout>;
  return Promise.race([
    signal,
    new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error('signal timed out')), 5000);
    }),
  ]).finally(() => clearTimeout(timeout!));
}

function socket() {
  const frames: IServerMessage[] = [];
  const listeners = new Set<(frame: IServerMessage) => void>();
  return {
    readyState: 1,
    send: (data: string) => {
      const frame = JSON.parse(data) as IServerMessage;
      frames.push(frame);
      listeners.forEach((listener) => listener(frame));
    },
    close: () => undefined,
    frames,
    onKind: (kind: IServerMessage['kind']) =>
      bounded(
        new Promise<IServerMessage>((resolve) => {
          const listener = (frame: IServerMessage) => {
            if (frame.kind !== kind) return;
            listeners.delete(listener);
            resolve(frame);
          };
          listeners.add(listener);
        }),
      ),
  };
}

async function fixture(
  enabled: boolean,
  scope: 'mission' | 'versus' | 'vessel' = 'mission',
  diceSeed = 1,
) {
  _setCombatJournalAuthorityModeForTests(enabled ? 'enabled' : null);
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant: 'PAI',
    data: { ...atlas, id: 'ignored', variant: 'PAI' },
  });
  if (!created.success || !created.data)
    throw new Error('fixture unit creation failed');
  const unitRef = created.data.id;
  const meta: IMatchMeta = {
    matchId: MATCH,
    hostPlayerId: 'host',
    playerIds: ['host', 'guest'],
    sideAssignments: [
      { playerId: 'host', side: 'player' },
      { playerId: 'guest', side: 'player' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 6, turnLimit: 5, fogOfWar: true },
    unitBootstrap: [
      {
        unitId: 'player-a',
        unitRef,
        side: 'player',
        ownerPlayerId: 'host',
        startHex: { q: -2, r: 0 },
      },
      {
        unitId: 'player-b',
        unitRef,
        side: 'player',
        ownerPlayerId: 'guest',
        startHex: { q: -2, r: 1 },
      },
      {
        unitId: 'opponent',
        unitRef,
        side: 'opponent',
        startHex: { q: 2, r: 0 },
      },
    ],
    ...(scope === 'mission'
      ? {
          coopMission: {
            campaignId: 'campaign',
            sessionId: 'campaign-vessel',
            missionId: 'mission',
            acceptedHead: {
              branchId: 'main',
              revision: 1,
              effectiveGeneration: 1,
            },
            requestFingerprint: 'fixture',
            deployingPlayerIds: ['host', 'guest'],
          },
        }
      : {}),
    ...(scope === 'vessel'
      ? {
          coopCampaign: {
            campaignId: 'campaign',
            state: {} as NonNullable<IMatchMeta['coopCampaign']>['state'],
          },
        }
      : {}),
  };
  await store.createMatch(meta);
  const bootstrap = await buildMatchHostBootstrapFromMeta(meta, {
    diceSeed,
  });
  const seed = store.seedJournalFromInitialEvents;
  let openingComplete!: () => void;
  const opening = new Promise<void>((resolve) => {
    openingComplete = resolve;
  });
  const seeded = jest
    .spyOn(store, 'seedJournalFromInitialEvents')
    .mockImplementation(async (...args) => {
      await seed(...args);
      openingComplete();
    });
  host = ServerMatchHost.create(MATCH, store, {
    ...bootstrap,
    random: new SeededRandom(9),
    randomSeed: 9,
  });
  await bounded(opening);
  seeded.mockRestore();
  const hostSocket = socket();
  const guestSocket = socket();
  expect(await host.admitSocket(hostSocket, 'host')).not.toBeNull();
  expect(await host.admitSocket(guestSocket, 'guest')).not.toBeNull();
  expect(host.isJournalAuthorityEnabled()).toBe(enabled);
  return { host, hostSocket, guestSocket, bootstrap };
}

async function intent(payload: IIntent['intent'], id: string) {
  return host!.handleIntent(
    {
      kind: 'Intent',
      matchId: MATCH,
      ts: AT,
      playerId: 'host',
      intentId: id,
      intent: payload,
    },
    'host-connection',
    'host',
  );
}

async function playerMove() {
  const unit = host!.getSessionForTests().currentState.units['player-a'];
  return intent(
    {
      kind: 'Move',
      unitId: unit.id,
      to: unit.position,
      facing: unit.facing,
      movementType: 'stationary',
    },
    'player-move',
  );
}

function opponentLocks(events: readonly IGameEvent[]) {
  return events.filter(
    (event) =>
      event.type === GameEventType.MovementLocked &&
      (event.payload as { unitId?: string }).unitId === 'opponent',
  );
}

function assertHidden(frames: readonly IServerMessage[]) {
  const declarations = frames.flatMap((frame) =>
    frame.kind === 'Event'
      ? [frame.event as IGameEvent]
      : frame.kind === 'ReplayChunk'
        ? (frame.events as IGameEvent[])
        : [],
  );
  expect(
    declarations.some(
      (event) =>
        event.type === GameEventType.MovementDeclared &&
        (event.payload as { unitId?: string }).unitId === 'opponent',
    ),
  ).toBe(false);
  expect(JSON.stringify(frames)).not.toContain('requestFingerprint');
}

async function coldReopen() {
  // A crash removes transports without executing the graceful durable close.
  const close = jest.spyOn(store, 'closeMatch').mockResolvedValue(undefined);
  await host!.closeMatch();
  close.mockRestore();
  store.close();
  resetUnitRepository();
  resetSQLiteService();
  getSQLiteService({ path: path.join(dir, 'campaign.db') }).initialize();
  store = new DurableMatchStore({
    path: path.join(dir, 'matches.db'),
    capabilityDb: () => getSQLiteService().getDatabase(),
  });
  _setDefaultMatchStoreForTests(store);
  const rebuilt = await InteractiveSession.fromSessionAsync(
    foldMatchSession(MATCH, await store.getEvents(MATCH)),
  );
  host = await ServerMatchHost.recover(MATCH, store, rebuilt);
  await host.restorePersistedViewerDeliveries();
  const next = socket();
  expect(await host.admitSocket(next, 'host')).not.toBeNull();
  await host.resumePendingEventPublications();
  await host.handleSessionJoin(next, 'host');
  return next;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'pai-driver-'));
  resetSQLiteService();
  resetUnitRepository();
  getSQLiteService({ path: path.join(dir, 'campaign.db') }).initialize();
  _resetProcessShadowStatsForTests();
  store = new DurableMatchStore({
    path: path.join(dir, 'matches.db'),
    capabilityDb: () => getSQLiteService().getDatabase(),
  });
  _setDefaultMatchStoreForTests(store);
});

afterEach(async () => {
  await host?.closeMatch();
  host = undefined;
  store.close();
  _resetCampaignHostRegistry();
  _resetDefaultMatchStore();
  resetUnitRepository();
  resetSQLiteService();
  _setCombatJournalAuthorityModeForTests(null);
  _resetProcessShadowStatsForTests();
  jest.restoreAllMocks();
  await rm(dir, { recursive: true, force: true });
});

describe.each([false, true])('CoopOpponentDriver authority=%s', (enabled) => {
  it('leaves a broken-store non-mission join with only its Close and no pause', async () => {
    const { hostSocket, guestSocket } = await fixture(enabled, 'versus');
    const before = await store.getEvents(MATCH);
    const driver = jest.spyOn(coopOpponentDriver, 'driveCoopOpponent');
    jest
      .spyOn(store, 'getMatchMeta')
      .mockRejectedValue(new Error('broken membership store'));

    await host!.handleSessionJoin(hostSocket, 'host');

    expect(hostSocket.frames).toEqual([
      expect.objectContaining({
        kind: 'Close',
        code: 'INTERNAL_ERROR',
        reason: 'membership verification unavailable',
      }),
    ]);
    expect(guestSocket.frames).toEqual([]);
    expect(host!.isPausedForReconnect()).toBe(false);
    expect(driver).not.toHaveBeenCalled();
    expect(await store.getEvents(MATCH)).toEqual(before);
  });

  it('does not trigger the driver after an unauthorized mission join', async () => {
    await fixture(enabled);
    const driver = jest.spyOn(coopOpponentDriver, 'driveCoopOpponent');
    const stranger = socket();
    const before = await store.getEvents(MATCH);

    await host!.handleSessionJoin(stranger, 'stranger');

    expect(stranger.frames).toEqual([
      expect.objectContaining({ kind: 'Close', code: 'AUTH_REJECTED' }),
    ]);
    expect(driver).not.toHaveBeenCalled();
    expect(host!.isPausedForReconnect()).toBe(false);
    expect(await store.getEvents(MATCH)).toEqual(before);
  });

  it('does not trigger the driver when the joining socket closes during replay', async () => {
    const { hostSocket } = await fixture(enabled);
    const driver = jest.spyOn(coopOpponentDriver, 'driveCoopOpponent');
    const send = hostSocket.send;
    jest.spyOn(hostSocket, 'send').mockImplementation((data) => {
      send(data);
      if ((JSON.parse(data) as IServerMessage).kind === 'ReplayEnd')
        hostSocket.readyState = 3;
    });
    const before = await store.getEvents(MATCH);

    await host!.handleSessionJoin(hostSocket, 'host');

    expect(hostSocket.readyState).toBe(3);
    expect(driver).not.toHaveBeenCalled();
    expect(host!.isPausedForReconnect()).toBe(false);
    expect(await store.getEvents(MATCH)).toEqual(before);
  });

  it('does not publish or latch pause when the engagement metadata read fails', async () => {
    const { hostSocket, guestSocket } = await fixture(enabled, 'versus');
    const before = await store.getEvents(MATCH);
    const run = coopOpponentDriver.driveCoopOpponent;
    const driver = jest
      .spyOn(coopOpponentDriver, 'driveCoopOpponent')
      .mockImplementation((input) => {
        // Inject after successful replay/admission, at the driver's own lookup.
        jest
          .spyOn(store, 'getMatchMeta')
          .mockRejectedValue(new Error('engagement lookup unavailable'));
        return run(input);
      });

    await host!.handleSessionJoin(hostSocket, 'host');

    expect(driver).toHaveBeenCalledTimes(1);
    expect(hostSocket.frames.map((frame) => frame.kind)).toEqual([
      'ReplayStart',
      'ReplayChunk',
      'ReplayEnd',
    ]);
    expect(guestSocket.frames).toEqual([]);
    expect(host!.isPausedForReconnect()).toBe(false);
    expect(await store.getEvents(MATCH)).toEqual(before);
  });

  it('advances player -> opponent -> player through the serialized host', async () => {
    const { hostSocket, guestSocket } = await fixture(enabled);
    const advance = await intent({ kind: 'AdvancePhase' }, 'start-movement');
    expect(advance.filter((frame) => frame.kind === 'Error')).toEqual([]);
    const before = host!.getSessionForTests().currentState;
    expect(before.phase).toBe(GamePhase.Movement);
    expect(before.firstMover).toBe(GameSide.Player);
    expect(before.units.opponent.lockState).toBe(LockState.Pending);
    const position = before.units['player-a'].position;
    const frames = await intent(
      {
        kind: 'Move',
        unitId: 'player-a',
        to: position,
        facing: 0,
        movementType: 'stationary',
      },
      'player-move',
    );
    expect(frames.filter((frame) => frame.kind === 'Error')).toEqual([]);
    const after = host!.getSessionForTests().currentState;
    expect(after.units['player-a'].lockState).toBe(LockState.Locked);
    expect(after.units.opponent.lockState).toBe(LockState.Locked);
    expect(after.units['player-b'].lockState).toBe(LockState.Pending);
    expect(after.activationIndex).toBe(2);
    const stored = await store.getEvents(MATCH);
    expect(
      stored.filter((event) => event.type === GameEventType.MovementLocked),
    ).toHaveLength(2);
    assertHidden(hostSocket.frames);
    assertHidden(guestSocket.frames);
    const receipt = await store.getLastCommandReceipt(MATCH);
    const base = stored.slice(0, receipt!.firstRevision);
    const branchId =
      store.readEffectiveHead({ streamType: 'match', streamId: MATCH })
        ?.branchId ?? 'main';
    const effectiveGeneration =
      store.readEffectiveHead({ streamType: 'match', streamId: MATCH })
        ?.effectiveGeneration ?? 1;
    const expectedId =
      'coop-ai:' +
      createHash('sha256')
        .update(
          JSON.stringify([
            MATCH,
            branchId,
            base.length,
            effectiveGeneration,
            'opponent',
          ]),
        )
        .digest('hex');
    expect(receipt!.commandId).toBe(expectedId);
    expect(receipt!.actorId).toBe('server:coop-opponent');
    const replayHash = digestCommandPostState(foldMatchSession(MATCH, stored));
    expect(replayHash).toBe(digestCommandPostState(host!.getSessionForTests()));
    const reopened = await coldReopen();
    expect(await store.getEvents(MATCH)).toEqual(stored);
    expect(digestCommandPostState(host!.getSessionForTests())).toBe(replayHash);
    assertHidden(reopened.frames);
    if (process.env.PAI_EVIDENCE_DIR)
      await writeFile(
        path.join(process.env.PAI_EVIDENCE_DIR, `outcome-${enabled}.json`),
        JSON.stringify(
          {
            commandId: expectedId,
            receipt,
            events: stored,
            replayHash,
            hostFrames: hostSocket.frames,
            guestFrames: guestSocket.frames,
            reopenFrames: reopened.frames,
          },
          null,
          2,
        ),
      );
  });

  it('takes one opposing activation in each action phase and preserves the captured dice roller', async () => {
    await fixture(enabled, 'mission', 9);
    const expectedLocks = [
      GameEventType.MovementLocked,
      GameEventType.AttackLocked,
      GameEventType.PhysicalAttackLocked,
    ];
    for (let phase = 0; phase < expectedLocks.length; phase += 1) {
      const before = (await store.getEvents(MATCH)).length;
      const messages = await intent({ kind: 'AdvancePhase' }, `phase-${phase}`);
      expect(messages.filter((frame) => frame.kind === 'Error')).toEqual([]);
      const events = await store.getEvents(MATCH, before);
      expect(
        events.filter(
          (event) =>
            event.type === expectedLocks[phase] && event.actorId === 'opponent',
        ),
      ).toHaveLength(1);
      expect(host!.getSessionForTests().currentState.activationIndex).toBe(1);
    }
    for (let phase = 3; phase < 6; phase += 1)
      await intent({ kind: 'AdvancePhase' }, `phase-${phase}`);
    const before = (await store.getEvents(MATCH)).length;
    await intent({ kind: 'AdvancePhase' }, 'next-initiative');
    const rollEvent = (await store.getEvents(MATCH, before)).find(
      (event) => event.type === GameEventType.InitiativeRolled,
    );
    expect(
      (rollEvent!.payload as { rolls: number[] }).rolls.length,
    ).toBeGreaterThanOrEqual(4);
  });

  it('reconstructs the same seeded decision when the process stops before the AI append', async () => {
    const { bootstrap } = await fixture(enabled);
    await intent({ kind: 'AdvancePhase' }, 'start-movement');
    const read = store.getCommandReceipt;
    let commandId = '';
    const interrupted = jest
      .spyOn(store, 'getCommandReceipt')
      .mockImplementation(async (matchId, id) => {
        if (id.startsWith('coop-ai:')) {
          commandId = id;
          throw new Error('injected-before-decision');
        }
        return read(matchId, id);
      });
    await playerMove();
    interrupted.mockRestore();
    expect(commandId.startsWith('coop-ai:')).toBe(true);
    const prefix = await store.getEvents(MATCH);
    const reference = InteractiveSession.fromHydratedSession(
      foldMatchSession(MATCH, prefix),
      {
        random: new SeededRandom(parseInt(commandId.slice(8, 16), 16)),
        playerUnits: bootstrap.playerUnits,
        opponentUnits: bootstrap.opponentUnits,
        suppressOutcomePublication: true,
      },
    );
    reference.runAITurn(GameSide.Opponent, 'opponent');
    await coldReopen();
    const guest = socket();
    await host!.admitSocket(guest, 'guest');
    await host!.handleSessionJoin(guest, 'guest');
    const actual = (await store.getEvents(MATCH)).slice(prefix.length);
    const normalize = (events: readonly IGameEvent[]) =>
      events.map((event) => {
        const payload = { ...(event.payload as Record<string, unknown>) };
        delete payload.intentId;
        return {
          type: event.type,
          sequence: event.sequence,
          turn: event.turn,
          phase: event.phase,
          actorId: event.actorId,
          payload,
        };
      });
    expect(normalize(actual)).toEqual(
      normalize(reference.getSession().events.slice(prefix.length)),
    );
    expect((await store.getLastCommandReceipt(MATCH))!.commandId).toBe(
      commandId,
    );
    expect(digestCommandPostState(host!.getSessionForTests())).toBe(
      digestCommandPostState(reference.getSession()),
    );
    assertHidden(guest.frames);
  });

  it('ignores duplicate state signals and redelivery', async () => {
    const { hostSocket } = await fixture(enabled);
    await intent({ kind: 'AdvancePhase' }, 'start-movement');
    await playerMove();
    const events = await store.getEvents(MATCH);
    expect(opponentLocks(events)).toHaveLength(1);
    await Promise.all([
      host!.handleSessionJoin(hostSocket, 'host'),
      host!.handleSessionJoin(hostSocket, 'host'),
      playerMove(),
    ]);
    expect(await store.getEvents(MATCH)).toEqual(events);
    assertHidden(hostSocket.frames);
  });

  it('resumes a persisted-before-broadcast batch on cold reopen without executing it twice', async () => {
    await fixture(enabled);
    await intent({ kind: 'AdvancePhase' }, 'start-movement');
    const append = store.appendCommandBatch;
    const commits = jest
      .spyOn(store, 'appendCommandBatch')
      .mockImplementation(async (matchId, batch) => {
        const result = await append(matchId, batch);
        if (batch.commandId.startsWith('coop-ai:'))
          throw new Error('injected-after-persist');
        return result;
      });
    await playerMove();
    commits.mockRestore();
    const events = await store.getEvents(MATCH);
    expect(opponentLocks(events)).toHaveLength(1);
    expect((await store.listPendingPublications(MATCH)).length).toBeGreaterThan(
      0,
    );
    const reopened = await coldReopen();
    expect(await store.getEvents(MATCH)).toEqual(events);
    expect(await store.listPendingPublications(MATCH)).toEqual([]);
    assertHidden(reopened.frames);
  });

  it('stops advancement after an opponent batch storage failure', async () => {
    const { hostSocket } = await fixture(enabled);
    await intent({ kind: 'AdvancePhase' }, 'start-movement');
    const append = store.appendCommandBatch;
    const commits = jest
      .spyOn(store, 'appendCommandBatch')
      .mockImplementation(async (matchId, batch) => {
        if (batch.commandId.startsWith('coop-ai:'))
          throw new Error('injected-store-failure');
        return append(matchId, batch);
      });
    const frames = await playerMove();
    expect(
      frames.some(
        (frame) => frame.kind === 'Error' && frame.code === 'STORE_FAILURE',
      ),
    ).toBe(true);
    const events = await store.getEvents(MATCH);
    expect(opponentLocks(events)).toEqual([]);
    expect(
      host!.getSessionForTests().currentState.units.opponent.lockState,
    ).toBe(LockState.Pending);
    commits.mockRestore();
    await host!.handleSessionJoin(hostSocket, 'host');
    expect(await store.getEvents(MATCH)).toEqual(events);
    expect(host!.isPausedForReconnect()).toBe(true);
    assertHidden(hostSocket.frames);
  });

  it.each(['branchId', 'effectiveGeneration'] as const)(
    'refuses work invalidated by a stale %s',
    async (field) => {
      await fixture(enabled);
      await intent({ kind: 'AdvancePhase' }, 'start-movement');
      const read = store.getCommandReceipt;
      let signalled = false;
      const head = store.readEffectiveHead;
      jest
        .spyOn(store, 'getCommandReceipt')
        .mockImplementation(async (matchId, commandId) => {
          const result = await read(matchId, commandId);
          if (commandId.startsWith('coop-ai:')) {
            signalled = true;
            jest
              .spyOn(store, 'readEffectiveHead')
              .mockImplementation((stream) => {
                const before = head(stream) ?? {
                  streamType: 'match' as const,
                  streamId: MATCH,
                  branchId: 'main',
                  revision: host!.getSessionForTests().events.length,
                  effectiveGeneration: 1,
                  installedAt: AT,
                  digest: '',
                };
                return {
                  ...before,
                  [field]:
                    field === 'branchId'
                      ? 'rewound'
                      : before.effectiveGeneration + 1,
                };
              });
          }
          return result;
        });
      await playerMove();
      expect(signalled).toBe(true);
      expect(opponentLocks(await store.getEvents(MATCH))).toEqual([]);
      expect(
        host!.getSessionForTests().currentState.units.opponent.lockState,
      ).toBe(LockState.Pending);
    },
  );

  it.each(['host', 'guest'] as const)(
    'pauses on %s disconnect without granting opponent control',
    async (playerId) => {
      const { hostSocket, guestSocket } = await fixture(enabled);
      await intent({ kind: 'AdvancePhase' }, 'start-movement');
      const survivor = playerId === 'host' ? guestSocket : hostSocket;
      const paused = survivor.onKind('MatchPaused');
      host!.detachSocket(playerId === 'host' ? hostSocket : guestSocket);
      await paused;
      expect(host!.isPausedForReconnect()).toBe(true);
      const before = await store.getEvents(MATCH);
      await playerMove();
      expect(await store.getEvents(MATCH)).toEqual(before);
      expect((await store.getMatchMeta(MATCH)).hostPlayerId).toBe('host');
      expect(opponentLocks(before)).toEqual([]);
      assertHidden(survivor.frames);
    },
  );

  it('rejects forged client AI authority and opponent-unit commands without triggering the driver', async () => {
    await fixture(enabled);
    await intent({ kind: 'AdvancePhase' }, 'start-movement');
    const forged = {
      kind: 'Intent',
      matchId: MATCH,
      ts: AT,
      playerId: 'host',
      intentId: 'forged',
      intent: {
        kind: 'RunAITurn',
        side: 'opponent',
        unitId: 'opponent',
        internalAuthority: true,
      },
    };
    expect(IntentSchema.safeParse(forged).success).toBe(false);
    const before = await store.getEvents(MATCH);
    const unit = host!.getSessionForTests().currentState.units.opponent;
    const result = await intent(
      {
        kind: 'Move',
        unitId: 'opponent',
        to: unit.position,
        facing: 0,
        movementType: 'stationary',
      },
      'forged-move',
    );
    expect(
      result.some(
        (frame) => frame.kind === 'Error' && frame.code === 'AUTH_REJECTED',
      ),
    ).toBe(true);
    expect(await store.getEvents(MATCH)).toEqual(before);
  });

  it('honors campaign GM loss during a decision and resumes only on that GM reconnect', async () => {
    const entry = await getCampaignHostRegistry().register('campaign-vessel', {
      campaignId: 'campaign',
      hostPlayerId: 'host',
      roomCode: 'ABC234',
      state: createEmptyCampaignState('campaign'),
    });
    entry.syncSession.noteGmConnected();
    const { hostSocket } = await fixture(enabled);
    await intent({ kind: 'AdvancePhase' }, 'start-movement');
    const read = store.getCommandReceipt;
    const receipt = jest
      .spyOn(store, 'getCommandReceipt')
      .mockImplementation(async (matchId, commandId) => {
        const prior = await read(matchId, commandId);
        if (commandId.startsWith('coop-ai:'))
          entry.syncSession.noteGmDisconnected();
        return prior;
      });
    await playerMove();
    receipt.mockRestore();
    expect(opponentLocks(await store.getEvents(MATCH))).toEqual([]);
    expect(host!.isPausedForReconnect()).toBe(true);
    const append = store.appendCommandBatch;
    let committed!: () => void;
    const signal = new Promise<void>((resolve) => {
      committed = resolve;
    });
    jest
      .spyOn(store, 'appendCommandBatch')
      .mockImplementation(async (matchId, batch) => {
        const result = await append(matchId, batch);
        if (batch.commandId.startsWith('coop-ai:')) committed();
        return result;
      });
    entry.syncSession.noteGmConnected();
    await bounded(signal);
    await host!.handleSessionJoin(hostSocket, 'host');
    expect(opponentLocks(await store.getEvents(MATCH))).toHaveLength(1);
  });

  it('rejects reserved internal command identities from a player', async () => {
    await fixture(enabled);
    const before = await store.getEvents(MATCH);
    const result = await intent({ kind: 'AdvancePhase' }, 'coop-ai:forged');
    expect(
      result.some(
        (frame) => frame.kind === 'Error' && frame.code === 'AUTH_REJECTED',
      ),
    ).toBe(true);
    expect(await store.getEvents(MATCH)).toEqual(before);
  });

  it.each(['close', 'disconnect'] as const)(
    'invalidates an in-flight decision on %s',
    async (action) => {
      const { guestSocket, hostSocket } = await fixture(enabled);
      await intent({ kind: 'AdvancePhase' }, 'start-movement');
      const paused =
        action === 'disconnect'
          ? hostSocket.onKind('MatchPaused')
          : Promise.resolve();
      const read = store.getCommandReceipt;
      let observed = false;
      jest
        .spyOn(store, 'getCommandReceipt')
        .mockImplementation(async (matchId, commandId) => {
          const prior = await read(matchId, commandId);
          if (commandId.startsWith('coop-ai:')) {
            observed = true;
            if (action === 'close') await host!.closeMatch();
            else host!.detachSocket(guestSocket);
          }
          return prior;
        });
      await playerMove();
      expect(observed).toBe(true);
      await paused;
      expect(opponentLocks(await store.getEvents(MATCH))).toEqual([]);
    },
  );

  it.each(['versus', 'vessel'] as const)(
    'does not engage for a %s',
    async (scope) => {
      await fixture(enabled, scope);
      await intent({ kind: 'AdvancePhase' }, 'start-movement');
      await playerMove();
      expect(opponentLocks(await store.getEvents(MATCH))).toEqual([]);
      expect(
        host!.getSessionForTests().currentState.units.opponent.lockState,
      ).toBe(LockState.Pending);
    },
  );

  it('can invoke the existing engine AI for the eligible opposing unit without changing engine guards', async () => {
    const { bootstrap } = await fixture(enabled);
    await intent({ kind: 'AdvancePhase' }, 'start-movement');
    const state = host!.getSessionForTests().currentState;
    await intent(
      {
        kind: 'Move',
        unitId: 'player-a',
        to: state.units['player-a'].position,
        facing: 0,
        movementType: 'stationary',
      },
      'player-move',
    );
    const scratch = InteractiveSession.fromHydratedSession(
      host!.getSessionForTests(),
      {
        random: new SeededRandom(9),
        playerUnits: bootstrap.playerUnits,
        opponentUnits: bootstrap.opponentUnits,
        suppressOutcomePublication: true,
      },
    );
    scratch.runAITurn(GameSide.Opponent, 'opponent');
    expect(scratch.getState().units.opponent.lockState).toBe(LockState.Locked);
  });
});
