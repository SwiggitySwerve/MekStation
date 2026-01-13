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

const MockSidebar = ({ collapsed = false }: { collapsed?: boolean }) => (
  <div
    className={`fixed top-0 left-0 h-full bg-surface-base border-r border-border-theme transition-all ${
      collapsed ? 'w-16' : 'w-56'
    } hidden md:block`}
  >
    <div className="p-4">
      <div className="text-white font-bold mb-4">{collapsed ? 'MS' : 'MekStation'}</div>
      <nav className="space-y-2">
        {['Catalog', 'Editor', 'Settings'].map((item) => (
          <div
            key={item}
            className="px-3 py-2 rounded text-slate-300 hover:bg-surface-raised cursor-pointer"
          >
            {collapsed ? item[0] : item}
          </div>
        ))}
      </nav>
    </div>
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

export const WithSidebar: Story = {
  args: {
    title: 'MekStation - With Sidebar',
    sidebarComponent: <MockSidebar />,
    isSidebarCollapsed: false,
    children: (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Main Content</h1>
        <p className="text-slate-300">Content with expanded sidebar navigation.</p>
      </div>
    ),
  },
};

export const WithCollapsedSidebar: Story = {
  args: {
    title: 'MekStation - Collapsed Sidebar',
    sidebarComponent: <MockSidebar collapsed />,
    isSidebarCollapsed: true,
    children: (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Main Content</h1>
        <p className="text-slate-300">Content with collapsed sidebar for more space.</p>
      </div>
    ),
  },
};

export const WithSecondarySidebar: Story = {
  args: {
    title: 'MekStation - Secondary Sidebar',
    sidebarComponent: <MockSidebar />,
    isSidebarCollapsed: false,
    secondarySidebar: <MockSecondarySidebar />,
    children: (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Filtered Results</h1>
        <p className="text-slate-300">Content with both primary and secondary sidebars.</p>
      </div>
    ),
  },
};

export const NoSidebar: Story = {
  args: {
    title: 'MekStation - Full Width',
    children: (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Full Width Layout</h1>
        <p className="text-slate-300">Layout without any sidebar, using full viewport width.</p>
      </div>
    ),
  },
};
