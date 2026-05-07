/**
 * JsonlFileLoader — unit tests covering the 5 spec scenarios from
 * `add-replay-viewer-from-ndjson` (quick-session delta — Replay Viewer
 * Consumes Persisted NDJSON Files) plus an explicit no-network
 * assertion.
 *
 * The component is split into a pure parse helper (`parseNdjsonEvents`)
 * + the React shell. Most assertions hit the pure helper directly so we
 * don't have to mock `FileReader` for every case; two component-level
 * tests cover the drag-drop wiring and the clear-upload affordance.
 */

import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  IGameCreatedPayload,
  IGameEvent,
  MovementType,
} from '@/types/gameplay';

import { JsonlFileLoader, parseNdjsonEvents } from '../JsonlFileLoader';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function makeGameCreatedEvent(): IGameEvent {
  const payload: IGameCreatedPayload = {
    config: {
      mapRadius: 17,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      {
        id: 'player-1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
    ],
  };
  return {
    id: 'evt-0',
    gameId: 'test-game',
    sequence: 0,
    timestamp: '2026-05-07T00:00:00.000Z',
    type: GameEventType.GameCreated,
    turn: 1,
    phase: GamePhase.Initiative,
    side: GameSide.Player,
    payload,
  };
}

function makeMovementEvent(sequence: number): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: 'test-game',
    sequence,
    timestamp: '2026-05-07T00:00:00.000Z',
    type: GameEventType.MovementDeclared,
    turn: 1,
    phase: GamePhase.Movement,
    side: GameSide.Player,
    actorId: 'player-1',
    payload: {
      unitId: 'player-1',
      from: { q: 0, r: 0 },
      to: { q: 1, r: 0 },
      facing: Facing.North,
      movementType: MovementType.Walk,
      mpUsed: 1,
      heatGenerated: 0,
    },
  };
}

/**
 * Synthesize NDJSON content with `count` valid events. The first event
 * is `GameCreated`; the rest are `MovementDeclared` placeholders.
 */
function makeValidNdjson(count: number): string {
  const lines: string[] = [];
  lines.push(JSON.stringify(makeGameCreatedEvent()));
  for (let i = 1; i < count; i += 1) {
    lines.push(JSON.stringify(makeMovementEvent(i)));
  }
  return lines.join('\n');
}

// =============================================================================
// parseNdjsonEvents — spec scenarios
// =============================================================================

describe('parseNdjsonEvents', () => {
  describe('spec scenario: drag-drop of a valid 50-event NDJSON file populates the replay player', () => {
    it('returns ok with all 50 events when every line validates', () => {
      const contents = makeValidNdjson(50);

      const result = parseNdjsonEvents(contents);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.events).toHaveLength(50);
        expect(result.events[0].type).toBe(GameEventType.GameCreated);
      }
    });

    it('tolerates a trailing newline', () => {
      const contents = `${makeValidNdjson(3)}\n`;
      const result = parseNdjsonEvents(contents);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.events).toHaveLength(3);
      }
    });
  });

  describe('spec scenario: a file with one malformed JSON line is rejected with a per-line error', () => {
    it("records line N error 'not valid JSON' and rejects the whole file", () => {
      const validHead = JSON.stringify(makeGameCreatedEvent());
      const validTail = JSON.stringify(makeMovementEvent(1));
      const contents = [validHead, '{this is not json}', validTail].join('\n');

      const result = parseNdjsonEvents(contents);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toEqual({ line: 2, error: 'not valid JSON' });
      }
    });
  });

  describe('spec scenario: a file where one line parses as JSON but is not an IGameEvent is rejected', () => {
    it("records line N error 'not a valid IGameEvent' and rejects the whole file", () => {
      const validHead = JSON.stringify(makeGameCreatedEvent());
      const invalidShape = JSON.stringify({ foo: 'bar' });
      const contents = [validHead, invalidShape].join('\n');

      const result = parseNdjsonEvents(contents);

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0]).toEqual({
          line: 2,
          error: 'not a valid IGameEvent',
        });
      }
    });
  });

  describe('edge case: empty file produces ok with empty events', () => {
    it('returns ok with [] when contents are empty', () => {
      const result = parseNdjsonEvents('');
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.events).toEqual([]);
      }
    });
  });

  describe('edge case: empty interspersed lines do not produce errors', () => {
    it('tolerates blank lines between valid events', () => {
      const contents = [
        JSON.stringify(makeGameCreatedEvent()),
        '',
        JSON.stringify(makeMovementEvent(1)),
      ].join('\n');

      const result = parseNdjsonEvents(contents);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.events).toHaveLength(2);
      }
    });
  });
});

// =============================================================================
// Component-level tests
// =============================================================================

describe('JsonlFileLoader component', () => {
  describe('spec scenario: clearing the upload reverts the replay page to its DB event source', () => {
    it('calls onClearUpload when the user clicks the clear button', () => {
      const onClearUpload = jest.fn();
      render(
        <JsonlFileLoader
          onEventsLoaded={jest.fn()}
          onClearUpload={onClearUpload}
          uploadedFilename="sim-42.jsonl"
          eventCount={50}
          minTurn={1}
          maxTurn={12}
        />,
      );

      const clearButton = screen.getByTestId('jsonl-loader-clear');
      fireEvent.click(clearButton);

      expect(onClearUpload).toHaveBeenCalledTimes(1);
    });

    it('shows the filename + event count + turn range in the status pill', () => {
      render(
        <JsonlFileLoader
          onEventsLoaded={jest.fn()}
          onClearUpload={jest.fn()}
          uploadedFilename="sim-42.jsonl"
          eventCount={50}
          minTurn={1}
          maxTurn={12}
        />,
      );

      const status = screen.getByTestId('jsonl-loader-status');
      expect(status).toHaveTextContent('loaded');
      expect(status).toHaveTextContent('sim-42.jsonl');
      expect(status).toHaveTextContent('50 events');
      expect(status).toHaveTextContent('turns 1–12');
    });
  });

  describe('drop zone wiring', () => {
    it('invokes onEventsLoaded with parsed events and filename when a valid file is dropped', async () => {
      const onEventsLoaded = jest.fn();
      render(
        <JsonlFileLoader
          onEventsLoaded={onEventsLoaded}
          onClearUpload={jest.fn()}
        />,
      );

      const dropzone = screen.getByTestId('jsonl-loader-dropzone');
      const contents = makeValidNdjson(3);
      const file = new File([contents], 'sim-42.jsonl', {
        type: 'application/json',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(onEventsLoaded).toHaveBeenCalledTimes(1);
      });
      const [events, filename] = onEventsLoaded.mock.calls[0];
      expect(events).toHaveLength(3);
      expect(filename).toBe('sim-42.jsonl');
    });

    it('renders the per-line error list when the dropped file has invalid JSON', async () => {
      const onEventsLoaded = jest.fn();
      render(
        <JsonlFileLoader
          onEventsLoaded={onEventsLoaded}
          onClearUpload={jest.fn()}
        />,
      );

      const dropzone = screen.getByTestId('jsonl-loader-dropzone');
      const contents = `${JSON.stringify(makeGameCreatedEvent())}\n{not json}`;
      const file = new File([contents], 'broken.jsonl', {
        type: 'application/json',
      });

      fireEvent.drop(dropzone, {
        dataTransfer: { files: [file] },
      });

      await waitFor(() => {
        expect(screen.getByTestId('jsonl-loader-errors')).toBeInTheDocument();
      });
      expect(onEventsLoaded).not.toHaveBeenCalled();
      expect(screen.getByTestId('jsonl-loader-errors')).toHaveTextContent(
        'line 2: not valid JSON',
      );
    });
  });

  describe('no-network assertion', () => {
    it('does not call fetch / XMLHttpRequest during a file drop', async () => {
      const fetchSpy = jest.fn();
      const xhrSpy = jest.fn();
      const originalFetch = globalThis.fetch;
      const originalXhr = globalThis.XMLHttpRequest;
      // Replace with spies to detect any accidental network call.
      globalThis.fetch = fetchSpy as unknown as typeof fetch;
      globalThis.XMLHttpRequest = xhrSpy as unknown as typeof XMLHttpRequest;

      try {
        const onEventsLoaded = jest.fn();
        render(
          <JsonlFileLoader
            onEventsLoaded={onEventsLoaded}
            onClearUpload={jest.fn()}
          />,
        );

        const dropzone = screen.getByTestId('jsonl-loader-dropzone');
        const contents = makeValidNdjson(2);
        const file = new File([contents], 'sim-42.jsonl', {
          type: 'application/json',
        });
        fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });

        await waitFor(() => {
          expect(onEventsLoaded).toHaveBeenCalled();
        });

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(xhrSpy).not.toHaveBeenCalled();
      } finally {
        globalThis.fetch = originalFetch;
        globalThis.XMLHttpRequest = originalXhr;
      }
    });
  });
});
