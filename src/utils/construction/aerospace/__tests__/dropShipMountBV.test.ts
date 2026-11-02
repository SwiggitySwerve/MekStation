import { CapitalArc } from '@/types/unit/CapitalShipInterfaces';

import { resolveDropShipMountBV } from '../dropShipMountBV';
import { calculateLargeAerospaceFirePool } from '../largeAerospaceFirePool';

/** @spec establish-all-unit-data-parity: DropShip mount valuation */
describe('DropShip raw mount valuation (MegaMek 48fcb2f64)', () => {
  it('derives Union (2708) offense 2339.75 from the pinned raw mounts', () => {
    const mounts = ['NOSE', 'LEFT_SIDE', 'RIGHT_SIDE'].flatMap((location) => {
      const ids = [
        'b-ppc',
        'b-autocannon-5',
        'autocannon-5',
        `is-ammo-ac-5:${location === 'NOSE' ? 20 : 40}`,
        'b-lrm-20',
        'lrm-20',
        'is-ammo-lrm-20:24',
        ...(location === 'NOSE'
          ? ['b-medium-laser', 'medium-laser']
          : [
              'b-large-laser',
              'medium-laser',
              'medium-laser',
              'r-b-large-laser',
              'r-medium-laser',
              'r-medium-laser',
            ]),
      ];
      return ids.map((equipmentId) => ({ equipmentId, location }));
    });
    mounts.push(
      ...['b-large-laser', 'medium-laser', 'medium-laser'].map(
        (equipmentId) => ({ equipmentId, location: 'AFT' }),
      ),
    );
    const result = resolveDropShipMountBV(mounts);
    expect(result.unresolved).toEqual([]);
    expect(
      calculateLargeAerospaceFirePool({
        arcs: result.arcs,
        heatCapacity: 90,
        maxThrust: 5,
      }),
    ).toMatchObject({
      weaponFirePoolBV: 2101.25,
      ammoBV: 238.5,
      offensive: 2339.75,
    });
  });

  it('counts bay-start weapons once and routes rear side weapons into aft arcs', () => {
    const result = resolveDropShipMountBV([
      { equipmentId: 'b-ppc', location: 'NOSE' },
      { equipmentId: 'r-b-large-laser', location: 'LEFT_SIDE' },
      { equipmentId: 'r-medium-laser', location: 'RIGHT_SIDE' },
      { equipmentId: 'medium-laser', arc: CapitalArc.AFT },
    ]);
    expect(result.unresolved).toEqual([]);
    expect(result.arcs.find((a) => a.arc === CapitalArc.NOSE)).toMatchObject({
      weaponBV: 176,
      heat: 10,
    });
    expect(
      result.arcs.find((a) => a.arc === CapitalArc.AFT_LEFT),
    ).toMatchObject({ weaponBV: 123, heat: 8 });
    expect(
      result.arcs.find((a) => a.arc === CapitalArc.AFT_RIGHT),
    ).toMatchObject({ weaponBV: 46, heat: 3 });
    expect(result.arcs.find((a) => a.arc === CapitalArc.AFT)).toMatchObject({
      weaponBV: 46,
    });
  });

  it('uses native integer multi-ton ratios, preserves depleted ammo and caps within arcs', () => {
    const result = resolveDropShipMountBV([
      { equipmentId: 'b-autocannon-5', location: 'NOSE' },
      { equipmentId: 'is-ammo-ac-5:39', location: 'NOSE' },
      { equipmentId: 'is-ammo-ac-5:0', location: 'NOSE' },
      { equipmentId: 'is-ammo-ac-5:200', location: 'LEFT_SIDE' },
    ]);
    expect(result.unresolved).toEqual([]);
    const stage = calculateLargeAerospaceFirePool({
      arcs: result.arcs,
      heatCapacity: 90,
      maxThrust: 5,
    });
    expect(stage.weaponFirePoolBV).toBe(70);
    expect(stage.ammoBV).toBe(9);
  });

  it.each([
    [0, 0],
    [1, 9],
    [19, 9],
    [20, 9],
    [39, 9],
    [40, 18],
  ])(
    'values %i AC/5 shots at %i before the excessive-ammo cap',
    (shots, bv) => {
      const result = resolveDropShipMountBV([
        { equipmentId: `is-ammo-ac-5:${shots}`, location: 'NOSE' },
      ]);
      expect(result.unresolved).toEqual([]);
      expect(result.arcs[0].ammoBVByType?.['ac-5'] ?? 0).toBe(bv);
    },
  );

  it('reports unsupported capital weapons, links, identities, arcs and quantities', () => {
    const mounts = [
      { equipmentId: 'b-sub-capital-laser-1', location: 'NOSE' },
      { equipmentId: 'ppc-capacitor', location: 'NOSE' },
      { equipmentId: 'unknown', location: 'NOSE' },
      { equipmentId: 'medium-laser', location: 'UNKNOWN' },
      { equipmentId: 'is-ammo-ac-5:-1', location: 'NOSE' },
      { equipmentId: 'lrm-ammo', location: 'NOSE' },
      { equipmentId: 'issrm4os', location: 'NOSE' },
    ];
    const before = JSON.stringify(mounts);
    expect(
      resolveDropShipMountBV(mounts).unresolved.map((x) => x.mountIndex),
    ).toEqual([0, 1, 2, 3, 4, 5, 6]);
    expect(JSON.stringify(mounts)).toBe(before);
  });

  it('excludes represented defensive equipment and AMS ammo from offensive facts', () => {
    const result = resolveDropShipMountBV([
      { equipmentId: 'b-ISAntiMissileSystem', location: 'NOSE' },
      { equipmentId: 'ISAMS Ammo:240', location: 'NOSE' },
      { equipmentId: 'ISGuardianECMSuite', location: 'HULL' },
    ]);
    expect(result.unresolved).toEqual([]);
    expect(result.arcs.every((a) => a.weaponBV === 0 && a.heat === 0)).toBe(
      true,
    );
  });
});
