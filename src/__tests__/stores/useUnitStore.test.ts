/**
 * Unit Store Tests
 * 
 * Tests for the isolated unit store factory and state management.
 * 
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import { createUnitStore, createNewUnitStore } from '@/stores/useUnitStore';
import { 
  createDefaultUnitState,
  generateUnitId,
  CreateUnitOptions,
} from '@/stores/unitState';
import { TechBase } from '@/types/enums/TechBase';
import { TechBaseMode, TechBaseComponent } from '@/types/construction/TechBaseConfiguration';
import { MechConfiguration, LAMMode, QuadVeeMode } from '@/types/construction/MechConfigurationSystem';
import { EngineType } from '@/types/construction/EngineType';
import { GyroType } from '@/types/construction/GyroType';
import { InternalStructureType } from '@/types/construction/InternalStructureType';
import { CockpitType } from '@/types/construction/CockpitType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { 
  setupMockLocalStorage, 
  createTestStore,
  createISTestStore,
  createClanTestStore,
  expectAllComponentTechBases,
  expectTechBaseMode,
} from '../helpers/storeTestHelpers';

describe('Unit Store', () => {
  let mockStorage: ReturnType<typeof setupMockLocalStorage>;
  
  beforeEach(() => {
    mockStorage = setupMockLocalStorage();
  });
  
  afterEach(() => {
    mockStorage.cleanup();
  });
  
  // ===========================================================================
  // generateUnitId Tests
  // ===========================================================================
  describe('generateUnitId()', () => {
    it('should generate unique IDs', () => {
      const id1 = generateUnitId();
      const id2 = generateUnitId();
      
      expect(id1).not.toBe(id2);
    });
    
    it('should generate IDs with expected UUID format', () => {
      const id = generateUnitId();
      
      // UUIDs are 36 characters: 8-4-4-4-12 format
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
  
  // ===========================================================================
  // createDefaultUnitState Tests
  // ===========================================================================
  describe('createDefaultUnitState()', () => {
    it('should create state with provided options', () => {
      const options: CreateUnitOptions = {
        name: 'Test Mech',
        tonnage: 75,
        techBase: TechBase.INNER_SPHERE,
        walkMP: 4,
      };
      
      const state = createDefaultUnitState(options);
      
      expect(state.name).toBe('Test Mech');
      expect(state.tonnage).toBe(75);
      expect(state.techBase).toBe(TechBase.INNER_SPHERE);
      expect(state.engineRating).toBe(300); // 75 * 4
    });
    
    it('should use provided ID if given', () => {
      const options: CreateUnitOptions = {
        id: 'custom-id-123',
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      };
      
      const state = createDefaultUnitState(options);
      
      expect(state.id).toBe('custom-id-123');
    });
    
    it('should generate ID if not provided', () => {
      const options: CreateUnitOptions = {
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      };
      
      const state = createDefaultUnitState(options);
      
      // UUIDs are 36 characters: 8-4-4-4-12 format (UUID v4)
      expect(state.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
    
    it('should set techBaseMode to inner_sphere for IS units', () => {
      const options: CreateUnitOptions = {
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      };
      
      const state = createDefaultUnitState(options);
      
      expect(state.techBaseMode).toBe(TechBaseMode.INNER_SPHERE);
    });
    
    it('should set techBaseMode to clan for Clan units', () => {
      const options: CreateUnitOptions = {
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.CLAN,
      };
      
      const state = createDefaultUnitState(options);
      
      expect(state.techBaseMode).toBe(TechBaseMode.CLAN);
    });
    
    it('should initialize componentTechBases matching unit tech base', () => {
      const isState = createDefaultUnitState({
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      
      const clanState = createDefaultUnitState({
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.CLAN,
      });
      
      expectAllComponentTechBases(isState.componentTechBases, TechBase.INNER_SPHERE);
      expectAllComponentTechBases(clanState.componentTechBases, TechBase.CLAN);
    });
    
    it('should use default walkMP of 4 if not provided', () => {
      const state = createDefaultUnitState({
        name: 'Test',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      });
      
      expect(state.engineRating).toBe(400); // 100 * 4
    });
    
    it('should set default component types', () => {
      const state = createDefaultUnitState({
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      
      expect(state.engineType).toBe(EngineType.STANDARD);
      expect(state.gyroType).toBe(GyroType.STANDARD);
      expect(state.internalStructureType).toBe(InternalStructureType.STANDARD);
      expect(state.cockpitType).toBe(CockpitType.STANDARD);
      expect(state.heatSinkType).toBe(HeatSinkType.SINGLE);
      expect(state.heatSinkCount).toBe(10);
      expect(state.armorType).toBe(ArmorTypeEnum.STANDARD);
    });
    
    it('should set isModified to true for new units', () => {
      const state = createDefaultUnitState({
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      
      expect(state.isModified).toBe(true);
    });
    
    it('should set creation timestamps', () => {
      const before = Date.now();
      const state = createDefaultUnitState({
        name: 'Test',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      const after = Date.now();
      
      expect(state.createdAt).toBeGreaterThanOrEqual(before);
      expect(state.createdAt).toBeLessThanOrEqual(after);
      expect(state.lastModifiedAt).toBe(state.createdAt);
    });
  });
  
  // ===========================================================================
  // createUnitStore Tests
  // ===========================================================================
  describe('createUnitStore()', () => {
    it('should create store with provided initial state', () => {
      const initialState = createDefaultUnitState({
        name: 'Test Mech',
        tonnage: 75,
        techBase: TechBase.CLAN,
      });
      
      const store = createUnitStore(initialState);
      const state = store.getState();
      
      expect(state.name).toBe('Test Mech');
      expect(state.tonnage).toBe(75);
      expect(state.techBase).toBe(TechBase.CLAN);
    });
    
    it('should include all action methods', () => {
      const store = createTestStore();
      const state = store.getState();
      
      expect(typeof state.setName).toBe('function');
      expect(typeof state.setTechBaseMode).toBe('function');
      expect(typeof state.setComponentTechBase).toBe('function');
      expect(typeof state.setAllComponentTechBases).toBe('function');
      expect(typeof state.setEngineType).toBe('function');
      expect(typeof state.setEngineRating).toBe('function');
      expect(typeof state.setGyroType).toBe('function');
      expect(typeof state.setInternalStructureType).toBe('function');
      expect(typeof state.setCockpitType).toBe('function');
      expect(typeof state.setHeatSinkType).toBe('function');
      expect(typeof state.setHeatSinkCount).toBe('function');
      expect(typeof state.setArmorType).toBe('function');
      expect(typeof state.markModified).toBe('function');
    });
  });
  
  // ===========================================================================
  // createNewUnitStore Tests
  // ===========================================================================
  describe('createNewUnitStore()', () => {
    it('should create store from options', () => {
      const store = createNewUnitStore({
        name: 'New Unit',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      });
      
      const state = store.getState();
      
      expect(state.name).toBe('New Unit');
      expect(state.tonnage).toBe(50);
      // UUIDs are 36 characters: 8-4-4-4-12 format (UUID v4)
      expect(state.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });
  });
  
  // ===========================================================================
  // Name Actions Tests
  // ===========================================================================
  describe('setName()', () => {
    it('should update name', () => {
      const store = createTestStore({ name: 'Original' });
      
      store.getState().setName('Updated');
      
      expect(store.getState().name).toBe('Updated');
    });
    
    it('should mark as modified', () => {
      const store = createTestStore();
      store.getState().markModified(false);
      
      store.getState().setName('New Name');
      
      expect(store.getState().isModified).toBe(true);
    });
    
    it('should update lastModifiedAt', () => {
      const store = createTestStore();
      
      // Wait a bit to ensure time difference
      const later = Date.now() + 1;
      jest.spyOn(Date, 'now').mockReturnValue(later);
      
      store.getState().setName('New Name');
      
      expect(store.getState().lastModifiedAt).toBe(later);
      
      jest.restoreAllMocks();
    });
  });
  
  // ===========================================================================
  // Tech Base Mode Actions Tests
  // ===========================================================================
  describe('setTechBaseMode()', () => {
    it('should update tech base mode', () => {
      const store = createISTestStore();
      
      store.getState().setTechBaseMode(TechBaseMode.CLAN);
      
      expectTechBaseMode(store, TechBaseMode.CLAN);
    });
    
    it('should reset componentTechBases to Clan when switching to clan mode', () => {
      const store = createISTestStore();
      
      store.getState().setTechBaseMode(TechBaseMode.CLAN);
      
      expectAllComponentTechBases(store.getState().componentTechBases, TechBase.CLAN);
    });
    
    it('should reset componentTechBases to IS when switching to inner_sphere mode', () => {
      const store = createClanTestStore();
      
      store.getState().setTechBaseMode(TechBaseMode.INNER_SPHERE);
      
      expectAllComponentTechBases(store.getState().componentTechBases, TechBase.INNER_SPHERE);
    });
    
    it('should preserve componentTechBases when switching to mixed mode', () => {
      const store = createISTestStore();
      
      // Set a specific component to Clan
      store.getState().setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
      
      // Switch to mixed mode
      store.getState().setTechBaseMode(TechBaseMode.MIXED);
      
      // Engine should still be Clan
      expect(store.getState().componentTechBases.engine).toBe(TechBase.CLAN);
      // Others should still be IS
      expect(store.getState().componentTechBases.chassis).toBe(TechBase.INNER_SPHERE);
    });
    
    it('should mark as modified when changing tech base mode', () => {
      const store = createTestStore();
      store.getState().markModified(false);
      
      store.getState().setTechBaseMode(TechBaseMode.CLAN);
      
      expect(store.getState().isModified).toBe(true);
    });
  });
  
  // ===========================================================================
  // Component Tech Base Actions Tests
  // ===========================================================================
  describe('setComponentTechBase()', () => {
    it('should update individual component tech base', () => {
      const store = createISTestStore();
      
      store.getState().setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
      
      expect(store.getState().componentTechBases.engine).toBe(TechBase.CLAN);
      // Other components remain unchanged
      expect(store.getState().componentTechBases.chassis).toBe(TechBase.INNER_SPHERE);
    });
    
    it('should mark as modified', () => {
      const store = createTestStore();
      store.getState().markModified(false);
      
      store.getState().setComponentTechBase(TechBaseComponent.ARMOR, TechBase.CLAN);
      
      expect(store.getState().isModified).toBe(true);
    });
  });
  
  describe('setAllComponentTechBases()', () => {
    it('should replace all component tech bases', () => {
      const store = createISTestStore();
      
      const newTechBases = {
        chassis: TechBase.CLAN,
        gyro: TechBase.CLAN,
        engine: TechBase.CLAN,
        heatsink: TechBase.INNER_SPHERE,
        targeting: TechBase.INNER_SPHERE,
        myomer: TechBase.INNER_SPHERE,
        movement: TechBase.CLAN,
        armor: TechBase.CLAN,
      };
      
      store.getState().setAllComponentTechBases(newTechBases);
      
      expect(store.getState().componentTechBases).toEqual(newTechBases);
    });
  });
  
  // ===========================================================================
  // Engine Actions Tests
  // ===========================================================================
  describe('setEngineType()', () => {
    it('should update engine type', () => {
      const store = createISTestStore();
      
      store.getState().setEngineType(EngineType.XL_IS);
      
      expect(store.getState().engineType).toBe(EngineType.XL_IS);
    });
    
    it('should mark as modified', () => {
      const store = createTestStore();
      store.getState().markModified(false);
      
      store.getState().setEngineType(EngineType.LIGHT);
      
      expect(store.getState().isModified).toBe(true);
    });
  });
  
  describe('setEngineRating()', () => {
    it('should update engine rating', () => {
      const store = createTestStore({ tonnage: 50 });
      
      store.getState().setEngineRating(250);
      
      expect(store.getState().engineRating).toBe(250);
    });
  });
  
  // ===========================================================================
  // Gyro Actions Tests
  // ===========================================================================
  describe('setGyroType()', () => {
    it('should update gyro type', () => {
      const store = createTestStore();
      
      store.getState().setGyroType(GyroType.XL);
      
      expect(store.getState().gyroType).toBe(GyroType.XL);
    });
  });
  
  // ===========================================================================
  // Internal Structure Actions Tests
  // ===========================================================================
  describe('setInternalStructureType()', () => {
    it('should update internal structure type', () => {
      const store = createISTestStore();
      
      store.getState().setInternalStructureType(InternalStructureType.ENDO_STEEL_IS);
      
      expect(store.getState().internalStructureType).toBe(InternalStructureType.ENDO_STEEL_IS);
    });
  });
  
  // ===========================================================================
  // Cockpit Actions Tests
  // ===========================================================================
  describe('setCockpitType()', () => {
    it('should update cockpit type', () => {
      const store = createTestStore();
      
      store.getState().setCockpitType(CockpitType.SMALL);
      
      expect(store.getState().cockpitType).toBe(CockpitType.SMALL);
    });
  });
  
  // ===========================================================================
  // Heat Sink Actions Tests
  // ===========================================================================
  describe('setHeatSinkType()', () => {
    it('should update heat sink type', () => {
      const store = createISTestStore();
      
      store.getState().setHeatSinkType(HeatSinkType.DOUBLE_IS);
      
      expect(store.getState().heatSinkType).toBe(HeatSinkType.DOUBLE_IS);
    });
  });
  
  describe('setHeatSinkCount()', () => {
    it('should update heat sink count', () => {
      const store = createTestStore();
      
      store.getState().setHeatSinkCount(15);
      
      expect(store.getState().heatSinkCount).toBe(15);
    });
  });
  
  // ===========================================================================
  // Armor Actions Tests
  // ===========================================================================
  describe('setArmorType()', () => {
    it('should update armor type', () => {
      const store = createISTestStore();
      
      store.getState().setArmorType(ArmorTypeEnum.FERRO_FIBROUS_IS);
      
      expect(store.getState().armorType).toBe(ArmorTypeEnum.FERRO_FIBROUS_IS);
    });
  });
  
  // ===========================================================================
  // Metadata Actions Tests
  // ===========================================================================
  describe('markModified()', () => {
    it('should set isModified to true by default', () => {
      const store = createTestStore();
      store.setState({ isModified: false });
      
      store.getState().markModified();
      
      expect(store.getState().isModified).toBe(true);
    });
    
    it('should set isModified to false when passed false', () => {
      const store = createTestStore();
      
      store.getState().markModified(false);
      
      expect(store.getState().isModified).toBe(false);
    });
    
    it('should update lastModifiedAt', () => {
      const store = createTestStore();
      
      const later = Date.now() + 1000;
      jest.spyOn(Date, 'now').mockReturnValue(later);
      
      store.getState().markModified();
      
      expect(store.getState().lastModifiedAt).toBe(later);
      
      jest.restoreAllMocks();
    });
  });
  
  // ===========================================================================
  // Tech Base Switching Scenarios
  // ===========================================================================
  describe('Tech Base Switching Scenarios', () => {
    it('should handle IS to Clan switch correctly', () => {
      const store = createISTestStore();
      
      // Verify initial IS state
      expectTechBaseMode(store, TechBaseMode.INNER_SPHERE);
      expectAllComponentTechBases(store.getState().componentTechBases, TechBase.INNER_SPHERE);
      
      // Switch to Clan
      store.getState().setTechBaseMode(TechBaseMode.CLAN);
      
      // Verify Clan state
      expectTechBaseMode(store, TechBaseMode.CLAN);
      expectAllComponentTechBases(store.getState().componentTechBases, TechBase.CLAN);
    });
    
    it('should handle Clan to IS switch correctly', () => {
      const store = createClanTestStore();
      
      // Verify initial Clan state
      expectTechBaseMode(store, TechBaseMode.CLAN);
      expectAllComponentTechBases(store.getState().componentTechBases, TechBase.CLAN);
      
      // Switch to IS
      store.getState().setTechBaseMode(TechBaseMode.INNER_SPHERE);
      
      // Verify IS state
      expectTechBaseMode(store, TechBaseMode.INNER_SPHERE);
      expectAllComponentTechBases(store.getState().componentTechBases, TechBase.INNER_SPHERE);
    });
    
    it('should handle IS to mixed mode correctly', () => {
      const store = createISTestStore();
      
      // Set specific components before switching to mixed
      store.getState().setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
      store.getState().setComponentTechBase(TechBaseComponent.HEATSINK, TechBase.CLAN);
      
      // Switch to mixed
      store.getState().setTechBaseMode(TechBaseMode.MIXED);
      
      // Verify preserved settings
      expect(store.getState().componentTechBases.engine).toBe(TechBase.CLAN);
      expect(store.getState().componentTechBases.heatsink).toBe(TechBase.CLAN);
      expect(store.getState().componentTechBases.chassis).toBe(TechBase.INNER_SPHERE);
    });
    
    it('should reset mixed settings when switching back to non-mixed', () => {
      const store = createISTestStore();

      // Switch to mixed and set varied tech bases
      store.getState().setTechBaseMode(TechBaseMode.MIXED);
      store.getState().setComponentTechBase(TechBaseComponent.ENGINE, TechBase.CLAN);
      store.getState().setComponentTechBase(TechBaseComponent.ARMOR, TechBase.CLAN);

      // Switch to Clan (non-mixed)
      store.getState().setTechBaseMode(TechBaseMode.CLAN);

      // All should be Clan now
      expectAllComponentTechBases(store.getState().componentTechBases, TechBase.CLAN);
    });
  });

  // ===========================================================================
  // LAM Mode Actions Tests
  // ===========================================================================
  describe('setLAMMode()', () => {
    it('should update LAM mode when configuration is LAM', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.LAM });

      store.getState().setLAMMode(LAMMode.AIRMECH);

      expect(store.getState().lamMode).toBe(LAMMode.AIRMECH);
    });

    it('should set LAM mode to FIGHTER', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.LAM });

      store.getState().setLAMMode(LAMMode.FIGHTER);

      expect(store.getState().lamMode).toBe(LAMMode.FIGHTER);
    });

    it('should not update LAM mode when configuration is not LAM', () => {
      const store = createTestStore();
      // Default configuration is BIPED

      store.getState().setLAMMode(LAMMode.AIRMECH);

      // Should remain at default MECH mode
      expect(store.getState().lamMode).toBe(LAMMode.MECH);
    });

    it('should not update LAM mode for QUAD configuration', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.QUAD });

      store.getState().setLAMMode(LAMMode.FIGHTER);

      expect(store.getState().lamMode).toBe(LAMMode.MECH);
    });

    it('should mark as modified when changing LAM mode', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.LAM });
      store.getState().markModified(false);

      store.getState().setLAMMode(LAMMode.AIRMECH);

      expect(store.getState().isModified).toBe(true);
    });

    it('should update lastModifiedAt when changing LAM mode', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.LAM });

      const later = Date.now() + 1000;
      jest.spyOn(Date, 'now').mockReturnValue(later);

      store.getState().setLAMMode(LAMMode.FIGHTER);

      expect(store.getState().lastModifiedAt).toBe(later);

      jest.restoreAllMocks();
    });
  });

  // ===========================================================================
  // QuadVee Mode Actions Tests
  // ===========================================================================
  describe('setQuadVeeMode()', () => {
    it('should update QuadVee mode when configuration is QuadVee', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.QUADVEE });

      store.getState().setQuadVeeMode(QuadVeeMode.VEHICLE);

      expect(store.getState().quadVeeMode).toBe(QuadVeeMode.VEHICLE);
    });

    it('should not update QuadVee mode when configuration is not QuadVee', () => {
      const store = createTestStore();
      // Default configuration is BIPED

      store.getState().setQuadVeeMode(QuadVeeMode.VEHICLE);

      // Should remain at default MECH mode
      expect(store.getState().quadVeeMode).toBe(QuadVeeMode.MECH);
    });

    it('should not update QuadVee mode for QUAD configuration', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.QUAD });

      store.getState().setQuadVeeMode(QuadVeeMode.VEHICLE);

      expect(store.getState().quadVeeMode).toBe(QuadVeeMode.MECH);
    });

    it('should not update QuadVee mode for LAM configuration', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.LAM });

      store.getState().setQuadVeeMode(QuadVeeMode.VEHICLE);

      expect(store.getState().quadVeeMode).toBe(QuadVeeMode.MECH);
    });

    it('should mark as modified when changing QuadVee mode', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.QUADVEE });
      store.getState().markModified(false);

      store.getState().setQuadVeeMode(QuadVeeMode.VEHICLE);

      expect(store.getState().isModified).toBe(true);
    });

    it('should update lastModifiedAt when changing QuadVee mode', () => {
      const store = createTestStore();
      store.setState({ configuration: MechConfiguration.QUADVEE });

      const later = Date.now() + 1000;
      jest.spyOn(Date, 'now').mockReturnValue(later);

      store.getState().setQuadVeeMode(QuadVeeMode.VEHICLE);

      expect(store.getState().lastModifiedAt).toBe(later);

      jest.restoreAllMocks();
    });
  });

  // ===========================================================================
  // Mode Switching Default State Tests
  // ===========================================================================
  describe('Mode Switching Default State', () => {
    it('should default LAM mode to MECH', () => {
      const state = createDefaultUnitState({
        name: 'Test LAM',
        tonnage: 55,
        techBase: TechBase.INNER_SPHERE,
      });

      expect(state.lamMode).toBe(LAMMode.MECH);
    });

    it('should default QuadVee mode to MECH', () => {
      const state = createDefaultUnitState({
        name: 'Test QuadVee',
        tonnage: 60,
        techBase: TechBase.CLAN,
      });

      expect(state.quadVeeMode).toBe(QuadVeeMode.MECH);
    });
  });
});

