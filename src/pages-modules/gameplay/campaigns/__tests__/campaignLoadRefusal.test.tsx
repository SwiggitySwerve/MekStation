/**
 * The campaign pages' load-error blocks when the contract-rules reader gate
 * refuses (S1b, matrix row O): a Reload action in place of Retry, because a
 * retry against the same copy of MekStation cannot succeed.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import React from 'react';

import {
  CampaignBayLoadError,
  CampaignCommandLoadError,
} from '../campaignPageShell';

const SENTENCE =
  'This campaign uses contract rules newer than this copy of MekStation reads (it needs rules 2; this copy reads rules 1). Reload this page to update, then try again. Nothing was changed.';

function status(code: string | null) {
  return {
    saveState: 'error' as const,
    errorMessage: SENTENCE,
    saveRefusal:
      code === null ? null : { code, reason: code, message: SENTENCE },
    loadCampaign: jest.fn(),
  };
}

describe('campaign load errors under the reader gate', () => {
  afterEach(cleanup);

  it('offers Reload, not Retry, on a bay page', () => {
    const reloadPage = jest.fn();
    const loadStatus = status('CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED');
    render(
      <CampaignBayLoadError
        campaignId="c1"
        loadStatus={loadStatus}
        reloadPage={reloadPage}
      />,
    );
    expect(screen.getByText(SENTENCE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
    expect(loadStatus.loadCampaign).not.toHaveBeenCalled();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('offers Reload, not Retry, on a command page', () => {
    const reloadPage = jest.fn();
    render(
      <CampaignCommandLoadError
        campaignId="c1"
        loadStatus={status('CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED')}
        reloadPage={reloadPage}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reloadPage).toHaveBeenCalledTimes(1);
  });

  describe('in the desktop shell, where a reload updates nothing', () => {
    const DESKTOP_SENTENCE = SENTENCE.replace(
      'Reload this page to update, then try again.',
      'Choose Help > Check for Updates... to update MekStation, then open this campaign again.',
    );

    beforeEach(() => {
      (window as unknown as { electronAPI: object }).electronAPI = {};
    });
    afterEach(() => {
      delete (window as unknown as { electronAPI?: object }).electronAPI;
    });

    it.each([
      ['bay', CampaignBayLoadError, 'bay-error-retry'],
      ['command', CampaignCommandLoadError, 'command-error-retry'],
    ])('offers no Reload and no Retry on a %s page', (_page, Block, testId) => {
      const loadStatus = {
        ...status('CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED'),
        errorMessage: DESKTOP_SENTENCE,
      };
      const reloadPage = jest.fn();
      render(
        <Block
          campaignId="c1"
          loadStatus={loadStatus}
          reloadPage={reloadPage}
        />,
      );
      expect(screen.getByText(DESKTOP_SENTENCE)).toBeInTheDocument();
      expect(screen.queryByRole('button')).toBeNull();
      expect(screen.queryByTestId(testId)).toBeNull();
      expect(reloadPage).not.toHaveBeenCalled();
    });

    it('keeps Retry for every other error', () => {
      render(
        <CampaignBayLoadError campaignId="c1" loadStatus={status(null)} />,
      );
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });

  it('keeps Retry for every other error', () => {
    const loadStatus = status(null);
    render(<CampaignBayLoadError campaignId="c1" loadStatus={loadStatus} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(loadStatus.loadCampaign).toHaveBeenCalledWith('c1');
  });
});
