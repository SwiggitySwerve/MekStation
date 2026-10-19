/**
 * MP-RECOVERY-UNITS-1 / FINDING-A1-REV-1: packaged boot recovery runs
 * before server.js listens, so the server-side fetch catalog (HTTP to
 * this same server) cannot answer and every canonical unit was skipped.
 * A restarted active match must still hold adapted catalog units and
 * accept a real unit action, with no HTTP catalog request at all.
 *
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 */

import * as fs from 'fs';
import * as path from 'path';

import type { IGameCreatedPayload, IGameEvent } from '@/types/gameplay';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { resetCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { readServerCustomCombatDefinition } from '@/services/units/serverCustomCombatDefinition';
import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { nowIso, type IServerMessage } from '@/types/multiplayer/Protocol';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchMeta } from '../IMatchStore';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { MatchHostRegistry } from '../MatchHostRegistry';
import { rebuildSessionFromEvents } from '../MatchRecovery';
import {
  buildDefaultMatchUnitBootstrap,
  buildMatchHostBootstrapFromMeta,
} from '../matchUnitBootstrap';
import { ServerMatchHost } from '../ServerMatchHost';

const RECOVERY_MATCH_ID = 'boot-recovery-canonical-units';
const SKIP_WARNING = /not found in the (server )?canonical catalog/;

async function flushInitialEventPersist(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

/** Serves public/ like the listening server does (post-listen HTTP). */
function mockListeningCatalogFetch(): typeof fetch {
  return (async (input: string | URL | Request) => {
    const raw = typeof input === 'string' ? input : input.toString();
    const pathname = raw.startsWith('http') ? new URL(raw).pathname : raw;
    const file = path.join(process.cwd(), 'public', pathname);
    const found = fs.existsSync(file);
    const body = found ? fs.readFileSync(file, 'utf8') : '';
    return {
      ok: found,
      status: found ? 200 : 404,
      json: async () => JSON.parse(body) as unknown,
    } as Response;
  }) as typeof fetch;
}

/** The listener is not bound yet: every HTTP-to-self request fails. */
function mockPreListenFetch(): typeof fetch {
  return (async () => {
    throw new TypeError('fetch failed: connect ECONNREFUSED (listener not up)');
  }) as typeof fetch;
}

function activeRecoveryMeta(): IMatchMeta {
  const now = '2026-10-18T00:00:00.000Z';
  const seats = defaultSeats('1v1').map((seat) =>
    seat.slotId === 'alpha-1'
      ? {
          ...seat,
          occupant: { playerId: 'pid_host', displayName: 'Host' },
          ready: true,
        }
      : seat.slotId === 'bravo-1'
        ? {
            ...seat,
            occupant: { playerId: 'pid_guest', displayName: 'Guest' },
            ready: true,
          }
        : seat,
  );
  return {
    matchId: RECOVERY_MATCH_ID,
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_guest'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_guest', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 8 },
    layout: '1v1',
    seats,
    unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 4),
  };
}

function hostIntent(
  playerId: string,
  intent: Record<string, unknown>,
): Parameters<ServerMatchHost['handleIntent']>[0] {
  return {
    kind: 'Intent',
    matchId: RECOVERY_MATCH_ID,
    ts: nowIso(),
    playerId,
    intent,
  } as Parameters<ServerMatchHost['handleIntent']>[0];
}

function errorsIn(broadcasts: readonly IServerMessage[]): IServerMessage[] {
  return broadcasts.filter((message) => message.kind === 'Error');
}

/**
 * Process one: launch the match while the listener answers HTTP, then
 * advance into Movement. Returns the durable store a restart reopens.
 */
async function launchedStoreInMovement(): Promise<InMemoryMatchStore> {
  global.fetch = mockListeningCatalogFetch();
  const store = new InMemoryMatchStore({ quiet: true });
  const meta = activeRecoveryMeta();
  await store.createMatch(meta);
  const host = ServerMatchHost.create(
    meta.matchId,
    store,
    await buildMatchHostBootstrapFromMeta(meta, { diceSeed: 7 }),
  );
  await flushInitialEventPersist();
  for (let guard = 0; guard < 6; guard += 1) {
    if (host.getSessionForTests().currentState.phase === GamePhase.Movement) {
      break;
    }
    const broadcasts = await host.handleIntent(
      hostIntent('pid_host', { kind: 'AdvancePhase' }),
    );
    expect(errorsIn(broadcasts)).toEqual([]);
  }
  expect(host.getSessionForTests().currentState.phase).toBe(GamePhase.Movement);
  // Process one dies here (no closeMatch: that would mark the match closed).
  return store;
}

/** The same durable log with a finite config.seed on its GameCreated. */
function withRecoverySeed(
  events: readonly IGameEvent[],
  seed: number,
): IGameEvent[] {
  return events.map((event) => {
    if (event.type !== GameEventType.GameCreated) return event;
    const payload = event.payload as IGameCreatedPayload;
    return {
      ...event,
      payload: { ...payload, config: { ...payload.config, seed } },
    };
  });
}

describe('boot recovery resolves canonical units before the listener is up', () => {
  const realFetch = global.fetch;
  let warn: jest.SpyInstance;

  beforeEach(() => {
    resetCanonicalUnitService();
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    global.fetch = realFetch;
    resetCanonicalUnitService();
    warn.mockRestore();
  });

  it('recovers adapted catalog units and accepts a unit Move after restart, with no HTTP catalog', async () => {
    const store = await launchedStoreInMovement();

    // Process two: same durable store, empty process caches, no listener.
    resetCanonicalUnitService();
    const preListenFetch = jest.fn(mockPreListenFetch());
    global.fetch = preListenFetch as unknown as typeof fetch;
    warn.mockClear();

    const registry = new MatchHostRegistry({ store });
    const boot = await registry.recoverActiveMatches();
    expect(boot.recovered).toBe(1);
    expect(boot.failed).toBe(0);

    const skipped = warn.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => SKIP_WARNING.test(line));
    expect(skipped).toEqual([]);
    expect(preListenFetch).not.toHaveBeenCalled();

    const host = registry.get(RECOVERY_MATCH_ID);
    expect(host).not.toBeNull();
    // One real unit action: walk the Atlas one hex. A host without
    // adapted state answers movement_invalid / NoMovementCapability.
    const unitId = 'player-1-atlas-as7-d';
    const from = host!.getSessionForTests().currentState.units[unitId].position;
    const neighbours: ReadonlyArray<readonly [number, number, Facing]> = [
      [0, -1, Facing.North],
      [1, -1, Facing.Northeast],
      [1, 0, Facing.Southeast],
      [0, 1, Facing.South],
      [-1, 1, Facing.Southwest],
      [-1, 0, Facing.Northwest],
    ];
    const outcomes: {
      readonly types: string[];
      readonly reasons: unknown[];
    }[] = [];
    for (const [dq, dr, facing] of neighbours) {
      const broadcasts = await host!.handleIntent(
        hostIntent('pid_host', {
          kind: 'Move',
          unitId,
          to: { q: from.q + dq, r: from.r + dr },
          facing,
          movementType: 'walk',
        }),
      );
      const events = broadcasts.flatMap((message) =>
        message.kind === 'Event' ? [message.event as IGameEvent] : [],
      );
      outcomes.push({
        types: broadcasts.map((message) =>
          message.kind === 'Event'
            ? (message.event as IGameEvent).type
            : message.kind,
        ),
        reasons: events
          .filter((event) => event.type === GameEventType.MovementInvalid)
          .map((event) => (event.payload as { reason?: unknown }).reason),
      });
      if (
        events.some((event) => event.type === GameEventType.MovementDeclared)
      ) {
        break;
      }
    }
    expect(outcomes.flatMap((outcome) => outcome.reasons)).not.toContain(
      'NoMovementCapability',
    );
    expect(outcomes.at(-1)?.types).toContain(GameEventType.MovementDeclared);
    await registry.closeMatch(RECOVERY_MATCH_ID);
  });

  it('rebuilds the same adapted units from disk as the listening HTTP catalog', async () => {
    const store = await launchedStoreInMovement();
    const events = await store.getEvents(RECOVERY_MATCH_ID, 0);

    global.fetch = mockListeningCatalogFetch();
    resetCanonicalUnitService();
    const viaHttp = await InteractiveSession.fromSessionAsync(
      hydrateGameSessionFromEvents(RECOVERY_MATCH_ID, events),
      readServerCustomCombatDefinition,
    );

    resetCanonicalUnitService();
    const preListenFetch = jest.fn(mockPreListenFetch());
    global.fetch = preListenFetch as unknown as typeof fetch;
    const viaDisk = await rebuildSessionFromEvents(RECOVERY_MATCH_ID, events);
    expect(preListenFetch).not.toHaveBeenCalled();

    for (const unitId of [
      'player-1-atlas-as7-d',
      'opponent-1-marauder-mad-3r',
    ]) {
      expect(viaDisk.getMovementCapability(unitId)).not.toBeNull();
      expect(viaDisk.getMovementCapability(unitId)).toEqual(
        viaHttp.getMovementCapability(unitId),
      );
      expect(viaDisk.getUnitWeapons(unitId).length).toBeGreaterThan(0);
      expect(viaDisk.getUnitWeapons(unitId)).toEqual(
        viaHttp.getUnitWeapons(unitId),
      );
    }
    expect(viaDisk.getState()).toEqual(viaHttp.getState());
  });

  it('keeps the fromSessionAsync reseed rule for a seeded recovered session', async () => {
    const store = await launchedStoreInMovement();
    const events = withRecoverySeed(
      await store.getEvents(RECOVERY_MATCH_ID, 0),
      4242,
    );

    global.fetch = mockListeningCatalogFetch();
    resetCanonicalUnitService();
    const viaHttp = await InteractiveSession.fromSessionAsync(
      hydrateGameSessionFromEvents(RECOVERY_MATCH_ID, events),
      readServerCustomCombatDefinition,
    );
    resetCanonicalUnitService();
    global.fetch = mockPreListenFetch();
    const viaDisk = await rebuildSessionFromEvents(RECOVERY_MATCH_ID, events);

    // AI movement draws on the session random; then walk past the next
    // initiative roll so the dice stream must match too.
    for (const side of [GameSide.Opponent, GameSide.Player]) {
      viaHttp.runAITurn(side);
      viaDisk.runAITurn(side);
    }
    for (let step = 0; step < 8; step += 1) {
      viaHttp.advancePhase();
      viaDisk.advancePhase();
    }
    const shape = (session: InteractiveSession) =>
      session
        .getSession()
        .events.slice(events.length)
        .map(({ type, turn, phase, payload }) => ({
          type,
          turn,
          phase,
          payload,
        }));
    expect(shape(viaDisk).map((event) => event.type)).toContain(
      GameEventType.InitiativeRolled,
    );
    expect(shape(viaDisk)).toEqual(shape(viaHttp));
  });
});
