import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { Button } from './Button';
import { DialogTemplate } from './DialogTemplate';

const meta: Meta<typeof DialogTemplate> = {
  title: 'UI/DialogTemplate',
  component: DialogTemplate,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    isOpen: {
      control: 'boolean',
      description: 'Whether the dialog is visible',
    },
    title: {
      control: 'text',
      description: 'Dialog title in header',
    },
    subtitle: {
      control: 'text',
      description: 'Optional subtitle below title',
    },
    preventClose: {
      control: 'boolean',
      description: 'Prevent closing via backdrop/escape',
    },
    hideCloseButton: {
      control: 'boolean',
      description: 'Hide the X button in header',
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes for modal container',
    },
  },
};

export default meta;
type Story = StoryObj<typeof DialogTemplate>;

// Interactive wrapper for stories that need state
function DialogWrapper({
  children,
  buttonLabel = 'Open Dialog',
  ...dialogProps
}: Omit<React.ComponentProps<typeof DialogTemplate>, 'isOpen' | 'onClose'> & {
  buttonLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <>
      <Button variant="primary" onClick={() => setIsOpen(true)}>
        {buttonLabel}
      </Button>
      <DialogTemplate
        {...dialogProps}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        {children}
      </DialogTemplate>
    </>
  );
}

export const Default: Story = {
  render: () => (
    <DialogWrapper title="Example Dialog">
      <p className="text-slate-300">This is the dialog content area.</p>
    </DialogWrapper>
  ),
};

export const WithSubtitle: Story = {
  render: () => (
    <DialogWrapper
      title="Save Unit"
      subtitle="Enter a unique name for your custom unit"
    >
      <p className="text-slate-300">
        Dialog with a subtitle for additional context.
      </p>
    </DialogWrapper>
  ),
};

export const WithFooter: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Dialog with Footer
        </Button>
        <DialogTemplate
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Confirm Action"
          subtitle="This action cannot be undone"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => setIsOpen(false)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-slate-300">
            Are you sure you want to delete this unit? This will remove all
            associated data.
          </p>
        </DialogTemplate>
      </>
    );
  },
};

export const WithForm: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Form Dialog
        </Button>
        <DialogTemplate
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Save Unit"
          footer={
            <>
              <Button variant="secondary" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={() => setIsOpen(false)}>
                Save
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Chassis Name
              </label>
              <input
                type="text"
                placeholder="e.g., Atlas"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-300">
                Variant Designation
              </label>
              <input
                type="text"
                placeholder="e.g., AS7-D"
                className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </DialogTemplate>
      </>
    );
  },
};

export const PreventClose: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = () => {
      setIsSaving(true);
      setTimeout(() => {
        setIsSaving(false);
        setIsOpen(false);
      }, 2000);
    };

    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open (Prevent Close Demo)
        </Button>
        <DialogTemplate
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Saving..."
          subtitle="Please wait while we save your changes"
          preventClose={isSaving}
          hideCloseButton={isSaving}
          footer={
            <Button variant="primary" onClick={handleSave} isLoading={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          }
        >
          <p className="text-slate-300">
            {isSaving
              ? 'Saving in progress. Dialog cannot be closed.'
              : 'Click Save to see the prevent close behavior.'}
          </p>
        </DialogTemplate>
      </>
    );
  },
};

export const LongContent: Story = {
  render: () => (
    <DialogWrapper
      title="Terms and Conditions"
      subtitle="Please read carefully"
    >
      <div className="space-y-4 text-slate-300">
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat.
        </p>
        <p>
          Duis aute irure dolor in reprehenderit in voluptate velit esse cillum
          dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non
          proident, sunt in culpa qui officia deserunt mollit anim id est
          laborum.
        </p>
        <p>
          Sed ut perspiciatis unde omnis iste natus error sit voluptatem
          accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae
          ab illo inventore veritatis et quasi architecto beatae vitae dicta
          sunt explicabo.
        </p>
        <p>
          Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut
          fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem
          sequi nesciunt.
        </p>
        <p>
          Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet,
          consectetur, adipisci velit, sed quia non numquam eius modi tempora
          incidunt ut labore et dolore magnam aliquam quaerat voluptatem.
        </p>
      </div>
    </DialogWrapper>
  ),
};

export const CustomWidth: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open Wide Dialog
        </Button>
        <DialogTemplate
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Wide Dialog"
          subtitle="This dialog uses a custom width class"
          className="mx-4 w-full max-w-3xl"
          footer={
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Close
            </Button>
          }
        >
          <p className="text-slate-300">
            This dialog has a wider max-width (max-w-3xl) for displaying more
            content.
          </p>
        </DialogTemplate>
      </>
    );
  },
};

export const NoCloseButton: Story = {
  render: () => {
    const [isOpen, setIsOpen] = useState(false);
    return (
      <>
        <Button variant="primary" onClick={() => setIsOpen(true)}>
          Open (No Close Button)
        </Button>
        <DialogTemplate
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          title="Required Action"
          hideCloseButton
          footer={
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              I Understand
            </Button>
          }
        >
          <p className="text-slate-300">
            This dialog hides the close button to encourage users to take an
            action. They can still close by clicking outside or pressing Escape.
          </p>
        </DialogTemplate>
      </>
    );
  },
};
