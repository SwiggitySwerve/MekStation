import type { Meta, StoryObj } from '@storybook/react';

import React from 'react';

import type { ICampaignIntent } from '@/types/campaign/CampaignSync';
import type {
  GuestProposalResult,
  IGuestProposal,
} from '@/types/campaign/CoopCampaign';

import { centeredDarkCampaignStoryParameters } from '../campaignStoryParameters';
import { GuestProposalSurface } from './GuestProposalSurface';
import { useGuestProposals } from './useGuestProposals';

const meta = {
  title: 'Campaign/Coop/GuestProposalSurface',
  component: GuestProposalSurface,
  parameters: centeredDarkCampaignStoryParameters,
  tags: ['autodocs'],
} satisfies Meta<typeof GuestProposalSurface>;

export default meta;
type Story = StoryObj<typeof meta>;

const spendIntent: ICampaignIntent = {
  kind: 'SpendFunds',
  campaignId: 'campaign-1',
  intentId: 'intent-spend',
  payload: { amount: 80_000, reason: 'Ammo restock' },
};

const hireIntent: ICampaignIntent = {
  kind: 'HirePilot',
  campaignId: 'campaign-1',
  intentId: 'intent-hire',
  payload: {
    pilot: { pilotId: 'p1', name: 'Natasha Kerensky' },
    cost: 120_000,
  },
};

const ACTIONS = [
  {
    kind: 'SpendFunds' as const,
    label: 'Spend Funds',
    buildIntent: () => spendIntent,
  },
  {
    kind: 'HirePilot' as const,
    label: 'Hire Pilot',
    buildIntent: () => hireIntent,
  },
];

/**
 * A demo transport that resolves a proposal after a short delay with a
 * configurable outcome — so the pending → resolved transition is
 * visible in the story.
 */
function demoTransport(
  outcome: (proposal: IGuestProposal) => GuestProposalResult,
) {
  return (proposal: IGuestProposal): Promise<GuestProposalResult> =>
    new Promise((resolve) => {
      setTimeout(() => resolve(outcome(proposal)), 900);
    });
}

export const AutoApproveDemo: Story = {
  args: { api: undefined as never, actions: ACTIONS },
  render: function AutoApprove() {
    const api = useGuestProposals(
      demoTransport((proposal) => ({
        status: 'committed',
        proposalId: proposal.proposalId,
        events: [],
      })),
      'guest-player',
    );
    return <GuestProposalSurface api={api} actions={ACTIONS} />;
  },
};

export const VetoDemo: Story = {
  args: { api: undefined as never, actions: ACTIONS },
  render: function Veto() {
    const api = useGuestProposals(
      demoTransport((proposal) => ({
        status: 'vetoed',
        proposalId: proposal.proposalId,
        error: {
          ok: false,
          code: 'PROPOSAL_VETOED',
          proposalId: proposal.proposalId,
        },
      })),
      'guest-player',
    );
    return <GuestProposalSurface api={api} actions={ACTIONS} />;
  },
};

export const MechanicalRejectionDemo: Story = {
  args: { api: undefined as never, actions: ACTIONS },
  render: function Rejected() {
    const api = useGuestProposals(
      demoTransport((proposal) => ({
        status: 'mechanically-rejected',
        proposalId: proposal.proposalId,
        code: 'INVALID_CAMPAIGN_INTENT',
        reason: 'insufficient-funds',
      })),
      'guest-player',
    );
    return <GuestProposalSurface api={api} actions={ACTIONS} />;
  },
};
