import { AerospaceArc } from '@/types/unit/AerospaceInterfaces';

import { getMachineGunArrayBVGroup } from '../battleValueAmmo';
import {
  linkAerospaceMachineGunArrayBVWeapons,
  linkMachineGunArrayBVWeapons,
} from '../equipmentBV/weaponLinks';

const group = getMachineGunArrayBVGroup('mga');
const gun = <Location>(location: Location) => ({
  location,
  baseBV: 5,
  bv: 5,
  ammoGroup: group,
});
const array = <Location>(location: Location) => ({
  location,
  baseBV: 0,
  bv: 0,
  arrayGroup: group,
});

// MegaMek 48fcb2f64: MekFileParser.java:928-944; BVCalculator.java:807-816.
// Four native MGs contribute 20 * 0.67 = 13.4, as on Puma PAT-007.
it.each([AerospaceArc.NOSE, 'Front', 0, 4])(
  'shares the no-critical-slot linking contract for location %s',
  (location) => {
    const guns = Array.from({ length: 4 }, () => gun(location));
    const linked = array(location);
    linkMachineGunArrayBVWeapons([...guns, linked]);
    expect(linked.bv).toBeCloseTo(13.4, 8);
    expect(guns.map((mount) => mount.bv)).toEqual([5, 5, 5, 5]);
  },
);

it('caps each array at four and never reuses a gun', () => {
  const first = array('Front'),
    second = array('Front');
  const guns = Array.from({ length: 6 }, () => gun('Front'));
  linkMachineGunArrayBVWeapons([...guns, first, second]);
  expect(first.bv).toBeCloseTo(13.4, 8);
  expect(second.bv).toBeCloseTo(6.7, 8);
});

it('keeps physical locations, calibers and caller-excluded ammo distinct', () => {
  const linked = array('Front');
  linkMachineGunArrayBVWeapons([
    gun('Front'),
    gun('Rear'),
    { ...gun('Front'), ammoGroup: getMachineGunArrayBVGroup('hmga') },
    { ...gun('Front'), ammoGroup: undefined },
    linked,
  ]);
  expect(linked.bv).toBeCloseTo(3.35, 8);
});

it('preserves the existing aerospace entry point for older callers', () => {
  const linked = array('Front');
  linkAerospaceMachineGunArrayBVWeapons([
    ...Array.from({ length: 4 }, () => gun('Front')),
    linked,
  ]);
  expect(linked.bv).toBeCloseTo(13.4, 8);
});

it.each([undefined, gun('Rear'), { ...gun('Front'), ammoGroup: 'other' }])(
  'stops a critical run at a nonqualifying slot: %j',
  (blocker) => {
    const guns = Array.from({ length: 6 }, () => gun('Front'));
    const first = array('Front'),
      second = array('Front');
    const slots = [undefined, ...guns.slice(0, 3), blocker, ...guns.slice(3)];
    linkMachineGunArrayBVWeapons(
      [...guns, first, second],
      new Map([['Front', slots]]),
    );
    expect([first.bv, second.bv]).toEqual([10.05, 10.05]);
  },
);

it('treats an already used gun as a blocker after linking starts', () => {
  const a = gun('Front'),
    b = gun('Front'),
    c = gun('Front'),
    d = gun('Front');
  const first = array('Front'),
    second = array('Front'),
    third = array('Front');
  linkMachineGunArrayBVWeapons(
    [a, b, c, d, first, second, third],
    new Map([['Front', [a, undefined, b, a, c, d]]]),
  );
  expect([first.bv, second.bv, third.bv]).toEqual([3.35, 3.35, 6.7]);
});

it('limits a contiguous critical run to four without reusing mounts', () => {
  const guns = Array.from({ length: 6 }, () => gun('Front'));
  const first = array('Front'),
    second = array('Front');
  linkMachineGunArrayBVWeapons(
    [...guns, first, second],
    new Map([['Front', guns]]),
  );
  expect([first.bv, second.bv]).toEqual([13.4, 6.7]);
});

it('falls back only when no critical guns were linked, including a zero BV gun', () => {
  const zero = { ...gun('Front'), baseBV: 0 };
  const other = gun('Front'),
    first = array('Front'),
    second = array('Front');
  linkMachineGunArrayBVWeapons(
    [zero, other, first, second],
    new Map([['Front', [zero, undefined]]]),
  );
  expect([first.bv, second.bv]).toEqual([0, 3.35]);
});
