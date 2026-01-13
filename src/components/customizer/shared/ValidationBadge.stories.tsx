import type { Meta, StoryObj } from '@storybook/react';
import { ValidationBadge } from './ValidationBadge';

const meta: Meta<typeof ValidationBadge> = {
  title: 'Customizer/Shared/ValidationBadge',
  component: ValidationBadge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Displays validation status with appropriate color coding and icons.',
      },
    },
  },
  argTypes: {
    status: {
      control: 'select',
      options: ['valid', 'warning', 'error', 'info'],
    },
    showIcon: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof ValidationBadge>;

export const Valid: Story = {
  args: {
    status: 'valid',
    label: 'Valid Configuration',
  },
};

export const Warning: Story = {
  args: {
    status: 'warning',
    label: 'Overweight',
  },
};

export const Error: Story = {
  args: {
    status: 'error',
    label: 'Invalid',
  },
};

export const Info: Story = {
  args: {
    status: 'info',
    label: 'Editing',
  },
};

export const IconOnly: Story = {
  args: {
    status: 'valid',
    showIcon: true,
  },
};

export const NoIcon: Story = {
  args: {
    status: 'error',
    label: 'Error',
    showIcon: false,
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2 p-4 bg-slate-900 rounded">
      <ValidationBadge status="valid" label="Valid" />
      <ValidationBadge status="warning" label="Warning" />
      <ValidationBadge status="error" label="Error" />
      <ValidationBadge status="info" label="Info" />
    </div>
  ),
};

export const UnitValidation: Story = {
  render: () => (
    <div className="space-y-2 p-4 bg-slate-900 rounded">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm w-32">Structure:</span>
        <ValidationBadge status="valid" label="Valid" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm w-32">Armor:</span>
        <ValidationBadge status="warning" label="Incomplete" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm w-32">Equipment:</span>
        <ValidationBadge status="error" label="Over Tonnage" />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-slate-400 text-sm w-32">Critical Slots:</span>
        <ValidationBadge status="info" label="2 Empty" />
      </div>
    </div>
  ),
};
