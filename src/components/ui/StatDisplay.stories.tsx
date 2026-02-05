import type { Meta, StoryObj } from '@storybook/react';

import {
  StatRow,
  StatList,
  StatCard,
  StatGrid,
  SimpleStatCard,
} from './StatDisplay';

const meta: Meta<typeof StatRow> = {
  title: 'UI/StatDisplay',
  component: StatRow,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof StatRow>;

export const SingleStatRow: Story = {
  args: {
    label: 'Engine',
    value: 'Fusion 300 XL',
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const HighlightedStat: Story = {
  args: {
    label: 'Status',
    value: 'VALID',
    highlight: true,
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const ColoredValue: Story = {
  args: {
    label: 'Heat',
    value: '+15',
    valueColor: 'red',
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
};

export const StatListExample: StoryObj = {
  render: () => (
    <div className="w-80">
      <StatList>
        <StatRow label="Tonnage" value="75 tons" />
        <StatRow label="Walking MP" value="4" />
        <StatRow label="Running MP" value="6" />
        <StatRow label="Jumping MP" value="4" valueColor="cyan" />
      </StatList>
    </div>
  ),
};

export const StatCardExample: StoryObj = {
  render: () => (
    <div className="w-80">
      <StatCard title="Movement" variant="amber">
        <StatList>
          <StatRow label="Walk" value="4" />
          <StatRow label="Run" value="6" />
          <StatRow label="Jump" value="4" />
        </StatList>
      </StatCard>
    </div>
  ),
};

export const StatCardVariants: StoryObj = {
  render: () => (
    <div className="grid max-w-2xl grid-cols-2 gap-4">
      <StatCard title="Weapons" variant="rose">
        <StatList>
          <StatRow label="PPC" value="2" />
          <StatRow label="Medium Laser" value="4" />
        </StatList>
      </StatCard>
      <StatCard title="Armor" variant="cyan">
        <StatList>
          <StatRow label="Type" value="Standard" />
          <StatRow label="Total" value="231 pts" />
        </StatList>
      </StatCard>
      <StatCard title="Engine" variant="emerald">
        <StatList>
          <StatRow label="Type" value="XL" />
          <StatRow label="Rating" value="300" />
        </StatList>
      </StatCard>
      <StatCard title="Heat" variant="violet">
        <StatList>
          <StatRow label="Sinks" value="12" />
          <StatRow label="Dissipation" value="24" />
        </StatList>
      </StatCard>
    </div>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const StatGridExample: StoryObj = {
  render: () => (
    <StatGrid cols={3}>
      <SimpleStatCard value="75" label="Tonnage" valueColor="amber" />
      <SimpleStatCard value="4/6/4" label="Movement" valueColor="cyan" />
      <SimpleStatCard value="2.45" label="Battle Value" valueColor="emerald" />
    </StatGrid>
  ),
  parameters: {
    layout: 'padded',
  },
};

export const SimpleStatCardLoading: StoryObj = {
  render: () => (
    <div className="w-48">
      <SimpleStatCard value="" label="Loading" loading />
    </div>
  ),
};

export const AllValueColors: StoryObj = {
  render: () => (
    <div className="w-80">
      <StatList>
        <StatRow label="White (default)" value="100" valueColor="white" />
        <StatRow label="Amber" value="100" valueColor="amber" />
        <StatRow label="Cyan" value="100" valueColor="cyan" />
        <StatRow label="Emerald" value="100" valueColor="emerald" />
        <StatRow label="Red" value="100" valueColor="red" />
        <StatRow label="Orange" value="100" valueColor="orange" />
      </StatList>
    </div>
  ),
};
