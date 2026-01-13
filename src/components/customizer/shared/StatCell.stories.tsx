import type { Meta, StoryObj } from '@storybook/react';
import { StatCell } from './StatCell';

const meta: Meta<typeof StatCell> = {
  title: 'Customizer/Shared/StatCell',
  component: StatCell,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Displays a single statistic with label and value for unit info displays.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'warning', 'error', 'success'],
    },
  },
};
export default meta;

type Story = StoryObj<typeof StatCell>;

export const Default: Story = {
  args: {
    label: 'Tonnage',
    value: 100,
  },
};

export const WithUnit: Story = {
  args: {
    label: 'Walking Speed',
    value: 4,
    unit: 'MP',
  },
};

export const Success: Story = {
  args: {
    label: 'Heat Capacity',
    value: 30,
    variant: 'success',
  },
};

export const Warning: Story = {
  args: {
    label: 'Heat Generation',
    value: 28,
    variant: 'warning',
  },
};

export const Error: Story = {
  args: {
    label: 'Heat Delta',
    value: '+5',
    variant: 'error',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-6 p-4 bg-slate-900 rounded">
      <StatCell label="Default" value={50} />
      <StatCell label="Success" value={30} variant="success" />
      <StatCell label="Warning" value={28} variant="warning" />
      <StatCell label="Error" value={35} variant="error" />
    </div>
  ),
};

export const UnitStatsRow: Story = {
  render: () => (
    <div className="flex gap-6 p-4 bg-slate-900 rounded justify-around">
      <StatCell label="Tonnage" value={75} unit="t" />
      <StatCell label="Walk" value={4} unit="MP" />
      <StatCell label="Run" value={6} unit="MP" />
      <StatCell label="Jump" value={0} unit="MP" variant="warning" />
    </div>
  ),
};
