import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { useMemo } from 'react';

import {
  AerospaceStoreContext,
  createNewAerospaceStore,
} from '@/stores/useAerospaceStore';
import {
  BattleArmorStoreContext,
  createNewBattleArmorStore,
} from '@/stores/useBattleArmorStore';
import {
  createNewInfantryStore,
  InfantryStoreContext,
} from '@/stores/useInfantryStore';
import {
  createNewProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import {
  createNewVehicleStore,
  VehicleStoreContext,
} from '@/stores/useVehicleStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { ArmorDiagramForType } from './ArmorDiagramForType';

/**
 * The dispatcher routes UnitType → per-type diagram. Each per-type diagram is
 * store-coupled, so this decorator mounts all five per-type store providers at
 * once — that lets the `unitType` arg control switch between every routable
 * type without a missing-provider crash.
 */
const withAllStores: Decorator = function AllStoresDecorator(Story) {
  const vehicle = useMemo(
    () =>
      createNewVehicleStore({
        name: 'Story Vehicle',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
    [],
  );
  const aerospace = useMemo(
    () =>
      createNewAerospaceStore({
        name: 'Story Fighter',
        tonnage: 50,
        techBase: TechBase.INNER_SPHERE,
      }),
    [],
  );
  const battleArmor = useMemo(() => createNewBattleArmorStore({}), []);
  const protoMech = useMemo(
    () => createNewProtoMechStore({ name: 'Story ProtoMech', tonnage: 6 }),
    [],
  );
  const infantry = useMemo(() => createNewInfantryStore({}), []);

  return (
    <VehicleStoreContext.Provider value={vehicle}>
      <AerospaceStoreContext.Provider value={aerospace}>
        <BattleArmorStoreContext.Provider value={battleArmor}>
          <ProtoMechStoreContext.Provider value={protoMech}>
            <InfantryStoreContext.Provider value={infantry}>
              <Story />
            </InfantryStoreContext.Provider>
          </ProtoMechStoreContext.Provider>
        </BattleArmorStoreContext.Provider>
      </AerospaceStoreContext.Provider>
    </VehicleStoreContext.Provider>
  );
};

const meta: Meta<typeof ArmorDiagramForType> = {
  title: 'Customizer/Armor/ArmorDiagramForType',
  component: ArmorDiagramForType,
  tags: ['autodocs'],
  decorators: [withAllStores],
  argTypes: {
    unitType: {
      control: 'select',
      options: Object.values(UnitType),
    },
  },
};
export default meta;

type Story = StoryObj<typeof ArmorDiagramForType>;

/** Ground vehicle — routes to VehicleArmorDiagram. */
export const Vehicle: Story = {
  args: { unitType: UnitType.VEHICLE },
};

/** Aerospace fighter — routes to AerospaceArmorDiagram. */
export const Aerospace: Story = {
  args: { unitType: UnitType.AEROSPACE },
};

/** Battle Armor — routes to BattleArmorPipGrid. */
export const BattleArmor: Story = {
  args: { unitType: UnitType.BATTLE_ARMOR },
};

/** ProtoMech — routes to ProtoMechArmorDiagram. */
export const ProtoMech: Story = {
  args: { unitType: UnitType.PROTOMECH },
};

/** Infantry — routes to InfantryPlatoonCounter. */
export const Infantry: Story = {
  args: { unitType: UnitType.INFANTRY },
};

/** Mech types fall through to the "use ArmorDiagram directly" placeholder. */
export const MechPlaceholder: Story = {
  args: { unitType: UnitType.BATTLEMECH },
};
