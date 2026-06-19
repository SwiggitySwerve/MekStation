import type { Meta, StoryObj } from '@storybook/react';

import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';

import { centeredDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { HostGmReviewSurface } from './HostGmReviewSurface';

const meta = {
  title: 'Campaign/Coop/HostGmReviewSurface',
  component: HostGmReviewSurface,
  parameters: centeredDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof HostGmReviewSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

const spendProposal: IPendingProposal = {
  proposal: {
    proposalId: 'prop-spend',
    campaignId: 'campaign-1',
    proposingPlayerId: 'guest-player',
    ts: '2026-05-19T10:00:00.000Z',
    intent: {
      kind: 'SpendFunds',
      campaignId: 'campaign-1',
      intentId: 'intent-spend',
      payload: { amount: 120_000, reason: 'Replacement actuator' },
    },
  },
  balanceAtSubmit: 640_000,
  relevantStanding: null,
  effectSummary: 'Spend 120,000 C-bills — Replacement actuator',
};

const contractProposal: IPendingProposal = {
  proposal: {
    proposalId: 'prop-contract',
    campaignId: 'campaign-1',
    proposingPlayerId: 'guest-player',
    ts: '2026-05-19T10:05:00.000Z',
    intent: {
      kind: 'AcceptContract',
      campaignId: 'campaign-1',
      intentId: 'intent-contract',
      payload: {
        contract: {
          contractId: 'c1',
          name: 'Garrison Duty — Hesperus II',
          employerFactionId: 'steiner',
        },
      },
    },
  },
  balanceAtSubmit: 640_000,
  relevantStanding: 18,
  effectSummary: 'Accept contract Garrison Duty — Hesperus II',
};

export const Empty: Story = {
  args: { pending: [], onDecide: () => {} },
};

export const SingleProposal: Story = {
  args: { pending: [spendProposal], onDecide: () => {} },
};

export const MultipleProposals: Story = {
  args: { pending: [spendProposal, contractProposal], onDecide: () => {} },
};
