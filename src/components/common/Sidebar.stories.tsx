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
}: {
  initialCollapsed?: boolean;
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

// Gameplay section stories
export const OnPilotsPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/gameplay/pilots',
    },
    docs: {
      description: {
        story: 'Gameplay section with Pilots page active. The expandable Gameplay section highlights when any child route is active.',
      },
    },
  },
};

export const OnForcesPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/gameplay/forces',
    },
    docs: {
      description: {
        story: 'Forces page under the Gameplay expandable section.',
      },
    },
  },
};

export const OnCampaignsPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/gameplay/campaigns',
    },
    docs: {
      description: {
        story: 'Campaigns page under the Gameplay expandable section.',
      },
    },
  },
};

export const OnEncountersPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/gameplay/encounters',
    },
    docs: {
      description: {
        story: 'Encounters page under the Gameplay expandable section.',
      },
    },
  },
};

export const OnGamesPage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/gameplay/games',
    },
    docs: {
      description: {
        story: 'Games page under the Gameplay expandable section.',
      },
    },
  },
};

export const OnQuickGamePage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/gameplay/quick',
    },
    docs: {
      description: {
        story: 'Quick Game page for standalone battles without campaign context.',
      },
    },
  },
};

// History/Timeline section stories
export const OnTimelinePage: Story = {
  render: () => <SidebarWrapper initialCollapsed={false} />,
  parameters: {
    nextRouter: {
      pathname: '/audit/timeline',
    },
    docs: {
      description: {
        story: 'Timeline page under the History section. Provides aggregate event history across all campaigns.',
      },
    },
  },
};

// Collapsed with gameplay active (shows tooltip with links)
export const CollapsedGameplayActive: Story = {
  render: () => <SidebarWrapper initialCollapsed={true} />,
  parameters: {
    nextRouter: {
      pathname: '/gameplay/campaigns',
    },
    docs: {
      description: {
        story: 'When collapsed with a Gameplay page active, the Gameplay icon shows an active indicator. Hover to see the tooltip with all Gameplay links.',
      },
    },
  },
};

// Collapsed with History active
export const CollapsedHistoryActive: Story = {
  render: () => <SidebarWrapper initialCollapsed={true} />,
  parameters: {
    nextRouter: {
      pathname: '/audit/timeline',
    },
    docs: {
      description: {
        story: 'Collapsed sidebar with Timeline page active in the History section.',
      },
    },
  },
};
