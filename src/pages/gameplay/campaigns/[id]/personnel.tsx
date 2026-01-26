/**
 * Campaign Personnel Page
 * Manage personnel roster for the campaign.
 *
 * @spec openspec/changes/add-campaign-system/specs/campaign-system/spec.md
 */
import { useState } from 'react';
import { useRouter } from 'next/router';
import {
  PageLayout,
  Card,
  EmptyState,
  Badge,
} from '@/components/ui';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { IPerson } from '@/types/campaign/Person';
import { PersonnelStatus } from '@/types/campaign/enums';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';

// =============================================================================
// Personnel Card Component
// =============================================================================

interface PersonnelCardProps {
  person: IPerson;
}

function PersonnelCard({ person }: PersonnelCardProps): React.ReactElement {
  const getStatusColor = (status: PersonnelStatus): string => {
    switch (status) {
      case PersonnelStatus.ACTIVE:
        return 'bg-green-500/20 text-green-400';
      case PersonnelStatus.WOUNDED:
        return 'bg-yellow-500/20 text-yellow-400';
      case PersonnelStatus.KIA:
      case PersonnelStatus.MIA:
        return 'bg-red-500/20 text-red-400';
      case PersonnelStatus.RETIRED:
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-semibold text-text-theme-primary text-lg">
            {person.name}
          </h3>
          <p className="text-sm text-text-theme-secondary">
            {person.rank}
          </p>
        </div>
        <Badge className={getStatusColor(person.status)}>
          {person.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-text-theme-secondary">Primary Role</p>
          <p className="text-text-theme-primary">{person.primaryRole}</p>
        </div>
        {person.secondaryRole && (
          <div>
            <p className="text-text-theme-secondary">Secondary Role</p>
            <p className="text-text-theme-primary">{person.secondaryRole}</p>
          </div>
        )}
        <div>
          <p className="text-text-theme-secondary">Hits</p>
          <p className="text-text-theme-primary">{person.hits}/6</p>
        </div>
        <div>
          <p className="text-text-theme-secondary">XP</p>
          <p className="text-text-theme-primary">{person.xp}</p>
        </div>
      </div>

      {person.unitId && (
        <div className="mt-3 pt-3 border-t border-border-theme">
          <p className="text-xs text-text-theme-secondary">Assigned to Unit</p>
          <p className="text-sm text-text-theme-primary font-mono">{person.unitId}</p>
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PersonnelPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const [isClient, setIsClient] = useState(false);

  // Hydration fix
  useState(() => {
    setIsClient(true);
  });

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <PageLayout
        title="Personnel"
        subtitle="Loading personnel..."
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="h-48">
                <div className="h-full" />
              </Card>
            ))}
          </div>
        </div>
      </PageLayout>
    );
  }

  // Handle campaign not found
  if (!campaign) {
    return (
      <PageLayout
        title="Personnel"
        subtitle="Campaign not found"
        maxWidth="wide"
      >
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
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
          }
          title="Campaign not found"
          message="Return to campaigns list to select a campaign."
        />
      </PageLayout>
    );
  }

  // Convert Map to array
  const personnel = Array.from(campaign.personnel.values());

  return (
    <PageLayout
      title="Personnel"
      subtitle={`${campaign.name} - ${personnel.length} personnel`}
      maxWidth="wide"
    >
      {/* Navigation Tabs */}
      <CampaignNavigation campaignId={campaign.id} currentPage="personnel" />

      {personnel.length === 0 ? (
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
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          }
          title="No personnel"
          message="This campaign has no personnel assigned yet."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {personnel.map((person) => (
            <PersonnelCard key={person.id} person={person} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
