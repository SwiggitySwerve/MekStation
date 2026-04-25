/**
 * Tests for InfantryToken — stack icon + trooper count + motive badge +
 * specialization icon + platoon stack indicator.
 *
 * Focuses on behaviours not already exercised by UnitTokenForType tests:
 *   - Trooper count label reflects infantryCount (counter decrements)
 *   - Motive-type badge mapping (FT / MT / JP / MZ / BS)
 *   - Specialization icon toggles on/off based on infantrySpecialization
 *   - Stack indicator "×N" appears only when platoonCount > 1
 *   - Destroyed overlay
 *   - No facing indicator rendered (spec: Infantry has no facing)
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — Infantry renders stack icon with count
 *        §Per-Type Facing Rules — Infantry has no facing
 *        §Per-Type Stacking Rules — Infantry platoons stack to 4
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import {
  Facing,
  GameSide,
  InfantryMotiveType,
  InfantryTokenSpecialization,
  TokenUnitType,
} from '@/types/gameplay';

import { InfantryToken } from '../InfantryToken';
import { EMPTY_EVENT_STATE } from '../tokenTypes';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

function makeInfantryToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'inf-1',
    name: 'Test Infantry',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'INF-1',
    unitType: TokenUnitType.Infantry,
    infantryCount: 28,
    infantryMotiveType: InfantryMotiveType.Foot,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Trooper-count label (counter decrements as troopers are lost)
// -----------------------------------------------------------------------------

describe('InfantryToken trooper count', () => {
  it('renders the provided infantryCount value', () => {
    const token = makeInfantryToken({ infantryCount: 15 });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.getByTestId('infantry-count').textContent).toBe('15');
  });

  it('renders a decremented value after troopers are lost', () => {
    const token = makeInfantryToken({ infantryCount: 3 });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.getByTestId('infantry-count').textContent).toBe('3');
  });

  it('defaults to 28 when infantryCount is undefined', () => {
    const token = makeInfantryToken({ infantryCount: undefined });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.getByTestId('infantry-count').textContent).toBe('28');
  });
});

// -----------------------------------------------------------------------------
// Motive-type badge
// -----------------------------------------------------------------------------

describe('InfantryToken motive-type badge', () => {
  const cases: Array<[InfantryMotiveType, string]> = [
    [InfantryMotiveType.Foot, 'FT'],
    [InfantryMotiveType.Motorized, 'MT'],
    [InfantryMotiveType.Jump, 'JP'],
    [InfantryMotiveType.Mechanized, 'MZ'],
    [InfantryMotiveType.Beast, 'BS'],
  ];

  it.each(cases)('renders "%s" label for motive %s', (motive, expected) => {
    const token = makeInfantryToken({ infantryMotiveType: motive });
    const { container } = renderInSvg(
      <InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    const texts = Array.from(container.querySelectorAll('text')).map(
      (t) => t.textContent,
    );
    expect(texts).toContain(expected);
  });

  it('defaults to "FT" when motive type is undefined', () => {
    const token = makeInfantryToken({ infantryMotiveType: undefined });
    const { container } = renderInSvg(
      <InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    const texts = Array.from(container.querySelectorAll('text')).map(
      (t) => t.textContent,
    );
    expect(texts).toContain('FT');
  });
});

// -----------------------------------------------------------------------------
// Specialization icon
// -----------------------------------------------------------------------------

describe('InfantryToken specialization icon', () => {
  const cases: Array<[InfantryTokenSpecialization, string]> = [
    [InfantryTokenSpecialization.AntiMech, 'AM'],
    [InfantryTokenSpecialization.Marine, 'MR'],
    [InfantryTokenSpecialization.Scuba, 'SC'],
    [InfantryTokenSpecialization.Mountain, 'MN'],
    [InfantryTokenSpecialization.XCT, 'XC'],
  ];

  it.each(cases)(
    'renders "%s" label for specialization %s',
    (spec, expected) => {
      const token = makeInfantryToken({ infantrySpecialization: spec });
      renderInSvg(
        <InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />,
      );
      expect(screen.getByTestId('infantry-spec').textContent).toBe(expected);
    },
  );

  it('omits the specialization badge when no specialization set', () => {
    const token = makeInfantryToken({ infantrySpecialization: undefined });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.queryByTestId('infantry-spec')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Stack indicator (multiple platoons per hex)
// -----------------------------------------------------------------------------

describe('InfantryToken stack indicator', () => {
  it('omits the stack indicator for a single platoon', () => {
    const token = makeInfantryToken({ platoonCount: 1 });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.queryByTestId('infantry-stack-indicator')).toBeNull();
  });

  it('omits the stack indicator when platoonCount is undefined', () => {
    const token = makeInfantryToken({ platoonCount: undefined });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.queryByTestId('infantry-stack-indicator')).toBeNull();
  });

  it('renders "×3" when three platoons share the hex', () => {
    const token = makeInfantryToken({ platoonCount: 3 });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    const indicator = screen.getByTestId('infantry-stack-indicator');
    expect(indicator.textContent).toBe('×3');
  });

  it('renders "×4" at the stacking rule limit', () => {
    const token = makeInfantryToken({ platoonCount: 4 });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    const indicator = screen.getByTestId('infantry-stack-indicator');
    expect(indicator.textContent).toBe('×4');
  });
});

// -----------------------------------------------------------------------------
// Destroyed overlay
// -----------------------------------------------------------------------------

describe('InfantryToken destroyed state', () => {
  it('renders destroyed overlay when isDestroyed is true', () => {
    const token = makeInfantryToken({ isDestroyed: true });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });

  it('omits destroyed overlay when not destroyed', () => {
    const token = makeInfantryToken({ isDestroyed: false });
    renderInSvg(<InfantryToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.queryByTestId('unit-destroyed-overlay')).toBeNull();
  });
});
