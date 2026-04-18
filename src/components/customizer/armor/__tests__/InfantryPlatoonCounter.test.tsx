/**
 * Unit tests for InfantryPlatoonCounter.
 *
 * Validates:
 *  - Counter displays current / max trooper count
 *  - Color threshold labels: Full Strength (>75%), Wounded (25–75%), Casualties (≤25%)
 *  - Strength progressbar aria attributes are correct
 *  - "No per-location armor" notice is rendered
 *  - Defaults to full strength when currentTroopers is not supplied
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Requirement: Infantry Platoon Counter
 *       Scenario: Color thresholds match TechManual §infantry damage
 *       Scenario: No per-location armor notice present
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { InfantryPlatoonCounter } from '@/components/customizer/infantry/InfantryPlatoonCounter';
import { useInfantryStore, InfantryStore } from '@/stores/useInfantryStore';
import { InfantrySpecialization } from '@/types/unit/PersonnelInterfaces';

jest.mock('@/stores/useInfantryStore');
const mockUseInfantryStore = useInfantryStore as jest.MockedFunction<
  typeof useInfantryStore
>;

/**
 * Default platoon: 7 troopers × 4 squads = 28 max.
 */
function makeState(overrides: Record<string, unknown> = {}) {
  return {
    squadSize: 7,
    numberOfSquads: 4,
    specialization: InfantrySpecialization.NONE,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseInfantryStore.mockImplementation((selector) =>
    selector(makeState() as unknown as InfantryStore),
  );
});

describe('InfantryPlatoonCounter', () => {
  it('renders the component container with data-testid', () => {
    render(<InfantryPlatoonCounter />);
    expect(screen.getByTestId('infantry-platoon-counter')).toBeInTheDocument();
  });

  it('defaults to full strength (current = max) when no currentTroopers prop supplied', () => {
    render(<InfantryPlatoonCounter />);
    // Max = 7 * 4 = 28; current defaults to 28
    expect(screen.getByTestId('infantry-current-count')).toHaveTextContent(
      '28',
    );
  });

  it('shows supplied currentTroopers count', () => {
    render(<InfantryPlatoonCounter currentTroopers={15} />);
    expect(screen.getByTestId('infantry-current-count')).toHaveTextContent(
      '15',
    );
  });

  it('shows "Full Strength" label when ratio > 75%', () => {
    // 28/28 = 100% → Full Strength
    render(<InfantryPlatoonCounter />);
    expect(screen.getByTestId('infantry-threshold-label')).toHaveTextContent(
      'Full Strength',
    );
  });

  it('shows "Wounded" label when ratio is between 25% and 75%', () => {
    // 14/28 = 50% → Wounded
    render(<InfantryPlatoonCounter currentTroopers={14} />);
    expect(screen.getByTestId('infantry-threshold-label')).toHaveTextContent(
      'Wounded',
    );
  });

  it('shows "Casualties" label when ratio is ≤ 25%', () => {
    // 7/28 = 25% → Casualties (boundary: ratio > 0.25 is Wounded, so 0.25 exactly is Casualties)
    render(<InfantryPlatoonCounter currentTroopers={7} />);
    expect(screen.getByTestId('infantry-threshold-label')).toHaveTextContent(
      'Casualties',
    );
  });

  it('shows "Casualties" label when 0 troopers remain', () => {
    render(<InfantryPlatoonCounter currentTroopers={0} />);
    expect(screen.getByTestId('infantry-threshold-label')).toHaveTextContent(
      'Casualties',
    );
  });

  it('renders the progressbar with correct aria attributes', () => {
    render(<InfantryPlatoonCounter currentTroopers={20} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '20');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '28');
  });

  it('shows the no-per-location-armor notice text', () => {
    render(<InfantryPlatoonCounter />);
    expect(screen.getByText(/No per-location armor/i)).toBeInTheDocument();
  });

  it('shows specialization type when specialization is set', () => {
    mockUseInfantryStore.mockImplementation((selector) =>
      selector(
        makeState({
          specialization: InfantrySpecialization.PARATROOPER,
        }) as unknown as InfantryStore,
      ),
    );
    render(<InfantryPlatoonCounter />);
    expect(screen.getByText('Paratrooper')).toBeInTheDocument();
  });

  it('reflects updated squadSize × numberOfSquads in max display', () => {
    mockUseInfantryStore.mockImplementation((selector) =>
      selector(
        makeState({
          squadSize: 10,
          numberOfSquads: 3,
        }) as unknown as InfantryStore,
      ),
    );
    render(<InfantryPlatoonCounter />);
    // max = 30; current defaults to 30
    expect(screen.getByTestId('infantry-current-count')).toHaveTextContent(
      '30',
    );
    expect(screen.getByText('/ 30 troopers')).toBeInTheDocument();
  });
});
