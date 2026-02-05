import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ArmorDiagramProps } from '@/components/customizer/armor/ArmorDiagram';
import { ArmorTab } from '@/components/customizer/tabs/ArmorTab';
import { useUnitStore } from '@/stores/useUnitStore';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { MechConfiguration } from '@/types/construction/MechConfigurationSystem';

// Mock dependencies
jest.mock('@/stores/useUnitStore', () => ({
  useUnitStore: jest.fn(),
}));

jest.mock('@/hooks/useTechBaseSync', () => ({
  useTechBaseSync: jest.fn(() => ({
    filteredOptions: {
      engines: [],
      gyros: [],
      structures: [],
      cockpits: [],
      heatSinks: [],
      armors: [],
    },
    defaults: {
      engineType: 'Standard Fusion',
      gyroType: 'Standard',
      structureType: 'Standard',
      cockpitType: 'Standard',
      heatSinkType: 'Single',
      armorType: 'Standard',
    },
    isEngineValid: () => true,
    isGyroValid: () => true,
    isStructureValid: () => true,
    isCockpitValid: () => true,
    isHeatSinkValid: () => true,
    isArmorValid: () => true,
    getValidatedSelections: (s: unknown) => s,
  })),
}));

jest.mock('@/components/customizer/armor/ArmorDiagram', () => ({
  ArmorDiagram: ({
    onLocationClick,
  }: Pick<ArmorDiagramProps, 'onLocationClick'>) => (
    <div data-testid="armor-diagram">
      <button
        onClick={(): void => {
          (onLocationClick as (location: string) => void)('Head');
        }}
      >
        Head
      </button>
    </div>
  ),
}));

// Mock the variant diagrams used by ArmorTab
jest.mock('@/components/customizer/armor/variants', () => ({
  CleanTechDiagram: ({
    onLocationClick,
  }: Pick<ArmorDiagramProps, 'onLocationClick'>) => (
    <div data-testid="clean-tech-diagram">
      <button
        onClick={(): void => {
          (onLocationClick as (location: string) => void)('Head');
        }}
      >
        Head
      </button>
    </div>
  ),
  NeonOperatorDiagram: ({
    onLocationClick,
  }: Pick<ArmorDiagramProps, 'onLocationClick'>) => (
    <div data-testid="neon-operator-diagram">
      <button
        onClick={(): void => {
          (onLocationClick as (location: string) => void)('Head');
        }}
      >
        Head
      </button>
    </div>
  ),
  TacticalHUDDiagram: ({
    onLocationClick,
  }: Pick<ArmorDiagramProps, 'onLocationClick'>) => (
    <div data-testid="tactical-hud-diagram">
      <button
        onClick={(): void => {
          (onLocationClick as (location: string) => void)('Head');
        }}
      >
        Head
      </button>
    </div>
  ),
  PremiumMaterialDiagram: ({
    onLocationClick,
  }: Pick<ArmorDiagramProps, 'onLocationClick'>) => (
    <div data-testid="premium-material-diagram">
      <button
        onClick={(): void => {
          (onLocationClick as (location: string) => void)('Head');
        }}
      >
        Head
      </button>
    </div>
  ),
  MegaMekDiagram: ({
    onLocationClick,
  }: Pick<ArmorDiagramProps, 'onLocationClick'>) => (
    <div data-testid="megamek-diagram">
      <button
        onClick={(): void => {
          (onLocationClick as (location: string) => void)('Head');
        }}
      >
        Head
      </button>
    </div>
  ),
}));

// Mock exotic mech diagrams
jest.mock('@/components/customizer/armor/variants/QuadArmorDiagram', () => ({
  QuadArmorDiagram: () => <div data-testid="quad-armor-diagram" />,
}));

jest.mock('@/components/customizer/armor/variants/TripodArmorDiagram', () => ({
  TripodArmorDiagram: () => <div data-testid="tripod-armor-diagram" />,
}));

jest.mock('@/components/customizer/armor/variants/LAMArmorDiagram', () => ({
  LAMArmorDiagram: () => <div data-testid="lam-armor-diagram" />,
}));

jest.mock('@/components/customizer/armor/variants/QuadVeeArmorDiagram', () => ({
  QuadVeeArmorDiagram: () => <div data-testid="quadvee-armor-diagram" />,
}));

jest.mock('@/components/customizer/armor/LocationArmorEditor', () => ({
  LocationArmorEditor: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="location-armor-editor">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

describe('ArmorTab', () => {
  const mockStoreValues = {
    tonnage: 50,
    configuration: MechConfiguration.BIPED,
    componentTechBases: {},
    armorType: 'Standard',
    armorTonnage: 10,
    armorAllocation: {
      [MechLocation.HEAD]: 9,
      [MechLocation.CENTER_TORSO]: 16,
      centerTorsoRear: 5,
      [MechLocation.LEFT_TORSO]: 12,
      leftTorsoRear: 4,
      [MechLocation.RIGHT_TORSO]: 12,
      rightTorsoRear: 4,
      [MechLocation.LEFT_ARM]: 8,
      [MechLocation.RIGHT_ARM]: 8,
      [MechLocation.LEFT_LEG]: 12,
      [MechLocation.RIGHT_LEG]: 12,
    },
    setArmorType: jest.fn(),
    setArmorTonnage: jest.fn(),
    setLocationArmor: jest.fn(),
    autoAllocateArmor: jest.fn(),
    maximizeArmor: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useUnitStore as jest.Mock).mockImplementation(
      (selector: (state: typeof mockStoreValues) => unknown) => {
        if (typeof selector === 'function') {
          return selector(mockStoreValues);
        }
        return undefined;
      },
    );
  });

  it('should render armor tab', () => {
    render(<ArmorTab />);

    expect(screen.getByTestId('armor-diagram')).toBeInTheDocument();
  });

  it('should display armor type', () => {
    render(<ArmorTab />);

    expect(screen.getByText(/Type:/i)).toBeInTheDocument();
  });

  it('should display armor tonnage', () => {
    render(<ArmorTab />);

    expect(screen.getByText(/Pts\/Ton:/i)).toBeInTheDocument();
  });

  it('should render armor configuration', () => {
    render(<ArmorTab />);

    expect(screen.getByText(/Type:/i)).toBeInTheDocument();
    expect(screen.getByText(/Tonnage:/i)).toBeInTheDocument();
  });

  it('should display location editor when location is selected', async () => {
    const user = userEvent.setup();
    render(<ArmorTab />);

    const headButton = screen.getByText('Head');
    await user.click(headButton);

    expect(screen.getByTestId('location-armor-editor')).toBeInTheDocument();
  });

  it('should render armor diagram', () => {
    render(<ArmorTab />);

    expect(screen.getByTestId('armor-diagram')).toBeInTheDocument();
  });

  it('should render in read-only mode', () => {
    render(<ArmorTab readOnly={true} />);

    // The armor diagram should still be rendered in read-only mode
    expect(screen.getByTestId('armor-diagram')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<ArmorTab className="custom-class" />);

    const tab = container.firstChild;
    expect(tab).toHaveClass('custom-class');
  });

  describe('armor points display', () => {
    it('should display allocated points vs max armor capacity', () => {
      // 50-ton mech with 5 tons armor = 80 available points, max capacity = 169
      const storeWithPartialArmor = {
        ...mockStoreValues,
        armorTonnage: 5, // 80 points from tonnage
        armorAllocation: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 20,
          centerTorsoRear: 5,
          [MechLocation.LEFT_TORSO]: 10,
          leftTorsoRear: 3,
          [MechLocation.RIGHT_TORSO]: 10,
          rightTorsoRear: 3,
          [MechLocation.LEFT_ARM]: 6,
          [MechLocation.RIGHT_ARM]: 6,
          [MechLocation.LEFT_LEG]: 8,
          [MechLocation.RIGHT_LEG]: 8,
        }, // Total: 88 points allocated (but only 80 available from tonnage)
      };

      (useUnitStore as jest.Mock).mockImplementation(
        (selector: (state: typeof storeWithPartialArmor) => unknown) => {
          if (typeof selector === 'function') {
            return selector(storeWithPartialArmor);
          }
          return undefined;
        },
      );

      render(<ArmorTab />);

      // Should show allocated / maxTotalArmor (169), not allocated / availablePoints (80)
      expect(screen.getByText(/88\s*\/\s*169/)).toBeInTheDocument();
    });

    it('should display max armor in denominator when tonnage exceeds capacity', () => {
      // 50-ton mech with 11 tons armor = 176 available points, max capacity = 169
      const storeWithExcessTonnage = {
        ...mockStoreValues,
        armorTonnage: 11, // 176 points from tonnage, but max is 169
        armorAllocation: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 24,
          centerTorsoRear: 8,
          [MechLocation.LEFT_TORSO]: 18,
          leftTorsoRear: 6,
          [MechLocation.RIGHT_TORSO]: 18,
          rightTorsoRear: 6,
          [MechLocation.LEFT_ARM]: 16,
          [MechLocation.RIGHT_ARM]: 16,
          [MechLocation.LEFT_LEG]: 24,
          [MechLocation.RIGHT_LEG]: 24,
        }, // Total: 169 points (maxed out)
      };

      (useUnitStore as jest.Mock).mockImplementation(
        (selector: (state: typeof storeWithExcessTonnage) => unknown) => {
          if (typeof selector === 'function') {
            return selector(storeWithExcessTonnage);
          }
          return undefined;
        },
      );

      render(<ArmorTab />);

      // Should show 169/169, not 169/176
      expect(screen.getByText(/169\s*\/\s*169/)).toBeInTheDocument();
    });

    it('should show wasted armor points when tonnage exceeds max capacity', () => {
      // 50-ton mech with 11 tons armor = 176 available points, max capacity = 169
      // Wasted = 176 - 169 = 7 points
      const storeWithWastedPoints = {
        ...mockStoreValues,
        armorTonnage: 11, // 176 points from tonnage
        armorAllocation: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 24,
          centerTorsoRear: 8,
          [MechLocation.LEFT_TORSO]: 18,
          leftTorsoRear: 6,
          [MechLocation.RIGHT_TORSO]: 18,
          rightTorsoRear: 6,
          [MechLocation.LEFT_ARM]: 16,
          [MechLocation.RIGHT_ARM]: 16,
          [MechLocation.LEFT_LEG]: 24,
          [MechLocation.RIGHT_LEG]: 24,
        }, // Total: 169 points
      };

      (useUnitStore as jest.Mock).mockImplementation(
        (selector: (state: typeof storeWithWastedPoints) => unknown) => {
          if (typeof selector === 'function') {
            return selector(storeWithWastedPoints);
          }
          return undefined;
        },
      );

      render(<ArmorTab />);

      expect(screen.getByText(/Wasted Armor Points/i)).toBeInTheDocument();
      // Verify wasted points value appears (there may be multiple '7's in the UI)
      expect(screen.getAllByText('7').length).toBeGreaterThanOrEqual(1);
    });

    it('should not show wasted armor points when tonnage is under max capacity', () => {
      // 50-ton mech with 5 tons armor = 80 available points, max capacity = 169
      // No wasted points since 80 < 169
      const storeWithNoWaste = {
        ...mockStoreValues,
        armorTonnage: 5, // 80 points from tonnage
        armorAllocation: {
          [MechLocation.HEAD]: 9,
          [MechLocation.CENTER_TORSO]: 16,
          centerTorsoRear: 5,
          [MechLocation.LEFT_TORSO]: 12,
          leftTorsoRear: 4,
          [MechLocation.RIGHT_TORSO]: 12,
          rightTorsoRear: 4,
          [MechLocation.LEFT_ARM]: 8,
          [MechLocation.RIGHT_ARM]: 8,
          [MechLocation.LEFT_LEG]: 12,
          [MechLocation.RIGHT_LEG]: 12,
        },
      };

      (useUnitStore as jest.Mock).mockImplementation(
        (selector: (state: typeof storeWithNoWaste) => unknown) => {
          if (typeof selector === 'function') {
            return selector(storeWithNoWaste);
          }
          return undefined;
        },
      );

      render(<ArmorTab />);

      expect(
        screen.queryByText(/Wasted Armor Points/i),
      ).not.toBeInTheDocument();
    });
  });
});
