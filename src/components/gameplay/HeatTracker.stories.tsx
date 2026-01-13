import type { Meta, StoryObj } from '@storybook/react';
import { HeatTracker, HeatScale } from './HeatTracker';
import { useState } from 'react';

const meta: Meta<typeof HeatTracker> = {
  title: 'Gameplay/HeatTracker',
  component: HeatTracker,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof HeatTracker>;

export const Normal: Story = {
  args: {
    currentHeat: 5,
    heatScale: 'Single',
    onScaleChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Warning: Story = {
  args: {
    currentHeat: 18,
    heatScale: 'Single',
    onScaleChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Critical: Story = {
  args: {
    currentHeat: 25,
    heatScale: 'Single',
    onScaleChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const MaxHeat: Story = {
  args: {
    currentHeat: 30,
    heatScale: 'Single',
    onScaleChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Overflow: Story = {
  args: {
    currentHeat: 35,
    heatScale: 'Single',
    onScaleChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const Cooling: Story = {
  args: {
    currentHeat: 15,
    heatScale: 'Single',
    onScaleChange: () => {},
    isCooling: true,
    coolingTurns: 2,
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

export const DoubleHeatScale: Story = {
  args: {
    currentHeat: 25,
    heatScale: 'Double',
    onScaleChange: () => {},
  },
  decorators: [
    (Story) => (
      <div className="w-80">
        <Story />
      </div>
    ),
  ],
};

const InteractiveExample = () => {
  const [heat, setHeat] = useState(10);
  const [scale, setScale] = useState<HeatScale>('Single');

  return (
    <div className="w-80 space-y-4">
      <HeatTracker currentHeat={heat} heatScale={scale} onScaleChange={setScale} />
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setHeat(Math.max(0, heat - 5))}
          className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
        >
          Cool -5
        </button>
        <button
          onClick={() => setHeat(heat + 5)}
          className="px-3 py-2 bg-red-500 text-white rounded text-sm"
        >
          Heat +5
        </button>
      </div>
    </div>
  );
};

export const Interactive: StoryObj = {
  render: () => <InteractiveExample />,
};
