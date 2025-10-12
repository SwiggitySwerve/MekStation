/**
 * Unit State Manager Test Suite
 * Tests for the central state management orchestration layer
 */

import { UnitStateManager, StateChangeEvent } from '../../../utils/criticalSlots/UnitStateManager';
import { UnitConfiguration, UnitCriticalManager } from '../../../utils/criticalSlots/UnitCriticalManager';
import { EngineType, GyroType } from '../../../utils/criticalSlots/SystemComponentRules';
import { EquipmentObject } from '../../../utils/criticalSlots/CriticalSlot';
import { ComponentConfiguration } from '../../../types/componentConfiguration';

// Mock external dependencies
jest.mock('../../../utils/criticalSlots/UnitCriticalManager');
jest.mock('../../../utils/criticalSlots/MechConstructor', () => ({
  MechConstructor: {
    changeEngine: jest.fn(),
    changeGyro: jest.fn(),
    changeEngineAndGyro: jest.fn()
  }
}));

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-1234')
}));

// Get the mocked classes
const MockUnitCriticalManager = UnitCriticalManager as jest.MockedClass<typeof UnitCriticalManager>;

describe('UnitStateManager', () => {
  let mockUnitCriticalManager: jest.Mocked<UnitCriticalManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create a mock UnitCriticalManager instance
    mockUnitCriticalManager = {
      getConfiguration: jest.fn(),
      getEngineType: jest.fn(),
      getGyroType: jest.fn(),
      getSummary: jest.fn(),
      validate: jest.fn(),
      getUnallocatedEquipment: jest.fn(),
      getEquipmentByLocation: jest.fn(),
      addUnallocatedEquipment: jest.fn(),
      removeUnallocatedEquipment: jest.fn(),
      displaceEquipment: jest.fn(),
      getSection: jest.fn(),
      updateConfiguration: jest.fn()
    } as any;

    // Mock the constructor to return our mock instance
    MockUnitCriticalManager.mockImplementation(() => mockUnitCriticalManager);
  });

  describe('Constructor and Initialization', () => {
    test('creates with default configuration', () => {
      const stateManager = new UnitStateManager();

      expect(MockUnitCriticalManager).toHaveBeenCalledWith(
        expect.objectContaining({
          chassis: 'Custom',
          model: 'New Design',
          engineType: 'Standard',
          gyroType: 'Standard',
          tonnage: 50,
          unitType: 'BattleMech'
        })
      );

      expect(stateManager.getCurrentUnit()).toBe(mockUnitCriticalManager);
    });

    test('creates with provided configuration', () => {
      const customConfig: UnitConfiguration = {
        chassis: 'Atlas',
        model: 'AS7-D',
        tonnage: 100,
        unitType: 'BattleMech',
        techBase: 'Inner Sphere',
        walkMP: 3,
        engineRating: 300,
        runMP: 4,
        engineType: 'Standard',
        gyroType: 'Standard' as ComponentConfiguration,
        structureType: 'Standard' as ComponentConfiguration,
        armorType: 'Standard' as ComponentConfiguration,
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 47, rear: 14 },
          LT: { front: 32, rear: 10 },
          RT: { front: 32, rear: 10 },
          LA: { front: 34, rear: 0 },
          RA: { front: 34, rear: 0 },
          LL: { front: 41, rear: 0 },
          RL: { front: 41, rear: 0 }
        },
        armorTonnage: 19.0,
        heatSinkType: 'Single' as ComponentConfiguration,
        totalHeatSinks: 20,
        internalHeatSinks: 10,
        externalHeatSinks: 10,
        jumpMP: 0,
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' } as ComponentConfiguration,
        jumpJetCounts: {},
        hasPartialWing: false,
        mass: 100,
        enhancements: []
      };

      const stateManager = new UnitStateManager(customConfig);

      expect(MockUnitCriticalManager).toHaveBeenCalledWith(customConfig);
      expect(stateManager.getCurrentUnit()).toBe(mockUnitCriticalManager);
    });

    test('tracks initialization in change history', () => {
      const stateManager = new UnitStateManager();
      const history = stateManager.getChangeHistory();

      expect(history).toHaveLength(1);
      expect(history[0]).toEqual(
        expect.objectContaining({
          type: 'unit_updated',
          data: expect.objectContaining({
            action: 'initialized'
          })
        })
      );
    });
  });

  describe('State Management and Subscribers', () => {
    test('supports subscription to state changes', () => {
      const stateManager = new UnitStateManager();
      const callback = jest.fn();

      const unsubscribe = stateManager.subscribe(callback);

      expect(typeof unsubscribe).toBe('function');
      expect(callback).not.toHaveBeenCalled();
    });

    test('notifies subscribers on state changes', () => {
      const stateManager = new UnitStateManager();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      stateManager.subscribe(callback1);
      stateManager.subscribe(callback2);

      // Trigger a state change
      const testEquipment: EquipmentObject = {
        id: 'test_equipment',
        name: 'Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      stateManager.addUnallocatedEquipment(testEquipment);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    test('allows unsubscription', () => {
      const stateManager = new UnitStateManager();
      const callback = jest.fn();

      const unsubscribe = stateManager.subscribe(callback);
      unsubscribe();

      // Trigger a state change
      const testEquipment: EquipmentObject = {
        id: 'test_equipment',
        name: 'Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      stateManager.addUnallocatedEquipment(testEquipment);

      expect(callback).not.toHaveBeenCalled();
    });

    test('handles errors in subscriber callbacks gracefully', () => {
      const stateManager = new UnitStateManager();
      const errorCallback = jest.fn(() => { throw new Error('Subscriber error'); });
      const normalCallback = jest.fn();

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      stateManager.subscribe(errorCallback);
      stateManager.subscribe(normalCallback);

      // Trigger a state change
      const testEquipment: EquipmentObject = {
        id: 'test_equipment',
        name: 'Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      stateManager.addUnallocatedEquipment(testEquipment);

      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Error in state subscriber callback:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });

  describe('Equipment Management', () => {
    test('adds unallocated equipment', () => {
      const stateManager = new UnitStateManager();
      const testEquipment: EquipmentObject = {
        id: 'test_weapon',
        name: 'Test Weapon',
        type: 'weapon',
        requiredSlots: 2,
        weight: 3.0,
        techBase: 'Inner Sphere'
      };

      stateManager.addUnallocatedEquipment(testEquipment);

      expect(mockUnitCriticalManager.addUnallocatedEquipment).toHaveBeenCalledWith([
        expect.objectContaining({
          equipmentData: testEquipment,
          location: '',
          occupiedSlots: [],
          startSlotIndex: -1,
          endSlotIndex: -1
        })
      ]);
    });

    test('removes equipment from unallocated pool', () => {
      const stateManager = new UnitStateManager();
      const mockEquipment = {
        equipmentData: { name: 'Test Equipment' },
        equipmentGroupId: 'test-group-123'
      };

      mockUnitCriticalManager.removeUnallocatedEquipment.mockReturnValue(mockEquipment as any);

      const result = stateManager.removeEquipment('test-group-123');

      expect(result).toBe(true);
      expect(mockUnitCriticalManager.removeUnallocatedEquipment).toHaveBeenCalledWith('test-group-123');
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'equipment_change' && 
        change.data?.action === 'removed_from_unallocated'
      )).toBe(true);
    });

    test('displaces equipment from allocated slots when not in unallocated', () => {
      const stateManager = new UnitStateManager();

      mockUnitCriticalManager.removeUnallocatedEquipment.mockReturnValue(null);
      mockUnitCriticalManager.displaceEquipment.mockReturnValue(true);

      const result = stateManager.removeEquipment('test-group-123');

      expect(result).toBe(true);
      expect(mockUnitCriticalManager.removeUnallocatedEquipment).toHaveBeenCalledWith('test-group-123');
      expect(mockUnitCriticalManager.displaceEquipment).toHaveBeenCalledWith('test-group-123');
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'equipment_change' && 
        change.data?.action === 'displaced_to_unallocated'
      )).toBe(true);
    });

    test('returns false when equipment not found', () => {
      const stateManager = new UnitStateManager();

      mockUnitCriticalManager.removeUnallocatedEquipment.mockReturnValue(null);
      mockUnitCriticalManager.displaceEquipment.mockReturnValue(false);

      const result = stateManager.removeEquipment('nonexistent-group');

      expect(result).toBe(false);
    });

    test('adds test equipment to specific location', () => {
      const stateManager = new UnitStateManager();
      const testEquipment: EquipmentObject = {
        id: 'test_weapon',
        name: 'Test Weapon',
        type: 'weapon',
        requiredSlots: 2,
        weight: 3.0,
        techBase: 'Inner Sphere'
      };

      const mockSection = {
        findContiguousAvailableSlots: jest.fn().mockReturnValue([5]),
        allocateEquipment: jest.fn().mockReturnValue(true)
      };

      mockUnitCriticalManager.getSection.mockReturnValue(mockSection as any);

      const result = stateManager.addTestEquipment(testEquipment, 'Center Torso', 3);

      expect(result).toBe(true);
      expect(mockSection.allocateEquipment).toHaveBeenCalledWith(testEquipment, 3);
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'equipment_change' && 
        change.data?.action === 'added'
      )).toBe(true);
    });
  });

  describe('System Component Changes', () => {
    beforeEach(() => {
      const { MechConstructor } = require('../../../utils/criticalSlots/MechConstructor');
      
      // Setup default mock return for constructor operations
      const mockResult = {
        newUnit: mockUnitCriticalManager,
        displacedEquipment: [],
        migratedEquipment: [],
        unallocatedEquipment: [],
        summary: { totalDisplaced: 0, totalMigrated: 0, totalUnallocated: 0 }
      };

      MechConstructor.changeEngine.mockReturnValue(mockResult);
      MechConstructor.changeGyro.mockReturnValue(mockResult);
      MechConstructor.changeEngineAndGyro.mockReturnValue(mockResult);
    });

    test('handles engine type change', () => {
      const stateManager = new UnitStateManager();
      const { MechConstructor } = require('../../../utils/criticalSlots/MechConstructor');

      mockUnitCriticalManager.getEngineType.mockReturnValue('Standard');

      const result = stateManager.handleEngineChange('XL');

      expect(MechConstructor.changeEngine).toHaveBeenCalledWith(
        mockUnitCriticalManager,
        'XL',
        { attemptMigration: false, preserveLocationPreference: false }
      );
      expect(result.newUnit).toBe(mockUnitCriticalManager);
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'system_change' && 
        change.data?.component === 'engine'
      )).toBe(true);
    });

    test('skips engine change when type is same', () => {
      const stateManager = new UnitStateManager();
      const { MechConstructor } = require('../../../utils/criticalSlots/MechConstructor');

      mockUnitCriticalManager.getEngineType.mockReturnValue('Standard');

      const result = stateManager.handleEngineChange('Standard');

      expect(MechConstructor.changeEngine).not.toHaveBeenCalled();
      expect(result.summary.totalDisplaced).toBe(0);
    });

    test('handles gyro type change', () => {
      const stateManager = new UnitStateManager();
      const { MechConstructor } = require('../../../utils/criticalSlots/MechConstructor');

      mockUnitCriticalManager.getGyroType.mockReturnValue('Standard');

      const result = stateManager.handleGyroChange('XL');

      expect(MechConstructor.changeGyro).toHaveBeenCalledWith(
        mockUnitCriticalManager,
        'XL',
        { attemptMigration: false, preserveLocationPreference: false }
      );
      expect(result.newUnit).toBe(mockUnitCriticalManager);
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'system_change' && 
        change.data?.component === 'gyro'
      )).toBe(true);
    });

    test('handles combined engine and gyro change', () => {
      const stateManager = new UnitStateManager();
      const { MechConstructor } = require('../../../utils/criticalSlots/MechConstructor');

      mockUnitCriticalManager.getEngineType.mockReturnValue('Standard');
      mockUnitCriticalManager.getGyroType.mockReturnValue('Standard');

      const result = stateManager.handleEngineAndGyroChange('XL', 'Compact');

      expect(MechConstructor.changeEngineAndGyro).toHaveBeenCalledWith(
        mockUnitCriticalManager,
        'XL',
        'Compact',
        { attemptMigration: false, preserveLocationPreference: false }
      );
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'system_change' && 
        change.data?.component === 'engine_and_gyro'
      )).toBe(true);
    });

    test('passes custom options to constructor methods', () => {
      const stateManager = new UnitStateManager();
      const { MechConstructor } = require('../../../utils/criticalSlots/MechConstructor');

      mockUnitCriticalManager.getEngineType.mockReturnValue('Standard');

      const customOptions = { attemptMigration: true, preserveLocationPreference: true };
      stateManager.handleEngineChange('XL', customOptions);

      expect(MechConstructor.changeEngine).toHaveBeenCalledWith(
        mockUnitCriticalManager,
        'XL',
        customOptions
      );
    });
  });

  describe('Configuration Management', () => {
    test('handles configuration updates', () => {
      const stateManager = new UnitStateManager();
      const newConfig: UnitConfiguration = {
        chassis: 'Locust',
        model: 'LCT-1V',
        tonnage: 20,
        unitType: 'BattleMech',
        techBase: 'Inner Sphere',
        walkMP: 8,
        engineRating: 160,
        runMP: 12,
        engineType: 'Standard',
        gyroType: 'Standard' as ComponentConfiguration,
        structureType: 'Standard' as ComponentConfiguration,
        armorType: 'Standard' as ComponentConfiguration,
        armorAllocation: {
          HD: { front: 6, rear: 0 },
          CT: { front: 6, rear: 2 },
          LT: { front: 4, rear: 2 },
          RT: { front: 4, rear: 2 },
          LA: { front: 3, rear: 0 },
          RA: { front: 3, rear: 0 },
          LL: { front: 4, rear: 0 },
          RL: { front: 4, rear: 0 }
        },
        armorTonnage: 2.0,
        heatSinkType: 'Single' as ComponentConfiguration,
        totalHeatSinks: 10,
        internalHeatSinks: 10,
        externalHeatSinks: 0,
        jumpMP: 0,
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' } as ComponentConfiguration,
        jumpJetCounts: {},
        hasPartialWing: false,
        mass: 20,
        enhancements: []
      };

      const oldConfig = {
        tonnage: 50,
        engineType: 'Standard',
        gyroType: 'Standard' as ComponentConfiguration
      };

      mockUnitCriticalManager.getConfiguration.mockReturnValue(oldConfig as any);

      stateManager.handleConfigurationUpdate(newConfig);

      expect(mockUnitCriticalManager.updateConfiguration).toHaveBeenCalledWith(newConfig);
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'unit_updated' && 
        change.data?.action === 'configuration_update'
      )).toBe(true);
    });

    test('detects significant configuration changes', () => {
      const stateManager = new UnitStateManager();
      
      // Test engine type change
      const oldConfig = { engineType: 'Standard', gyroType: 'Standard' as ComponentConfiguration, tonnage: 50 };
      const newConfig = { engineType: 'XL', gyroType: 'Standard' as ComponentConfiguration, tonnage: 50 };

      mockUnitCriticalManager.getConfiguration.mockReturnValue(oldConfig as any);

      stateManager.handleConfigurationUpdate(newConfig as any);

      const history = stateManager.getChangeHistory();
      const configChange = history.find(change => 
        change === 'unit_updated' && 
        change.data?.action === 'configuration_update'
      );

      expect(configChange?.data?.hasSignificantChanges).toBe(true);
    });

    test('provides current configuration access', () => {
      const stateManager = new UnitStateManager();
      const mockConfig = { tonnage: 50, engineType: 'Standard', gyroType: 'Standard' as ComponentConfiguration };

      mockUnitCriticalManager.getConfiguration.mockReturnValue(mockConfig as any);

      const config = stateManager.getConfiguration();

      expect(config).toBe(mockConfig);
      expect(mockUnitCriticalManager.getConfiguration).toHaveBeenCalled();
    });
  });

  describe('Unit Summary and Validation', () => {
    test('provides comprehensive unit summary', () => {
      const stateManager = new UnitStateManager();
      
      const mockConfig = { tonnage: 50, engineType: 'Standard', gyroType: 'Standard' as ComponentConfiguration };
      const mockSummary = { totalSlots: 78, occupiedSlots: 40 };
      const mockValidation = { isValid: true, errors: [], warnings: [] };
      const mockUnallocated = [{ equipmentData: { name: 'Test' } }];
      const mockByLocation = new Map([['Center Torso', []]]);

      mockUnitCriticalManager.getConfiguration.mockReturnValue(mockConfig as any);
      mockUnitCriticalManager.getSummary.mockReturnValue(mockSummary as any);
      mockUnitCriticalManager.validate.mockReturnValue(mockValidation as any);
      mockUnitCriticalManager.getUnallocatedEquipment.mockReturnValue(mockUnallocated as any);
      mockUnitCriticalManager.getEquipmentByLocation.mockReturnValue(mockByLocation as any);

      const summary = stateManager.getUnitSummary();

      expect(summary).toEqual({
        configuration: mockConfig,
        summary: mockSummary,
        validation: mockValidation,
        unallocatedEquipment: mockUnallocated,
        equipmentByLocation: mockByLocation
      });
    });

    test('provides validation status', () => {
      const stateManager = new UnitStateManager();
      const mockValidation = { isValid: false, errors: ['Error 1'], warnings: ['Warning 1'] };

      mockUnitCriticalManager.validate.mockReturnValue(mockValidation as any);

      const validation = stateManager.getValidation();

      expect(validation).toBe(mockValidation);
    });

    test('provides engine and gyro type access', () => {
      const stateManager = new UnitStateManager();

      mockUnitCriticalManager.getEngineType.mockReturnValue('XL');
      mockUnitCriticalManager.getGyroType.mockReturnValue('Compact');

      expect(stateManager.getEngineType()).toBe('XL');
      expect(stateManager.getGyroType()).toBe('Compact');
    });
  });

  describe('Change History and Debugging', () => {
    test('tracks change history', () => {
      const stateManager = new UnitStateManager();
      
      // Initial history should have initialization event
      let history = stateManager.getChangeHistory();
      expect(history).toHaveLength(1);
      expect(history[0]).toBe('unit_updated');

      // Add equipment to trigger another change
      const testEquipment: EquipmentObject = {
        id: 'test_equipment',
        name: 'Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      stateManager.addUnallocatedEquipment(testEquipment);

      history = stateManager.getChangeHistory();
      // Should have initialization + equipment addition
      expect(history.length).toBeGreaterThanOrEqual(1);
      expect(history.length).toBeLessThanOrEqual(2);
    });

    test('limits change history to 100 entries', () => {
      const stateManager = new UnitStateManager();
      
      // Add lots of changes to test history limit
      const testEquipment: EquipmentObject = {
        id: 'test_equipment',
        name: 'Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      // Add 150 changes (more than the 100 limit)
      for (let i = 0; i < 150; i++) {
        stateManager.addUnallocatedEquipment({
          ...testEquipment,
          id: `test_equipment_${i}`
        });
      }

      const history = stateManager.getChangeHistory();
      expect(history.length).toBeLessThanOrEqual(100);
    });

    test('provides recent changes', () => {
      const stateManager = new UnitStateManager();
      
      const testEquipment: EquipmentObject = {
        id: 'test_equipment',
        name: 'Test Equipment',
        type: 'equipment',
        requiredSlots: 1,
        weight: 1.0,
        techBase: 'Inner Sphere'
      };

      // Add several changes
      for (let i = 0; i < 5; i++) {
        stateManager.addUnallocatedEquipment({
          ...testEquipment,
          id: `test_equipment_${i}`
        });
      }

      const recentChanges = stateManager.getRecentChanges(3);
      const allChanges = stateManager.getChangeHistory();
      
      // Should get the requested number or fewer if not enough changes exist
      expect(recentChanges.length).toBeLessThanOrEqual(3);
      expect(recentChanges.length).toBeLessThanOrEqual(allChanges.length);
      
      // Should be the most recent changes
      expect(recentChanges).toEqual(allChanges.slice(-recentChanges.length));
    });

    test('provides debug information', () => {
      const stateManager = new UnitStateManager();
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      stateManager.subscribe(callback1);
      stateManager.subscribe(callback2);

      // Set up mock returns for debug info
      const mockConfig = { tonnage: 50, engineType: 'Standard', gyroType: 'Standard' as ComponentConfiguration };
      const mockSummary = { totalSlots: 78, occupiedSlots: 40 };
      const mockValidation = { isValid: true, errors: [], warnings: [] };
      const mockUnallocated = [{ equipmentData: { name: 'Test' } }];
      const mockByLocation = new Map([['Center Torso', []]]);

      mockUnitCriticalManager.getConfiguration.mockReturnValue(mockConfig as any);
      mockUnitCriticalManager.getSummary.mockReturnValue(mockSummary as any);
      mockUnitCriticalManager.validate.mockReturnValue(mockValidation as any);
      mockUnitCriticalManager.getUnallocatedEquipment.mockReturnValue(mockUnallocated as any);
      mockUnitCriticalManager.getEquipmentByLocation.mockReturnValue(mockByLocation as any);

      const debugInfo = stateManager.getDebugInfo();

      expect(debugInfo).toEqual(
        expect.objectContaining({
          changeHistoryLength: expect.any(Number),
          configuration: expect.any(Object),
          equipmentByLocation: expect.any(Map),
          lastChange: expect.any(Object)
        })
      );
    });

    test('resets unit to clean state', () => {
      const stateManager = new UnitStateManager();
      const newConfig: UnitConfiguration = {
        chassis: 'Griffin',
        model: 'GRF-1N',
        tonnage: 55,
        unitType: 'BattleMech',
        techBase: 'Inner Sphere',
        walkMP: 5,
        engineRating: 275,
        runMP: 8,
        engineType: 'Standard',
        gyroType: 'Standard' as ComponentConfiguration,
        structureType: 'Standard' as ComponentConfiguration,
        armorType: 'Standard' as ComponentConfiguration,
        armorAllocation: {
          HD: { front: 9, rear: 0 },
          CT: { front: 26, rear: 8 },
          LT: { front: 19, rear: 6 },
          RT: { front: 19, rear: 6 },
          LA: { front: 18, rear: 0 },
          RA: { front: 18, rear: 0 },
          LL: { front: 26, rear: 0 },
          RL: { front: 26, rear: 0 }
        },
        armorTonnage: 9.5,
        heatSinkType: 'Single' as ComponentConfiguration,
        totalHeatSinks: 11,
        internalHeatSinks: 10,
        externalHeatSinks: 1,
        jumpMP: 0,
        jumpJetType: { type: 'Standard Jump Jet', techBase: 'Inner Sphere' } as ComponentConfiguration,
        jumpJetCounts: {},
        hasPartialWing: false,
        mass: 55,
        enhancements: []
      };

      // Mock the resetToBaseConfiguration method
      mockUnitCriticalManager.resetToBaseConfiguration = jest.fn();
      mockUnitCriticalManager.updateConfiguration = jest.fn();

      stateManager.resetUnit(newConfig);

      // Should call resetToBaseConfiguration and updateConfiguration, not create new UnitCriticalManager
      expect(mockUnitCriticalManager.resetToBaseConfiguration).toHaveBeenCalled();
      expect(mockUnitCriticalManager.updateConfiguration).toHaveBeenCalledWith(newConfig);
      
      const history = stateManager.getChangeHistory();
      expect(history.some(change => 
        change === 'unit_updated' && 
        change.data?.action === 'reset'
      )).toBe(true);
    });
  });
});
