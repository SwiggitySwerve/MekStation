import { EquipmentCategory } from '@/types/equipment';
import {
  getCategoryColors,
  HEATSINK_COLORS,
} from '@/utils/colors/equipmentColors';

import {
  getCriticalCategoryTint,
  getSlotTintStyle,
} from '../SlotVisualHelpers';

it('uses the colour owner hue at full opacity, including energy', () => {
  expect(
    getCriticalCategoryTint(getCategoryColors(EquipmentCategory.ENERGY_WEAPON)),
  ).toEqual({
    '--critical-category-color': 'var(--color-yellow-300)',
  });
  expect(
    getSlotTintStyle({ index: 0, type: 'equipment', name: 'Heat Sink' }),
  ).toEqual(getCriticalCategoryTint(HEATSINK_COLORS));
});

it('keeps the same category colour for single slots and every merged row', () => {
  const single = { index: 0, type: 'equipment' as const, name: 'AC/20' };
  const expected = getCriticalCategoryTint(
    getCategoryColors(EquipmentCategory.BALLISTIC_WEAPON),
  );
  expect(getSlotTintStyle(single)).toEqual(expected);
  for (let index = 0; index < 10; index++) {
    expect(
      getSlotTintStyle({
        ...single,
        index,
        totalSlots: 10,
        isFirstSlot: index === 0,
        isLastSlot: index === 9,
      }),
    ).toEqual(expected);
  }
  expect(
    getSlotTintStyle({ index: 0, type: 'system', name: 'Engine' }),
  ).toBeUndefined();
});
