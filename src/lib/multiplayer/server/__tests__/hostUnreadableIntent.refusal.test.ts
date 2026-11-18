import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { buildMirrorSessionGated } from '@/lib/multiplayer/mirrorMatchSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType, GameSide, type IGameEvent } from '@/types/gameplay';
import {
  nowIso,
  type IIntent,
  type IServerMessage,
} from '@/types/multiplayer/Protocol';
import { logger } from '@/utils/logger';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { AcceptedIntentTracker } from '../reconnection/AcceptedIntentTracker';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import * as engine from '../ServerMatchHostEngineDispatch';
import { createPersistedHost } from './matchHostPersistence.test-helpers';

jest.mock('@/lib/multiplayer/server/ServerMatchHostEngineDispatch', () => {
  const actual = jest.requireActual<
    typeof import('../ServerMatchHostEngineDispatch')
  >('../ServerMatchHostEngineDispatch');
  return { ...actual, dispatchToEngine: jest.fn(actual.dispatchToEngine) };
});

class Socket implements IMatchSocket {
  readonly frames: IServerMessage[] = [];
  readyState = 1;
  send(data: string): void {
    this.frames.push(JSON.parse(data) as IServerMessage);
  }
  close(): void {
    this.readyState = 3;
  }
}

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  jest.restoreAllMocks();
  if (originalNodeEnv === undefined) {
    // @ts-expect-error Next types NODE_ENV as a required readonly key; restore its absence.
    delete process.env.NODE_ENV;
  } else {
    // @ts-expect-error Next types NODE_ENV as readonly; restore the saved value.
    process.env.NODE_ENV = originalNodeEnv;
  }
  _setCombatJournalAuthorityModeForTests(null);
});

describe('unreadable accepted engine command is refused by the host', () => {
  it.each([false, true])(
    'preserves store, both mirrors, live state and accepted IDs (journal=%s)',
    async (journalAuthority) => {
      _setCombatJournalAuthorityModeForTests('off');
      const store = new InMemoryMatchStore({ quiet: true });
      const matchId = `unreadable-intent-${journalAuthority}`;
      await store.createMatch({
        matchId,
        hostPlayerId: 'p1',
        playerIds: ['p1', 'p2'],
        sideAssignments: [
          { playerId: 'p1', side: 'player' },
          { playerId: 'p2', side: 'opponent' },
        ],
        status: 'active',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        config: { mapRadius: 4, turnLimit: 5 },
      });
      const host = await createPersistedHost(() =>
        ServerMatchHost.create(matchId, store, {
          mapRadius: 4,
          turnLimit: 5,
          random: new SeededRandom(42),
          diceSeed: 42,
          grid: createMinimalGrid(4),
          playerUnits: [],
          opponentUnits: [],
          journalAuthority,
          gameUnits: [GameSide.Player, GameSide.Opponent].map(
            (side, index) => ({
              id: `unit-${index}`,
              name: `Unit ${index}`,
              unitRef: `unit-${index}`,
              side,
              pilotRef: `pilot-${index}`,
              gunnery: 4,
              piloting: 5,
            }),
          ),
        }),
      );
      expect(host.isJournalAuthorityEnabled()).toBe(journalAuthority);
      const sender = new Socket();
      const peer = new Socket();
      try {
        expect(await host.admitSocket(sender, 'p1', 'sender')).not.toBeNull();
        expect(await host.admitSocket(peer, 'p2', 'peer')).not.toBeNull();
        sender.frames.length = 0;
        peer.frames.length = 0;
        const storedBefore = await store.getEvents(matchId);
        const metaBefore = await store.getMatchMeta(matchId);
        const liveBefore = host.getSessionForTests();
        const beforeMirrors = [
          buildMirrorSessionGated(storedBefore),
          buildMirrorSessionGated(storedBefore),
        ];
        expect(beforeMirrors.map((mirror) => mirror.kind)).toEqual([
          'session',
          'session',
        ]);
        const append = jest.spyOn(store, 'appendEvent');
        const appendBatch = jest.spyOn(store, 'appendCommandBatch');
        const record = jest.spyOn(AcceptedIntentTracker.prototype, 'record');
        const diagnostic = jest
          .spyOn(logger, 'warn')
          .mockImplementation(() => {});
        const { dispatchToEngine: dispatch } = jest.requireActual<
          typeof engine
        >('../ServerMatchHostEngineDispatch');
        const injected = jest
          .spyOn(engine, 'dispatchToEngine')
          .mockImplementationOnce((session, command) => {
            // Inject a writer defect after an otherwise accepted real command;
            // no store/reader seam is bypassed by this producer fault.
            dispatch(session, command);
            const current = session.getSession();
            session.appendEvent({
              id: 'unreadable-output',
              gameId: current.id,
              sequence: current.events.length,
              timestamp: nowIso(),
              type: GameEventType.PSRResolved,
              turn: current.currentState.turn,
              phase: current.currentState.phase,
              payload: {
                unitId: 'unit-0',
                targetNumber: Infinity,
                roll: 0,
                modifiers: 0,
                passed: false,
                reason: 'Gyro destroyed - automatic failure',
              },
            });
          });
        // @ts-expect-error Next types NODE_ENV as readonly; this test needs the production path.
        process.env.NODE_ENV = 'production';
        const envelope: IIntent = {
          kind: 'Intent',
          matchId,
          playerId: 'p1',
          ts: nowIso(),
          intentId: 'refused-command',
          intent: { kind: 'AdvancePhase' },
        };
        const messages = await host.handleIntent(envelope, 'sender', 'p1');
        expect(messages).toEqual([
          expect.objectContaining({
            kind: 'Error',
            code: 'INTERNAL_ERROR',
            intentId: envelope.intentId,
            reason: 'Unable to process the command.',
          }),
        ]);
        expect(sender.frames).toEqual(messages);
        expect(peer.frames).toEqual([]);
        expect(sender.readyState).toBe(1);
        expect(peer.readyState).toBe(1);
        expect(append).not.toHaveBeenCalled();
        expect(appendBatch).not.toHaveBeenCalled();
        expect(record).not.toHaveBeenCalled();
        expect(await store.getEvents(matchId)).toEqual(storedBefore);
        expect(await store.getMatchMeta(matchId)).toEqual(metaBefore);
        expect(host.getSessionForTests()).toBe(liveBefore);
        const afterMirrors = [sender, peer].map((socket) =>
          buildMirrorSessionGated([
            ...storedBefore,
            ...socket.frames.flatMap((frame) =>
              frame.kind === 'Event' ? [frame.event as IGameEvent] : [],
            ),
          ]),
        );
        expect(afterMirrors).toEqual(beforeMirrors);
        expect(diagnostic).toHaveBeenCalledWith(
          '[multiplayer] intent refused',
          expect.objectContaining({
            matchId,
            code: 'INTERNAL_ERROR',
            diagnostic: expect.stringContaining('unreadable-output'),
          }),
        );
        injected.mockImplementation(dispatch);
        // Same-ID retry succeeds: neither accepted-ID state nor the cursor was
        // advanced by the refused output, and the match remains playable.
        const retry = await host.handleIntent(envelope, 'sender', 'p1');
        expect(retry.some((message) => message.kind === 'Event')).toBe(true);
        expect(retry.some((message) => message.kind === 'Error')).toBe(false);
        expect(record).toHaveBeenCalledWith('refused-command');
        const afterRetry = await store.getEvents(matchId);
        expect(afterRetry.slice(0, storedBefore.length)).toEqual(storedBefore);
        expect(afterRetry[storedBefore.length].sequence).toBe(
          storedBefore.length,
        );
        expect(
          afterRetry.some((event) => event.id === 'unreadable-output'),
        ).toBe(false);
      } finally {
        await host.closeMatch();
      }
    },
  );
});
