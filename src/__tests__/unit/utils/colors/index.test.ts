/**
 * Tests for color system index exports
 */
import * as colorUtils from '@/utils/colors';

describe('colors/index', () => {
  it('should export equipmentColors functions', () => {
    expect(colorUtils.getEquipmentColors).toBeDefined();
    expect(colorUtils.getEquipmentColorClasses).toBeDefined();
    expect(colorUtils.classifyEquipment).toBeDefined();
    expect(colorUtils.categoryToColorType).toBeDefined();
  });

  it('should export slotColors functions', () => {
    expect(colorUtils.getSlotColors).toBeDefined();
    expect(colorUtils.getSlotColorClasses).toBeDefined();
    expect(colorUtils.classifySystemComponent).toBeDefined();
  });

  it('should export techBaseColors functions', () => {
    expect(colorUtils.getTechBaseColors).toBeDefined();
    expect(colorUtils.getTechBaseModeColors).toBeDefined();
    expect(colorUtils.getTechBaseBadgeClass).toBeDefined();
  });

  it('should export statusColors functions', () => {
    expect(colorUtils.getValidationColors).toBeDefined();
    expect(colorUtils.getAllocationColors).toBeDefined();
    expect(colorUtils.getInteractiveColors).toBeDefined();
    expect(colorUtils.getArmorLocationColorClass).toBeDefined();
  });
});
