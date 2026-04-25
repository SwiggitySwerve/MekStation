/**
 * Tests for AerospaceToken — wedge silhouette + velocity vector + altitude
 * badge + landed visual distinction.
 *
 * Focuses on spec-critical behaviours:
 *   - Velocity vector length proportional to velocity
 *   - Velocity vector omitted when landed (altitude === 0)
 *   - Altitude badge shows "GND" when landed, numeric value otherwise
 *   - Destroyed overlay renders
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — Aerospace renders aerospace token
 *        §Aerospace Velocity + Altitude Indicators
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import { Facing, GameSide, TokenUnitType } from '@/types/gameplay';

import { AerospaceToken } from '../AerospaceToken';
import { EMPTY_EVENT_STATE } from '../tokenTypes';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

function makeAerospaceToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'aero-1',
    name: 'Test Aerospace',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'AERO-1',
    unitType: TokenUnitType.Aerospace,
    altitude: 3,
    velocity: 5,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Altitude badge
// -----------------------------------------------------------------------------

describe('AerospaceToken altitude badge', () => {
  it('renders numeric altitude value when airborne', () => {
    const token = makeAerospaceToken({ altitude: 7 });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('altitude-badge').textContent).toBe('7');
  });

  it('renders "GND" label when altitude is 0 (landed)', () => {
    const token = makeAerospaceToken({ altitude: 0, velocity: 0 });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('altitude-badge').textContent).toBe('GND');
  });

  it('defaults altitude to 1 when undefined', () => {
    const token = makeAerospaceToken({ altitude: undefined });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('altitude-badge').textContent).toBe('1');
  });
});

// -----------------------------------------------------------------------------
// Velocity vector (spec §Aerospace Velocity + Altitude — Velocity vector length)
// -----------------------------------------------------------------------------

describe('AerospaceToken velocity vector', () => {
  it('renders the velocity vector when airborne with velocity > 0', () => {
    const token = makeAerospaceToken({ altitude: 3, velocity: 5 });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('velocity-vector')).toBeInTheDocument();
  });

  it('omits the velocity vector when landed (altitude === 0)', () => {
    const token = makeAerospaceToken({ altitude: 0, velocity: 5 });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.queryByTestId('velocity-vector')).toBeNull();
  });

  it('omits the velocity vector when velocity is 0', () => {
    const token = makeAerospaceToken({ altitude: 3, velocity: 0 });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.queryByTestId('velocity-vector')).toBeNull();
  });

  it('vector length grows with velocity (proportional)', () => {
    const slowToken = makeAerospaceToken({ altitude: 3, velocity: 2 });
    const fastToken = makeAerospaceToken({ altitude: 3, velocity: 8 });

    const { container: slowContainer } = renderInSvg(
      <AerospaceToken token={slowToken} eventState={EMPTY_EVENT_STATE} />,
    );
    const { container: fastContainer } = renderInSvg(
      <AerospaceToken token={fastToken} eventState={EMPTY_EVENT_STATE} />,
    );

    const slowLine = slowContainer.querySelector(
      '[data-testid="velocity-vector"]',
    );
    const fastLine = fastContainer.querySelector(
      '[data-testid="velocity-vector"]',
    );
    expect(slowLine).not.toBeNull();
    expect(fastLine).not.toBeNull();

    // Compute vector magnitude from (x1,y1) → (x2,y2). Faster should produce
    // a longer vector (proportional per PX_PER_VELOCITY = 4).
    function magnitude(line: Element | null): number {
      if (!line) return 0;
      const x1 = parseFloat(line.getAttribute('x1') ?? '0');
      const y1 = parseFloat(line.getAttribute('y1') ?? '0');
      const x2 = parseFloat(line.getAttribute('x2') ?? '0');
      const y2 = parseFloat(line.getAttribute('y2') ?? '0');
      return Math.hypot(x2 - x1, y2 - y1);
    }
    expect(magnitude(fastLine)).toBeGreaterThan(magnitude(slowLine));
  });
});

// -----------------------------------------------------------------------------
// Destroyed overlay
// -----------------------------------------------------------------------------

describe('AerospaceToken destroyed state', () => {
  it('renders destroyed overlay when isDestroyed is true', () => {
    const token = makeAerospaceToken({ isDestroyed: true });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });

  it('omits destroyed overlay when not destroyed', () => {
    const token = makeAerospaceToken({ isDestroyed: false });
    renderInSvg(
      <AerospaceToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.queryByTestId('unit-destroyed-overlay')).toBeNull();
  });
});
