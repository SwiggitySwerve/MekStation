/**
 * Campaign Repair Bay Page
 *
 * The repair-ticket queue grouped by unit, with a per-ticket
 * priority-reorder action (CP2a, design D3). Reorder writes a `priority`
 * ordinal onto the campaign's `repairQueue` via the persistence store.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { BayError, BayLoading } from '@/components/campaign/bays/BayStates';
import { RepairBay } from '@/components/campaign/bays/RepairBay';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { EmptyState, PageLayout } from '@/components/ui';
import { reorderRepairTicketPriority } from '@/stores/campaign/campaignBayActions';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

export default function RepairBayPage(): React.ReactElement {
  const router = useRouter();
  const { id, unit } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const saveState = useCampaignPersistenceStore((state) => state.saveState);
  const errorMessage = useCampaignPersistenceStore(
    (state) => state.errorMessage,
  );
  const loadCampaign = useCampaignPersistenceStore(
    (state) => state.loadCampaign,
  );
  const [isClient, setIsClient] = useState(false);
  // Local re-render tick — bumped after a reorder so the page re-reads the
  // freshly re-projected inventory off the campaign store.
  const [, setReorderTick] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Repair Bay' },
  ];

  if (!isClient) {
    return (
      <PageLayout title="Repair Bay" subtitle="Loading bay..." maxWidth="wide">
        <BayLoading />
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Repair Bay"
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

  const repairBay = selectRepairBay(campaign);
  const focusUnitId = typeof unit === 'string' ? unit : undefined;

  /** Persist a priority reorder and re-render against the new projection. */
  const handleReorder = (orderedTicketIds: readonly string[]): void => {
    reorderRepairTicketPriority(orderedTicketIds);
    setReorderTick((tick) => tick + 1);
  };

  return (
    <PageLayout
      title="Repair Bay"
      subtitle={`${campaign.name} — ${repairBay.length} repair tickets`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation campaignId={campaign.id} currentPage="repair-bay" />

      {saveState === 'error' ? (
        <BayError
          message={errorMessage ?? 'The campaign inventory failed to load.'}
          onRetry={() => {
            void loadCampaign(campaign.id);
          }}
        />
      ) : (
        <RepairBay
          repairBay={repairBay}
          onReorder={handleReorder}
          focusUnitId={focusUnitId}
        />
      )}
    </PageLayout>
  );
}
