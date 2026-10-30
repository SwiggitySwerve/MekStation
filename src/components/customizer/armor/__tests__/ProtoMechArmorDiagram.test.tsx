/**
 * Unit tests for ProtoMechArmorDiagram.
 *
 * Validates:
 *  - 5 standard location inputs always rendered (Head, Torso, LA, RA, Legs)
 *  - Main Gun location appears only when hasMainGun is true
 *  - ARIA labels for each location input are correct
 *  - Armor inputs reflect armorByLocation values from the store
 *  - setLocationArmor is called when an input changes
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Requirement: ProtoMech 5-Location Compact Diagram
 *       Scenario: Main Gun location conditional on hasMainGun
 *       Scenario: Compact layout fits 5 ProtoMechs side-by-side
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import { ProtoMechArmorDiagram } from '@/components/customizer/protomech/ProtoMechArmorDiagram';
import { useProtoMechStore, ProtoMechStore } from '@/stores/useProtoMechStore';
import { ProtoMechLocation } from '@/types/construction/UnitLocation';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';
import { computeProtoStructure } from '@/utils/construction/protomech';

jest.mock('@/stores/useProtoMechStore');
const mockUseProtoMechStore = useProtoMechStore as jest.MockedFunction<
  typeof useProtoMechStore
>;

const mockSetLocationArmor = jest.fn();

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    tonnage: 5,
    hasMainGun: false,
    chassisType: ProtoChassis.BIPED,
    structureByLocation: computeProtoStructure(5, ProtoChassis.BIPED, false),
    armorByLocation: {
      [ProtoMechLocation.HEAD]: 1,
      [ProtoMechLocation.TORSO]: 3,
      [ProtoMechLocation.LEFT_ARM]: 2,
      [ProtoMechLocation.RIGHT_ARM]: 2,
      [ProtoMechLocation.LEGS]: 2,
      [ProtoMechLocation.MAIN_GUN]: 0,
    },
    setLocationArmor: mockSetLocationArmor,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockUseProtoMechStore.mockImplementation((selector) =>
    selector(makeState() as unknown as ProtoMechStore),
  );
});

describe('ProtoMechArmorDiagram', () => {
  it('renders the diagram container with data-testid', () => {
    render(<ProtoMechArmorDiagram />);
    expect(screen.getByTestId('protomech-armor-diagram')).toBeInTheDocument();
  });

  it('renders all 5 base location inputs', () => {
    render(<ProtoMechArmorDiagram />);
    expect(
      screen.getByTestId(`proto-armor-input-${ProtoMechLocation.HEAD}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`proto-armor-input-${ProtoMechLocation.TORSO}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`proto-armor-input-${ProtoMechLocation.LEFT_ARM}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`proto-armor-input-${ProtoMechLocation.RIGHT_ARM}`),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(`proto-armor-input-${ProtoMechLocation.LEGS}`),
    ).toBeInTheDocument();
  });

  it('does not render Main Gun input when hasMainGun is false', () => {
    render(<ProtoMechArmorDiagram />);
    expect(
      screen.queryByTestId(`proto-armor-input-${ProtoMechLocation.MAIN_GUN}`),
    ).not.toBeInTheDocument();
  });

  it('renders Main Gun input when hasMainGun is true', () => {
    mockUseProtoMechStore.mockImplementation((selector) =>
      selector(makeState({ hasMainGun: true }) as unknown as ProtoMechStore),
    );
    render(<ProtoMechArmorDiagram />);
    expect(
      screen.getByTestId(`proto-armor-input-${ProtoMechLocation.MAIN_GUN}`),
    ).toBeInTheDocument();
  });

  it('location inputs have correct aria-labels', () => {
    render(<ProtoMechArmorDiagram />);
    expect(screen.getByLabelText('Head armor value')).toBeInTheDocument();
    expect(screen.getByLabelText('Torso armor value')).toBeInTheDocument();
    expect(screen.getByLabelText('LA armor value')).toBeInTheDocument();
    expect(screen.getByLabelText('RA armor value')).toBeInTheDocument();
    expect(screen.getByLabelText('Legs armor value')).toBeInTheDocument();
  });

  it('inputs reflect armorByLocation values from the store', () => {
    render(<ProtoMechArmorDiagram />);
    const headInput = screen.getByTestId(
      `proto-armor-input-${ProtoMechLocation.HEAD}`,
    ) as HTMLInputElement;
    expect(headInput.value).toBe('1');

    const torsoInput = screen.getByTestId(
      `proto-armor-input-${ProtoMechLocation.TORSO}`,
    ) as HTMLInputElement;
    expect(torsoInput.value).toBe('3');
  });

  it('calls setLocationArmor when a location input value changes', () => {
    render(<ProtoMechArmorDiagram />);
    const torsoInput = screen.getByTestId(
      `proto-armor-input-${ProtoMechLocation.TORSO}`,
    );
    fireEvent.change(torsoInput, { target: { value: '2' } });
    expect(mockSetLocationArmor).toHaveBeenCalledWith(
      ProtoMechLocation.TORSO,
      2,
    );
  });

  it('renders "Armor" heading', () => {
    render(<ProtoMechArmorDiagram />);
    expect(screen.getByText('Armor')).toBeInTheDocument();
  });

  it('renders ArmorLocationBlock for Torso location showing pip row', () => {
    render(<ProtoMechArmorDiagram />);
    // ArmorLocationBlock renders an aria-label "Torso: current of max"
    // Pinned TestProtoMek uses twice original torso structure.
    expect(screen.getByLabelText('Torso: 3 of 10')).toBeInTheDocument();
  });

  it('uses current Quad topology and manual original structure for input limits', () => {
    mockUseProtoMechStore.mockImplementation((selector) =>
      selector(
        makeState({
          chassisType: ProtoChassis.QUAD,
          structureByLocation: {
            ...computeProtoStructure(5, ProtoChassis.QUAD, false),
            [ProtoMechLocation.TORSO]: 7,
          },
        }) as unknown as ProtoMechStore,
      ),
    );
    render(<ProtoMechArmorDiagram />);
    expect(screen.getByLabelText('LA armor value')).toHaveAttribute('max', '0');
    expect(screen.getByLabelText('Torso armor value')).toHaveAttribute(
      'max',
      '14',
    );
    fireEvent.change(screen.getByLabelText('Torso armor value'), {
      target: { value: '99' },
    });
    expect(mockSetLocationArmor).toHaveBeenCalledWith(
      ProtoMechLocation.TORSO,
      14,
    );
  });
});
