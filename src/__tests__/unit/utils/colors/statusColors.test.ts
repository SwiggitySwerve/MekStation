import {
  getValidationColors,
  getAllocationColors,
  getInteractiveColors,
  getValidationIndicatorClasses,
  getAllocationBadgeClasses,
  getInteractiveClasses,
  getArmorLocationColorClass,
  VALIDATION_COLORS,
  ALLOCATION_COLORS,
  INTERACTIVE_COLORS,
  ARMOR_LOCATION_COLORS,
  ValidationStatus,
  AllocationStatus,
  InteractiveState,
} from '@/utils/colors/statusColors';

describe('statusColors', () => {
  describe('getValidationColors', () => {
    it('should return colors for valid status', () => {
      const colors = getValidationColors('valid');
      expect(colors).toEqual(VALIDATION_COLORS.valid);
      expect(colors.bg).toBe('bg-green-900/50');
      expect(colors.text).toBe('text-green-400');
      expect(colors.icon).toBe('✓');
    });

    it('should return colors for warning status', () => {
      const colors = getValidationColors('warning');
      expect(colors).toEqual(VALIDATION_COLORS.warning);
      expect(colors.bg).toBe('bg-yellow-900/50');
      expect(colors.text).toBe('text-yellow-400');
      expect(colors.icon).toBe('⚠');
    });

    it('should return colors for error status', () => {
      const colors = getValidationColors('error');
      expect(colors).toEqual(VALIDATION_COLORS.error);
      expect(colors.bg).toBe('bg-red-900/50');
      expect(colors.text).toBe('text-red-400');
      expect(colors.icon).toBe('✕');
    });

    it('should return colors for info status', () => {
      const colors = getValidationColors('info');
      expect(colors).toEqual(VALIDATION_COLORS.info);
      expect(colors.bg).toBe('bg-blue-900/50');
      expect(colors.text).toBe('text-blue-400');
      expect(colors.icon).toBe('ℹ');
    });
  });

  describe('getAllocationColors', () => {
    it('should return colors for allocated status', () => {
      const colors = getAllocationColors('allocated');
      expect(colors).toEqual(ALLOCATION_COLORS.allocated);
      expect(colors.bg).toBe('bg-green-900/30');
      expect(colors.text).toBe('text-green-400');
    });

    it('should return colors for unallocated status', () => {
      const colors = getAllocationColors('unallocated');
      expect(colors).toEqual(ALLOCATION_COLORS.unallocated);
      expect(colors.bg).toBe('bg-red-900/30');
      expect(colors.text).toBe('text-red-400');
    });

    it('should return colors for partial status', () => {
      const colors = getAllocationColors('partial');
      expect(colors).toEqual(ALLOCATION_COLORS.partial);
      expect(colors.bg).toBe('bg-yellow-900/30');
      expect(colors.text).toBe('text-yellow-400');
    });
  });

  describe('getInteractiveColors', () => {
    const states: InteractiveState[] = [
      'default',
      'hover',
      'selected',
      'dropValid',
      'dropInvalid',
      'disabled',
    ];

    states.forEach((state) => {
      it(`should return colors for ${state} state`, () => {
        const colors = getInteractiveColors(state);
        expect(colors).toEqual(INTERACTIVE_COLORS[state]);
        expect(colors.bg).toBeTruthy();
        expect(colors.border).toBeTruthy();
        expect(colors.cursor).toBeTruthy();
      });
    });

    it('should include ring for selected state', () => {
      const colors = getInteractiveColors('selected');
      expect(colors.ring).toBeTruthy();
      expect(colors.ring).toContain('ring-2');
    });

    it('should include ring for dropValid state', () => {
      const colors = getInteractiveColors('dropValid');
      expect(colors.ring).toBeTruthy();
    });

    it('should include ring for dropInvalid state', () => {
      const colors = getInteractiveColors('dropInvalid');
      expect(colors.ring).toBeTruthy();
    });

    it('should not include ring for default state', () => {
      const colors = getInteractiveColors('default');
      expect(colors.ring).toBeUndefined();
    });
  });

  describe('getValidationIndicatorClasses', () => {
    const statuses: ValidationStatus[] = ['valid', 'warning', 'error', 'info'];

    statuses.forEach((status) => {
      it(`should return classes for ${status} status`, () => {
        const classes = getValidationIndicatorClasses(status);
        expect(classes).toContain('border');
        expect(classes).toContain('rounded');
        expect(classes).toContain('px-2');
        expect(classes).toContain('py-1');
      });
    });

    it('should include correct colors for valid status', () => {
      const classes = getValidationIndicatorClasses('valid');
      expect(classes).toContain('bg-green-900/50');
      expect(classes).toContain('text-green-400');
      expect(classes).toContain('border-green-600');
    });
  });

  describe('getAllocationBadgeClasses', () => {
    const statuses: AllocationStatus[] = [
      'allocated',
      'unallocated',
      'partial',
    ];

    statuses.forEach((status) => {
      it(`should return classes for ${status} status`, () => {
        const classes = getAllocationBadgeClasses(status);
        expect(classes).toContain('px-2');
        expect(classes).toContain('py-0.5');
        expect(classes).toContain('rounded');
        expect(classes).toContain('text-xs');
        expect(classes).toContain('font-medium');
      });
    });

    it('should include correct colors for allocated status', () => {
      const classes = getAllocationBadgeClasses('allocated');
      expect(classes).toContain('bg-green-700');
      expect(classes).toContain('text-green-100');
    });
  });

  describe('getInteractiveClasses', () => {
    const states: InteractiveState[] = [
      'default',
      'hover',
      'selected',
      'dropValid',
      'dropInvalid',
      'disabled',
    ];

    states.forEach((state) => {
      it(`should return classes for ${state} state`, () => {
        const classes = getInteractiveClasses(state);
        expect(classes).toContain('border');
        expect(classes).toContain('transition-colors');
        expect(classes).toContain('cursor-');
      });
    });

    it('should include ring for selected state', () => {
      const classes = getInteractiveClasses('selected');
      expect(classes).toContain('ring-2');
      expect(classes).toContain('ring-yellow-400');
    });

    it('should include ring for dropValid state', () => {
      const classes = getInteractiveClasses('dropValid');
      expect(classes).toContain('ring-2');
      expect(classes).toContain('ring-green-400');
    });

    it('should include ring for dropInvalid state', () => {
      const classes = getInteractiveClasses('dropInvalid');
      expect(classes).toContain('ring-2');
      expect(classes).toContain('ring-red-400');
    });
  });

  describe('getArmorLocationColorClass', () => {
    it('should return colors for head location', () => {
      expect(getArmorLocationColorClass('head', 'default')).toBe(
        ARMOR_LOCATION_COLORS.head.default,
      );
      expect(getArmorLocationColorClass('head', 'hover')).toBe(
        ARMOR_LOCATION_COLORS.head.hover,
      );
      expect(getArmorLocationColorClass('head', 'selected')).toBe(
        ARMOR_LOCATION_COLORS.head.selected,
      );
    });

    it('should return colors for torso location', () => {
      expect(getArmorLocationColorClass('torso', 'default')).toBe(
        ARMOR_LOCATION_COLORS.torso.default,
      );
      expect(getArmorLocationColorClass('torso', 'hover')).toBe(
        ARMOR_LOCATION_COLORS.torso.hover,
      );
      expect(getArmorLocationColorClass('torso', 'selected')).toBe(
        ARMOR_LOCATION_COLORS.torso.selected,
      );
    });

    it('should return colors for rear location', () => {
      expect(getArmorLocationColorClass('rear', 'default')).toBe(
        ARMOR_LOCATION_COLORS.rear.default,
      );
      expect(getArmorLocationColorClass('rear', 'hover')).toBe(
        ARMOR_LOCATION_COLORS.rear.hover,
      );
      expect(getArmorLocationColorClass('rear', 'selected')).toBe(
        ARMOR_LOCATION_COLORS.rear.selected,
      );
    });

    it('should return colors for limb location', () => {
      expect(getArmorLocationColorClass('limb', 'default')).toBe(
        ARMOR_LOCATION_COLORS.limb.default,
      );
      expect(getArmorLocationColorClass('limb', 'hover')).toBe(
        ARMOR_LOCATION_COLORS.limb.hover,
      );
      expect(getArmorLocationColorClass('limb', 'selected')).toBe(
        ARMOR_LOCATION_COLORS.limb.selected,
      );
    });
  });
});
