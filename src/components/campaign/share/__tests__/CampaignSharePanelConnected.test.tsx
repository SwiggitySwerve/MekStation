/**
 * Connected campaign share panel - who is allowed to ASK for the grants.
 *
 * The grants route answers two different questions before it returns a
 * list: is this campaign a source, and is this caller the campaign's GM.
 * The panel's fetch precondition only ever mirrored the first one, which
 * is a property of the CAMPAIGN - identical for every browser a shared
 * co-op server serves. So a co-op guest, reading the host's own record,
 * satisfied `isSource` and issued a request the server correctly refused
 * `not-campaign-gm`; the browser logs each refusal as a console error.
 *
 * These rows pin the distinction the component now makes: a guest does
 * not ask, a host source still does, and a replica still does not.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import { render, waitFor } from '@testing-library/react';
import React from 'react';

import type { CampaignAuthority } from '@/types/campaign/SerializedCampaign';

import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import { CampaignSharePanelConnected } from '../CampaignSharePanelConnected';

const CAMPAIGN_ID = 'campaign-1';

/** Stamp a stored authority on the persistence store's save metadata. */
function seedAuthority(authority: CampaignAuthority): void {
  const { metadata } = useCampaignPersistenceStore.getState();
  useCampaignPersistenceStore.setState({
    metadata: { ...metadata, authority },
  });
}

/** The URLs of every fetch this render sent to the grants endpoint. */
function grantsCallUrls(mock: jest.Mock): string[] {
  return (mock.mock.calls as readonly unknown[][])
    .map((call) => call[0])
    .filter(
      (url): url is string =>
        typeof url === 'string' && url.includes('/grants'),
    );
}

describe('CampaignSharePanelConnected grants request', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    useCampaignPersistenceStore.getState().reset();
    jest.resetAllMocks();
  });

  it('a guest-mode panel issues no grants request', async () => {
    // A shared-server guest reads the HOST's record, so its stored
    // authority says `source`. Asking anyway is a guaranteed 403
    // `not-campaign-gm` whose answer this browser already knows.
    seedAuthority({ role: 'source' });

    render(
      <CampaignSharePanelConnected
        campaignId={CAMPAIGN_ID}
        coopMode="guest"
        matchId="match-1"
      />,
    );

    // Let every queued effect and microtask settle before concluding
    // "nothing was sent" - an assertion made too early proves nothing.
    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
    expect(grantsCallUrls(fetchMock)).toHaveLength(0);
  });

  it('a host-mode source panel still fetches its grants', async () => {
    seedAuthority({ role: 'source' });

    render(
      <CampaignSharePanelConnected
        campaignId={CAMPAIGN_ID}
        coopMode="host"
        matchId="match-1"
      />,
    );

    await waitFor(() => {
      expect(grantsCallUrls(fetchMock)).toHaveLength(1);
    });
    expect(grantsCallUrls(fetchMock)[0]).toBe(
      `/api/campaigns/${CAMPAIGN_ID}/grants`,
    );
  });

  it('a single-player source panel still fetches its grants', async () => {
    // No co-op session at all: the mount site passes no mode, and the
    // narrowing must not silence the ordinary owner's own panel.
    seedAuthority({ role: 'source' });

    render(<CampaignSharePanelConnected campaignId={CAMPAIGN_ID} />);

    await waitFor(() => {
      expect(grantsCallUrls(fetchMock)).toHaveLength(1);
    });
  });

  it('a replica panel still issues no grants request', async () => {
    seedAuthority({
      role: 'replica',
      sourceInstanceId: 'other-host',
      grantId: 'grant-upstream',
      scopes: ['campaign'],
    });

    render(
      <CampaignSharePanelConnected
        campaignId={CAMPAIGN_ID}
        coopMode="guest"
        matchId="match-1"
      />,
    );

    await waitFor(() => {
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
