import type { Meta, StoryObj } from '@storybook/react';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import {
  SAMPLE_REPAIR_BAY,
  SAMPLE_ROSTER_UNITS,
} from './__fixtures__/bayFixtures';
import { BayError } from './BayStates';
import { MechBay } from './MechBay';

const meta = {
  title: 'Campaign/Bays/MechBay',
  component: MechBay,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof MechBay>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated — a roster with ready, damaged, and destroyed units. */
export const Populated: Story = {
  args: {
    units: SAMPLE_ROSTER_UNITS,
    repairBay: SAMPLE_REPAIR_BAY,
    campaignId: 'campaign-demo',
  },
};

/** Empty — no roster units; an empty state rather than an error (design D7). */
export const Empty: Story = {
  args: {
    units: [],
    repairBay: [],
    campaignId: 'campaign-demo',
  },
};

/** Error — inventory load failed; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    units: [],
    repairBay: [],
    campaignId: 'campaign-demo',
  },
  render: () => (
    <BayError
      message="The campaign inventory failed to load."
      onRetry={() => undefined}
    />
  ),
};
