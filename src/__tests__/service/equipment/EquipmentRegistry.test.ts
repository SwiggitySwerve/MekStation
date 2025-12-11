import { EquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';

// Mock weapon data
const mockWeapons = [
  { 
    id: 'medium-laser', 
    name: 'Medium Laser', 
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
  },
  { 
    id: 'ac-5', 
    name: 'AC/5', 
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
  },
  { 
    id: 'clan-er-medium-laser', 
    name: 'ER Medium Laser (Clan)', 
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
  },
];

const mockAmmunition = [
  { 
    id: 'ac-5-ammo', 
    name: 'AC/5 Ammo', 
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
  },
];

const mockElectronics = [
  { 
    id: 'beagle-active-probe', 
    name: 'Beagle Active Probe', 
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
  },
];

const mockMiscEquipment = [
  { 
    id: 'double-heat-sink', 
    name: 'Double Heat Sink', 
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
  },
  { 
    id: 'jump-jet-medium', 
    name: 'Jump Jet', 
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
  },
];

// Mock EquipmentLoaderService
jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  EquipmentLoaderService: jest.fn(),
  getEquipmentLoader: jest.fn(() => ({
    getIsLoaded: jest.fn().mockReturnValue(true),
    loadOfficialEquipment: jest.fn().mockResolvedValue({ success: true }),
    getAllWeapons: jest.fn().mockReturnValue(mockWeapons),
    getAllAmmunition: jest.fn().mockReturnValue(mockAmmunition),
    getAllElectronics: jest.fn().mockReturnValue(mockElectronics),
    getAllMiscEquipment: jest.fn().mockReturnValue(mockMiscEquipment),
    getById: jest.fn((id: string) => {
      const all = [...mockWeapons, ...mockAmmunition, ...mockElectronics, ...mockMiscEquipment];
      return all.find(e => e.id === id) || null;
    }),
    getWeaponById: jest.fn((id: string) => mockWeapons.find(w => w.id === id) || null),
    getAmmunitionById: jest.fn((id: string) => mockAmmunition.find(a => a.id === id) || null),
    getElectronicsById: jest.fn((id: string) => mockElectronics.find(e => e.id === id) || null),
    getMiscEquipmentById: jest.fn((id: string) => mockMiscEquipment.find(e => e.id === id) || null),
  })),
}));

// Helper type for accessing private singleton instance
interface SingletonResettable {
  instance: null;
}

describe('EquipmentRegistry', () => {
  beforeEach(() => {
    // Reset singleton instance using type assertion for private property access
    // This is acceptable in tests to reset singleton state between test cases
    (EquipmentRegistry as typeof EquipmentRegistry & SingletonResettable).instance = null;
  });

  it('should return singleton instance', () => {
    const instance1 = EquipmentRegistry.getInstance();
    const instance2 = EquipmentRegistry.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should initialize registry', async () => {
    const registry = EquipmentRegistry.getInstance();
    
    await registry.initialize();
    
    expect(registry.isReady()).toBe(true);
  });

  it('should not reinitialize if already initialized', async () => {
    const registry = EquipmentRegistry.getInstance();
    
    await registry.initialize();
    const wasReady = registry.isReady();
    await registry.initialize();
    
    expect(wasReady).toBe(true);
    expect(registry.isReady()).toBe(true);
  });

  it('should lookup equipment by ID', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const result = registry.lookup('medium-laser');
    
    expect(result.found).toBe(true);
    expect(result.equipment).toBeDefined();
    expect(result.equipment?.id).toBe('medium-laser');
  });

  it('should lookup equipment by name', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const result = registry.lookup('Medium Laser');
    
    expect(result.found).toBe(true);
    expect(result.equipment).toBeDefined();
    expect(result.equipment?.name).toBe('Medium Laser');
  });

  it('should return not found for unknown ID', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const result = registry.lookup('unknown-equipment');
    
    expect(result.found).toBe(false);
    expect(result.equipment).toBeNull();
  });

  it('should get registry statistics', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const stats = registry.getStats();
    
    expect(stats).toBeDefined();
    expect(stats.totalItems).toBeGreaterThanOrEqual(0);
    expect(stats.weapons).toBe(3);
    expect(stats.ammunition).toBe(1);
    expect(stats.electronics).toBe(1);
    expect(stats.miscellaneous).toBe(2);
  });

  it('should get weapon by ID', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const weapon = registry.getWeapon('medium-laser');
    
    expect(weapon).toBeDefined();
    expect(weapon?.name).toBe('Medium Laser');
  });

  it('should get ammunition by ID', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const ammo = registry.getAmmunition('ac-5-ammo');
    
    expect(ammo).toBeDefined();
    expect(ammo?.name).toBe('AC/5 Ammo');
  });

  it('should resolve equipment name to ID', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const id = registry.resolveEquipmentName('Medium Laser');
    
    expect(id).toBe('medium-laser');
  });

  it('should return null for unresolvable name', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const id = registry.resolveEquipmentName('Unknown Weapon');
    
    expect(id).toBeNull();
  });

  it('should reset registry', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    expect(registry.isReady()).toBe(true);
    
    registry.reset();
    
    expect(registry.isReady()).toBe(false);
  });
});
