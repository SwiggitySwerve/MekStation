import type { Meta, StoryObj } from '@storybook/react';

import { action } from '@storybook/addon-actions';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { SAMPLE_SALVAGE_BAY } from './__fixtures__/bayFixtures';
import { BayError } from './BayStates';
import { SalvageAcceptancePanel } from './SalvageAcceptancePanel';

const meta = {
  title: 'Campaign/Bays/SalvageAcceptancePanel',
  component: SalvageAcceptancePanel,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof SalvageAcceptancePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Populated — salvage candidates in a mix of pending / accepted / declined
 * states, with the running mercenary-share value total at the top.
 */
export const Populated: Story = {
  args: {
    salvageBay: SAMPLE_SALVAGE_BAY,
    onDecide: action('decide'),
  },
};

/** Empty — no salvage candidates; an empty state rather than an error (design D7). */
export const Empty: Story = {
  args: {
    salvageBay: [],
    onDecide: action('decide'),
  },
};

/** Error — inventory load failed; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    salvageBay: [],
    onDecide: action('decide'),
  },
  render: () => (
    <BayError
      message="The campaign inventory failed to load."
      onRetry={() => undefined}
    />
  ),
};
