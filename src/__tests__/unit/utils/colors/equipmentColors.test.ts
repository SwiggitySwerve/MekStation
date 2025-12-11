/**
 * Tests for Equipment Color System
 * 
 * @spec openspec/specs/color-system/spec.md
 */

import {
  EQUIPMENT_COLORS,
  EquipmentColorType,
  getEquipmentColors,
  getEquipmentColorClasses,
  categoryToColorType,
  classifyEquipment,
  getBattleTechEquipmentClasses,
} from '@/utils/colors/equipmentColors';
import { EquipmentCategory } from '@/types/equipment';

describe('Equipment Colors', () => {
  describe('EQUIPMENT_COLORS constant', () => {
    it('should have all equipment color types defined', () => {
      const types: EquipmentColorType[] = [
        'weapon',
        'ammunition',
        'heatsink',
        'electronics',
        'physical',
        'movement',
        'structural',
        'misc',
      ];
      
      for (const type of types) {
        expect(EQUIPMENT_COLORS[type]).toBeDefined();
      }
    });

    it('should have complete color definitions for each type', () => {
      for (const type of Object.keys(EQUIPMENT_COLORS) as EquipmentColorType[]) {
        const colors = EQUIPMENT_COLORS[type];
        expect(colors.bg).toBeDefined();
        expect(colors.border).toBeDefined();
        expect(colors.text).toBeDefined();
        expect(colors.hoverBg).toBeDefined();
        expect(colors.badge).toBeDefined();
      }
    });

    it('should have weapon colors as red', () => {
      expect(EQUIPMENT_COLORS.weapon.bg).toBe('bg-red-700');
    });

    it('should have ammunition colors as orange', () => {
      expect(EQUIPMENT_COLORS.ammunition.bg).toBe('bg-orange-700');
    });

    it('should have heatsink colors as cyan', () => {
      expect(EQUIPMENT_COLORS.heatsink.bg).toBe('bg-cyan-700');
    });

    it('should have electronics colors as blue', () => {
      expect(EQUIPMENT_COLORS.electronics.bg).toBe('bg-blue-700');
    });

    it('should have movement colors as green', () => {
      expect(EQUIPMENT_COLORS.movement.bg).toBe('bg-green-700');
    });
  });

  describe('getEquipmentColors', () => {
    it('should return weapon colors', () => {
      const colors = getEquipmentColors('weapon');
      expect(colors.bg).toBe('bg-red-700');
    });

    it('should return ammunition colors', () => {
      const colors = getEquipmentColors('ammunition');
      expect(colors.bg).toBe('bg-orange-700');
    });

    it('should return heatsink colors', () => {
      const colors = getEquipmentColors('heatsink');
      expect(colors.bg).toBe('bg-cyan-700');
    });

    it('should return misc colors', () => {
      const colors = getEquipmentColors('misc');
      expect(colors.bg).toBe('bg-slate-700');
    });
  });

  describe('getEquipmentColorClasses', () => {
    it('should return combined class string for weapon', () => {
      const classes = getEquipmentColorClasses('weapon');
      
      expect(classes).toContain('bg-red-700');
      expect(classes).toContain('border-red-800');
      expect(classes).toContain('text-white');
      expect(classes).toContain('hover:bg-red-600');
    });

    it('should return combined class string for electronics', () => {
      const classes = getEquipmentColorClasses('electronics');
      
      expect(classes).toContain('bg-blue-700');
      expect(classes).toContain('border-blue-800');
    });
  });

  describe('categoryToColorType', () => {
    it('should map energy weapons to weapon color', () => {
      expect(categoryToColorType(EquipmentCategory.ENERGY_WEAPON)).toBe('weapon');
    });

    it('should map ballistic weapons to weapon color', () => {
      expect(categoryToColorType(EquipmentCategory.BALLISTIC_WEAPON)).toBe('weapon');
    });

    it('should map missile weapons to weapon color', () => {
      expect(categoryToColorType(EquipmentCategory.MISSILE_WEAPON)).toBe('weapon');
    });

    it('should map ammunition to ammunition color', () => {
      expect(categoryToColorType(EquipmentCategory.AMMUNITION)).toBe('ammunition');
    });

    it('should map electronics to electronics color', () => {
      expect(categoryToColorType(EquipmentCategory.ELECTRONICS)).toBe('electronics');
    });

    it('should map physical weapons to physical color', () => {
      expect(categoryToColorType(EquipmentCategory.PHYSICAL_WEAPON)).toBe('physical');
    });

    it('should map movement to movement color', () => {
      expect(categoryToColorType(EquipmentCategory.MOVEMENT)).toBe('movement');
    });

    it('should map misc equipment to misc color', () => {
      expect(categoryToColorType(EquipmentCategory.MISC_EQUIPMENT)).toBe('misc');
    });

    it('should return misc for unknown category', () => {
      expect(categoryToColorType('UNKNOWN' as EquipmentCategory)).toBe('misc');
    });
  });

  describe('classifyEquipment', () => {
    describe('Weapons', () => {
      it('should classify lasers as weapons', () => {
        expect(classifyEquipment('Medium Laser')).toBe('weapon');
        expect(classifyEquipment('ER Large Laser')).toBe('weapon');
        expect(classifyEquipment('Small Pulse Laser')).toBe('weapon');
      });

      it('should classify PPCs as weapons', () => {
        expect(classifyEquipment('PPC')).toBe('weapon');
        expect(classifyEquipment('ER PPC')).toBe('weapon');
        expect(classifyEquipment('Heavy PPC')).toBe('weapon');
      });

      it('should classify autocannons as weapons', () => {
        expect(classifyEquipment('AC/10')).toBe('weapon');
        expect(classifyEquipment('Ultra AC/5')).toBe('weapon');
        expect(classifyEquipment('LB 10-X Autocannon')).toBe('weapon');
      });

      it('should classify missiles as weapons', () => {
        expect(classifyEquipment('LRM 10')).toBe('weapon');
        expect(classifyEquipment('SRM 6')).toBe('weapon');
        expect(classifyEquipment('MRM 20')).toBe('weapon');
      });

      it('should classify gauss weapons', () => {
        expect(classifyEquipment('Gauss Rifle')).toBe('weapon');
        expect(classifyEquipment('Light Gauss Rifle')).toBe('weapon');
      });

      it('should classify machine guns as weapons', () => {
        expect(classifyEquipment('Machine Gun')).toBe('weapon');
        expect(classifyEquipment('Heavy Machine Gun')).toBe('weapon');
      });

      it('should classify flamers as weapons', () => {
        expect(classifyEquipment('Flamer')).toBe('weapon');
        expect(classifyEquipment('Heavy Flamer')).toBe('weapon');
      });
    });

    describe('Ammunition', () => {
      it('should classify ammo by name', () => {
        expect(classifyEquipment('AC/10 Ammo')).toBe('ammunition');
        expect(classifyEquipment('LRM Ammo')).toBe('ammunition');
        expect(classifyEquipment('Machine Gun Ammunition')).toBe('ammunition');
      });

      it('should classify ammunition by suffix even without keywords', () => {
        expect(classifyEquipment('Tracer rounds')).toBe('ammunition');
      });

      it('should prioritize ammunition classification over weapon keywords', () => {
        expect(classifyEquipment('Laser Ammo')).toBe('ammunition');
      });
    });

    describe('Heat Sinks', () => {
      it('should classify heat sinks', () => {
        expect(classifyEquipment('Heat Sink')).toBe('heatsink');
        expect(classifyEquipment('Double Heat Sink')).toBe('heatsink');
        expect(classifyEquipment('Clan Double Heatsink')).toBe('heatsink');
      });
    });

    describe('Electronics', () => {
      it('should classify computers as electronics', () => {
        expect(classifyEquipment('Targeting Computer')).toBe('electronics');
        expect(classifyEquipment('C3 Computer')).toBe('electronics');
      });

      it('should classify ECM as electronics', () => {
        expect(classifyEquipment('Guardian ECM Suite')).toBe('electronics');
        expect(classifyEquipment('Angel ECM')).toBe('electronics');
      });

      it('should classify probes as electronics', () => {
        expect(classifyEquipment('Beagle Active Probe')).toBe('electronics');
        expect(classifyEquipment('BAP')).toBe('electronics');
      });

      it('should classify C3 systems as electronics', () => {
        expect(classifyEquipment('C3 Master')).toBe('electronics');
        expect(classifyEquipment('C3 Slave')).toBe('electronics');
      });
    });

    describe('Physical Weapons', () => {
      it('should classify melee weapons as physical', () => {
        expect(classifyEquipment('Hatchet')).toBe('physical');
        expect(classifyEquipment('Sword')).toBe('physical');
        expect(classifyEquipment('Claws')).toBe('physical');
      });
    });

    describe('Movement Equipment', () => {
      it('should classify jump jets as movement', () => {
        expect(classifyEquipment('Jump Jet')).toBe('movement');
        expect(classifyEquipment('Improved Jump Jets')).toBe('movement');
      });

      it('should classify MASC as movement', () => {
        expect(classifyEquipment('MASC')).toBe('movement');
        expect(classifyEquipment('Clan MASC')).toBe('movement');
      });

      it('should classify supercharger as movement', () => {
        expect(classifyEquipment('Supercharger')).toBe('movement');
      });
    });

    describe('Structural', () => {
      it('should classify endo steel as structural', () => {
        expect(classifyEquipment('Endo Steel')).toBe('structural');
        expect(classifyEquipment('Endo-Steel')).toBe('structural');
      });

      it('should classify ferro-fibrous as structural', () => {
        expect(classifyEquipment('Ferro-Fibrous Armor')).toBe('structural');
        expect(classifyEquipment('Light Ferro-Fibrous')).toBe('structural');
      });
    });

    describe('Misc', () => {
      it('should classify unknown equipment as misc', () => {
        expect(classifyEquipment('Unknown Widget')).toBe('misc');
        expect(classifyEquipment('Custom Equipment')).toBe('misc');
      });
    });
  });

  describe('getBattleTechEquipmentClasses', () => {
    it('should return base classes for equipment', () => {
      const classes = getBattleTechEquipmentClasses('Medium Laser');
      
      expect(classes).toContain('border');
      expect(classes).toContain('rounded');
      expect(classes).toContain('transition-colors');
    });

    it('should include hover classes when not selected', () => {
      const classes = getBattleTechEquipmentClasses('Medium Laser', false);
      
      expect(classes).toContain('hover:');
    });

    it('should include ring classes when selected', () => {
      const classes = getBattleTechEquipmentClasses('Medium Laser', true);
      
      expect(classes).toContain('ring-2');
      expect(classes).toContain('ring-yellow-400');
    });

    it('should omit hover classes when selected', () => {
      const classes = getBattleTechEquipmentClasses('Medium Laser', true);

      expect(classes).not.toContain('hover:');
    });

    it('should use correct colors for different equipment types', () => {
      const laserClasses = getBattleTechEquipmentClasses('Medium Laser');
      const ammoClasses = getBattleTechEquipmentClasses('AC/10 Ammo');
      const hsClasses = getBattleTechEquipmentClasses('Double Heat Sink');
      
      expect(laserClasses).toContain('bg-red-700');
      expect(ammoClasses).toContain('bg-orange-700');
      expect(hsClasses).toContain('bg-cyan-700');
    });
  });
});
