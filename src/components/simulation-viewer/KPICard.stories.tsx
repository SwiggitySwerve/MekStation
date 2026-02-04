import type { Meta, StoryObj } from '@storybook/react';
import { KPICard } from './KPICard';

const meta: Meta<typeof KPICard> = {
  title: 'Simulation/KPICard',
  component: KPICard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    comparisonDirection: {
      control: 'select',
      options: ['up', 'down', 'neutral'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof KPICard>;

const sampleTrendUp = [0.60, 0.63, 0.65, 0.68, 0.72, 0.75, 0.78, 0.80];
const sampleTrendDown = [0.85, 0.82, 0.78, 0.74, 0.70, 0.68, 0.65, 0.60];
const sampleTrendFlat = [0.50, 0.51, 0.49, 0.50, 0.51, 0.50, 0.49, 0.50];

export const Default: Story = {
  args: {
    label: 'Win Rate',
    value: '80%',
    comparison: '+5% vs last week',
    comparisonDirection: 'up',
    trend: sampleTrendUp,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const PositiveComparison: Story = {
  args: {
    label: 'Damage Output',
    value: '1,250',
    comparison: '+12% increase',
    comparisonDirection: 'up',
    trend: sampleTrendUp,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const NegativeComparison: Story = {
  args: {
    label: 'Survival Rate',
    value: '60%',
    comparison: '-15% decline',
    comparisonDirection: 'down',
    trend: sampleTrendDown,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const NeutralComparison: Story = {
  args: {
    label: 'Heat Efficiency',
    value: '50%',
    comparison: 'No change',
    comparisonDirection: 'neutral',
    trend: sampleTrendFlat,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const WithoutComparison: Story = {
  args: {
    label: 'Total Engagements',
    value: 142,
    trend: [10, 15, 12, 18, 22, 25, 30, 28],
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const WithoutTrend: Story = {
  args: {
    label: 'Armor Remaining',
    value: '231 pts',
    comparison: '-8% from start',
    comparisonDirection: 'down',
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const Clickable: Story = {
  args: {
    label: 'Kill/Death Ratio',
    value: '2.4',
    comparison: '+0.3 improvement',
    comparisonDirection: 'up',
    trend: [1.8, 1.9, 2.0, 2.1, 2.1, 2.2, 2.3, 2.4],
    onClick: () => alert('Drill-down: K/D Ratio details'),
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const DarkMode: Story = {
  args: {
    label: 'Accuracy',
    value: '72%',
    comparison: '+3% this session',
    comparisonDirection: 'up',
    trend: [0.65, 0.67, 0.68, 0.70, 0.71, 0.72],
  },
  decorators: [
    (Story) => (
      <div className="dark bg-gray-900 p-8 rounded-lg w-80">
        <Story />
      </div>
    ),
  ],
};

export const AllVariants: StoryObj = {
  render: () => (
    <div className="grid grid-cols-2 gap-4 max-w-2xl">
      <KPICard
        label="Win Rate"
        value="80%"
        comparison="+5%"
        comparisonDirection="up"
        trend={sampleTrendUp}
      />
      <KPICard
        label="Losses"
        value="12"
        comparison="-3 fewer"
        comparisonDirection="down"
        trend={sampleTrendDown}
      />
      <KPICard
        label="Draws"
        value="4"
        comparison="No change"
        comparisonDirection="neutral"
        trend={sampleTrendFlat}
      />
      <KPICard
        label="Total Games"
        value="96"
      />
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const DarkModeGrid: StoryObj = {
  render: () => (
    <div className="dark bg-gray-900 p-8 rounded-lg">
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <KPICard
          label="BV Efficiency"
          value="1.8x"
          comparison="+0.2"
          comparisonDirection="up"
          trend={[1.4, 1.5, 1.5, 1.6, 1.7, 1.7, 1.8]}
        />
        <KPICard
          label="Avg Heat"
          value="18"
          comparison="+4 higher"
          comparisonDirection="down"
          trend={[12, 14, 15, 16, 17, 18]}
        />
        <KPICard
          label="Rounds Per Game"
          value="14"
          comparison="Stable"
          comparisonDirection="neutral"
          trend={[13, 14, 14, 15, 14, 14]}
        />
        <KPICard
          label="Units Fielded"
          value="248"
          onClick={() => alert('Drill-down')}
        />
      </div>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};
