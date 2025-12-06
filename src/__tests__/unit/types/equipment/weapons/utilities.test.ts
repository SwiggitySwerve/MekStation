/**
 * Weapon Utilities Tests
 * 
 * Tests for weapon query and filter functions including
 * direct fire weapon classification for targeting computers.
 */

import { WeaponCategory, IWeapon } from '@/types/equipment/weapons/interfaces';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';

// Mock weapon data
const mockWeapons: IWeapon[] = [
  {
    id: 'medium-laser',
    name: 'Medium Laser',
    category: WeaponCategory.ENERGY,
    subType: 'Laser',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 5,
    heat: 3,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 1,
    criticalSlots: 1,
    costCBills: 40000,
    battleValue: 46,
    introductionYear: 2300,
  },
  {
    id: 'small-laser',
    name: 'Small Laser',
    category: WeaponCategory.ENERGY,
    subType: 'Laser',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 3,
    heat: 1,
    ranges: { minimum: 0, short: 1, medium: 2, long: 3 },
    weight: 0.5,
    criticalSlots: 1,
    costCBills: 11250,
    battleValue: 9,
    introductionYear: 2300,
  },
  {
    id: 'large-laser',
    name: 'Large Laser',
    category: WeaponCategory.ENERGY,
    subType: 'Laser',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 8,
    heat: 8,
    ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
    weight: 5,
    criticalSlots: 2,
    costCBills: 100000,
    battleValue: 124,
    introductionYear: 2316,
  },
  {
    id: 'ppc',
    name: 'PPC',
    category: WeaponCategory.ENERGY,
    subType: 'PPC',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 10,
    heat: 10,
    ranges: { minimum: 3, short: 6, medium: 12, long: 18 },
    weight: 7,
    criticalSlots: 3,
    costCBills: 200000,
    battleValue: 176,
    introductionYear: 2460,
  },
  {
    id: 'clan-er-large-laser',
    name: 'ER Large Laser (Clan)',
    category: WeaponCategory.ENERGY,
    subType: 'Laser',
    techBase: TechBase.CLAN,
    rulesLevel: RulesLevel.STANDARD,
    damage: 10,
    heat: 12,
    ranges: { minimum: 0, short: 8, medium: 15, long: 25 },
    weight: 4,
    criticalSlots: 1,
    costCBills: 200000,
    battleValue: 248,
    introductionYear: 2820,
  },
  {
    id: 'ac-10',
    name: 'Autocannon/10',
    category: WeaponCategory.BALLISTIC,
    subType: 'Autocannon',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 10,
    heat: 3,
    ranges: { minimum: 0, short: 5, medium: 10, long: 15 },
    weight: 12,
    criticalSlots: 7,
    costCBills: 200000,
    battleValue: 123,
    introductionYear: 2460,
  },
  {
    id: 'gauss-rifle',
    name: 'Gauss Rifle',
    category: WeaponCategory.BALLISTIC,
    subType: 'Gauss',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.STANDARD,
    damage: 15,
    heat: 1,
    ranges: { minimum: 2, short: 7, medium: 15, long: 22 },
    weight: 15,
    criticalSlots: 7,
    costCBills: 300000,
    battleValue: 320,
    introductionYear: 2590,
  },
  {
    id: 'lrm-10',
    name: 'LRM 10',
    category: WeaponCategory.MISSILE,
    subType: 'LRM',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 1,
    heat: 4,
    ranges: { minimum: 6, short: 7, medium: 14, long: 21 },
    weight: 5,
    criticalSlots: 2,
    costCBills: 100000,
    battleValue: 90,
    introductionYear: 2400,
  },
  {
    id: 'srm-4',
    name: 'SRM 4',
    category: WeaponCategory.MISSILE,
    subType: 'SRM',
    techBase: TechBase.INNER_SPHERE,
    rulesLevel: RulesLevel.INTRODUCTORY,
    damage: 2,
    heat: 3,
    ranges: { minimum: 0, short: 3, medium: 6, long: 9 },
    weight: 2,
    criticalSlots: 1,
    costCBills: 60000,
    battleValue: 39,
    introductionYear: 2370,
  },
];

// Mock the EquipmentLoaderService
jest.mock('@/services/equipment/EquipmentLoaderService', () => ({
  getEquipmentLoader: jest.fn(() => ({
    getIsLoaded: jest.fn(() => true),
    getAllWeapons: jest.fn(() => mockWeapons),
    getWeaponById: jest.fn((id: string) => mockWeapons.find(w => w.id === id) ?? null),
  })),
}));

// Import after mock is set up
import {
  getWeaponById,
  getWeaponsByCategory,
  getWeaponsByTechBase,
  isDirectFireCategory,
  isDirectFireWeapon,
  isDirectFireWeaponById,
  getDirectFireWeapons,
  calculateDirectFireWeaponTonnage,
  calculateDirectFireTonnageFromWeapons,
  DIRECT_FIRE_CATEGORIES,
} from '@/types/equipment/weapons/utilities';

describe('Weapon Utilities', () => {
  describe('Basic Query Functions', () => {
    it('should get weapon by ID', () => {
      const weapon = getWeaponById('medium-laser');
      expect(weapon).toBeDefined();
      expect(weapon?.name).toBe('Medium Laser');
    });

    it('should return undefined for unknown weapon ID', () => {
      const weapon = getWeaponById('unknown-weapon');
      expect(weapon).toBeUndefined();
    });

    it('should get weapons by category', () => {
      const energyWeapons = getWeaponsByCategory(WeaponCategory.ENERGY);
      expect(energyWeapons.length).toBeGreaterThan(0);
      expect(energyWeapons.every(w => w.category === WeaponCategory.ENERGY)).toBe(true);
    });

    it('should get weapons by tech base', () => {
      const clanWeapons = getWeaponsByTechBase(TechBase.CLAN);
      expect(clanWeapons.length).toBeGreaterThan(0);
      expect(clanWeapons.every(w => w.techBase === TechBase.CLAN)).toBe(true);
    });
  });

  describe('Direct Fire Weapon Classification', () => {
    describe('DIRECT_FIRE_CATEGORIES', () => {
      it('should include Energy weapons', () => {
        expect(DIRECT_FIRE_CATEGORIES).toContain(WeaponCategory.ENERGY);
      });

      it('should include Ballistic weapons', () => {
        expect(DIRECT_FIRE_CATEGORIES).toContain(WeaponCategory.BALLISTIC);
      });

      it('should NOT include Missile weapons', () => {
        expect(DIRECT_FIRE_CATEGORIES).not.toContain(WeaponCategory.MISSILE);
      });

      it('should NOT include Artillery weapons', () => {
        expect(DIRECT_FIRE_CATEGORIES).not.toContain(WeaponCategory.ARTILLERY);
      });
    });

    describe('isDirectFireCategory', () => {
      it('should return true for Energy category', () => {
        expect(isDirectFireCategory(WeaponCategory.ENERGY)).toBe(true);
      });

      it('should return true for Ballistic category', () => {
        expect(isDirectFireCategory(WeaponCategory.BALLISTIC)).toBe(true);
      });

      it('should return false for Missile category', () => {
        expect(isDirectFireCategory(WeaponCategory.MISSILE)).toBe(false);
      });

      it('should return false for Artillery category', () => {
        expect(isDirectFireCategory(WeaponCategory.ARTILLERY)).toBe(false);
      });
    });

    describe('isDirectFireWeapon', () => {
      it('should return true for lasers', () => {
        const mediumLaser = getWeaponById('medium-laser');
        expect(mediumLaser).toBeDefined();
        expect(isDirectFireWeapon(mediumLaser!)).toBe(true);
      });

      it('should return true for PPCs', () => {
        const ppc = getWeaponById('ppc');
        expect(ppc).toBeDefined();
        expect(isDirectFireWeapon(ppc!)).toBe(true);
      });

      it('should return true for autocannons', () => {
        const ac10 = getWeaponById('ac-10');
        expect(ac10).toBeDefined();
        expect(isDirectFireWeapon(ac10!)).toBe(true);
      });

      it('should return true for Gauss rifles', () => {
        const gauss = getWeaponById('gauss-rifle');
        expect(gauss).toBeDefined();
        expect(isDirectFireWeapon(gauss!)).toBe(true);
      });

      it('should return false for LRMs', () => {
        const lrm10 = getWeaponById('lrm-10');
        expect(lrm10).toBeDefined();
        expect(isDirectFireWeapon(lrm10!)).toBe(false);
      });

      it('should return false for SRMs', () => {
        const srm4 = getWeaponById('srm-4');
        expect(srm4).toBeDefined();
        expect(isDirectFireWeapon(srm4!)).toBe(false);
      });
    });

    describe('isDirectFireWeaponById', () => {
      it('should return true for known direct fire weapon ID', () => {
        expect(isDirectFireWeaponById('medium-laser')).toBe(true);
        expect(isDirectFireWeaponById('ac-10')).toBe(true);
      });

      it('should return false for known indirect fire weapon ID', () => {
        expect(isDirectFireWeaponById('lrm-10')).toBe(false);
        expect(isDirectFireWeaponById('srm-4')).toBe(false);
      });

      it('should return false for unknown weapon ID', () => {
        expect(isDirectFireWeaponById('unknown-weapon')).toBe(false);
      });
    });

    describe('getDirectFireWeapons', () => {
      it('should return only Energy and Ballistic weapons', () => {
        const directFireWeapons = getDirectFireWeapons();
        
        expect(directFireWeapons.length).toBeGreaterThan(0);
        expect(directFireWeapons.every(w => 
          w.category === WeaponCategory.ENERGY || 
          w.category === WeaponCategory.BALLISTIC
        )).toBe(true);
      });

      it('should not include any Missile weapons', () => {
        const directFireWeapons = getDirectFireWeapons();
        expect(directFireWeapons.some(w => w.category === WeaponCategory.MISSILE)).toBe(false);
      });
    });
  });

  describe('Direct Fire Weapon Tonnage Calculations', () => {
    describe('calculateDirectFireWeaponTonnage', () => {
      it('should sum tonnage of direct fire weapons only', () => {
        // Medium Laser = 1 ton, AC/10 = 12 tons, LRM-10 = 5 tons (excluded)
        const tonnage = calculateDirectFireWeaponTonnage([
          'medium-laser', // 1 ton (direct fire)
          'ac-10',        // 12 tons (direct fire)
          'lrm-10',       // 5 tons (NOT direct fire)
        ]);
        
        expect(tonnage).toBe(13); // 1 + 12 = 13 (LRM excluded)
      });

      it('should return 0 for empty array', () => {
        expect(calculateDirectFireWeaponTonnage([])).toBe(0);
      });

      it('should return 0 for only indirect fire weapons', () => {
        const tonnage = calculateDirectFireWeaponTonnage(['lrm-10', 'srm-4']);
        expect(tonnage).toBe(0);
      });

      it('should ignore unknown weapon IDs', () => {
        const tonnage = calculateDirectFireWeaponTonnage([
          'medium-laser',
          'unknown-weapon',
        ]);
        expect(tonnage).toBe(1); // Only medium laser counted
      });

      it('should correctly sum multiple energy weapons', () => {
        // Large Laser = 5 tons, Medium Laser = 1 ton, Small Laser = 0.5 tons
        const tonnage = calculateDirectFireWeaponTonnage([
          'large-laser',
          'medium-laser',
          'small-laser',
        ]);
        expect(tonnage).toBe(6.5);
      });
    });

    describe('calculateDirectFireTonnageFromWeapons', () => {
      it('should sum tonnage of direct fire weapons from array', () => {
        const weapons: IWeapon[] = [
          { category: WeaponCategory.ENERGY, weight: 5 } as IWeapon,
          { category: WeaponCategory.BALLISTIC, weight: 12 } as IWeapon,
          { category: WeaponCategory.MISSILE, weight: 5 } as IWeapon,
        ];
        
        const tonnage = calculateDirectFireTonnageFromWeapons(weapons);
        expect(tonnage).toBe(17); // 5 + 12 = 17 (missile excluded)
      });

      it('should return 0 for empty array', () => {
        expect(calculateDirectFireTonnageFromWeapons([])).toBe(0);
      });
    });
  });

  describe('Targeting Computer Use Cases', () => {
    it('should calculate correct tonnage for typical mech loadout', () => {
      // Example: 2 × Medium Laser (2 tons), 1 × Large Laser (5 tons), 
      // 1 × AC/10 (12 tons), 1 × LRM-10 (5 tons)
      const weaponIds = [
        'medium-laser',
        'medium-laser',
        'large-laser',
        'ac-10',
        'lrm-10', // Should be excluded
      ];
      
      const directFireTonnage = calculateDirectFireWeaponTonnage(weaponIds);
      // 1 + 1 + 5 + 12 = 19 tons
      expect(directFireTonnage).toBe(19);
      
      // IS Targeting Computer: ceil(19 / 4) = 5 tons, 5 slots
      // Clan Targeting Computer: ceil(19 / 5) = 4 tons, 4 slots
    });
  });
});
