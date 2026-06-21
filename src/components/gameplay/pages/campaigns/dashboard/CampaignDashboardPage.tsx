import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useStore } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { CampaignCoopRouteSurfaceConnected } from '@/components/campaign/coop';
import { CampaignDashboard } from '@/components/campaign/dashboard/CampaignDashboard';
import { DayReportPanel } from '@/components/campaign/DayReportPanel';
import { PageLayout } from '@/components/ui';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  ScenarioGenerator,
  createDefaultUnitWeights,
  createDefaultTerrainWeights,
} from '@/simulation/generator';
import { installCampaignPersistenceWiring } from '@/stores/campaign/campaignPersistenceWiring';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

import type {
  CampaignDashboardCampaign,
  CampaignMissionHistoryItem,
  CampaignRosterUnit,
} from './CampaignDashboardPage.types';

import {
  CampaignInformationCard,
  CampaignMissionHistoryCard,
  CampaignQuickActionsCard,
} from './CampaignDashboardPage.cards';
import {
  useCampaignDayReports,
  useClientReady,
  useDailyBattleAudit,
  useOutcomeApplyErrors,
  usePendingOutcomes,
} from './CampaignDashboardPage.hooks';
import {
  CampaignHeaderContent,
  CampaignLoadingState,
  CampaignNotFoundState,
  CampaignOperationsCard,
  CampaignRosterCard,
  CampaignStatsGrid,
} from './CampaignDashboardPage.sections';
import { CampaignSaveStatusCard } from './CampaignSaveStatusCard';
import { DailyBattleAuditFeed } from './DailyBattleAuditFeed';
import { PendingOutcomesBanner } from './PendingOutcomesBanner';

export default function CampaignDashboardPage(): React.ReactElement {
  const router = useRouter();
  const store = useCampaignStore();
  const rosterStore = useCampaignRosterStore;

  const campaign = useStore(
    store,
    (state) => state.campaign as CampaignDashboardCampaign | null,
  );
  const units = rosterStore(
    (state) => state.getUnitsWithReadiness() as CampaignRosterUnit[],
  );
  const missions = rosterStore(
    (state) => state.getMissionHistory() as CampaignMissionHistoryItem[],
  );
  const missionCount = rosterStore((state) => state.missionCount);

  const isClient = useClientReady();

  // Install the campaign-store -> persistence-store dirty bridge once the
  // client is hydrated. Idempotent — a remount is a no-op. This is what
  // re-arms the auto-save debounce on day advancement and edits (D6).
  useEffect(() => {
    if (isClient) {
      installCampaignPersistenceWiring();
    }
  }, [isClient]);

  const pendingOutcomes = usePendingOutcomes();
  const auditEntries = useDailyBattleAudit();
  const applyErrors = useOutcomeApplyErrors();
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    dayReports,
    setDayReports,
    handleAdvanceDay,
    handleAdvanceWeek,
    handleAdvanceMonth,
  } = useCampaignDayReports({
    dayReportNotificationsEnabled:
      campaign?.options.enableDayReportNotifications,
    onAdvanceDay: () => store.getState().advanceDay(),
    onAdvanceDays: (days: number) => store.getState().advanceDays(days),
  });

  const handleGenerateMission = useCallback(async () => {
    if (!campaign) {
      return;
    }
    setIsGenerating(true);

    try {
      const deployableUnits = rosterStore.getState().getDeployableUnits();
      if (deployableUnits.length === 0) {
        return;
      }

      const deployedUnitIds = deployableUnits.map((unit) => unit.unitId);
      const missionNumber = missionCount + 1;
      const missionName = `Mission ${missionNumber}`;

      const generator = new ScenarioGenerator(
        createDefaultUnitWeights(),
        createDefaultTerrainWeights(),
      );
      const seed = Date.now();
      const random = new SeededRandom(seed);
      const unitCount = Math.min(deployableUnits.length, 4);

      const session = generator.generate(
        {
          seed,
          turnLimit: 20,
          unitCount: { player: unitCount, opponent: unitCount },
          mapRadius: 8,
        },
        random,
      );

      const encounterResponse = await fetch('/api/encounters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${campaign.name} - ${missionName}`,
          description: `Campaign mission ${missionNumber} - auto-generated encounter`,
          template: 'skirmish',
        }),
      });

      const encounterData = (await encounterResponse.json()) as {
        success: boolean;
        id?: string;
      };
      const encounterId = encounterData.id ?? session.id;

      const missionId = rosterStore
        .getState()
        .createMission(missionName, deployedUnitIds, encounterId);

      router.push(
        `/gameplay/encounters/${encounterId}?campaignId=${campaign.id}&missionId=${missionId}`,
      );
    } finally {
      setIsGenerating(false);
    }
  }, [campaign, missionCount, rosterStore, router]);

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  if (!isClient) {
    return <CampaignLoadingState />;
  }

  if (!campaign) {
    return (
      <CampaignNotFoundState
        onCreateCampaign={() => router.push('/gameplay/campaigns/create')}
      />
    );
  }

  return (
    <PageLayout
      title={campaign.name}
      subtitle={`Faction: ${campaign.factionId}`}
      maxWidth="wide"
      headerContent={
        <CampaignHeaderContent
          currentDate={campaign.currentDate}
          onAdvanceDay={handleAdvanceDay}
          onAdvanceWeek={handleAdvanceWeek}
          onAdvanceMonth={handleAdvanceMonth}
        />
      }
    >
      <CampaignNavigation
        campaignId={campaign.id}
        currentPage="dashboard"
        coopSession={campaign.coopSession}
      />

      {/*
       * Co-op route surface mount (`wire-coop-campaign-route` task 2.1).
       * Renders <HostGmReviewSurface> on the dashboard when this campaign
       * is a host-mode co-op session with `host-review` arbitration.
       * Renders nothing on single-player or guest-mode (the guest sees
       * proposal overlays on mutation routes, not on the dashboard).
       * The connected co-op surface subscribes to the opened runtime
       * session so host-review proposals are visible from the dashboard.
       */}
      <CampaignCoopRouteSurfaceConnected
        campaign={campaign as CampaignDashboardCampaign & ICampaign}
        routeId="dashboard"
        dashboardMount
      />

      {/*
       * Campaign Command Center (`add-campaign-command-center`, Wave 6.1.B).
       * The 6-card dashboard is the new at-a-glance landing surface — force
       * snapshot, active contract, finances, day advance, activity log,
       * quick actions. Mounted at the top so the operator sees the
       * collated state before the operational widgets below.
       */}
      <CampaignDashboard />

      <CampaignSaveStatusCard />

      <PendingOutcomesBanner
        outcomes={pendingOutcomes}
        applyErrors={applyErrors}
      />

      <DailyBattleAuditFeed entries={auditEntries} />

      {dayReports.length > 0 && (
        <DayReportPanel
          reports={dayReports}
          onDismiss={() => setDayReports([])}
        />
      )}

      <CampaignStatsGrid campaign={campaign} />

      <CampaignOperationsCard
        missionCount={missionCount}
        isGenerating={isGenerating}
        isGenerateDisabled={
          isGenerating ||
          units.filter((unit) => unit.readiness !== 'Destroyed').length === 0
        }
        onGenerateMission={handleGenerateMission}
      />

      <CampaignRosterCard units={units} />
      <CampaignMissionHistoryCard missions={missions} />

      <CampaignQuickActionsCard
        campaignId={campaign.id}
        onNavigate={handleNavigate}
      />
      <CampaignInformationCard campaign={campaign} />
    </PageLayout>
  );
}
