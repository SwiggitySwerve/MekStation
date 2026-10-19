/**
 * MP-RECOVERY-UNITS-2: the recovered host uses disk units and captures fresh dice.
 * @spec openspec/changes/harden-multiplayer-transport/specs/multiplayer-server/spec.md
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IAdaptedUnit } from '@/engine/types';
import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { D6Roller } from '@/utils/gameplay/diceTypes';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { resetCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { resetNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import {
  GameEventType,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import type { IMatchMeta } from '../IMatchStore';

import { _resetCampaignHostRegistry } from '../CampaignHostRegistry';
import { CryptoDiceRoller } from '../CryptoDiceRoller';
import { DurableMatchStore } from '../DurableMatchStore';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import {
  buildDefaultMatchUnitBootstrap,
  buildMatchHostBootstrapFromMeta,
  recoverServerInteractiveSession,
} from '../matchUnitBootstrap';
import { ServerMatchHost } from '../ServerMatchHost';

const ID = 'recovery2-host';
const AT = '2026-10-18T00:00:00.000Z';
let dir: string;
let store: DurableMatchStore;
const realFetch = global.fetch;

function listeningFetch(): typeof fetch {
  return (async (input: string | URL | Request) => {
    const url = new URL(String(input), 'http://localhost');
    const body = readFileSync(
      path.join(process.cwd(), 'public', decodeURIComponent(url.pathname)),
      'utf8',
    );
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(body) as unknown,
    } as Response;
  }) as typeof fetch;
}

function meta(coop: boolean): IMatchMeta {
  return {
    matchId: ID,
    hostPlayerId: 'host',
    playerIds: ['host', 'guest'],
    sideAssignments: [
      { playerId: 'host', side: 'player' },
      { playerId: 'guest', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 8 },
    layout: '1v1',
    seats: defaultSeats('1v1').map((seat, i) => ({
      ...seat,
      occupant: { playerId: i === 0 ? 'host' : 'guest', displayName: 'Seat' },
      ready: true,
    })),
    unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 4).map((unit) => ({
      ...unit,
      ownerPlayerId: unit.side === 'player' ? 'host' : 'guest',
    })),
    ...(coop
      ? {
          coopMission: {
            campaignId: 'campaign',
            sessionId: 'absent-campaign-session',
            missionId: 'mission',
            acceptedHead: {
              branchId: 'main',
              revision: 1,
              effectiveGeneration: 1,
            },
            requestFingerprint: 'recovery2-fixture',
            deployingPlayerIds: ['host', 'guest'],
          },
        }
      : {}),
  };
}

async function persistAndReopen(
  coop: boolean,
  movement: boolean,
  seed?: number,
): Promise<IGameSession> {
  global.fetch = listeningFetch();
  const m = meta(coop);
  const boot = await buildMatchHostBootstrapFromMeta(m);
  let roll = 0;
  const engine = new InteractiveSession(
    boot.mapRadius,
    boot.turnLimit,
    boot.random,
    boot.grid,
    boot.playerUnits,
    boot.opponentUnits,
    boot.gameUnits,
    {},
    () => [6, 6, 1, 1][roll++ % 4],
  );
  if (movement) {
    for (
      let i = 0;
      i < 6 && engine.getState().phase !== GamePhase.Movement;
      i++
    )
      engine.advancePhase();
    expect(engine.getState().phase).toBe(GamePhase.Movement);
  }
  await store.createMatch(m);
  for (const event of engine.getSession().events)
    await store.appendEvent(ID, event);
  store.close();
  store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
  resetCanonicalUnitService();
  resetNodeCanonicalUnitService();
  const saved = hydrateGameSessionFromEvents(ID, await store.getEvents(ID));
  return seed === undefined
    ? saved
    : { ...saved, config: { ...saved.config, seed } };
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'mp-recovery2-host-'));
  store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
  _setCombatJournalAuthorityModeForTests('off');
});
afterEach(async () => {
  global.fetch = realFetch;
  jest.restoreAllMocks();
  resetCanonicalUnitService();
  resetNodeCanonicalUnitService();
  _resetCampaignHostRegistry();
  _setCombatJournalAuthorityModeForTests(null);
  store.close();
  if (!dir.startsWith(path.join(tmpdir(), 'mp-recovery2-host-')))
    throw new Error('Unexpected cleanup path');
  await rm(dir, { recursive: true, force: true });
});

it.each([false, true])(
  'hydrates recovered journal units from disk and accepts Move (co-op=%s)',
  async (coop) => {
    const saved = await persistAndReopen(coop, true);
    const fetch = jest.fn(async () => {
      throw new Error('listener not running');
    });
    global.fetch = fetch as unknown as typeof global.fetch;
    const host = await ServerMatchHost.recover(
      ID,
      store,
      await recoverServerInteractiveSession(saved),
    );
    expect(fetch).not.toHaveBeenCalled();
    // Journal decision seeds are a separate consumer from the legacy engine maps.
    const seeds = host as unknown as {
      journalPlayerUnits: readonly IAdaptedUnit[];
      journalOpponentUnits: readonly IAdaptedUnit[];
    };
    expect(seeds.journalPlayerUnits.map((u) => u.id)).toEqual([
      'player-1-atlas-as7-d',
    ]);
    expect(seeds.journalOpponentUnits.map((u) => u.id)).toEqual([
      'opponent-1-marauder-mad-3r',
    ]);
    const id = 'player-1-atlas-as7-d',
      from = host.getSessionForTests().currentState.units[id].position;
    const directions = [
      [0, -1, Facing.North],
      [1, -1, Facing.Northeast],
      [1, 0, Facing.Southeast],
      [0, 1, Facing.South],
      [-1, 1, Facing.Southwest],
      [-1, 0, Facing.Northwest],
    ] as const;
    for (const [dq, dr, facing] of directions) {
      await host.handleIntent({
        kind: 'Intent',
        matchId: ID,
        playerId: 'host',
        ts: AT,
        intent: {
          kind: 'Move',
          unitId: id,
          to: { q: from.q + dq, r: from.r + dr },
          facing,
          movementType: 'walk',
        },
      });
      if (
        host
          .getSessionForTests()
          .events.some((e) => e.type === GameEventType.MovementDeclared)
      )
        break;
    }
    expect(
      host
        .getSessionForTests()
        .events.some((e) => e.type === GameEventType.MovementDeclared),
    ).toBe(true);
    expect(
      (await store.getEvents(ID)).some(
        (e) => e.type === GameEventType.MovementDeclared,
      ),
    ).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  },
);

it.each([undefined, 4242])(
  'records crypto-backed dice after restart across fresh capture buffers (seed=%s)',
  async (seed) => {
    const saved = await persistAndReopen(false, false, seed);
    global.fetch = (async () => {
      throw new Error('listener not running');
    }) as typeof fetch;
    const host = await ServerMatchHost.recover(
      ID,
      store,
      await recoverServerInteractiveSession(saved),
    );
    // Call through to the real crypto source; assertions compare consumed values, not chance.
    const crypto = jest.spyOn(CryptoDiceRoller.prototype, 'd6');
    let rolledIntents = 0;
    for (let step = 0; step < 24 && rolledIntents < 2; step++) {
      const before = (await store.getEvents(ID)).length,
        calls = crypto.mock.results.length;
      await host.handleIntent({
        kind: 'Intent',
        matchId: ID,
        playerId: 'host',
        ts: AT,
        intent: { kind: 'AdvancePhase' },
      });
      const fresh = (await store.getEvents(ID)).slice(before);
      if (!fresh.some((e) => e.type === GameEventType.InitiativeRolled))
        continue;
      const consumed = crypto.mock.results
        .slice(calls)
        .map((r) => r.value as number);
      expect(consumed.length).toBeGreaterThan(0);
      expect(
        consumed.every((n) => Number.isInteger(n) && n >= 1 && n <= 6),
      ).toBe(true);
      const recorded = fresh.flatMap(
        (e) => (e.payload as { rolls?: readonly number[] }).rolls ?? [],
      );
      expect(recorded).toEqual(consumed);
      rolledIntents++;
    }
    expect(rolledIntents).toBe(2);
  },
);

it('lets an explicit recovery roller override a persisted seed, while omitted rollers retain parity', async () => {
  const saved = await persistAndReopen(false, false, 4242);
  let roll = 0;
  const roller = jest.fn(() => [6, 6, 1, 1][roll++ % 4]);
  // The cast lets this behavioral RED compile before the optional argument exists.
  const recover = recoverServerInteractiveSession as (
    s: IGameSession,
    custom?: undefined,
    dice?: D6Roller,
  ) => Promise<InteractiveSession>;
  const overridden = await recover(saved, undefined, roller);
  overridden.advancePhase();
  expect(roller).toHaveBeenCalled();
  const defaulted = await recover(saved),
    control = await InteractiveSession.fromSessionAsync(saved);
  defaulted.advancePhase();
  control.advancePhase();
  const shape = (s: InteractiveSession) =>
    s
      .getSession()
      .events.slice(saved.events.length)
      .map(({ type, payload }) => ({ type, payload }));
  expect(shape(defaulted)).toEqual(shape(control));
});
