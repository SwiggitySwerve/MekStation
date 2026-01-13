import type { Meta, StoryObj } from '@storybook/react';
import { ResetConfirmationDialog, DEFAULT_RESET_OPTIONS, ResetOption } from './ResetConfirmationDialog';
import { useState } from 'react';
import { fn } from '@storybook/test';

const meta: Meta<typeof ResetConfirmationDialog> = {
  title: 'Customizer/Dialogs/ResetConfirmationDialog',
  component: ResetConfirmationDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Multi-step confirmation dialog for reset operations with option selection, confirmation, and progress states.',
      },
    },
  },
  args: {
    onClose: fn(),
    onConfirm: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof ResetConfirmationDialog>;

function ResetDialogDemo({ options }: { options?: ResetOption[] }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
      >
        Reset Configuration
      </button>
      <ResetConfirmationDialog
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={async (optionId) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          console.log(`Reset with option: ${optionId}`);
        }}
        options={options}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <ResetDialogDemo />,
};

export const CustomOptions: Story = {
  render: () => (
    <ResetDialogDemo
      options={[
        {
          id: 'weapons',
          title: 'Reset Weapons Only',
          description: 'Remove all weapons and ammunition',
          removes: ['All weapons', 'All ammunition'],
          preserves: ['Armor', 'Engine', 'Equipment'],
        },
        {
          id: 'all',
          title: 'Full Reset',
          description: 'Remove everything and start fresh',
          removes: ['Everything'],
          preserves: ['Base chassis'],
        },
      ]}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: 'Custom reset options can be provided.',
      },
    },
  },
};

export const StaticOpen: Story = {
  args: {
    isOpen: true,
    options: DEFAULT_RESET_OPTIONS,
    onConfirm: async (optionId) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
    },
  },
};

export const WithFailure: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded"
        >
          Reset (Will Fail)
        </button>
        <ResetConfirmationDialog
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          onConfirm={async () => {
            await new Promise((resolve) => setTimeout(resolve, 500));
            throw new Error('Failed to reset: database connection error');
          }}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Shows error handling when the reset operation fails.',
      },
    },
  },
};
