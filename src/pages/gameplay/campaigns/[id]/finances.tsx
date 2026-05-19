/**
 * Campaign Finances & Loans Page
 *
 * The Finances & Loans command surface (CP2b — `add-campaign-command-ui`,
 * design D3). Renders the campaign balance, the `campaign-finances`
 * transaction ledger, a daily-cost projection, and the loan surface
 * (take a loan, view outstanding loans). The take-loan action routes
 * through `campaignCommandActions.takeLoan`.
 *
 * @spec openspec/changes/add-campaign-command-ui/specs/campaign-command-ui/spec.md
 */

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import {
  CommandError,
  CommandLoading,
} from '@/components/campaign/command/CommandStates';
import { FinancesPanel } from '@/components/campaign/command/FinancesPanel';
import { EmptyState, PageLayout } from '@/components/ui';
import { takeLoan } from '@/stores/campaign/campaignCommandActions';
import {
  selectActiveLoans,
  selectBalance,
  selectDailyCostProjection,
  selectTransactionLedger,
} from '@/stores/campaign/campaignCommandSelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { CampaignPilotStatus } from '@/types/campaign/CampaignPilotStatus';

export default function FinancesPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const pilots = useCampaignRosterStore((state) => state.pilots);
  const saveState = useCampaignPersistenceStore((state) => state.saveState);
  const loadCampaign = useCampaignPersistenceStore(
    (state) => state.loadCampaign,
  );
  const [isClient, setIsClient] = useState(false);
  // Re-render tick — bumped after a loan so the page re-reads finances.
  const [, setActionTick] = useState(0);
  const [isTakingLoan, setIsTakingLoan] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Finances & Loans' },
  ];

  if (!isClient) {
    return (
      <PageLayout
        title="Finances & Loans"
        subtitle="Loading finances..."
        maxWidth="wide"
      >
        <CommandLoading />
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Finances & Loans"
        subtitle="Campaign not found"
        maxWidth="wide"
        breadcrumbs={breadcrumbs}
      >
        <EmptyState
          title="Campaign not found"
          message="Return to campaigns list to select a campaign."
        />
      </PageLayout>
    );
  }

  // Billable pilots — KIA is the only non-billable status (matches
  // `processDailyCosts`). The daily-cost projection needs this count.
  const billablePilotCount = pilots.filter(
    (p) => p.status !== CampaignPilotStatus.KIA,
  ).length;

  const balance = selectBalance(campaign);
  const transactions = selectTransactionLedger(campaign);
  const dailyCost = selectDailyCostProjection(campaign, billablePilotCount);
  const activeLoans = selectActiveLoans(campaign);

  /** Take a loan through `campaignCommandActions.takeLoan`. */
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

  return (
    <PageLayout
      title="Finances & Loans"
      subtitle={`${campaign.name} — ${balance.format()}`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation campaignId={campaign.id} currentPage="finances" />

      {actionError ? (
        <CommandError
          message={actionError}
          onRetry={() => setActionError(null)}
        />
      ) : saveState === 'error' ? (
        <CommandError
          message="The campaign command data failed to load."
          onRetry={() => {
            void loadCampaign(campaign.id);
          }}
        />
      ) : (
        <FinancesPanel
          balance={balance}
          transactions={transactions}
          dailyCost={dailyCost}
          activeLoans={activeLoans}
          onTakeLoan={handleTakeLoan}
          isTakingLoan={isTakingLoan}
        />
      )}
    </PageLayout>
  );
}
