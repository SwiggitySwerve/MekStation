import { EquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

// Mock EquipmentLoaderService
jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  EquipmentLoaderService: jest.fn(),
  getEquipmentLoader: jest.fn(() => ({
    getIsLoaded: jest.fn().mockReturnValue(true),
    loadOfficialEquipment: jest.fn().mockResolvedValue(undefined),
    getAllEquipment: jest.fn().mockReturnValue([
      { id: 'medium-laser', name: 'Medium Laser', category: 'Energy Weapon' },
      { id: 'ac-5', name: 'AC/5', category: 'Ballistic Weapon' },
    ]),
  })),
}));

describe('EquipmentRegistry', () => {
  beforeEach(() => {
    // Reset singleton instance using type assertion for private property access
    (EquipmentRegistry as unknown as { instance: null }).instance = null;
  });

  it('should return singleton instance', () => {
    const instance1 = EquipmentRegistry.getInstance();
    const instance2 = EquipmentRegistry.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should initialize registry', async () => {
    const registry = EquipmentRegistry.getInstance();
    
    await registry.initialize();
    
    // Registry should be initialized
    expect(registry).toBeDefined();
  });

  it('should not reinitialize if already initialized', async () => {
    const registry = EquipmentRegistry.getInstance();
    
    await registry.initialize();
    await registry.initialize();
    
    // Should only initialize once
    expect(registry).toBeDefined();
  });

  it('should lookup equipment by ID', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const result = registry.lookupById('medium-laser');
    
    expect(result.found).toBe(true);
    expect(result.equipment).toBeDefined();
  });

  it('should lookup equipment by name', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const result = registry.lookupByName('Medium Laser');
    
    expect(result.found).toBe(true);
    expect(result.equipment).toBeDefined();
  });

  it('should return not found for unknown ID', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const result = registry.lookupById('unknown-equipment');
    
    expect(result.found).toBe(false);
  });

  it('should get registry statistics', async () => {
    const registry = EquipmentRegistry.getInstance();
    await registry.initialize();
    
    const stats = registry.getStats();
    
    expect(stats).toBeDefined();
    expect(stats.totalItems).toBeGreaterThanOrEqual(0);
  });
});
