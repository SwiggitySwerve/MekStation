import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import { getOffensiveBVRole } from '../../battleValueEquipment';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';

// MegaMek 48fcb2f64: Sniper.java:52-76; ArtilleryWeapon.java:60;
// BVCalculator.java:834-836,936-952; CombatVehicleBVCalculator.java:112-119.
const source: IContractBVSource = {
  id: 'SniperRear',
  unitType: 'Vehicle',
  tonnage: 60,
  motionType: 'Tracked',
  movement: { cruiseMP: 4, flankMP: 6, jumpMP: 0 },
  armor: {
    type: 'STANDARD',
    byLocation: { FRONT: 50, LEFT: 50, RIGHT: 50, REAR: 26 },
  },
  equipment: [
    { id: 'ppc', location: 'FRONT' },
    { id: 'ISSniper', location: 'REAR' },
  ],
};

it.each(['ISSniper', 'ISLongTom', 'ISThumper'])(
  '%s retains its native offensive WeaponType role',
  (id) => expect(getOffensiveBVRole(id)).toBe('weapon'),
);

it('applies nominal-rear weighting to the supported rear Sniper construction', () => {
  const result = calculateBattleValueForUnit(contractUnitToBVUnit(source));
  if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
  expect(result.breakdown.weaponBV).toBe(218.5);
  expect(result.breakdown.offensiveEquipmentBV).toBe(0);
  expect(result.breakdown.defensive).toBeCloseTo(514.08, 10);
  expect(result.breakdown.offensive).toBeCloseTo(278.32, 10);
  expect(result.breakdown.final).toBe(792);
});

it('retains the full front Sniper weapon pool and its ammo cap', () => {
  const result = calculateBattleValueForUnit(
    contractUnitToBVUnit({
      ...source,
      equipment: [
        { id: 'ISSniper', location: 'FRONT' },
        ...Array.from({ length: 10 }, () => ({
          id: 'ISSniperAmmo',
          location: 'BODY',
        })),
      ],
    }),
  );
  if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
  expect(result.breakdown.weaponBV).toBe(85);
  expect(result.breakdown.ammoBV).toBe(85);
  expect(result.breakdown.offensiveEquipmentBV).toBe(0);
});
