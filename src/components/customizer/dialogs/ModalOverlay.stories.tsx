import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { ModalOverlay } from './ModalOverlay';

const meta: Meta<typeof ModalOverlay> = {
  title: 'Customizer/Dialogs/ModalOverlay',
  component: ModalOverlay,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Reusable modal overlay with backdrop, focus trapping, and escape key handling.',
      },
    },
  },
  argTypes: {
    isOpen: { control: 'boolean' },
    preventClose: { control: 'boolean' },
  },
};
export default meta;

type Story = StoryObj<typeof ModalOverlay>;

function ModalOverlayDemo({
  preventClose = false,
}: {
  preventClose?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
      >
        Open Modal
      </button>
      <ModalOverlay
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        preventClose={preventClose}
      >
        <div className="p-6">
          <h2 className="mb-4 text-lg font-bold text-white">Modal Content</h2>
          <p className="mb-4 text-slate-300">
            Click outside or press Escape to close.
          </p>
          <button
            onClick={() => setIsOpen(false)}
            className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
          >
            Close
          </button>
        </div>
      </ModalOverlay>
    </div>
  );
}

export const Default: Story = {
  render: () => <ModalOverlayDemo />,
};

export const PreventClose: Story = {
  render: () => <ModalOverlayDemo preventClose />,
  parameters: {
    docs: {
      description: {
        story:
          'When preventClose is true, clicking outside or pressing Escape will not close the modal.',
      },
    },
  },
};

export const WithForm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Open Form Modal
        </button>
        <ModalOverlay isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="space-y-4 p-6">
            <h2 className="text-lg font-bold text-white">Edit Settings</h2>
            <div>
              <label className="mb-1 block text-sm text-slate-400">Name</label>
              <input
                type="text"
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                placeholder="Enter name..."
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-slate-400">
                Description
              </label>
              <textarea
                className="w-full rounded border border-slate-600 bg-slate-700 px-3 py-2 text-white"
                rows={3}
                placeholder="Enter description..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="rounded bg-slate-700 px-4 py-2 text-white hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
              >
                Save
              </button>
            </div>
          </div>
        </ModalOverlay>
      </div>
    );
  },
};

export const LargeContent: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <div>
        <button
          onClick={() => setIsOpen(true)}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
        >
          Open Large Modal
        </button>
        <ModalOverlay isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="p-6">
            <h2 className="mb-4 text-lg font-bold text-white">
              Terms and Conditions
            </h2>
            <div className="space-y-4 text-slate-300">
              {Array.from({ length: 10 }).map((_, i) => (
                <p key={i}>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              ))}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-500"
            >
              Accept
            </button>
          </div>
        </ModalOverlay>
      </div>
    );
  },
};
