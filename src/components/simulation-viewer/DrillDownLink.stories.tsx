import type { Meta, StoryObj } from '@storybook/react';

import { DrillDownLink } from './DrillDownLink';

const meta: Meta<typeof DrillDownLink> = {
  title: 'Simulation/DrillDownLink',
  component: DrillDownLink,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    targetTab: {
      control: 'select',
      options: ['campaign-dashboard', 'encounter-history', 'analysis-bugs'],
    },
    icon: {
      control: 'select',
      options: [
        'arrow-right',
        'external-link',
        'chevron-right',
        'filter',
        'search',
      ],
    },
  },
};

export default meta;
type Story = StoryObj<typeof DrillDownLink>;

const handleClick = (tab: string, filter?: Record<string, unknown>) =>
  alert(
    `Navigate to: ${tab}${filter ? ` with filter: ${JSON.stringify(filter)}` : ''}`,
  );

export const Default: Story = {
  args: {
    label: 'View All Anomalies',
    targetTab: 'analysis-bugs',
    onClick: handleClick,
  },
};

export const WithArrowIcon: Story = {
  args: {
    label: 'View Encounter History',
    targetTab: 'encounter-history',
    icon: 'arrow-right',
    onClick: handleClick,
  },
};

export const WithExternalLinkIcon: Story = {
  args: {
    label: 'Open Battle Details',
    targetTab: 'encounter-history',
    icon: 'external-link',
    onClick: handleClick,
  },
};

export const WithChevronIcon: Story = {
  args: {
    label: 'Campaign Dashboard',
    targetTab: 'campaign-dashboard',
    icon: 'chevron-right',
    onClick: handleClick,
  },
};

export const WithFilter: Story = {
  args: {
    label: 'View Critical Anomalies',
    targetTab: 'analysis-bugs',
    icon: 'filter',
    filter: { severity: 'critical' },
    onClick: handleClick,
  },
};

export const DarkMode: Story = {
  args: {
    label: 'View Wounded Units',
    targetTab: 'campaign-dashboard',
    icon: 'arrow-right',
    filter: { status: 'wounded' },
    onClick: handleClick,
  },
  decorators: [
    (Story) => (
      <div className="dark rounded-lg bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};

export const AllIcons: StoryObj = {
  render: () => (
    <div className="flex flex-col gap-4">
      <DrillDownLink
        label="Arrow Right"
        targetTab="analysis-bugs"
        icon="arrow-right"
        onClick={handleClick}
      />
      <DrillDownLink
        label="External Link"
        targetTab="encounter-history"
        icon="external-link"
        onClick={handleClick}
      />
      <DrillDownLink
        label="Chevron Right"
        targetTab="campaign-dashboard"
        icon="chevron-right"
        onClick={handleClick}
      />
      <DrillDownLink
        label="Filter"
        targetTab="analysis-bugs"
        icon="filter"
        onClick={handleClick}
      />
      <DrillDownLink
        label="Search"
        targetTab="encounter-history"
        icon="search"
        onClick={handleClick}
      />
      <DrillDownLink
        label="Custom Icon ★"
        targetTab="campaign-dashboard"
        icon="★"
        onClick={handleClick}
      />
      <DrillDownLink
        label="No Icon"
        targetTab="campaign-dashboard"
        onClick={handleClick}
      />
    </div>
  ),
};
