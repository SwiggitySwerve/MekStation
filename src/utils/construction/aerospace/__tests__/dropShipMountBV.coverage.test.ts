import { resolveDropShipMountBV } from '../dropShipMountBV';
import { calculateLargeAerospaceFirePool } from '../largeAerospaceFirePool';

/** @spec establish-all-unit-data-parity: DropShip mount valuation */
describe('large-craft mount coverage (MegaMek 48fcb2f64)', () => {
  const mounts = (ids: string[], location = 'NOSE') =>
    ids.map((equipmentId) => ({ equipmentId, location }));

  it('links Union (3055) Artemis to the first unlinked launcher, retaining raw ammo caps', () => {
    const result = resolveDropShipMountBV(
      mounts([
        'b-lrm-20',
        'lrm-20',
        'is-ammo-lrm-20-artemis-capable:24',
        'isartemisiv',
        'isartemisiv',
      ]),
    );
    expect(result.unresolved).toEqual([]);
    expect(result.arcs[0]).toMatchObject({
      weaponBV: 434.4,
      heat: 12,
      weaponBVByAmmoType: { 'lrm-20': 362 },
      ammoBVByType: { 'lrm-20': 92 },
    });
  });

  it('links Clan and rear Artemis by physical location, ignoring the modifier rear flag like Java', () => {
    const result = resolveDropShipMountBV(
      mounts(
        ['b-cllrm20', 'r-cllrm20', 'r-clartemisiv', 'clartemisiv'],
        'LEFT_SIDE',
      ),
    );
    expect(result.unresolved).toEqual([]);
    expect(result.arcs[1].weaponBV).toBeCloseTo(264);
    expect(result.arcs[2].weaponBV).toBeCloseTo(264);
  });

  it.each<[string, number, number]>([
    ['b-isgaussrifle', 320, 1],
    ['b-clgaussrifle', 320, 1],
    ['b-isheavygaussrifle', 346, 2],
    ['b-islbxac10', 148, 2],
    ['b-isimprovedheavygaussrifle', 385, 2],
    ['b-ismml9', 86, 5],
    ['b-islargevsplaser', 123, 10],
  ])(
    'values real DropShip weapon %s once through the catalog',
    (id, bv, heat) => {
      const result = resolveDropShipMountBV(mounts([id]));
      expect(result.unresolved).toEqual([]);
      expect(result.arcs[0]).toMatchObject({ weaponBV: bv, heat });
    },
  );

  it('values Gauss bins and shares LB-X slug/cluster caps, independently per arc', () => {
    const result = resolveDropShipMountBV([
      ...mounts([
        'b-isgaussrifle',
        'is-gauss-ammo:16',
        'b-islbxac10',
        'is-lb-10-x-ac-ammo:100',
        'is-lb-10-x-cluster-ammo:100',
      ]),
      ...mounts(['is-gauss-ammo:160'], 'AFT'),
    ]);
    expect(result.unresolved).toEqual([]);
    expect(
      calculateLargeAerospaceFirePool({
        arcs: result.arcs,
        heatCapacity: 90,
        maxThrust: 5,
      }).ammoBV,
    ).toBe(228);
  });

  it.each([
    'b-capital-missile-launcher-ar10-launcher',
    'b-sub-capital-missile-launcher-piranha',
    'b-screen-launcher',
    'b-tele-operated-missile-kraken-t',
  ])('keeps missing catalog weapon %s unresolved', (id) => {
    expect(resolveDropShipMountBV(mounts([id])).unresolved).toHaveLength(1);
  });

  it('accepts naval C3 on the hull without inventing a firing arc or force bonus', () => {
    const result = resolveDropShipMountBV(mounts(['isnc3'], 'HULL'));
    expect(result.unresolved).toEqual([]);
    expect(result.arcs.every((a) => a.weaponBV === 0)).toBe(true);
  });

  it('rejects an orphan Artemis and leaves the input untouched', () => {
    const input = mounts(['isartemisiv']);
    const before = JSON.stringify(input);
    expect(resolveDropShipMountBV(input).unresolved).toHaveLength(1);
    expect(JSON.stringify(input)).toBe(before);
  });

  it('does not treat an ammunition-only catalog identity as a weapon', () => {
    expect(resolveDropShipMountBV(mounts(['gauss'])).unresolved).toHaveLength(
      1,
    );
  });
});
