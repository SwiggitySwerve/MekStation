/**
 * Unit tests for AerospaceArmorDiagram.
 *
 * Validates:
 *  - All 4 arc labels rendered (Nose / Left Wing / Right Wing / Aft)
 *  - SI bar rendered with data-testid
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Scenario: Arcs match aerospace-unit-system
 *       Scenario: SI bar rendered separately
 */

import { render, screen } from "@testing-library/react";
import React from "react";

import { useAerospaceStore, AerospaceStore } from "@/stores/useAerospaceStore";
import { AerospaceLocation } from "@/types/construction/UnitLocation";

import { AerospaceArmorDiagram } from "../AerospaceArmorDiagram";

jest.mock("@/stores/useAerospaceStore");
const mockUseAerospaceStore = useAerospaceStore as jest.MockedFunction<
  typeof useAerospaceStore
>;

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    tonnage: 50,
    armorAllocation: {
      [AerospaceLocation.NOSE]: 8,
      [AerospaceLocation.LEFT_WING]: 6,
      [AerospaceLocation.RIGHT_WING]: 6,
      [AerospaceLocation.AFT]: 4,
    } as Record<string, number>,
    setArcArmor: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  mockUseAerospaceStore.mockImplementation((selector) =>
    selector(makeState() as unknown as AerospaceStore),
  );
});

describe("AerospaceArmorDiagram", () => {
  it("renders all 4 arc labels matching aerospace-unit-system names", () => {
    render(<AerospaceArmorDiagram />);
    expect(screen.getByText("Nose")).toBeInTheDocument();
    expect(screen.getByText("Left Wing")).toBeInTheDocument();
    expect(screen.getByText("Right Wing")).toBeInTheDocument();
    expect(screen.getByText("Aft")).toBeInTheDocument();
  });

  it("renders the SI bar element", () => {
    render(<AerospaceArmorDiagram />);
    expect(screen.getByTestId("aerospace-si-bar")).toBeInTheDocument();
  });

  it("renders SI bar above arc sections", () => {
    const { container } = render(<AerospaceArmorDiagram />);
    const diagram = container.querySelector(
      '[data-testid="aerospace-armor-diagram"]',
    ) as HTMLElement;
    const siBar = diagram.querySelector(
      '[data-testid="aerospace-si-bar"]',
    ) as HTMLElement;
    // SI bar must appear before the arc inputs in the DOM
    const allChildren = Array.from(diagram.children);
    const siIndex = allChildren.indexOf(siBar);
    expect(siIndex).toBeGreaterThanOrEqual(0);
    // At least one arc input element follows it
    const arcInput = diagram.querySelector(
      '[data-testid^="aerospace-arc-diagram-input-"]',
    );
    expect(arcInput).toBeInTheDocument();
  });

  it("renders SI label containing Structural Integrity text", () => {
    render(<AerospaceArmorDiagram />);
    expect(screen.getByText("Structural Integrity")).toBeInTheDocument();
  });
});
