import type { Meta, StoryObj } from '@storybook/react';
import { useState, useEffect } from 'react';
import { ToastProvider, useToast, ToastVariant } from './Toast';

const meta: Meta = {
  title: 'Shared/Toast',
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Toast notification system with auto-dismiss, action buttons, and variants for success, error, warning, and info messages.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <ToastProvider>
        <div className="p-8 min-h-[400px] bg-surface-deep">
          <Story />
        </div>
      </ToastProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj;

function ToastDemo({ variant, message, duration }: { variant: ToastVariant; message: string; duration?: number }) {
  const { showToast } = useToast();

  return (
    <button
      onClick={() => showToast({ variant, message, duration })}
      className="px-4 py-2 bg-surface-raised text-text-theme-primary rounded hover:bg-surface-base transition-colors"
    >
      Show {variant} toast
    </button>
  );
}

function ToastWithAction({ variant, message }: { variant: ToastVariant; message: string }) {
  const { showToast } = useToast();
  const [undoCount, setUndoCount] = useState(0);

  return (
    <div className="space-y-2">
      <button
        onClick={() =>
          showToast({
            variant,
            message,
            action: {
              label: 'Undo',
              onClick: () => setUndoCount((c) => c + 1),
            },
          })
        }
        className="px-4 py-2 bg-surface-raised text-text-theme-primary rounded hover:bg-surface-base transition-colors"
      >
        Show toast with action
      </button>
      {undoCount > 0 && (
        <p className="text-sm text-text-theme-secondary">Undo clicked {undoCount} time(s)</p>
      )}
    </div>
  );
}

export const Success: Story = {
  render: () => <ToastDemo variant="success" message="Mech configuration saved successfully!" />,
};

export const Error: Story = {
  render: () => <ToastDemo variant="error" message="Failed to save configuration. Please try again." />,
};

export const Warning: Story = {
  render: () => <ToastDemo variant="warning" message="Armor allocation exceeds recommended limits." />,
};

export const Info: Story = {
  render: () => <ToastDemo variant="info" message="New equipment data available for download." />,
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-theme-primary">Click to show toast</h3>
      <div className="flex flex-wrap gap-4">
        <ToastDemo variant="success" message="Operation completed!" />
        <ToastDemo variant="error" message="Something went wrong!" />
        <ToastDemo variant="warning" message="Warning: Check your input!" />
        <ToastDemo variant="info" message="Information message" />
      </div>
    </div>
  ),
};

export const WithActionButton: Story = {
  render: () => (
    <ToastWithAction
      variant="info"
      message="Equipment removed from loadout"
    />
  ),
};

export const CustomDuration: Story = {
  render: () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-text-theme-primary">Different durations</h3>
      <div className="flex flex-wrap gap-4">
        <ToastDemo variant="info" message="Quick toast (1s)" duration={1000} />
        <ToastDemo variant="info" message="Normal toast (3s)" duration={3000} />
        <ToastDemo variant="info" message="Long toast (6s)" duration={6000} />
      </div>
    </div>
  ),
};

export const MultipleToasts: Story = {
  render: () => {
    const ToastSpammer = () => {
      const { showToast, dismissAll } = useToast();
      const variants: ToastVariant[] = ['success', 'error', 'warning', 'info'];
      const messages = [
        'First notification',
        'Second notification',
        'Third notification',
        'Fourth notification',
      ];

      const showMultiple = () => {
        variants.forEach((variant, i) => {
          setTimeout(() => {
            showToast({ variant, message: messages[i] });
          }, i * 200);
        });
      };

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-theme-primary">Multiple toasts stack</h3>
          <div className="flex gap-4">
            <button
              onClick={showMultiple}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover transition-colors"
            >
              Show 4 toasts
            </button>
            <button
              onClick={dismissAll}
              className="px-4 py-2 bg-surface-raised text-text-theme-primary rounded hover:bg-surface-base transition-colors"
            >
              Dismiss all
            </button>
          </div>
        </div>
      );
    };

    return <ToastSpammer />;
  },
};

export const AutoShowOnMount: Story = {
  render: () => {
    const AutoToast = () => {
      const { showToast } = useToast();

      useEffect(() => {
        showToast({
          variant: 'info',
          message: 'This toast appeared automatically on mount!',
          duration: 5000,
        });
      }, [showToast]);

      return (
        <p className="text-text-theme-secondary">
          A toast should have appeared automatically when this story loaded.
        </p>
      );
    };

    return <AutoToast />;
  },
};

export const RealWorldUsage: Story = {
  render: () => {
    const MechSaveDemo = () => {
      const { showToast } = useToast();
      const [saving, setSaving] = useState(false);

      const handleSave = async () => {
        setSaving(true);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setSaving(false);
        showToast({
          variant: 'success',
          message: 'Atlas AS7-D configuration saved',
          action: {
            label: 'View',
            onClick: () => showToast({ variant: 'info', message: 'Opening mech details...' }),
          },
        });
      };

      const handleDelete = () => {
        showToast({
          variant: 'error',
          message: 'Equipment "Medium Laser" removed',
          action: {
            label: 'Undo',
            onClick: () => showToast({ variant: 'success', message: 'Equipment restored' }),
          },
        });
      };

      const handleWarning = () => {
        showToast({
          variant: 'warning',
          message: 'Heat exceeds safe operating limits (30/20)',
          duration: 5000,
        });
      };

      return (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-text-theme-primary">Mech Configurator Actions</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Remove Equipment
            </button>
            <button
              onClick={handleWarning}
              className="px-4 py-2 bg-amber-600 text-white rounded hover:bg-amber-700 transition-colors"
            >
              Check Heat
            </button>
          </div>
        </div>
      );
    };

    return <MechSaveDemo />;
  },
};
