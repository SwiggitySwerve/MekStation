import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import { UnitLoadDialog } from './UnitLoadDialog';

const meta: Meta<typeof UnitLoadDialog> = {
  title: 'Customizer/Dialogs/UnitLoadDialog',
  component: UnitLoadDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onLoadUnit: fn(),
    onCancel: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof UnitLoadDialog>;

export const Default: Story = {
  args: {
    isOpen: true,
  },
};

export const Closed: Story = {
  args: {
    isOpen: false,
  },
};
