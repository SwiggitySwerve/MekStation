/**
 * B14-0 fog containment at the combat host boundary.
 *
 * Until a per-viewer reveal projection exists, fog-on (or unknown-config)
 * matches refuse private battle state to every audience before any
 * baseline, event or replay byte, with the fixed fog-projection-unavailable
 * reason and WS 1008. Membership is verified first; fog-off delivery,
 * including two same-side players plus a non-playing GM, is unchanged.
 *
 * @spec openspec/specs/fog-of-war/spec.md
 */

import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GamePhase,
  GameSide,
  Facing,
  MovementType,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';

import { connect, type IClientWebSocket } from '../../client';
import {
  matchLacksRevealProjection,
  noPerViewerRevealProjection,
  refuseFogSocket,
} from '../fogMatchAdmission';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

/**
 * The legacy-filter availability seam, byte for byte (B14-0A/B14-0B). Only
 * these 14 suites may carry it; each must (CF-B14B-1). The FOG chain shrinks
 * this list when a real per-viewer reveal projection lands (CF-B14B-3).
 */
// Spelled through JEST so this file is not itself read as a seam.
const JEST = 'jest';
const CANONICAL_SEAM = [
  '// B14 seam: this suite pins the existing per-viewer fog filter beneath the',
  '// B14 refusal. Production has no per-viewer reveal projection and refuses.',
  `${JEST}.mock('@/lib/multiplayer/server/fogMatchAdmission', () => ({`,
  `  ...${JEST}.requireActual<`,
  "    typeof import('@/lib/multiplayer/server/fogMatchAdmission')",
  "  >('@/lib/multiplayer/server/fogMatchAdmission'),",
  '  noPerViewerRevealProjection: () => false,',
  '  matchLacksRevealProjection: async () => false,',
  '}));',
].join('\n');
const B14_SEAM_ALLOWLIST = [
  'src/lib/multiplayer/server/__tests__/CoopOpponentDriver.test.ts',
  'src/lib/multiplayer/server/__tests__/customCombatRecovery.recoveryDelivery.test.ts',
  'src/lib/multiplayer/server/__tests__/customConstructionTransport.test.ts',
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.fogOfWarIntegration.test.ts',
  'src/lib/multiplayer/server/__tests__/viewerFrameRawNegativeSweep.test.ts',
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.rewindLiveReplay.test.ts',
  'src/lib/multiplayer/__tests__/clientAgainstFogServer.integration.test.ts',
  'src/lib/multiplayer/server/__tests__/viewerFrameAuthorityFieldLeak.test.ts',
  'src/lib/multiplayer/server/__tests__/ServerMatchHostCommandResults.test.ts',
  'src/lib/multiplayer/server/__tests__/viewerSequenceConcealmentLeak.test.ts',
  'src/lib/multiplayer/server/__tests__/matchmaking.integration.test.ts',
  'src/lib/multiplayer/server/__tests__/viewerDeliverySequence.test.ts',
  'src/lib/multiplayer/server/__tests__/ServerMatchHost.spectator.test.ts',
  'src/lib/multiplayer/server/__tests__/fogViewerSequenceSparsity.test.ts',
] as const;
/** Test files that may name the capability module at all. */
const B14_CAPABILITY_REFERENCES = [
  ...B14_SEAM_ALLOWLIST,
  'src/lib/multiplayer/server/__tests__/b14FogContainment.test.ts',
  'src/pages-modules/api/__tests__/matchHistoryFog.test.ts',
];

function sealedDeclaration(
  type: GameEventType.MovementDeclared | GameEventType.AttackDeclared,
  unitId: string,
  sequence: number,
): IGameEvent {
  const movement = type === GameEventType.MovementDeclared;
  return {
    id: `evt-sealed-${type}-${unitId}-${sequence}`,
    gameId: 'match-spectator',
    sequence,
    timestamp: '2026-05-01T00:00:00.000Z',
    type,
    turn: 1,
    phase: movement ? GamePhase.Movement : GamePhase.WeaponAttack,
    actorId: unitId,
    visibility: 'actor-only',
    payload: movement
      ? {
          unitId,
          from: { q: 0, r: 0 },
          to: { q: 11, r: -4 },
          facing: Facing.North,
          movementType: MovementType.Walk,
          mpUsed: 3,
          heatGenerated: 1,
        }
      : {
          attackerId: unitId,
          targetId: 'opp-0',
          weapons: ['sealed-weapon-mark'],
          toHitNumber: 8,
          modifiers: [],
        },
  } as IGameEvent;
}

function replayedIds(socket: { sent: IRecordedSend[] }): string[] {
  return socket.sent.flatMap((row) =>
    row.parsed.kind === 'ReplayChunk'
      ? (row.parsed.events as readonly { readonly id?: string }[]).map(
          (event) => event.id ?? '',
        )
      : [],
  );
}

/** A real multiplayer client over a scripted socket. */
function scriptedClientSocket() {
  const sockets: (IClientWebSocket & {
    inject(message: unknown): void;
    fireOpen(): void;
  })[] = [];
  const factory = (): IClientWebSocket => {
    const socket: IClientWebSocket & {
      inject(message: unknown): void;
      fireOpen(): void;
    } = {
      readyState: 1,
      onopen: null,
      onmessage: null,
      onerror: null,
      onclose: null,
      send() {},
      close() {
        socket.readyState = 3;
        socket.onclose?.({});
      },
      inject(message: unknown) {
        socket.onmessage?.({ data: JSON.stringify(message) });
      },
      fireOpen() {
        socket.onopen?.({});
      },
    };
    sockets.push(socket);
    return socket;
  };
  return { factory, sockets };
}

interface IRecordedSend {
  parsed: IServerMessage;
}

function makeSocket(): IMatchSocket & {
  sent: IRecordedSend[];
  closes: unknown[][];
} {
  const sent: IRecordedSend[] = [];
  let closed = false;
  const closes: unknown[][] = [];
  return {
    send(data: string) {
      sent.push({ parsed: JSON.parse(data) as IServerMessage });
    },
    close(...args: unknown[]) {
      if (closed) return;
      closes.push(args);
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    sent,
    closes,
  } as IMatchSocket & { sent: IRecordedSend[]; closes: unknown[][] };
}

function makeUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: `${id}-pilot`,
    gunnery: 4,
    piloting: 5,
  };
}

function publicPhaseEvent(sequence: number): IGameEvent {
  return {
    id: `evt-phase-${sequence}`,
    gameId: 'match-spectator',
    sequence,
    timestamp: '2026-05-01T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    visibility: 'public',
    payload: { phase: GamePhase.Movement } as never,
  } as IGameEvent;
}

/**
 * Build an `active` host whose seat roster has a spectator appended.
 */
async function makeHostWithSpectator(fogOfWar: boolean) {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-spectator';
  const now = '2026-05-01T00:00:00.000Z';
  let seats: IMatchSeat[] = defaultSeats('1v1');
  seats = seats.map((s, i) =>
    i === 0
      ? { ...s, occupant: { playerId: 'pid_host', displayName: 'Host' } }
      : { ...s, occupant: { playerId: 'pid_opp', displayName: 'Opp' } },
  );
  seats = addSpectatorSeat(seats, {
    playerId: 'pid_watcher',
    displayName: 'Watcher',
  });
  await store.createMatch({
    matchId,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_opp'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_opp', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 25, turnLimit: 5, fogOfWar },
    layout: '1v1',
    seats,
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 25,
    turnLimit: 5,
    random: new SeededRandom(1),
    grid: createMinimalGrid(25),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [
      makeUnit('player-scout', GameSide.Player),
      ...Array.from({ length: 4 }, (_, i) =>
        makeUnit(`opp-${i}`, GameSide.Opponent),
      ),
    ],
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store, matchId };
}

function broadcast(host: ServerMatchHost, event: IGameEvent): Promise<void> {
  const fn = (
    host as unknown as {
      broadcastEvent(message: IEventMessage): Promise<void>;
    }
  ).broadcastEvent.bind(host);
  return fn({
    kind: 'Event',
    matchId: 'match-spectator',
    ts: '2026-05-01T00:00:00.000Z',
    event,
  });
}

describe('B14-0 fog containment', () => {
  it('legacy stale peer metadata cannot reveal fog policy to a non-member', async () => {
    const { host } = await makeHostWithSpectator(true);
    const channel = {
      broadcastReplayStream: jest.fn(),
      broadcastRejection: jest.fn(),
      broadcastReconnectReject: jest.fn(),
    };
    await host.handleReconnectRequest(
      {
        matchId: 'match-spectator',
        lastLocalSeq: -1,
        authorPeerId: 'stranger',
      } as never,
      channel as never,
      {
        getMatchMetadata: async () => ({
          hostPeerId: 'pid_host',
          guestPeerId: 'stranger',
        }),
      } as never,
    );
    expect(
      JSON.stringify(channel.broadcastReconnectReject.mock.calls),
    ).not.toContain('fog-projection');
    expect(channel.broadcastReplayStream).not.toHaveBeenCalled();
  });
  it('detaches and closes even if terminal refusal send fails', async () => {
    const { host } = await makeHostWithSpectator(true);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');
    const send = jest.spyOn(sock, 'send').mockImplementation(() => {
      throw Error('closed write');
    });
    await expect(
      broadcast(host, publicPhaseEvent(55)),
    ).resolves.toBeUndefined();
    expect(sock.closes).toEqual([[1008, 'fog-projection-unavailable']]);
    await broadcast(host, publicPhaseEvent(56));
    expect(send).toHaveBeenCalledTimes(1);
  });
  afterEach(() => jest.restoreAllMocks());
  it.each(['pid_host', 'pid_opp', 'pid_watcher'])(
    'refuses fog admission for %s before bytes',
    async (player) => {
      const { host } = await makeHostWithSpectator(true);
      const sock = makeSocket();
      expect(await host.admitSocket(sock, player)).toBeNull();
      expect(sock.sent.map((s) => s.parsed.kind)).toEqual(['Close']);
      expect(JSON.stringify(sock.sent)).toContain('fog-projection-unavailable');
      expect(sock.closes).toEqual([[1008, 'fog-projection-unavailable']]);
      expect(JSON.stringify(sock.sent)).not.toMatch(
        /opp-\d|player-scout|gunnery|piloting|unitRef|pilotRef|digest|"q"|"r"/,
      );
    },
  );
  it('refuses fog admission for same-side players', async () => {
    const { host, store, matchId } = await makeHostWithSpectator(true);
    await store.updateMatchMeta(matchId, {
      sideAssignments: [
        { playerId: 'pid_host', side: 'player' },
        { playerId: 'pid_opp', side: 'player' },
      ],
    } as never);
    for (const id of ['pid_host', 'pid_opp']) {
      const sock = makeSocket();
      expect(await host.admitSocket(sock, id)).toBeNull();
      expect(sock.sent.map((s) => s.parsed.kind)).toEqual(['Close']);
      expect(sock.closes).toEqual([[1008, 'fog-projection-unavailable']]);
    }
  });
  it('classifies an unreadable live config as infrastructure: 1011, no delivery', async () => {
    const { host, store } = await makeHostWithSpectator(false);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');
    const original = store.getMatchMeta.bind(store);
    let calls = 0;
    jest.spyOn(store, 'getMatchMeta').mockImplementation(async (id) => {
      calls += 1;
      // The publication config read fails; membership reads still succeed.
      if (calls === 1) throw new Error('private-config-secret');
      return original(id);
    });
    await broadcast(host, publicPhaseEvent(55));
    expect(sock.sent.map((s) => s.parsed)).toEqual([
      expect.objectContaining({
        kind: 'Error',
        code: 'INTERNAL_ERROR',
        reason: 'match configuration unavailable',
      }),
    ]);
    expect(JSON.stringify(sock.sent)).not.toMatch(/private-config|fog/);
    expect(sock.closes).toEqual([[1011, 'match configuration unavailable']]);
  });
  it('refuses a readable but unknown config with the fog policy (1008)', async () => {
    const { host, store } = await makeHostWithSpectator(false);
    const original = store.getMatchMeta.bind(store);
    jest.spyOn(store, 'getMatchMeta').mockImplementation(async (id) => ({
      ...(await original(id)),
      config: undefined as never,
    }));
    const admitted = makeSocket();
    expect(await host.admitSocket(admitted, 'pid_host')).toBeNull();
    expect(admitted.closes).toEqual([[1008, 'fog-projection-unavailable']]);
    const live = makeSocket();
    host.attachSocket(live, 'pid_opp');
    await broadcast(host, publicPhaseEvent(58));
    expect(live.closes).toEqual([[1008, 'fog-projection-unavailable']]);
  });
  it('classifies an unreadable config after membership at admission as 1011', async () => {
    // Count the reads of a successful admission; its last read is the config.
    const probe = await makeHostWithSpectator(false);
    const probeRead = probe.store.getMatchMeta.bind(probe.store);
    let reads = 0;
    jest.spyOn(probe.store, 'getMatchMeta').mockImplementation(async (id) => {
      reads += 1;
      return probeRead(id);
    });
    expect(
      await probe.host.admitSocket(makeSocket(), 'pid_host'),
    ).not.toBeNull();
    const { host, store } = await makeHostWithSpectator(true);
    const original = store.getMatchMeta.bind(store);
    let calls = 0;
    jest.spyOn(store, 'getMatchMeta').mockImplementation(async (id) => {
      calls += 1;
      if (calls >= reads) throw new Error('private-config-secret');
      return original(id);
    });
    const sock = makeSocket();
    expect(await host.admitSocket(sock, 'pid_host')).toBeNull();
    expect(sock.sent.map((s) => s.parsed.kind)).toEqual(['Error']);
    expect(sock.closes).toEqual([[1011, 'match configuration unavailable']]);
    expect(JSON.stringify(sock.sent)).not.toMatch(/private-config|fog/);
  });
  it('answers an unreadable legacy reconnect config generically without replay', async () => {
    const { host, store } = await makeHostWithSpectator(true);
    // Only the config read fails; the member's durable seat still resolves.
    jest
      .spyOn(store, 'getMatchMeta')
      .mockRejectedValueOnce(new Error('private-config-secret'));
    const channel = {
      broadcastReplayStream: jest.fn(),
      broadcastRejection: jest.fn(),
      broadcastReconnectReject: jest.fn(),
    };
    await host.handleReconnectRequest(
      {
        matchId: 'match-spectator',
        lastLocalSeq: -1,
        authorPeerId: 'pid_opp',
      } as never,
      channel as never,
      {
        getMatchMetadata: async () => ({
          hostPeerId: 'pid_host',
          guestPeerId: 'pid_opp',
        }),
      } as never,
    );
    expect(channel.broadcastReplayStream).not.toHaveBeenCalled();
    expect(channel.broadcastReconnectReject.mock.calls).toEqual([
      [{ matchId: 'match-spectator', reason: 'Match in progress' }],
    ]);
  });
  it('reports projection availability as false and refusals by kind', async () => {
    const meta = (config: unknown) => ({
      getMatchMeta: async () => ({ config }) as never,
    });
    await expect(
      matchLacksRevealProjection(meta({ fogOfWar: false }), 'm'),
    ).resolves.toBe(false);
    await expect(matchLacksRevealProjection(meta({}), 'm')).resolves.toBe(
      false,
    );
    await expect(
      matchLacksRevealProjection(meta({ fogOfWar: true }), 'm'),
    ).resolves.toBe('policy');
    await expect(
      matchLacksRevealProjection(meta(undefined), 'm'),
    ).resolves.toBe('policy');
    await expect(
      matchLacksRevealProjection(
        {
          getMatchMeta: async () => {
            throw new Error('down');
          },
        },
        'm',
      ),
    ).resolves.toBe('unavailable');
  });
  it('pins the byte-exact seam in exactly the 14 registered suites and nowhere else', () => {
    const repo = path.resolve(__dirname, '../../../../..');
    const tests = new Map<string, string>();
    const walk = (dir: string, inTests: boolean): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(full, inTests || entry.name === '__tests__');
        } else if (
          /\.[cm]?[jt]sx?$/.test(entry.name) &&
          (inTests || /\.(test|spec)\./.test(entry.name))
        ) {
          tests.set(
            path.relative(repo, full).split(path.sep).join('/'),
            readFileSync(full, 'utf8').replace(/\r\n/g, '\n'),
          );
        }
      }
    };
    walk(path.join(repo, 'src'), false);
    for (const file of B14_SEAM_ALLOWLIST) {
      const text = tests.get(file) ?? '';
      expect([file, text.split(CANONICAL_SEAM).length - 1]).toEqual([file, 1]);
      expect(text.replace(CANONICAL_SEAM, '')).not.toContain(
        'fogMatchAdmission',
      );
    }
    const naming = [...tests]
      .filter(([, text]) => text.includes('fogMatchAdmission'))
      .map(([file]) => file)
      .sort();
    expect(naming).toEqual([...B14_CAPABILITY_REFERENCES].sort());
    // A computed module path (R9) or an export spy would evade the above.
    const computed =
      /jest\.(?:mock|doMock|unstable_mockModule|setMock)\((?:(?=\s*[^\s'"])|\s*(?:'[^'\n]*'|"[^"\n]*")\s*(?![\s,)]))/;
    const spied =
      /jest\.spyOn\([^)]*['"](?:noPerViewerRevealProjection|matchLacksRevealProjection|refuseFogSocket)['"]/;
    expect(
      [...tests].filter(([, t]) => computed.test(t) || spied.test(t)),
    ).toEqual([]);
    for (const file of [
      'jest.config.js',
      'jest.setup.js',
      'jest.setup.a11y.ts',
    ]) {
      expect(readFileSync(path.join(repo, file), 'utf8')).not.toContain(
        'fogMatchAdmission',
      );
    }
  });
  it('runs against the real capability module, whose shape the seams match', async () => {
    const actual = jest.requireActual<typeof import('../fogMatchAdmission')>(
      '../fogMatchAdmission',
    );
    expect(jest.isMockFunction(noPerViewerRevealProjection)).toBe(false);
    expect(jest.isMockFunction(matchLacksRevealProjection)).toBe(false);
    expect(jest.isMockFunction(refuseFogSocket)).toBe(false);
    expect(noPerViewerRevealProjection).toBe(
      actual.noPerViewerRevealProjection,
    );
    expect(matchLacksRevealProjection).toBe(actual.matchLacksRevealProjection);
    expect(refuseFogSocket).toBe(actual.refuseFogSocket);
    // The seam overrides type-check against the real exports.
    const seamPredicate: typeof noPerViewerRevealProjection = () => false;
    const seamDecision: typeof matchLacksRevealProjection = async () => false;
    expect(seamPredicate(undefined)).toBe(false);
    await expect(
      seamDecision({ getMatchMeta: async () => ({}) as never }, 'm'),
    ).resolves.toBe(false);
  });
  it('lets the client retry an unreadable config but not a policy refusal', () => {
    jest.useFakeTimers();
    try {
      const outcome = (['unavailable', 'policy'] as const).map((refusal) => {
        const server = makeSocket();
        refuseFogSocket(server, 'm1', refusal);
        const scripted = scriptedClientSocket();
        const reconnects: unknown[] = [];
        const client = connect(
          'ws://localhost/x',
          'm1',
          { playerId: 'pid_opp', token: 'tok' },
          { socketFactory: scripted.factory, reconnect: true },
        );
        client.on('reconnect', (info) => reconnects.push(info));
        scripted.sockets[0].fireOpen();
        for (const row of server.sent) scripted.sockets[0].inject(row.parsed);
        if (server.closes.length > 0) scripted.sockets[0].close();
        const result = {
          refusal,
          kinds: server.sent.map((row) => row.parsed.kind),
          close: server.closes,
          reconnects: reconnects.length,
        };
        client.close();
        return result;
      });
      expect(outcome).toEqual([
        {
          refusal: 'unavailable',
          kinds: ['Error'],
          close: [[1011, 'match configuration unavailable']],
          reconnects: 1,
        },
        {
          refusal: 'policy',
          kinds: ['Close'],
          close: [[1008, 'fog-projection-unavailable']],
          reconnects: 0,
        },
      ]);
    } finally {
      jest.useRealTimers();
    }
  });
  it('CF-S-2: an unreadable live config withholds nothing the actor gets back on resume', async () => {
    const { host, store, matchId } = await makeHostWithSpectator(false);
    const actor = makeSocket();
    const other = makeSocket();
    host.attachSocket(actor, 'pid_opp');
    host.attachSocket(other, 'pid_host');
    const declaration = sealedDeclaration(
      GameEventType.MovementDeclared,
      'opp-0',
      60,
    );
    await store.appendEvent(matchId, declaration);
    const original = store.getMatchMeta.bind(store);
    let calls = 0;
    const read = jest
      .spyOn(store, 'getMatchMeta')
      .mockImplementation(async (id) => {
        calls += 1;
        // The publication config read fails; membership reads succeed.
        if (calls === 1) throw new Error('private-config-secret');
        return original(id);
      });
    await broadcast(host, declaration);
    for (const socket of [actor, other]) {
      expect(socket.sent.map((row) => row.parsed.kind)).toEqual(['Error']);
      expect(socket.closes).toEqual([
        [1011, 'match configuration unavailable'],
      ]);
      expect(JSON.stringify(socket.sent)).not.toMatch(
        /evt-sealed|private-config|fog/,
      );
    }
    read.mockRestore();
    // The client reconnects; nothing was numbered, so the resume replays it.
    const resumed = makeSocket();
    await host.sendReplay(resumed, 0, 'pid_opp');
    expect(replayedIds(resumed)).toContain(declaration.id);
    const opponent = makeSocket();
    await host.sendReplay(opponent, 0, 'pid_host');
    expect(replayedIds(opponent)).not.toContain(declaration.id);
    expect(opponent.sent.map((row) => row.parsed.kind)).toContain('ReplayEnd');
  });
  it('CF-S-3: no fog-on audience receives a declaration, revealed or not', async () => {
    const { host, store, matchId } = await makeHostWithSpectator(true);
    const declaration = sealedDeclaration(
      GameEventType.AttackDeclared,
      'player-scout',
      61,
    );
    await store.appendEvent(matchId, declaration);
    for (const viewer of ['pid_opp', 'pid_watcher']) {
      const live = makeSocket();
      host.attachSocket(live, viewer);
      await broadcast(host, declaration);
      const replay = makeSocket();
      await host.sendReplay(replay, 0, viewer);
      for (const socket of [live, replay]) {
        expect(socket.sent.map((row) => row.parsed.kind)).toEqual(['Close']);
        expect(JSON.stringify(socket.sent)).not.toMatch(
          /sealed-weapon-mark|player-scout|evt-sealed/,
        );
      }
    }
  });
  it('refuses fog-on join and replay before any event read', async () => {
    for (const mode of ['join', 'replay', 'legacy'] as const) {
      const { host, store } = await makeHostWithSpectator(true);
      const reads = jest.spyOn(store, 'getEvents');
      const socket = makeSocket();
      host.attachSocket(socket, 'pid_host');
      if (mode === 'join') await host.handleSessionJoin(socket, 'pid_host');
      else
        await host.sendReplay(
          socket,
          0,
          mode === 'legacy' ? undefined : 'pid_host',
        );
      expect(socket.sent.map((row) => row.parsed.kind)).toEqual(['Close']);
      expect([mode, reads.mock.calls.length]).toEqual([mode, 0]);
    }
  });
  it('gives a non-member generic auth, physically closes 1008', async () => {
    const { host } = await makeHostWithSpectator(true);
    const sock = makeSocket();
    await host.admitSocket(sock, 'stranger');
    expect(JSON.stringify(sock.sent)).not.toContain(
      'fog-projection-unavailable',
    );
    expect(sock.closes[0][0]).toBe(1008);
    expect(
      sock.sent.every(
        (s) => s.parsed.kind === 'Close' || s.parsed.kind === 'Error',
      ),
    ).toBe(true);
  });
  it.each(['join', 'replay', 'legacy'])(
    'blocks fog %s including attached socket',
    async (mode) => {
      const { host } = await makeHostWithSpectator(true);
      const sock = makeSocket();
      host.attachSocket(sock, 'pid_host');
      if (mode === 'join') await host.handleSessionJoin(sock, 'pid_host');
      else
        await host.sendReplay(
          sock,
          0,
          mode === 'legacy' ? undefined : 'pid_host',
        );
      expect(sock.sent.map((s) => s.parsed.kind)).toEqual(['Close']);
      expect(sock.closes).toEqual([[1008, 'fog-projection-unavailable']]);
    },
  );
  it.each(['join', 'replay'])(
    'detaches a refused %s socket server-side even before transport close',
    async (mode) => {
      const { host } = await makeHostWithSpectator(true);
      const sock = makeSocket();
      // A transport whose close has not completed still reports OPEN.
      Object.defineProperty(sock, 'readyState', { get: () => 1 });
      host.attachSocket(sock, 'pid_host');
      if (mode === 'join') await host.handleSessionJoin(sock, 'pid_host');
      else await host.sendReplay(sock, 0, 'pid_host');
      expect(sock.sent.map((s) => s.parsed.kind)).toEqual(['Close']);
      await broadcast(host, publicPhaseEvent(57));
      expect(sock.sent).toHaveLength(1);
    },
  );
  it('stops a pre-existing live socket and detaches it', async () => {
    const { host } = await makeHostWithSpectator(true);
    const sock = makeSocket();
    host.attachSocket(sock, 'pid_host');
    await broadcast(host, publicPhaseEvent(55));
    expect(sock.sent.map((s) => s.parsed.kind)).toEqual(['Close']);
    expect(sock.closes).toEqual([[1008, 'fog-projection-unavailable']]);
    await broadcast(host, publicPhaseEvent(56));
    expect(sock.sent).toHaveLength(1);
  });
  it('rejects the legacy reconnect callback before replay', async () => {
    const { host } = await makeHostWithSpectator(true);
    const channel = {
      broadcastReplayStream: jest.fn(),
      broadcastRejection: jest.fn(),
      broadcastReconnectReject: jest.fn(),
    };
    await host.handleReconnectRequest(
      {
        matchId: 'match-spectator',
        lastLocalSeq: -1,
        authorPeerId: 'pid_opp',
      } as never,
      channel as never,
      {
        getMatchMetadata: async () => ({
          hostPeerId: 'pid_host',
          guestPeerId: 'pid_opp',
        }),
      } as never,
    );
    expect(channel.broadcastReplayStream).not.toHaveBeenCalled();
    expect(channel.broadcastReconnectReject).toHaveBeenCalled();
  });
  it('closes join membership infrastructure failure with 1011 and no fog details', async () => {
    const { host, store } = await makeHostWithSpectator(true);
    const sock = makeSocket();
    jest
      .spyOn(store, 'getMatchMeta')
      .mockRejectedValue(new Error('private-config-secret'));
    await host.handleSessionJoin(sock, 'pid_host');
    expect(sock.closes).toEqual([
      [1011, 'membership verification unavailable'],
    ]);
    expect(JSON.stringify(sock.sent)).not.toMatch(
      /private-config|fog-projection/,
    );
  });
  it('fog-off projection metadata absent does not become a policy refusal', async () => {
    const { host, store, matchId } = await makeHostWithSpectator(false);
    await store.updateMatchMeta(matchId, { seats: undefined });
    const sock = makeSocket();
    await host.admitSocket(sock, 'pid_host');
    await host.handleSessionJoin(sock, 'pid_host');
    expect(JSON.stringify(sock.sent)).not.toContain(
      'fog-projection-unavailable',
    );
  });
  it('preserves fog-off admission/replay for players and non-playing GM', async () => {
    const { host, store, matchId } = await makeHostWithSpectator(false);
    await store.updateMatchMeta(matchId, {
      hostPlayerId: 'pid_gm',
      playerIds: ['pid_host', 'pid_opp', 'pid_gm'],
      sideAssignments: [
        { playerId: 'pid_host', side: 'player' },
        { playerId: 'pid_opp', side: 'player' },
      ],
      seats: addSpectatorSeat((await store.getMatchMeta(matchId)).seats!, {
        playerId: 'pid_gm',
        displayName: 'GM',
      }),
    } as never);
    for (const id of ['pid_host', 'pid_opp', 'pid_gm']) {
      const sock = makeSocket();
      expect(await host.admitSocket(sock, id)).not.toBeNull();
      await host.handleSessionJoin(sock, id);
      expect(sock.sent.some((s) => s.parsed.kind === 'ReplayChunk')).toBe(true);
      expect(sock.closes).toEqual([]);
    }
  });
});
