import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { OverwriteConfirmDialog } from './OverwriteConfirmDialog';

const meta: Meta<typeof OverwriteConfirmDialog> = {
  title: 'Customizer/Dialogs/OverwriteConfirmDialog',
  component: OverwriteConfirmDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onOverwrite: fn(),
    onSaveAsNew: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof OverwriteConfirmDialog>;

export const Default: Story = {
  args: {
    isOpen: true,
    newUnitName: 'Atlas AS7-D Custom',
    existingUnitName: 'Atlas AS7-D Custom',
  },
};

export const DifferentNames: Story = {
  args: {
    isOpen: true,
    newUnitName: 'Atlas AS7-D Modified',
    existingUnitName: 'Atlas AS7-D',
  },
};

export const ClanUnit: Story = {
  args: {
    isOpen: true,
    newUnitName: 'Timber Wolf Prime Custom',
    existingUnitName: 'Timber Wolf Prime Custom',
  },
};

export const LongNames: Story = {
  args: {
    isOpen: true,
    newUnitName: 'Marauder IIC 2 Custom Configuration with Extended Range Lasers',
    existingUnitName: 'Marauder IIC 2 Custom Configuration with Extended Range Lasers',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    newUnitName: 'Test',
    existingUnitName: 'Test',
  },
};
