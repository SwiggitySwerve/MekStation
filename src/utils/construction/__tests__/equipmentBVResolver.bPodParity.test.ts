import { readFileSync } from 'fs';
import * as path from 'path';

import {
  calculateMountedDefensiveEquipmentBV,
  getDefensiveEquipmentKind,
} from '../battleValueEquipment';
import { isAmmunitionEquipmentId } from '../equipmentBV/catalogLoader';
import {
  getAmmunitionEntry,
  getEquipmentEntry,
  resolveEquipmentBV,
} from '../equipmentBVResolver';
import { calculateUnitBV } from '../mechBV/calculator';

// MegaMek 48fcb2f64: ISBPod.java:49-53; BPodWeapon.java:79-80;
// BVCalculator.java:522-526 identifies F_B_POD as a defensive WeaponType.
it.each([
  'anti-battlearmor-pods-b-pods',
  'Anti-BattleArmor Pods (B-Pods)',
  'ISBPod',
  'CLBPod',
])('resolves %s in the defensive weapon namespace', (id) => {
  expect(isAmmunitionEquipmentId(id)).toBe(false);
  expect(resolveEquipmentBV(id)).toEqual({
    battleValue: 2,
    heat: 0,
    resolved: true,
  });
  expect(getDefensiveEquipmentKind(id)).toBe('equipment');
});

it('retains duplicate converted B-Pods in the represented defensive pool', () => {
  const id = 'anti-battlearmor-pods-b-pods';
  expect(calculateMountedDefensiveEquipmentBV([{ id }, { id }])).toBe(4);
});

it.each(['narc-pods', 'inarc-ecm-pods', 'narc-ammo', 'inarc-ammo'])(
  'keeps %s in the ammunition namespace',
  (id) => {
    expect(isAmmunitionEquipmentId(id)).toBe(true);
    expect(getEquipmentEntry(id)).toEqual(getAmmunitionEntry(id));
    expect(getAmmunitionEntry(id)).toBeDefined();
  },
);

it('preserves the native B-Pod contribution on Wolverine WVR-9K', () => {
  const base = path.join(process.cwd(), 'public/data/units/battlemechs');
  const index: { units: { id: string; path: string }[] } = JSON.parse(
    readFileSync(path.join(base, 'index.json'), 'utf8'),
  );
  const entry = index.units.find((unit) => unit.id === 'wolverine-wvr-9k');
  if (!entry) throw new Error('Missing Wolverine fixture');
  const source: Parameters<typeof calculateUnitBV>[0] = JSON.parse(
    readFileSync(path.join(base, entry.path), 'utf8'),
  );
  // Two native B-Pods contribute 2 BV each (BPodWeapon.java:79-82).
  // Main 6807d058's separate total gap is 1419 against Java 1420.
  expect(calculateUnitBV(source, source.id).breakdown?.defEquipBV).toBe(4);
});
