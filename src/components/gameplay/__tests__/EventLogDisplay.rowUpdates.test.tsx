/**
 * Perf P2 correctness pins for the memoized event log. Rows skip renders
 * when nothing they draw changed (EventRow memo), so these pin the other
 * half: every way a shown row's content can change without the row's event
 * object being reused must still reach the screen. Also pins that a log
 * re-render with no filter (a collapse toggle) does not re-format events.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { IGameEvent } from '@/types/gameplay';

import { EventLogDisplay } from '@/components/gameplay/EventLogDisplay';
import { formatEvent } from '@/components/gameplay/EventLogDisplay.formatters';
import {
  Facing,
  GameEventType,
  GamePhase,
  MovementType,
} from '@/types/gameplay';

jest.mock('@/components/gameplay/EventLogDisplay.formatters', () => {
  const actual = jest.requireActual(
    '@/components/gameplay/EventLogDisplay.formatters',
  );
  return { ...actual, formatEvent: jest.fn(actual.formatEvent) };
});

const formatEventSpy = formatEvent as jest.MockedFunction<typeof formatEvent>;

function makeEvent(
  sequence: number,
  type: GameEventType,
  payload: IGameEvent['payload'],
  turn = 1,
): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: 'map-1',
    sequence,
    timestamp: `2026-04-29T00:00:0${sequence}.000Z`,
    type,
    turn,
    phase: GamePhase.Movement,
    actorId: 'unit-a',
    payload,
  };
}

function moved(sequence: number, mp: number, turn = 1): IGameEvent {
  return makeEvent(
    sequence,
    GameEventType.MovementDeclared,
    {
      unitId: 'unit-a',
      from: { q: 0, r: 0 },
      to: { q: mp, r: 0 },
      facing: Facing.South,
      movementType: MovementType.Walk,
      mode: MovementType.Walk,
      path: [
        { q: 0, r: 0 },
        { q: mp, r: 0 },
      ],
      mpUsed: mp,
      heatGenerated: 1,
    },
    turn,
  );
}

function heat(sequence: number, amount: number): IGameEvent {
  return makeEvent(sequence, GameEventType.HeatGenerated, {
    unitId: 'unit-b',
    amount,
    newTotal: amount,
    source: 'movement',
  });
}

/** Each shown row as "turn | actor | text", newest first. */
function shownRows(): string[] {
  return screen.queryAllByTestId('event-row').map((row) => {
    const turn = row.querySelector('[data-testid="event-turn"]')?.textContent;
    const actor = row.querySelector('[data-testid="event-actor"]')?.textContent;
    const text = row.querySelector('[data-testid="event-text"]')?.textContent;
    return `${turn} | ${actor} | ${text}`;
  });
}

describe('EventLogDisplay rows redraw when what they show changes (perf P2)', () => {
  const both = { 'unit-a': 'Bravo', 'unit-b': 'Charlie' };

  it('shows an actor rename (fog reveal or GM rename) on an unchanged event', () => {
    const events = [moved(1, 3), heat(2, 1)];
    const { rerender } = render(
      <EventLogDisplay events={events} actorLookup={{ 'unit-a': 'Alpha' }} />,
    );
    expect(shownRows()).toEqual([
      'T1 | unit-b | Heat +1 (total: 1)',
      'T1 | Alpha | Unit moved (walk, 3 MP)',
    ]);

    rerender(
      <EventLogDisplay events={events} actorLookup={{ 'unit-a': 'Bravo' }} />,
    );
    expect(shownRows()).toEqual([
      'T1 | unit-b | Heat +1 (total: 1)',
      'T1 | Bravo | Unit moved (walk, 3 MP)',
    ]);

    rerender(<EventLogDisplay events={events} actorLookup={both} />);
    expect(shownRows()).toEqual([
      'T1 | Charlie | Heat +1 (total: 1)',
      'T1 | Bravo | Unit moved (walk, 3 MP)',
    ]);
  });

  it('shows a correction that replaces an event under the same id', () => {
    const { rerender } = render(
      <EventLogDisplay events={[moved(1, 3), heat(2, 1)]} actorLookup={both} />,
    );
    rerender(
      <EventLogDisplay
        events={[moved(1, 5, 2), heat(2, 1)]}
        actorLookup={both}
      />,
    );
    expect(shownRows()).toEqual([
      'T1 | Charlie | Heat +1 (total: 1)',
      'T2 | Bravo | Unit moved (walk, 5 MP)',
    ]);
  });

  it('shows a rewind that replaces the list', () => {
    const { rerender } = render(
      <EventLogDisplay events={[moved(1, 3), heat(2, 1)]} actorLookup={both} />,
    );
    rerender(<EventLogDisplay events={[moved(1, 2)]} actorLookup={both} />);
    expect(shownRows()).toEqual(['T1 | Bravo | Unit moved (walk, 2 MP)']);
  });

  it('applies a filter change', () => {
    const events = [moved(1, 3), heat(2, 1)];
    const { rerender } = render(
      <EventLogDisplay events={events} actorLookup={both} />,
    );
    rerender(
      <EventLogDisplay
        events={events}
        filter={{ unitId: 'unit-a' }}
        actorLookup={both}
      />,
    );
    expect(shownRows()).toEqual(['T1 | Bravo | Unit moved (walk, 3 MP)']);
  });
});

describe('EventLogDisplay default filter (perf P2)', () => {
  it('does not re-format the log when it re-renders with no filter', () => {
    const events = Array.from({ length: 20 }, (_, index) =>
      heat(index + 1, index + 1),
    );
    render(<EventLogDisplay events={events} />);
    expect(screen.getAllByTestId('event-row')).toHaveLength(20);
    formatEventSpy.mockClear();

    // A collapse toggle re-renders the log with the same props.
    fireEvent.click(screen.getByTestId('event-log-toggle'));
    fireEvent.click(screen.getByTestId('event-log-toggle'));

    expect(screen.getAllByTestId('event-row')).toHaveLength(20);
    expect(formatEventSpy).not.toHaveBeenCalled();
  });
});
