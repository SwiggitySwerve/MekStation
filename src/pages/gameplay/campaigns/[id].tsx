import Link from 'next/link';
import { useRouter } from 'next/router';
import { useState, useCallback, useEffect } from 'react';

import { CampaignAuditTab } from '@/components/campaign/CampaignAuditTab';
import { CampaignOverviewTab } from '@/components/campaign/CampaignOverviewTab';
import {
  getStatusColor,
  getStatusLabel,
  CampaignDetailSkeleton,
  CampaignNotFound,
  CampaignTabBar,
} from '@/components/campaign/CampaignStatusHelpers';
import { useToast } from '@/components/shared/Toast';
import { PageLayout, Button, Badge } from '@/components/ui';
import { useCampaignStore } from '@/stores/useCampaignStore';
import { CampaignStatus, CampaignMissionStatus } from '@/types/campaign';

type CampaignTab = 'overview' | 'audit';

export default function CampaignDetailPage(): React.ReactElement {
  const router = useRouter();
  const { id, tab: queryTab } = router.query;
  const { showToast } = useToast();

  const {
    getCampaign,
    startMission,
    deleteCampaign,
    setCampaignStatus,
    validateCampaign,
    validations,
    error,
    clearError,
  } = useCampaignStore();

  const [isClient, setIsClient] = useState(false);
  const [activeTab, setActiveTab] = useState<CampaignTab>('overview');

  useEffect(() => {
    if (queryTab === 'audit') {
      setActiveTab('audit');
    } else {
      setActiveTab('overview');
    }
  }, [queryTab]);

  const handleTabChange = useCallback(
    (tab: CampaignTab) => {
      setActiveTab(tab);
      const url =
        tab === 'overview'
          ? `/gameplay/campaigns/${id}`
          : `/gameplay/campaigns/${id}?tab=${tab}`;
      router.replace(url, undefined, { shallow: true });
    },
    [id, router],
  );

  const campaign = id && typeof id === 'string' ? getCampaign(id) : null;
  const validation = id && typeof id === 'string' ? validations.get(id) : null;

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && id && typeof id === 'string') {
      validateCampaign(id);
    }
  }, [isClient, id, validateCampaign]);

  const nextMission = campaign?.missions.find(
    (m) => m.status === CampaignMissionStatus.Available,
  );

  const currentMission = campaign?.missions.find(
    (m) => m.status === CampaignMissionStatus.InProgress,
  );

  const handleStartMission = useCallback(
    (missionId: string) => {
      if (!id || typeof id !== 'string') return;
      clearError();
      const success = startMission(id, missionId);
      if (success) {
        showToast({
          message: 'Mission started! Prepare for battle.',
          variant: 'info',
        });
        router.push(`/gameplay/encounters`);
      } else {
        showToast({ message: 'Failed to start mission', variant: 'error' });
      }
    },
    [id, startMission, router, clearError, showToast],
  );

  const handleDelete = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    clearError();
    const success = deleteCampaign(id);
    if (success) {
      showToast({
        message: 'Campaign deleted successfully',
        variant: 'success',
      });
      router.push('/gameplay/campaigns');
    } else {
      showToast({ message: 'Failed to delete campaign', variant: 'error' });
    }
  }, [id, deleteCampaign, router, clearError, showToast]);

  const handleAbandon = useCallback(() => {
    if (!id || typeof id !== 'string') return;
    clearError();
    const success = setCampaignStatus(id, CampaignStatus.Abandoned);
    if (success) {
      showToast({ message: 'Campaign abandoned', variant: 'warning' });
    } else {
      showToast({ message: 'Failed to abandon campaign', variant: 'error' });
    }
  }, [id, setCampaignStatus, clearError, showToast]);

  if (!isClient) {
    return <CampaignDetailSkeleton />;
  }

  if (!campaign) {
    return <CampaignNotFound />;
  }

  const isComplete =
    campaign.status === CampaignStatus.Victory ||
    campaign.status === CampaignStatus.Defeat ||
    campaign.status === CampaignStatus.Abandoned;

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Gameplay', href: '/gameplay' },
    { label: 'Campaigns', href: '/gameplay/campaigns' },
    { label: campaign.name },
  ];

  return (
    <PageLayout
      title={campaign.name}
      subtitle={campaign.description}
      breadcrumbs={breadcrumbs}
      backLink="/gameplay/campaigns"
      backLabel="Back to Campaigns"
      maxWidth="wide"
      headerContent={
        <div className="flex items-center gap-3">
          <Badge
            variant={getStatusColor(campaign.status)}
            size="lg"
            data-testid="campaign-status"
          >
            {getStatusLabel(campaign.status)}
          </Badge>

          {!isComplete && nextMission && !currentMission && (
            <Button
              variant="primary"
              onClick={() => handleStartMission(nextMission.id)}
            >
              Start Next Mission
            </Button>
          )}

          {currentMission && (
            <Link href="/gameplay/encounters">
              <Button variant="primary">Continue Mission</Button>
            </Link>
          )}
        </div>
      }
    >
      <CampaignTabBar activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab === 'audit' ? (
        <CampaignAuditTab
          campaignId={id as string}
          campaignName={campaign.name}
        />
      ) : (
        <CampaignOverviewTab
          campaign={campaign}
          error={error}
          validation={
            validation as {
              valid: boolean;
              errors: string[];
              warnings: string[];
            } | null
          }
          isComplete={isComplete}
          currentMission={currentMission}
          onStartMission={handleStartMission}
          onDelete={handleDelete}
          onAbandon={handleAbandon}
        />
      )}
    </PageLayout>
  );
}
