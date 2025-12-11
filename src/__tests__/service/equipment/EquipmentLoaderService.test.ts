import { EquipmentLoaderService, getEquipmentLoader, IEquipmentFilter } from '@/services/equipment/EquipmentLoaderService';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { IWeapon, WeaponCategory } from '@/types/equipment/weapons';
import { AmmoCategory, AmmoVariant, IAmmunition } from '@/types/equipment/AmmunitionTypes';
import { ElectronicsCategory, IElectronics } from '@/types/equipment/ElectronicsTypes';
import { IMiscEquipment, MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';

/**
 * Interface for accessing private maps on the service for testing.
 * This provides type-safe access to internal state for test setup.
 */
interface TestableServiceMaps {
  weapons: Map<string, Partial<IWeapon>>;
  ammunition: Map<string, Partial<IAmmunition>>;
  electronics: Map<string, Partial<IElectronics>>;
  miscEquipment: Map<string, Partial<IMiscEquipment>>;
  isLoaded: boolean;
}

/**
 * Helper to access private map properties for testing.
 * Returns a typed object for setting up test state.
 * 
 * Note: This uses a single type assertion which is acceptable for test setup
 * where we need to access private properties. The TestableServiceMaps interface
 * matches the internal structure of EquipmentLoaderService.
 */
function getServiceMaps(svc: EquipmentLoaderService): TestableServiceMaps {
  // Single assertion to TestableServiceMaps - the service has these properties internally
  return svc as TestableServiceMaps;
}

// Mock fetch globally
global.fetch = jest.fn();

describe('EquipmentLoaderService', () => {
  let service: EquipmentLoaderService;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Get fresh instance
    service = EquipmentLoaderService.getInstance();
    service.clear();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = EquipmentLoaderService.getInstance();
      const instance2 = EquipmentLoaderService.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should return same instance via convenience function', () => {
      const instance1 = getEquipmentLoader();
      const instance2 = EquipmentLoaderService.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Initial state', () => {
    it('should not be loaded initially', () => {
      expect(service.getIsLoaded()).toBe(false);
    });

    it('should have no load errors initially', () => {
      expect(service.getLoadErrors()).toEqual([]);
    });

    it('should return empty arrays when not loaded', () => {
      expect(service.getAllWeapons()).toEqual([]);
      expect(service.getAllAmmunition()).toEqual([]);
      expect(service.getAllElectronics()).toEqual([]);
      expect(service.getAllMiscEquipment()).toEqual([]);
    });

    it('should return zero total count when not loaded', () => {
      expect(service.getTotalCount()).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should clear all equipment', () => {
      // Manually add some items to test clear (accessing private properties for testing)
      const serviceInternal = getServiceMaps(service);
      serviceInternal.weapons.set('test-weapon', { id: 'test-weapon', name: 'Test' });
      serviceInternal.isLoaded = true;
      
      service.clear();
      
      expect(service.getIsLoaded()).toBe(false);
      expect(service.getAllWeapons()).toEqual([]);
      expect(service.getLoadErrors()).toEqual([]);
    });
  });

  describe('loadOfficialEquipment()', () => {
    const buildEquipmentFile = <T>(items: T[]) => ({
      $schema: 'test',
      version: '1.0',
      generatedAt: '2024-01-01',
      count: items.length,
      items,
    });

    it('should handle successful load', async () => {
      const mockWeaponData = {
        $schema: 'test',
        version: '1.0',
        generatedAt: '2024-01-01',
        count: 1,
        items: [{
          id: 'medium-laser',
          name: 'Medium Laser',
          category: 'Energy',
          subType: 'Laser',
          techBase: 'INNER_SPHERE',
          rulesLevel: 'STANDARD',
          damage: 5,
          heat: 3,
          ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
          weight: 1,
          criticalSlots: 1,
          costCBills: 40000,
          battleValue: 46,
          introductionYear: 2470,
        }],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockWeaponData,
        })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: false, status: 404 });

      const result = await service.loadOfficialEquipment();

      expect(result.success).toBe(true);
      expect(result.itemsLoaded).toBeGreaterThan(0);
      expect(service.getIsLoaded()).toBe(true);
    });

    it('should fully load all categories and set totals', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const energy = buildEquipmentFile([
        {
          id: 'energy-1',
          name: 'Energy 1',
          category: 'Energy',
          subType: 'Laser',
          techBase: 'INNER_SPHERE',
          rulesLevel: 'STANDARD',
          damage: 5,
          heat: 3,
          ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
          weight: 1,
          criticalSlots: 1,
          costCBills: 40000,
          battleValue: 46,
          introductionYear: 2470,
        },
      ]);
      const ballistic = buildEquipmentFile([
        {
          id: 'ballistic-1',
          name: 'Ballistic 1',
          category: 'Ballistic',
          subType: 'AC',
          techBase: 'INNER_SPHERE',
          rulesLevel: 'STANDARD',
          damage: 10,
          heat: 0,
          ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
          weight: 12,
          criticalSlots: 8,
          costCBills: 200000,
          battleValue: 120,
          introductionYear: 2460,
        },
      ]);
      const missile = buildEquipmentFile([
        {
          id: 'missile-1',
          name: 'Missile 1',
          category: 'Missile',
          subType: 'LRM',
          techBase: 'CLAN',
          rulesLevel: 'ADVANCED',
          damage: 4,
          heat: 2,
          ranges: { minimum: 0, short: 7, medium: 14, long: 21 },
          weight: 2,
          criticalSlots: 2,
          costCBills: 150000,
          battleValue: 80,
          introductionYear: 3049,
        },
      ]);
      const ammunition = buildEquipmentFile([
        {
          id: 'ammo-1',
          name: 'Ammo 1',
          category: 'Autocannon',
          variant: 'Standard',
          techBase: 'INNER_SPHERE',
          rulesLevel: 'STANDARD',
          compatibleWeaponIds: ['ballistic-1'],
          shotsPerTon: 10,
          weight: 1,
          criticalSlots: 1,
          costPerTon: 20000,
          battleValue: 5,
          isExplosive: true,
          introductionYear: 3025,
        },
      ]);
      const electronics = buildEquipmentFile([
        {
          id: 'electronics-1',
          name: 'Electronics 1',
          category: 'ECM',
          techBase: 'INNER_SPHERE',
          rulesLevel: 'STANDARD',
          weight: 1,
          criticalSlots: 1,
          costCBills: 75000,
          battleValue: 20,
          introductionYear: 3050,
        },
      ]);
      const misc = buildEquipmentFile([
        {
          id: 'misc-1',
          name: 'Misc 1',
          category: 'Defensive',
          techBase: 'INNER_SPHERE',
          rulesLevel: 'ADVANCED',
          weight: 0.5,
          criticalSlots: 1,
          costCBills: 50000,
          battleValue: 10,
          introductionYear: 3050,
        },
      ]);

      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => energy })
        .mockResolvedValueOnce({ ok: true, json: async () => ballistic })
        .mockResolvedValueOnce({ ok: true, json: async () => missile })
        .mockResolvedValueOnce({ ok: true, json: async () => ammunition })
        .mockResolvedValueOnce({ ok: true, json: async () => electronics })
        .mockResolvedValueOnce({ ok: true, json: async () => misc });

      const result = await service.loadOfficialEquipment('/data/equipment/official');

      expect(result.success).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(service.getTotalCount()).toBe(6);
      expect(service.getWeaponById('ballistic-1')?.category).toBe(WeaponCategory.BALLISTIC);
      expect(service.getAmmunitionById('ammo-1')?.category).toBe(AmmoCategory.AUTOCANNON);
      warnSpy.mockRestore();
    });

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.loadOfficialEquipment();

      // When all fetches fail, itemsLoaded is 0 but success might still be true
      // if the service treats missing files as optional
      expect(result.itemsLoaded).toBe(0);
      // Errors or warnings should be populated
      expect(result.errors.length + result.warnings.length).toBeGreaterThan(0);
    });

    it('should handle 404 errors as warnings', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await service.loadOfficialEquipment();

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('loadCustomEquipment()', () => {
    const buildFile = <T extends Record<string, unknown>>(schema: string, items: readonly T[]) => ({
      $schema: schema,
      version: '1.0',
      generatedAt: '2025-01-01',
      count: items.length,
      items,
    });

    it('should load custom weapons from URL source', async () => {
      const weaponFile = {
        $schema: 'schemas/weapon.json',
        version: '1.0',
        generatedAt: '2025-01-01',
        count: 1,
        items: [
          {
            id: 'custom-laser',
            name: 'Custom Laser',
            category: 'Energy',
            subType: 'Laser',
            techBase: 'INNER_SPHERE',
            rulesLevel: 'STANDARD',
            damage: 6,
            heat: 4,
            ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
            weight: 1,
            criticalSlots: 1,
            costCBills: 50000,
            battleValue: 60,
            introductionYear: 3050,
          },
        ],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => weaponFile,
      } as Response);

      const result = await service.loadCustomEquipment('https://example.com/custom-weapons.json');

      expect(result.success).toBe(true);
      expect(result.itemsLoaded).toBe(1);
      expect(service.getWeaponById('custom-laser')).not.toBeNull();
    });

    it('should load custom ammunition from object source', async () => {
      const ammoData = {
        $schema: 'schemas/ammunition.json',
        version: '1.0',
        generatedAt: '2025-01-02',
        count: 1,
        items: [
          {
            id: 'custom-ac10',
            name: 'Custom AC/10 Ammo',
            category: 'Autocannon',
            variant: 'Standard',
            techBase: 'INNER_SPHERE',
            rulesLevel: 'STANDARD',
            compatibleWeaponIds: ['ac10'],
            shotsPerTon: 10,
            weight: 1,
            criticalSlots: 1,
            costPerTon: 20000,
            battleValue: 5,
            isExplosive: true,
            introductionYear: 3025,
          },
        ],
      };

      const result = await service.loadCustomEquipment(ammoData);

      expect(result.success).toBe(true);
      expect(result.itemsLoaded).toBe(1);
      expect(service.getAmmunitionById('custom-ac10')).not.toBeNull();
    });

    it('should return warnings for unknown schemas', async () => {
      const unknownData = {
        $schema: 'schemas/unknown.json',
        version: '1.0',
        generatedAt: '2025-01-03',
        count: 1,
        items: [
          {
            id: 'mysterious',
            name: 'Mysterious Item',
            category: 'Unknown',
            techBase: 'CLAN',
            rulesLevel: 'ADVANCED',
            weight: 1,
            criticalSlots: 1,
            costCBills: 1000,
            battleValue: 1,
            introductionYear: 3070,
          },
        ],
      };

      const result = await service.loadCustomEquipment(unknownData);

      expect(result.success).toBe(true);
      expect(result.itemsLoaded).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should capture errors when fetch fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network down'));

      const result = await service.loadCustomEquipment('https://example.com/bad.json');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Failed to load custom equipment');
    });

    it('should load from File source and map categories/variants', async () => {
      const weaponFile = buildFile('schemas/weapon.json', [
        {
          id: 'physical-weapon',
          name: 'Hatchet',
          category: 'Physical',
          subType: 'Melee',
          techBase: 'INNER_SPHERE',
          rulesLevel: 'ADVANCED',
          damage: 0,
          heat: 0,
          ranges: { minimum: 0, short: 0, medium: 0, long: 0 },
          weight: 1,
          criticalSlots: 2,
          costCBills: 10000,
          battleValue: 5,
          introductionYear: 3025,
        },
        {
          id: 'unknown-weapon',
          name: 'Unknown Weapon',
          category: 'Unknown',
          subType: 'Other',
          techBase: 'MIXED',
          rulesLevel: 'UNOFFICIAL',
          damage: 1,
          heat: 1,
          ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
          weight: 0.5,
          criticalSlots: 1,
          costCBills: 5000,
          battleValue: 2,
          introductionYear: 3070,
        },
      ]);
      const ammoFile = buildFile('schemas/ammunition.json', [
        { id: 'gauss-ammo', name: 'Gauss Ammo', category: 'Gauss', variant: 'Precision', techBase: 'CLAN', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['gauss'], shotsPerTon: 8, weight: 1, criticalSlots: 1, costPerTon: 20000, battleValue: 5, isExplosive: true, introductionYear: 3055 },
        { id: 'unknown-ammo', name: 'Unknown Ammo', category: 'Unknown', variant: 'Unknown Variant', techBase: 'IS', rulesLevel: 'STANDARD', compatibleWeaponIds: ['unknown-weapon'], shotsPerTon: 5, weight: 1, criticalSlots: 1, costPerTon: 1000, battleValue: 1, isExplosive: false, introductionYear: 3025 },
      ]);
      const electronicsFile = buildFile('schemas/electronics.json', [
        { id: 'tag', name: 'TAG', category: 'TAG', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 1, criticalSlots: 1, costCBills: 100000, battleValue: 20, introductionYear: 3050, variableEquipmentId: 'tag-variable' },
        { id: 'unknown-electronics', name: 'Unknown Electronics', category: 'Unknown', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 0.5, criticalSlots: 1, costCBills: 20000, battleValue: 5, introductionYear: 3050 },
      ]);
      const miscFile = buildFile('schemas/misc-equipment.json', [
        { id: 'movement-enhancement', name: 'MASC', category: 'Movement Enhancement', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', weight: 2, criticalSlots: 2, costCBills: 200000, battleValue: 50, introductionYear: 3050 },
        { id: 'unknown-misc', name: 'Unknown Misc', category: 'Unknown', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 1, criticalSlots: 1, costCBills: 10000, battleValue: 5, introductionYear: 3025 },
      ]);

      const fileResult = await service.loadCustomEquipment(weaponFile);
      expect(fileResult.itemsLoaded).toBe(2);
      await service.loadCustomEquipment(ammoFile);
      await service.loadCustomEquipment(electronicsFile);
      await service.loadCustomEquipment(miscFile);

      expect(service.getWeaponById('physical-weapon')?.category).toBe(WeaponCategory.PHYSICAL);
      expect(service.getWeaponById('unknown-weapon')?.category).toBe(WeaponCategory.ENERGY);
      expect(service.getAmmunitionById('gauss-ammo')?.category).toBe(AmmoCategory.GAUSS);
      expect(service.getAmmunitionById('unknown-ammo')?.variant).toBe(AmmoVariant.STANDARD);
      expect(service.getElectronicsById('tag')?.category).toBe(ElectronicsCategory.TAG);
      expect(service.getElectronicsById('unknown-electronics')?.category).toBe(ElectronicsCategory.TARGETING);
      expect(service.getMiscEquipmentById('movement-enhancement')?.category).toBe(MiscEquipmentCategory.MOVEMENT);
      expect(service.getMiscEquipmentById('unknown-misc')?.category).toBe(MiscEquipmentCategory.HEAT_SINK);
    });

    it('should return error when fetch response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await service.loadCustomEquipment('https://example.com/bad-status.json');

      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Failed to fetch: 500');
    });

    it('should warn on unknown schema without loading items', async () => {
      const unknownFile = buildFile('schemas/unknown.json', [
        { id: 'mystery', name: 'Mystery', category: 'Unknown', techBase: 'IS', rulesLevel: 'STANDARD', weight: 1, criticalSlots: 1, costCBills: 1000, battleValue: 1, introductionYear: 3025 },
      ]);

      const result = await service.loadCustomEquipment(unknownFile);

      expect(result.success).toBe(true);
      expect(result.itemsLoaded).toBe(0);
      expect(result.warnings).toContain('Unknown equipment type, attempting to infer from data');
    });
  });

  describe('getWeaponById()', () => {
    it('should return weapon when found', () => {
      const mockWeapon = {
        id: 'medium-laser',
        name: 'Medium Laser',
        category: 'Energy' as const,
        weight: 1,
        criticalSlots: 1,
        heat: 3,
        techBase: TechBase.INNER_SPHERE,
      };
      
      getServiceMaps(service).weapons.set('medium-laser', mockWeapon);
      
      const weapon = service.getWeaponById('medium-laser');
      expect(weapon).toEqual(mockWeapon);
    });

    it('should return null when not found', () => {
      const weapon = service.getWeaponById('non-existent');
      expect(weapon).toBeNull();
    });
  });

  describe('searchWeapons()', () => {
    beforeEach(() => {
      // Add test weapons using helper
      const maps = getServiceMaps(service);
      maps.weapons.set('medium-laser', {
        id: 'medium-laser',
        name: 'Medium Laser',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2470,
      });
      maps.weapons.set('large-laser', {
        id: 'large-laser',
        name: 'Large Laser',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2470,
      });
      maps.weapons.set('clan-er-large', {
        id: 'clan-er-large',
        name: 'ER Large Laser',
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.ADVANCED,
        introductionYear: 3050,
      });
    });

    it('should return all weapons when no filter', () => {
      const results = service.searchWeapons({});
      expect(results.length).toBe(3);
    });

    it('should filter by tech base', () => {
      const filter: IEquipmentFilter = { techBase: TechBase.INNER_SPHERE };
      const results = service.searchWeapons(filter);
      
      expect(results.length).toBe(2);
      expect(results.every(w => w.techBase === TechBase.INNER_SPHERE)).toBe(true);
    });

    it('should filter by multiple tech bases', () => {
      const filter: IEquipmentFilter = { techBase: [TechBase.INNER_SPHERE, TechBase.CLAN] };
      const results = service.searchWeapons(filter);
      
      expect(results.length).toBe(3);
    });

    it('should filter by rules level', () => {
      const filter: IEquipmentFilter = { rulesLevel: RulesLevel.ADVANCED };
      const results = service.searchWeapons(filter);
      
      expect(results.length).toBe(1);
      expect(results[0].rulesLevel).toBe(RulesLevel.ADVANCED);
    });

    it('should filter by max year', () => {
      const filter: IEquipmentFilter = { maxYear: 2500 };
      const results = service.searchWeapons(filter);
      
      expect(results.length).toBe(2);
      expect(results.every(w => w.introductionYear <= 2500)).toBe(true);
    });

    it('should filter by min year', () => {
      const filter: IEquipmentFilter = { minYear: 3000 };
      const results = service.searchWeapons(filter);
      
      expect(results.length).toBe(1);
      expect(results[0].introductionYear).toBeGreaterThanOrEqual(3000);
    });

    it('should filter by search text', () => {
      const filter: IEquipmentFilter = { searchText: 'Large' };
      const results = service.searchWeapons(filter);
      
      expect(results.length).toBe(2);
      expect(results.every(w => w.name.includes('Large'))).toBe(true);
    });

    it('should combine multiple filters', () => {
      const filter: IEquipmentFilter = {
        techBase: TechBase.INNER_SPHERE,
        searchText: 'Laser',
        maxYear: 2500,
      };
      const results = service.searchWeapons(filter);
      
      expect(results.length).toBe(2);
      expect(results.every(w => 
        w.techBase === TechBase.INNER_SPHERE &&
        w.name.includes('Laser') &&
        w.introductionYear <= 2500
      )).toBe(true);
    });
  });

  describe('getById()', () => {
    it('should return weapon when id exists in weapons map first', () => {
      const serviceMaps = getServiceMaps(service);
      const weapon = { id: 'shared-id', name: 'Weapon' };
      const ammo = { id: 'shared-id', name: 'Ammo' };
      serviceMaps.weapons.set('shared-id', weapon);
      serviceMaps.ammunition.set('shared-id', ammo);

      const result = service.getById('shared-id');

      expect(result).toEqual(weapon);
    });

    it('should return electronics when weapon is not present', () => {
      const serviceMaps = getServiceMaps(service);
      const electronics = { id: 'sensor', name: 'Sensor' };
      serviceMaps.electronics.set('sensor', electronics);

      const result = service.getById('sensor');

      expect(result).toEqual(electronics);
    });

    it('should return miscellaneous equipment when only misc matches', () => {
      const serviceMaps = getServiceMaps(service);
      const misc = { id: 'misc-id', name: 'Misc' };
      serviceMaps.miscEquipment.set('misc-id', misc);

      const result = service.getById('misc-id');

      expect(result).toEqual(misc);
    });

    it('should return null when id is not found', () => {
      expect(service.getById('missing')).toBeNull();
    });
  });

  describe('getTotalCount()', () => {
    it('should return correct total count', () => {
      const serviceMaps = getServiceMaps(service);
      serviceMaps.weapons.set('w1', {});
      serviceMaps.weapons.set('w2', {});
      serviceMaps.ammunition.set('a1', {});
      serviceMaps.electronics.set('e1', {});
      serviceMaps.miscEquipment.set('m1', {});
      
      expect(service.getTotalCount()).toBe(5);
    });
  });
});

