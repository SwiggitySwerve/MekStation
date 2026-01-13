import type { Meta, StoryObj } from '@storybook/react';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';
import { useState } from 'react';
import { fn } from '@storybook/test';

const meta: Meta<typeof UnsavedChangesDialog> = {
  title: 'Customizer/Dialogs/UnsavedChangesDialog',
  component: UnsavedChangesDialog,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Confirmation dialog for closing tabs with unsaved changes. Matches MegaMekLab style with Yes/No/Cancel options.',
      },
    },
  },
  args: {
    onClose: fn(),
    onDiscard: fn(),
    onSave: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof UnsavedChangesDialog>;

function UnsavedChangesDialogDemo({ withSaveOption = true }: { withSaveOption?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded"
      >
        Trigger Unsaved Changes Warning
      </button>
      <UnsavedChangesDialog
        isOpen={isOpen}
        unitName="Atlas AS7-D"
        onClose={() => setIsOpen(false)}
        onDiscard={() => {
          alert('Discarded changes!');
          setIsOpen(false);
        }}
        onSave={withSaveOption ? () => {
          alert('Saving unit...');
          setIsOpen(false);
        } : undefined}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => <UnsavedChangesDialogDemo />,
};

export const WithoutSaveOption: Story = {
  render: () => <UnsavedChangesDialogDemo withSaveOption={false} />,
  parameters: {
    docs: {
      description: {
        story: 'When onSave is not provided, the "Yes" button is hidden.',
      },
    },
  },
};

export const StaticOpen: Story = {
  args: {
    isOpen: true,
    unitName: 'Timber Wolf Prime',
  },
};
