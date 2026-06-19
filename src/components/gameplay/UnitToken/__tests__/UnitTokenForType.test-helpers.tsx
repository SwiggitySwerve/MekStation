/**
 * Tests for UnitTokenForType — central dispatcher for per-type hex map tokens.
 *
 * Uses @testing-library/react to render the SVG dispatcher and asserts that:
 *   1. Each unitType routes to the correct per-type renderer (identified via data-testid).
 *   2. BA mounted-on-mech path renders the badge overlay next to the host token.
 *   3. Click handler (onClick) is forwarded correctly.
 *
 * All SVG rendering runs in jsdom. Components are rendered inside an <svg>
 * wrapper because jsdom requires SVG children to live inside an <svg> root.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — dispatcher routes to correct renderer per unit type
 */

import { act, render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { IGameEvent, IUnitToken } from '@/types/gameplay';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import {
  GameSide,
  TokenUnitType,
  Facing,
  MovementType,
  GameEventType,
  GamePhase,
  VehicleMotionType,
} from '@/types/gameplay';

import { UnitTokenForType } from '../UnitTokenForType';

// =============================================================================
// Helpers
// =============================================================================

/** Wrap the dispatcher in an <svg> element so jsdom renders it correctly. */
function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

/** Base token fixture — override fields per test. */
function makeToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'unit-1',
    name: 'Test Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'TST-1',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function makeEvent(
  type: GameEventType,
  payload: IGameEvent['payload'],
  sequence = 1,
): IGameEvent {
  return {
    id: `${type}-${sequence}`,
    gameId: 'game',
    sequence,
    timestamp: `2026-04-29T00:00:0${sequence}.000Z`,
    type,
    turn: 1,
    phase: GamePhase.Heat,
    payload,
  };
}

// =============================================================================
// Dispatcher routing — each unitType → correct wrapper data-testid
// =============================================================================

let rafCallbacks = new Map<number, FrameRequestCallback>();

function installRafMock(): () => void {
  const originalRequestAnimationFrame = window.requestAnimationFrame;
  const originalCancelAnimationFrame = window.cancelAnimationFrame;
  let nextFrameId = 1;
  rafCallbacks = new Map();

  Object.defineProperty(window, 'requestAnimationFrame', {
    writable: true,
    value: jest.fn((callback: FrameRequestCallback) => {
      const frameId = nextFrameId;
      nextFrameId += 1;
      rafCallbacks.set(frameId, callback);
      return frameId;
    }),
  });
  Object.defineProperty(window, 'cancelAnimationFrame', {
    writable: true,
    value: jest.fn((frameId: number) => {
      rafCallbacks.delete(frameId);
    }),
  });

  return () => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      writable: true,
      value: originalRequestAnimationFrame,
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      writable: true,
      value: originalCancelAnimationFrame,
    });
  };
}

function flushRafFrame(timestamp: number): void {
  const callbacks = Array.from(rafCallbacks.values());
  rafCallbacks.clear();
  act(() => {
    for (const callback of callbacks) {
      callback(timestamp);
    }
  });
}

export {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  MovementType,
  React,
  TokenUnitType,
  UnitTokenForType,
  VehicleMotionType,
  act,
  fireEvent,
  flushRafFrame,
  installRafMock,
  makeEvent,
  makeToken,
  rafCallbacks,
  render,
  renderInSvg,
  screen,
  useAnimationQueue,
};

export type { IGameEvent, IUnitToken };
