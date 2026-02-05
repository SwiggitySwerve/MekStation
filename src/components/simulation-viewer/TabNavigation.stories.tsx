import type { Meta, StoryObj } from '@storybook/react';

import React, { useState } from 'react';

import { TabNavigation } from './TabNavigation';

const meta: Meta<typeof TabNavigation> = {
  title: 'Simulation/TabNavigation',
  component: TabNavigation,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
  argTypes: {
    activeTab: {
      control: 'select',
      options: ['campaign-dashboard', 'encounter-history', 'analysis-bugs'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof TabNavigation>;

export const CampaignDashboard: Story = {
  args: {
    activeTab: 'campaign-dashboard',
    onTabChange: (tab: string) => alert(`Tab: ${tab}`),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const EncounterHistory: Story = {
  args: {
    activeTab: 'encounter-history',
    onTabChange: (tab: string) => alert(`Tab: ${tab}`),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

export const AnalysisBugs: Story = {
  args: {
    activeTab: 'analysis-bugs',
    onTabChange: (tab: string) => alert(`Tab: ${tab}`),
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};

const InteractiveTabs = () => {
  const [active, setActive] = useState<
    'campaign-dashboard' | 'encounter-history' | 'analysis-bugs'
  >('campaign-dashboard');
  return (
    <div className="max-w-2xl">
      <TabNavigation
        activeTab={active}
        onTabChange={(t) => setActive(t as typeof active)}
      />
      <div className="rounded-b-lg border border-t-0 border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-700 dark:text-gray-300">
          Active tab: <strong>{active}</strong>
        </p>
      </div>
    </div>
  );
};

export const Interactive: StoryObj = {
  render: () => <InteractiveTabs />,
};

export const DarkMode: Story = {
  args: {
    activeTab: 'campaign-dashboard',
    onTabChange: (tab: string) => alert(`Tab: ${tab}`),
  },
  decorators: [
    (Story) => (
      <div className="dark max-w-2xl rounded-lg bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export const MobileWidth: Story = {
  args: {
    activeTab: 'encounter-history',
    onTabChange: (tab: string) => alert(`Tab: ${tab}`),
  },
  decorators: [
    (Story) => (
      <div className="max-w-xs">
        <Story />
      </div>
    ),
  ],
};
