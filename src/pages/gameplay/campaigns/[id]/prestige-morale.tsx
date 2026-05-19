/**
 * Campaign Prestige & Morale Page
 *
 * The read-only Prestige & Morale command surface (CP3 —
 * `add-campaign-refit-and-prestige`, design D10). Shows the company's
 * current morale state, recent morale transitions, and per-unit prestige
 * scores. Morale and prestige change through day processors and the
 * post-battle prestige step — the page exposes no mutation controls.
 *
 * @spec openspec/changes/add-campaign-refit-and-prestige/specs/campaign-refit-and-prestige/spec.md
 */

import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import {
  CommandError,
  CommandLoading,
} from '@/components/campaign/command/CommandStates';
import { PrestigeMoralePanel } from '@/components/campaign/command/PrestigeMoralePanel';
import { EmptyState, PageLayout } from '@/components/ui';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { MORALE_DEFAULT } from '@/types/campaign/Prestige';

export default function PrestigeMoralePage(): React.ReactElement {
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
    { label: 'Prestige & Morale' },
  ];

  // Loading state while the campaign resolves (design D10 / campaign-ui).
  if (!isClient) {
    return (
      <PageLayout
        title="Prestige & Morale"
        subtitle="Loading company standing..."
        maxWidth="wide"
      >
        <CommandLoading />
      </PageLayout>
    );
  }

  if (!campaign) {
    return (
      <PageLayout
        title="Prestige & Morale"
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

  return (
    <PageLayout
      title="Prestige & Morale"
      subtitle={campaign.name}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
    >
      <CampaignNavigation
        campaignId={campaign.id}
        currentPage="prestige-morale"
      />

      {saveState === 'error' ? (
        <CommandError
          message={errorMessage ?? 'The campaign data failed to load.'}
          onRetry={() => {
            void loadCampaign(campaign.id);
          }}
        />
      ) : (
        <PrestigeMoralePanel
          moraleState={campaign.moraleState ?? MORALE_DEFAULT}
          moraleTransitions={campaign.moraleTransitions ?? []}
          unitPrestige={campaign.unitPrestige ?? []}
        />
      )}
    </PageLayout>
  );
}
