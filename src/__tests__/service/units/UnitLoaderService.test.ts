import { UnitLoaderService, ISerializedUnit } from '@/services/units/UnitLoaderService';
import { canonicalUnitService, IFullUnit } from '@/services/units/CanonicalUnitService';
import { customUnitApiService } from '@/services/units/CustomUnitApiService';
import { equipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry, EquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { EquipmentCategory } from '@/types/equipment';

// Mock dependencies
jest.mock('@/services/units/CanonicalUnitService');
jest.mock('@/services/units/CustomUnitApiService');
jest.mock('@/services/equipment/EquipmentLookupService');
jest.mock('@/services/equipment/EquipmentRegistry');
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123'),
}));

const mockCanonicalUnitService = canonicalUnitService as jest.Mocked<typeof canonicalUnitService>;
const mockCustomUnitApiService = customUnitApiService as jest.Mocked<typeof customUnitApiService>;
const mockEquipmentLookupService = equipmentLookupService as jest.Mocked<typeof equipmentLookupService>;
const mockGetEquipmentRegistry = getEquipmentRegistry as jest.MockedFunction<typeof getEquipmentRegistry>;

describe('UnitLoaderService', () => {
  let service: UnitLoaderService;
  let mockRegistry: jest.Mocked<EquipmentRegistry>;

  beforeEach(() => {
    service = new UnitLoaderService();
    jest.clearAllMocks();
    
    // Setup mock equipment registry
    mockRegistry = {
      isReady: jest.fn().mockReturnValue(false),
      lookup: jest.fn().mockReturnValue({ found: false, equipment: null, category: null }),
      initialize: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EquipmentRegistry>;
    mockGetEquipmentRegistry.mockReturnValue(mockRegistry);
    
    // Setup mock equipment lookup service initialization
    mockEquipmentLookupService.initialize = jest.fn().mockResolvedValue(undefined);
  });

  describe('loadCanonicalUnit', () => {
    it('should load canonical unit successfully', async () => {
      const mockUnit: IFullUnit = {
        id: 'canon-1',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      } as IFullUnit;

      mockCanonicalUnitService.getById.mockResolvedValue(mockUnit);

      const result = await service.loadCanonicalUnit('canon-1');

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state?.chassis).toBe('Atlas');
      expect(result.state?.model).toBe('AS7-D');
      expect(result.error).toBeUndefined();
    });

    it('should return error when unit not found', async () => {
      mockCanonicalUnitService.getById.mockResolvedValue(null);

      const result = await service.loadCanonicalUnit('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
      expect(result.state).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      mockCanonicalUnitService.getById.mockRejectedValue(new Error('Service error'));

      const result = await service.loadCanonicalUnit('canon-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Service error');
    });
  });

  describe('loadCustomUnit', () => {
    it('should load custom unit successfully', async () => {
      const mockUnit = {
        id: 'custom-1',
        chassis: 'Custom Atlas',
        variant: 'AS7-X',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
        currentVersion: 1,
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      };

      // @ts-expect-error - Partial mock of IFullUnit for testing
      mockCustomUnitApiService.getById.mockResolvedValue(mockUnit);

      const result = await service.loadCustomUnit('custom-1');

      expect(result.success).toBe(true);
      expect(result.state).toBeDefined();
      expect(result.state?.chassis).toBe('Custom Atlas');
    });

    it('should return error when custom unit not found', async () => {
      mockCustomUnitApiService.getById.mockResolvedValue(null);

      const result = await service.loadCustomUnit('non-existent');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });

    it('should handle errors gracefully', async () => {
      mockCustomUnitApiService.getById.mockRejectedValue(new Error('API error'));

      const result = await service.loadCustomUnit('custom-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API error');
    });
  });

  describe('loadUnit', () => {
    it('should load canonical unit when source is canonical', async () => {
      const mockUnit: IFullUnit = {
        id: 'canon-1',
        chassis: 'Atlas',
        variant: 'AS7-D',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      } as IFullUnit;

      mockCanonicalUnitService.getById.mockResolvedValue(mockUnit);

      const result = await service.loadUnit('canon-1', 'canonical');

      expect(result.success).toBe(true);
      expect(mockCanonicalUnitService.getById).toHaveBeenCalledWith('canon-1');
    });

    it('should load custom unit when source is custom', async () => {
      const mockUnit = {
        id: 'custom-1',
        chassis: 'Custom',
        variant: 'Mech',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      };

      // @ts-expect-error - Partial mock of IFullUnit for testing
      mockCustomUnitApiService.getById.mockResolvedValue(mockUnit);

      const result = await service.loadUnit('custom-1', 'custom');

      expect(result.success).toBe(true);
      expect(mockCustomUnitApiService.getById).toHaveBeenCalledWith('custom-1');
    });
  });

  describe('mapToUnitState', () => {
    const createMockSerializedUnit = (overrides?: Partial<ISerializedUnit>): ISerializedUnit => ({
      id: 'test-unit',
      chassis: 'Atlas',
      variant: 'AS7-D',
      tonnage: 100,
      techBase: 'Inner Sphere',
      ...overrides,
    });

    it('should map basic unit data', () => {
      const serialized = createMockSerializedUnit();
      const state = service.mapToUnitState(serialized, true);

      expect(state.chassis).toBe('Atlas');
      expect(state.model).toBe('AS7-D');
      expect(state.tonnage).toBe(100);
      expect(state.techBase).toBe(TechBase.INNER_SPHERE);
      expect(state.id).toBe('mock-uuid-123'); // New UUID for loaded units
    });

    it('should map engine types', () => {
      const serialized = createMockSerializedUnit({
        engine: { type: 'Standard Fusion', rating: 300 },
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.engineType).toBe(EngineType.STANDARD);
      expect(state.engineRating).toBe(300);
    });

    it('should map XL engine based on tech base', () => {
      const serializedIS = createMockSerializedUnit({
        techBase: 'Inner Sphere',
        engine: { type: 'XL', rating: 300 },
      });
      const stateIS = service.mapToUnitState(serializedIS, true);
      expect(stateIS.engineType).toBe(EngineType.XL_IS);

      const serializedClan = createMockSerializedUnit({
        techBase: 'Clan',
        engine: { type: 'XL', rating: 300 },
      });
      const stateClan = service.mapToUnitState(serializedClan, true);
      expect(stateClan.engineType).toBe(EngineType.XL_CLAN);
    });

    it('should calculate engine rating from movement if not provided', () => {
      const serialized = createMockSerializedUnit({
        movement: { walk: 3 },
        tonnage: 100,
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.engineRating).toBe(300); // 3 * 100
    });

    it('should map gyro types', () => {
      const serialized = createMockSerializedUnit({
        gyro: { type: 'XL Gyro' },
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.gyroType).toBe(GyroType.XL);
    });

    it('should map structure types', () => {
      const serialized = createMockSerializedUnit({
        structure: { type: 'Endo Steel' },
        techBase: 'Inner Sphere',
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.internalStructureType).toBe(InternalStructureType.ENDO_STEEL_IS);
    });

    it('should map cockpit types', () => {
      const serialized = createMockSerializedUnit({
        cockpit: 'Small Cockpit',
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.cockpitType).toBe(CockpitType.SMALL);
    });

    it('should map heat sink types', () => {
      const serialized = createMockSerializedUnit({
        heatSinks: { type: 'Double', count: 20 },
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.heatSinkType).toBe(HeatSinkType.DOUBLE_IS);
      expect(state.heatSinkCount).toBe(20);
    });

    it('should use default heat sink count if not provided', () => {
      const serialized = createMockSerializedUnit({
        // @ts-expect-error - Testing default value behavior with missing count
        heatSinks: { type: 'Single' },
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.heatSinkCount).toBe(10);
    });

    it('should map armor types', () => {
      const serialized = createMockSerializedUnit({
        armor: { type: 'Ferro-Fibrous' },
        techBase: 'Inner Sphere',
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.armorType).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
    });

    it('should map armor allocation', () => {
      const serialized = createMockSerializedUnit({
        armor: {
          type: 'Standard',
          allocation: {
            Head: 9,
            'Center Torso': { front: 30, rear: 10 },
          },
        },
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.armorAllocation[MechLocation.HEAD]).toBe(9);
      expect(state.armorAllocation[MechLocation.CENTER_TORSO]).toBe(30);
      expect(state.armorAllocation.centerTorsoRear).toBe(10);
    });

    it('should map equipment with location', () => {
      const mockEquipment = {
        id: 'medium-laser',
        name: 'Medium Laser',
        category: EquipmentCategory.ENERGY_WEAPON,
        weight: 1,
        criticalSlots: 1,
        heat: 3,
        techBase: TechBase.INNER_SPHERE,
      };

      // @ts-expect-error - Partial mock of IEquipmentItem for testing
      mockEquipmentLookupService.getById.mockReturnValue(mockEquipment);

      const serialized = createMockSerializedUnit({
        equipment: [
          { id: 'medium-laser', location: 'Right Arm' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('medium-laser');
      expect(state.equipment[0].location).toBe(MechLocation.RIGHT_ARM);
      expect(state.equipment[0].name).toBe('Medium Laser');
    });

    it('should create placeholder for unknown equipment', () => {
      mockEquipmentLookupService.getById.mockReturnValue(undefined);

      const serialized = createMockSerializedUnit({
        equipment: [
          { id: 'unknown-equipment', location: 'Left Arm' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('unknown-equipment');
      expect(state.equipment[0].name).toBe('unknown-equipment');
      expect(state.equipment[0].category).toBe(EquipmentCategory.MISC_EQUIPMENT);
    });

    it('should map rules level', () => {
      const serialized = createMockSerializedUnit({
        rulesLevel: 'Advanced',
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.rulesLevel).toBe(RulesLevel.ADVANCED);
    });

    it('should use model or variant for name', () => {
      const serializedWithModel = createMockSerializedUnit({
        model: 'AS7-D',
      });
      const stateWithModel = service.mapToUnitState(serializedWithModel, true);
      expect(stateWithModel.model).toBe('AS7-D');
      expect(stateWithModel.name).toBe('Atlas AS7-D');

      const serializedWithVariant = createMockSerializedUnit({
        variant: 'AS7-K',
      });
      const stateWithVariant = service.mapToUnitState(serializedWithVariant, true);
      expect(stateWithVariant.model).toBe('AS7-K');
    });

    it('should set tech base mode based on tech base', () => {
      const serializedIS = createMockSerializedUnit({
        techBase: 'Inner Sphere',
      });
      const stateIS = service.mapToUnitState(serializedIS, true);
      expect(stateIS.techBaseMode).toBe('inner_sphere');

      const serializedClan = createMockSerializedUnit({
        techBase: 'Clan',
      });
      const stateClan = service.mapToUnitState(serializedClan, true);
      expect(stateClan.techBaseMode).toBe('clan');
    });

    it('should use defaults for missing optional fields', () => {
      const minimalUnit = createMockSerializedUnit({
        engine: undefined,
        gyro: undefined,
        cockpit: undefined,
        structure: undefined,
        heatSinks: undefined,
        armor: undefined,
        equipment: undefined,
        rulesLevel: undefined,
        year: undefined,
      });
      const state = service.mapToUnitState(minimalUnit, true);

      expect(state.engineType).toBe(EngineType.STANDARD);
      expect(state.gyroType).toBe(GyroType.STANDARD);
      expect(state.cockpitType).toBe(CockpitType.STANDARD);
      expect(state.internalStructureType).toBe(InternalStructureType.STANDARD);
      expect(state.heatSinkType).toBe(HeatSinkType.SINGLE);
      expect(state.armorType).toBe(ArmorTypeEnum.STANDARD);
      expect(state.rulesLevel).toBe(RulesLevel.STANDARD);
      expect(state.year).toBe(3025);
      expect(state.equipment).toEqual([]);
    });

    it('should set isModified to false for loaded units', () => {
      const serialized = createMockSerializedUnit();
      const state = service.mapToUnitState(serialized, true);

      expect(state.isModified).toBe(false);
    });

    it('should set timestamps for loaded units', () => {
      const serialized = createMockSerializedUnit();
      const beforeTime = Date.now();
      const state = service.mapToUnitState(serialized, true);
      const afterTime = Date.now();

      expect(state.createdAt).toBeGreaterThanOrEqual(beforeTime);
      expect(state.createdAt).toBeLessThanOrEqual(afterTime);
      expect(state.lastModifiedAt).toBeGreaterThanOrEqual(beforeTime);
      expect(state.lastModifiedAt).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Legacy Equipment ID Resolution', () => {
    const createMockSerializedUnit = (overrides?: Partial<ISerializedUnit>): ISerializedUnit => ({
      id: 'test-unit',
      chassis: 'Marauder',
      model: 'C',
      tonnage: 75,
      techBase: 'Inner Sphere',
      ...overrides,
    });

    it('should resolve ultra-ac-5 to uac-5 through normalization', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'uac-5') {
          return {
            id: 'uac-5',
            name: 'Ultra AC/5',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 9,
            criticalSlots: 5,
            heat: 1,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 112,
            introductionYear: 2640,
          };
        }
        if (id === 'clan-uac-5') {
          return {
            id: 'clan-uac-5',
            name: 'Ultra AC/5 (Clan)',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 7,
            criticalSlots: 3,
            heat: 1,
            techBase: TechBase.CLAN,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 122,
            introductionYear: 2825,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        equipment: [
          { id: 'ultra-ac-5', location: 'Right Arm' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('uac-5');
      expect(state.equipment[0].name).toBe('Ultra AC/5');
      expect(state.equipment[0].category).toBe(EquipmentCategory.BALLISTIC_WEAPON);
      expect(state.equipment[0].weight).toBe(9);
      expect(state.equipment[0].criticalSlots).toBe(5);
    });

    it('should prefer clan variant for Clan tech base units when both variants exist', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'uac-5') {
          return {
            id: 'uac-5',
            name: 'Ultra AC/5',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 9,
            criticalSlots: 5,
            heat: 1,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 112,
            introductionYear: 2640,
          };
        }
        if (id === 'clan-uac-5') {
          return {
            id: 'clan-uac-5',
            name: 'Ultra AC/5 (Clan)',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 7,
            criticalSlots: 3,
            heat: 1,
            techBase: TechBase.CLAN,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 122,
            introductionYear: 2825,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'Clan',
        equipment: [
          { id: 'ultra-ac-5', location: 'Right Torso' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('clan-uac-5');
      expect(state.equipment[0].weight).toBe(7);
      expect(state.equipment[0].criticalSlots).toBe(3);
    });

    it('should use criticalSlots hint to select clan UAC/5 in MIXED units (Marauder C case)', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'uac-5') {
          return {
            id: 'uac-5',
            name: 'Ultra AC/5',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 9,
            criticalSlots: 5,
            heat: 1,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 112,
            introductionYear: 2640,
          };
        }
        if (id === 'clan-uac-5') {
          return {
            id: 'clan-uac-5',
            name: 'Ultra AC/5 (Clan)',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 7,
            criticalSlots: 3,
            heat: 1,
            techBase: TechBase.CLAN,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 122,
            introductionYear: 2825,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'MIXED',
        equipment: [
          { id: 'ultra-ac-5', location: 'Right Torso' },
        ],
        criticalSlots: {
          RIGHT_TORSO: ['CLUltraAC5'],
        },
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('clan-uac-5');
      expect(state.equipment[0].weight).toBe(7);
      expect(state.equipment[0].criticalSlots).toBe(3);
    });

    it('should use criticalSlots hint to select clan Large Pulse Laser in MIXED units', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'large-pulse-laser') {
          return {
            id: 'large-pulse-laser',
            name: 'Large Pulse Laser',
            category: EquipmentCategory.ENERGY_WEAPON,
            weight: 7,
            criticalSlots: 2,
            heat: 10,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 175000,
            battleValue: 240,
            introductionYear: 2609,
          };
        }
        if (id === 'clan-large-pulse-laser') {
          return {
            id: 'clan-large-pulse-laser',
            name: 'Large Pulse Laser (Clan)',
            category: EquipmentCategory.ENERGY_WEAPON,
            weight: 6,
            criticalSlots: 2,
            heat: 10,
            techBase: TechBase.CLAN,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 175000,
            battleValue: 265,
            introductionYear: 2829,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'MIXED',
        equipment: [
          { id: 'large-pulse-laser', location: 'Left Arm' },
        ],
        criticalSlots: {
          LEFT_ARM: ['CLLargePulseLaser'],
        },
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('clan-large-pulse-laser');
      expect(state.equipment[0].weight).toBe(6);
    });

    it('should resolve clan-ultra-ac-5 to clan-uac-5 through normalization', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'clan-uac-5') {
          return {
            id: 'clan-uac-5',
            name: 'Ultra AC/5 (Clan)',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 7,
            criticalSlots: 3,
            heat: 1,
            techBase: TechBase.CLAN,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 122,
            introductionYear: 2825,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        equipment: [
          { id: 'clan-ultra-ac-5', location: 'Right Torso' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('clan-uac-5');
      expect(state.equipment[0].name).toBe('Ultra AC/5 (Clan)');
      expect(state.equipment[0].category).toBe(EquipmentCategory.BALLISTIC_WEAPON);
      expect(state.equipment[0].weight).toBe(7);
      expect(state.equipment[0].criticalSlots).toBe(3);
    });

    it('should resolve rotary-ac-5 to rac-5 through normalization', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'rac-5') {
          return {
            id: 'rac-5',
            name: 'Rotary AC/5',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 10,
            criticalSlots: 6,
            heat: 1,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 275000,
            battleValue: 247,
            introductionYear: 3062,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'Inner Sphere',
        equipment: [
          { id: 'rotary-ac-5', location: 'Left Arm' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('rac-5');
      expect(state.equipment[0].name).toBe('Rotary AC/5');
      expect(state.equipment[0].category).toBe(EquipmentCategory.BALLISTIC_WEAPON);
    });

    it('should resolve light-ac-5 to lac-5 through normalization', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'lac-5') {
          return {
            id: 'lac-5',
            name: 'Light AC/5',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 5,
            criticalSlots: 2,
            heat: 1,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 150000,
            battleValue: 62,
            introductionYear: 3068,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'Inner Sphere',
        equipment: [
          { id: 'light-ac-5', location: 'Right Arm' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('lac-5');
      expect(state.equipment[0].name).toBe('Light AC/5');
    });

    it('should add clan prefix for Clan tech base units when not found', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'clan-uac-5') {
          return {
            id: 'clan-uac-5',
            name: 'Ultra AC/5 (Clan)',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 7,
            criticalSlots: 3,
            heat: 1,
            techBase: TechBase.CLAN,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 200000,
            battleValue: 122,
            introductionYear: 2825,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'Clan',
        equipment: [
          { id: 'ultra-ac-5', location: 'Right Torso' },  // No clan prefix, but unit is Clan
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      // Should resolve to clan-uac-5 via clan prefix strategy
      expect(state.equipment[0].equipmentId).toBe('clan-uac-5');
    });

    it('should fallback to placeholder for truly unknown equipment', () => {
      mockEquipmentLookupService.getById.mockReturnValue(undefined);
      mockRegistry.isReady.mockReturnValue(true);
      mockRegistry.lookup.mockReturnValue({ found: false, equipment: null, category: null });

      const serialized = createMockSerializedUnit({
        equipment: [
          { id: 'unknown-super-weapon-999', location: 'Center Torso' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('unknown-super-weapon-999');
      expect(state.equipment[0].name).toBe('unknown-super-weapon-999');
      expect(state.equipment[0].category).toBe(EquipmentCategory.MISC_EQUIPMENT);
      expect(state.equipment[0].weight).toBe(0);
      expect(state.equipment[0].criticalSlots).toBe(1);
    });

    it('should resolve lb-10-x-ac to lb-10x-ac through normalization', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'lb-10x-ac') {
          return {
            id: 'lb-10x-ac',
            name: 'LB 10-X AC',
            category: EquipmentCategory.BALLISTIC_WEAPON,
            weight: 11,
            criticalSlots: 6,
            heat: 2,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 400000,
            battleValue: 148,
            introductionYear: 2595,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'Inner Sphere',
        equipment: [
          { id: 'lb-10-x-ac', location: 'Right Arm' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('lb-10x-ac');
      expect(state.equipment[0].name).toBe('LB 10-X AC');
    });

    it('should resolve ultra-ac-5-ammo to uac-5-ammo through normalization', () => {
      mockEquipmentLookupService.getById.mockImplementation((id: string) => {
        if (id === 'uac-5-ammo') {
          return {
            id: 'uac-5-ammo',
            name: 'Ultra AC/5 Ammo',
            category: EquipmentCategory.AMMUNITION,
            weight: 1,
            criticalSlots: 1,
            techBase: TechBase.INNER_SPHERE,
            rulesLevel: RulesLevel.STANDARD,
            costCBills: 20000,
            battleValue: 0,
            introductionYear: 2640,
          };
        }
        return undefined;
      });

      const serialized = createMockSerializedUnit({
        techBase: 'Inner Sphere',
        equipment: [
          { id: 'ultra-ac-5-ammo', location: 'Right Torso' },
        ],
      });
      const state = service.mapToUnitState(serialized, true);

      expect(state.equipment).toHaveLength(1);
      expect(state.equipment[0].equipmentId).toBe('uac-5-ammo');
      expect(state.equipment[0].name).toBe('Ultra AC/5 Ammo');
      expect(state.equipment[0].category).toBe(EquipmentCategory.AMMUNITION);
    });
  });
});

