import { getAmmunitionEntry, getEquipmentEntry } from '../equipmentBVResolver';

// MegaMek 48fcb2f64 separates WeaponType and AmmoType, including shared names.
describe('weapon and ammunition BV lookup boundaries', () => {
  it.each(['coolant-pod-registry', 'isc3sensors-registry'])(
    'retains the explicitly registered native ammo identity %s',
    (id) => expect(getEquipmentEntry(id)?.id).toBe(id),
  );
  it.each([
    ['CLRotaryAC10', 617],
    ['mrm-1', 9],
  ] as const)(
    '%s never resolves to an ammo entry as a weapon',
    (id, expected) => {
      // Missing weapon identities remain unresolved rather than taking ammo BV.
      const entry = getEquipmentEntry(id);
      if (entry) expect(entry.battleValue).toBe(expected);
      else expect(entry).toBeUndefined();
    },
  );
  it('retains explicitly requested ammunition and represented weapons', () => {
    expect(getAmmunitionEntry('IS MRM 1 Ammo')?.battleValue).toBe(1);
    expect(getEquipmentEntry('ISMRM1')?.battleValue).toBe(9);
    expect(getEquipmentEntry('mrm-20')?.category).toBe('Missile');
    expect(getEquipmentEntry('MRM 20 Ammo')?.category).not.toBe('Missile');
  });
});
