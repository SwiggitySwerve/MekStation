import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import Sidebar from './Sidebar';

const meta: Meta<typeof Sidebar> = {
  title: 'Common/Sidebar',
  component: Sidebar,
  parameters: {
    layout: 'fullscreen',
    nextRouter: {
      pathname: '/',
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="h-screen bg-surface-deep">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Sidebar>;

function SidebarWrapper({
  initialCollapsed = false,
  initialPath = '/',
}: {
  initialCollapsed?: boolean;
  initialPath?: string;
}) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  
  return (
    <Sidebar
      isCollapsed={isCollapsed}
      setIsCollapsed={setIsCollapsed}
    />
  );
}

export const Expanded: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/',
    },
  },
};

export const Collapsed: Story = {
  render: () => <SidebarWrapper initialCollapsed={true} />,
  parameters: {
    nextRouter: {
      pathname: '/',
    },
  },
};

export const OnUnitsPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/units',
    },
  },
};

export const OnCompendiumPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/compendium',
    },
  },
};

export const OnCustomizerPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/customizer',
    },
  },
};

export const OnComparePage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/compare',
    },
  },
};

export const OnSettingsPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/settings',
    },
  },
};

export const CollapsedWithTooltip: Story = {
  render: () => <SidebarWrapper initialCollapsed={true} />,
  parameters: {
    nextRouter: {
      pathname: '/units',
    },
    docs: {
      description: {
        story: 'When collapsed, navigation items show tooltips on hover to reveal the label.',
      },
    },
  },
};
