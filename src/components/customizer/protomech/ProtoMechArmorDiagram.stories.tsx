import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { useMemo } from 'react';

import {
  createNewProtoMechStore,
  ProtoMechStoreContext,
} from '@/stores/useProtoMechStore';
import { ProtoChassis } from '@/types/unit/ProtoMechInterfaces';

import { ProtoMechArmorDiagram } from './ProtoMechArmorDiagram';

/**
 * Wrap a story in a ProtoMechStoreContext provider. The diagram reads tonnage,
 * hasMainGun, and armorByLocation from the store; each story creates its own
 * store and may seed post-creation state through the optional callback.
 */
function withProtoMechStore(
  options: Parameters<typeof createNewProtoMechStore>[0],
  seed?: (store: ReturnType<typeof createNewProtoMechStore>) => void,
): Decorator {
  return function ProtoMechStoreDecorator(Story) {
    const store = useMemo(() => {
      const s = createNewProtoMechStore(options);
      seed?.(s);
      return s;
    }, []);
    return (
      <ProtoMechStoreContext.Provider value={store}>
        <Story />
      </ProtoMechStoreContext.Provider>
    );
  };
}

const meta: Meta<typeof ProtoMechArmorDiagram> = {
  title: 'Customizer/Armor/ProtoMechArmorDiagram',
  component: ProtoMechArmorDiagram,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof ProtoMechArmorDiagram>;

/** Biped ProtoMech — 5 standard locations (Head / Torso / LA / RA / Legs). */
export const Default: Story = {
  decorators: [
    withProtoMechStore({
      name: 'Story ProtoMech',
      tonnage: 6,
      chassisType: ProtoChassis.BIPED,
    }),
  ],
};

/** Quad ProtoMech with a Main Gun — adds the conditional Main Gun location. */
export const Quad: Story = {
  decorators: [
    withProtoMechStore(
      {
        name: 'Story ProtoMech',
        tonnage: 6,
        chassisType: ProtoChassis.QUAD,
      },
      (store) => store.setState({ hasMainGun: true }),
    ),
  ],
};
