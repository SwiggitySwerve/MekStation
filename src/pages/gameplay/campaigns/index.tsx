/**
 * Campaigns List Page
 * Browse, search, and manage campaign configurations.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState, useCallback } from 'react';
import { useRouter } from 'next/router';
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

function CampaignCard({ campaign, onClick }: CampaignCardProps): React.ReactElement {
  return (
    <Card
      className="cursor-pointer hover:border-accent/50 transition-all group"
      onClick={onClick}
      data-testid={`campaign-card-${campaign.id}`}
    >
      <h3 className="font-semibold text-text-theme-primary text-lg mb-2 group-hover:text-accent transition-colors">
        {campaign.name}
      </h3>
      
      <p className="text-sm text-text-theme-secondary mb-3">
        Faction: {campaign.factionId}
      </p>
      
      <p className="text-sm text-text-theme-secondary mb-4">
        Date: {campaign.currentDate.toLocaleDateString()}
      </p>
      
      <div className="flex gap-4 text-sm text-text-theme-secondary">
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
  const {
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    getFilteredCampaigns,
    selectCampaign,
  } = useCampaignStore();

  const filteredCampaigns = getFilteredCampaigns();
  const [isClient, setIsClient] = useState(false);

  // Hydration fix
  useState(() => {
    setIsClient(true);
  });

  // Handle search input
  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchQuery(e.target.value);
    },
    [setSearchQuery]
  );

  // Navigate to create page
  const handleCreateCampaign = useCallback(() => {
    router.push('/gameplay/campaigns/create');
  }, [router]);

  // Navigate to campaign detail
  const handleCampaignClick = useCallback(
    (campaign: ICampaign) => {
      selectCampaign(campaign.id);
      router.push(`/gameplay/campaigns/${campaign.id}`);
    },
    [router, selectCampaign]
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              className="w-4 h-4"
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
      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
<Input
              type="text"
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={handleSearchChange}
              aria-label="Search campaigns"
              data-testid="campaign-search"
            />
          </div>

          {/* Status Filter */}
          <div className="flex gap-2 flex-wrap">
            {(['all', CampaignStatus.Active, CampaignStatus.Setup, CampaignStatus.Victory, CampaignStatus.Defeat] as const).map(
              (status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                >
                  {status === 'all' ? 'All' : getStatusLabel(status as CampaignStatus)}
                </Button>
              )
            )}
          </div>
        </div>

        {/* Results count */}
        <div className="mt-4 text-sm text-text-theme-secondary">
          Showing {filteredCampaigns.length} campaign
          {filteredCampaigns.length !== 1 ? 's' : ''}
          {(searchQuery || statusFilter !== 'all') && (
            <span className="text-accent ml-1">(filtered)</span>
          )}
        </div>
      </Card>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
<EmptyState
          icon={
            <div className="w-16 h-16 mx-auto rounded-full bg-surface-raised/50 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-text-theme-muted"
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
          title={searchQuery || statusFilter !== 'all' ? 'No campaigns match your filters' : 'No campaigns yet'}
          message={
            searchQuery || statusFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Start a new campaign to lead your mercenary company through multi-mission operations'
          }
          action={
            !(searchQuery || statusFilter !== 'all') && (
              <Button variant="primary" onClick={handleCreateCampaign}>
                Create First Campaign
              </Button>
            )
          }
          data-testid="campaigns-empty-state"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCampaigns.map((campaign) => (
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
