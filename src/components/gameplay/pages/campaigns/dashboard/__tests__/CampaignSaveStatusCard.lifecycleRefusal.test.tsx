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

  it('leaves every other refusal exactly as it was', () => {
    refuseWith('HOST_SESSION_REQUIRED', 'sign in as the host');
    render(<CampaignSaveStatusCard />);
    expect(screen.getByTestId('campaign-save-refused')).toBeInTheDocument();
    expect(screen.getByTestId('campaign-save-now-btn')).toBeInTheDocument();
    expect(screen.queryByTestId('campaign-lifecycle-refused')).toBeNull();
  });
});
