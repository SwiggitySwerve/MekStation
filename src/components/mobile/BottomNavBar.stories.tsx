import type { Meta, StoryObj } from '@storybook/react';
import { BottomNavBar, Tab } from './BottomNavBar';
import { setMockDeviceCapabilities } from '../../../.storybook/mocks/useDeviceCapabilities';

const meta: Meta<typeof BottomNavBar> = {
  title: 'Mobile/BottomNavBar',
  component: BottomNavBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    viewport: {
      defaultViewport: 'mobile1',
    },
  },
  decorators: [
    (Story) => {
      setMockDeviceCapabilities({ isMobile: true, hasTouch: true, hasMouse: false });
      return (
        <div className="h-screen bg-surface-deep relative">
          <div className="p-4 pb-20">
            <p className="text-white">Main content area</p>
            <p className="text-slate-400 text-sm mt-2">Bottom nav appears below on mobile</p>
          </div>
          <Story />
        </div>
      );
    },
  ],
};
export default meta;

type Story = StoryObj<typeof BottomNavBar>;

const StructureIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
);

const ArmorIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const EquipmentIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
  </svg>
);

const SlotsIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);

const defaultTabs: Tab[] = [
  { id: 'structure', icon: <StructureIcon />, label: 'Structure', panelId: 'catalog' },
  { id: 'armor', icon: <ArmorIcon />, label: 'Armor', panelId: 'unit-detail' },
  { id: 'equipment', icon: <EquipmentIcon />, label: 'Equipment', panelId: 'equipment-browser' },
  { id: 'slots', icon: <SlotsIcon />, label: 'Slots', panelId: 'editor' },
];

export const Default: Story = {
  args: {
    tabs: defaultTabs,
  },
  parameters: {
    zustand: {
      navigation: {
        currentPanel: 'catalog',
      },
    },
  },
};

export const ArmorSelected: Story = {
  args: {
    tabs: defaultTabs,
  },
  parameters: {
    zustand: {
      navigation: {
        currentPanel: 'unit-detail',
        canGoBack: true,
      },
    },
  },
};

export const ThreeTabs: Story = {
  args: {
    tabs: [
      { id: 'structure', icon: <StructureIcon />, label: 'Build', panelId: 'catalog' },
      { id: 'armor', icon: <ArmorIcon />, label: 'Armor', panelId: 'unit-detail' },
      { id: 'equipment', icon: <EquipmentIcon />, label: 'Equip', panelId: 'equipment-browser' },
    ],
  },
  parameters: {
    zustand: {
      navigation: {
        currentPanel: 'catalog',
      },
    },
  },
};

export const FiveTabs: Story = {
  args: {
    tabs: [
      { id: 'structure', icon: <StructureIcon />, label: 'Build', panelId: 'catalog' },
      { id: 'armor', icon: <ArmorIcon />, label: 'Armor', panelId: 'unit-detail' },
      { id: 'equipment', icon: <EquipmentIcon />, label: 'Equip', panelId: 'equipment-browser' },
      { id: 'slots', icon: <SlotsIcon />, label: 'Slots', panelId: 'editor' },
      { id: 'settings', icon: <StructureIcon />, label: 'More', panelId: 'sidebar' },
    ],
  },
  parameters: {
    zustand: {
      navigation: {
        currentPanel: 'catalog',
      },
    },
  },
};
