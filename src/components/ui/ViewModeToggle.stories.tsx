import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { ViewModeToggle, ViewMode } from './ViewModeToggle';

const meta: Meta<typeof ViewModeToggle> = {
  title: 'UI/ViewModeToggle',
  component: ViewModeToggle,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    mode: {
      control: 'select',
      options: ['list', 'table', 'grid'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof ViewModeToggle>;

export const List: Story = {
  args: {
    mode: 'list',
    onChange: () => {},
  },
};

export const Table: Story = {
  args: {
    mode: 'table',
    onChange: () => {},
  },
};

export const Grid: Story = {
  args: {
    mode: 'grid',
    onChange: () => {},
  },
};

const InteractiveExample = () => {
  const [mode, setMode] = useState<ViewMode>('list');
  return (
    <div className="space-y-4">
      <ViewModeToggle mode={mode} onChange={setMode} />
      <p className="text-text-theme-secondary text-sm">
        Current mode: <span className="text-accent font-medium">{mode}</span>
      </p>
    </div>
  );
};

export const Interactive: StoryObj = {
  render: () => <InteractiveExample />,
};
