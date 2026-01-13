import type { Meta, StoryObj } from '@storybook/react';
import { ModalOverlay } from './ModalOverlay';
import { useState } from 'react';

const meta: Meta<typeof ModalOverlay> = {
  title: 'Customizer/Dialogs/ModalOverlay',
  component: ModalOverlay,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Reusable modal overlay with backdrop, focus trapping, and escape key handling.',
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

function ModalOverlayDemo({ preventClose = false }: { preventClose?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setIsOpen(true)}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
      >
        Open Modal
      </button>
      <ModalOverlay isOpen={isOpen} onClose={() => setIsOpen(false)} preventClose={preventClose}>
        <div className="p-6">
          <h2 className="text-lg font-bold text-white mb-4">Modal Content</h2>
          <p className="text-slate-300 mb-4">
            Click outside or press Escape to close.
          </p>
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
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
        story: 'When preventClose is true, clicking outside or pressing Escape will not close the modal.',
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
        >
          Open Form Modal
        </button>
        <ModalOverlay isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-white">Edit Settings</h2>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                placeholder="Enter name..."
              />
            </div>
            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                rows={3}
                placeholder="Enter description..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
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
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
        >
          Open Large Modal
        </button>
        <ModalOverlay isOpen={isOpen} onClose={() => setIsOpen(false)}>
          <div className="p-6">
            <h2 className="text-lg font-bold text-white mb-4">Terms and Conditions</h2>
            <div className="text-slate-300 space-y-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <p key={i}>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
                  tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam,
                  quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </p>
              ))}
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded"
            >
              Accept
            </button>
          </div>
        </ModalOverlay>
      </div>
    );
  },
};
