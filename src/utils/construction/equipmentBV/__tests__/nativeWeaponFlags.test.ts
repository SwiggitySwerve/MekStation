import { hasNativeWeaponBVFlag } from '../nativeWeaponFlags';

describe('pinned TSEMP one-shot weapon flags', () => {
  // MegaMek 48fcb2f64: ISTSEMPOneShot.java:54 adds F_ONE_SHOT;
  // TSEMPWeapon.java:63 adds F_DIRECT_FIRE, without F_INFANTRY.
  it.each(['tsemp-one-shot-registry', 'TSEMP One-Shot', 'ISTSEMPOS'])(
    '%s retains the inherited direct-fire flag and separate infantry fact',
    (id) => {
      expect(hasNativeWeaponBVFlag(id, 'directFire')).toBe(true);
      for (const flag of [
        'artemis',
        'riscLaser',
        'apollo',
        'infantry',
      ] as const) {
        expect(hasNativeWeaponBVFlag(id, flag)).toBe(false);
      }
    },
  );

  it.each([
    'directFire',
    'artemis',
    'riscLaser',
    'apollo',
    'infantry',
  ] as const)('leaves %s undefined for an unrepresented identity', (flag) => {
    expect(hasNativeWeaponBVFlag('unrepresented-tsemp-fixture', flag)).toBe(
      undefined,
    );
  });
});
