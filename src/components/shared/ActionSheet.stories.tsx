import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import { ActionSheet, ActionSheetItem } from './ActionSheet';

const meta: Meta<typeof ActionSheet> = {
  title: 'Shared/ActionSheet',
  component: ActionSheet,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Mobile-optimized slide-up action menu from the bottom of the screen. Provides contextual actions with optional danger styling for destructive operations.',
      },
    },
  },
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div className="min-h-[600px] bg-surface-deep flex items-center justify-center">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActionSheet>;

function ActionSheetDemo({
  title,
  subtitle,
  actions,
  showCancel = true,
  cancelLabel,
}: {
  title?: string;
  subtitle?: string;
  actions: ActionSheetItem[];
  showCancel?: boolean;
  cancelLabel?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const wrappedActions = actions.map((action) => ({
    ...action,
    onSelect: () => {
      setLastAction(action.label);
      action.onSelect();
    },
  }));

  return (
    <div className="text-center space-y-4">
      <button
        onClick={() => setIsOpen(true)}
        className="px-6 py-3 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
      >
        Open Action Sheet
      </button>
      {lastAction && (
        <p className="text-text-theme-secondary">
          Last action: <strong>{lastAction}</strong>
        </p>
      )}
      <ActionSheet
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={title}
        subtitle={subtitle}
        actions={wrappedActions}
        showCancel={showCancel}
        cancelLabel={cancelLabel}
      />
    </div>
  );
}

export const Default: Story = {
  render: () => (
    <ActionSheetDemo
      title="Equipment Actions"
      actions={[
        { id: 'assign', label: 'Assign to Location', onSelect: () => console.log('Assign') },
        { id: 'details', label: 'View Details', onSelect: () => console.log('Details') },
        { id: 'remove', label: 'Remove from Loadout', danger: true, onSelect: () => console.log('Remove') },
      ]}
    />
  ),
};

export const WithSubtitle: Story = {
  render: () => (
    <ActionSheetDemo
      title="Medium Laser"
      subtitle="1 ton • 1 critical slot • 5 heat"
      actions={[
        { id: 'assign', label: 'Assign to Location', onSelect: () => {} },
        { id: 'duplicate', label: 'Duplicate', onSelect: () => {} },
        { id: 'remove', label: 'Remove', danger: true, onSelect: () => {} },
      ]}
    />
  ),
};

export const WithIcons: Story = {
  render: () => (
    <ActionSheetDemo
      title="Mech Actions"
      actions={[
        { id: 'save', label: 'Save Configuration', icon: '💾', onSelect: () => {} },
        { id: 'export', label: 'Export to File', icon: '📤', onSelect: () => {} },
        { id: 'share', label: 'Share Link', icon: '🔗', onSelect: () => {} },
        { id: 'duplicate', label: 'Duplicate Mech', icon: '📋', onSelect: () => {} },
        { id: 'delete', label: 'Delete Mech', icon: '🗑️', danger: true, onSelect: () => {} },
      ]}
    />
  ),
};

export const DisabledActions: Story = {
  render: () => (
    <ActionSheetDemo
      title="Location Options"
      actions={[
        { id: 'add', label: 'Add Equipment', onSelect: () => {} },
        { id: 'clear', label: 'Clear All', onSelect: () => {}, disabled: true },
        { id: 'lock', label: 'Lock Location', onSelect: () => {} },
        { id: 'remove', label: 'Remove Location', danger: true, disabled: true, onSelect: () => {} },
      ]}
    />
  ),
};

export const DangerOnly: Story = {
  render: () => (
    <ActionSheetDemo
      title="Delete Configuration?"
      subtitle="This action cannot be undone."
      actions={[
        { id: 'delete', label: 'Delete Forever', danger: true, onSelect: () => {} },
      ]}
      cancelLabel="Keep Configuration"
    />
  ),
};

export const NoCancel: Story = {
  render: () => (
    <ActionSheetDemo
      title="Select Tech Base"
      actions={[
        { id: 'is', label: 'Inner Sphere', onSelect: () => {} },
        { id: 'clan', label: 'Clan', onSelect: () => {} },
        { id: 'mixed', label: 'Mixed Tech', onSelect: () => {} },
      ]}
      showCancel={false}
    />
  ),
};

export const NoTitle: Story = {
  render: () => (
    <ActionSheetDemo
      actions={[
        { id: 'copy', label: 'Copy', onSelect: () => {} },
        { id: 'paste', label: 'Paste', onSelect: () => {} },
        { id: 'cut', label: 'Cut', onSelect: () => {} },
      ]}
    />
  ),
};

export const ManyActions: Story = {
  render: () => (
    <ActionSheetDemo
      title="Armor Allocation"
      subtitle="Choose distribution method"
      actions={[
        { id: 'even', label: 'Even Distribution', onSelect: () => {} },
        { id: 'front', label: 'Front Heavy (70/30)', onSelect: () => {} },
        { id: 'rear', label: 'Rear Heavy (30/70)', onSelect: () => {} },
        { id: 'max', label: 'Maximum All', onSelect: () => {} },
        { id: 'clear', label: 'Clear All Armor', onSelect: () => {} },
        { id: 'restore', label: 'Restore Default', onSelect: () => {} },
        { id: 'reset', label: 'Reset to Zero', danger: true, onSelect: () => {} },
      ]}
    />
  ),
};

export const CustomCancelLabel: Story = {
  render: () => (
    <ActionSheetDemo
      title="Unsaved Changes"
      subtitle="You have unsaved changes to this mech."
      actions={[
        { id: 'save', label: 'Save and Continue', onSelect: () => {} },
        { id: 'discard', label: 'Discard Changes', danger: true, onSelect: () => {} },
      ]}
      cancelLabel="Go Back"
    />
  ),
};

export const EquipmentContextMenu: Story = {
  render: () => (
    <ActionSheetDemo
      title="PPC"
      subtitle="10 tons • 3 critical slots • 10 heat"
      actions={[
        { id: 'la', label: 'Assign to Left Arm', icon: '💪', onSelect: () => {} },
        { id: 'ra', label: 'Assign to Right Arm', icon: '💪', onSelect: () => {} },
        { id: 'lt', label: 'Assign to Left Torso', icon: '🫁', onSelect: () => {} },
        { id: 'rt', label: 'Assign to Right Torso', icon: '🫁', onSelect: () => {} },
        { id: 'details', label: 'View Details', icon: 'ℹ️', onSelect: () => {} },
        { id: 'remove', label: 'Remove', icon: '🗑️', danger: true, onSelect: () => {} },
      ]}
    />
  ),
};
