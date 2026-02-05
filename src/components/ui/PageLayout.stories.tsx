import type { Meta, StoryObj } from '@storybook/react';

import { PageLayout, PageLoading, PageError, EmptyState } from './PageLayout';

const meta: Meta<typeof PageLayout> = {
  title: 'UI/PageLayout',
  component: PageLayout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    maxWidth: {
      control: 'select',
      options: ['default', 'narrow', 'wide', 'full'],
    },
    gradient: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof PageLayout>;

export const Default: Story = {
  args: {
    title: 'Page Title',
    subtitle: 'Optional subtitle describing the page content',
    children: (
      <div className="bg-surface-base border-border-theme rounded-lg border p-6">
        <p className="text-slate-300">Page content goes here.</p>
      </div>
    ),
  },
};

export const WithBackLink: Story = {
  args: {
    title: 'Unit Details',
    subtitle: 'Atlas AS7-D',
    backLink: '/units',
    backLabel: 'Back to Units',
    children: (
      <div className="bg-surface-base border-border-theme rounded-lg border p-6">
        <p className="text-slate-300">Unit detail content.</p>
      </div>
    ),
  },
};

export const WithBackCallback: Story = {
  args: {
    title: 'Edit Configuration',
    onBack: () => console.log('Back clicked'),
    backLabel: 'Cancel',
    children: (
      <div className="bg-surface-base border-border-theme rounded-lg border p-6">
        <p className="text-slate-300">
          Editor content with callback-based back navigation.
        </p>
      </div>
    ),
  },
};

export const WithHeaderContent: Story = {
  args: {
    title: 'Equipment Browser',
    subtitle: 'Browse and add equipment',
    headerContent: (
      <div className="flex gap-2">
        <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
          Import
        </button>
        <button className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600">
          Export
        </button>
      </div>
    ),
    children: (
      <div className="bg-surface-base border-border-theme rounded-lg border p-6">
        <p className="text-slate-300">Equipment list content.</p>
      </div>
    ),
  },
};

export const NarrowWidth: Story = {
  args: {
    title: 'Settings',
    maxWidth: 'narrow',
    children: (
      <div className="bg-surface-base border-border-theme rounded-lg border p-6">
        <p className="text-slate-300">
          Narrow layout for focused content like settings.
        </p>
      </div>
    ),
  },
};

export const WideWidth: Story = {
  args: {
    title: 'Unit Catalog',
    maxWidth: 'wide',
    children: (
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div
            key={i}
            className="bg-surface-base border-border-theme rounded-lg border p-4"
          >
            <p className="text-slate-300">Unit {i}</p>
          </div>
        ))}
      </div>
    ),
  },
};

export const WithGradient: Story = {
  args: {
    title: 'Welcome to MekStation',
    subtitle: 'Build your BattleMech',
    gradient: true,
    children: (
      <div className="bg-surface-base border-border-theme rounded-lg border p-6">
        <p className="text-slate-300">Content with gradient background.</p>
      </div>
    ),
  },
};

export const Loading: Story = {
  render: () => <PageLoading message="Loading unit data..." />,
};

export const Error: Story = {
  render: () => (
    <PageError
      title="Unit Not Found"
      message="The requested unit could not be found in the database."
      backLink="/units"
      backLabel="Return to Catalog"
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <PageLayout title="My Units" subtitle="Your custom unit designs">
      <EmptyState
        title="No units yet"
        message="Create your first custom unit to get started."
        action={
          <button className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500">
            Create Unit
          </button>
        }
      />
    </PageLayout>
  ),
};
