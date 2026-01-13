import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { UnitTab } from './UnitTab';

const meta: Meta<typeof UnitTab> = {
  title: 'Customizer/Tabs/UnitTab',
  component: UnitTab,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onSelect: fn(),
    onClose: fn(),
    onRename: fn(),
  },
  decorators: [
    (Story) => (
      <div className="bg-surface-base p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof UnitTab>;

export const Default: Story = {
  args: {
    tab: {
      id: 'tab-1',
      name: 'Atlas AS7-D',
      isModified: false,
    },
    isActive: false,
    canClose: true,
  },
};

export const Active: Story = {
  args: {
    tab: {
      id: 'tab-1',
      name: 'Atlas AS7-D',
      isModified: false,
    },
    isActive: true,
    canClose: true,
  },
};

export const Modified: Story = {
  args: {
    tab: {
      id: 'tab-1',
      name: 'Atlas AS7-D',
      isModified: true,
    },
    isActive: false,
    canClose: true,
  },
};

export const ActiveAndModified: Story = {
  args: {
    tab: {
      id: 'tab-1',
      name: 'Atlas AS7-D',
      isModified: true,
    },
    isActive: true,
    canClose: true,
  },
};

export const NoCloseButton: Story = {
  args: {
    tab: {
      id: 'tab-1',
      name: 'New Unit',
      isModified: false,
    },
    isActive: true,
    canClose: false,
  },
};

export const LongName: Story = {
  args: {
    tab: {
      id: 'tab-1',
      name: 'Timber Wolf (Mad Cat) Prime Configuration with Extended Range',
      isModified: false,
    },
    isActive: false,
    canClose: true,
  },
};

export const ClanUnit: Story = {
  args: {
    tab: {
      id: 'tab-1',
      name: 'Timber Wolf Prime',
      isModified: false,
    },
    isActive: true,
    canClose: true,
  },
};

export const AllStates: StoryObj = {
  render: () => (
    <div className="flex bg-surface-base">
      <UnitTab
        tab={{ id: '1', name: 'Inactive', isModified: false }}
        isActive={false}
        canClose={true}
        onSelect={fn()}
        onClose={fn()}
        onRename={fn()}
      />
      <UnitTab
        tab={{ id: '2', name: 'Active', isModified: false }}
        isActive={true}
        canClose={true}
        onSelect={fn()}
        onClose={fn()}
        onRename={fn()}
      />
      <UnitTab
        tab={{ id: '3', name: 'Modified', isModified: true }}
        isActive={false}
        canClose={true}
        onSelect={fn()}
        onClose={fn()}
        onRename={fn()}
      />
      <UnitTab
        tab={{ id: '4', name: 'Active + Modified', isModified: true }}
        isActive={true}
        canClose={true}
        onSelect={fn()}
        onClose={fn()}
        onRename={fn()}
      />
    </div>
  ),
};
