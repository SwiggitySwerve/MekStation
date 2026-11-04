/**
 * Native names resolve to the catalog record of their Java identity
 * (follow-up 79, CAT-SWEEP ALIAS-MISMATCHES.md). Expected identity is the pinned
 * MegaMek 48fcb2f6 default lookup owner of each name.
 */
import { getEquipmentEntry } from '../equipmentBVResolver';

describe('native equipment names follow their Java identity', () => {
  it.each([
    // weapons/battleArmor/innerSphere/ISBAMGHeavy.java:55
    ['ISBAHeavyMG', 'isbaheavymachinegun-registry'],
    // weapons/srms/innerSphere/oneShot/ISSRM4OS.java:60
    ['ISSRM4OS', 'issrm4os-registry'],
    // weapons/srms/innerSphere/oneShot/ISSRM2IOS.java:61
    ['SRM 2 (I-OS)', 'issrm2ios-registry'],
    // weapons/srms/innerSphere/oneShot/ISSRM4IOS.java:61
    ['SRM 4 (I-OS)', 'issrm4ios-registry'],
  ])('%s resolves to %s', (name, id) => {
    expect(getEquipmentEntry(name)?.id).toBe(id);
  });

  it('keeps names outside the routes on their existing records', () => {
    expect(getEquipmentEntry('SRM 4')?.id).toBe('srm-4');
    expect(getEquipmentEntry('Clan SRM 4 (OS)')?.id).not.toBe(
      'issrm4os-registry',
    );
  });
});
