import type { Meta, StoryObj } from '@storybook/react';

import { GameSide } from '@/types/gameplay';

import { MoraleIndicator } from './MoraleIndicator';

const meta: Meta<typeof MoraleIndicator> = {
  title: 'Gameplay/MoraleIndicator',
  component: MoraleIndicator,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof MoraleIndicator>;

const decorators = [
  (Story: React.ComponentType) => (
    <div className="w-56">
      <Story />
    </div>
  ),
];

/** Both sides at the start-of-battle baseline. */
export const Steady: Story = {
  args: {
    battleMorale: {
      [GameSide.Player]: 'STEADY',
      [GameSide.Opponent]: 'STEADY',
    },
  },
  decorators,
};

/** The player ascendant, the opponent rattled. */
export const PlayerWinning: Story = {
  args: {
    battleMorale: {
      [GameSide.Player]: 'INSPIRED',
      [GameSide.Opponent]: 'SHAKEN',
    },
  },
  decorators,
};

/** The opponent's morale has broken — Forced Withdrawal territory. */
export const OpponentBroken: Story = {
  args: {
    battleMorale: {
      [GameSide.Player]: 'CONFIDENT',
      [GameSide.Opponent]: 'BROKEN',
    },
  },
  decorators,
};

/** The extremes of the scale. */
export const Extremes: Story = {
  args: {
    battleMorale: {
      [GameSide.Player]: 'OVERWHELMING',
      [GameSide.Opponent]: 'ROUTED',
    },
  },
  decorators,
};
