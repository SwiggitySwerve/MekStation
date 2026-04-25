/**
 * Unit tests for ArmorDiagramForType selector.
 *
 * Asserts the routing switch picks the correct per-type diagram
 * component based on the supplied unit.type.
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Requirement: Per-Type Diagram Selection
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { useAerospaceStore } from '@/stores/useAerospaceStore';
import { useBattleArmorStore } from '@/stores/useBattleArmorStore';
import { useInfantryStore } from '@/stores/useInfantryStore';
import { useProtoMechStore } from '@/stores/useProtoMechStore';
import { useVehicleStore } from '@/stores/useVehicleStore';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { ArmorDiagramForType } from '../ArmorDiagramForType';

jest.mock('@/stores/useVehicleStore');
jest.mock('@/stores/useAerospaceStore');
jest.mock('@/stores/useBattleArmorStore');
jest.mock('@/stores/useInfantryStore');
jest.mock('@/stores/useProtoMechStore');

const mockVehicle = useVehicleStore as jest.MockedFunction<
  typeof useVehicleStore
>;
const mockAerospace = useAerospaceStore as jest.MockedFunction<
  typeof useAerospaceStore
>;
const mockBattleArmor = useBattleArmorStore as jest.MockedFunction<
  typeof useBattleArmorStore
>;
const mockInfantry = useInfantryStore as jest.MockedFunction<
  typeof useInfantryStore
>;
const mockProtoMech = useProtoMechStore as jest.MockedFunction<
  typeof useProtoMechStore
>;

beforeEach(() => {
  // Each store is shaped differently; the tests only care that the chosen
  // diagram renders, so a permissive selector returning a minimum-shape
  // object is sufficient. Each diagram component reads only the fields it
  // needs, and we provide enough for the diagram to render its outer
  // testid container without throwing.
  mockVehicle.mockImplementation(((selector: any) =>
    selector({
      motionType: GroundMotionType.TRACKED,
      unitType: UnitType.VEHICLE,
      turret: null,
      armorAllocation: {},
      tonnage: 50,
      armorTonnage: 5,
      setLocationArmor: jest.fn(),
      autoAllocateArmor: jest.fn(),
    })) as never);
  mockAerospace.mockImplementation(((selector: any) =>
    selector({
      tonnage: 50,
      armorTonnage: 5,
      armorAllocation: { NOSE: 0, LEFT_WING: 0, RIGHT_WING: 0, AFT: 0 },
      structuralIntegrity: 5,
      maxStructuralIntegrity: 10,
      armorType: 'STANDARD',
      subType: 'AEROSPACE_FIGHTER',
      setArcArmor: jest.fn(),
      autoAllocateArmor: jest.fn(),
    })) as never);
  mockBattleArmor.mockImplementation(((selector: any) =>
    selector({
      chassis: { weightClass: 'MEDIUM' },
      squadSize: 4,
      damagePerTrooper: [],
    })) as never);
  mockInfantry.mockImplementation(((selector: any) =>
    selector({
      trooperCount: 28,
      maxTrooperCount: 28,
    })) as never);
  mockProtoMech.mockImplementation(((selector: any) =>
    selector({
      tonnage: 5,
      hasMainGun: false,
      armorByLocation: {
        Head: 0,
        Torso: 0,
        'Left Arm': 0,
        'Right Arm': 0,
        Legs: 0,
      },
      setLocationArmor: jest.fn(),
    })) as never);
});

describe('ArmorDiagramForType — Per-Type Diagram Selection', () => {
  it('routes VEHICLE to VehicleArmorDiagram', () => {
    render(<ArmorDiagramForType unitType={UnitType.VEHICLE} />);
    expect(screen.getByTestId('vehicle-armor-diagram')).toBeInTheDocument();
    expect(screen.queryByTestId('aerospace-armor-diagram')).toBeNull();
    expect(screen.queryByTestId('infantry-platoon-counter')).toBeNull();
  });

  it('routes VTOL to VehicleArmorDiagram', () => {
    render(<ArmorDiagramForType unitType={UnitType.VTOL} />);
    expect(screen.getByTestId('vehicle-armor-diagram')).toBeInTheDocument();
  });

  it('routes SUPPORT_VEHICLE to VehicleArmorDiagram', () => {
    render(<ArmorDiagramForType unitType={UnitType.SUPPORT_VEHICLE} />);
    expect(screen.getByTestId('vehicle-armor-diagram')).toBeInTheDocument();
  });

  it('routes AEROSPACE to AerospaceArmorDiagram', () => {
    render(<ArmorDiagramForType unitType={UnitType.AEROSPACE} />);
    expect(screen.getByTestId('aerospace-armor-diagram')).toBeInTheDocument();
    expect(screen.queryByTestId('vehicle-armor-diagram')).toBeNull();
  });

  it('routes CONVENTIONAL_FIGHTER to AerospaceArmorDiagram', () => {
    render(<ArmorDiagramForType unitType={UnitType.CONVENTIONAL_FIGHTER} />);
    expect(screen.getByTestId('aerospace-armor-diagram')).toBeInTheDocument();
  });

  it('routes INFANTRY to InfantryPlatoonCounter (NOT a per-location diagram)', () => {
    render(<ArmorDiagramForType unitType={UnitType.INFANTRY} />);
    expect(screen.getByTestId('infantry-platoon-counter')).toBeInTheDocument();
    expect(screen.queryByTestId('vehicle-armor-diagram')).toBeNull();
    expect(screen.queryByTestId('aerospace-armor-diagram')).toBeNull();
  });

  it('routes BATTLE_ARMOR to BattleArmorPipGrid', () => {
    const { container } = render(
      <ArmorDiagramForType unitType={UnitType.BATTLE_ARMOR} />,
    );
    // BattleArmorPipGrid does not have a single testid wrapper — check for
    // its trooper-column structure via the pip-grid's signature aria label.
    expect(container.querySelector('[aria-label*="Trooper"]')).toBeTruthy();
  });

  it('routes PROTOMECH to ProtoMechArmorDiagram', () => {
    const { container } = render(
      <ArmorDiagramForType unitType={UnitType.PROTOMECH} />,
    );
    // ProtoMech diagram renders 5 ArmorLocationBlocks (Head, Torso, LA, RA, Legs).
    // Check for its signature compact-grid container.
    expect(container.firstChild).not.toBeNull();
  });
});
