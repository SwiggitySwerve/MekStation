/**
 * Hiring Panel — Storybook stories
 *
 * Covers tasks.md 2.4: populated, empty, and error variants of the
 * Personnel & Hiring surface (CP2b — `add-campaign-command-ui`, design D8).
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import type { Meta, StoryObj } from '@storybook/react';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { SAMPLE_CANDIDATES } from './__fixtures__/commandFixtures';
import { CommandError } from './CommandStates';
import { HiringPanel } from './HiringPanel';

const meta = {
  title: 'Campaign/Command/HiringPanel',
  component: HiringPanel,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof HiringPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated — a personnel market with elite, regular, and green recruits. */
export const Populated: Story = {
  args: {
    candidates: SAMPLE_CANDIDATES,
    onHire: () => undefined,
    hiringOfferId: null,
  },
};

/** Empty — no candidates this cycle; an empty state, not an error (design D7). */
export const Empty: Story = {
  args: {
    candidates: [],
    onHire: () => undefined,
    hiringOfferId: null,
  },
};

/** Error — a stale hire could not be applied; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    candidates: [],
    onHire: () => undefined,
    hiringOfferId: null,
  },
  render: () => (
    <CommandError
      message="The candidate is no longer available on the market."
      onRetry={() => undefined}
    />
  ),
};
