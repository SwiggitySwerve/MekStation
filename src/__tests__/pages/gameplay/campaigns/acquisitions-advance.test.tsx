/**
 * K13 PR3: the Acquisitions page judges the day advance by its awaited
 * result, not by the Promise a co-op advance returns (which is truthy whether
 * or not the day was saved), and its Process Next Day button is disabled while
 * an advance is in flight and fires once.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { DayReport } from '@/lib/campaign/dayAdvancement';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';

import {
  SAMPLE_CANDIDATES,
  SAMPLE_OFFERS,
} from '@/components/campaign/command/__fixtures__/commandFixtures';
import AcquisitionsPage from '@/pages/gameplay/campaigns/[id]/acquisitions';
import ContractMarketPage from '@/pages/gameplay/campaigns/[id]/contract-market';
import HiringPage from '@/pages/gameplay/campaigns/[id]/hiring';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';
import {
  createHostCoopSession,
  createGuestCoopSession,
} from '@/types/campaign/CoopSession';
import { PersonnelMarketStyle } from '@/types/campaign/markets/marketTypes';

jest.mock('@/pages-modules/gameplay/campaigns/campaignPageShell', () => ({
  useCampaignPageShell: () => {
    const store = jest
      .requireActual('@/stores/campaign/useCampaignStore')
      .useCampaignStore();
    return { campaign: store.getState().campaign, store, isClient: true };
  },
  useCampaignLoadStatus: () => ({
    saveState: 'idle',
    errorMessage: null,
    loadCampaign: jest.fn(),
  }),
  renderPendingCampaignPage: () => null,
  getLoadedCampaign: (shell: { campaign: unknown }) => shell.campaign,
  CampaignPageFrameFromShell: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  renderCampaignCommandFeedback: ({
    actionError,
  }: {
    actionError?: string | null;
  }) => (actionError ? <p data-testid="action-error">{actionError}</p> : null),
}));

const REPORT = { date: new Date('3025-01-01T00:00:00.000Z') } as DayReport;

function seed(advanceDay: () => unknown): void {
  act(() => {
    useCampaignStore().setState({
      campaign: createCampaign('Acquisitions Co.', 'mercenary'),
      advanceDay: advanceDay as never,
    });
  });
}

describe('Acquisitions page day advance', () => {
  afterEach(() => resetCampaignStore());

  it('(B11) an advance that resolves with no report shows the error, not success', async () => {
    seed(() => Promise.resolve(null));
    render(<AcquisitionsPage />);

    await userEvent.click(screen.getByTestId('acquisitions-advance-day'));

    expect(await screen.findByTestId('action-error')).toHaveTextContent(
      'The acquisition processor could not advance the day.',
    );
  });

  it('(B12) an advance that resolves with a report shows no error', async () => {
    const advanceDay = jest.fn(() => Promise.resolve(REPORT));
    seed(advanceDay);
    render(<AcquisitionsPage />);

    await userEvent.click(screen.getByTestId('acquisitions-advance-day'));

    await waitFor(() => expect(advanceDay).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('action-error')).not.toBeInTheDocument();
  });

  it('(B13) the button is disabled while the advance is in flight, so a second click starts nothing', async () => {
    const store = useCampaignStore();
    let settle: () => void = () => undefined;
    const advanceDay = jest.fn(
      () =>
        new Promise<DayReport | null>((resolve) => {
          store.setState({ dayAdvanceInFlight: true });
          settle = () => {
            store.setState({ dayAdvanceInFlight: false });
            resolve(REPORT);
          };
        }),
    );
    seed(advanceDay);
    render(<AcquisitionsPage />);
    const button = screen.getByTestId('acquisitions-advance-day');
    expect(button).toBeEnabled();

    await userEvent.click(button);
    await waitFor(() => expect(button).toBeDisabled());
    await userEvent.click(button);
    expect(advanceDay).toHaveBeenCalledTimes(1);

    await act(async () => settle());
    await waitFor(() => expect(button).toBeEnabled());
  });
});

describe('market pages local admission (K14a)', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetCampaignStore();
  });
  afterEach(() => resetCampaignStore());

  it.each(['host', 'guest'] as const)(
    'keeps populated local controls inert for a co-op %s',
    (mode) => {
      const store = useCampaignStore();
      const campaign: ICampaignWithCommand = {
        ...createCampaign('Market', 'mercenary'),
        personnelMarket: SAMPLE_CANDIDATES,
        contractMarket: { offers: SAMPLE_OFFERS, declinedOfferIds: [] },
        coopSession:
          mode === 'host'
            ? createHostCoopSession('ABCDEF', 'match')
            : createGuestCoopSession('match', 'ABCDEF'),
      };
      store.setState({ campaign });
      const before = store.getState().campaign;
      for (const Page of [HiringPage, ContractMarketPage]) {
        const view = render(<Page />);
        for (const button of screen.getAllByRole('button'))
          expect(button).toBeDisabled();
        expect(screen.getByRole('status')).toHaveTextContent(
          'Use the co-op proposal controls for market changes.',
        );
        expect(store.getState().campaign).toBe(before);
        view.unmount();
      }
    },
  );

  it.each(['host', 'guest', 'advancing'] as const)(
    'never seeds either market while %s',
    (mode) => {
      const store = useCampaignStore();
      const campaign = createCampaign('Market', 'mercenary', {
        personnelMarketStyle: PersonnelMarketStyle.MEKHQ,
        contractMarketMethod: 'atb_monthly',
      });
      store.setState({
        campaign: {
          ...campaign,
          ...(mode === 'advancing'
            ? {}
            : {
                coopSession:
                  mode === 'host'
                    ? createHostCoopSession('ABCDEF', 'match')
                    : createGuestCoopSession('match', 'ABCDEF'),
              }),
        },
        dayAdvanceInFlight: mode === 'advancing',
      });
      const before = store.getState().campaign;
      const view = render(<HiringPage />);
      expect(store.getState().campaign).toBe(before);
      expect(screen.getByRole('status')).toHaveTextContent(
        mode === 'advancing'
          ? 'Wait for the campaign clock to finish advancing.'
          : 'Use the co-op proposal controls for market changes.',
      );
      view.unmount();
      render(<ContractMarketPage />);
      expect(store.getState().campaign).toBe(before);
    },
  );

  it.each([HiringPage, ContractMarketPage])(
    'disables populated market controls during day advance and releases them afterward',
    (Page) => {
      const store = useCampaignStore();
      const campaign: ICampaignWithCommand = {
        ...createCampaign('Market', 'mercenary'),
        personnelMarket: SAMPLE_CANDIDATES,
        contractMarket: { offers: SAMPLE_OFFERS, declinedOfferIds: [] },
      };
      store.setState({ campaign, dayAdvanceInFlight: true });
      render(<Page />);
      for (const button of screen.getAllByRole('button'))
        expect(button).toBeDisabled();
      act(() => store.setState({ dayAdvanceInFlight: false }));
      for (const button of screen.getAllByRole('button'))
        expect(button).toBeEnabled();
    },
  );
});
