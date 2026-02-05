import type { Meta, StoryObj } from '@storybook/react';

import { ArmorDiagramModeSwitch } from './ArmorDiagramModeSwitch';

const meta: Meta<typeof ArmorDiagramModeSwitch> = {
  title: 'Armor/ArmorDiagramModeSwitch',
  component: ArmorDiagramModeSwitch,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="bg-surface-deep p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ArmorDiagramModeSwitch>;

export const SchematicSelected: Story = {
  parameters: {
    zustand: {
      appSettings: {
        armorDiagramMode: 'schematic',
      },
    },
  },
};

export const SilhouetteSelected: Story = {
  parameters: {
    zustand: {
      appSettings: {
        armorDiagramMode: 'silhouette',
      },
    },
  },
};
