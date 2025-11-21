import { render, screen, fireEvent } from '@testing-library/react';
import { StructureTab } from '../../../components/editor/tabs/StructureTab';

// Mock dependencies
jest.mock('../../../components/multiUnit/MultiUnitProvider', () => ({
  useUnit: () => ({
    unit: {
      getConfiguration: () => ({
        tonnage: 50,
        techBase: 'Inner Sphere',
        rulesLevel: 'Standard',
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
        internalHeatSinks: 8,
        externalHeatSinks: 2,
        mass: 50,
        armorTonnage: 8.0,
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
        }
      })
    },
    updateConfiguration: jest.fn(),
    isConfigLoaded: true
  })
}));

// Mock utilities to avoid deep implementation logic
jest.mock('../../../utils/techProgressionFiltering', () => ({
  getFilteredComponentOptions: () => ({
    engine: ['Standard', 'XL'],
    structure: ['Standard', 'Endo Steel'],
    gyro: ['Standard', 'XL'],
    heatSink: ['Single', 'Double']
  }),
  validateComponentSelection: () => true,
  autoCorrectComponentSelections: (config: any) => config,
  formatTechBaseForDisplay: (tb: string) => tb
}));

jest.mock('../../../utils/movementCalculations', () => ({
  calculateEnhancedMovement: () => ({
    walkValue: 4,
    runValue: 6,
    jumpValue: 0,
    canJump: false,
    sprintValue: 8
  }),
  getAvailableMovementEnhancements: () => [],
  MOVEMENT_ENHANCEMENTS: {}
}));

jest.mock('../../../utils/memoryPersistence', () => ({
  initializeMemorySystem: jest.fn(() => ({})),
  updateMemoryState: jest.fn(),
  saveMemoryToStorage: jest.fn(),
  loadMemoryFromStorage: jest.fn()
}));

// Mock SkeletonLoader components
jest.mock('../../../components/common/SkeletonLoader', () => ({
  SkeletonInput: () => <div data-testid="skeleton-input">SkeletonInput</div>,
  SkeletonSelect: () => <div data-testid="skeleton-select">SkeletonSelect</div>,
  SkeletonText: () => <div data-testid="skeleton-text">SkeletonText</div>,
  SkeletonFormSection: () => <div data-testid="skeleton-section">SkeletonFormSection</div>
}));

describe('StructureTab', () => {
  it('renders without crashing', () => {
    render(<StructureTab />);
    expect(screen.getByText('Core Unit Configuration')).toBeInTheDocument();
  });

  it('displays core configuration inputs', () => {
    render(<StructureTab />);
    expect(screen.getByLabelText('Unit tonnage')).toBeInTheDocument();
    expect(screen.getByLabelText('Engine type')).toBeInTheDocument();
  });

  it('displays movement inputs', () => {
    render(<StructureTab />);
    expect(screen.getByLabelText('Walk movement points')).toBeInTheDocument();
    expect(screen.getByLabelText('Jump movement points')).toBeInTheDocument();
  });

  it('renders summary table', () => {
    render(<StructureTab />);
    expect(screen.getByText('Summary')).toBeInTheDocument();
    expect(screen.getByText('Unit Type:')).toBeInTheDocument();
  });
});
