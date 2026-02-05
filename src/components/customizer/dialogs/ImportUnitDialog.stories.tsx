import type { Meta, StoryObj } from '@storybook/react';

import { fn } from '@storybook/test';

import { ImportUnitDialog } from './ImportUnitDialog';

const meta: Meta<typeof ImportUnitDialog> = {
  title: 'Customizer/Dialogs/ImportUnitDialog',
  component: ImportUnitDialog,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  args: {
    onImportSuccess: fn(),
    onClose: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof ImportUnitDialog>;

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
