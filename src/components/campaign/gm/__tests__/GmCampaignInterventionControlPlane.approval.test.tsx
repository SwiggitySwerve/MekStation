/**
 * The control plane's approval outcome and row identity (roadmap unit U97,
 * FN-u92-control-plane-reports-applied-after-refusal and
 * FN-u92-control-plane-ledger-rows-duplicate-key).
 *
 * - (R4 text) an approval whose apply callback answers a refusal reason does
 *   not read "Approved and applied"; it shows the refusal and leaves approve
 *   enabled.
 * - (R4 key) two approvals of one canned correction are two intervention ids
 *   and two row keys: React reports no duplicate key.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import React from 'react';

import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { createCampaign } from '@/types/campaign/Campaign';

import { GmCampaignInterventionControlPlane } from '../GmCampaignInterventionControlPlane';

/** A solo campaign of 1,000,000 C-bills. */
function campaignOf(): ReturnType<typeof createCampaign> {
  return createCampaign('U97 Control Plane Co.', 'mercenary', {
    startingFunds: 1_000_000,
  });
}

/** Generates the default (merchant reversal) preview and approves it. */
async function approveMerchantReversal(): Promise<void> {
  fireEvent.click(screen.getByTestId('gm-ledger-preview-btn'));
  await act(async () => {
    fireEvent.click(screen.getByTestId('gm-ledger-approve-btn'));
    for (let i = 0; i < 10; i += 1) await Promise.resolve();
  });
}

const measurements: Record<string, unknown> = {};

describe('GmCampaignInterventionControlPlane approval outcome (U97)', () => {
  beforeEach(() => {
    useCampaignRosterStore.getState().reset();
  });

  afterAll(() => {
    // Rows record what they read when U35E_ROWS_DIR names a directory.
    const dir = process.env.U35E_ROWS_DIR;
    if (dir) {
      writeFileSync(
        path.join(dir, 'u97-control-plane-approval.json'),
        JSON.stringify(measurements, null, 2),
      );
    }
  });

  it('(R4 text) a refused approval shows the refusal, not "Approved and applied"', async () => {
    const onApplyCampaignUpdate = jest.fn(async () => 'insufficient-funds');
    render(
      <GmCampaignInterventionControlPlane
        campaign={campaignOf()}
        onApplyCampaignUpdate={onApplyCampaignUpdate}
      />,
    );

    await approveMerchantReversal();

    // The status card's value paragraph (its first paragraph is the label).
    const status =
      screen.getByTestId('gm-ledger-approval-status').querySelectorAll('p')[1]
        ?.textContent ?? null;
    const reason =
      screen.queryByTestId('gm-ledger-approval-reason')?.textContent ?? null;
    const approveEnabled = !(
      screen.getByTestId('gm-ledger-approve-btn') as HTMLButtonElement
    ).disabled;
    measurements.R4text = {
      calls: onApplyCampaignUpdate.mock.calls.length,
      status,
      reason,
      approveEnabled,
    };

    expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(1);
    expect(status).not.toContain('Approved and applied');
    expect(status).toBe('Not applied to campaign state.');
    expect(reason).toBe('insufficient-funds');
    expect(approveEnabled).toBe(true);
  });

  it('(R4 key) two approvals of one canned correction have distinct intervention ids and row keys', async () => {
    const onApplyCampaignUpdate = jest.fn();
    const errors = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      render(
        <GmCampaignInterventionControlPlane
          campaign={campaignOf()}
          onApplyCampaignUpdate={onApplyCampaignUpdate}
        />,
      );

      await approveMerchantReversal();
      await approveMerchantReversal();

      const ids = onApplyCampaignUpdate.mock.calls.map(([updates]) => {
        const events = (
          updates as { gmInterventionEvents?: { interventionId?: string }[] }
        ).gmInterventionEvents;
        return events?.[events.length - 1]?.interventionId ?? null;
      });
      const duplicateKeyWarnings = errors.mock.calls
        .map((call) => call.map(String).join(' '))
        .filter((line) => line.includes('same key'));
      const playerRows = screen
        .getByTestId('gm-ledger-player-log')
        .querySelectorAll('[data-testid^="gm-ledger-player-row-"]').length;
      measurements.R4key = { ids, duplicateKeyWarnings, playerRows };

      expect(onApplyCampaignUpdate).toHaveBeenCalledTimes(2);
      expect(ids[0]).toMatch(/^gm-ledger-merchant-reversal-/);
      expect(ids[1]).toMatch(/^gm-ledger-merchant-reversal-/);
      expect(ids[0]).not.toBe(ids[1]);
      expect(duplicateKeyWarnings).toEqual([]);
      expect(playerRows).toBe(2);
    } finally {
      errors.mockRestore();
    }
  });
});
