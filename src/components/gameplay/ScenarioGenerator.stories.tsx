import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import { ScenarioObjectiveType } from '@/types/scenario';

import { ScenarioGenerator } from './ScenarioGenerator';

const meta: Meta<typeof ScenarioGenerator> = {
  title: 'Gameplay/ScenarioGenerator',
  component: ScenarioGenerator,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <div className="w-[760px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    playerBV: 6450,
    playerUnitCount: 4,
    defaultScenarioType: ScenarioObjectiveType.Breakthrough,
    onGenerate: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ScenarioGenerator>;

export const Panel: Story = {};

export const ModalLayout: Story = {
  args: {
    variant: 'modal',
    playerBV: 9200,
    playerUnitCount: 6,
  },
  decorators: [
    (Story) => (
      <div className="w-[980px] max-w-full">
        <Story />
      </div>
    ),
  ],
};

export const LowBVForce: Story = {
  args: {
    playerBV: 1800,
    playerUnitCount: 1,
  },
};
