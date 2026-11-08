/**
 * K14b PR4: the market pages on a co-op campaign.
 *
 * - Host Hire goes to the live campaign host as `HireOffer { offerId }` - the
 *   offer id and nothing else - and writes nothing locally. A committed hire
 *   re-reads the saved record; a refusal is shown in words.
 * - A guest's Hire and Accept are disabled with the guest reason: guests do
 *   not receive the host's market.
 * - Decline carries its own co-op reason on host and guest alike: there is
 *   no host-authoritative decline yet.
 *
 * The page shell is mocked to hand each page one campaign and a store whose
 * updateCampaign is a spy. The co-op host transport is a fake registered in
 * the real transport registry, answering the way the live host does.
 *
 * Lives under src/__tests__/pages/ so Next does not treat the spec as a route.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { SAMPLE_CANDIDATES } from '@/components/campaign/command/__fixtures__/commandFixtures';
import { SAMPLE_OFFERS } from '@/components/campaign/command/__fixtures__/commandFixtures';
import {
  _resetCampaignSyncTransportsForTest,
  registerCampaignSyncTransport,
  type CampaignSyncFrameHandler,
  type ICampaignSyncTransport,
} from '@/lib/campaign/coop/campaignSyncTransport';
import {
  COOP_DECLINE_REFUSAL,
  COOP_GUEST_MARKET_REFUSAL,
} from '@/lib/campaign/markets/offerLifecycle';
import ContractMarketPage from '@/pages/gameplay/campaigns/[id]/contract-market';
import HiringPage from '@/pages/gameplay/campaigns/[id]/hiring';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { createCampaign } from '@/types/campaign/Campaign';

const CAMPAIGN_ID = 'campaign-k14b-market';
const MATCH_ID = 'match-k14b-market';

const mockUpdateCampaign = jest.fn((_updates: unknown) => true);
let mockCampaign: ICampaign;

jest.mock('@/pages-modules/gameplay/campaigns/campaignPageShell', () => ({
  ...jest.requireActual('@/pages-modules/gameplay/campaigns/campaignPageShell'),
  useCampaignPageShell: () => ({
    campaign: mockCampaign,
    breadcrumbs: [],
    isClient: true,
    isLoadingCampaign: false,
    store: {
      getState: () => ({
        updateCampaign: mockUpdateCampaign,
        dayAdvanceInFlight: false,
      }),
    },
  }),
  renderPendingCampaignPage: () => null,
  getLoadedCampaign: () => mockCampaign,
  CampaignPageFrameFromShell: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));

const CANDIDATE = SAMPLE_CANDIDATES[0];

function campaignOf(mode: 'host' | 'guest'): ICampaign {
  const campaign: ICampaignWithCommand = {
    ...createCampaign('K14b Market Co.', 'mercenary', {
      startingFunds: 1_000_000,
    }),
    id: CAMPAIGN_ID,
    currentDate: new Date('3025-01-01T00:00:00.000Z'),
    coopSession: { mode, roomCode: 'ABC234', matchId: MATCH_ID },
    personnelMarket: [{ ...CANDIDATE, expirationDate: '3999-12-31' }],
    contractMarket: { offers: SAMPLE_OFFERS, declinedOfferIds: [] },
  };
  return campaign;
}

/**
 * A host-role transport for MATCH_ID that records each host intent and
 * answers it with `answer(intent)`; `null` leaves the intent unanswered.
 */
function fakeHostTransport(
  answer: (intent: Record<string, unknown>) => IServerMessage | null,
): Record<string, unknown>[] {
  const listeners = new Set<CampaignSyncFrameHandler>();
  const sent: Record<string, unknown>[] = [];
  const transport: ICampaignSyncTransport = {
    matchId: MATCH_ID,
    playerId: 'pid_host',
    role: 'host',
    sendProposal: jest.fn(),
    sendDecision: jest.fn(),
    sendHostIntent: (intent) => {
      sent.push(intent as unknown as Record<string, unknown>);
      const reply = answer(intent as unknown as Record<string, unknown>);
      if (reply === null) return;
      Promise.resolve().then(() => listeners.forEach((l) => l(reply)));
    },
    sendParticipation: jest.fn(),
    onFrame: (handler) => {
      listeners.add(handler);
      return () => listeners.delete(handler);
    },
    onError: () => () => undefined,
    close: jest.fn(),
    lastSeq: () => 0,
  };
  registerCampaignSyncTransport(transport);
  return sent;
}

/** The live host's PilotHired answer to a HireOffer intent. */
function pilotHiredAnswer(intent: Record<string, unknown>): IServerMessage {
  const offerId = (intent.payload as { offerId: string }).offerId;
  return {
    kind: 'CampaignEvent',
    matchId: MATCH_ID,
    ts: '2026-11-08T00:00:00.000Z',
    event: {
      type: 'PilotHired',
      sequence: 2,
      campaignId: CAMPAIGN_ID,
      ts: '2026-11-08T00:00:00.000Z',
      authorPlayerId: 'pid_host',
      scope: 'campaign',
      payload: {
        pilot: { pilotId: `hired-${offerId}`, name: CANDIDATE.name },
        cost: CANDIDATE.hireCost,
      },
    },
  } as unknown as IServerMessage;
}

function refusalAnswer(reason: string) {
  return (intent: Record<string, unknown>): IServerMessage =>
    ({
      kind: 'Error',
      matchId: MATCH_ID,
      code: 'INVALID_INTENT',
      reason,
      intentId: intent.intentId,
    }) as unknown as IServerMessage;
}

async function settle(): Promise<void> {
  await act(async () => {
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

describe('co-op market pages (K14b PR4)', () => {
  let refreshSpy: jest.Mock;

  beforeEach(() => {
    mockUpdateCampaign.mockClear();
    refreshSpy = jest.fn(async () => true);
    useCampaignPersistenceStore.setState({
      refreshAfterCommittedCommand: refreshSpy,
    } as never);
  });

  afterEach(() => {
    _resetCampaignSyncTransportsForTest();
  });

  describe('host Hire', () => {
    it('sends HireOffer naming only the offer, writes nothing locally, and re-reads the saved record', async () => {
      mockCampaign = campaignOf('host');
      const sent = fakeHostTransport(pilotHiredAnswer);
      render(<HiringPage />);

      const hire = screen.getByTestId(`candidate-hire-${CANDIDATE.id}`);
      expect(hire).toBeEnabled();
      fireEvent.click(hire);
      await settle();

      expect(sent).toHaveLength(1);
      expect(sent[0]).toMatchObject({
        kind: 'HireOffer',
        campaignId: CAMPAIGN_ID,
        payload: { offerId: CANDIDATE.id },
      });
      expect(Object.keys(sent[0].payload as object)).toEqual(['offerId']);
      expect(mockUpdateCampaign).not.toHaveBeenCalled();
      expect(refreshSpy).toHaveBeenCalledTimes(1);
      expect(screen.queryByTestId('command-error')).not.toBeInTheDocument();
    });

    it('holds the Hire button while the host has not answered', async () => {
      mockCampaign = campaignOf('host');
      const sent = fakeHostTransport(() => null);
      render(<HiringPage />);

      fireEvent.click(screen.getByTestId(`candidate-hire-${CANDIDATE.id}`));
      await settle();
      fireEvent.click(screen.getByTestId(`candidate-hire-${CANDIDATE.id}`));
      await settle();

      expect(
        screen.getByTestId(`candidate-hire-${CANDIDATE.id}`),
      ).toBeDisabled();
      expect(sent).toHaveLength(1);
    });

    it("does not settle on another offer's hire", async () => {
      mockCampaign = campaignOf('host');
      fakeHostTransport((intent) =>
        pilotHiredAnswer({ ...intent, payload: { offerId: 'someone-else' } }),
      );
      render(<HiringPage />);

      fireEvent.click(screen.getByTestId(`candidate-hire-${CANDIDATE.id}`));
      await settle();

      expect(refreshSpy).not.toHaveBeenCalled();
      expect(
        screen.getByTestId(`candidate-hire-${CANDIDATE.id}`),
      ).toBeDisabled();
    });

    it('shows a host refusal in words and refreshes nothing', async () => {
      mockCampaign = campaignOf('host');
      fakeHostTransport(refusalAnswer('insufficient-funds'));
      render(<HiringPage />);

      fireEvent.click(screen.getByTestId(`candidate-hire-${CANDIDATE.id}`));
      await settle();

      expect(
        screen.getByText('The campaign cannot afford this hire.'),
      ).toBeInTheDocument();
      expect(refreshSpy).not.toHaveBeenCalled();
      expect(mockUpdateCampaign).not.toHaveBeenCalled();
    });

    it('says so when no live host connection exists, sending nothing', async () => {
      mockCampaign = campaignOf('host');
      render(<HiringPage />);

      fireEvent.click(screen.getByTestId(`candidate-hire-${CANDIDATE.id}`));
      await settle();

      expect(
        screen.getByText(
          'The co-op host connection is unavailable. Reconnect and try again.',
        ),
      ).toBeInTheDocument();
      expect(mockUpdateCampaign).not.toHaveBeenCalled();
    });
  });

  describe('guest', () => {
    it('disables Hire with the guest reason', () => {
      mockCampaign = campaignOf('guest');
      render(<HiringPage />);

      expect(
        screen.getByTestId(`candidate-hire-${CANDIDATE.id}`),
      ).toBeDisabled();
      expect(screen.getByText(COOP_GUEST_MARKET_REFUSAL)).toBeInTheDocument();
    });

    it('disables Accept with the guest reason and Decline with its own', () => {
      mockCampaign = campaignOf('guest');
      render(<ContractMarketPage />);
      const id = SAMPLE_OFFERS[0].id;

      expect(screen.getByTestId(`offer-accept-${id}`)).toHaveAttribute(
        'title',
        COOP_GUEST_MARKET_REFUSAL,
      );
      expect(screen.getByTestId(`offer-decline-${id}`)).toHaveAttribute(
        'title',
        COOP_DECLINE_REFUSAL,
      );
      expect(screen.getByText(COOP_DECLINE_REFUSAL)).toBeInTheDocument();
    });
  });

  it('gives a co-op host Decline its own reason', () => {
    mockCampaign = campaignOf('host');
    render(<ContractMarketPage />);
    const decline = screen.getByTestId(`offer-decline-${SAMPLE_OFFERS[0].id}`);

    expect(decline).toBeDisabled();
    expect(decline).toHaveAttribute('title', COOP_DECLINE_REFUSAL);
    expect(screen.getByText(COOP_DECLINE_REFUSAL)).toBeInTheDocument();
  });
});
