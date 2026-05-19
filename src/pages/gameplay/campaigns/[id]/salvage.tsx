/**
 * Campaign Salvage Page
 *
 * The Salvage Acceptance panel — per-item accept / decline actions and a
 * running mercenary-share value total (CP2a, design D5). Accept/decline
 * flips the item `status` on the campaign's `salvageAllocations` via the
 * persistence store.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { BayError, BayLoading } from '@/components/campaign/bays/BayStates';
import { SalvageAcceptancePanel } from '@/components/campaign/bays/SalvageAcceptancePanel';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { EmptyState, PageLayout } from '@/components/ui';
import {
  setSalvageItemStatus,
  type SalvageDecision,
} from '@/stores/campaign/campaignBayActions';
import { selectSalvageBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

export default function SalvagePage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
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
  // Local re-render tick — bumped after a decision so the page re-reads
  // the freshly re-projected inventory off the campaign store.
  const [, setDecisionTick] = useState(0);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Salvage' },
  ];

  if (!isClient) {
    return (
      <PageLayout title="Salvage" subtitle="Loading bay..." maxWidth="wide">
        <BayLoading />
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Salvage"
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

  const salvageBay = selectSalvageBay(campaign);

  /** Record an accept/decline decision and re-render against the projection. */
  const handleDecide = (partId: string, decision: SalvageDecision): void => {
    setSalvageItemStatus(partId, decision);
    setDecisionTick((tick) => tick + 1);
  };

  return (
    <PageLayout
      title="Salvage"
      subtitle={`${campaign.name} — ${salvageBay.length} salvage candidates`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation campaignId={campaign.id} currentPage="salvage" />

      {saveState === 'error' ? (
        <BayError
          message={errorMessage ?? 'The campaign inventory failed to load.'}
          onRetry={() => {
            void loadCampaign(campaign.id);
          }}
        />
      ) : (
        <SalvageAcceptancePanel
          salvageBay={salvageBay}
          onDecide={handleDecide}
        />
      )}
    </PageLayout>
  );
}
