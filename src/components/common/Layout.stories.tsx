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
  <div className="h-12 bg-surface-base border-b border-border-theme flex items-center px-4">
    <div className="text-white font-bold">MekStation</div>
    <nav className="ml-8 flex gap-4">
      {['Dashboard', 'Browse', 'Tools'].map((item) => (
        <button
          key={item}
          className="px-3 py-1 rounded text-slate-300 hover:bg-surface-raised"
        >
          {item}
        </button>
      ))}
    </nav>
  </div>
);

const MockSecondarySidebar = () => (
  <div className="p-4">
    <h3 className="text-white font-semibold mb-4">Filters</h3>
    <div className="space-y-3">
      <div>
        <label className="text-sm text-slate-400">Weight Class</label>
        <select className="w-full mt-1 px-2 py-1 bg-surface-raised border border-border-theme rounded text-white">
          <option>All</option>
          <option>Light</option>
          <option>Medium</option>
          <option>Heavy</option>
          <option>Assault</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-slate-400">Tech Base</label>
        <select className="w-full mt-1 px-2 py-1 bg-surface-raised border border-border-theme rounded text-white">
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
        <h1 className="text-2xl font-bold text-white mb-4">Unit Catalog</h1>
        <div className="grid grid-cols-3 gap-4">
          {['Atlas', 'Timber Wolf', 'Marauder'].map((unit) => (
            <div key={unit} className="bg-surface-base rounded-lg border border-border-theme p-4">
              <p className="text-white font-medium">{unit}</p>
              <p className="text-slate-400 text-sm">BattleMech</p>
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
        <h1 className="text-2xl font-bold text-white mb-4">Main Content</h1>
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
        <h1 className="text-2xl font-bold text-white mb-4">Filtered Results</h1>
        <p className="text-slate-300">Content with top bar and secondary sidebar for filters.</p>
      </div>
    ),
  },
};

export const NoTopBar: Story = {
  args: {
    title: 'MekStation - Full Height',
    children: (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Full Height Layout</h1>
        <p className="text-slate-300">Layout without top bar, using full viewport height.</p>
      </div>
    ),
  },
};
