/**
 * K13 PR3: on the real dashboard and the real campaign store, one click on
 * Advance One Day starts one advance; while it is in flight both Day Advance
 * buttons are disabled, so a second click starts nothing; they come back when
 * it settles.
 */

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import type { DayReport } from '@/lib/campaign/dayAdvancement';

import { CampaignDashboard } from '@/components/campaign/dashboard/CampaignDashboard';
import {
  resetCampaignStore,
  useCampaignStore,
} from '@/stores/campaign/useCampaignStore';
import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { createCampaign } from '@/types/campaign/Campaign';

jest.mock('@/lib/campaign/hooks/useCampaignActivityFeed', () => ({
  ...jest.requireActual('@/lib/campaign/hooks/useCampaignActivityFeed'),
  useCampaignActivityFeed: () => ({
    source: 'authoritative',
    status: 'ready',
    entries: [],
    viewerSeat: 'gm',
  }),
}));

describe('CampaignDashboard advance buttons', () => {
  afterEach(() => {
    resetCampaignStore();
    clientSafeStorage.removeItem('campaign-store');
  });

  it('(B8) one click starts one advance, both buttons stay disabled until it settles', async () => {
    const store = useCampaignStore();
    let settle: () => void = () => undefined;
    // The store's own lock, as the real action sets and clears it.
    const advanceDay = jest.fn(
      () =>
        new Promise<DayReport | null>((resolve) => {
          store.setState({ dayAdvanceInFlight: true });
          settle = () => {
            store.setState({ dayAdvanceInFlight: false });
            resolve(null);
          };
        }),
    );
    act(() => {
      store.setState({
        campaign: createCampaign('Advance Buttons Co.', 'mercenary'),
        advanceDay,
      });
    });
    render(<CampaignDashboard />);
    const oneDay = screen.getByTestId('day-advance-one-day');
    const oneWeek = screen.getByTestId('day-advance-one-week');
    expect(oneDay).toBeEnabled();
    expect(oneWeek).toBeEnabled();

    await userEvent.click(oneDay);
    await waitFor(() => expect(oneDay).toBeDisabled());
    expect(oneWeek).toBeDisabled();
    await userEvent.click(oneDay);
    await userEvent.click(oneWeek);
    expect(advanceDay).toHaveBeenCalledTimes(1);

    await act(async () => settle());
    await waitFor(() => expect(oneDay).toBeEnabled());
    expect(oneWeek).toBeEnabled();
    await userEvent.click(oneDay);
    expect(advanceDay).toHaveBeenCalledTimes(2);
    await act(async () => settle());
  });
});
