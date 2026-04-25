/**
 * Tests for BattleArmorToken — trooper-pip cluster + mounted-badge variant.
 *
 * Focuses on behaviours not already exercised by UnitTokenForType tests:
 *   - Pip count matches trooperCount
 *   - Pip count clamps to [1, 6]
 *   - Jump/UMU active ring appears only when jumpActive set
 *   - Mounted badge variant renders compact layout with "BA×N" label
 *   - Destroyed overlay
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — BattleArmor mounted renders as badge
 *        §Selection + Range Scaling — BA selection ring scales down
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import { Facing, GameSide, TokenUnitType } from '@/types/gameplay';

import { BattleArmorToken } from '../BattleArmorToken';
import { EMPTY_EVENT_STATE } from '../tokenTypes';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

function makeBAToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'ba-1',
    name: 'Test BA',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'BA-1',
    unitType: TokenUnitType.BattleArmor,
    trooperCount: 4,
    ...overrides,
  };
}

/**
 * Count the non-background circles that make up the trooper pip cluster.
 * The component emits an outer selection ring, an optional jump-active ring,
 * and a background anchor circle before the pips — all positioned at (0,0).
 * Pips themselves carry explicit `cx` / `cy` attributes, which we filter on.
 */
function countPipCircles(container: HTMLElement): number {
  return Array.from(container.querySelectorAll('circle')).filter((c) =>
    c.hasAttribute('cx'),
  ).length;
}

// -----------------------------------------------------------------------------
// Standalone pip cluster
// -----------------------------------------------------------------------------

describe('BattleArmorToken standalone cluster', () => {
  it('renders exactly N pips for trooperCount = 4', () => {
    const token = makeBAToken({ trooperCount: 4 });
    const { container } = renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipCircles(container)).toBe(4);
  });

  it('renders exactly 6 pips for trooperCount = 6', () => {
    const token = makeBAToken({ trooperCount: 6 });
    const { container } = renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipCircles(container)).toBe(6);
  });

  it('clamps trooperCount to 1 minimum', () => {
    const token = makeBAToken({ trooperCount: 0 });
    const { container } = renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipCircles(container)).toBe(1);
  });

  it('clamps trooperCount to 6 maximum', () => {
    const token = makeBAToken({ trooperCount: 99 });
    const { container } = renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipCircles(container)).toBe(6);
  });

  it('defaults trooperCount to 4 when undefined', () => {
    const token = makeBAToken({ trooperCount: undefined });
    const { container } = renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipCircles(container)).toBe(4);
  });
});

// -----------------------------------------------------------------------------
// Jump/UMU active indicator
// -----------------------------------------------------------------------------

describe('BattleArmorToken jump active indicator', () => {
  it('renders jump-active ring when jumpActive is true', () => {
    const token = makeBAToken({ jumpActive: true });
    renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('ba-jump-active')).toBeInTheDocument();
  });

  it('omits jump-active ring by default', () => {
    const token = makeBAToken({});
    renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.queryByTestId('ba-jump-active')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Mounted badge variant (spec §BattleArmor mounted renders as badge)
// -----------------------------------------------------------------------------

describe('BattleArmorToken mounted-badge variant', () => {
  it('renders the ba-badge wrapper and "BA×N" label', () => {
    const token = makeBAToken({ trooperCount: 5 });
    const { container } = renderInSvg(
      <BattleArmorToken
        token={token}
        eventState={EMPTY_EVENT_STATE}
        mountedBadge
      />,
    );
    expect(screen.getByTestId('ba-badge-ba-1')).toBeInTheDocument();
    const text = container.querySelector('text');
    expect(text?.textContent).toBe('BA×5');
  });

  it('does NOT render the standalone pip cluster when mountedBadge is true', () => {
    const token = makeBAToken({ trooperCount: 4 });
    const { container } = renderInSvg(
      <BattleArmorToken
        token={token}
        eventState={EMPTY_EVENT_STATE}
        mountedBadge
      />,
    );
    // Badge variant is a single <rect>+<text>; no individual pip circles with
    // cx attributes.
    expect(countPipCircles(container)).toBe(0);
  });
});

// -----------------------------------------------------------------------------
// Destroyed overlay
// -----------------------------------------------------------------------------

describe('BattleArmorToken destroyed state', () => {
  it('renders destroyed overlay when isDestroyed is true (standalone)', () => {
    const token = makeBAToken({ isDestroyed: true });
    renderInSvg(
      <BattleArmorToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });
});
