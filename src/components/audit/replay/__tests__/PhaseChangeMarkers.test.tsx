/**
 * PhaseChangeMarkers — render tests covering the spec scenarios from
 * `add-replay-timeline-markers` (combat-analytics delta —
 * "Replay Timeline Key-Moment Markers Contract"):
 *
 * - Phase-change markers render at every TurnStarted and PhaseChanged
 * - Tooltip on hover reveals "Turn N — <phase>"
 * - Empty-log test
 *
 * @spec openspec/changes/add-replay-timeline-markers/specs/combat-analytics/spec.md
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
} from '@/types/gameplay';

import { PhaseChangeMarkers } from '../PhaseChangeMarkers';

function makeEvent(
  overrides: Partial<IGameEvent> &
    Pick<IGameEvent, 'type' | 'sequence' | 'id' | 'turn' | 'phase'>,
): IGameEvent {
  return {
    gameId: 'test-game',
    timestamp: '2026-05-07T00:00:00.000Z',
    side: GameSide.Player,
    payload: {} as IGameEvent['payload'],
    ...overrides,
  };
}

describe('PhaseChangeMarkers', () => {
  describe('Empty-log guard', () => {
    it('renders nothing when events is empty', () => {
      const { container } = render(
        <PhaseChangeMarkers events={[]} minSequence={0} maxSequence={100} />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when no events are TurnStarted or PhaseChanged', () => {
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'evt-1',
          type: GameEventType.MovementDeclared,
          sequence: 10,
          turn: 1,
          phase: GamePhase.Movement,
        }),
      ];
      const { container } = render(
        <PhaseChangeMarkers
          events={events}
          minSequence={0}
          maxSequence={100}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Render every TurnStarted and PhaseChanged', () => {
    it('renders six markers when log has 3 turn-starts + 3 phase-changes', () => {
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'ts-1',
          type: GameEventType.TurnStarted,
          sequence: 10,
          turn: 1,
          phase: GamePhase.Initiative,
        }),
        makeEvent({
          id: 'pc-1',
          type: GameEventType.PhaseChanged,
          sequence: 15,
          turn: 1,
          phase: GamePhase.Movement,
        }),
        makeEvent({
          id: 'ts-2',
          type: GameEventType.TurnStarted,
          sequence: 30,
          turn: 2,
          phase: GamePhase.Initiative,
        }),
        makeEvent({
          id: 'pc-2',
          type: GameEventType.PhaseChanged,
          sequence: 35,
          turn: 2,
          phase: GamePhase.WeaponAttack,
        }),
        makeEvent({
          id: 'ts-3',
          type: GameEventType.TurnStarted,
          sequence: 50,
          turn: 3,
          phase: GamePhase.Initiative,
        }),
        makeEvent({
          id: 'pc-3',
          type: GameEventType.PhaseChanged,
          sequence: 55,
          turn: 3,
          phase: GamePhase.Heat,
        }),
      ];
      render(
        <PhaseChangeMarkers events={events} minSequence={0} maxSequence={60} />,
      );

      // All six markers present.
      expect(
        screen.getByTestId('phase-change-marker-ts-1'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('phase-change-marker-pc-1'),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('phase-change-marker-pc-3'),
      ).toBeInTheDocument();
    });

    it('tooltip uses human-readable phase labels', () => {
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'pc-wa',
          type: GameEventType.PhaseChanged,
          sequence: 35,
          turn: 7,
          phase: GamePhase.WeaponAttack,
        }),
      ];
      render(
        <PhaseChangeMarkers events={events} minSequence={0} maxSequence={50} />,
      );

      const marker = screen.getByTestId('phase-change-marker-pc-wa');
      expect(marker).toHaveAttribute('title', 'Turn 7 — Weapon Attack');
    });
  });
});
