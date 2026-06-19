import type { Meta, StoryObj } from '@storybook/react';

import React from 'react';

import { centeredDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { CoopParticipationPicker } from './CoopParticipationPicker';

const meta = {
  title: 'Campaign/Coop/CoopParticipationPicker',
  component: CoopParticipationPicker,
  parameters: centeredDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof CoopParticipationPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Deploying: Story = {
  args: {
    playerName: 'Host Commander',
    value: 'deploy',
    onChange: () => {},
  },
};

export const CommandHq: Story = {
  args: {
    playerName: 'Guest Commander',
    value: 'command-hq',
    onChange: () => {},
  },
};

export const BothInHqWarning: Story = {
  args: {
    playerName: 'Guest Commander',
    value: 'command-hq',
    otherPlayerChoice: 'command-hq',
    onChange: () => {},
  },
  parameters: {
    docs: {
      description: {
        story:
          'Both commanders chose Command HQ — the picker warns the launch is blocked.',
      },
    },
  },
};

export const Interactive: Story = {
  args: { playerName: 'Host Commander', value: 'deploy', onChange: () => {} },
  render: function InteractivePicker() {
    const [host, setHost] = React.useState<'deploy' | 'command-hq'>('deploy');
    const [guest, setGuest] = React.useState<'deploy' | 'command-hq'>(
      'command-hq',
    );
    return (
      <div className="flex gap-4">
        <CoopParticipationPicker
          playerName="Host Commander"
          value={host}
          otherPlayerChoice={guest}
          onChange={setHost}
        />
        <CoopParticipationPicker
          playerName="Guest Commander"
          value={guest}
          otherPlayerChoice={host}
          onChange={setGuest}
        />
      </div>
    );
  },
};
