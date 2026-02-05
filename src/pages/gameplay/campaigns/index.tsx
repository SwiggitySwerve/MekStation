import { useRouter } from 'next/router';
/**
 * Campaigns List Page
 * Browse, search, and manage campaign configurations.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState, useCallback } from 'react';

import {
  PageLayout,
  Card,
  Input,
  Button,
  EmptyState,
  Badge,
} from '@/components/ui';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { ICampaign } from '@/types/campaign/Campaign';

// =============================================================================
// Campaign Card Component
// =============================================================================

interface CampaignCardProps {
  campaign: ICampaign;
  onClick: () => void;
}

function CampaignCard({
  campaign,
  onClick,
}: CampaignCardProps): React.ReactElement {
  return (
    <Card
      className="hover:border-accent/50 group cursor-pointer transition-all"
      onClick={onClick}
      data-testid={`campaign-card-${campaign.id}`}
    >
      <h3 className="text-text-theme-primary group-hover:text-accent mb-2 text-lg font-semibold transition-colors">
        {campaign.name}
      </h3>

      <p className="text-text-theme-secondary mb-3 text-sm">
        Faction: {campaign.factionId}
      </p>

      <p className="text-text-theme-secondary mb-4 text-sm">
        Date: {campaign.currentDate.toLocaleDateString()}
      </p>

      <div className="text-text-theme-secondary flex gap-4 text-sm">
        <span>{campaign.personnel.size} Personnel</span>
        <span>{campaign.forces.size} Forces</span>
        <span>{campaign.missions.size} Missions</span>
      </div>
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function CampaignsListPage(): React.ReactElement {
  const router = useRouter();
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const campaigns = campaign ? [campaign] : [];
  const [isClient, setIsClient] = useState(false);

  // Hydration fix
  useState(() => {
    setIsClient(true);
  });

  // Navigate to create page
  const handleCreateCampaign = useCallback(() => {
    router.push('/gameplay/campaigns/create');
  }, [router]);

  // Navigate to campaign detail page
  const handleCampaignClick = useCallback(
    (campaign: ICampaign) => {
      router.push(`/gameplay/campaigns/${campaign.id}`);
    },
    [router],
  );

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <PageLayout
        title="Campaigns"
        subtitle="Multi-mission operations with persistent roster and resources"
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <Card className="mb-6 h-20">
            <div className="h-full" />
          </Card>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="h-64">
                <div className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Campaigns"
      subtitle="Multi-mission operations with persistent roster and resources"
      maxWidth="wide"
      headerContent={
        <Button
          variant="primary"
          onClick={handleCreateCampaign}
          data-testid="create-campaign-btn"
          leftIcon={
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          }
        >
          New Campaign
        </Button>
      }
    >
      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <EmptyState
          icon={
            <div className="bg-surface-raised/50 mx-auto flex h-16 w-16 items-center justify-center rounded-full">
              <svg
                className="text-text-theme-muted h-8 w-8"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
          }
          title="No campaigns yet"
          message="Start a new campaign to lead your mercenary company through multi-mission operations"
          action={
            <Button variant="primary" onClick={handleCreateCampaign}>
              Create First Campaign
            </Button>
          }
          data-testid="campaigns-empty-state"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 pb-20 md:grid-cols-2 lg:grid-cols-3">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onClick={() => handleCampaignClick(campaign)}
            />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
