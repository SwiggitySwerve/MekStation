import { EquipmentCategory } from '@/types/equipment';
import {
  EQUIPMENT_CATEGORY_COLORS,
  HEATSINK_COLORS,
  MISSILE_AMMO_COLORS,
  BALLISTIC_AMMO_COLORS,
  detectAmmoSubType,
  getAmmoColors,
  getCategoryColors,
  getCategoryBadgeVariant,
  getCategoryLabel,
  getCategorySlotClasses,
  getCategoryIndicatorClass,
  getCategoryAccentClass,
  getEquipmentAccentClasses,
  classifyEquipmentByName,
  getEquipmentSlotClassesByName,
  getCategoryColorsLegacy,
  classifyEquipment,
  categoryToColorType,
  getBattleTechEquipmentClasses,
} from '@/utils/colors/equipmentColors';

describe('EquipmentColors Utility', () => {
  describe('detectAmmoSubType', () => {
    it('should detect missile ammo', () => {
      expect(detectAmmoSubType('LRM 20 Ammo')).toBe('missile');
      expect(detectAmmoSubType('SRM 6 Ammo')).toBe('missile');
      expect(detectAmmoSubType('Streak SRM Ammo')).toBe('missile');
      expect(detectAmmoSubType('MML Ammo')).toBe('missile');
    });

    it('should detect ballistic ammo', () => {
      expect(detectAmmoSubType('AC/20 Ammo')).toBe('ballistic');
      expect(detectAmmoSubType('Gauss Rifle Ammo')).toBe('ballistic');
      expect(detectAmmoSubType('Machine Gun Ammo')).toBe('ballistic');
      expect(detectAmmoSubType('LB 10-X Ammo')).toBe('ballistic');
    });

    it('should return generic for unknown ammo types', () => {
      expect(detectAmmoSubType('Unknown Ammo')).toBe('generic');
    });
  });

  describe('getAmmoColors', () => {
    it('should return correct colors for ammo types', () => {
      expect(getAmmoColors('LRM 20 Ammo')).toBe(MISSILE_AMMO_COLORS);
      expect(getAmmoColors('AC/20 Ammo')).toBe(BALLISTIC_AMMO_COLORS);
      expect(getAmmoColors('Unknown Ammo')).toBe(
        EQUIPMENT_CATEGORY_COLORS[EquipmentCategory.AMMUNITION],
      );
    });
  });

  describe('getCategoryColors', () => {
    it('should return colors for a category', () => {
      const colors = getCategoryColors(EquipmentCategory.ENERGY_WEAPON);
      expect(colors.label).toBe('Energy');
      expect(colors.slotBg).toContain('yellow');
    });
  });

  describe('getCategoryBadgeVariant', () => {
    it('should return correct badge variant', () => {
      expect(getCategoryBadgeVariant(EquipmentCategory.ENERGY_WEAPON)).toBe(
        'yellow',
      );
      expect(getCategoryBadgeVariant(EquipmentCategory.BALLISTIC_WEAPON)).toBe(
        'red',
      );
    });
  });

  describe('getCategoryLabel', () => {
    it('should return correct label', () => {
      expect(getCategoryLabel(EquipmentCategory.ENERGY_WEAPON)).toBe('Energy');
      expect(getCategoryLabel(EquipmentCategory.AMMUNITION)).toBe('Ammo');
    });
  });

  describe('getCategorySlotClasses', () => {
    it('should return slot classes', () => {
      const classes = getCategorySlotClasses(EquipmentCategory.ENERGY_WEAPON);
      expect(classes).toContain('bg-yellow-600');
      expect(classes).toContain('text-black');
    });
  });

  describe('getCategoryIndicatorClass', () => {
    it('should return indicator class', () => {
      expect(getCategoryIndicatorClass(EquipmentCategory.ENERGY_WEAPON)).toBe(
        'bg-yellow-300',
      );
    });
  });

  describe('classifyEquipmentByName', () => {
    it('should classify equipment correctly', () => {
      expect(classifyEquipmentByName('Medium Laser')).toBe(
        EquipmentCategory.ENERGY_WEAPON,
      );
      expect(classifyEquipmentByName('AC/20')).toBe(
        EquipmentCategory.BALLISTIC_WEAPON,
      );
      expect(classifyEquipmentByName('LRM 20')).toBe(
        EquipmentCategory.MISSILE_WEAPON,
      );
      expect(classifyEquipmentByName('Heat Sink')).toBe('heatsink');
      expect(classifyEquipmentByName('ECM Suite')).toBe(
        EquipmentCategory.ELECTRONICS,
      );
      expect(classifyEquipmentByName('Jump Jet')).toBe(
        EquipmentCategory.MOVEMENT,
      );
      expect(classifyEquipmentByName('Endo Steel')).toBe(
        EquipmentCategory.STRUCTURAL,
      );
    });

    it('should return MISC for unknown equipment', () => {
      expect(classifyEquipmentByName('Random Widget')).toBe(
        EquipmentCategory.MISC_EQUIPMENT,
      );
    });
  });

  describe('getEquipmentSlotClassesByName', () => {
    it('should return correct classes for heat sinks', () => {
      const classes = getEquipmentSlotClassesByName('Heat Sink');
      expect(classes).toContain(HEATSINK_COLORS.slotBg);
    });

    it('should return correct classes for weapons', () => {
      const classes = getEquipmentSlotClassesByName('Medium Laser');
      expect(classes).toContain('bg-yellow-600');
    });
  });

  describe('accent classes', () => {
    it('gives every category a literal left-border accent class', () => {
      for (const category of Object.values(EquipmentCategory)) {
        expect(getCategoryAccentClass(category)).toMatch(
          /^border-l-[a-z]+-\d{3}(\/\d{2})?$/,
        );
      }
    });

    it('keeps Energy and Ammo accents off the app selection accent amber/yellow', () => {
      const selectionAccents = ['border-l-amber-400', 'border-l-yellow-400'];
      for (const category of [
        EquipmentCategory.ENERGY_WEAPON,
        EquipmentCategory.AMMUNITION,
      ]) {
        expect(selectionAccents).not.toContain(
          getCategoryAccentClass(category),
        );
      }
      expect(getCategoryAccentClass(EquipmentCategory.ENERGY_WEAPON)).toBe(
        'border-l-yellow-300',
      );
      expect(getCategoryAccentClass(EquipmentCategory.AMMUNITION)).toBe(
        'border-l-slate-300',
      );
    });

    it('keeps Energy, Ammo, Ballistic, Missile and heat sink accents distinct', () => {
      const accents = [
        getCategoryAccentClass(EquipmentCategory.ENERGY_WEAPON),
        getCategoryAccentClass(EquipmentCategory.AMMUNITION),
        getCategoryAccentClass(EquipmentCategory.BALLISTIC_WEAPON),
        getCategoryAccentClass(EquipmentCategory.MISSILE_WEAPON),
        HEATSINK_COLORS.accentBorder,
      ];
      expect(new Set(accents).size).toBe(accents.length);
    });

    it('uses the heat sink accent for heat sinks regardless of category', () => {
      expect(
        getEquipmentAccentClasses(
          EquipmentCategory.MISC_EQUIPMENT,
          'Heat Sink',
        ),
      ).toBe(HEATSINK_COLORS.accentBorder);
    });

    it('uses the category accent for other equipment', () => {
      expect(
        getEquipmentAccentClasses(EquipmentCategory.BALLISTIC_WEAPON, 'AC/20'),
      ).toBe('border-l-red-500');
    });
  });

  describe('Legacy and Compatibility Functions', () => {
    it('getCategoryColorsLegacy should return legacy format', () => {
      const colors = getCategoryColorsLegacy(EquipmentCategory.ENERGY_WEAPON);
      expect(colors.bg).toBeDefined();
      expect(colors.badge).toBeDefined();
    });

    it('classifyEquipment should return legacy types', () => {
      expect(classifyEquipment('Medium Laser')).toBe('weapon');
      expect(classifyEquipment('AC/20')).toBe('weapon');
      expect(classifyEquipment('Heat Sink')).toBe('heatsink');
      expect(classifyEquipment('ECM Suite')).toBe('electronics');
    });

    it('categoryToColorType should map correctly', () => {
      expect(categoryToColorType(EquipmentCategory.ENERGY_WEAPON)).toBe(
        'weapon',
      );
      expect(categoryToColorType(EquipmentCategory.AMMUNITION)).toBe(
        'ammunition',
      );
    });

    it('getBattleTechEquipmentClasses should return classes with selection support', () => {
      const classes = getBattleTechEquipmentClasses('Medium Laser', false);
      expect(classes).toContain('bg-yellow-600');

      const selectedClasses = getBattleTechEquipmentClasses(
        'Medium Laser',
        true,
      );
      expect(selectedClasses).toContain('ring-2');
    });
  });
});
