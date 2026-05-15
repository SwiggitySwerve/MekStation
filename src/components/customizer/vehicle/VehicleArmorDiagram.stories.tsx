import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { useMemo } from 'react';

import type { ITurretConfiguration } from '@/types/unit/VehicleInterfaces';

import {
  createNewVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { TechBase } from '@/types/enums/TechBase';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VehicleArmorDiagram } from './VehicleArmorDiagram';

/**
 * Wrap a story in a VehicleStoreContext provider. The diagram reads the active
 * vehicle entirely from the store, so each story spins up its own store with
 * the create-options + an optional seed callback for post-creation state.
 */
function withVehicleStore(
  options: Parameters<typeof createNewVehicleStore>[0],
  seed?: (store: ReturnType<typeof createNewVehicleStore>) => void,
): Decorator {
  return function VehicleStoreDecorator(Story) {
    const store = useMemo(() => {
      const s = createNewVehicleStore(options);
      seed?.(s);
      return s;
    }, []);
    return (
      <VehicleStoreContext.Provider value={store}>
        <Story />
      </VehicleStoreContext.Provider>
    );
  };
}

const baseOptions = {
  name: 'Story Vehicle',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
} as const;

const turret: ITurretConfiguration = {
  type: TurretType.SINGLE,
  maxWeight: 10,
  currentWeight: 0,
  rotationArc: 360,
};

const meta: Meta<typeof VehicleArmorDiagram> = {
  title: 'Customizer/Armor/VehicleArmorDiagram',
  component: VehicleArmorDiagram,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof VehicleArmorDiagram>;

/** Ground vehicle, 4 base locations only. */
export const Default: Story = {
  decorators: [withVehicleStore(baseOptions)],
};

/** VTOL — adds the conditional Rotor location. */
export const VTOL: Story = {
  decorators: [
    withVehicleStore({
      ...baseOptions,
      motionType: GroundMotionType.VTOL,
      unitType: UnitType.VTOL,
    }),
  ],
};

/** Both turrets present — exercises the Turret + Turret 2 conditional rows. */
export const SecondaryTurret: Story = {
  decorators: [
    withVehicleStore(baseOptions, (store) => {
      store.setState({ turret, secondaryTurret: turret });
    }),
  ],
};
