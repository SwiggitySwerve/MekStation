import { Button, Card, Badge } from '@/components/ui';

import type {
  CampaignDashboardCampaign,
  CampaignMissionHistoryItem,
} from './CampaignDashboardPage.types';

import { getMissionResultBadge } from './CampaignDashboardPage.utils';

interface CampaignMissionHistoryCardProps {
  missions: CampaignMissionHistoryItem[];
}

export function CampaignMissionHistoryCard({
  missions,
}: CampaignMissionHistoryCardProps): React.ReactElement | null {
  if (missions.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
        Mission History
      </h2>
      <div className="space-y-2">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className="bg-surface-deep border-border-theme-subtle flex items-center justify-between rounded-lg border p-3"
            data-testid="mission-history-item"
          >
            <div>
              <span className="text-text-theme-primary font-medium">
                {mission.name}
              </span>
              <span className="text-text-theme-muted ml-2 text-sm">
                #{mission.missionNumber}
              </span>
            </div>
            <Badge variant={getMissionResultBadge(mission.result)} size="sm">
              {mission.result === 'pending' ? 'In Progress' : mission.result}
            </Badge>
          </div>
        ))}
      </div>
    </Card>
  );
}

interface CampaignQuickActionsCardProps {
  campaignId: string;
  onNavigate: (href: string) => void;
}

export function CampaignQuickActionsCard({
  campaignId,
  onNavigate,
}: CampaignQuickActionsCardProps): React.ReactElement {
  return (
    <Card className="mb-6">
      <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
        Quick Actions
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Button
          variant="secondary"
          onClick={() =>
            onNavigate(`/gameplay/campaigns/${campaignId}/personnel`)
          }
          className="justify-start"
        >
          Manage Personnel
        </Button>
        <Button
          variant="secondary"
          onClick={() => onNavigate(`/gameplay/campaigns/${campaignId}/forces`)}
          className="justify-start"
        >
          Organize Forces
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            onNavigate(`/gameplay/campaigns/${campaignId}/missions`)
          }
          className="justify-start"
        >
          View Missions
        </Button>
      </div>
    </Card>
  );
}

interface CampaignInformationCardProps {
  campaign: CampaignDashboardCampaign;
}

export function CampaignInformationCard({
  campaign,
}: CampaignInformationCardProps): React.ReactElement {
  return (
    <Card>
      <h2 className="text-text-theme-primary mb-4 text-lg font-semibold">
        Campaign Information
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <p className="text-text-theme-secondary mb-1 text-sm">Campaign ID</p>
          <p className="text-text-theme-primary font-mono text-sm">
            {campaign.id}
          </p>
        </div>
        <div>
          <p className="text-text-theme-secondary mb-1 text-sm">Created</p>
          <p className="text-text-theme-primary">
            {new Date(campaign.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-text-theme-secondary mb-1 text-sm">Last Updated</p>
          <p className="text-text-theme-primary">
            {new Date(campaign.updatedAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <p className="text-text-theme-secondary mb-1 text-sm">Root Force</p>
          <p className="text-text-theme-primary">{campaign.rootForceId}</p>
        </div>
      </div>
    </Card>
  );
}
