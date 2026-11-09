import prime from '../../../../../public/data/units/vehicles/Boreas Cavalry Hovercraft (Prime).json';
import boreas from '../../../../../public/data/units/vehicles/Boreas Cavalry Hovercraft A.json';
import ibex from '../../../../../public/data/units/vehicles/Ibex RV.json';
import limpet from '../../../../../public/data/units/vehicles/Limpet Half-Track.json';
import monocycle from '../../../../../public/data/units/vehicles/Monocycle.json';
import rover from '../../../../../public/data/units/vehicles/Rock Rover Half-Track RRV.json';
import { contractVehicleToBVUnit } from '../../contractBVUnitAdapter';
import { getNativeInfantryClipFacts } from '../../equipmentBV/nativeInfantryClipFacts';
import {
  initializeVehicleInfantryClip,
  projectVehicleAmmoPools,
  resolveVehicleInfantryClip,
} from '../vehicleAmmoPools';
import { toVehicleBVInputFromUnit } from '../vehicleBVAdapter';
import { calculateVehicleBV } from '../vehicleBVCalculator';
import { baseInput } from './vehicleBV.test.helpers';

/** @spec openspec/changes/establish-all-unit-data-parity/specs/battle-value-system/spec.md */
describe('implicit infantry ammunition on vehicles (MegaMek 48fcb2f64)', () => {
  it.each([boreas, prime, monocycle, limpet, rover])(
    '$id has one zero-valued availability group without a launcher cap',
    (source) => {
      const input = toVehicleBVInputFromUnit(contractVehicleToBVUnit(source));
      const before = JSON.stringify(input);
      const result = calculateVehicleBV(input);
      expect(result.ammoPools?.available).toEqual({ 'INFANTRY:0': 0 });
      expect(result.ammoPools?.cap).not.toHaveProperty('INFANTRY:0');
      expect(result.ammoBV).toBe(0);
      expect(result).toHaveProperty(['ammo.available.INFANTRY:0'], 0);
      expect(JSON.stringify(input)).toBe(before);
    },
  );

  it('the unarmed Ibex RV has no implicit ammo group', () => {
    const result = calculateVehicleBV(
      toVehicleBVInputFromUnit(contractVehicleToBVUnit(ibex)),
    );
    expect(result.ammoPools?.available ?? {}).not.toHaveProperty('INFANTRY:0');
    expect(Object.hasOwn(result, 'ammo.available.INFANTRY:0')).toBe(false);
  });

  it.each([
    { id: 'machine-gun-support-registry', support: false },
    { id: 'CLBALightMG', support: true },
    { id: 'Sword', support: true },
    { id: 'unresolved-infantry-weapon', support: true },
  ])('does not invent ammo for $id (support=$support)', ({ id, support }) => {
    const result = calculateVehicleBV(
      baseInput({
        isSupportVehicle: support,
        weapons: [{ id, location: 'Front', isInfantry: true }],
      }),
    );
    expect(result.ammoPools?.available ?? {}).not.toHaveProperty('INFANTRY:0');
    expect(Object.hasOwn(result, 'ammo.available.INFANTRY:0')).toBe(false);
  });

  it.each([
    ['', 21],
    [':SIZE:0', 21],
    [':SIZE:0.5', 21],
    [':SIZE:1', 21],
    [':SIZE:1.5', 21],
    [':SIZE:2', 42],
    [':SIZE:2.9', 42],
  ])('initializes native clips before applying size %s', (qualifier, shots) => {
    // Pinned BLKFile.java:377-385; independently loaded size-spliced Boreas A.
    const clip = resolveVehicleInfantryClip(
      'support-laser-semi-portable-registry' + qualifier,
    );
    expect(clip).toEqual({
      group: 'INFANTRY:0',
      battleValue: 0,
      usableShots: shots,
    });
  });

  it('retains the native clip counts on the size-10 rifles and size-2 laser', () => {
    expect(
      resolveVehicleInfantryClip('InfantryAssaultRifle(PT):SIZE:10.0')
        ?.usableShots,
    ).toBe(300);
    expect(
      resolveVehicleInfantryClip('Support Laser:SIZE:2.0')?.usableShots,
    ).toBe(30);
  });

  it.each([
    [102261126, 2147483646],
    [102261127, undefined],
    [2147483647, 2147483627],
    [2147483648, 2147483627],
  ])('preserves Java int32 clip initialization for size %s', (size, shots) => {
    // Independently loaded Boreas A: double-to-int saturation, then int overflow.
    expect(
      resolveVehicleInfantryClip(
        `support-laser-semi-portable-registry:SIZE:${size}`,
      )?.usableShots,
    ).toBe(shots);
  });

  it('uses the existing source year when native admission varies by year', () => {
    const id = 'Laser Rifle (Mauser IIC IAS):OMNI:SIZE:1.0';
    expect(resolveVehicleInfantryClip(id)).toBeUndefined();
    expect(resolveVehicleInfantryClip(id, 3015)).toEqual({
      group: 'INFANTRY:0',
      battleValue: 0,
      usableShots: 6,
    });
    expect(resolveVehicleInfantryClip(id, Number.NaN)).toBeUndefined();
  });

  it('initializes the uncatalogued wire-guided launcher from native facts', () => {
    // Dune Buggy's second weapon: pinned InfantrySupportWireGuidedMissileWeapon.
    expect(
      resolveVehicleInfantryClip('wire-guided-missile-launcher:size:1.0', 2010),
    ).toEqual({
      group: 'INFANTRY:0',
      battleValue: 0,
      usableShots: 1,
    });
  });

  it('canonical, native and qualified identities initialize the same one-clip facts', () => {
    const expected = { group: 'INFANTRY:0', battleValue: 0, usableShots: 100 };
    for (const id of [
      'machine-gun-support-registry',
      'InfantrySupportMG',
      'machine-gun-supportpt:size:1.0',
    ])
      expect(resolveVehicleInfantryClip(id)).toEqual(expected);
    expect(getNativeInfantryClipFacts('InfantrySupportMG')).toMatchObject({
      infantryWeapon: true,
      ammoType: 'INFANTRY',
      rackSize: 0,
      clipShots: 100,
      oneShot: false,
      oneShotAmmoAdmitted: true,
    });
  });

  it('empty, intrinsic one-shot, rejected and context-dependent facts stay absent', () => {
    const facts = getNativeInfantryClipFacts('InfantrySupportMG');
    expect(facts).toBeDefined();
    if (!facts) throw Error('Missing pinned infantry MG facts');
    for (const patch of [
      { clipShots: 0 },
      { oneShot: true },
      { oneShotAmmoAdmitted: false },
      { oneShotAmmoAdmitted: null },
      { ammoType: 'NA' },
    ])
      expect(
        initializeVehicleInfantryClip('InfantrySupportMG', {
          ...facts,
          ...patch,
        }),
      ).toBeUndefined();
    expect(initializeVehicleInfantryClip('unknown', undefined)).toBeUndefined();
    expect(
      initializeVehicleInfantryClip('InfantrySupportMG:SIZE:NaN', facts),
    ).toBeUndefined();
    expect(
      initializeVehicleInfantryClip('InfantrySupportMG:SIZE:Infinity', facts),
    ).toBeUndefined();
  });

  it('adds diagnostics without changing frozen arithmetic pools, caps or caller mounts', () => {
    const pools = Object.freeze({
      total: 3,
      available: Object.freeze({ 'SRM:2': 3 }),
      cap: Object.freeze({ 'SRM:2': 21, 'AMS:2': 32 }),
    });
    const input = baseInput({
      isSupportVehicle: true,
      weapons: [
        Object.freeze({ id: 'InfantrySupportMG', location: 'Front' }),
        Object.freeze({ id: 'InfantrySupportMG', location: 'Front' }),
      ],
    });
    Object.freeze(input.weapons);
    Object.freeze(input);
    const before = JSON.stringify({ pools, input });
    const result = projectVehicleAmmoPools(input, pools, () => {
      throw Error('No defensive mount');
    });
    expect(result).toEqual({
      available: { 'SRM:2': 3, 'INFANTRY:0': 0 },
      cap: pools.cap,
    });
    expect(JSON.stringify({ pools, input })).toBe(before);
  });
});
