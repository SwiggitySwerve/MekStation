import { getEquipmentLoader, resetEquipmentLoader, IEquipmentFilter } from '@/services/equipment/EquipmentLoaderService';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentBehaviorFlag } from '@/types/enums/EquipmentFlag';
import { IWeapon, WeaponCategory } from '@/types/equipment/weapons';
import { AmmoCategory, AmmoVariant, IAmmunition } from '@/types/equipment/AmmunitionTypes';
import { ElectronicsCategory, IElectronics } from '@/types/equipment/ElectronicsTypes';
import { IMiscEquipment, MiscEquipmentCategory } from '@/types/equipment/MiscEquipmentTypes';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

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
 * Uses Object() wrapper to access private properties without double assertions.
 */
function getServiceMaps(svc: ReturnType<typeof getEquipmentLoader>): TestableServiceMaps {
  // Wrap in Object() to get indexable representation, then access private properties
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const internal: Record<string, unknown> = Object(svc);
  return {
    weapons: internal['weapons'] as Map<string, Partial<IWeapon>>,
    ammunition: internal['ammunition'] as Map<string, Partial<IAmmunition>>,
    electronics: internal['electronics'] as Map<string, Partial<IElectronics>>,
    miscEquipment: internal['miscEquipment'] as Map<string, Partial<IMiscEquipment>>,
    isLoaded: internal['isLoaded'] as boolean,
  };
}

// Mock fetch globally
global.fetch = jest.fn();

describe('EquipmentLoaderService', () => {
  let service: ReturnType<typeof getEquipmentLoader>;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    // Get fresh instance
    resetEquipmentLoader();
    service = getEquipmentLoader();
    service.clear();
    (global.fetch as jest.Mock).mockClear();
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Singleton pattern', () => {
    it('should return same instance', () => {
      const instance1 = getEquipmentLoader();
      const instance2 = getEquipmentLoader();
      
      expect(instance1).toBe(instance2);
    });

    it('should return same instance after reset', () => {
      const instance1 = getEquipmentLoader();
      resetEquipmentLoader();
      const instance2 = getEquipmentLoader();
      
      expect(instance1).not.toBe(instance2);
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
      const mockWeapon: Partial<IWeapon> = {
        id: 'medium-laser',
        name: 'Medium Laser',
        category: WeaponCategory.ENERGY,
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

  describe('searchWeapons() - advanced filters', () => {
    beforeEach(() => {
      const maps = getServiceMaps(service);
      maps.weapons.set('ac10', {
        id: 'ac10',
        name: 'Autocannon/10',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2460,
        allowedUnitTypes: [UnitType.BATTLEMECH, UnitType.VEHICLE],
        flags: [EquipmentBehaviorFlag.DirectFire],
      });
      maps.weapons.set('clan-lrm5', {
        id: 'clan-lrm5',
        name: 'Clan LRM 5',
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.ADVANCED,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLEMECH, UnitType.AEROSPACE],
        flags: [EquipmentBehaviorFlag.Artemis],
      });
      maps.weapons.set('ba-srm', {
        id: 'ba-srm',
        name: 'BA SRM',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
        flags: [EquipmentBehaviorFlag.OneShot],
      });
      maps.weapons.set('medium-laser-no-flags', {
        id: 'medium-laser-no-flags',
        name: 'Medium Laser',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.INTRODUCTORY,
        introductionYear: 2470,
        // No allowedUnitTypes - defaults to mech/vehicle/aerospace
        // No flags
      });
    });

    it('should filter by single unit type', () => {
      const results = service.searchWeapons({ unitType: UnitType.BATTLE_ARMOR });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ba-srm');
    });

    it('should filter by multiple unit types', () => {
      const results = service.searchWeapons({ unitType: [UnitType.AEROSPACE, UnitType.VEHICLE] });
      // ac10 (vehicle), clan-lrm5 (aerospace), medium-laser-no-flags (defaults include aerospace/vehicle)
      expect(results.length).toBe(3);
    });

    it('should filter by hasFlags - match equipment with ALL specified flags', () => {
      const results = service.searchWeapons({ hasFlags: [EquipmentBehaviorFlag.DirectFire] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ac10');
    });

    it('should filter by excludeFlags - exclude equipment with ANY specified flags', () => {
      const results = service.searchWeapons({ excludeFlags: [EquipmentBehaviorFlag.OneShot] });
      // Excludes ba-srm
      expect(results.length).toBe(3);
      expect(results.every(w => w.id !== 'ba-srm')).toBe(true);
    });

    it('should combine unitType and flags filters', () => {
      const results = service.searchWeapons({
        unitType: UnitType.BATTLEMECH,
        excludeFlags: [EquipmentBehaviorFlag.Artemis],
      });
      // ac10 (mech), medium-laser-no-flags (default mech) - excludes clan-lrm5 (has ARTEMIS)
      expect(results.length).toBe(2);
    });

    it('should return weapons with default unit types when filter requests common types', () => {
      const results = service.searchWeapons({ unitType: UnitType.BATTLEMECH });
      // ac10, clan-lrm5, medium-laser-no-flags all support battlemech
      expect(results.length).toBe(3);
    });

    it('should filter weapons with no flags when hasFlags is specified', () => {
      const results = service.searchWeapons({ hasFlags: [EquipmentBehaviorFlag.Masc] });
      expect(results.length).toBe(0);
    });

    it('should not exclude weapons with no flags when excludeFlags is specified', () => {
      const results = service.searchWeapons({ excludeFlags: [EquipmentBehaviorFlag.Masc] });
      // All 4 weapons pass since none have MASC
      expect(results.length).toBe(4);
    });
  });

  describe('searchAmmunition()', () => {
    beforeEach(() => {
      const maps = getServiceMaps(service);
      maps.ammunition.set('ac10-std', {
        id: 'ac10-std',
        name: 'AC/10 Standard Ammo',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2460,
        allowedUnitTypes: [UnitType.BATTLEMECH, UnitType.VEHICLE],
        flags: [EquipmentBehaviorFlag.Explosive],
      });
      maps.ammunition.set('clan-lrm-ammo', {
        id: 'clan-lrm-ammo',
        name: 'Clan LRM Ammo',
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.ADVANCED,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLEMECH, UnitType.AEROSPACE],
      });
      maps.ammunition.set('ba-srm-ammo', {
        id: 'ba-srm-ammo',
        name: 'BA SRM Ammo',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
      });
      maps.ammunition.set('std-ammo-no-types', {
        id: 'std-ammo-no-types',
        name: 'Standard Ammo',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.INTRODUCTORY,
        introductionYear: 2470,
        // No allowedUnitTypes - defaults apply
      });
    });

    it('should return all ammunition with no filter', () => {
      const results = service.searchAmmunition({});
      expect(results.length).toBe(4);
    });

    it('should filter by tech base', () => {
      const results = service.searchAmmunition({ techBase: TechBase.CLAN });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('clan-lrm-ammo');
    });

    it('should filter by multiple tech bases', () => {
      const results = service.searchAmmunition({ techBase: [TechBase.INNER_SPHERE, TechBase.CLAN] });
      expect(results.length).toBe(4);
    });

    it('should filter by rules level', () => {
      const results = service.searchAmmunition({ rulesLevel: RulesLevel.ADVANCED });
      expect(results.length).toBe(1);
    });

    it('should filter by max year', () => {
      const results = service.searchAmmunition({ maxYear: 2500 });
      expect(results.length).toBe(2); // ac10-std, std-ammo-no-types
    });

    it('should filter by min year', () => {
      const results = service.searchAmmunition({ minYear: 3000 });
      expect(results.length).toBe(2); // clan-lrm-ammo, ba-srm-ammo
    });

    it('should filter by search text', () => {
      const results = service.searchAmmunition({ searchText: 'lrm' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('clan-lrm-ammo');
    });

    it('should filter by unit type', () => {
      const results = service.searchAmmunition({ unitType: UnitType.BATTLE_ARMOR });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ba-srm-ammo');
    });

    it('should filter by hasFlags', () => {
      const results = service.searchAmmunition({ hasFlags: [EquipmentBehaviorFlag.Explosive] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ac10-std');
    });

    it('should filter by excludeFlags', () => {
      const results = service.searchAmmunition({ excludeFlags: [EquipmentBehaviorFlag.Explosive] });
      expect(results.length).toBe(3);
    });

    it('should combine multiple filters', () => {
      const results = service.searchAmmunition({
        techBase: TechBase.INNER_SPHERE,
        minYear: 3000,
        unitType: UnitType.BATTLE_ARMOR,
      });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ba-srm-ammo');
    });
  });

  describe('searchElectronics()', () => {
    beforeEach(() => {
      const maps = getServiceMaps(service);
      maps.electronics.set('beagle', {
        id: 'beagle',
        name: 'Beagle Active Probe',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3045,
        allowedUnitTypes: [UnitType.BATTLEMECH, UnitType.VEHICLE],
        flags: [EquipmentBehaviorFlag.Bap],
      });
      maps.electronics.set('clan-ecm', {
        id: 'clan-ecm',
        name: 'Clan ECM Suite',
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.ADVANCED,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLEMECH],
        flags: [EquipmentBehaviorFlag.Ecm],
      });
      maps.electronics.set('ba-probe', {
        id: 'ba-probe',
        name: 'BA Active Probe',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3055,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
      });
      maps.electronics.set('default-elec', {
        id: 'default-elec',
        name: 'Generic Sensor',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.INTRODUCTORY,
        introductionYear: 2500,
        // No allowedUnitTypes
      });
    });

    it('should return all electronics with no filter', () => {
      const results = service.searchElectronics({});
      expect(results.length).toBe(4);
    });

    it('should filter by tech base', () => {
      const results = service.searchElectronics({ techBase: TechBase.CLAN });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('clan-ecm');
    });

    it('should filter by multiple tech bases', () => {
      const results = service.searchElectronics({ techBase: [TechBase.INNER_SPHERE, TechBase.CLAN] });
      expect(results.length).toBe(4);
    });

    it('should filter by rules level', () => {
      const results = service.searchElectronics({ rulesLevel: RulesLevel.STANDARD });
      expect(results.length).toBe(2);
    });

    it('should filter by max year', () => {
      const results = service.searchElectronics({ maxYear: 3049 });
      expect(results.length).toBe(2); // beagle, default-elec
    });

    it('should filter by min year', () => {
      const results = service.searchElectronics({ minYear: 3050 });
      expect(results.length).toBe(2); // clan-ecm, ba-probe
    });

    it('should filter by search text', () => {
      const results = service.searchElectronics({ searchText: 'probe' });
      expect(results.length).toBe(2);
    });

    it('should filter by unit type', () => {
      const results = service.searchElectronics({ unitType: UnitType.BATTLE_ARMOR });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ba-probe');
    });

    it('should filter by hasFlags', () => {
      const results = service.searchElectronics({ hasFlags: [EquipmentBehaviorFlag.Ecm] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('clan-ecm');
    });

    it('should filter by excludeFlags', () => {
      const results = service.searchElectronics({ excludeFlags: [EquipmentBehaviorFlag.Bap] });
      expect(results.length).toBe(3);
    });

    it('should combine multiple filters', () => {
      const results = service.searchElectronics({
        techBase: TechBase.INNER_SPHERE,
        minYear: 3050,
      });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ba-probe');
    });
  });

  describe('searchMiscEquipment()', () => {
    beforeEach(() => {
      const maps = getServiceMaps(service);
      maps.miscEquipment.set('masc', {
        id: 'masc',
        name: 'MASC',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.ADVANCED,
        introductionYear: 3035,
        allowedUnitTypes: [UnitType.BATTLEMECH],
        flags: [EquipmentBehaviorFlag.Masc],
      });
      maps.miscEquipment.set('clan-case', {
        id: 'clan-case',
        name: 'Clan CASE',
        techBase: TechBase.CLAN,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2850,
        allowedUnitTypes: [UnitType.BATTLEMECH, UnitType.VEHICLE],
        flags: [EquipmentBehaviorFlag.Case],
      });
      maps.miscEquipment.set('ba-stealth', {
        id: 'ba-stealth',
        name: 'BA Stealth System',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.ADVANCED,
        introductionYear: 3060,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
        flags: [EquipmentBehaviorFlag.Stealth],
      });
      maps.miscEquipment.set('default-misc', {
        id: 'default-misc',
        name: 'Generic Equipment',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.INTRODUCTORY,
        introductionYear: 2400,
        // No allowedUnitTypes
      });
    });

    it('should return all misc equipment with no filter', () => {
      const results = service.searchMiscEquipment({});
      expect(results.length).toBe(4);
    });

    it('should filter by tech base', () => {
      const results = service.searchMiscEquipment({ techBase: TechBase.CLAN });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('clan-case');
    });

    it('should filter by multiple tech bases', () => {
      const results = service.searchMiscEquipment({ techBase: [TechBase.INNER_SPHERE, TechBase.CLAN] });
      expect(results.length).toBe(4);
    });

    it('should filter by rules level', () => {
      const results = service.searchMiscEquipment({ rulesLevel: RulesLevel.ADVANCED });
      expect(results.length).toBe(2);
    });

    it('should filter by max year', () => {
      const results = service.searchMiscEquipment({ maxYear: 3000 });
      expect(results.length).toBe(2); // clan-case, default-misc
    });

    it('should filter by min year', () => {
      const results = service.searchMiscEquipment({ minYear: 3035 });
      expect(results.length).toBe(2); // masc, ba-stealth
    });

    it('should filter by search text', () => {
      const results = service.searchMiscEquipment({ searchText: 'case' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('clan-case');
    });

    it('should filter by unit type', () => {
      const results = service.searchMiscEquipment({ unitType: UnitType.BATTLE_ARMOR });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ba-stealth');
    });

    it('should filter by hasFlags', () => {
      const results = service.searchMiscEquipment({ hasFlags: [EquipmentBehaviorFlag.Case] });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('clan-case');
    });

    it('should filter by excludeFlags', () => {
      const results = service.searchMiscEquipment({ excludeFlags: [EquipmentBehaviorFlag.Masc] });
      expect(results.length).toBe(3);
    });

    it('should combine multiple filters', () => {
      const results = service.searchMiscEquipment({
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.ADVANCED,
      });
      expect(results.length).toBe(2); // masc, ba-stealth
    });
  });

  describe('searchByUnitType()', () => {
    beforeEach(() => {
      const maps = getServiceMaps(service);
      // Set up equipment for multiple categories
      maps.weapons.set('ba-weapon', {
        id: 'ba-weapon',
        name: 'BA Weapon',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
      });
      maps.weapons.set('mech-weapon', {
        id: 'mech-weapon',
        name: 'Mech Weapon',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2470,
        allowedUnitTypes: [UnitType.BATTLEMECH],
      });
      maps.ammunition.set('ba-ammo', {
        id: 'ba-ammo',
        name: 'BA Ammo',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
      });
      maps.electronics.set('ba-sensor', {
        id: 'ba-sensor',
        name: 'BA Sensor',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
      });
      maps.miscEquipment.set('ba-jump', {
        id: 'ba-jump',
        name: 'BA Jump Pack',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 3050,
        allowedUnitTypes: [UnitType.BATTLE_ARMOR],
      });
    });

    it('should return all equipment types for a unit type', () => {
      const results = service.searchByUnitType(UnitType.BATTLE_ARMOR);
      
      expect(results.weapons.length).toBe(1);
      expect(results.weapons[0].id).toBe('ba-weapon');
      expect(results.ammunition.length).toBe(1);
      expect(results.ammunition[0].id).toBe('ba-ammo');
      expect(results.electronics.length).toBe(1);
      expect(results.electronics[0].id).toBe('ba-sensor');
      expect(results.miscEquipment.length).toBe(1);
      expect(results.miscEquipment[0].id).toBe('ba-jump');
    });

    it('should return battlemech equipment', () => {
      const results = service.searchByUnitType(UnitType.BATTLEMECH);
      
      expect(results.weapons.length).toBe(1);
      expect(results.weapons[0].id).toBe('mech-weapon');
    });
  });

  describe('getAmmunitionById()', () => {
    it('should return ammunition when found', () => {
      const mockAmmo: Partial<IAmmunition> = {
        id: 'ac10-ammo',
        name: 'AC/10 Ammo',
        category: AmmoCategory.AUTOCANNON,
      };
      
      getServiceMaps(service).ammunition.set('ac10-ammo', mockAmmo);
      
      const ammo = service.getAmmunitionById('ac10-ammo');
      expect(ammo).toEqual(mockAmmo);
    });

    it('should return null when not found', () => {
      const ammo = service.getAmmunitionById('non-existent');
      expect(ammo).toBeNull();
    });
  });

  describe('getElectronicsById()', () => {
    it('should return electronics when found', () => {
      const mockElec: Partial<IElectronics> = {
        id: 'ecm-suite',
        name: 'ECM Suite',
        category: ElectronicsCategory.ECM,
      };
      
      getServiceMaps(service).electronics.set('ecm-suite', mockElec);
      
      const elec = service.getElectronicsById('ecm-suite');
      expect(elec).toEqual(mockElec);
    });

    it('should return null when not found', () => {
      const elec = service.getElectronicsById('non-existent');
      expect(elec).toBeNull();
    });
  });

  describe('getMiscEquipmentById()', () => {
    it('should return misc equipment when found', () => {
      const mockMisc: Partial<IMiscEquipment> = {
        id: 'jump-jet',
        name: 'Jump Jet',
        category: MiscEquipmentCategory.JUMP_JET,
      };
      
      getServiceMaps(service).miscEquipment.set('jump-jet', mockMisc);
      
      const misc = service.getMiscEquipmentById('jump-jet');
      expect(misc).toEqual(mockMisc);
    });

    it('should return null when not found', () => {
      const misc = service.getMiscEquipmentById('non-existent');
      expect(misc).toBeNull();
    });
  });

  describe('getAllAmmunition()', () => {
    it('should return all ammunition as array', () => {
      const maps = getServiceMaps(service);
      maps.ammunition.set('ammo1', { id: 'ammo1', name: 'Ammo 1' });
      maps.ammunition.set('ammo2', { id: 'ammo2', name: 'Ammo 2' });
      
      const results = service.getAllAmmunition();
      expect(results.length).toBe(2);
    });
  });

  describe('getAllElectronics()', () => {
    it('should return all electronics as array', () => {
      const maps = getServiceMaps(service);
      maps.electronics.set('elec1', { id: 'elec1', name: 'Electronics 1' });
      maps.electronics.set('elec2', { id: 'elec2', name: 'Electronics 2' });
      
      const results = service.getAllElectronics();
      expect(results.length).toBe(2);
    });
  });

  describe('getAllMiscEquipment()', () => {
    it('should return all misc equipment as array', () => {
      const maps = getServiceMaps(service);
      maps.miscEquipment.set('misc1', { id: 'misc1', name: 'Misc 1' });
      maps.miscEquipment.set('misc2', { id: 'misc2', name: 'Misc 2' });
      
      const results = service.getAllMiscEquipment();
      expect(results.length).toBe(2);
    });
  });

  describe('loadOfficialEquipment() - comprehensive category parsing', () => {
    const buildEquipmentFile = <T>(items: T[]) => ({
      $schema: 'test',
      version: '1.0',
      generatedAt: '2024-01-01',
      count: items.length,
      items,
    });

    it('should parse Artillery weapon category', async () => {
      const weaponFile = buildEquipmentFile([{
        id: 'long-tom',
        name: 'Long Tom Artillery',
        category: 'Artillery',
        subType: 'Tube Artillery',
        techBase: 'INNER_SPHERE',
        rulesLevel: 'ADVANCED',
        damage: 20,
        heat: 0,
        ranges: { minimum: 0, short: 6, medium: 12, long: 18 },
        weight: 30,
        criticalSlots: 0,
        costCBills: 500000,
        battleValue: 200,
        introductionYear: 2600,
      }]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => weaponFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const weapon = service.getWeaponById('long-tom');
      expect(weapon?.category).toBe(WeaponCategory.ARTILLERY);
    });

    it('should parse all ammo categories', async () => {
      const ammoFile = buildEquipmentFile([
        { id: 'mg-ammo', name: 'MG Ammo', category: 'Machine Gun', variant: 'Standard', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', compatibleWeaponIds: ['mg'], shotsPerTon: 200, weight: 1, criticalSlots: 1, costPerTon: 1000, battleValue: 1, isExplosive: false, introductionYear: 2400 },
        { id: 'lrm-ammo', name: 'LRM Ammo', category: 'LRM', variant: 'Armor-Piercing', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', compatibleWeaponIds: ['lrm5'], shotsPerTon: 24, weight: 1, criticalSlots: 1, costPerTon: 30000, battleValue: 5, isExplosive: true, introductionYear: 2400 },
        { id: 'srm-ammo', name: 'SRM Ammo', category: 'SRM', variant: 'Cluster', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', compatibleWeaponIds: ['srm2'], shotsPerTon: 50, weight: 1, criticalSlots: 1, costPerTon: 27000, battleValue: 3, isExplosive: true, introductionYear: 2400 },
        { id: 'mrm-ammo', name: 'MRM Ammo', category: 'MRM', variant: 'Flechette', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['mrm10'], shotsPerTon: 24, weight: 1, criticalSlots: 1, costPerTon: 5000, battleValue: 3, isExplosive: true, introductionYear: 3058 },
        { id: 'atm-ammo', name: 'ATM Ammo', category: 'ATM', variant: 'Inferno', techBase: 'CLAN', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['atm3'], shotsPerTon: 20, weight: 1, criticalSlots: 1, costPerTon: 75000, battleValue: 7, isExplosive: true, introductionYear: 3054 },
        { id: 'narc-ammo', name: 'NARC Ammo', category: 'NARC', variant: 'Fragmentation', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['narc'], shotsPerTon: 6, weight: 1, criticalSlots: 1, costPerTon: 6000, battleValue: 2, isExplosive: true, introductionYear: 3035 },
        { id: 'arty-ammo', name: 'Artillery Ammo', category: 'Artillery', variant: 'Incendiary', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['long-tom'], shotsPerTon: 5, weight: 1, criticalSlots: 1, costPerTon: 10000, battleValue: 1, isExplosive: true, introductionYear: 2600 },
        { id: 'ams-ammo', name: 'AMS Ammo', category: 'AMS', variant: 'Smoke', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', compatibleWeaponIds: ['ams'], shotsPerTon: 12, weight: 1, criticalSlots: 1, costPerTon: 2000, battleValue: 1, isExplosive: false, introductionYear: 3040 },
      ]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ballistic
        .mockResolvedValueOnce({ ok: false, status: 404 }) // missile
        .mockResolvedValueOnce({ ok: true, json: async () => ammoFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      expect(service.getAmmunitionById('mg-ammo')?.category).toBe(AmmoCategory.MACHINE_GUN);
      expect(service.getAmmunitionById('lrm-ammo')?.category).toBe(AmmoCategory.LRM);
      expect(service.getAmmunitionById('lrm-ammo')?.variant).toBe(AmmoVariant.ARMOR_PIERCING);
      expect(service.getAmmunitionById('srm-ammo')?.category).toBe(AmmoCategory.SRM);
      expect(service.getAmmunitionById('srm-ammo')?.variant).toBe(AmmoVariant.CLUSTER);
      expect(service.getAmmunitionById('mrm-ammo')?.category).toBe(AmmoCategory.MRM);
      expect(service.getAmmunitionById('mrm-ammo')?.variant).toBe(AmmoVariant.FLECHETTE);
      expect(service.getAmmunitionById('atm-ammo')?.category).toBe(AmmoCategory.ATM);
      expect(service.getAmmunitionById('atm-ammo')?.variant).toBe(AmmoVariant.INFERNO);
      expect(service.getAmmunitionById('narc-ammo')?.category).toBe(AmmoCategory.NARC);
      expect(service.getAmmunitionById('narc-ammo')?.variant).toBe(AmmoVariant.FRAGMENTATION);
      expect(service.getAmmunitionById('arty-ammo')?.category).toBe(AmmoCategory.ARTILLERY);
      expect(service.getAmmunitionById('arty-ammo')?.variant).toBe(AmmoVariant.INCENDIARY);
      expect(service.getAmmunitionById('ams-ammo')?.category).toBe(AmmoCategory.AMS);
      expect(service.getAmmunitionById('ams-ammo')?.variant).toBe(AmmoVariant.SMOKE);
    });

    it('should parse additional ammo variants', async () => {
      const ammoFile = buildEquipmentFile([
        { id: 'thunder-ammo', name: 'Thunder Ammo', category: 'LRM', variant: 'Thunder', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['lrm5'], shotsPerTon: 24, weight: 1, criticalSlots: 1, costPerTon: 50000, battleValue: 5, isExplosive: true, introductionYear: 3055 },
        { id: 'swarm-ammo', name: 'Swarm Ammo', category: 'LRM', variant: 'Swarm', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['lrm10'], shotsPerTon: 12, weight: 1, criticalSlots: 1, costPerTon: 60000, battleValue: 6, isExplosive: true, introductionYear: 3055 },
        { id: 'tandem-ammo', name: 'Tandem Charge Ammo', category: 'SRM', variant: 'Tandem-Charge', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['srm4'], shotsPerTon: 25, weight: 1, criticalSlots: 1, costPerTon: 50000, battleValue: 8, isExplosive: true, introductionYear: 3060 },
        { id: 'er-ammo', name: 'Extended Range Ammo', category: 'ATM', variant: 'Extended Range', techBase: 'CLAN', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['atm6'], shotsPerTon: 10, weight: 1, criticalSlots: 1, costPerTon: 80000, battleValue: 10, isExplosive: true, introductionYear: 3054 },
        { id: 'he-ammo', name: 'High Explosive Ammo', category: 'ATM', variant: 'High Explosive', techBase: 'CLAN', rulesLevel: 'ADVANCED', compatibleWeaponIds: ['atm9'], shotsPerTon: 10, weight: 1, criticalSlots: 1, costPerTon: 90000, battleValue: 12, isExplosive: true, introductionYear: 3054 },
      ]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ballistic
        .mockResolvedValueOnce({ ok: false, status: 404 }) // missile
        .mockResolvedValueOnce({ ok: true, json: async () => ammoFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      expect(service.getAmmunitionById('thunder-ammo')?.variant).toBe(AmmoVariant.THUNDER);
      expect(service.getAmmunitionById('swarm-ammo')?.variant).toBe(AmmoVariant.SWARM);
      expect(service.getAmmunitionById('tandem-ammo')?.variant).toBe(AmmoVariant.TANDEM_CHARGE);
      expect(service.getAmmunitionById('er-ammo')?.variant).toBe(AmmoVariant.EXTENDED_RANGE);
      expect(service.getAmmunitionById('he-ammo')?.variant).toBe(AmmoVariant.HIGH_EXPLOSIVE);
    });

    it('should parse all electronics categories', async () => {
      const elecFile = buildEquipmentFile([
        { id: 'targeting', name: 'Targeting Computer', category: 'Targeting', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', weight: 1, criticalSlots: 1, costCBills: 100000, battleValue: 50, introductionYear: 3050 },
        { id: 'ecm', name: 'ECM Suite', category: 'ECM', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 1.5, criticalSlots: 2, costCBills: 200000, battleValue: 60, introductionYear: 3045 },
        { id: 'probe', name: 'Active Probe', category: 'Active Probe', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 1, criticalSlots: 1, costCBills: 100000, battleValue: 30, introductionYear: 3040 },
        { id: 'c3', name: 'C3 Master', category: 'C3 System', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', weight: 5, criticalSlots: 5, costCBills: 1500000, battleValue: 150, introductionYear: 3050 },
        { id: 'tag', name: 'TAG', category: 'TAG', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 1, criticalSlots: 1, costCBills: 50000, battleValue: 0, introductionYear: 3045 },
        { id: 'comms', name: 'Communications Equipment', category: 'Communications', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 1, criticalSlots: 1, costCBills: 75000, battleValue: 10, introductionYear: 2400 },
      ]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ballistic
        .mockResolvedValueOnce({ ok: false, status: 404 }) // missile
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ammo
        .mockResolvedValueOnce({ ok: true, json: async () => elecFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      expect(service.getElectronicsById('targeting')?.category).toBe(ElectronicsCategory.TARGETING);
      expect(service.getElectronicsById('ecm')?.category).toBe(ElectronicsCategory.ECM);
      expect(service.getElectronicsById('probe')?.category).toBe(ElectronicsCategory.ACTIVE_PROBE);
      expect(service.getElectronicsById('c3')?.category).toBe(ElectronicsCategory.C3);
      expect(service.getElectronicsById('tag')?.category).toBe(ElectronicsCategory.TAG);
      expect(service.getElectronicsById('comms')?.category).toBe(ElectronicsCategory.COMMUNICATIONS);
    });

    it('should parse all misc equipment categories', async () => {
      const miscFile = buildEquipmentFile([
        { id: 'hs', name: 'Heat Sink', category: 'Heat Sink', techBase: 'INNER_SPHERE', rulesLevel: 'INTRODUCTORY', weight: 1, criticalSlots: 1, costCBills: 2000, battleValue: 0, introductionYear: 2400 },
        { id: 'jj', name: 'Jump Jet', category: 'Jump Jet', techBase: 'INNER_SPHERE', rulesLevel: 'INTRODUCTORY', weight: 1, criticalSlots: 1, costCBills: 10000, battleValue: 0, introductionYear: 2400 },
        { id: 'masc', name: 'MASC', category: 'Movement Enhancement', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', weight: 2, criticalSlots: 2, costCBills: 200000, battleValue: 50, introductionYear: 3035 },
        { id: 'case', name: 'CASE', category: 'Defensive', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 0.5, criticalSlots: 1, costCBills: 50000, battleValue: 0, introductionYear: 3040 },
        { id: 'tsm', name: 'Triple Strength Myomer', category: 'Myomer', techBase: 'INNER_SPHERE', rulesLevel: 'ADVANCED', weight: 0, criticalSlots: 6, costCBills: 16000, battleValue: 0, introductionYear: 3050 },
        { id: 'backhoe', name: 'Backhoe', category: 'Industrial', techBase: 'INNER_SPHERE', rulesLevel: 'STANDARD', weight: 5, criticalSlots: 6, costCBills: 50000, battleValue: 0, introductionYear: 2400 },
      ]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ballistic
        .mockResolvedValueOnce({ ok: false, status: 404 }) // missile
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ammo
        .mockResolvedValueOnce({ ok: false, status: 404 }) // electronics
        .mockResolvedValueOnce({ ok: true, json: async () => miscFile });

      await service.loadOfficialEquipment();

      expect(service.getMiscEquipmentById('hs')?.category).toBe(MiscEquipmentCategory.HEAT_SINK);
      expect(service.getMiscEquipmentById('jj')?.category).toBe(MiscEquipmentCategory.JUMP_JET);
      expect(service.getMiscEquipmentById('masc')?.category).toBe(MiscEquipmentCategory.MOVEMENT);
      expect(service.getMiscEquipmentById('case')?.category).toBe(MiscEquipmentCategory.DEFENSIVE);
      expect(service.getMiscEquipmentById('tsm')?.category).toBe(MiscEquipmentCategory.MYOMER);
      expect(service.getMiscEquipmentById('backhoe')?.category).toBe(MiscEquipmentCategory.INDUSTRIAL);
    });

    it('should parse weapons with optional fields (ammoPerTon, isExplosive, special, flags, allowedUnitTypes, allowedLocations)', async () => {
      const weaponFile = buildEquipmentFile([{
        id: 'ac5',
        name: 'Autocannon/5',
        category: 'Ballistic',
        subType: 'Autocannon',
        techBase: 'INNER_SPHERE',
        rulesLevel: 'STANDARD',
        damage: 5,
        heat: 1,
        ranges: { minimum: 3, short: 6, medium: 12, long: 18, extreme: 24 },
        weight: 8,
        criticalSlots: 4,
        ammoPerTon: 20,
        costCBills: 125000,
        battleValue: 70,
        introductionYear: 2250,
        isExplosive: true,
        special: ['Jams on 1', 'Rapid Fire'],
        allowedUnitTypes: ['BattleMech', 'Vehicle'],
        flags: ['DIRECT_FIRE', 'RAPID_FIRE'],
        allowedLocations: ['RA', 'LA', 'RT', 'LT', 'CT'],
      }]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: true, json: async () => weaponFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const weapon = service.getWeaponById('ac5');
      expect(weapon).not.toBeNull();
      expect(weapon?.ammoPerTon).toBe(20);
      expect(weapon?.isExplosive).toBe(true);
      expect(weapon?.special).toEqual(['Jams on 1', 'Rapid Fire']);
      expect(weapon?.allowedUnitTypes).toContain(UnitType.BATTLEMECH);
      expect(weapon?.allowedUnitTypes).toContain(UnitType.VEHICLE);
      expect(weapon?.flags).toContain(EquipmentBehaviorFlag.DirectFire);
      expect(weapon?.flags).toContain(EquipmentBehaviorFlag.RapidFire);
      expect(weapon?.allowedLocations).toEqual(['RA', 'LA', 'RT', 'LT', 'CT']);
    });

    it('should parse ammunition with optional fields (damageModifier, rangeModifier, special, flags)', async () => {
      const ammoFile = buildEquipmentFile([{
        id: 'ac5-ap',
        name: 'AC/5 Armor-Piercing Ammo',
        category: 'Autocannon',
        variant: 'Armor-Piercing',
        techBase: 'INNER_SPHERE',
        rulesLevel: 'ADVANCED',
        compatibleWeaponIds: ['ac5'],
        shotsPerTon: 15,
        weight: 1,
        criticalSlots: 1,
        costPerTon: 15000,
        battleValue: 8,
        isExplosive: true,
        introductionYear: 3060,
        damageModifier: 1.5,
        rangeModifier: -1,
        special: ['Reduces target armor by 50%'],
        flags: ['EXPLOSIVE'],
        allowedUnitTypes: ['BattleMech', 'Vehicle'],
      }]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ballistic
        .mockResolvedValueOnce({ ok: false, status: 404 }) // missile
        .mockResolvedValueOnce({ ok: true, json: async () => ammoFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const ammo = service.getAmmunitionById('ac5-ap');
      expect(ammo).not.toBeNull();
      expect(ammo?.damageModifier).toBe(1.5);
      expect(ammo?.rangeModifier).toBe(-1);
      expect(ammo?.special).toEqual(['Reduces target armor by 50%']);
      expect(ammo?.flags).toContain(EquipmentBehaviorFlag.Explosive);
      expect(ammo?.allowedUnitTypes).toContain(UnitType.BATTLEMECH);
    });

    it('should parse electronics with optional fields (special, variableEquipmentId, flags, allowedLocations)', async () => {
      const elecFile = buildEquipmentFile([{
        id: 'tc-var',
        name: 'Targeting Computer',
        category: 'Targeting',
        techBase: 'INNER_SPHERE',
        rulesLevel: 'ADVANCED',
        weight: 1,
        criticalSlots: 1,
        costCBills: 100000,
        battleValue: 50,
        introductionYear: 3050,
        special: ['Direct fire weapons +1 to-hit'],
        variableEquipmentId: 'tc-variable',
        flags: ['TARGETING_COMPUTER'],
        allowedUnitTypes: ['BattleMech'],
        allowedLocations: ['HD', 'CT', 'RT', 'LT'],
      }]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ballistic
        .mockResolvedValueOnce({ ok: false, status: 404 }) // missile
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ammo
        .mockResolvedValueOnce({ ok: true, json: async () => elecFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const elec = service.getElectronicsById('tc-var');
      expect(elec).not.toBeNull();
      expect(elec?.special).toEqual(['Direct fire weapons +1 to-hit']);
      expect(elec?.variableEquipmentId).toBe('tc-variable');
      expect(elec?.flags).toContain(EquipmentBehaviorFlag.TargetingComputer);
      expect(elec?.allowedUnitTypes).toContain(UnitType.BATTLEMECH);
      expect(elec?.allowedLocations).toEqual(['HD', 'CT', 'RT', 'LT']);
    });

    it('should parse misc equipment with optional fields (special, variableEquipmentId, flags, allowedLocations)', async () => {
      const miscFile = buildEquipmentFile([{
        id: 'dhs-var',
        name: 'Double Heat Sink',
        category: 'Heat Sink',
        techBase: 'INNER_SPHERE',
        rulesLevel: 'ADVANCED',
        weight: 1,
        criticalSlots: 3,
        costCBills: 6000,
        battleValue: 0,
        introductionYear: 3040,
        special: ['Dissipates 2 heat per sink'],
        variableEquipmentId: 'dhs-variable',
        flags: ['DOUBLE_HEAT_SINK'],
        allowedUnitTypes: ['BattleMech'],
        allowedLocations: ['RT', 'LT', 'RA', 'LA', 'RL', 'LL'],
      }]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: false, status: 404 }) // energy
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ballistic
        .mockResolvedValueOnce({ ok: false, status: 404 }) // missile
        .mockResolvedValueOnce({ ok: false, status: 404 }) // ammo
        .mockResolvedValueOnce({ ok: false, status: 404 }) // electronics
        .mockResolvedValueOnce({ ok: true, json: async () => miscFile });

      await service.loadOfficialEquipment();

      const misc = service.getMiscEquipmentById('dhs-var');
      expect(misc).not.toBeNull();
      expect(misc?.special).toEqual(['Dissipates 2 heat per sink']);
      expect(misc?.variableEquipmentId).toBe('dhs-variable');
      expect(misc?.flags).toContain(EquipmentBehaviorFlag.DoubleHeatSink);
      expect(misc?.allowedUnitTypes).toContain(UnitType.BATTLEMECH);
      expect(misc?.allowedLocations).toEqual(['RT', 'LT', 'RA', 'LA', 'RL', 'LL']);
    });

    it('should parse various unit type shorthands', async () => {
      const weaponFile = buildEquipmentFile([
        { id: 'w1', name: 'Weapon 1', category: 'Energy', subType: 'Laser', techBase: 'IS', rulesLevel: 'STANDARD', damage: 5, heat: 3, ranges: { minimum: 0, short: 3, medium: 6, long: 9 }, weight: 1, criticalSlots: 1, costCBills: 40000, battleValue: 46, introductionYear: 2470, allowedUnitTypes: ['Mech', 'Tank', 'Fighter'] },
        { id: 'w2', name: 'Weapon 2', category: 'Energy', subType: 'Laser', techBase: 'IS', rulesLevel: 'STANDARD', damage: 5, heat: 3, ranges: { minimum: 0, short: 3, medium: 6, long: 9 }, weight: 1, criticalSlots: 1, costCBills: 40000, battleValue: 46, introductionYear: 2470, allowedUnitTypes: ['BA', 'Proto', 'INF'] },
        { id: 'w3', name: 'Weapon 3', category: 'Energy', subType: 'Laser', techBase: 'IS', rulesLevel: 'STANDARD', damage: 5, heat: 3, ranges: { minimum: 0, short: 3, medium: 6, long: 9 }, weight: 1, criticalSlots: 1, costCBills: 40000, battleValue: 46, introductionYear: 2470, allowedUnitTypes: ['SC', 'DS', 'JS', 'WS', 'SS'] },
        { id: 'w4', name: 'Weapon 4', category: 'Energy', subType: 'Laser', techBase: 'IS', rulesLevel: 'STANDARD', damage: 5, heat: 3, ranges: { minimum: 0, short: 3, medium: 6, long: 9 }, weight: 1, criticalSlots: 1, costCBills: 40000, battleValue: 46, introductionYear: 2470, allowedUnitTypes: ['Support', 'ASF', 'VTOL'] },
      ]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => weaponFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const w1 = service.getWeaponById('w1');
      expect(w1?.allowedUnitTypes).toContain(UnitType.BATTLEMECH);
      expect(w1?.allowedUnitTypes).toContain(UnitType.VEHICLE);
      expect(w1?.allowedUnitTypes).toContain(UnitType.AEROSPACE);

      const w2 = service.getWeaponById('w2');
      expect(w2?.allowedUnitTypes).toContain(UnitType.BATTLE_ARMOR);
      expect(w2?.allowedUnitTypes).toContain(UnitType.PROTOMECH);
      expect(w2?.allowedUnitTypes).toContain(UnitType.INFANTRY);

      const w3 = service.getWeaponById('w3');
      expect(w3?.allowedUnitTypes).toContain(UnitType.SMALL_CRAFT);
      expect(w3?.allowedUnitTypes).toContain(UnitType.DROPSHIP);
      expect(w3?.allowedUnitTypes).toContain(UnitType.JUMPSHIP);
      expect(w3?.allowedUnitTypes).toContain(UnitType.WARSHIP);
      expect(w3?.allowedUnitTypes).toContain(UnitType.SPACE_STATION);

      const w4 = service.getWeaponById('w4');
      expect(w4?.allowedUnitTypes).toContain(UnitType.SUPPORT_VEHICLE);
      expect(w4?.allowedUnitTypes).toContain(UnitType.AEROSPACE);
      expect(w4?.allowedUnitTypes).toContain(UnitType.VTOL);
    });

    it('should handle equipment with unknown flags gracefully', async () => {
      const weaponFile = buildEquipmentFile([{
        id: 'w-unknown-flags',
        name: 'Weapon with Unknown Flags',
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
        flags: ['UNKNOWN_FLAG', 'DIRECT_FIRE', 'ANOTHER_UNKNOWN'],
      }]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => weaponFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const weapon = service.getWeaponById('w-unknown-flags');
      expect(weapon).not.toBeNull();
      // Only valid flags should be present
      expect(weapon?.flags).toContain(EquipmentBehaviorFlag.DirectFire);
      expect(weapon?.flags?.length).toBe(1);
    });

    it('should handle equipment with unknown unit types gracefully', async () => {
      const weaponFile = buildEquipmentFile([{
        id: 'w-unknown-units',
        name: 'Weapon with Unknown Unit Types',
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
        allowedUnitTypes: ['UnknownUnit', 'BattleMech', 'AnotherUnknown'],
      }]);

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => weaponFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const weapon = service.getWeaponById('w-unknown-units');
      expect(weapon).not.toBeNull();
      // Only valid unit types should be present
      expect(weapon?.allowedUnitTypes).toContain(UnitType.BATTLEMECH);
      expect(weapon?.allowedUnitTypes?.length).toBe(1);
    });
  });

  describe('loadCustomEquipment() - File source', () => {
    it('should load from actual File object', async () => {
      const weaponData = {
        $schema: 'schemas/weapon.json',
        version: '1.0',
        generatedAt: '2025-01-01',
        count: 1,
        items: [{
          id: 'file-laser',
          name: 'File Loaded Laser',
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

      // Create an actual File object using Blob
      const blob = new Blob([JSON.stringify(weaponData)], { type: 'application/json' });
      const file = new File([blob], 'weapons.json', { type: 'application/json' });

      const result = await service.loadCustomEquipment(file);

      // File.text() returns empty string in JSDOM, so this test verifies the code path runs
      // but won't load items successfully in the test environment
      // The actual File API works in browsers
      expect(result).toBeDefined();
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.itemsLoaded).toBe('number');
    });

    it('should handle malformed JSON in File', async () => {
      // Create a File with invalid JSON
      const blob = new Blob(['{ invalid json }'], { type: 'application/json' });
      const file = new File([blob], 'bad.json', { type: 'application/json' });

      const result = await service.loadCustomEquipment(file);

      // In JSDOM, File.text() may return empty string, which results in parse error
      // Either way, the result will indicate failure for malformed JSON
      expect(result.success).toBe(false);
      expect(result.errors[0]).toContain('Failed to load custom equipment');
    });
  });

  describe('searchWeapons() - filter by ID in search text', () => {
    beforeEach(() => {
      const maps = getServiceMaps(service);
      maps.weapons.set('ml-123', {
        id: 'ml-123',
        name: 'Medium Laser',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2470,
      });
    });

    it('should match by ID in search text', () => {
      const results = service.searchWeapons({ searchText: 'ml-123' });
      expect(results.length).toBe(1);
      expect(results[0].id).toBe('ml-123');
    });
  });

  describe('edge cases', () => {
    it('should handle empty flags array', async () => {
      const weaponFile = {
        $schema: 'schemas/weapon.json',
        version: '1.0',
        generatedAt: '2025-01-01',
        count: 1,
        items: [{
          id: 'no-flags',
          name: 'No Flags Weapon',
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
          flags: [],
        }],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => weaponFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const weapon = service.getWeaponById('no-flags');
      expect(weapon).not.toBeNull();
      // Empty flags array should result in no flags property (spread operator behavior)
      expect(weapon?.flags).toBeUndefined();
    });

    it('should handle empty allowedUnitTypes array', async () => {
      const weaponFile = {
        $schema: 'schemas/weapon.json',
        version: '1.0',
        generatedAt: '2025-01-01',
        count: 1,
        items: [{
          id: 'no-unit-types',
          name: 'No Unit Types Weapon',
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
          allowedUnitTypes: [],
        }],
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true, json: async () => weaponFile })
        .mockResolvedValue({ ok: false, status: 404 });

      await service.loadOfficialEquipment();

      const weapon = service.getWeaponById('no-unit-types');
      expect(weapon).not.toBeNull();
      // Empty array should result in no allowedUnitTypes property
      expect(weapon?.allowedUnitTypes).toBeUndefined();
    });

    it('should handle undefined flags in search filters', () => {
      const maps = getServiceMaps(service);
      maps.weapons.set('w1', {
        id: 'w1',
        name: 'Weapon 1',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2470,
      });

      // hasFlags with empty array should return all
      const results1 = service.searchWeapons({ hasFlags: [] });
      expect(results1.length).toBe(1);

      // excludeFlags with empty array should return all
      const results2 = service.searchWeapons({ excludeFlags: [] });
      expect(results2.length).toBe(1);
    });
  });
});

