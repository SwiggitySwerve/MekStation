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

import AcquisitionsPage from '@/pages/gameplay/campaigns/[id]/acquisitions';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { createCampaign } from '@/types/campaign/Campaign';

jest.mock('@/pages-modules/gameplay/campaigns/campaignPageShell', () => ({
  useCampaignPageShell: () => {
    const store = jest
      .requireActual('@/stores/campaign/useCampaignStore')
      .useCampaignStore();
    return { campaign: store.getState().campaign, store };
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
