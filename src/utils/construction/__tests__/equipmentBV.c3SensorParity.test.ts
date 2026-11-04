import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';
import {
  getEquipmentEntry,
  resolveEquipmentBV,
} from '@/utils/construction/equipmentBVResolver';

// MegaMek 48fcb2f64 ISC3RemoteSensorLauncher.java:69-80: MissileWeapon, BV 30.
describe('C3 remote sensor launcher identity', () => {
  it.each([
    'c3-remote-sensor-launcher',
    'ISC3RemoteSensorLauncher',
    'C3RemoteSensorLauncher',
    'C3 Remote Sensor Launcher',
  ])('%s is the BV-30 weapon, distinct from a C3 computer', (id) => {
    expect(getEquipmentEntry(id)).toMatchObject({
      id: 'isc3remotesensorlauncher-registry',
      category: 'Missile',
    });
    expect(resolveEquipmentBV(id)).toMatchObject({
      battleValue: 30,
      heat: 0,
      resolved: true,
    });
  });
  it('matches Java for Hi-Scout Cunnington without changing C3 Master', () => {
    const unit = getNodeCanonicalUnitService().getByIdSync(
      'vehicles:hi-scout-drone-carrier-cunnington',
    );
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(515);
    expect(resolveEquipmentBV('c3-master').battleValue).toBe(0);
  });
});
