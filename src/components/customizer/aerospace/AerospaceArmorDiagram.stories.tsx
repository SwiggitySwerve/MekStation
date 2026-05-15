import type { Decorator, Meta, StoryObj } from '@storybook/react';

import { useMemo } from 'react';

import {
  AerospaceStoreContext,
  createNewAerospaceStore,
} from '@/stores/useAerospaceStore';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';

import { AerospaceArmorDiagram } from './AerospaceArmorDiagram';

/**
 * Wrap a story in an AerospaceStoreContext provider. The diagram reads the
 * active aerospace unit from the store; each story creates its own store and
 * may seed post-creation state through the optional callback.
 */
function withAerospaceStore(
  options: Parameters<typeof createNewAerospaceStore>[0],
  seed?: (store: ReturnType<typeof createNewAerospaceStore>) => void,
): Decorator {
  return function AerospaceStoreDecorator(Story) {
    const store = useMemo(() => {
      const s = createNewAerospaceStore(options);
      seed?.(s);
      return s;
    }, []);
    return (
      <AerospaceStoreContext.Provider value={store}>
        <Story />
      </AerospaceStoreContext.Provider>
    );
  };
}

const baseOptions = {
  name: 'Story Fighter',
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
} as const;

const meta: Meta<typeof AerospaceArmorDiagram> = {
  title: 'Customizer/Armor/AerospaceArmorDiagram',
  component: AerospaceArmorDiagram,
  tags: ['autodocs'],
};
export default meta;

type Story = StoryObj<typeof AerospaceArmorDiagram>;

/** Aerospace fighter — 4 arcs at construction-spec caps (50t nose = 14). */
export const Default: Story = {
  decorators: [withAerospaceStore(baseOptions)],
};

/** Small craft — arc caps shift to the small-craft arc-factor table. */
export const SmallCraft: Story = {
  decorators: [
    withAerospaceStore({ ...baseOptions, tonnage: 150 }, (store) => {
      store.setState({ aerospaceSubType: AerospaceSubType.SMALL_CRAFT });
    }),
  ],
};

/** Over-cap allocation — the Nose arc holds more than its diagram cap. */
export const OverCap: Story = {
  decorators: [
    withAerospaceStore(baseOptions, (store) => {
      store.setState((s) => ({
        armorAllocation: {
          ...s.armorAllocation,
          [AerospaceLocation.NOSE]: 200,
        },
      }));
    }),
  ],
};
