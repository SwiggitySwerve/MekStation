import {
  GameEventType,
  GamePhase,
  ReplaySource,
  type IGameEvent,
} from '@/types/gameplay';
import { createInitialGameState } from '@/utils/gameplay/gameState/initialization';

import { expectLibraryStateWithRecordingSource } from './replayLibraryStateAllowance';

const event: IGameEvent = {
  id: 'phase',
  gameId: 'source-allowance',
  sequence: 1,
  timestamp: '2026-11-11T00:00:00.000Z',
  type: GameEventType.PhaseChanged,
  turn: 1,
  phase: GamePhase.Movement,
  payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Movement },
};
const live = { ...createInitialGameState(event.gameId), turnEvents: [event] };
const replayed = {
  ...live,
  turnEvents: [{ ...event, replaySource: ReplaySource.Encounter }],
};

it('allows exactly the independently counted recording source keys', () => {
  expect(
    expectLibraryStateWithRecordingSource(
      live,
      replayed,
      ReplaySource.Encounter,
    ),
  ).toBe(1);
});

it('rejects a different source value', () => {
  expect(() =>
    expectLibraryStateWithRecordingSource(live, replayed, ReplaySource.Quick),
  ).toThrow();
});

it('rejects a missing key', () => {
  expect(() =>
    expectLibraryStateWithRecordingSource(live, live, ReplaySource.Encounter),
  ).toThrow();
});

it('rejects a different per-boundary count', () => {
  expect(() =>
    expectLibraryStateWithRecordingSource(
      live,
      {
        ...replayed,
        turnEvents: [...replayed.turnEvents, replayed.turnEvents[0]],
      },
      ReplaySource.Encounter,
    ),
  ).toThrow();
});

it('rejects any other envelope key', () => {
  const extraEnvelopeKey = {
    ...replayed,
    turnEvents: [{ ...replayed.turnEvents[0], unexpected: true }],
  };
  expect(() =>
    expectLibraryStateWithRecordingSource(
      live,
      extraEnvelopeKey,
      ReplaySource.Encounter,
    ),
  ).toThrow();
});

it('rejects a derived-state difference', () => {
  expect(() =>
    expectLibraryStateWithRecordingSource(
      live,
      { ...replayed, turn: live.turn + 1 },
      ReplaySource.Encounter,
    ),
  ).toThrow();
});
