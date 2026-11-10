import { parseCriticalSlotToken } from '@/services/units/unitLoaderService/equipmentResolution';

import { equipmentNameResolver } from '../EquipmentNameResolver';
import {
  isMTFCriticalSlotSystemName,
  MTF_CRITICAL_SLOT_SYSTEM_NAMES,
} from '../MTFVocabulary';

it.each(MTF_CRITICAL_SLOT_SYSTEM_NAMES)(
  'recognizes the complete system identity %s',
  (name) => {
    expect(equipmentNameResolver.isSystemComponent(name)).toBe(true);
    expect(isMTFCriticalSlotSystemName(name.toUpperCase())).toBe(true);
    expect(
      isMTFCriticalSlotSystemName(
        parseCriticalSlotToken(name + ' (ARMORED)').lookupToken,
      ),
    ).toBe(true);
  },
);
it.each([
  'Chain Whip',
  'ISC3Sensors',
  'ISShoulderTurret',
  'Small Re-engineered Laser',
  'Medium Re-engineered Laser',
  'Large Re-engineered Laser',
  'Engine Equipment',
  'Cockpit Equipment',
  'Life Support Equipment',
  'Gyro Equipment',
])('does not exclude equipment containing system words: %s', (name) => {
  expect(equipmentNameResolver.isSystemComponent(name)).toBe(false);
});
