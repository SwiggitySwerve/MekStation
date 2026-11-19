import type { IIntent } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType, GameSide, type IGameEvent } from '@/types/gameplay';
import { logger } from '@/utils/logger';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { SeededDiceRoller } from '../RollCapture';
import { ServerMatchHost } from '../ServerMatchHost';
import { ServerMatchHostCapture } from '../ServerMatchHostCapture';
import * as engine from '../ServerMatchHostEngineDispatch';
import { createPersistedHost } from './matchHostPersistence.test-helpers';

jest.mock('@/lib/multiplayer/server/ServerMatchHostEngineDispatch', () => {
  const actual = jest.requireActual<
    typeof import('../ServerMatchHostEngineDispatch')
  >('../ServerMatchHostEngineDispatch');
  return { ...actual, dispatchToEngine: jest.fn(actual.dispatchToEngine) };
});

const AT = '2026-11-11T00:00:00.000Z';
const SEED = 8721;

function command(matchId: string, intentId: string): IIntent {
  return {
    kind: 'Intent',
    matchId,
    playerId: 'p1',
    intentId,
    ts: AT,
    intent: { kind: 'AdvancePhase' },
  };
}

async function fixture(matchId: string, journalAuthority: boolean) {
  const store = new InMemoryMatchStore({ quiet: true });
  await store.createMatch({
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  const random = new SeededRandom(SEED);
  const host = await createPersistedHost(() =>
    ServerMatchHost.create(matchId, store, {
      mapRadius: 4,
      turnLimit: 5,
      random,
      randomSeed: SEED,
      diceSeed: SEED,
      grid: createMinimalGrid(4),
      playerUnits: [],
      opponentUnits: [],
      journalAuthority,
      gameUnits: [GameSide.Player, GameSide.Opponent].map((side, index) => ({
        id: `mek-${index}`,
        name: `Mek ${index}`,
        unitRef: `mek-${index}`,
        side,
        pilotRef: 'Regular',
        gunnery: 4,
        piloting: 5,
      })),
    }),
  );
  return { host, store, random };
}

function rolls(events: readonly IGameEvent[]): number[] {
  return events.flatMap((event) => {
    const payload = event.payload as { rolls?: number[] };
    return payload.rolls ?? [];
  });
}

afterEach(() => {
  jest.restoreAllMocks();
  _setCombatJournalAuthorityModeForTests(null);
});

it.each(['off', 'shadow', 'enabled'] as const)(
  'a refused dice-consuming command cannot change the next accepted rolls (%s)',
  async (mode) => {
    _setCombatJournalAuthorityModeForTests(mode === 'enabled' ? 'off' : mode);
    jest.spyOn(logger, 'warn').mockImplementation(() => undefined);
    const control = await fixture(`clean-${mode}`, mode === 'enabled');
    const subject = await fixture(`refused-${mode}`, mode === 'enabled');
    const { dispatchToEngine: dispatch } = jest.requireActual<typeof engine>(
      '../ServerMatchHostEngineDispatch',
    );
    try {
      const initialRandom = subject.random.snapshot();
      const initial = subject.host.getSessionForTests();
      jest
        .spyOn(engine, 'dispatchToEngine')
        .mockImplementationOnce((session, intent) => {
          dispatch(session, intent); // Real initiative consumes the authoritative d6 stream.
          subject.random.next(); // Exercise the independent live AI stream too.
          const current = session.getSession();
          session.appendEvent({
            id: 'unreadable-after-dice',
            gameId: current.id,
            sequence: current.events.length,
            timestamp: AT,
            type: GameEventType.PSRResolved,
            turn: current.currentState.turn,
            phase: current.currentState.phase,
            payload: {
              unitId: 'mek-0',
              targetNumber: Infinity,
              roll: 0,
              modifiers: 0,
              passed: false,
              reason: 'Injected writer defect',
            },
          });
        });
      const refused = await subject.host.handleIntent(
        command(`refused-${mode}`, 'refused'),
      );
      expect(refused).toEqual([
        expect.objectContaining({ kind: 'Error', code: 'INTERNAL_ERROR' }),
      ]);
      expect(subject.host.getSessionForTests()).toBe(initial);
      // Enabled mode decides on a scratch, and never consumes this live AI stream.
      if (mode !== 'enabled')
        expect(subject.random.snapshot()).toBe(initialRandom);
      const accepted = await subject.host.handleIntent(
        command(`refused-${mode}`, 'accepted'),
      );
      const clean = await control.host.handleIntent(
        command(`clean-${mode}`, 'accepted'),
      );
      expect(accepted.filter((message) => message.kind === 'Error')).toEqual(
        [],
      );
      expect(clean.filter((message) => message.kind === 'Error')).toEqual([]);
      const actualRolls = rolls(
        await subject.store.getEvents(`refused-${mode}`),
      );
      expect(actualRolls.length).toBeGreaterThan(0);
      expect(actualRolls).toEqual(
        rolls(await control.store.getEvents(`clean-${mode}`)),
      );
      if (mode === 'shadow')
        expect(subject.host.getLastShadowComparison()).toMatchObject({
          equal: true,
        });
    } finally {
      await subject.host.closeMatch();
      await control.host.closeMatch();
    }
  },
);

it('returns refused entropy once, including a partially reused queue and a drained capture', () => {
  const capture = new ServerMatchHostCapture(
    new SeededDiceRoller(new SeededRandom(SEED)),
  );
  const clean = new SeededDiceRoller(new SeededRandom(SEED));
  const firstRefusal = capture.installFresh();
  const refused = [capture.d6(), capture.d6(), capture.d6()];
  // Stamping drains RollCapture; rollback must retain its separate transaction.
  capture.stampRollsOnNewEvents([{ id: 'stamp', payload: {} } as IGameEvent]);
  firstRefusal();
  firstRefusal();
  const secondRefusal = capture.installFresh();
  expect(capture.d6()).toBe(refused[0]);
  secondRefusal();
  capture.installFresh();
  expect(Array.from({ length: 12 }, () => capture.d6())).toEqual(
    Array.from({ length: 12 }, () => clean.d6()),
  );
});

it('reconstruction from committed seeded draws is independent of refused draws', () => {
  const capture = new ServerMatchHostCapture(
    new SeededDiceRoller(new SeededRandom(SEED)),
  );
  capture.installFresh();
  const committed = [capture.d6(), capture.d6()];
  const refuse = capture.installFresh();
  capture.d6();
  capture.d6();
  capture.d6();
  refuse();
  const reconstructed = new SeededDiceRoller(new SeededRandom(SEED));
  expect(committed.map(() => reconstructed.d6())).toEqual(committed);
  capture.installFresh();
  expect(Array.from({ length: 8 }, () => capture.d6())).toEqual(
    Array.from({ length: 8 }, () => reconstructed.d6()),
  );
  // A rewind replaces the collaborator; discarded refused entropy cannot cross it.
  const rewound = new ServerMatchHostCapture(
    new SeededDiceRoller(new SeededRandom(SEED)),
  );
  const clean = new SeededDiceRoller(new SeededRandom(SEED));
  rewound.installFresh();
  expect(Array.from({ length: 8 }, () => rewound.d6())).toEqual(
    Array.from({ length: 8 }, () => clean.d6()),
  );
});
