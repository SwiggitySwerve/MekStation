import { render, screen } from '@testing-library/react';
import OverviewTab from '../../../components/overview/OverviewTab';

// Mock the dependencies
jest.mock('../../../components/multiUnit/MultiUnitProvider', () => ({
  useUnit: () => ({
    unit: {
      getConfiguration: () => ({
        tonnage: 50,
        techBase: 'Inner Sphere',
        unitType: 'BattleMech',
        rulesLevel: 'Standard',
        introductionYear: 3025,
        engineType: 'Standard',
        engineRating: 200,
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        gyroType: { type: 'Standard', techBase: 'Inner Sphere' },
        structureType: { type: 'Standard', techBase: 'Inner Sphere' },
        armorType: { type: 'Standard', techBase: 'Inner Sphere' },
        heatSinkType: { type: 'Single', techBase: 'Inner Sphere' },
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' },
        totalHeatSinks: 10,
        mass: 50,
        armorAllocation: {},
        jumpJetCounts: {},
        enhancements: [],
        techProgression: {
          chassis: 'Inner Sphere',
          gyro: 'Inner Sphere',
          engine: 'Inner Sphere',
          heatsink: 'Inner Sphere',
          targeting: 'Inner Sphere',
          myomer: 'Inner Sphere',
          movement: 'Inner Sphere',
          armor: 'Inner Sphere'
        },
        techRating: 'D'
      })
    },
    updateConfiguration: jest.fn()
  })
}));

jest.mock('../../../services/editor/UnitSwitchCoordinator', () => ({
  switchSubsystemOnUnit: jest.fn().mockResolvedValue({
    updatedConfiguration: {},
    displacedEquipmentIds: [],
    validationResults: { isValid: true }
  }),
  switchAllSubsystemsOnUnit: jest.fn().mockResolvedValue({
    updatedConfiguration: {},
    displacedEquipmentIds: [],
    validationResults: { isValid: true }
  })
}));

// Mock the sub-panels to avoid deep rendering issues and missing dependencies in unit tests
jest.mock('../../../components/overview/TechProgressionPanel', () => () => <div data-testid="tech-progression-panel">TechProgressionPanel</div>);
jest.mock('../../../components/overview/UnitIdentityPanel', () => () => <div data-testid="unit-identity-panel">UnitIdentityPanel</div>);
jest.mock('../../../components/overview/TechRatingPanel', () => () => <div data-testid="tech-rating-panel">TechRatingPanel</div>);
jest.mock('../../../components/overview/OverviewSummaryPanel', () => () => <div data-testid="overview-summary-panel">OverviewSummaryPanel</div>);

// Mock utility functions that might be called during render
jest.mock('../../../utils/memoryPersistence', () => ({
  loadMemoryFromStorage: jest.fn(() => null),
  saveMemoryToStorage: jest.fn(),
  updateMemoryState: jest.fn(),
  initializeMemorySystem: jest.fn()
}));

describe('OverviewTab', () => {
  it('renders without crashing', () => {
    render(<OverviewTab />);
    expect(screen.getByText('Unit Overview')).toBeInTheDocument();
  });

  it('displays unit configuration section', () => {
    render(<OverviewTab />);
    expect(screen.getByText('Unit Configuration')).toBeInTheDocument();
  });

  it('displays introduction year input', () => {
    render(<OverviewTab />);
    // Search for the label and the input
    expect(screen.getByText(/Introduction Year/)).toBeInTheDocument();
    expect(screen.getByDisplayValue('3025')).toBeInTheDocument();
  });

  it('displays master tech base selector', () => {
    render(<OverviewTab />);
    expect(screen.getByText('Master Tech Base')).toBeInTheDocument();
    // Check if 'Inner Sphere' is displayed as the value of the select (which it is by default in mock)
    // Note: getByDisplayValue finds form elements with that value
    const selects = screen.getAllByDisplayValue('Inner Sphere');
    expect(selects.length).toBeGreaterThan(0);
  });

  it('renders child panels', () => {
    render(<OverviewTab />);
    expect(screen.getByTestId('tech-progression-panel')).toBeInTheDocument();
    expect(screen.getByTestId('tech-rating-panel')).toBeInTheDocument();
  });
});
