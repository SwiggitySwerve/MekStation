import {
  selectLocalMatchGraceRemainingMs,
  selectLocalMatchStatus,
  useGameplayStore,
} from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameStatus,
  type IGameEvent,
  type IGameSession,
} from '@/types/gameplay';
import { RECONNECT_GRACE_MS } from '@/types/multiplayer/Protocol';

function buildSessionWithEvents(events: readonly IGameEvent[]): IGameSession {
  return {
    id: 'local-status-session',
    createdAt: '2026-04-29T00:00:00.000Z',
    updatedAt: '2026-04-29T00:00:00.000Z',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events,
    currentState: {
      gameId: 'local-status-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {},
      turnEvents: [],
    },
  };
}

describe('useGameplayStore local reconnect match status', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });

  afterEach(() => {
    useGameplayStore.getState().reset();
  });

  it('defaults to live with the protocol reconnect grace window', () => {
    const state = useGameplayStore.getState();

    expect(state.localMatchStatus).toBe('live');
    expect(state.localMatchGraceDeadlineMs).toBeNull();
    expect(state.localMatchGraceRemainingMs).toBeNull();
    expect(state.reconnectGraceMs).toBe(RECONNECT_GRACE_MS);
  });

  it('sets guest pending with the default grace deadline and remaining time', () => {
    useGameplayStore
      .getState()
      .setLocalMatchStatus('guestPending', { nowMs: 1_000 });

    const state = useGameplayStore.getState();
    expect(selectLocalMatchStatus(state)).toBe('guestPending');
    expect(state.localMatchGraceDeadlineMs).toBe(1_000 + RECONNECT_GRACE_MS);
    expect(selectLocalMatchGraceRemainingMs(state)).toBe(RECONNECT_GRACE_MS);
    expect(state.reconnectGraceMs).toBe(RECONNECT_GRACE_MS);
  });

  it('supports a per-match grace override for host pending', () => {
    useGameplayStore.getState().setLocalMatchStatus('hostPending', {
      graceMs: 15_000,
      nowMs: 5_000,
    });

    const state = useGameplayStore.getState();
    expect(state.localMatchStatus).toBe('hostPending');
    expect(state.localMatchGraceDeadlineMs).toBe(20_000);
    expect(state.localMatchGraceRemainingMs).toBe(15_000);
    expect(state.reconnectGraceMs).toBe(15_000);
  });

  it('updates deadline or remaining countdown state for UI consumers', () => {
    const store = useGameplayStore.getState();

    store.setLocalMatchGraceDeadline(11_000, 1_000);
    expect(useGameplayStore.getState().localMatchGraceRemainingMs).toBe(10_000);

    store.setLocalMatchGraceRemaining(3_500, 2_000);
    expect(useGameplayStore.getState().localMatchGraceDeadlineMs).toBe(5_500);
    expect(useGameplayStore.getState().localMatchGraceRemainingMs).toBe(3_500);

    store.setLocalMatchGraceDeadline(1_000, 2_000);
    expect(useGameplayStore.getState().localMatchGraceRemainingMs).toBe(0);
  });

  it('returns to live and clears pending grace state without appending events', () => {
    const events: readonly IGameEvent[] = [];
    const session = buildSessionWithEvents(events);
    useGameplayStore.getState().setSession(session);

    useGameplayStore
      .getState()
      .setLocalMatchStatus('guestPending', { nowMs: 1_000 });
    expect(useGameplayStore.getState().session?.events).toBe(events);
    expect(useGameplayStore.getState().session?.events).toHaveLength(0);
    expect(useGameplayStore.getState().session?.currentState.status).toBe(
      GameStatus.Active,
    );

    useGameplayStore.getState().setLocalMatchStatus('live');
    const state = useGameplayStore.getState();
    expect(state.localMatchStatus).toBe('live');
    expect(state.localMatchGraceDeadlineMs).toBeNull();
    expect(state.localMatchGraceRemainingMs).toBeNull();
    expect(state.session?.events).toBe(events);
    expect(state.session?.events).toHaveLength(0);
    expect(state.session?.currentState.status).toBe(GameStatus.Active);
  });

  it('can mark the local match aborted without mutating the session log', () => {
    const events: readonly IGameEvent[] = [];
    const session = buildSessionWithEvents(events);
    useGameplayStore.getState().setSession(session);

    useGameplayStore
      .getState()
      .setLocalMatchStatus('aborted', { nowMs: 9_000 });

    const state = useGameplayStore.getState();
    expect(state.localMatchStatus).toBe('aborted');
    expect(state.localMatchGraceDeadlineMs).toBe(9_000);
    expect(state.localMatchGraceRemainingMs).toBe(0);
    expect(state.session?.events).toBe(events);
    expect(state.session?.events).toHaveLength(0);
    expect(state.session?.currentState.status).toBe(GameStatus.Active);
  });
});
