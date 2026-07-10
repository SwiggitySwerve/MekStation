/**
 * Campaign Finances & Loans Page
 *
 * The Finances & Loans command surface (CP2b - `add-campaign-command-ui`,
 * design D3). Renders the campaign balance, transaction ledger, daily-cost
 * projection, and loan surface.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import React, { useState } from 'react';

import { FinancesPanel } from '@/components/campaign/command/FinancesPanel';
import {
  CampaignPageFrameFromShell,
  getLoadedCampaign,
  renderCampaignCommandFeedback,
  renderPendingCampaignPage,
  useCampaignLoadStatus,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { takeLoan } from '@/stores/campaign/campaignCommandActions';
import {
  selectActiveLoans,
  selectBalance,
  selectBillablePilotCount,
  selectDailyCostProjection,
  selectTransactionLedger,
} from '@/stores/campaign/campaignCommandSelectors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';

const FINANCES_LOADING = {
  title: 'Finances & Loans',
  subtitle: 'Loading finances...',
} as const;

export default function FinancesPage(): React.ReactElement {
  const shell = useCampaignPageShell('Finances & Loans');
  const pilots = useCampaignRosterStore((state) => state.pilots);
  const loadStatus = useCampaignLoadStatus();
  const [, setActionTick] = useState(0);
  const [isTakingLoan, setIsTakingLoan] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const pendingPage = renderPendingCampaignPage(shell, FINANCES_LOADING);
  if (pendingPage) return pendingPage;

  const campaign = getLoadedCampaign(shell);
  const billablePilotCount = selectBillablePilotCount(pilots);
  const balance = selectBalance(campaign);
  const transactions = selectTransactionLedger(campaign);
  const dailyCost = selectDailyCostProjection(campaign, billablePilotCount);
  const activeLoans = selectActiveLoans(campaign);
  const frame = {
    title: 'Finances & Loans',
    subtitle: `${campaign.name} - ${balance.format()}`,
    currentPage: 'finances',
    coopRouteId: 'finances',
  } as const;

  const handleTakeLoan = (params: {
    principal: number;
    interestRate: number;
    termDays: number;
  }): void => {
    setActionError(null);
    setIsTakingLoan(true);
    const result = takeLoan(params);
    setIsTakingLoan(false);
    if (!result.applied) {
      setActionError(result.reason ?? 'The loan could not be processed.');
      return;
    }
    setActionTick((tick) => tick + 1);
  };

  const feedback = renderCampaignCommandFeedback({
    actionError,
    campaignId: campaign.id,
    loadStatus,
    onClearActionError: () => setActionError(null),
  });

  return (
    <CampaignPageFrameFromShell shell={shell} frame={frame}>
      {feedback ?? (
        <FinancesPanel
          balance={balance}
          transactions={transactions}
          dailyCost={dailyCost}
          activeLoans={activeLoans}
          onTakeLoan={handleTakeLoan}
          isTakingLoan={isTakingLoan}
        />
      )}
    </CampaignPageFrameFromShell>
  );
}
