import type { Meta, StoryObj } from '@storybook/react';

import { useState } from 'react';

import { ArmorPip, ArmorPipGroup, PipState } from './ArmorPip';

const meta: Meta<typeof ArmorPip> = {
  title: 'Gameplay/ArmorPip',
  component: ArmorPip,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof ArmorPip>;

export const Empty: Story = {
  args: {
    state: 'empty',
    onToggle: () => {},
  },
};

export const Filled: Story = {
  args: {
    state: 'filled',
    onToggle: () => {},
  },
};

export const Destroyed: Story = {
  args: {
    state: 'destroyed',
    onToggle: () => {},
  },
};

export const BlownOff: Story = {
  args: {
    state: 'blown-off',
    onToggle: () => {},
  },
};

export const Disabled: Story = {
  args: {
    state: 'filled',
    onToggle: () => {},
    disabled: true,
  },
};

export const AllStates: StoryObj = {
  render: () => (
    <div className="flex gap-4">
      <div className="text-center">
        <ArmorPip state="empty" onToggle={() => {}} />
        <p className="text-text-theme-secondary mt-1 text-xs">Empty</p>
      </div>
      <div className="text-center">
        <ArmorPip state="filled" onToggle={() => {}} />
        <p className="text-text-theme-secondary mt-1 text-xs">Filled</p>
      </div>
      <div className="text-center">
        <ArmorPip state="destroyed" onToggle={() => {}} />
        <p className="text-text-theme-secondary mt-1 text-xs">Destroyed</p>
      </div>
      <div className="text-center">
        <ArmorPip state="blown-off" onToggle={() => {}} />
        <p className="text-text-theme-secondary mt-1 text-xs">Blown Off</p>
      </div>
    </div>
  ),
};

const InteractivePipExample = () => {
  const [state, setState] = useState<PipState>('filled');
  return (
    <div className="text-center">
      <ArmorPip state={state} onToggle={setState} />
      <p className="text-text-theme-secondary mt-2 text-sm">
        State: <span className="text-accent">{state}</span>
      </p>
      <p className="text-text-theme-muted mt-1 text-xs">
        Click to cycle states
      </p>
    </div>
  );
};

export const InteractivePip: StoryObj = {
  render: () => <InteractivePipExample />,
};

const InteractiveGroupExample = () => {
  const [pips, setPips] = useState<PipState[]>(Array(8).fill('filled'));

  const handlePipChange = (index: number, newState: PipState) => {
    const newPips = [...pips];
    newPips[index] = newState;
    setPips(newPips);
  };

  return (
    <div className="bg-surface-base w-80 rounded-lg p-4">
      <ArmorPipGroup
        location="Center Torso"
        pips={pips}
        onPipChange={handlePipChange}
      />
    </div>
  );
};

export const PipGroup: StoryObj = {
  render: () => <InteractiveGroupExample />,
};
