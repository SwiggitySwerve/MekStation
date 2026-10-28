/**
 * derivePowerAmpWeightLogic — which mounted equipment needs amplifiers.
 */

import type { IEquipmentItem } from '@/types/equipment';

import { derivePowerAmpWeightLogic } from '@/stores/useVehicleStore.actions';
import {
  createDefaultVehicleState,
  type VehicleStore,
} from '@/stores/vehicleState';
import { EngineType } from '@/types/construction/EngineType';
import { VehicleLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { EquipmentCategory } from '@/types/equipment/EquipmentCategory';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

function energyItem(
  id: string,
  weight: number,
  special?: string[],
): IEquipmentItem {
  return {
    id,
    name: id,
    category: EquipmentCategory.ENERGY_WEAPON,
    weight,
    special,
  } as unknown as IEquipmentItem;
}

function stateWith(engineType: EngineType, equipmentIds: string[]) {
  return {
    ...createDefaultVehicleState({
      name: 'Test Tank',
      tonnage: 50,
      techBase: TechBase.INNER_SPHERE,
      motionType: GroundMotionType.TRACKED,
    }),
    engineType,
    equipment: equipmentIds.map((equipmentId, i) => ({
      id: `eq-${i}`,
      equipmentId,
      name: equipmentId,
      location: VehicleLocation.BODY,
      isRearMounted: false,
      isTurretMounted: false,
      isSponsonMounted: false,
    })),
  } as unknown as VehicleStore;
}

const MEDIUM_LASER = energyItem('medium-laser', 1);
const VEHICLE_FLAMER = energyItem('vehicle-flamer', 0.5, ['Requires ammo']);
const CHEMICAL_LASER = energyItem('clan-medium-chemical-laser', 1, [
  'Requires ammo',
]);
const ITEMS = [MEDIUM_LASER, VEHICLE_FLAMER, CHEMICAL_LASER];

describe('derivePowerAmpWeightLogic', () => {
  it('sizes amplifiers from ordinary lasers on an ICE engine', () => {
    const state = stateWith(EngineType.ICE, ['medium-laser']);
    expect(derivePowerAmpWeightLogic(state, ITEMS).powerAmpWeight).toBe(0.5);
  });

  it.each([
    [
      'a fission engine with a medium laser',
      EngineType.FISSION,
      'medium-laser',
    ],
    ['an ICE engine with a vehicle flamer', EngineType.ICE, 'vehicle-flamer'],
    [
      'an ICE engine with a Clan medium chemical laser',
      EngineType.ICE,
      'clan-medium-chemical-laser',
    ],
  ])('needs none for %s', (_name, engineType, equipmentId) => {
    const state = stateWith(engineType, [equipmentId]);
    expect(derivePowerAmpWeightLogic(state, ITEMS).powerAmpWeight).toBe(0);
  });
});
