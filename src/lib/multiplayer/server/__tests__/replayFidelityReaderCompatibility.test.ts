import { z } from 'zod';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType } from '@/types/gameplay/GameSessionCoreTypes';
import { createGameSession } from '@/utils/gameplay/gameSessionCore';

import { AuthorizedViewerResolver } from '../authorization/AuthorizedViewer';
import { MatchSeatMembershipSource } from '../authorization/MatchSeatMembershipSource';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ViewerDeliveryCursors } from '../projection/ViewerDeliveryCursors';
import { handleSessionJoin, type IServerMatchHostReplayContext } from '../ServerMatchHostReplay';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

/** Frozen old wire/parser/alert behavior, captured before R11a. */
const OLD_ERROR = z.object({ kind: z.literal('Error'), matchId: z.string(), ts: z.string(), code: z.enum(['PROTOCOL_VIOLATION', 'INTERNAL_ERROR', 'AUTH_REJECTED']), reason: z.string() });
const oldJoiningAlert = (message: unknown) => {
  const error = OLD_ERROR.parse(message);
  return `${error.code ?? 'ERROR'}: ${error.reason}`;
};
const OLD_CREATION = z.object({ config: z.unknown(), units: z.array(z.unknown()) }).strict();

async function fixture(version: number | undefined) {
  const matchId = 'reader-compat';
  const store = new InMemoryMatchStore({ quiet: true });
  await store.createMatch({ matchId, hostPlayerId: 'host', playerIds: ['host'], sideAssignments: [{ playerId: 'host', side: 'player' }], status: 'active', createdAt: '2026-11-09T00:00:00.000Z', updatedAt: '2026-11-09T00:00:00.000Z', config: { mapRadius: 3, turnLimit: 1 } });
  const raw = createGameSession({ mapRadius: 3, turnLimit: 1, victoryConditions: [], optionalRules: [] }, []);
  const events = raw.events.map((event) => {
    if (event.type !== GameEventType.GameCreated) return event;
    const payload = { ...event.payload } as Record<string, unknown>;
    delete payload.replayFidelityVersion;
    if (version !== undefined) payload.replayFidelityVersion = version;
    return { ...event, gameId: matchId, payload };
  });
  for (const event of events) await store.appendEvent(matchId, event);
  const session = new InteractiveSession(3, 1, new SeededRandom(1), createMinimalGrid(3), [], [], []);
  const sent: IServerMessage[] = [];
  const socket = { readyState: 1, send: jest.fn(), close: jest.fn() };
  const ctx: IServerMatchHostReplayContext = { matchId, store, session, safeSend: (_socket, message) => sent.push(message), maybeResume: () => false, pauseSnapshot: () => null, viewerResolver: new AuthorizedViewerResolver(new MatchSeatMembershipSource(store)), deliveryCursors: new ViewerDeliveryCursors(), rewindReplayCeiling: null };
  // The preflight must inspect the host's retained seed, even on tail resume.
  jest.spyOn(session, 'getSession').mockReturnValue({ ...raw, events });
  return { ctx, sent, socket, events };
}

describe('hosted reader compatibility', () => {
  it('proves the old strict parser rejects a stamped seed', async () => {
    const { events } = await fixture(2);
    expect(() => OLD_CREATION.parse(events[0].payload)).toThrow();
  });

  it('refuses an absent old capability before any seed, with an old-understood visible reason', async () => {
    const { ctx, sent, socket } = await fixture(2);
    expect(await handleSessionJoin(ctx, socket, 'host', 99)).toBe(false);
    expect(sent).toHaveLength(1);
    expect(oldJoiningAlert(sent[0])).toBe('PROTOCOL_VIOLATION: reload-required: Reload this tab to join this match.');
  });

  it('accepts the updated reader and streams the seed', async () => {
    const { ctx, sent, socket } = await fixture(2);
    expect(await handleSessionJoin(ctx, socket, 'host', 0, ctx.matchId, 2)).toBe(true);
    expect(sent.some((message) => message.kind === 'ReplayChunk')).toBe(true);
  });

  it('checks authorization before disclosing compatibility', async () => {
    const { ctx, sent, socket } = await fixture(2);
    expect(await handleSessionJoin(ctx, socket, 'outsider')).toBe(false);
    expect(sent).toEqual([expect.objectContaining({ kind: 'Close', code: 'AUTH_REJECTED' })]);
    expect(JSON.stringify(sent)).not.toContain('reload-required');
  });

  it.each([undefined, 1])('keeps retained version %s joinable without capability', async (version) => {
    const { ctx, sent, socket } = await fixture(version);
    expect(await handleSessionJoin(ctx, socket, 'host')).toBe(true);
    expect(sent[0].kind).toBe('ReplayStart');
  });
});
