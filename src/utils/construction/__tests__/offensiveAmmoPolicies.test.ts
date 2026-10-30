import { ProtoLocation } from '@/types/unit/ProtoMechInterfaces';

import { calculateAerospaceAmmoBV } from '../aerospace/aerospaceBVCalculations';
import {
  addBVToAmmoCapGroup,
  calculateAmmoBVWithExcessiveCap,
  sumCappedAmmoBV,
} from '../battleValueAmmo';
import { resolveEquipmentBV } from '../equipmentBVResolver';
import {
  buildProto,
  mount,
} from '../protomech/__tests__/protoMechBV.test.helpers';
import { calculateProtoOffensive } from '../protomech/protoMechBVOffensive';

jest.mock('../equipmentBVResolver', () => ({
  ...jest.requireActual('../equipmentBVResolver'),
  resolveEquipmentBV: jest.fn(),
}));

function catalog(values: Readonly<Record<string, number>>) {
  jest.mocked(resolveEquipmentBV).mockImplementation((id) => ({
    resolved: values[id] !== undefined,
    battleValue: values[id] ?? 0,
    heat: 0,
  }));
}

function proto(ids: readonly string[]) {
  return calculateProtoOffensive(
    buildProto({
      tonnage: 5,
      equipment: ids.map((id) => mount(id, ProtoLocation.TORSO)),
    }),
  ).ammoBV;
}

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('offensive ammo caller policies before native quantity correction', () => {
  beforeEach(() => jest.mocked(resolveEquipmentBV).mockReset());

  it('keeps Clan alias matching limited to the shared policy', () => {
    catalog({ CLLBXAC2: 47, 'lb-2-x-ammo': 6 });
    const bins = [{ id: 'lb-2-x-ammo', weaponType: 'lb-2-x', bv: 6 }];
    expect(
      calculateAmmoBVWithExcessiveCap([{ id: 'CLLBXAC2', bv: 47 }], bins),
    ).toBe(6);
    expect(
      calculateAerospaceAmmoBV([{ id: 'CLLBXAC2', location: 'nose' }], bins),
    ).toBe(0);
    expect(proto(['CLLBXAC2', 'lb-2-x-ammo'])).toBe(0);
  });

  it('groups repeated weapons and bins before the cap in every caller', () => {
    catalog({ 'lrm-10': 30, 'lrm-10-ammo': 40 });
    const weapons = [
      { id: 'lrm-10', bv: 30 },
      { id: 'lrm-10', bv: 30 },
    ];
    const bins = [
      { id: 'a', weaponType: 'lrm-10', bv: 40 },
      { id: 'b', weaponType: 'lrm-10', bv: 40 },
    ];
    expect(calculateAmmoBVWithExcessiveCap(weapons, bins)).toBe(60);
    expect(
      calculateAerospaceAmmoBV(
        weapons.map((w) => ({ ...w, location: 'nose' })),
        bins,
      ),
    ).toBe(60);
    expect(proto(['lrm-10', 'lrm-10', 'lrm-10-ammo', 'lrm-10-ammo'])).toBe(60);
  });

  it('preserves lowercase-only aerospace matching instead of applying aliases', () => {
    catalog({ 'LRM-10': 90 });
    expect(
      calculateAerospaceAmmoBV(
        [{ id: 'LRM-10', location: 'nose' }],
        [{ id: 'a', weaponType: 'lrm-10', bv: 23 }],
      ),
    ).toBe(23);
    expect(
      calculateAerospaceAmmoBV(
        [{ id: 'LRM-10', location: 'nose' }],
        [{ id: 'a', weaponType: 'LRM 10', bv: 23 }],
      ),
    ).toBe(0);
  });

  it.each([
    [-5, -5],
    [0, 0],
    [-0, 0],
    [2.75, 2.75],
    [Infinity, 30],
    [-Infinity, -Infinity],
    [NaN, NaN],
  ])('preserves represented ammunition BV %s', (ammoBV, expected) => {
    catalog({ 'lrm-10': 30, 'lrm-10-ammo': ammoBV });
    const bins = [{ id: 'a', weaponType: 'lrm-10', bv: ammoBV }];
    expect(
      calculateAmmoBVWithExcessiveCap([{ id: 'lrm-10', bv: 30 }], bins),
    ).toBe(expected);
    expect(
      calculateAerospaceAmmoBV([{ id: 'lrm-10', location: 'nose' }], bins),
    ).toBe(expected);
    expect(proto(['lrm-10', 'lrm-10-ammo'])).toBe(expected);
  });

  it('retains the zero-cap guards even for nonfinite ammo', () => {
    catalog({ 'lrm-10': 0, 'lrm-10-ammo': NaN });
    const bins = [{ id: 'a', weaponType: 'lrm-10', bv: NaN }];
    expect(
      calculateAmmoBVWithExcessiveCap([{ id: 'lrm-10', bv: 0 }], bins),
    ).toBe(0);
    expect(
      calculateAerospaceAmmoBV([{ id: 'lrm-10', location: 'nose' }], bins),
    ).toBe(0);
    expect(proto(['lrm-10', 'lrm-10-ammo'])).toBe(0);
  });

  it('retains empty-ammo guards without looking up weapons', () => {
    expect(
      calculateAmmoBVWithExcessiveCap([{ id: 'lrm-10', bv: 30 }], []),
    ).toBe(0);
    expect(
      calculateAerospaceAmmoBV([{ id: 'lrm-10', location: 'nose' }], []),
    ).toBe(0);
    expect(resolveEquipmentBV).not.toHaveBeenCalled();
  });
});

describe('shared offensive cap boundary', () => {
  it('distinguishes an absent cap from an explicit zero or negative cap', () => {
    const caps: Record<string, number> = { zero: 0, negative: -2, positive: 7 };
    expect(
      sumCappedAmmoBV(
        { missing: Infinity, zero: -4, negative: 12, positive: 30 },
        (type) => caps[type],
      ),
    ).toBe(1);
  });

  it('preserves floating-point encounter order and zero initialization', () => {
    const groups: Record<string, number> = {};
    for (const bv of [1e16, 1, -1e16]) addBVToAmmoCapGroup(groups, 'a', bv);
    addBVToAmmoCapGroup(groups, 'b', -0);
    expect(groups.a).toBe(0);
    expect(Object.is(groups.b, 0)).toBe(true);
  });

  it('propagates a nonfinite represented cap without evaluating omitted groups', () => {
    expect(sumCappedAmmoBV({ a: 10 }, () => NaN)).toBeNaN();
    expect(sumCappedAmmoBV({ a: NaN }, () => undefined)).toBe(0);
    expect(sumCappedAmmoBV({ a: Infinity }, () => 5)).toBe(5);
  });
});
