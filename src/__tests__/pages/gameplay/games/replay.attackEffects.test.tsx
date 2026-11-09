/**
 * Standalone replay route — load recovery and AttackEffectsLayer integration
 * for `add-replay-step-and-effect-animations` (tactical-map-interface
 * delta — "Attack Effects Layer In Replay Surfaces"):
 *
 *   - Standalone replay route mounts the attack effects layer
 *
 * Like the quick-game replay test, `<HexMapDisplay>` forwards
 * `mapId='replay'` to its internal `<AttackEffectsLayer>` mount on
 * line 463 of HexMapDisplay.tsx. We mock HexMapDisplay so we can
 * assert the forwarding contract and a single layer mount when an
 * uploaded event log is active. The page's center-pane placeholder
 * (rendered when no upload + no DB events) intentionally does NOT
 * mount the layer, matching the spec's empty-state behavior.
 *
 * @spec openspec/changes/add-replay-step-and-effect-animations/specs/tactical-map-interface/spec.md
 */

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IGameCreatedPayload,
  IGameEvent,
  IGameUnit,
} from '@/types/gameplay';

// =============================================================================
// Mocks — HexMapDisplay captures forwarded props with a stable testid
// for the `<AttackEffectsLayer>` mount inside it (HexMapDisplay.tsx
// line 463 forwards `mapId` + `events` + `tokens` to the layer).
// =============================================================================

jest.mock('@/components/gameplay/HexMapDisplay/HexMapDisplay', () => ({
  HexMapDisplay: (props: {
    mapId?: string;
    radius: number;
    tokens: readonly { unitId: string }[];
    events?: readonly { id: string }[];
  }) => (
    <div
      data-testid="hex-map-display-mock"
      data-map-id={props.mapId}
      data-token-count={props.tokens.length}
    >
      <div
        data-testid="attack-effects-layer-mock"
        data-map-id={props.mapId}
        data-event-count={props.events?.length ?? 0}
      />
    </div>
  ),
}));

// Stub Next router so the page renders without a Next stack.
const mockRouterPush = jest.fn();
let mockGameId = 'g-replay-test';
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: mockRouterPush,
    query: { id: mockGameId },
    pathname: '/gameplay/games/[id]/replay',
    isReady: true,
  }),
}));

// Control the browser event-store boundary independently of the match-log read.
const mockRefresh = jest.fn();
const mockTimeline = {
  allEvents: [] as readonly import('@/types/events').IBaseEvent[],
  isLoading: false,
  error: null as Error | null,
  pagination: { hasMore: false },
  loadMore: jest.fn(),
  refresh: mockRefresh,
};
jest.mock('@/hooks/audit', () => {
  const actual = jest.requireActual('@/hooks/audit');
  return {
    ...actual,
    useGameTimeline: () => mockTimeline,
  };
});

// Stub the JsonlFileLoader so the test can synchronously promote
// uploaded events via the captured `onEventsLoaded` callback. The real
// loader's drag-drop UI is not the surface under test here.
const capturedLoader: {
  onEventsLoaded?: (events: readonly IGameEvent[], filename: string) => void;
} = {};
jest.mock('@/components/audit/replay', () => {
  const actual = jest.requireActual('@/components/audit/replay');
  return {
    ...actual,
    JsonlFileLoader: (props: {
      onEventsLoaded: (events: readonly IGameEvent[], filename: string) => void;
      onClearUpload: () => void;
      uploadedFilename: string | null;
    }) => {
      capturedLoader.onEventsLoaded = props.onEventsLoaded;
      return (
        <div data-testid="jsonl-loader-mock">
          {props.uploadedFilename && (
            <button onClick={props.onClearUpload}>
              Clear {props.uploadedFilename}
            </button>
          )}
        </div>
      );
    },
  };
});

// =============================================================================
// Fixture helpers
// =============================================================================

function makeUnit(
  overrides: Partial<IGameUnit> & Pick<IGameUnit, 'id' | 'name' | 'side'>,
): IGameUnit {
  return {
    unitRef: 'atlas-as7-d',
    pilotRef: 'pilot-1',
    gunnery: 4,
    piloting: 5,
    ...overrides,
  };
}

function makeEvent(
  overrides: Partial<IGameEvent> &
    Pick<IGameEvent, 'type' | 'payload' | 'sequence'>,
): IGameEvent {
  return {
    id: `evt-${overrides.sequence}`,
    gameId: 'g-replay-test',
    timestamp: '2026-05-09T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    ...overrides,
  };
}

function makeStandardEvents(): readonly IGameEvent[] {
  const gameCreated: IGameCreatedPayload = {
    config: {
      mapRadius: 17,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      makeUnit({ id: 'player-1', name: 'Atlas AS7-D', side: GameSide.Player }),
      makeUnit({
        id: 'opponent-1',
        name: 'Stalker STK-3F',
        side: GameSide.Opponent,
      }),
    ],
  };
  return [
    makeEvent({
      sequence: 0,
      type: GameEventType.GameCreated,
      payload: gameCreated,
      phase: GamePhase.Initiative,
    }),
  ];
}

// =============================================================================
// Tests
// =============================================================================

import GameReplayPage from '@/pages/gameplay/games/[id]/replay';

function matchResponse(status: number, log = makeStandardEvents()): Response {
  const response: Pick<Response, 'ok' | 'status' | 'json'> = {
    ok: status >= 200 && status < 300,
    status,
    json: jest.fn().mockResolvedValue({ log }),
  };
  return response as Response;
}

function makeUploadedEvents(): readonly IGameEvent[] {
  return [
    ...makeStandardEvents(),
    makeEvent({ sequence: 1, type: GameEventType.TurnStarted, payload: {} }),
  ];
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

beforeEach(() => {
  mockGameId = 'g-replay-test';
  mockTimeline.allEvents = [];
  mockTimeline.error = null;
  mockTimeline.isLoading = false;
  mockRefresh.mockReset();
  capturedLoader.onEventsLoaded = undefined;
  jest.spyOn(global, 'fetch').mockResolvedValue(matchResponse(404));
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Standalone replay route — AttackEffectsLayer integration', () => {
  describe('spec scenario: Standalone replay route mounts the attack effects layer', () => {
    it('mounts exactly one AttackEffectsLayer element after an event log is uploaded', async () => {
      render(<GameReplayPage />);
      await screen.findByTestId('jsonl-loader-mock');

      // Upload-mode is off initially — placeholder renders, no layer.
      expect(
        screen.queryByTestId('attack-effects-layer-mock'),
      ).not.toBeInTheDocument();

      // Promote the captured upload callback to push the events into the
      // page's upload-mode state. The page's hex-map projection then has
      // tokens and the AttackEffectsLayer mount becomes visible.
      const events = makeStandardEvents();
      act(() => {
        capturedLoader.onEventsLoaded?.(events, 'sample.jsonl');
      });

      const layers = screen.getAllByTestId('attack-effects-layer-mock');
      expect(layers).toHaveLength(1);
    });

    it('passes a replay-scoped mapId that does NOT collide with live-play default-map', async () => {
      render(<GameReplayPage />);
      await screen.findByTestId('jsonl-loader-mock');

      const events = makeStandardEvents();
      act(() => {
        capturedLoader.onEventsLoaded?.(events, 'sample.jsonl');
      });

      const layer = screen.getByTestId('attack-effects-layer-mock');
      expect(layer).toHaveAttribute('data-map-id', 'replay');
      expect(layer.getAttribute('data-map-id')).not.toBe('default-map');
      expect(layer.getAttribute('data-map-id')).not.toBe('quickgame-replay');
    });

    it('forwards the uploaded event log into the AttackEffectsLayer', async () => {
      render(<GameReplayPage />);
      await screen.findByTestId('jsonl-loader-mock');

      const events = makeStandardEvents();
      act(() => {
        capturedLoader.onEventsLoaded?.(events, 'sample.jsonl');
      });

      const layer = screen.getByTestId('attack-effects-layer-mock');
      expect(layer).toHaveAttribute('data-event-count', String(events.length));
    });
  });
});

/** @spec openspec/changes/fix-replay-load-recovery/specs/quick-session/spec.md */
describe('Standalone replay load recovery', () => {
  it('shows a missing banner and retry while keeping file upload available', async () => {
    render(<GameReplayPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(screen.getByTestId('jsonl-loader-mock')).toBeInTheDocument();
    expect(
      screen.queryByText('Loading game replay...'),
    ).not.toBeInTheDocument();
  });

  it('shows a settled match-log failure even while the fallback timeline is loading', async () => {
    mockTimeline.isLoading = true;
    render(<GameReplayPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
  });

  it.each(['HTTP 500', 'network rejection', 'invalid JSON'])(
    '%s shows a retryable error',
    async (failure) => {
      const request = jest.mocked(global.fetch);
      if (failure === 'network rejection') {
        request.mockRejectedValueOnce(new Error('offline'));
      } else {
        const response = matchResponse(failure === 'HTTP 500' ? 500 : 200);
        if (failure === 'invalid JSON') {
          jest
            .mocked(response.json)
            .mockRejectedValueOnce(new SyntaxError('invalid JSON'));
        }
        request.mockResolvedValueOnce(response);
      }
      render(<GameReplayPage />);

      expect(await screen.findByRole('alert')).toHaveTextContent(
        /could not load/i,
      );
      expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    },
  );

  it('retries once while pending, refreshes the timeline and recovers playback', async () => {
    const pending = deferred<Response>();
    const request = jest.mocked(global.fetch);
    request
      .mockResolvedValueOnce(matchResponse(404))
      .mockReturnValueOnce(pending.promise);
    render(<GameReplayPage />);
    const retry = await screen.findByRole('button', { name: 'Retry' });

    fireEvent.click(retry);
    fireEvent.click(retry);
    expect(screen.getByRole('button', { name: 'Retrying...' })).toBeDisabled();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith('/api/matches/g-replay-test');
    expect(mockRefresh).toHaveBeenCalledTimes(1);

    await act(async () => pending.resolve(matchResponse(200)));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('replay-loaded-source')).toHaveTextContent(
      'loaded from match log',
    );
    expect(screen.getByTestId('attack-effects-layer-mock')).toHaveAttribute(
      'data-event-count',
      '1',
    );
  });

  it('remains retryable when another attempt fails', async () => {
    const request = jest.mocked(global.fetch);
    request
      .mockResolvedValueOnce(matchResponse(404))
      .mockResolvedValueOnce(matchResponse(500));
    render(<GameReplayPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/could not load/i),
    );
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('offers retry for a failed timeline and clears the warning after recovery', async () => {
    mockTimeline.error = new Error('Event store unavailable');
    mockRefresh.mockImplementation(() => {
      mockTimeline.error = null;
    });
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(matchResponse(404))
      .mockResolvedValueOnce(matchResponse(200));
    render(<GameReplayPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Event store unavailable',
    );
    expect(screen.getByTestId('jsonl-loader-mock')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByTestId('replay-loaded-source');
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each(['loading', 'error'])(
    'keeps a persisted replay usable when the timeline is %s',
    async (state) => {
      mockTimeline.isLoading = state === 'loading';
      mockTimeline.error =
        state === 'error' ? new Error('Event store unavailable') : null;
      jest.mocked(global.fetch).mockResolvedValueOnce(matchResponse(200));
      render(<GameReplayPage />);

      expect(
        await screen.findByTestId('replay-loaded-source'),
      ).toHaveTextContent('loaded from match log');
      expect(
        screen.getByTestId('attack-effects-layer-mock'),
      ).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    },
  );

  it('lets an upload replace a failed match log and restores the warning on clear', async () => {
    render(<GameReplayPage />);
    await screen.findByRole('alert');
    act(() =>
      capturedLoader.onEventsLoaded?.(makeStandardEvents(), 'upload.jsonl'),
    );

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('replay-loaded-source')).toHaveTextContent(
      'loaded from file',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear upload.jsonl' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/not found/i);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('preserves upload precedence and restores the persisted source on clear', async () => {
    const persisted = makeStandardEvents();
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(matchResponse(200, persisted));
    render(<GameReplayPage />);
    await screen.findByTestId('replay-loaded-source');
    act(() =>
      capturedLoader.onEventsLoaded?.(makeUploadedEvents(), 'upload.jsonl'),
    );

    expect(screen.getByTestId('attack-effects-layer-mock')).toHaveAttribute(
      'data-event-count',
      '2',
    );
    expect(screen.getByTestId('replay-loaded-source')).toHaveTextContent(
      'loaded from file',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear upload.jsonl' }));
    expect(screen.getByTestId('attack-effects-layer-mock')).toHaveAttribute(
      'data-event-count',
      '1',
    );
    expect(screen.getByTestId('replay-loaded-source')).toHaveTextContent(
      'loaded from match log',
    );
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps an upload active when a pending retry supplies persisted events', async () => {
    const pending = deferred<Response>();
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(matchResponse(404))
      .mockReturnValueOnce(pending.promise);
    render(<GameReplayPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    const events = makeStandardEvents();
    act(() =>
      capturedLoader.onEventsLoaded?.(makeUploadedEvents(), 'upload.jsonl'),
    );
    mockTimeline.isLoading = true;
    mockTimeline.error = new Error('Event store unavailable');
    await act(async () => pending.resolve(matchResponse(200, events)));

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByTestId('replay-loaded-source')).toHaveTextContent(
      'loaded from file',
    );
    expect(screen.getByTestId('attack-effects-layer-mock')).toHaveAttribute(
      'data-event-count',
      '2',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Clear upload.jsonl' }));
    expect(screen.getByTestId('replay-loaded-source')).toHaveTextContent(
      'loaded from match log',
    );
    expect(screen.getByTestId('attack-effects-layer-mock')).toHaveAttribute(
      'data-event-count',
      '1',
    );
  });

  it('ignores a previous game response whose JSON finishes after navigation', async () => {
    const stale = deferred<{ log: readonly IGameEvent[] }>();
    const response = matchResponse(200);
    jest.mocked(response.json).mockReturnValueOnce(stale.promise);
    jest
      .mocked(global.fetch)
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(matchResponse(404));
    const { rerender } = render(<GameReplayPage />);
    await waitFor(() => expect(response.json).toHaveBeenCalled());

    mockGameId = 'next-game';
    rerender(<GameReplayPage />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    await act(async () => stale.resolve({ log: makeStandardEvents() }));

    expect(
      screen.queryByTestId('replay-loaded-source'),
    ).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/not found/i);
  });
});
