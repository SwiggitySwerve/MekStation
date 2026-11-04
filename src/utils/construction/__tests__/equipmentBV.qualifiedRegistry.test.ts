import { getAmmunitionEntry, getEquipmentEntry } from '../equipmentBVResolver';

// MegaMek 48fcb2f64 EquipmentType.get resolves mount markers separately.
describe('qualified native BV registry routes', () => {
  it.each([
    ['IS LB 2-X Cluster Ammo', 5],
    ['IS Streak SRM 4 Ammo', 7],
    ['IS Streak SRM 2 Ammo', 4],
  ])('%s retains its Java identity with mount qualifiers', (name, bv) => {
    const plain = getAmmunitionEntry(name);
    expect(plain?.battleValue).toBe(bv);
    for (const qualified of [`${name}:OMNI`, `${name}:SIZE:2`, `(R) ${name}`]) {
      expect(getAmmunitionEntry(qualified)).toEqual(plain);
    }
  });
  it('retains the 50-shot IS Streak-2 bin and the 85-BV artillery Sniper', () => {
    expect(getAmmunitionEntry('IS Streak SRM 2 Ammo:OMNI')).toMatchObject({
      battleValue: 4,
      shotsPerTon: 50,
    });
    expect(getEquipmentEntry('(R) Sniper')).toEqual(
      getEquipmentEntry('Sniper'),
    );
    expect(getEquipmentEntry('(R) Sniper')?.battleValue).toBe(85);
  });
});
