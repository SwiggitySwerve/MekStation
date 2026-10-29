import { createVehicleStore } from '@/stores/useVehicleStore';
import { createDefaultVehicleState } from '@/stores/vehicleState';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType as M } from '@/types/unit/BaseUnitInterfaces';

it.each([M.TRACKED, M.HOVER, M.VTOL])(
  'characterizes existing rating derivation for %s',
  (motionType) => {
    const store = createVehicleStore(
      createDefaultVehicleState({
        name: 'Characterization',
        tonnage: 52,
        techBase: TechBase.INNER_SPHERE,
        motionType,
      }),
    );
    expect(store.getState().engineRating).toBe(208);
    store.getState().setCruiseMP(3);
    expect(store.getState().engineRating).toBe(156);
    store.getState().setTonnage(200);
    expect(store.getState().engineRating).toBe(400);
    store.getState().setCruiseMP(0);
    expect(store.getState().engineRating).toBe(0);
  },
);
