/**
 * The save-status card when the contract-rules reader gate refuses (S1b,
 * matrix row O): the server's sentence and a Reload action, never Retry or
 * Save now, because neither can succeed on this copy of MekStation.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import React from 'react';

import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import {
  lifecycleAwareStorage,
  resetOutdatedTabNotices,
} from '@/stores/utils/lifecycleAwareStorage';

import { CampaignSaveStatusCard } from '../CampaignSaveStatusCard';

const SENTENCE =
  'This campaign uses contract rules newer than this copy of MekStation reads (it needs rules 2; this copy reads rules 1). Reload this page to update, then try again. Nothing was changed.';

function refuseWith(code: string, message = SENTENCE): void {
  useCampaignPersistenceStore.setState({
    saveState: 'error',
    errorMessage: message,
    dirty: true,
    saveRefusal: { code, reason: code.toLowerCase(), message },
  });
}

describe('CampaignSaveStatusCard reader-gate refusal', () => {
  afterEach(() => {
    cleanup();
    useCampaignPersistenceStore.getState().reset();
  });

  it('shows the server sentence with a Reload action and no Save now', async () => {
    refuseWith('CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED');
    const reloadPage = jest.fn();
    render(<CampaignSaveStatusCard reloadPage={reloadPage} />);

    expect(screen.getByTestId('campaign-lifecycle-refused')).toHaveTextContent(
      SENTENCE,
    );
    expect(screen.queryByTestId('campaign-save-now-btn')).toBeNull();
    // The generic "kept in this window" line would promise a save that
    // cannot happen on this copy.
    expect(screen.queryByTestId('campaign-save-refused')).toBeNull();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    });
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  describe('in the desktop shell, where a reload updates nothing', () => {
    beforeEach(() => {
      (window as unknown as { electronAPI: object }).electronAPI = {};
    });
    afterEach(() => {
      delete (window as unknown as { electronAPI?: object }).electronAPI;
    });

    it('shows the update sentence with no Reload and no Save now', () => {
      const desktopSentence = SENTENCE.replace(
        'Reload this page to update, then try again.',
        'Update MekStation, then open this campaign again.',
      );
      refuseWith('CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED', desktopSentence);
      render(<CampaignSaveStatusCard />);
      expect(
        screen.getByTestId('campaign-lifecycle-refused'),
      ).toHaveTextContent('Update MekStation, then open this campaign again.');
      expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
      expect(screen.queryByTestId('campaign-lifecycle-reload-btn')).toBeNull();
      expect(screen.queryByTestId('campaign-save-now-btn')).toBeNull();
    });
  });

  it('for an unreadable version shows the sentence and offers neither Reload nor Save now', () => {
    refuseWith(
      'CAMPAIGN_LIFECYCLE_RULES_UNREADABLE',
      'This campaign has contract data this copy of MekStation cannot read, so changes to it are not saved. You can still look at it. Nothing was changed.',
    );
    render(<CampaignSaveStatusCard />);
    expect(screen.getByTestId('campaign-lifecycle-refused')).toHaveTextContent(
      'cannot read',
    );
    expect(screen.queryByRole('button', { name: 'Reload' })).toBeNull();
    expect(screen.queryByTestId('campaign-save-now-btn')).toBeNull();
  });

  describe('outdated-tab notice (storage seam)', () => {
    afterEach(() => {
      // Reset while nothing is mounted, so no live component sees the change.
      cleanup();
      resetOutdatedTabNotices();
    });

    function oldTabWroteOver(campaignName: string | null): void {
      const slot = JSON.stringify({
        stamp: 1,
        campaignId: 'c1',
        campaignName,
        value: JSON.stringify({
          state: { campaign: { id: 'c1', name: campaignName, missions: [] } },
          version: 0,
        }),
      });
      localStorage.setItem('campaign-store.lifecycle', slot);
      localStorage.setItem(
        'campaign-store',
        JSON.stringify({
          state: {
            // The older tab's copy: it never knew the campaign's real name.
            campaign: { id: 'c1', missions: [] },
            activityLog: [],
          },
          version: 0,
        }),
      );
      lifecycleAwareStorage.getItem('campaign-store');
    }

    afterEach(() => localStorage.clear());

    it('names the campaign and says the outdated tab changes were not kept', () => {
      oldTabWroteOver('Wolf Dragoons');
      render(<CampaignSaveStatusCard />);
      expect(screen.getByTestId('campaign-outdated-tab-c1')).toHaveTextContent(
        'Changes made to “Wolf Dragoons” in an outdated tab were not kept.',
      );
    });

    it('falls back to a plain phrase when the campaign has no name', () => {
      oldTabWroteOver(null);
      render(<CampaignSaveStatusCard />);
      expect(screen.getByTestId('campaign-outdated-tab-c1')).toHaveTextContent(
        'Changes made to this campaign in an outdated tab were not kept.',
      );
    });

    it('can be dismissed', async () => {
      oldTabWroteOver('Wolf Dragoons');
      render(<CampaignSaveStatusCard />);
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
      });
      expect(screen.queryByTestId('campaign-outdated-tab-c1')).toBeNull();
    });

    it('shows nothing when no outdated tab was involved', () => {
      render(<CampaignSaveStatusCard />);
      expect(screen.queryByTestId('campaign-outdated-tab-c1')).toBeNull();
    });
  });

  it('leaves every other refusal exactly as it was', () => {
    refuseWith('HOST_SESSION_REQUIRED', 'sign in as the host');
    render(<CampaignSaveStatusCard />);
    expect(screen.getByTestId('campaign-save-refused')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-save-now-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('campaign-lifecycle-refused')).toBeNull();
  });
});
