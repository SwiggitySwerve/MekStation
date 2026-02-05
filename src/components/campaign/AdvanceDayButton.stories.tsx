import type { Meta, StoryObj } from '@storybook/react';

import { action } from '@storybook/addon-actions';

import { AdvanceDayButton, BlockingAction } from './AdvanceDayButton';

const meta = {
  title: 'Campaign/AdvanceDayButton',
  component: AdvanceDayButton,
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [
        { name: 'dark', value: '#0f172a' },
        { name: 'slate', value: '#1e293b' },
      ],
    },
  },
  tags: ['autodocs'],
  argTypes: {
    blockers: {
      control: 'object',
      description: 'Array of blocking actions preventing day advancement',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button entirely',
    },
    onAdvance: {
      action: 'onAdvance',
      description: 'Called when advancing day (no blockers)',
    },
    onBlockerClick: {
      action: 'onBlockerClick',
      description: 'Called when clicking a blocked button',
    },
  },
} satisfies Meta<typeof AdvanceDayButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {
  args: {
    blockers: [],
    onAdvance: action('Day advanced!'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Ready state with pulsing green button. Click to advance the day.',
      },
    },
  },
};

export const BlockedSingle: Story = {
  args: {
    blockers: [{ type: 'assign_pilots', message: 'Assign Pilots', count: 3 }],
    onBlockerClick: action('Navigate to blocker'),
  },
  parameters: {
    docs: {
      description: {
        story: 'Single blocking action. Shows amber button with warning icon.',
      },
    },
  },
};

export const BlockedMultiple: Story = {
  args: {
    blockers: [
      { type: 'assign_pilots', message: 'Assign Pilots', count: 2 },
      { type: 'resolve_repair', message: 'Resolve Repairs', count: 1 },
      { type: 'select_contract', message: 'Select Contract' },
    ],
    onBlockerClick: action('Navigate to blocker'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Multiple blocking actions. Hover to see tooltip with all blockers.',
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled state. Button cannot be interacted with.',
      },
    },
  },
};

export const DisabledWithBlockers: Story = {
  args: {
    disabled: true,
    blockers: [{ type: 'assign_pilots', message: 'Assign Pilots', count: 1 }],
  },
  parameters: {
    docs: {
      description: {
        story: 'Disabled overrides blocked state. Shows gray button.',
      },
    },
  },
};

const blockerExamples: BlockingAction[] = [
  { type: 'assign_pilots', message: 'Assign Pilots', count: 4 },
  { type: 'resolve_repair', message: 'Resolve Repairs', count: 2 },
  { type: 'select_contract', message: 'Select Contract' },
  { type: 'other', message: 'Review Mission Briefing' },
];

export const AllBlockerTypes: Story = {
  render: () => (
    <div className="space-y-6">
      <div className="mb-4 text-sm font-medium text-slate-400">
        Different blocker types and their display
      </div>
      <div className="flex flex-col items-center gap-4">
        {blockerExamples.map((blocker) => (
          <AdvanceDayButton
            key={blocker.type}
            blockers={[blocker]}
            onBlockerClick={action(`Navigate to ${blocker.type}`)}
          />
        ))}
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All possible blocker types displayed individually.',
      },
    },
  },
};

export const AllStates: Story = {
  render: () => (
    <div className="space-y-8">
      <div>
        <div className="mb-3 text-sm font-medium text-slate-400">
          Ready State
        </div>
        <AdvanceDayButton onAdvance={action('Day advanced!')} />
      </div>

      <div>
        <div className="mb-3 text-sm font-medium text-slate-400">
          Blocked State (Single)
        </div>
        <AdvanceDayButton
          blockers={[
            { type: 'assign_pilots', message: 'Assign Pilots', count: 3 },
          ]}
          onBlockerClick={action('Navigate to blocker')}
        />
      </div>

      <div>
        <div className="mb-3 text-sm font-medium text-slate-400">
          Blocked State (Multiple - hover me)
        </div>
        <AdvanceDayButton
          blockers={[
            { type: 'assign_pilots', message: 'Assign Pilots', count: 2 },
            { type: 'resolve_repair', message: 'Resolve Repairs', count: 1 },
            { type: 'select_contract', message: 'Select Contract' },
          ]}
          onBlockerClick={action('Navigate to blocker')}
        />
      </div>

      <div>
        <div className="mb-3 text-sm font-medium text-slate-400">
          Disabled State
        </div>
        <AdvanceDayButton disabled />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: 'All button states displayed together for comparison.',
      },
    },
  },
};

export const Interactive: Story = {
  render: function InteractiveExample() {
    const [blockers, setBlockers] = React.useState<BlockingAction[]>([
      { type: 'assign_pilots', message: 'Assign Pilots', count: 2 },
      { type: 'resolve_repair', message: 'Resolve Repairs', count: 1 },
    ]);

    const handleBlockerClick = (blocker: BlockingAction) => {
      action('Resolving blocker')(blocker);
      setBlockers((prev) => prev.filter((b) => b.type !== blocker.type));
    };

    const handleAdvance = () => {
      action('Day advanced!')();
      setBlockers([
        { type: 'assign_pilots', message: 'Assign Pilots', count: 2 },
        { type: 'resolve_repair', message: 'Resolve Repairs', count: 1 },
      ]);
    };

    return (
      <div className="space-y-6 text-center">
        <div className="text-sm text-slate-400">
          Click the button to resolve blockers. When all are resolved, you can
          advance.
        </div>
        <AdvanceDayButton
          blockers={blockers}
          onAdvance={handleAdvance}
          onBlockerClick={handleBlockerClick}
        />
        <div className="text-xs text-slate-500">
          {blockers.length > 0
            ? `${blockers.length} blocker(s) remaining`
            : 'Ready to advance!'}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          'Interactive demo: click to resolve blockers, then advance the day.',
      },
    },
  },
};

import React from 'react';
