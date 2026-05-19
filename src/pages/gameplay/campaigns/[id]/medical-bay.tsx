/**
 * Campaign Medical Bay Page
 *
 * The read-only injured-pilot list (CP2a, design D4). Recovery is driven
 * by the day-advancement healing processor, not by this page.
 *
 * @spec openspec/changes/add-campaign-bay-ui/specs/campaign-bay-ui/spec.md
 */

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { BayError, BayLoading } from '@/components/campaign/bays/BayStates';
import { MedicalBay } from '@/components/campaign/bays/MedicalBay';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { EmptyState, PageLayout } from '@/components/ui';
import { selectMedicalBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

export default function MedicalBayPage(): React.ReactElement {
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

  useEffect(() => {
    setIsClient(true);
  }, []);

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign?.name || 'Campaign', href: `/gameplay/campaigns/${id}` },
    { label: 'Medical Bay' },
  ];

  if (!isClient) {
    return (
      <PageLayout title="Medical Bay" subtitle="Loading bay..." maxWidth="wide">
        <BayLoading />
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Medical Bay"
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

  const medicalBay = selectMedicalBay(campaign);

  return (
    <PageLayout
      title="Medical Bay"
      subtitle={`${campaign.name} — ${medicalBay.length} pilots in care`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation campaignId={campaign.id} currentPage="medical-bay" />

      {saveState === 'error' ? (
        <BayError
          message={errorMessage ?? 'The campaign inventory failed to load.'}
          onRetry={() => {
            void loadCampaign(campaign.id);
          }}
        />
      ) : (
        <MedicalBay medicalBay={medicalBay} />
      )}
    </PageLayout>
  );
}
