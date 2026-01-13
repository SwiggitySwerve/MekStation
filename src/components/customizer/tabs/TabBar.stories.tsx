import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { TabBar, TabDisplayInfo } from './TabBar';

const meta: Meta<typeof TabBar> = {
  title: 'Customizer/Tabs/TabBar',
  component: TabBar,
  parameters: {
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  args: {
    onSelectTab: fn(),
    onCloseTab: fn(),
    onRenameTab: fn(),
    onNewTab: fn(),
    onLoadUnit: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TabBar>;

const singleTab: TabDisplayInfo[] = [
  { id: 'tab-1', name: 'New Unit', isModified: false },
];

const multipleTabs: TabDisplayInfo[] = [
  { id: 'tab-1', name: 'Atlas AS7-D', isModified: false },
  { id: 'tab-2', name: 'Timber Wolf Prime', isModified: true },
  { id: 'tab-3', name: 'Commando COM-2D', isModified: false },
];

const manyTabs: TabDisplayInfo[] = [
  { id: 'tab-1', name: 'Atlas AS7-D', isModified: false },
  { id: 'tab-2', name: 'Timber Wolf Prime', isModified: true },
  { id: 'tab-3', name: 'Commando COM-2D', isModified: false },
  { id: 'tab-4', name: 'Mad Cat Mk II', isModified: false },
  { id: 'tab-5', name: 'Warhammer WHM-6R', isModified: true },
  { id: 'tab-6', name: 'Marauder MAD-3R', isModified: false },
  { id: 'tab-7', name: 'Battlemaster BLR-1G', isModified: false },
];

export const SingleTab: Story = {
  args: {
    tabs: singleTab,
    activeTabId: 'tab-1',
  },
};

export const MultipleTabs: Story = {
  args: {
    tabs: multipleTabs,
    activeTabId: 'tab-1',
  },
};

export const SecondTabActive: Story = {
  args: {
    tabs: multipleTabs,
    activeTabId: 'tab-2',
  },
};

export const ManyTabs: Story = {
  args: {
    tabs: manyTabs,
    activeTabId: 'tab-3',
  },
};

export const NoActiveTab: Story = {
  args: {
    tabs: multipleTabs,
    activeTabId: null,
  },
};

export const EmptyTabs: Story = {
  args: {
    tabs: [],
    activeTabId: null,
  },
};

export const WithModifiedIndicators: Story = {
  args: {
    tabs: [
      { id: 'tab-1', name: 'Saved Unit', isModified: false },
      { id: 'tab-2', name: 'Unsaved Changes', isModified: true },
      { id: 'tab-3', name: 'Also Modified', isModified: true },
    ],
    activeTabId: 'tab-2',
  },
};

export const LongTabNames: Story = {
  args: {
    tabs: [
      { id: 'tab-1', name: 'Timber Wolf (Mad Cat) Prime Configuration', isModified: false },
      { id: 'tab-2', name: 'Atlas AS7-D-DC Command Configuration', isModified: true },
      { id: 'tab-3', name: 'Marauder IIC 2 (Conjurer)', isModified: false },
    ],
    activeTabId: 'tab-1',
  },
};
