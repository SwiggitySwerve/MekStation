/**
 * Tests for VehicleToken — rectangular ground/VTOL token.
 *
 * Focuses on behaviours not already exercised by the UnitTokenForType
 * dispatcher suite: motion-type label mapping, turret indicator toggle,
 * independent turret rotation, destroyed overlay, and designation text.
 *
 * @spec openspec/changes/add-per-type-hex-tokens/specs/tactical-map-interface/spec.md
 *        §Per-Type Token Rendering — Vehicle renders vehicle token
 *        §Per-Type Facing Rules — Vehicle uses 8-direction facing
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import type { IUnitToken } from '@/types/gameplay';

import {
  Facing,
  GameSide,
  TokenUnitType,
  VehicleMotionType,
} from '@/types/gameplay';

import { EMPTY_EVENT_STATE } from '../tokenTypes';
import { VehicleToken } from '../VehicleToken';

// -----------------------------------------------------------------------------
// Fixtures
// -----------------------------------------------------------------------------

function renderInSvg(ui: React.ReactElement) {
  return render(<svg>{ui}</svg>);
}

function makeVehicleToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'veh-1',
    name: 'Test Vehicle',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'VEH-1',
    unitType: TokenUnitType.Vehicle,
    vehicleMotionType: VehicleMotionType.Tracked,
    ...overrides,
  };
}

// -----------------------------------------------------------------------------
// Motion-type label mapping (spec §Per-Type Token Rendering)
// -----------------------------------------------------------------------------

describe('VehicleToken motion-type label', () => {
  const cases: Array<[VehicleMotionType, string]> = [
    [VehicleMotionType.Tracked, 'TK'],
    [VehicleMotionType.Wheeled, 'WH'],
    [VehicleMotionType.Hover, 'HV'],
    [VehicleMotionType.VTOL, 'VT'],
    [VehicleMotionType.Naval, 'NV'],
    [VehicleMotionType.WiGE, 'WG'],
  ];

  it.each(cases)(
    'renders "%s" label for motion type %s',
    (motion, expectedLabel) => {
      const token = makeVehicleToken({ vehicleMotionType: motion });
      const { container } = renderInSvg(
        <VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />,
      );

      const texts = Array.from(container.querySelectorAll('text')).map(
        (t) => t.textContent,
      );
      expect(texts).toContain(expectedLabel);
    },
  );

  it('defaults to "TK" when motion type is undefined', () => {
    const token = makeVehicleToken({ vehicleMotionType: undefined });
    const { container } = renderInSvg(
      <VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    const texts = Array.from(container.querySelectorAll('text')).map(
      (t) => t.textContent,
    );
    expect(texts).toContain('TK');
  });
});

// -----------------------------------------------------------------------------
// Turret indicator (spec §Per-Type Token Rendering — turret separate)
// -----------------------------------------------------------------------------

describe('VehicleToken turret indicator', () => {
  it('omits turret group when turretFacing is undefined', () => {
    const token = makeVehicleToken({ turretFacing: undefined });
    const { container } = renderInSvg(
      <VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    // A vehicle without a turret has exactly one rotated group: the body.
    // When a turret is present there should be two rotated groups.
    const rotatedGroups = Array.from(container.querySelectorAll('g')).filter(
      (g) => (g.getAttribute('transform') ?? '').includes('rotate'),
    );
    expect(rotatedGroups.length).toBe(1);
  });

  it('renders turret group when turretFacing is provided', () => {
    const token = makeVehicleToken({
      facing: Facing.North,
      turretFacing: 2, // East in cardinal8
    });
    const { container } = renderInSvg(
      <VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    const rotatedGroups = Array.from(container.querySelectorAll('g')).filter(
      (g) => (g.getAttribute('transform') ?? '').includes('rotate'),
    );
    // Body + turret → two rotated groups.
    expect(rotatedGroups.length).toBe(2);
  });

  it('turret rotates independently from body facing', () => {
    const token = makeVehicleToken({
      facing: Facing.North, // body rotation = 0
      turretFacing: 4, // cardinal8 index 4 = South → rotation 180
    });
    const { container } = renderInSvg(
      <VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    const rotatedGroups = Array.from(container.querySelectorAll('g'))
      .map((g) => g.getAttribute('transform'))
      .filter((t): t is string => !!t && t.includes('rotate'));
    // Distinct rotations: body = 0 and turret = 180.
    expect(rotatedGroups.some((t) => t.includes('rotate(0)'))).toBe(true);
    expect(rotatedGroups.some((t) => t.includes('rotate(180)'))).toBe(true);
  });
});

// -----------------------------------------------------------------------------
// Destroyed overlay (spec §Per-Type Token Rendering — destroyed state)
// -----------------------------------------------------------------------------

describe('VehicleToken destroyed state', () => {
  it('renders destroyed overlay when token.isDestroyed is true', () => {
    const token = makeVehicleToken({ isDestroyed: true });
    renderInSvg(<VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });

  it('renders destroyed overlay when eventState.destroyed is true', () => {
    const token = makeVehicleToken({ isDestroyed: false });
    renderInSvg(
      <VehicleToken
        token={token}
        eventState={{ ...EMPTY_EVENT_STATE, destroyed: true }}
      />,
    );
    expect(screen.getByTestId('unit-destroyed-overlay')).toBeInTheDocument();
  });

  it('omits destroyed overlay when not destroyed', () => {
    const token = makeVehicleToken({ isDestroyed: false });
    renderInSvg(<VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />);
    expect(screen.queryByTestId('unit-destroyed-overlay')).toBeNull();
  });
});

// -----------------------------------------------------------------------------
// Designation text
// -----------------------------------------------------------------------------

describe('VehicleToken designation', () => {
  it('renders the designation string', () => {
    const token = makeVehicleToken({ designation: 'HUNT-3A' });
    const { container } = renderInSvg(
      <VehicleToken token={token} eventState={EMPTY_EVENT_STATE} />,
    );
    const texts = Array.from(container.querySelectorAll('text')).map(
      (t) => t.textContent,
    );
    expect(texts).toContain('HUNT-3A');
  });
});
