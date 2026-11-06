import { calculateVehicleOffensiveBV } from '../vehicleBV';
import { baseInput } from './vehicleBV.test.helpers';

// MegaMek 48fcb2f64: BVCalculator.java:1189-1242 groups by ammo type/rack.
// ISGaussRifle.java:75,83 (GAUSS, BV 320), ISLGaussRifle.java:73,81
// (GAUSS_LIGHT, BV 159), ISHGaussRifle.java:76,87 (GAUSS_HEAVY, BV 346).
// Independent GaussAmmoProbe calls Java assembleAmmo/processAmmo with these
// mounts and twelve IS Gauss Ammo bins (BV 40 each). These are component
// references for synthetic mount sets, not valid designs or whole-unit parity.
const mounts = (id: string, count = 1) =>
  Array.from({ length: count }, () => ({ id, location: 'Front' }));

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('vehicle native Gauss ammunition pools', () => {
  it.each<[string[], number]>([
    [['gauss-rifle', 'light-gauss-rifle'], 320],
    [['gauss-rifle', 'heavy-gauss-rifle'], 320],
    [['light-gauss-rifle', 'heavy-gauss-rifle'], 0],
    [['gauss-rifle', 'light-gauss-rifle', 'heavy-gauss-rifle'], 320],
    [['ISGaussRifle', 'ISLightGaussRifle', 'ISHeavyGaussRifle'], 320],
  ])('keeps ordinary Gauss bins in their own pool with %j', (ids, expected) => {
    for (const order of [ids, [...ids].reverse()]) {
      expect(
        calculateVehicleOffensiveBV(
          baseInput({
            weapons: order.flatMap((id) => mounts(id)),
            ammo: mounts('is-gauss-ammo', 12),
          }),
        ).ammoBV,
      ).toBe(expected);
    }
  });

  it('retains one combined cap for duplicate matching launchers', () => {
    expect(
      calculateVehicleOffensiveBV(
        baseInput({
          weapons: mounts('gauss-rifle', 2),
          ammo: mounts('is-gauss-ammo', 20),
        }),
      ).ammoBV,
    ).toBe(640);
  });

  it('keeps an explicit ammunition family override authoritative', () => {
    expect(
      calculateVehicleOffensiveBV(
        baseInput({
          weapons: mounts('lrm-10'),
          ammo: [
            {
              id: 'is-ammo-lrm-10',
              location: 'Body',
              weaponTypeOverride: 'lrm-20',
              bvOverride: 100,
            },
          ],
        }),
      ).ammoBV,
    ).toBe(0);
  });

  it.each<[string, string, number]>([
    ['light-gauss-rifle', 'is-light-gauss-ammo', 159],
    ['heavy-gauss-rifle', 'isheavygauss-ammo', 346],
  ])('retains the separate %s cap', (weapon, ammo, expected) => {
    expect(
      calculateVehicleOffensiveBV(
        baseInput({
          weapons: mounts(weapon),
          ammo: mounts(ammo, 20),
        }),
      ).ammoBV,
    ).toBe(expected);
  });
});
