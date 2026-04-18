/**
 * ServerMatchHost — Wave 3a roll-arbitration integration test.
 *
 * Asserts the host:
 *   - Stamps captured d6 rolls onto the InitiativeRolled event when the
 *     player advances out of the Initiative phase.
 *   - Produces deterministic outputs given a fixed `diceSeed` (the
 *     `?seed=N` debug path).
 *   - Rejects intents whose payload smuggles dice fields with an
 *     `INVALID_INTENT { client-rolls-forbidden }` error.
 *
 * @spec openspec/changes/add-authoritative-roll-arbitration/specs/multiplayer-server/spec.md
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  type IGameUnit,
  type IInitiativeRolledPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import { nowIso, type IIntent } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

interface IRecordedSend {
  payload: string;
  parsed: { kind: string; matchId: string };
}

function makeMockSocket(): IMatchSocket & { sent: IRecordedSend[] } {
  const sent: IRecordedSend[] = [];
  return {
    send(data: string) {
      sent.push({
        payload: data,
        parsed: JSON.parse(data) as { kind: string; matchId: string },
      });
    },
    close() {},
    get readyState() {
      return 1;
    },
    sent,
  } as IMatchSocket & { sent: IRecordedSend[] };
}

async function bootHost(diceSeed?: number): Promise<{
  host: ServerMatchHost;
  store: InMemoryMatchStore;
}> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = `match-roll-${Math.random().toString(36).slice(2, 8)}`;
  const now = nowIso();
  await store.createMatch({
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1'],
    sideAssignments: [{ playerId: 'p1', side: 'player' }],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
    diceSeed,
  });
  await Promise.resolve();
  await Promise.resolve();
  return { host, store };
}

describe('ServerMatchHost — Wave 3a roll arbitration', () => {
  it('stamps captured rolls onto InitiativeRolled when AdvancePhase fires from Initiative', async () => {
    const { host, store } = await bootHost();

    // Initial events are GameCreated + GameStarted (no rolls). The first
    // AdvancePhase from the Setup phase moves to Initiative; the second
    // call (Initiative → Movement) is what consumes dice via
    // rollInitiative.
    const advance = (): IIntent => ({
      kind: 'Intent',
      matchId: host.matchId,
      ts: nowIso(),
      playerId: 'p1',
      intent: { kind: 'AdvancePhase' },
    });

    // First AdvancePhase: Setup → Initiative (no dice).
    await host.handleIntent(advance());
    // Second AdvancePhase: Initiative → Movement (rollInitiative fires).
    await host.handleIntent(advance());

    const events = await store.getEvents(host.matchId);
    const initEvt = events.find(
      (e) => e.type === GameEventType.InitiativeRolled,
    );
    expect(initEvt).toBeDefined();
    if (!initEvt) return;
    const payload = initEvt.payload as IInitiativeRolledPayload;
    // Two 2d6 rolls = 4 individual d6.
    expect(payload.rolls).toBeDefined();
    expect(payload.rolls).toHaveLength(4);
    if (payload.rolls) {
      for (const die of payload.rolls) {
        expect(die).toBeGreaterThanOrEqual(1);
        expect(die).toBeLessThanOrEqual(6);
      }
      // Aggregates from rolls must reconstruct payload.playerRoll +
      // payload.opponentRoll (rolls captured in consumption order:
      // playerRoll = rolls[0]+rolls[1], opponentRoll = rolls[2]+rolls[3]).
      expect(payload.rolls[0] + payload.rolls[1]).toBe(payload.playerRoll);
      expect(payload.rolls[2] + payload.rolls[3]).toBe(payload.opponentRoll);
    }
  });

  it('produces deterministic InitiativeRolled output for the same diceSeed', async () => {
    const seed = 0xabcdef;
    const a = await bootHost(seed);
    const b = await bootHost(seed);

    const advance = (matchId: string): IIntent => ({
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'p1',
      intent: { kind: 'AdvancePhase' },
    });

    await a.host.handleIntent(advance(a.host.matchId));
    await a.host.handleIntent(advance(a.host.matchId));
    await b.host.handleIntent(advance(b.host.matchId));
    await b.host.handleIntent(advance(b.host.matchId));

    const eventsA = await a.store.getEvents(a.host.matchId);
    const eventsB = await b.store.getEvents(b.host.matchId);
    const initA = eventsA.find((e) => e.type === GameEventType.InitiativeRolled)
      ?.payload as IInitiativeRolledPayload | undefined;
    const initB = eventsB.find((e) => e.type === GameEventType.InitiativeRolled)
      ?.payload as IInitiativeRolledPayload | undefined;
    expect(initA).toBeDefined();
    expect(initB).toBeDefined();
    expect(initA?.rolls).toEqual(initB?.rolls);
    expect(initA?.playerRoll).toBe(initB?.playerRoll);
    expect(initA?.opponentRoll).toBe(initB?.opponentRoll);
  });

  it('rejects an intent whose payload carries a forbidden dice field', async () => {
    const { host } = await bootHost();
    const socket = makeMockSocket();
    host.attachSocket(socket, 'p1');

    // Hand-craft a malformed intent that bypasses the wire schema.
    // intentHasForbiddenDiceField runs server-side as defense in depth.
    const malformed = {
      kind: 'Intent',
      matchId: host.matchId,
      ts: nowIso(),
      playerId: 'p1',
      intent: {
        kind: 'AdvancePhase',
        rolls: [6, 6, 6, 6],
      },
    } as unknown as IIntent;

    const broadcasts = await host.handleIntent(malformed);
    expect(broadcasts).toHaveLength(1);
    expect(broadcasts[0].kind).toBe('Error');
    if (broadcasts[0].kind === 'Error') {
      expect(broadcasts[0].code).toBe('INVALID_INTENT');
      expect(broadcasts[0].reason).toBe('client-rolls-forbidden');
    }
  });

  it('does NOT stamp rolls onto deterministic intents (e.g., Concede)', async () => {
    const { host, store } = await bootHost();
    await host.handleIntent({
      kind: 'Intent',
      matchId: host.matchId,
      ts: nowIso(),
      playerId: 'p1',
      intent: { kind: 'Concede', side: 'player' },
    });
    const events = await store.getEvents(host.matchId);
    const ended = events.find((e) => e.type === GameEventType.GameEnded);
    expect(ended).toBeDefined();
    // GameEnded carries no `rolls` field — it's a deterministic event.
    expect(
      (ended?.payload as Record<string, unknown> | undefined)?.rolls,
    ).toBeUndefined();
  });
});
