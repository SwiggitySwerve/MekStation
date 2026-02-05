import {
  getEquipmentNameMapper,
  resetEquipmentNameMapper,
} from '@/services/equipment/EquipmentNameMapper';

// Mock EquipmentRegistry - returns not found for everything (mapper uses static mappings first)
jest.mock('@/services/equipment/EquipmentRegistry', () => {
  const mockLookup = jest.fn().mockImplementation(() => ({
    found: false,
    equipment: null,
    alternateIds: [],
  }));

  return {
    EquipmentRegistry: {
      getInstance: jest.fn(() => ({
        lookup: mockLookup,
      })),
    },
    getEquipmentRegistry: jest.fn(() => ({
      lookup: mockLookup,
    })),
  };
});

/**
 * Reset singleton instance for clean tests.
 */
function resetSingleton(): void {
  resetEquipmentNameMapper();
}

describe('EquipmentNameMapper', () => {
  beforeEach(() => {
    resetSingleton();
    jest.clearAllMocks();
  });

  it('should return singleton instance', () => {
    const instance1 = getEquipmentNameMapper();
    const instance2 = getEquipmentNameMapper();

    expect(instance1).toBe(instance2);
  });

  it('should map equipment name to ID using static mappings', () => {
    const mapper = getEquipmentNameMapper();

    // Medium Laser is in the static MTF_NAME_MAPPINGS
    const result = mapper.mapName('Medium Laser');

    expect(result.success).toBe(true);
    expect(result.equipmentId).toBe('medium-laser');
    expect(result.confidence).toBe('exact');
  });

  it('should map weapon names with different formats', () => {
    const mapper = getEquipmentNameMapper();

    // Test various naming patterns from MTF files
    expect(mapper.mapName('AC/5').equipmentId).toBe('ac-5');
    expect(mapper.mapName('Autocannon/5').equipmentId).toBe('ac-5');
    expect(mapper.mapName('LRM 10').equipmentId).toBe('lrm-10');
    expect(mapper.mapName('LRM-10').equipmentId).toBe('lrm-10');
    expect(mapper.mapName('PPC').equipmentId).toBe('ppc');
  });

  it('should map Clan weapons correctly', () => {
    const mapper = getEquipmentNameMapper();

    expect(mapper.mapName('Clan ER Medium Laser').equipmentId).toBe(
      'clan-er-medium-laser',
    );
    expect(mapper.mapName('Clan LRM 10').equipmentId).toBe('clan-lrm-10');
    expect(mapper.mapName('Clan Gauss Rifle').equipmentId).toBe(
      'clan-gauss-rifle',
    );
  });

  it('should map ammo correctly', () => {
    const mapper = getEquipmentNameMapper();

    expect(mapper.mapName('IS Ammo AC/5').equipmentId).toBe('ac-5-ammo');
    expect(mapper.mapName('IS Ammo LRM-10').equipmentId).toBe('lrm-10-ammo');
    expect(mapper.mapName('IS Gauss Ammo').equipmentId).toBe('gauss-ammo');
  });

  it('should map equipment correctly', () => {
    const mapper = getEquipmentNameMapper();

    expect(mapper.mapName('Heat Sink').equipmentId).toBe('single-heat-sink');
    expect(mapper.mapName('Double Heat Sink').equipmentId).toBe(
      'double-heat-sink',
    );
    expect(mapper.mapName('MASC').equipmentId).toBe('masc');
    expect(mapper.mapName('Guardian ECM').equipmentId).toBe('guardian-ecm');
  });

  it('should handle unknown equipment names', () => {
    const mapper = getEquipmentNameMapper();

    const result = mapper.mapName('Unknown Experimental Widget XYZ');

    expect(result.success).toBe(false);
    expect(result.confidence).toBe('unknown');
  });

  it('should track unknown names', () => {
    const mapper = getEquipmentNameMapper();

    mapper.mapName('Unknown Item 1');
    mapper.mapName('Unknown Item 2');

    const unknowns = mapper.getUnknownNames();

    expect(unknowns).toContain('Unknown Item 1');
    expect(unknowns).toContain('Unknown Item 2');
  });

  it('should clear unknown names', () => {
    const mapper = getEquipmentNameMapper();

    mapper.mapName('Unknown Item');
    expect(mapper.getUnknownNames().length).toBeGreaterThan(0);

    mapper.clearUnknownNames();
    expect(mapper.getUnknownNames().length).toBe(0);
  });

  it('should add custom mappings', () => {
    const mapper = getEquipmentNameMapper();

    mapper.addMapping('Custom Weapon', 'custom-weapon-id');
    const result = mapper.mapName('Custom Weapon');

    expect(result.success).toBe(true);
    expect(result.equipmentId).toBe('custom-weapon-id');
  });

  it('should get mapping statistics', () => {
    const mapper = getEquipmentNameMapper();

    const stats = mapper.getStats();

    expect(stats).toBeDefined();
    expect(stats.totalMappings).toBeGreaterThan(0);
    expect(stats.exactMatches).toBeGreaterThan(0);
  });

  it('should clean MTF names properly', () => {
    const mapper = getEquipmentNameMapper();

    // Names with (R) suffix should be cleaned
    const result1 = mapper.mapName('Medium Laser (R)');
    expect(result1.equipmentId).toBe('medium-laser');

    // Names with (Clan) suffix should be cleaned
    const result2 = mapper.mapName('ER Medium Laser (Clan)');
    // This should still map correctly after cleaning
    expect(result2.success).toBe(true);
  });

  it('should export unknown names as JSON', () => {
    const mapper = getEquipmentNameMapper();

    mapper.mapName('Unknown A');
    mapper.mapName('Unknown B');

    const json = mapper.exportUnknownNames();
    const parsed = JSON.parse(json) as Record<string, unknown>;

    expect(parsed).toHaveProperty('Unknown A');
    expect(parsed).toHaveProperty('Unknown B');
  });
});
