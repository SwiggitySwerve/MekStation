import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import { SaveUnitDialog } from './SaveUnitDialog';

const meta: Meta<typeof SaveUnitDialog> = {
  title: 'Customizer/Dialogs/SaveUnitDialog',
  component: SaveUnitDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onSave: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof SaveUnitDialog>;

export const Empty: Story = {
  args: {
    isOpen: true,
    initialChassis: '',
    initialVariant: '',
  },
};

export const WithInitialValues: Story = {
  args: {
    isOpen: true,
    initialChassis: 'Atlas',
    initialVariant: 'AS7-D',
  },
};

export const ClanUnit: Story = {
  args: {
    isOpen: true,
    initialChassis: 'Timber Wolf',
    initialVariant: 'Prime',
  },
};

export const CustomVariant: Story = {
  args: {
    isOpen: true,
    initialChassis: 'Warhammer',
    initialVariant: 'WHM-6R-Custom',
  },
};

export const UpdatingExistingUnit: Story = {
  args: {
    isOpen: true,
    initialChassis: 'Commando',
    initialVariant: 'COM-2D',
    currentUnitId: 'existing-unit-123',
  },
};

export const LongNames: Story = {
  args: {
    isOpen: true,
    initialChassis: 'Marauder',
    initialVariant: 'MAD-3R-Extended-Range-Custom-Configuration',
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
    initialChassis: 'Test',
    initialVariant: 'T-1',
  },
};
