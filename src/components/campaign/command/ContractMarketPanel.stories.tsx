/**
 * Contract Market Panel — Storybook stories
 *
 * Covers tasks.md 4.5: populated, empty, and error variants of the
 * Contract Market surface (CP2b — `add-campaign-command-ui`, design D8).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { Meta, StoryObj } from '@storybook/react';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { SAMPLE_OFFERS } from './__fixtures__/commandFixtures';
import { CommandError } from './CommandStates';
import { ContractMarketPanel } from './ContractMarketPanel';

const meta = {
  title: 'Campaign/Command/ContractMarketPanel',
  component: ContractMarketPanel,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof ContractMarketPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated — a contract market with raid, garrison, and recon offers. */
export const Populated: Story = {
  args: {
    offers: SAMPLE_OFFERS,
    onAccept: () => undefined,
    onDecline: () => undefined,
    busyOfferId: null,
  },
};

/** Empty — no offers this cycle; an empty state, not an error (design D7). */
export const Empty: Story = {
  args: {
    offers: [],
    onAccept: () => undefined,
    onDecline: () => undefined,
    busyOfferId: null,
  },
};

/** Error — a stale accept could not be applied; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    offers: [],
    onAccept: () => undefined,
    onDecline: () => undefined,
    busyOfferId: null,
  },
  render: () => (
    <CommandError
      message="The contract is no longer available on the market."
      onRetry={() => undefined}
    />
  ),
};
