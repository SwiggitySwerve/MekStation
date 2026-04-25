/**
 * Tests for ProtoMechToken — point cluster + glider wings + main-gun overlay.
 *
 * Focuses on behaviours not already exercised by UnitTokenForType tests:
 *   - Point-of-5 pip count matches protoCount (1..5)
 *   - protoCount clamps to [1, 5]
 *   - Lead proto uses the proto-pip-lead testid
 *   - Glider-mode wings overlay toggles on/off based on isGlider
 *   - Main-gun indicator toggles on/off based on hasMainGun
 *   - Destroyed overlay
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — ProtoMech point clusters in one hex
 *        §Per-Type Facing Rules — ProtoMech uses 6-hex facing
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import { Facing, GameSide, TokenUnitType } from '@/types/gameplay';

import { ProtoMechToken } from '../ProtoMechToken';
import { EMPTY_EVENT_STATE } from '../tokenTypes';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

function makeProtoToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'proto-1',
    name: 'Test Proto',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'PROTO-1',
    unitType: TokenUnitType.ProtoMech,
    protoCount: 5,
    ...overrides,
  };
}

/**
 * Count rendered proto pips by looking for all elements whose data-testid
 * starts with "proto-pip-" or equals "proto-pip-lead".
 */
function countPipsByTestid(container: HTMLElement): number {
  return Array.from(container.querySelectorAll('[data-testid]')).filter(
    (el) => {
      const id = el.getAttribute('data-testid') ?? '';
      return id === 'proto-pip-lead' || id.startsWith('proto-pip-');
    },
  ).length;
}

// -----------------------------------------------------------------------------
// Point cluster size (spec §Per-Type Token Rendering — ProtoMech point clusters)
// -----------------------------------------------------------------------------

describe('ProtoMechToken point cluster', () => {
  it('renders 5 pips for a full point', () => {
    const token = makeProtoToken({ protoCount: 5 });
    const { container } = renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipsByTestid(container)).toBe(5);
  });

  it('renders 3 pips for a depleted point of 3', () => {
    const token = makeProtoToken({ protoCount: 3 });
    const { container } = renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipsByTestid(container)).toBe(3);
  });

  it('renders exactly 1 pip (the lead) for protoCount = 1', () => {
    const token = makeProtoToken({ protoCount: 1 });
    renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('proto-pip-lead')).toBeInTheDocument();
    expect(screen.queryByTestId('proto-pip-1')).toBeNull();
  });

  it('clamps protoCount to 1 minimum', () => {
    const token = makeProtoToken({ protoCount: 0 });
    const { container } = renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipsByTestid(container)).toBe(1);
  });

  it('clamps protoCount to 5 maximum', () => {
    const token = makeProtoToken({ protoCount: 99 });
    const { container } = renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipsByTestid(container)).toBe(5);
  });

  it('defaults protoCount to 5 when undefined', () => {
    const token = makeProtoToken({ protoCount: undefined });
    const { container } = renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(countPipsByTestid(container)).toBe(5);
  });
});

// -----------------------------------------------------------------------------
// Glider-mode wings
// -----------------------------------------------------------------------------

describe('ProtoMechToken glider-mode wings', () => {
  it('renders glider wings overlay when isGlider is true', () => {
    const token = makeProtoToken({ isGlider: true });
    renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('proto-glider-wings')).toBeInTheDocument();
  });

  it('omits glider wings overlay by default', () => {
    const token = makeProtoToken({});
    renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.queryByTestId('proto-glider-wings')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Main-gun indicator
// -----------------------------------------------------------------------------

describe('ProtoMechToken main-gun indicator', () => {
  it('renders the main-gun overlay when hasMainGun is true', () => {
    const token = makeProtoToken({ hasMainGun: true });
    renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('proto-main-gun')).toBeInTheDocument();
  });

  it('omits the main-gun overlay by default', () => {
    const token = makeProtoToken({});
    renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.queryByTestId('proto-main-gun')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Destroyed overlay
// -----------------------------------------------------------------------------

describe('ProtoMechToken destroyed state', () => {
  it('renders destroyed overlay when isDestroyed is true', () => {
    const token = makeProtoToken({ isDestroyed: true });
    renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });

  it('omits destroyed overlay when not destroyed', () => {
    const token = makeProtoToken({ isDestroyed: false });
    renderInSvg(
      <ProtoMechToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    expect(screen.queryByTestId('unit-destroyed-overlay')).toBeNull();
  });
});
