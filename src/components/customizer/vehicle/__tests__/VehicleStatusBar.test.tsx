/**
 * Characterization tests for VehicleStatusBar.
 *
 * Pins the status bar's output for a given store state, and which store fields
 * it reacts to, so the `useMemo` dependency refactor cannot change what the
 * bar shows. Weight-free assertions are relative (engine / armor / tonnage move
 * it); the equipment-weight term is deliberately not pinned.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { useVehicleStore, type VehicleStore } from '@/stores/useVehicleStore';
import {
  createDefaultVehicleState,
  createEmptyVehicleArmorAllocation,
} from '@/stores/vehicleState';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VehicleStatusBar } from '../VehicleStatusBar';

jest.mock('@/stores/useVehicleStore');
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: false, recheckReady: jest.fn() }),
}));
const mockUseVehicleStore = useVehicleStore as jest.MockedFunction<
  typeof useVehicleStore
>;

const ARMOR = {
  ...createEmptyVehicleArmorAllocation(),
  [VehicleLocation.FRONT]: 30,
  [VehicleLocation.LEFT]: 25,
  [VehicleLocation.RIGHT]: 25,
  [VehicleLocation.REAR]: 20,
};

const NO_EQUIPMENT: readonly unknown[] = [];
const UNRESOLVED_EQUIPMENT: VehicleStore['equipment'] = Array.from(
  { length: 3 },
  (_, index) => ({
    id: `unresolved-${index}`,
    equipmentId: `unknown-equipment-${index}`,
    name: 'Unknown equipment',
    location: VehicleLocation.FRONT,
    isRearMounted: false,
    isTurretMounted: false,
    isSponsonMounted: false,
  }),
);
const FRONT_40 = { ...ARMOR, [VehicleLocation.FRONT]: 40 };

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    ...createDefaultVehicleState({
      name: 'Test Tank',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      motionType: GroundMotionType.TRACKED,
    }),
    armorTonnage: 8,
    armorAllocation: ARMOR,
    equipment: NO_EQUIPMENT,
    ...overrides,
  };
}

function mockStoreState(overrides: Record<string, unknown> = {}) {
  const state = makeState(overrides) as unknown as VehicleStore;
  mockUseVehicleStore.mockImplementation((selector) => selector(state));
}

function renderBar(
  overrides: Record<string, unknown> = {},
  props: { compact?: boolean } = {},
) {
  mockStoreState(overrides);
  return render(<VehicleStatusBar {...props} />);
}

function rerenderBar(
  view: ReturnType<typeof render>,
  overrides: Record<string, unknown>,
  props: { compact?: boolean } = {},
) {
  mockStoreState(overrides);
  view.rerender(<VehicleStatusBar {...props} />);
}

/** Text of the StatusItem with the given label: [value, subValue?]. */
function item(label: string): string[] {
  const root = screen.getByText(label).parentElement as HTMLElement;
  return Array.from(root.children)
    .slice(1)
    .map((c) => c.textContent ?? '');
}

function weightFree(): number {
  return parseFloat(item('Weight Free')[0]);
}

describe('VehicleStatusBar — full layout', () => {
  it('updates odd-cruise movement in full and compact displays', () => {
    const view = renderBar({ cruiseMP: 3 });
    expect(item('Movement')).toEqual(['3/5', 'Cruise/Flank']);
    rerenderBar(view, { cruiseMP: 5 });
    expect(item('Movement')).toEqual(['5/8', 'Cruise/Flank']);
    rerenderBar(view, { cruiseMP: 17 }, { compact: true });
    expect(screen.getByText('17/26 MP')).toBeInTheDocument();
  });

  it('shows tonnage, motion, movement and equipment count', () => {
    renderBar({ equipment: UNRESOLVED_EQUIPMENT });
    expect(item('Tonnage')).toEqual(['50.0 t', 'TRK']);
    expect(item('Movement')).toEqual(['4/6', 'Cruise/Flank']);
    expect(item('Equipment')).toEqual(['3', 'items']);
  });

  it('shows allocated armor and the unallocated remainder', () => {
    // 8 t of standard armor = 128 points; 100 allocated
    renderBar();
    expect(item('Armor')).toEqual(['100', '+28 unalloc']);
  });

  it('reports a class-total excess independently of concentrated location armor', () => {
    renderBar({ armorTonnage: 40, armorAllocation: { ...ARMOR, Front: 170 } });
    expect(item('Armor')).toEqual(['240', '-25 unalloc']);
    expect(item('Valid')).toEqual(['2 err', 'VAL-VEHICLE-ARMOR-TOTAL']);
  });

  it('recomputes BAR armor points when armor technology or BAR rating changes', () => {
    const state = {
      unitType: UnitType.SUPPORT_VEHICLE,
      usesBarArmor: true,
      barRating: 10,
      armorTechRating: 5,
      armorTonnage: 1,
      armorAllocation: { ...createEmptyVehicleArmorAllocation(), Front: 19 },
    };
    const view = renderBar(state);
    expect(item('Armor')).toEqual(['19', 'allocated']);
    rerenderBar(view, { ...state, armorTechRating: 4 });
    expect(item('Armor')).toEqual(['19', '-2 unalloc']);
    rerenderBar(view, { ...state, armorTechRating: 4, barRating: 8 });
    expect(item('Armor')).toEqual(['19', '+3 unalloc']);
  });

  it('recomputes the class ceiling when tonnage or support motion changes', () => {
    const view = renderBar({ armorTonnage: 40 });
    expect(item('Armor')).toEqual(['100', '+115 unalloc']);
    rerenderBar(view, { armorTonnage: 40, tonnage: 60 });
    expect(item('Armor')).toEqual(['100', '+150 unalloc']);
    rerenderBar(view, { armorTonnage: 40, unitType: UnitType.SUPPORT_VEHICLE });
    expect(item('Armor')).toEqual(['100', '+4 unalloc']);
    rerenderBar(view, {
      armorTonnage: 40,
      unitType: UnitType.SUPPORT_VEHICLE,
      motionType: GroundMotionType.HOVER,
    });
    expect(item('Armor')).toEqual(['100', '-46 unalloc']);
  });

  it('reports fully allocated armor', () => {
    renderBar({ armorTonnage: 100 / 16, armorAllocation: ARMOR });
    expect(item('Armor')).toEqual(['100', 'allocated']);
  });

  it('shows the turret item only when a turret is present', () => {
    const view = renderBar();
    expect(screen.queryByText('Turret')).not.toBeInTheDocument();

    rerenderBar(view, {
      turret: {
        type: TurretType.SINGLE,

        rotationArc: 360,
      },
    });
    // An empty turret has known zero mounted mass and no capacity denominator.
    expect(item('Turret')).toEqual(['0.0 t', 'mounted']);
  });

  it('surfaces the validation error count and first rule id', () => {
    const view = renderBar();
    expect(item('Valid')).toEqual(['1 err', 'VAL-VEHICLE-CREW']);

    rerenderBar(view, { tonnage: 500, engineRating: 500 * 4 });
    // The six-side chassis also rejects the stale four-side Left/Right allocation.
    expect(item('Valid')).toEqual(['5 err', 'VAL-VEHICLE-TONNAGE']);
  });
});

describe('VehicleStatusBar — reacts to the store fields it derives from', () => {
  it('weight free drops when engine rating rises', () => {
    const view = renderBar();
    const before = weightFree();
    rerenderBar(view, { engineRating: 300 });
    expect(weightFree()).toBeLessThan(before);
  });

  it('recomputes engine weight when only the motion type changes', () => {
    const view = renderBar({ engineRating: 25 });
    const before = weightFree();
    rerenderBar(view, { engineRating: 25, motionType: GroundMotionType.HOVER });
    // Same 50 t and rating: engine 1 -> 10 t, plus 5 t hover lift.
    expect(weightFree()).toBe(before - 14);
  });

  it('recomputes the hover engine and superheavy structure above 50 tons', () => {
    const view = renderBar({
      engineRating: 25,
      motionType: GroundMotionType.HOVER,
    });
    const before = weightFree();
    rerenderBar(view, {
      tonnage: 52,
      engineRating: 25,
      motionType: GroundMotionType.HOVER,
    });
    // +2 tons, -0.5 each for engine, controls and lift; structure 5 -> 10.5.
    // MegaMek 48fcb2f64 BLKTankFile.java:94-123; Structure.java:102-108.
    expect(weightFree()).toBe(before - 5);
  });

  it('weight free drops when armor tonnage rises', () => {
    const view = renderBar();
    const before = weightFree();
    rerenderBar(view, { armorTonnage: 12 });
    expect(weightFree()).toBeLessThan(before);
  });

  it('weight free rises when tonnage rises', () => {
    const view = renderBar();
    const before = weightFree();
    rerenderBar(view, { tonnage: 60 });
    expect(weightFree()).toBeGreaterThan(before);
  });

  it('weight free is unaffected by cruise MP alone', () => {
    const view = renderBar();
    const before = item('Weight Free');
    rerenderBar(view, { cruiseMP: 6 });
    expect(item('Weight Free')).toEqual(before);
    expect(item('Movement')).toEqual(['6/9', 'Cruise/Flank']);
  });

  it('armor stats follow armor allocation and armor tonnage', () => {
    const view = renderBar();
    rerenderBar(view, { armorAllocation: FRONT_40 });
    expect(item('Armor')).toEqual(['110', '+18 unalloc']);

    rerenderBar(view, { armorAllocation: FRONT_40, armorTonnage: 4 });
    expect(item('Armor')).toEqual(['110', '-46 unalloc']);
  });

  it('BV recomputes when armor allocation changes', () => {
    const view = renderBar();
    const before = item('BV');
    rerenderBar(view, {
      armorAllocation: { ...ARMOR, [VehicleLocation.FRONT]: 60 },
    });
    expect(item('BV')).not.toEqual(before);
  });

  it('BV recomputes when tonnage changes', () => {
    const view = renderBar();
    const before = item('BV');
    rerenderBar(view, { tonnage: 70, engineRating: 280 });
    expect(item('BV')).not.toEqual(before);
  });

  it('keeps the same output across a re-render with equal-valued state', () => {
    const view = renderBar({ equipment: UNRESOLVED_EQUIPMENT.slice(0, 2) });
    const snapshot = view.container.innerHTML;
    rerenderBar(view, { equipment: UNRESOLVED_EQUIPMENT.slice(0, 2) });
    expect(view.container.innerHTML).toBe(snapshot);
  });

  it('BV opens its breakdown dialog on click', () => {
    renderBar();
    fireEvent.click(screen.getByTestId('vehicle-bv-status-item'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('VehicleStatusBar — compact layout', () => {
  it('shows tonnage, MP, armor, free weight and BV on one line', () => {
    const { container } = renderBar({}, { compact: true });
    const text = container.textContent ?? '';
    expect(text).toContain('50.0 t TRK');
    expect(text).toContain('4/6 MP');
    expect(text).toContain('100 armor');
    expect(text).toMatch(/-?\d+\.\d t free/);
    expect(text).toMatch(/BV \d+/);
    expect(screen.queryByText('Weight Free')).not.toBeInTheDocument();
  });
});
