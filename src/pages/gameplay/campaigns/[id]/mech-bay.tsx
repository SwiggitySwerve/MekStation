/**
 * Campaign Mech Bay Page
 *
 * The roster-wide unit-status grid — the post-battle hub (CP2a,
 * design D2). One row per roster unit with damage state, repair-ticket
 * count, and a drill-down to the unit's Repair Bay detail.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { BayError, BayLoading } from '@/components/campaign/bays/BayStates';
import { MechBay } from '@/components/campaign/bays/MechBay';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { EmptyState, PageLayout } from '@/components/ui';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

export default function MechBayPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const units = useCampaignRosterStore((state) => state.units);
  const saveState = useCampaignPersistenceStore((state) => state.saveState);
  const errorMessage = useCampaignPersistenceStore(
    (state) => state.errorMessage,
  );
  const loadCampaign = useCampaignPersistenceStore(
    (state) => state.loadCampaign,
  );
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Mech Bay' },
  ];

  // Loading state while the campaign / inventory resolves (design D7).
  if (!isClient) {
    return (
      <PageLayout title="Mech Bay" subtitle="Loading bay..." maxWidth="wide">
        <BayLoading />
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Mech Bay"
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

  return (
    <PageLayout
      title="Mech Bay"
      subtitle={`${campaign.name} — ${units.length} units`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation campaignId={campaign.id} currentPage="mech-bay" />

      {saveState === 'error' ? (
        <BayError
          message={errorMessage ?? 'The campaign inventory failed to load.'}
          onRetry={() => {
            void loadCampaign(campaign.id);
          }}
        />
      ) : (
        <MechBay units={units} repairBay={repairBay} campaignId={campaign.id} />
      )}
    </PageLayout>
  );
}
