/**
 * Prestige & Morale Panel — Storybook stories
 *
 * Covers tasks.md 8.4: populated, empty, and error variants of the
 * Prestige & Morale surface (CP3 — `add-campaign-refit-and-prestige`).
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import type { Meta, StoryObj } from '@storybook/react';

import { MoraleState } from '@/types/campaign/Prestige';

import { paddedDarkCampaignStoryParameters } from '../campaignStoryParameters';
import {
  SAMPLE_MORALE_TRANSITIONS,
  SAMPLE_UNIT_PRESTIGE,
} from './__fixtures__/prestigeMoraleFixtures';
import { CommandError } from './CommandStates';
import { PrestigeMoralePanel } from './PrestigeMoralePanel';

const meta = {
  title: 'Campaign/Command/PrestigeMoralePanel',
  component: PrestigeMoralePanel,
  parameters: paddedDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof PrestigeMoralePanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated — a morale state with transitions and per-unit prestige. */
export const Populated: Story = {
  args: {
    moraleState: MoraleState.High,
    moraleTransitions: SAMPLE_MORALE_TRANSITIONS,
    unitPrestige: SAMPLE_UNIT_PRESTIGE,
  },
};

/** Empty — a fresh campaign: default morale, no transitions, no prestige. */
export const Empty: Story = {
  args: {
    moraleState: MoraleState.Steady,
    moraleTransitions: [],
    unitPrestige: [],
  },
};

/** Error — the campaign data failed to load; shows the retry affordance. */
export const ErrorState: Story = {
  args: {
    moraleState: MoraleState.Steady,
    moraleTransitions: [],
    unitPrestige: [],
  },
  render: () => (
    <CommandError
      message="The campaign data failed to load."
      onRetry={() => undefined}
    />
  ),
};
