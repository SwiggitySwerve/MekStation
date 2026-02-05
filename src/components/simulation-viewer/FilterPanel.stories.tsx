import type { Meta, StoryObj } from '@storybook/react';

import type { IFilterDefinition } from '@/components/simulation-viewer/types';

import { FilterPanel } from './FilterPanel';

const severityFilter: IFilterDefinition = {
  id: 'severity',
  label: 'Severity',
  options: ['critical', 'warning', 'info'],
  optionLabels: { critical: 'Critical', warning: 'Warning', info: 'Info' },
};

const typeFilter: IFilterDefinition = {
  id: 'type',
  label: 'Anomaly Type',
  options: ['heat-suicide', 'passive-unit', 'no-progress'],
  optionLabels: {
    'heat-suicide': 'Heat Suicide',
    'passive-unit': 'Passive Unit',
    'no-progress': 'No Progress',
  },
};

const mechFilter: IFilterDefinition = {
  id: 'mech',
  label: 'Mech Class',
  options: ['light', 'medium', 'heavy', 'assault'],
  optionLabels: {
    light: 'Light (20-35t)',
    medium: 'Medium (40-55t)',
    heavy: 'Heavy (60-75t)',
    assault: 'Assault (80-100t)',
  },
};

const eraFilter: IFilterDefinition = {
  id: 'era',
  label: 'Era',
  options: [
    'star-league',
    'succession-wars',
    'clan-invasion',
    'jihad',
    'dark-age',
  ],
  optionLabels: {
    'star-league': 'Star League',
    'succession-wars': 'Succession Wars',
    'clan-invasion': 'Clan Invasion',
    jihad: 'Jihad',
    'dark-age': 'Dark Age',
  },
};

const meta: Meta<typeof FilterPanel> = {
  title: 'Simulation/FilterPanel',
  component: FilterPanel,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    enableSearch: { control: 'boolean' },
  },
};

export default meta;
type Story = StoryObj<typeof FilterPanel>;

export const Default: Story = {
  args: {
    filters: [severityFilter, typeFilter],
    activeFilters: {
      severity: ['critical', 'warning'],
      type: ['heat-suicide'],
    },
    onFilterChange: (filters) => console.log('Filters:', filters),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const WithSearch: Story = {
  args: {
    filters: [severityFilter, typeFilter],
    activeFilters: { severity: ['critical'] },
    onFilterChange: (filters) => console.log('Filters:', filters),
    enableSearch: true,
    searchQuery: 'heat',
    onSearchChange: (query) => console.log('Search:', query),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const NoActiveFilters: Story = {
  args: {
    filters: [severityFilter, typeFilter],
    activeFilters: {},
    onFilterChange: (filters) => console.log('Filters:', filters),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const ManyActiveFilters: Story = {
  args: {
    filters: [severityFilter, typeFilter, mechFilter, eraFilter],
    activeFilters: {
      severity: ['critical', 'warning', 'info'],
      type: ['heat-suicide', 'passive-unit', 'no-progress'],
      mech: ['heavy', 'assault'],
      era: ['clan-invasion', 'jihad'],
    },
    onFilterChange: (filters) => console.log('Filters:', filters),
    enableSearch: true,
    onSearchChange: (query) => console.log('Search:', query),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const SingleFilter: Story = {
  args: {
    filters: [severityFilter],
    activeFilters: { severity: ['critical'] },
    onFilterChange: (filters) => console.log('Filters:', filters),
  },
  decorators: [
    (Story) => (
      <div className="w-full max-w-sm">
        <Story />
      </div>
    ),
  ],
};

export const DarkMode: Story = {
  args: {
    filters: [severityFilter, typeFilter],
    activeFilters: {
      severity: ['critical', 'warning'],
      type: ['heat-suicide'],
    },
    onFilterChange: (filters) => console.log('Filters:', filters),
    enableSearch: true,
    onSearchChange: (query) => console.log('Search:', query),
  },
  decorators: [
    (Story) => (
      <div className="dark w-full max-w-sm rounded-lg bg-gray-900 p-8">
        <Story />
      </div>
    ),
  ],
};
