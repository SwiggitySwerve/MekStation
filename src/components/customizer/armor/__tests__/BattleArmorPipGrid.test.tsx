/**
 * Unit tests for BattleArmorPipGrid.
 *
 * Validates:
 *  - One trooper column rendered per squadSize
 *  - Squad leader marker (★) shown on trooper index 0
 *  - Max pips derived from weightClass (e.g. Medium → 7, Assault → 15)
 *  - Per-trooper damage reduces remaining pips
 *  - Summary shows correct armor-per-trooper and total
 *
 * @spec openspec/changes/add-per-type-armor-diagrams/specs/armor-diagram/spec.md
 *       Requirement: BattleArmor Per-Trooper Grid
 *       Scenario: Weight class determines pip maximum
 *       Scenario: Squad leader indicated on trooper 0
 */

import { render, screen } from '@testing-library/react';
import React from 'react';

import { BattleArmorPipGrid } from '@/components/customizer/battlearmor/BattleArmorPipGrid';
import {
  useBattleArmorStore,
  BattleArmorStore,
} from '@/stores/useBattleArmorStore';
import {
  BattleArmorChassisType,
  BattleArmorWeightClass,
} from '@/types/unit/PersonnelInterfaces';

jest.mock('@/stores/useBattleArmorStore');
const mockUseBattleArmorStore = useBattleArmorStore as jest.MockedFunction<
  typeof useBattleArmorStore
>;

function makeState(overrides: Record<string, unknown> = {}) {
  return {
    squadSize: 4,
    armorPerTrooper: 7,
    weightClass: BattleArmorWeightClass.MEDIUM,
    chassisType: BattleArmorChassisType.BIPED,
    ...overrides,
  };
}

beforeEach(() => {
  mockUseBattleArmorStore.mockImplementation((selector) =>
    selector(makeState() as unknown as BattleArmorStore),
  );
});

describe('BattleArmorPipGrid', () => {
  it('renders one column per trooper (default squadSize 4)', () => {
    render(<BattleArmorPipGrid />);
    expect(screen.getByTestId('ba-trooper-col-0')).toBeInTheDocument();
    expect(screen.getByTestId('ba-trooper-col-1')).toBeInTheDocument();
    expect(screen.getByTestId('ba-trooper-col-2')).toBeInTheDocument();
    expect(screen.getByTestId('ba-trooper-col-3')).toBeInTheDocument();
  });

  it('renders 6 trooper columns when squadSize is 6', () => {
    mockUseBattleArmorStore.mockImplementation((selector) =>
      selector(makeState({ squadSize: 6 }) as unknown as BattleArmorStore),
    );
    render(<BattleArmorPipGrid />);
    for (let i = 0; i < 6; i++) {
      expect(screen.getByTestId(`ba-trooper-col-${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByTestId('ba-trooper-col-6')).not.toBeInTheDocument();
  });

  it('shows the squad leader star (★) on trooper column 0', () => {
    render(<BattleArmorPipGrid />);
    // The squad leader icon has aria-label "Squad leader"
    expect(screen.getByLabelText('Squad leader')).toBeInTheDocument();
  });

  it('renders correct pip count for Medium weight class (7 pips)', () => {
    render(<BattleArmorPipGrid />);
    // ArmorPipRow for trooper 1 (full health) → aria-label "Trooper 1: 7 of 7"
    expect(screen.getByLabelText('Trooper 1: 7 of 7')).toBeInTheDocument();
  });

  it('renders correct pip count for Assault weight class (15 pips)', () => {
    mockUseBattleArmorStore.mockImplementation((selector) =>
      selector(
        makeState({
          weightClass: BattleArmorWeightClass.ASSAULT,
        }) as unknown as BattleArmorStore,
      ),
    );
    render(<BattleArmorPipGrid />);
    expect(screen.getByLabelText('Trooper 1: 15 of 15')).toBeInTheDocument();
  });

  it('reduces remaining pips for a damaged trooper', () => {
    render(<BattleArmorPipGrid damageByTrooper={[3, 0, 0, 0]} />);
    // Trooper 1 has 3 damage → 7 - 3 = 4 remaining; label "Trooper 1: 4 of 7"
    expect(screen.getByLabelText('Trooper 1: 4 of 7')).toBeInTheDocument();
    // Trooper 2 has 0 damage → 7 of 7
    expect(screen.getByLabelText('Trooper 2: 7 of 7')).toBeInTheDocument();
  });

  it('renders the pip grid container with data-testid', () => {
    render(<BattleArmorPipGrid />);
    expect(screen.getByTestId('battlearmor-pip-grid')).toBeInTheDocument();
  });

  it('shows chassisType and squadSize in header', () => {
    render(<BattleArmorPipGrid />);
    expect(screen.getByText(/Biped.*4 troopers/)).toBeInTheDocument();
  });

  it('shows correct total in summary (maxPips * squadSize)', () => {
    // Medium: 7 pips × 4 troopers = 28 total
    render(<BattleArmorPipGrid />);
    // The summary displays "Total:" followed by the count
    expect(screen.getByText('28')).toBeInTheDocument();
  });
});
