import { getNodeCanonicalUnitService } from '@/services/units/NodeCanonicalUnitService';
import { UnitContract } from '@/types/contracts';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { getMachineGunArrayBVGroup } from '../../battleValueAmmo';
import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';
import { getEquipmentEntry } from '../../equipmentBVResolver';
import { calculateVehicleOffensiveBV } from '../vehicleBVOffensive';
import { baseInput } from './vehicleBV.test.helpers';

// MegaMek 48fcb2f64 BVCalculator.java:807-816; MekFileParser.java:928-944.
it('retains the linked 13.4 BV addition on native Puma PAT-007', () => {
  const unit = UnitContract.parse(
    getNodeCanonicalUnitService().getByIdSync(
      'vehicles:puma-assault-tank-pat-007',
    ),
  );
  if (
    unit.unitType !== UnitType.VEHICLE ||
    unit.tonnage === undefined ||
    !unit.armor ||
    !unit.movement
  )
    throw new Error('Expected complete Puma vehicle');
  const source = {
    ...unit,
    tonnage: unit.tonnage,
    armor: unit.armor,
    movement: unit.movement as IContractBVSource['movement'],
  };
  const withArray = calculateBattleValueForUnit(contractUnitToBVUnit(source));
  const without = calculateBattleValueForUnit(
    contractUnitToBVUnit({
      ...source,
      equipment: source.equipment?.filter(
        (w) => !getMachineGunArrayBVGroup(getEquipmentEntry(w.id)?.id ?? w.id),
      ),
    }),
  );
  if (withArray?.kind !== 'vehicle' || without?.kind !== 'vehicle')
    throw new Error('Expected vehicle dispatch');
  expect(withArray.breakdown.weaponBV - without.breakdown.weaponBV).toBeCloseTo(
    13.4,
    8,
  );
});
it('uses shared array links without changing caller mounts', () => {
  const input = baseInput({
    weapons: ['machine-gun', 'machine-gun', 'mga'].map((id) => ({
      id,
      location: 'Front',
    })),
  });
  const before = JSON.stringify(input);
  expect(calculateVehicleOffensiveBV(input).weaponBV).toBeCloseTo(16.7, 8);
  expect(JSON.stringify(input)).toBe(before);
  expect(
    calculateVehicleOffensiveBV(
      baseInput({ weapons: [{ id: 'mga', location: 'Front' }] }),
    ).weaponBV,
  ).toBe(0);
});

it('retains an explicit caller array BV override', () => {
  const input = baseInput({
    weapons: [
      { id: 'machine-gun', location: 'Front' },
      { id: 'machine-gun', location: 'Front' },
      { id: 'mga', location: 'Front', bvOverride: 42 },
    ],
  });
  expect(calculateVehicleOffensiveBV(input).weaponBV).toBe(52);
});
