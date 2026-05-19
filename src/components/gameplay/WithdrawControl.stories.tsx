import type { Meta, StoryObj } from '@storybook/react';

import { WithdrawControl } from './WithdrawControl';

const meta: Meta<typeof WithdrawControl> = {
  title: 'Gameplay/WithdrawControl',
  component: WithdrawControl,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof WithdrawControl>;

const decorators = [
  (Story: React.ComponentType) => (
    <div className="w-64">
      <Story />
    </div>
  ),
];

/** The default state — an edge picker plus the Withdraw button. */
export const Idle: Story = {
  args: {
    unitId: 'player-1',
    isWithdrawing: false,
    enabled: true,
    onDeclareWithdrawal: () => {},
  },
  decorators,
};

/** The control disabled (e.g. not the player's turn to act). */
export const Disabled: Story = {
  args: {
    unitId: 'player-1',
    isWithdrawing: false,
    enabled: false,
    onDeclareWithdrawal: () => {},
  },
  decorators,
};

/** A unit that has already declared withdrawal — read-only badge. */
export const Withdrawing: Story = {
  args: {
    unitId: 'player-1',
    isWithdrawing: true,
    enabled: true,
    onDeclareWithdrawal: () => {},
  },
  decorators,
};
