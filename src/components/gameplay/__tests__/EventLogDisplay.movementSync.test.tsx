import { render, screen } from '@testing-library/react';

import type { IGameEvent } from '@/types/gameplay';

import { EventLogDisplay } from '@/components/gameplay/EventLogDisplay';
import {
  Facing,
  GameEventType,
  GamePhase,
  MovementType,
} from '@/types/gameplay';
import { filterEventsForMovementAnimations } from '@/utils/gameplay/movement/eventLogSync';

describe('EventLogDisplay movement animation sync', () => {
  it('holds movement and heat entries until the movement animation settles', () => {
    const events = [
      makeEvent(1, GameEventType.MovementDeclared, {
        unitId: 'unit-a',
        from: { q: 0, r: 0 },
        to: { q: 3, r: 0 },
        facing: Facing.South,
        movementType: MovementType.Walk,
        mode: MovementType.Walk,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
          { q: 2, r: 0 },
          { q: 3, r: 0 },
        ],
        mpUsed: 3,
        heatGenerated: 1,
      }),
      makeEvent(2, GameEventType.HeatGenerated, {
        unitId: 'unit-a',
        amount: 1,
        newTotal: 1,
        source: 'movement',
      }),
    ];

    const { rerender } = render(
      <EventLogDisplay
        events={filterEventsForMovementAnimations(
          events,
          [{ mapId: 'map-1', kind: 'movement', eventSequence: 1 }],
          'map-1',
        )}
      />,
    );

    expect(screen.queryByText(/Unit moved/)).toBeNull();
    expect(screen.queryByText(/Heat \+1/)).toBeNull();

    rerender(
      <EventLogDisplay
        events={filterEventsForMovementAnimations(events, [], 'map-1')}
      />,
    );

    expect(screen.getByText(/Unit moved/)).toBeInTheDocument();
    expect(screen.getByText(/Heat \+1/)).toBeInTheDocument();
  });
});

function makeEvent(
  sequence: number,
  type: GameEventType,
  payload: IGameEvent['payload'],
): IGameEvent {
  return {
    id: `event-${sequence}`,
    gameId: 'map-1',
    sequence,
    timestamp: `2026-04-29T00:00:0${sequence}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.Movement,
    actorId: 'unit-a',
    payload,
  };
}
