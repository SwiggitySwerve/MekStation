import type { Meta, StoryObj } from '@storybook/react';

import Layout from './Layout';

const meta: Meta<typeof Layout> = {
  title: 'Common/Layout',
  component: Layout,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};
export default meta;

type Story = StoryObj<typeof Layout>;

const MockTopBar = () => (
  <div className="bg-surface-base border-border-theme flex h-12 items-center border-b px-4">
    <div className="font-bold text-white">MekStation</div>
    <nav className="ml-8 flex gap-4">
      {['Dashboard', 'Browse', 'Tools'].map((item) => (
        <button
          key={item}
          className="hover:bg-surface-raised rounded px-3 py-1 text-slate-300"
        >
          {item}
        </button>
      ))}
    </nav>
  </div>
);

const MockSecondarySidebar = () => (
  <div className="p-4">
    <h3 className="mb-4 font-semibold text-white">Filters</h3>
    <div className="space-y-3">
      <div>
        <label className="text-sm text-slate-400">Weight Class</label>
        <select className="bg-surface-raised border-border-theme mt-1 w-full rounded border px-2 py-1 text-white">
          <option>All</option>
          <option>Light</option>
          <option>Medium</option>
          <option>Heavy</option>
          <option>Assault</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-slate-400">Tech Base</label>
        <select className="bg-surface-raised border-border-theme mt-1 w-full rounded border px-2 py-1 text-white">
          <option>All</option>
          <option>Inner Sphere</option>
          <option>Clan</option>
        </select>
      </div>
    </div>
  </div>
);

export const Default: Story = {
  args: {
    title: 'MekStation - Unit Catalog',
    children: (
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-white">Unit Catalog</h1>
        <div className="grid grid-cols-3 gap-4">
          {['Atlas', 'Timber Wolf', 'Marauder'].map((unit) => (
            <div
              key={unit}
              className="bg-surface-base border-border-theme rounded-lg border p-4"
            >
              <p className="font-medium text-white">{unit}</p>
              <p className="text-sm text-slate-400">BattleMech</p>
            </div>
          ))}
        </div>
      </div>
    ),
  },
};

export const WithTopBar: Story = {
  args: {
    title: 'MekStation - With Top Bar',
    topBarComponent: <MockTopBar />,
    children: (
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-white">Main Content</h1>
        <p className="text-slate-300">Content with top bar navigation.</p>
      </div>
    ),
  },
};

export const WithSecondarySidebar: Story = {
  args: {
    title: 'MekStation - Secondary Sidebar',
    topBarComponent: <MockTopBar />,
    secondarySidebar: <MockSecondarySidebar />,
    children: (
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-white">Filtered Results</h1>
        <p className="text-slate-300">
          Content with top bar and secondary sidebar for filters.
        </p>
      </div>
    ),
  },
};

export const NoTopBar: Story = {
  args: {
    title: 'MekStation - Full Height',
    children: (
      <div className="p-6">
        <h1 className="mb-4 text-2xl font-bold text-white">
          Full Height Layout
        </h1>
        <p className="text-slate-300">
          Layout without top bar, using full viewport height.
        </p>
      </div>
    ),
  },
};
