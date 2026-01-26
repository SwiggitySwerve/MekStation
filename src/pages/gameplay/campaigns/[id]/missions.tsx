/**
 * Campaign Missions Page
 * View and manage contracts and missions.
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
import { IMission, IContract } from '@/types/campaign/Mission';
import { MissionStatus } from '@/types/campaign/enums';
import { isContract } from '@/types/campaign/Mission';
import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';

// =============================================================================
// Mission Card Component
// =============================================================================

interface MissionCardProps {
  mission: IMission;
}

function MissionCard({ mission }: MissionCardProps): React.ReactElement {
  const getStatusColor = (status: MissionStatus): string => {
    switch (status) {
      case MissionStatus.ACTIVE:
        return 'bg-yellow-500/20 text-yellow-400';
      case MissionStatus.SUCCESS:
        return 'bg-green-500/20 text-green-400';
      case MissionStatus.FAILED:
      case MissionStatus.BREACH:
        return 'bg-red-500/20 text-red-400';
      case MissionStatus.PENDING:
        return 'bg-blue-500/20 text-blue-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  const contract = isContract(mission) ? mission as IContract : null;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-text-theme-primary text-lg">
              {mission.name}
            </h3>
            {contract && (
              <Badge className="bg-accent/20 text-accent">
                Contract
              </Badge>
            )}
          </div>
          {mission.description && (
            <p className="text-sm text-text-theme-secondary">
              {mission.description}
            </p>
          )}
        </div>
        <Badge className={getStatusColor(mission.status)}>
          {mission.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        {contract && (
          <>
            <div>
              <p className="text-text-theme-secondary">Employer</p>
              <p className="text-text-theme-primary">{contract.employerId}</p>
            </div>
            <div>
              <p className="text-text-theme-secondary">Target</p>
              <p className="text-text-theme-primary">{contract.targetId}</p>
            </div>
            <div>
              <p className="text-text-theme-secondary">Base Payment</p>
              <p className="text-text-theme-primary">
                {contract.paymentTerms.basePayment.format()}
              </p>
            </div>
            <div>
              <p className="text-text-theme-secondary">Salvage Rights</p>
              <p className="text-text-theme-primary">
                {contract.salvageRights} ({contract.paymentTerms.salvagePercent}%)
              </p>
            </div>
          </>
        )}
        
        {mission.systemId && (
          <div>
            <p className="text-text-theme-secondary">System</p>
            <p className="text-text-theme-primary">{mission.systemId}</p>
          </div>
        )}
        
        <div>
          <p className="text-text-theme-secondary">Scenarios</p>
          <p className="text-text-theme-primary">{mission.scenarioIds.length}</p>
        </div>
      </div>

      {contract && (contract.startDate || contract.endDate) && (
        <div className="mt-3 pt-3 border-t border-border-theme grid grid-cols-2 gap-3 text-sm">
          {contract.startDate && (
            <div>
              <p className="text-text-theme-secondary">Start Date</p>
              <p className="text-text-theme-primary">
                {new Date(contract.startDate).toLocaleDateString()}
              </p>
            </div>
          )}
          {contract.endDate && (
            <div>
              <p className="text-text-theme-secondary">End Date</p>
              <p className="text-text-theme-primary">
                {new Date(contract.endDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function MissionsPage(): React.ReactElement {
  const router = useRouter();
  const { id } = router.query;
  const store = useCampaignStore();
  const campaign = store.getState().getCampaign();
  const [isClient, setIsClient] = useState(false);
  const [filter, setFilter] = useState<'all' | MissionStatus>('all');

  // Hydration fix
  useState(() => {
    setIsClient(true);
  });

  // Show loading state during SSR/hydration
  if (!isClient) {
    return (
      <PageLayout
        title="Missions"
        subtitle="Loading missions..."
        maxWidth="wide"
      >
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
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
        title="Missions"
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

  // Convert Map to array and filter
  const allMissions = Array.from(campaign.missions.values());
  const filteredMissions = filter === 'all' 
    ? allMissions 
    : allMissions.filter(m => m.status === filter);

  return (
    <PageLayout
      title="Missions"
      subtitle={`${campaign.name} - ${allMissions.length} total missions`}
      maxWidth="wide"
    >
      {/* Navigation Tabs */}
      <CampaignNavigation campaignId={campaign.id} currentPage="missions" />

      {/* Filter Tabs */}
      {allMissions.length > 0 && (
        <Card className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded transition-colors ${
                filter === 'all'
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-theme-secondary hover:bg-surface-deep'
              }`}
            >
              All ({allMissions.length})
            </button>
            <button
              onClick={() => setFilter(MissionStatus.PENDING)}
              className={`px-4 py-2 rounded transition-colors ${
                filter === MissionStatus.PENDING
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-theme-secondary hover:bg-surface-deep'
              }`}
            >
              Pending ({allMissions.filter(m => m.status === MissionStatus.PENDING).length})
            </button>
            <button
              onClick={() => setFilter(MissionStatus.ACTIVE)}
              className={`px-4 py-2 rounded transition-colors ${
                filter === MissionStatus.ACTIVE
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-theme-secondary hover:bg-surface-deep'
              }`}
            >
              Active ({allMissions.filter(m => m.status === MissionStatus.ACTIVE).length})
            </button>
            <button
              onClick={() => setFilter(MissionStatus.SUCCESS)}
              className={`px-4 py-2 rounded transition-colors ${
                filter === MissionStatus.SUCCESS
                  ? 'bg-accent text-white'
                  : 'bg-surface-raised text-text-theme-secondary hover:bg-surface-deep'
              }`}
            >
              Completed ({allMissions.filter(m => m.status === MissionStatus.SUCCESS).length})
            </button>
          </div>
        </Card>
      )}

      {/* Missions Grid */}
      {filteredMissions.length === 0 ? (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
            </div>
          }
          title={filter === 'all' ? 'No missions' : `No ${filter} missions`}
          message={
            filter === 'all'
              ? 'This campaign has no missions or contracts yet.'
              : `No missions with status: ${filter}`
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMissions.map((mission) => (
            <MissionCard key={mission.id} mission={mission} />
          ))}
        </div>
      )}
    </PageLayout>
  );
}
