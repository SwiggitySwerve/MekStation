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
