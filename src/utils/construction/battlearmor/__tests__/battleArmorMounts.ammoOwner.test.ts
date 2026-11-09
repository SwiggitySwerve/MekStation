/**
 * BA offensive ammo pools and caps use the shared ammunition owner.
 *
 * `projectBAMounts` keeps BA's grouping policy (`baAmmoPool`) and its per-pool
 * `{ id, bvOverride }` entries, but pooled accumulation and the
 * `min(ammo, launcher cap)` rule belong to `battleValueAmmo.ts`
 * (`addBVToAmmoCapGroup`, `sumCappedAmmoBV`). The behavior tests pin the
 * pre-fold output; the delegation test is the only one that depended on the
 * extraction.
 */

import type { IBattleArmorMountedEquipment } from '@/types/unit/PersonnelInterfaces';

import { BattleArmorLocation } from '@/types/construction/UnitLocation';

import * as ammoOwner from '../../battleValueAmmo';
import { projectBAMounts } from '../battleArmorMounts';

jest.mock('../../battleValueAmmo', () => {
  const actual = jest.requireActual('../../battleValueAmmo');
  return {
    ...actual,
    addBVToAmmoCapGroup: jest.fn(actual.addBVToAmmoCapGroup),
    sumCappedAmmoBV: jest.fn(actual.sumCappedAmmoBV),
  };
});

const mount = (
  equipmentId: string,
  unitLocation?: string,
): IBattleArmorMountedEquipment => ({
  id: `${equipmentId}@${unitLocation ?? 'Squad'}`,
  equipmentId,
  name: equipmentId,
  unitLocation,
  location: BattleArmorLocation.RIGHT_ARM,
  isAPMount: false,
  isTurretMounted: false,
  isModular: false,
});

const launcher1 = 'ISBASRM1:RA';
const bin1 = (shots: number) => `BA-SRM1 Ammo:Body:Shots${shots}#`;
const launcher2 = 'ISBASRM2:RA';
const bin2 = (shots: number) => `BA-SRM2 Ammo:Body:Shots${shots}#`;

const project = (ids: string[], squadSize = 4) =>
  projectBAMounts(
    ids.map((id) => mount(id)),
    squadSize,
  );
/** Pre-cap value of one SRM:1 bin, taken from the projection itself. */
const binValue = (shots: number) =>
  project([launcher1, bin1(shots)]).ammoAvailableBVByPool['SRM:1'];

describe('BA ammo pools and caps', () => {
  it('sums same-pool bins in encounter order', () => {
    for (const order of [
      [1, 7, 3],
      [3, 1, 7],
    ]) {
      const projected = project([launcher1, ...order.map(bin1)]);
      expect(projected.ammoAvailableBVByPool['SRM:1']).toBe(
        order.reduce((sum, shots) => sum + binValue(shots), 0),
      );
    }
  });

  it('sums same-pool launchers into one cap', () => {
    const single = project([launcher1, bin1(1000)]);
    const double = project([launcher1, launcher1, bin1(1000)]);
    expect(double.ammoCapBVByPool['SRM:1']).toBe(
      single.ammoCapBVByPool['SRM:1'] + single.ammoCapBVByPool['SRM:1'],
    );
  });

  it('gives a trooper-located bin one trooper share of the pool', () => {
    const squad = project([launcher1, bin1(4)]).ammoAvailableBVByPool['SRM:1'];
    const trooper = projectBAMounts(
      [mount(launcher1), mount(bin1(4), 'Trooper 2')],
      4,
    ).ammoAvailableBVByPool['SRM:1'];
    expect(trooper).toBe(squad / 4);
  });

  it('caps a pool at its launchers and keeps the pre-cap pool visible', () => {
    const capped = project([launcher1, bin1(1000)]);
    const cap = capped.ammoCapBVByPool['SRM:1'];
    expect(capped.ammoAvailableBVByPool['SRM:1']).toBeGreaterThan(cap);
    expect(capped.ammo).toEqual([{ id: 'SRM:1', bvOverride: cap }]);

    const under = project([launcher1, bin1(4)]);
    expect(under.ammo).toEqual([
      { id: 'SRM:1', bvOverride: under.ammoAvailableBVByPool['SRM:1'] },
    ]);
  });

  it('drops a pool without a launcher from the arithmetic but not the report', () => {
    const projected = project([bin1(4)]);
    expect(projected.ammo).toEqual([]);
    expect(projected.ammoAvailableBVByPool['SRM:1']).toBeGreaterThan(0);
    expect(projected.ammoCapBVByPool).toEqual({});
  });

  it('emits one entry per pool in ammo-pool encounter order', () => {
    const projected = project([
      launcher1,
      launcher2,
      bin2(4),
      bin1(4),
      bin2(2),
    ]);
    expect(projected.ammo.map((entry) => entry.id)).toEqual(['SRM:2', 'SRM:1']);
    expect(Object.keys(projected.ammoAvailableBVByPool)).toEqual([
      'SRM:2',
      'SRM:1',
    ]);
  });

  it('delegates pooled accumulation and the cap to the shared owner', () => {
    const add = jest.mocked(ammoOwner.addBVToAmmoCapGroup);
    const sum = jest.mocked(ammoOwner.sumCappedAmmoBV);
    add.mockClear();
    sum.mockClear();

    const projected = project([launcher1, bin1(1000)]);

    // One launcher and one bin accumulate through the owner.
    expect(add.mock.calls.map(([, key]) => key)).toEqual(['SRM:1', 'SRM:1']);
    expect(sum).toHaveBeenCalledTimes(1);
    const [groups, capFor] = sum.mock.calls[0];
    expect(groups).toEqual({
      'SRM:1': projected.ammoAvailableBVByPool['SRM:1'],
    });
    expect(capFor('SRM:1')).toBe(projected.ammoCapBVByPool['SRM:1']);
    expect(capFor('LRM:5')).toBeUndefined();
  });
});
