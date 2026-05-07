/**
 * KeyMomentMarkers — render tests covering the spec scenarios from
 * `add-replay-timeline-markers` (combat-analytics delta —
 * "Replay Timeline Key-Moment Markers Contract"):
 *
 * 1. Position test — markers at correct relative positions
 * 2. Color test — marker color matches event type
 * 3. Click test — onSeek called with expected position
 * 4. Empty-log test — no badges render
 *
 * @spec openspec/changes/add-replay-timeline-markers/specs/combat-analytics/spec.md
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import '@testing-library/jest-dom';
import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
} from '@/types/gameplay';

import { KeyMomentMarkers } from '../KeyMomentMarkers';

// =============================================================================
// Fixture helper
// =============================================================================

function makeEvent(
  overrides: Partial<IGameEvent> & Pick<IGameEvent, 'type' | 'sequence' | 'id'>,
): IGameEvent {
  return {
    gameId: 'test-game',
    timestamp: '2026-05-07T00:00:00.000Z',
    turn: 1,
    phase: GamePhase.WeaponAttack,
    side: GameSide.Player,
    payload: {} as IGameEvent['payload'],
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('KeyMomentMarkers', () => {
  describe('Empty-log guard', () => {
    it('renders nothing when events is empty', () => {
      const { container } = render(
        <KeyMomentMarkers
          events={[]}
          minSequence={0}
          maxSequence={100}
          onSeek={jest.fn()}
        />,
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders nothing when no events match the five key-moment types', () => {
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'evt-1',
          type: GameEventType.MovementDeclared,
          sequence: 10,
        }),
        makeEvent({
          id: 'evt-2',
          type: GameEventType.DamageApplied,
          sequence: 20,
        }),
      ];
      const { container } = render(
        <KeyMomentMarkers
          events={events}
          minSequence={0}
          maxSequence={100}
          onSeek={jest.fn()}
        />,
      );
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Position projection', () => {
    it('renders markers at correct relative positions', () => {
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'kill-1',
          type: GameEventType.UnitDestroyed,
          sequence: 50,
        }),
        makeEvent({
          id: 'crit-1',
          type: GameEventType.CriticalHit,
          sequence: 100,
        }),
      ];
      render(
        <KeyMomentMarkers
          events={events}
          minSequence={0}
          maxSequence={200}
          onSeek={jest.fn()}
        />,
      );

      const killBadge = screen.getByTestId('key-moment-marker-kill-1');
      const critBadge = screen.getByTestId('key-moment-marker-crit-1');
      expect(killBadge).toHaveStyle({ left: '25%' }); // 50 / 200
      expect(critBadge).toHaveStyle({ left: '50%' }); // 100 / 200
    });
  });

  describe('Color mapping', () => {
    it('UnitDestroyed renders red, CriticalHit renders orange', () => {
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'kill-1',
          type: GameEventType.UnitDestroyed,
          sequence: 50,
        }),
        makeEvent({
          id: 'crit-1',
          type: GameEventType.CriticalHit,
          sequence: 100,
        }),
      ];
      render(
        <KeyMomentMarkers
          events={events}
          minSequence={0}
          maxSequence={200}
          onSeek={jest.fn()}
        />,
      );

      expect(screen.getByTestId('key-moment-marker-kill-1').className).toMatch(
        /bg-red-/,
      );
      expect(screen.getByTestId('key-moment-marker-crit-1').className).toMatch(
        /bg-orange-/,
      );
    });

    it('AmmoExplosion renders purple, PilotHit renders yellow, UnitFell renders gray', () => {
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'ammo-1',
          type: GameEventType.AmmoExplosion,
          sequence: 30,
        }),
        makeEvent({
          id: 'pilot-1',
          type: GameEventType.PilotHit,
          sequence: 60,
        }),
        makeEvent({
          id: 'fell-1',
          type: GameEventType.UnitFell,
          sequence: 90,
        }),
      ];
      render(
        <KeyMomentMarkers
          events={events}
          minSequence={0}
          maxSequence={100}
          onSeek={jest.fn()}
        />,
      );

      expect(screen.getByTestId('key-moment-marker-ammo-1').className).toMatch(
        /bg-purple-/,
      );
      expect(screen.getByTestId('key-moment-marker-pilot-1').className).toMatch(
        /bg-yellow-/,
      );
      expect(screen.getByTestId('key-moment-marker-fell-1').className).toMatch(
        /bg-gray-/,
      );
    });
  });

  describe('Click-to-seek', () => {
    it("clicking a badge invokes onSeek with the badge's relative position", () => {
      const onSeek = jest.fn();
      const events: readonly IGameEvent[] = [
        makeEvent({
          id: 'kill-1',
          type: GameEventType.UnitDestroyed,
          sequence: 50,
        }),
      ];
      render(
        <KeyMomentMarkers
          events={events}
          minSequence={0}
          maxSequence={200}
          onSeek={onSeek}
        />,
      );

      fireEvent.click(screen.getByTestId('key-moment-marker-kill-1'));
      expect(onSeek).toHaveBeenCalledTimes(1);
      expect(onSeek).toHaveBeenCalledWith(0.25);
    });
  });
});
