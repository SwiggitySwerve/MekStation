import { getNativeEquipmentLookupToken } from '@/utils/construction/equipmentBV/normalization';

import { resolveVehicleClanArmor } from '../armor';

/** @spec establish-all-unit-data-parity/vehicle-unit-system */
// MegaMek 48fcb2f64: TechConstants:394-398; ArmorType:96-101;
// BLKTankFile:284-304. Only an absent tag inherits the chassis side.
it.each([
  [undefined, false, false],
  [undefined, true, true],
  [-1, true, false],
  [0, true, false],
  [1, true, false],
  [2, false, true],
  [6, false, true],
  [8, false, true],
  [10, false, true],
  [12, false, true],
] as const)(
  'armor technology %s on Clan chassis %s selects Clan=%s',
  (level, clan, expected) => {
    expect(resolveVehicleClanArmor(level, clan)).toBe(expected);
  },
);

it.each([
  ['ISLMGA(ST)', 'islmga'],
  ['ISLMGA', 'islmga'],
  ['islmgast', 'islmga'],
  ['lift-hoist-arresting-hoist', 'lift-hoist-arresting-hoist'],
  ['myomer,-vest', 'myomer,-vest'],
  ['ISLMGA(ST):OMNI', 'islmga'],
  ['Light Machine Gun(ST)', 'light machine gun'],
  ['IS Light Machine Gun Ammo - Full', 'is light machine gun ammo - full'],
])('keeps one guarded native lookup token for %s', (source, token) => {
  expect(getNativeEquipmentLookupToken(source)).toBe(token);
});
