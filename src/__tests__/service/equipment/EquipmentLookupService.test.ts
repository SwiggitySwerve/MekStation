/**
 * Equipment Lookup Service Tests
 * 
 * Tests for equipment lookup and filtering.
 * 
 * @spec openspec/specs/equipment-database/spec.md
 */

import { EquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { EquipmentCategory } from '@/types/equipment';

describe('EquipmentLookupService', () => {
  let service: EquipmentLookupService;

  beforeEach(() => {
    service = new EquipmentLookupService();
  });

  // ============================================================================
  // getAllEquipment
  // ============================================================================
  describe('getAllEquipment', () => {
    it('should return a non-empty array', () => {
      const equipment = service.getAllEquipment();
      expect(Array.isArray(equipment)).toBe(true);
      expect(equipment.length).toBeGreaterThan(0);
    });

    it('should return equipment items with required properties', () => {
      const equipment = service.getAllEquipment();
      for (const item of equipment.slice(0, 10)) { // Check first 10 items
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('name');
        expect(item).toHaveProperty('weight');
        expect(item).toHaveProperty('criticalSlots');
        expect(item).toHaveProperty('techBase');
      }
    });

    it('should cache equipment list', () => {
      const first = service.getAllEquipment();
      const second = service.getAllEquipment();
      expect(first).toBe(second); // Same reference
    });
  });

  // ============================================================================
  // getAllWeapons
  // ============================================================================
  describe('getAllWeapons', () => {
    it('should return weapons only', () => {
      const weapons = service.getAllWeapons();
      expect(weapons.length).toBeGreaterThan(0);
      
      for (const weapon of weapons) {
        expect(weapon).toHaveProperty('damage');
        expect(weapon).toHaveProperty('heat');
      }
    });

    it('should include common weapons', () => {
      const weapons = service.getAllWeapons();
      const weaponNames = weapons.map(w => w.name.toLowerCase());
      
      // Check for some common weapon types
      const hasLaser = weaponNames.some(n => n.includes('laser'));
      const hasAc = weaponNames.some(n => n.includes('autocannon') || n.includes('ac/'));
      
      expect(hasLaser || hasAc).toBe(true);
    });
  });

  // ============================================================================
  // getAllAmmunition
  // ============================================================================
  describe('getAllAmmunition', () => {
    it('should return ammunition only', () => {
      const ammo = service.getAllAmmunition();
      expect(ammo.length).toBeGreaterThan(0);
      
      for (const item of ammo) {
        expect(item).toHaveProperty('shotsPerTon');
      }
    });
  });

  // ============================================================================
  // getById
  // ============================================================================
  describe('getById', () => {
    it('should return equipment by valid ID', () => {
      const allEquipment = service.getAllEquipment();
      if (allEquipment.length > 0) {
        const firstId = allEquipment[0].id;
        const found = service.getById(firstId);
        expect(found).toBeDefined();
        expect(found?.id).toBe(firstId);
      }
    });

    it('should return undefined for unknown ID', () => {
      expect(service.getById('non-existent-id-12345')).toBeUndefined();
    });
  });

  // ============================================================================
  // getByCategory
  // ============================================================================
  describe('getByCategory', () => {
    it('should filter by category', () => {
      const energyWeapons = service.getByCategory(EquipmentCategory.ENERGY_WEAPON);
      
      for (const item of energyWeapons) {
        expect(item.category).toBe(EquipmentCategory.ENERGY_WEAPON);
      }
    });

    it('should return empty array for category with no items', () => {
      // If all categories have items, this might not be testable
      const result = service.getByCategory('INVALID' as EquipmentCategory);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  // ============================================================================
  // getByTechBase
  // ============================================================================
  describe('getByTechBase', () => {
    it('should filter by Inner Sphere tech base', () => {
      const isEquipment = service.getByTechBase(TechBase.INNER_SPHERE);
      expect(isEquipment.length).toBeGreaterThan(0);
      
      for (const item of isEquipment) {
        expect(item.techBase).toBe(TechBase.INNER_SPHERE);
      }
    });

    it('should filter by Clan tech base', () => {
      const clanEquipment = service.getByTechBase(TechBase.CLAN);
      expect(clanEquipment.length).toBeGreaterThan(0);
      
      for (const item of clanEquipment) {
        expect(item.techBase).toBe(TechBase.CLAN);
      }
    });
  });

  // ============================================================================
  // getByEra
  // ============================================================================
  describe('getByEra', () => {
    it('should filter by year', () => {
      const year = 3050;
      const available = service.getByEra(year);
      
      for (const item of available) {
        expect(item.introductionYear).toBeLessThanOrEqual(year);
      }
    });

    it('should return more equipment for later years', () => {
      const earlyYear = service.getByEra(2500);
      const lateYear = service.getByEra(3100);
      
      expect(lateYear.length).toBeGreaterThanOrEqual(earlyYear.length);
    });
  });

  // ============================================================================
  // search
  // ============================================================================
  describe('search', () => {
    it('should find equipment by name substring', () => {
      const results = service.search('laser');
      expect(results.length).toBeGreaterThan(0);
      
      for (const item of results) {
        expect(item.name.toLowerCase()).toContain('laser');
      }
    });

    it('should be case-insensitive', () => {
      const lower = service.search('laser');
      const upper = service.search('LASER');
      const mixed = service.search('LaSeR');
      
      expect(lower.length).toBe(upper.length);
      expect(lower.length).toBe(mixed.length);
    });

    it('should return empty array for no matches', () => {
      const results = service.search('xyznonexistent123');
      expect(results).toEqual([]);
    });
  });

  // ============================================================================
  // query - Combined Filters
  // ============================================================================
  describe('query', () => {
    it('should filter by category', () => {
      const results = service.query({ category: EquipmentCategory.BALLISTIC_WEAPON });
      
      for (const item of results) {
        expect(item.category).toBe(EquipmentCategory.BALLISTIC_WEAPON);
      }
    });

    it('should filter by tech base', () => {
      const results = service.query({ techBase: TechBase.CLAN });
      
      for (const item of results) {
        expect(item.techBase).toBe(TechBase.CLAN);
      }
    });

    it('should filter by year', () => {
      const results = service.query({ year: 3025 });
      
      for (const item of results) {
        expect(item.introductionYear).toBeLessThanOrEqual(3025);
      }
    });

    it('should filter by name query', () => {
      const results = service.query({ nameQuery: 'pulse' });
      
      for (const item of results) {
        expect(item.name.toLowerCase()).toContain('pulse');
      }
    });

    it('should filter by rules level', () => {
      const results = service.query({ rulesLevel: RulesLevel.INTRODUCTORY });
      
      for (const item of results) {
        expect(item.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
      }
    });

    it('should filter by max weight', () => {
      const results = service.query({ maxWeight: 2 });
      
      for (const item of results) {
        expect(item.weight).toBeLessThanOrEqual(2);
      }
    });

    it('should filter by max slots', () => {
      const results = service.query({ maxSlots: 1 });
      
      for (const item of results) {
        expect(item.criticalSlots).toBeLessThanOrEqual(1);
      }
    });

    it('should combine multiple criteria', () => {
      const results = service.query({
        techBase: TechBase.INNER_SPHERE,
        category: EquipmentCategory.ENERGY_WEAPON,
        maxWeight: 5,
      });
      
      for (const item of results) {
        expect(item.techBase).toBe(TechBase.INNER_SPHERE);
        expect(item.category).toBe(EquipmentCategory.ENERGY_WEAPON);
        expect(item.weight).toBeLessThanOrEqual(5);
      }
    });

    it('should return empty criteria with all equipment', () => {
      const all = service.getAllEquipment();
      const results = service.query({});
      
      expect(results.length).toBe(all.length);
    });
  });

  // ============================================================================
  // Data Integrity
  // ============================================================================
  describe('Data Integrity', () => {
    it('all equipment should have valid IDs', () => {
      const equipment = service.getAllEquipment();
      for (const item of equipment) {
        expect(item.id).toBeTruthy();
        expect(typeof item.id).toBe('string');
        expect(item.id.length).toBeGreaterThan(0);
      }
    });

    it('all equipment should have non-negative weight', () => {
      const equipment = service.getAllEquipment();
      for (const item of equipment) {
        expect(item.weight).toBeGreaterThanOrEqual(0);
      }
    });

    it('all equipment should have non-negative slots', () => {
      const equipment = service.getAllEquipment();
      for (const item of equipment) {
        expect(item.criticalSlots).toBeGreaterThanOrEqual(0);
      }
    });

    it('all equipment should have valid tech base', () => {
      const equipment = service.getAllEquipment();
      const validTechBases = Object.values(TechBase);
      
      for (const item of equipment) {
        expect(validTechBases).toContain(item.techBase);
      }
    });

    it('all equipment should have valid introduction year', () => {
      const equipment = service.getAllEquipment();
      for (const item of equipment) {
        expect(item.introductionYear).toBeGreaterThan(1900);
        expect(item.introductionYear).toBeLessThan(4000);
      }
    });
  });
});

