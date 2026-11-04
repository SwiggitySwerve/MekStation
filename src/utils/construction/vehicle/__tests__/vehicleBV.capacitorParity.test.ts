import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { UnitContract } from '@/types/contracts';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { calculateUnitBV } from '@/utils/construction/bvAdapter';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '@/utils/construction/contractBVUnitAdapter';

import { toVehicleBVInputFromUnit } from '../vehicleBVAdapter';
import { calculateVehicleOffensiveBV } from '../vehicleBVOffensive';
import { type VehicleBVInput } from '../vehicleBVTypes';

// MegaMek 48fcb2f64 MiscType.java:1322-1347 and BVCalculator.java:845-882.
describe('vehicle linked PPC capacitor BV', () => {
  it.each([
    ['schrek-ii-x-ppc-carrier', 1407],
    ['goblin-medium-tank-x', 898],
    ['kamisori-light-tank-a', 599],
    ['zephyr-hovertank-omnidrone-prime', 694],
  ])('%s matches pinned Java', (id, expected) => {
    const unit = getNodeCanonicalUnitService().getByIdSync(`vehicles:${id}`);
    expect(unit).not.toBeNull();
    expect(calculateUnitBV(unit)).toBe(expected);
  });

  const input = (caps: string[], drone = false): VehicleBVInput => ({
    motionType: GroundMotionType.TRACKED,
    cruiseMP: 0,
    flankMP: 0,
    tonnage: 0,
    totalArmorPoints: 0,
    totalStructurePoints: 0,
    chassisEquipment: [
      'targeting-computer',
      ...(drone ? ['droneoperatingsystem'] : []),
    ],
    weapons: [
      { id: 'light-ppc', location: 'turret', bvOverride: 88 },
      ...caps.map((location) => ({ id: 'ppc-capacitor', location })),
    ],
  });

  it('adds linked value after drone factor and before TC; unlinked caps add zero', () => {
    const base = calculateVehicleOffensiveBV(input([], true)).weaponBV;
    expect(
      calculateVehicleOffensiveBV(input(['turret'], true)).weaponBV - base,
    ).toBeCloseTo(44 * 1.25);
    expect(calculateVehicleOffensiveBV(input(['front'], true)).weaponBV).toBe(
      base,
    );
    expect(
      calculateVehicleOffensiveBV(input(['turret', 'turret'], true)).weaponBV -
        base,
    ).toBeCloseTo(44 * 1.25);
  });
});

it('uses domain metadata year for the native Clan PPC capacitor gate', () => {
  const source = UnitContract.parse(
    getNodeCanonicalUnitService().getByIdSync(
      'vehicles:schrek-ii-x-ppc-carrier',
    ),
  );
  if (source.unitType !== UnitType.VEHICLE)
    throw new Error('Expected a vehicle source fixture');
  if (source.tonnage === undefined || !source.movement || !source.armor)
    throw new Error('Missing fixture facts');
  const vehicle = contractUnitToBVUnit({
    ...source,
    tonnage: source.tonnage,
    armor: source.armor,
    movement: source.movement as IContractBVSource['movement'],
  });
  if (vehicle.unitType !== UnitType.VEHICLE)
    throw new Error('Expected a vehicle fixture');
  const linkedBV = (year: number) => {
    const input = toVehicleBVInputFromUnit({
      ...vehicle,
      year: undefined,
      metadata: { year },
    });
    const weapons = [
      { id: 'clan-er-ppc', location: 'turret' },
      { id: 'ppc-capacitor', location: 'turret' },
    ];
    return calculateVehicleOffensiveBV({
      ...input,
      weapons,
      armorEquipment: weapons,
      chassisEquipment: [],
      offensiveEquipment: [],
    }).weaponBV;
  };
  expect(linkedBV(3101) - linkedBV(3100)).toBeCloseTo(136);
});
