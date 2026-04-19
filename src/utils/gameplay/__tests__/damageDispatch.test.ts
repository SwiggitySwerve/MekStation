/**
 * Damage-dispatch tests (unit-type routing).
 *
 * @spec openspec/changes/add-vehicle-combat-behavior/specs/combat-resolution/spec.md
 *   #requirement vehicle-combat-dispatch
 */

import {
  VehicleLocation,
  VTOLLocation,
} from '@/types/construction/UnitLocation';
import { IVehicleHitLocationResult } from '@/types/gameplay';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';

import type { IUnitDamageState } from '../damage/types';

import { dispatchDamage } from '../damageDispatch';
import { createVehicleCombatState } from '../vehicleDamage';

describe('damageDispatch', () => {
  it('routes vehicle input to vehicleResolveDamage', () => {
    const state = createVehicleCombatState({
      unitId: 'tank-1',
      motionType: GroundMotionType.TRACKED,
      originalCruiseMP: 4,
      armor: {
        [VehicleLocation.FRONT]: 10,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
      structure: {
        [VehicleLocation.FRONT]: 5,
      } as Partial<Record<VehicleLocation | VTOLLocation, number>>,
    });

    const hit: IVehicleHitLocationResult = {
      dice: [3, 4],
      roll: 7,
      direction: 'front',
      location: 'front',
      isTAC: false,
    };

    const r = dispatchDamage({
      kind: 'vehicle',
      state,
      hit,
      damage: 3,
    });

    expect(r.kind).toBe('vehicle');
    if (r.kind === 'vehicle') {
      expect(r.result.locationDamages[0].armorDamage).toBe(3);
      expect(r.result.locationDamages[0].structureExposed).toBe(false);
    }
  });

  it('routes mech input to resolveDamage (returns mech-kind result)', () => {
    const mechState: IUnitDamageState = {
      armor: {
        head: 9,
        center_torso: 30,
        center_torso_rear: 10,
        left_torso: 20,
        left_torso_rear: 8,
        right_torso: 20,
        right_torso_rear: 8,
        left_arm: 16,
        right_arm: 16,
        left_leg: 20,
        right_leg: 20,
      },
      rearArmor: {
        center_torso: 10,
        left_torso: 8,
        right_torso: 8,
      },
      structure: {
        head: 3,
        center_torso: 14,
        center_torso_rear: 14,
        left_torso: 10,
        left_torso_rear: 10,
        right_torso: 10,
        right_torso_rear: 10,
        left_arm: 8,
        right_arm: 8,
        left_leg: 10,
        right_leg: 10,
      },
      destroyedLocations: [],
      pilotWounds: 0,
      pilotConscious: true,
      destroyed: false,
    };

    const r = dispatchDamage({
      kind: 'mech',
      state: mechState,
      location: 'right_arm',
      damage: 5,
    });

    expect(r.kind).toBe('mech');
    if (r.kind === 'mech') {
      expect(r.result.locationDamages.length).toBeGreaterThan(0);
    }
  });
});
