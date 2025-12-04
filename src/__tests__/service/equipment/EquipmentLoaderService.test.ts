import { EquipmentLoaderService, getEquipmentLoader, IEquipmentFilter } from '@/services/equipment/EquipmentLoaderService';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';

// Mock fetch globally
global.fetch = jest.fn();

describe('EquipmentLoaderService', () => {
  let service: EquipmentLoaderService;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get fresh instance
    service = EquipmentLoaderService.getInstance();
    service.clear();
    (global.fetch as jest.Mock).mockClear();
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
      const serviceInternal = service as unknown as { weapons: Map<string, unknown>; isLoaded: boolean };
      serviceInternal.weapons.set('test-weapon', { id: 'test-weapon', name: 'Test' });
      serviceInternal.isLoaded = true;
      
      service.clear();
      
      expect(service.getIsLoaded()).toBe(false);
      expect(service.getAllWeapons()).toEqual([]);
      expect(service.getLoadErrors()).toEqual([]);
    });
  });

  describe('loadOfficialEquipment()', () => {
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

    it('should handle fetch errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await service.loadOfficialEquipment();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
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
      
      (service as unknown as { weapons: Map<string, typeof mockWeapon> }).weapons.set('medium-laser', mockWeapon);
      
      const weapon = service.getWeaponById('medium-laser');
      expect(weapon).toEqual(mockWeapon);
    });

    it('should return undefined when not found', () => {
      const weapon = service.getWeaponById('non-existent');
      expect(weapon).toBeUndefined();
    });
  });

  describe('searchWeapons()', () => {
    beforeEach(() => {
      // Add test weapons
      (service as any).weapons.set('medium-laser', {
        id: 'medium-laser',
        name: 'Medium Laser',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2470,
      });
      (service as any).weapons.set('large-laser', {
        id: 'large-laser',
        name: 'Large Laser',
        techBase: TechBase.INNER_SPHERE,
        rulesLevel: RulesLevel.STANDARD,
        introductionYear: 2470,
      });
      (service as any).weapons.set('clan-er-large', {
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

  describe('getTotalCount()', () => {
    it('should return correct total count', () => {
      (service as any).weapons.set('w1', {});
      (service as any).weapons.set('w2', {});
      (service as any).ammunition.set('a1', {});
      (service as any).electronics.set('e1', {});
      (service as any).miscEquipment.set('m1', {});
      
      expect(service.getTotalCount()).toBe(5);
    });
  });
});

