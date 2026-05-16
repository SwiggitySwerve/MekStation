/**
 * Unit tests for VehicleTurretTab.
 *
 * Coverage gap closed (council audit 2026-05-15): the secondary-turret /
 * TURRET_2 toggle UI in this tab had no test. The store logic is covered by
 * useVehicleStore.secondaryTurret.test.ts and the diagram by
 * VehicleArmorDiagram.test.tsx — but the tab that wires the toggle and the
 * secondary-turret-type select to those store actions was untested.
 *
 * Validates:
 *  - secondary-turret toggle is gated on `!isVTOL && hasTurret`
 *  - toggling it dispatches setHasSecondaryTurret
 *  - the secondary-turret-type select appears only when a secondary turret is
 *    configured and dispatches setSecondaryTurretType
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { useVehicleStore, VehicleStore } from '@/stores/useVehicleStore';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import {
  ITurretConfiguration,
  TurretType,
} from '@/types/unit/VehicleInterfaces';

import { VehicleTurretTab } from '../VehicleTurretTab';

jest.mock('@/stores/useVehicleStore');
const mockUseVehicleStore = useVehicleStore as jest.MockedFunction<
  typeof useVehicleStore
>;

const setHasSecondaryTurret = jest.fn();
const setSecondaryTurretType = jest.fn();

function turretConfig(
  type: TurretType = TurretType.SINGLE,
): ITurretConfiguration {
  return { type, maxWeight: 5, currentWeight: 0, rotationArc: 360 };
}

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    tonnage: 50,
    motionType: GroundMotionType.TRACKED,
    turret: turretConfig(),
    secondaryTurret: null,
    equipment: [],
    setTurretType: jest.fn(),
    setHasSecondaryTurret,
    setSecondaryTurretType,
    updateEquipmentLocation: jest.fn(),
    ...overrides,
  };
}

function renderWithState(overrides: Record<string, unknown> = {}) {
  mockUseVehicleStore.mockImplementation((selector) =>
    selector(makeState(overrides) as unknown as VehicleStore),
  );
  return render(<VehicleTurretTab />);
}

beforeEach(() => {
  setHasSecondaryTurret.mockClear();
  setSecondaryTurretType.mockClear();
});

describe('VehicleTurretTab — secondary turret', () => {
  it('hides the secondary turret toggle when there is no primary turret', () => {
    renderWithState({ turret: null });
    expect(
      screen.queryByTestId('vehicle-secondary-turret-toggle'),
    ).not.toBeInTheDocument();
  });

  it('hides the secondary turret toggle for a VTOL (chin turrets only)', () => {
    renderWithState({ motionType: GroundMotionType.VTOL });
    expect(
      screen.queryByTestId('vehicle-secondary-turret-toggle'),
    ).not.toBeInTheDocument();
  });

  it('shows an unchecked toggle for a ground vehicle with a primary turret', () => {
    renderWithState();
    const toggle = screen.getByTestId('vehicle-secondary-turret-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).not.toBeChecked();
  });

  it('dispatches setHasSecondaryTurret when the toggle is clicked', () => {
    renderWithState();
    fireEvent.click(screen.getByTestId('vehicle-secondary-turret-toggle'));
    expect(setHasSecondaryTurret).toHaveBeenCalledWith(true);
  });

  it('shows the secondary-turret-type select and dispatches setSecondaryTurretType', () => {
    renderWithState({ secondaryTurret: turretConfig(TurretType.SINGLE) });
    const select = screen.getByTestId('vehicle-secondary-turret-type');
    expect(select).toBeInTheDocument();
    fireEvent.change(select, { target: { value: TurretType.DUAL } });
    expect(setSecondaryTurretType).toHaveBeenCalledWith(TurretType.DUAL);
  });

  it('hides the secondary-turret-type select when no secondary turret is set', () => {
    renderWithState();
    expect(
      screen.queryByTestId('vehicle-secondary-turret-type'),
    ).not.toBeInTheDocument();
  });
});
