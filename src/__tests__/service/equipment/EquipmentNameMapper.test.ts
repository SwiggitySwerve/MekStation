import { EquipmentNameMapper } from '@/services/equipment/EquipmentNameMapper';
import { EquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

// Mock EquipmentRegistry
jest.mock('@/services/equipment/EquipmentRegistry', () => ({
  EquipmentRegistry: {
    getInstance: jest.fn(() => ({
      lookupByName: jest.fn().mockReturnValue({
        found: true,
        equipment: { id: 'medium-laser', name: 'Medium Laser' },
      }),
    })),
  },
  getEquipmentRegistry: jest.fn(() => ({
    lookupByName: jest.fn().mockReturnValue({
      found: true,
      equipment: { id: 'medium-laser', name: 'Medium Laser' },
    }),
  })),
}));

describe('EquipmentNameMapper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return singleton instance', () => {
    const instance1 = EquipmentNameMapper.getInstance();
    const instance2 = EquipmentNameMapper.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should map equipment name to ID', async () => {
    const mapper = EquipmentNameMapper.getInstance();
    
    const result = await mapper.mapName('Medium Laser');
    
    expect(result.success).toBe(true);
    expect(result.equipmentId).toBeDefined();
  });

  it('should handle unknown equipment names', async () => {
    const mapper = EquipmentNameMapper.getInstance();
    const mockRegistry = EquipmentRegistry.getInstance() as unknown as { lookupByName: jest.Mock };
    mockRegistry.lookupByName = jest.fn().mockReturnValue({
      found: false,
      equipment: null,
    });
    
    const result = await mapper.mapName('Unknown Equipment');
    
    expect(result.success).toBe(false);
  });

  it('should get mapping statistics', async () => {
    const mapper = EquipmentNameMapper.getInstance();
    
    const stats = mapper.getStats();
    
    expect(stats).toBeDefined();
    expect(stats.totalMappings).toBeGreaterThanOrEqual(0);
  });
});
