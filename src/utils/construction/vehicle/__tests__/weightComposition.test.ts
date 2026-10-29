import { computeVehicleWeightBreakdown as facade } from '@/components/customizer/vehicle/VehicleStatusBar.utils';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { TechBase } from '@/types/enums/TechBase';

import { computeVehicleWeightBreakdown } from '../weightComposition';

it('preserves the facade and every pre-controls composition output', () => {
  const state = {
    ...createDefaultVehicleState({
      name: 'Characterization',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
    }),
    engineRating: 25,
    armorTonnage: 0,
    turret: null,
  };
  const result = computeVehicleWeightBreakdown(state, () => undefined);
  expect(facade(state, () => undefined)).toEqual(result);
  expect(result).toEqual({
    engine: 1,
    structure: 5,
    armor: 0,
    equipment: 0,
    turret: 0,
    secondaryTurret: 0,
    powerAmplifiers: 0,
    turretEquipment: 0,
    secondaryTurretEquipment: 0,
    turretMounted: 0,
    energyWeapons: 0,
    remaining: 44,
  });
});
