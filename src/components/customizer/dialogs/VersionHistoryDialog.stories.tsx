import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import { VersionHistoryDialog } from './VersionHistoryDialog';

const meta: Meta<typeof VersionHistoryDialog> = {
  title: 'Customizer/Dialogs/VersionHistoryDialog',
  component: VersionHistoryDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onRevert: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof VersionHistoryDialog>;

export const Default: Story = {
  args: {
    isOpen: true,
    unitId: 'unit-123',
    unitName: 'Atlas AS7-D Custom',
    currentVersion: 3,
  },
};

export const FirstVersion: Story = {
  args: {
    isOpen: true,
    unitId: 'unit-456',
    unitName: 'Timber Wolf Prime',
    currentVersion: 1,
  },
};

export const ManyVersions: Story = {
  args: {
    isOpen: true,
    unitId: 'unit-789',
    unitName: 'Commando COM-2D Modified',
    currentVersion: 15,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    unitId: 'unit-test',
    unitName: 'Test Unit',
    currentVersion: 1,
  },
};
