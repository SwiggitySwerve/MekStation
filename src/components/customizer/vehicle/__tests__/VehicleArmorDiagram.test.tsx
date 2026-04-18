/**
 * Unit tests for VehicleArmorDiagram.
 *
 * Validates:
 *  - 4 base locations always rendered
 *  - Turret location appears when hasTurret
 *  - Rotor location appears when isVTOL
 *  - Body location appears when unitType === SUPPORT_VEHICLE
 *  - Auto-allocate button disabled when availablePoints === 0
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Scenario: VTOL adds Rotor location
 *       Scenario: Support vehicle adds Body location
 *       Scenario: Turret configured shows Turret location
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { useVehicleStore, VehicleStore } from "@/stores/useVehicleStore";
import {
  VehicleLocation,
  VTOLLocation,
} from "@/types/construction/UnitLocation";
import { GroundMotionType } from "@/types/unit/BaseUnitInterfaces";
import { UnitType } from "@/types/unit/BattleMechInterfaces";

import { VehicleArmorDiagram } from "../VehicleArmorDiagram";

jest.mock("@/stores/useVehicleStore");
const mockUseVehicleStore = useVehicleStore as jest.MockedFunction<
  typeof useVehicleStore
>;

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    motionType: GroundMotionType.TRACKED,
    unitType: UnitType.VEHICLE,
    turret: null,
    armorAllocation: {
      [VehicleLocation.FRONT]: 10,
      [VehicleLocation.LEFT]: 8,
      [VehicleLocation.RIGHT]: 8,
      [VehicleLocation.REAR]: 4,
    } as Record<string, number>,
    tonnage: 50,
    armorTonnage: 5,
    setLocationArmor: jest.fn(),
    autoAllocateArmor: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseVehicleStore.mockImplementation((selector) =>
    selector(makeState() as unknown as VehicleStore),
  );
});

describe("VehicleArmorDiagram", () => {
  it("renders the 4 base armor location labels", () => {
    render(<VehicleArmorDiagram />);
    expect(screen.getByText("Front")).toBeInTheDocument();
    expect(screen.getByText("Left Side")).toBeInTheDocument();
    expect(screen.getByText("Right Side")).toBeInTheDocument();
    expect(screen.getByText("Rear")).toBeInTheDocument();
  });

  it("shows Turret location when hasTurret", () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(
        makeState({ turret: { type: "Single" } }) as unknown as VehicleStore,
      ),
    );
    render(<VehicleArmorDiagram />);
    expect(screen.getByText("Turret")).toBeInTheDocument();
  });

  it("shows Rotor location when VTOL", () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(
        makeState({
          motionType: GroundMotionType.VTOL,
          unitType: UnitType.VTOL,
        }) as unknown as VehicleStore,
      ),
    );
    render(<VehicleArmorDiagram />);
    expect(screen.getByText("Rotor")).toBeInTheDocument();
  });

  it("shows Body location when support vehicle", () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(
        makeState({
          unitType: UnitType.SUPPORT_VEHICLE,
        }) as unknown as VehicleStore,
      ),
    );
    render(<VehicleArmorDiagram />);
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("disables auto-allocate button when armorTonnage is 0", () => {
    mockUseVehicleStore.mockImplementation((selector) =>
      selector(makeState({ armorTonnage: 0 }) as unknown as VehicleStore),
    );
    render(<VehicleArmorDiagram />);
    const btn = screen.getByTestId("vehicle-armor-auto-allocate");
    expect(btn).toBeDisabled();
  });

  it("does not show Turret when turret is null", () => {
    render(<VehicleArmorDiagram />);
    expect(screen.queryByText("Turret")).not.toBeInTheDocument();
  });
});
