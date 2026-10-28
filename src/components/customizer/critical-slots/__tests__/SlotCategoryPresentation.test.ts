import { EquipmentCategory } from '@/types/equipment';
import {
  getEquipmentSurfaceClasses,
  HEATSINK_COLORS,
} from '@/utils/colors/equipmentColors';
import { getSlotColorClasses } from '@/utils/colors/slotColors';
import { SLOT_FILLS } from '@/utils/colors/slotFills';

import { getSlotColorStyle, getSlotContentClasses } from '../SlotVisualHelpers';

const hue = (accent: string) =>
  `var(--color-${accent.replace('border-l-', '').split('/')[0]})`;

it("gives every occupied slot its owner hue and that hue's fill, and empty slots none", () => {
  expect(
    getSlotColorStyle({ index: 0, type: 'equipment', name: 'Heat Sink' }),
  ).toEqual({
    '--critical-slot-color': hue(HEATSINK_COLORS.accentBorder),
    '--critical-slot-fill': SLOT_FILLS['cyan-400'],
  });
  expect(
    getSlotColorStyle({ index: 0, type: 'equipment', name: 'Medium Laser' }),
  ).toEqual({
    '--critical-slot-color': 'var(--color-yellow-300)',
    '--critical-slot-fill': SLOT_FILLS['yellow-300'],
  });
  expect(
    getSlotColorStyle({ index: 0, type: 'system', name: 'Engine' }),
  ).toEqual({
    '--critical-slot-color': 'var(--color-orange-400)',
    '--critical-slot-fill': SLOT_FILLS['orange-400'],
  });
  expect(
    getSlotColorStyle({ index: 0, type: 'equipment', name: 'LRM 20 Ammo' }),
  ).toEqual({
    '--critical-slot-color': 'var(--color-teal-500)',
    '--critical-slot-fill': SLOT_FILLS['teal-500'],
  });
  expect(getSlotColorStyle({ index: 0, type: 'empty' })).toBeUndefined();
});

it('keeps the same owner classes for single slots and every merged row', () => {
  const single = { index: 0, type: 'equipment' as const, name: 'AC/20' };
  const expected = getEquipmentSurfaceClasses(
    EquipmentCategory.BALLISTIC_WEAPON,
    'AC/20',
  );
  expect(getSlotContentClasses(single)).toContain(expected);
  for (let index = 0; index < 10; index++) {
    const merged = {
      ...single,
      index,
      totalSlots: 10,
      isFirstSlot: index === 0,
      isLastSlot: index === 9,
    };
    expect(getSlotContentClasses(merged)).toBe(getSlotContentClasses(single));
    expect(getSlotColorStyle(merged)).toEqual(getSlotColorStyle(single));
  }
});

it('routes fixed systems through the slot colour owner', () => {
  for (const [name, type] of [
    ['Engine', 'engine'],
    ['Standard Gyro', 'gyro'],
    ['Shoulder', 'actuator'],
    ['Standard Cockpit', 'cockpit'],
  ] as const)
    expect(getSlotContentClasses({ index: 0, type: 'system', name })).toContain(
      getSlotColorClasses(type),
    );
});
