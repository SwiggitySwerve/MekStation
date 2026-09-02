import { useRouter } from 'next/router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from 'zustand';

import type { ICampaign } from '@/types/campaign/Campaign';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { DeleteCampaignDialog } from '@/components/campaign/CampaignOverviewTab.sections';
import { CampaignCoopRouteSurfaceConnected } from '@/components/campaign/coop';
import { CampaignDashboard } from '@/components/campaign/dashboard/CampaignDashboard';
import { DayReportPanel } from '@/components/campaign/DayReportPanel';
import { CampaignSharePanelConnected } from '@/components/campaign/share';
import { Button, PageLayout } from '@/components/ui';
import { getCoopMatchId } from '@/lib/campaign/coop/coopRuntimeSession';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import {
  type CanonicalCombatCatalogSnapshot,
  admitCampaignLaunch,
  fetchCanonicalCatalogSnapshot,
} from '@/lib/campaign/readiness/canonicalCatalogAdmission';
import {
  buildMissionReadinessProjection,
  selectedRosterUnitsForLaunch,
} from '@/lib/campaign/readiness/missionReadinessProjection';
import { useCampaignRouteLoader } from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import { syncLaunchedMission } from '@/pages-modules/gameplay/campaigns/missionLaunchPage.launch';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';
import { installCampaignPersistenceWiring } from '@/stores/campaign/campaignPersistenceWiring';
import { generateId } from '@/stores/campaign/campaignRosterStore.helpers';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import { createMission as createCampaignMission } from '@/types/campaign/Mission';

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
  useCampaignLaunchHead,
  useClientReady,
  useDailyBattleAudit,
  useOutcomeApplyErrors,
  usePendingOutcomes,
} from './CampaignDashboardPage.hooks';
import {
  classifyLaunchFailure,
  resolveDashboardLaunchForces,
} from './CampaignDashboardPage.launch';
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

  const liveCampaign = useStore(
    store,
    (state) => state.campaign as CampaignDashboardCampaign | null,
  );
  const units = rosterStore(
    (state) => state.getUnitsWithReadiness() as CampaignRosterUnit[],
  );
  const pilots = rosterStore((state) => state.pilots);
  const missions = rosterStore(
    (state) => state.getMissionHistory() as CampaignMissionHistoryItem[],
  );
  const missionCount = rosterStore((state) => state.missionCount);

  const isClient = useClientReady();
  const launchHead = useCampaignLaunchHead(liveCampaign?.id);
  const rehydratedCampaignId = useStore(
    store,
    (state) => state.rehydratedCampaignId,
  );
  const routeLoader = useCampaignRouteLoader({
    campaign: liveCampaign as ICampaign | null,
    isClient,
    router,
    rehydratedCampaignId,
  });
  const campaign = routeLoader.campaign as CampaignDashboardCampaign | null;

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
  const [catalog, setCatalog] = useState<CanonicalCombatCatalogSnapshot>({
    status: 'loading',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [missionGenerationError, setMissionGenerationError] = useState<
    string | null
  >(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const reportLaunchConflict = useCampaignPersistenceStore(
    (s) => s.reportLaunchConflict,
  );
  const clearLaunchConflict = useCampaignPersistenceStore(
    (s) => s.clearLaunchConflict,
  );

  useEffect(() => {
    let cancelled = false;
    void fetchCanonicalCatalogSnapshot().then((snapshot) => {
      if (!cancelled) setCatalog(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const missionReadinessProjection = useMemo(
    () =>
      buildMissionReadinessProjection({
        campaignId: campaign?.id ?? 'campaign-pending',
        mission: undefined,
        units,
        pilots,
        repairBay: selectRepairBay(campaign as ICampaign | null),
        catalog,
        maxUnits: 4,
        baseCampaignHref: campaign
          ? `/gameplay/campaigns/${encodeURIComponent(campaign.id)}`
          : undefined,
      }),
    [campaign, catalog, pilots, units],
  );
  const missionReadinessSummary = missionReadinessProjection.canLaunch
    ? `${missionReadinessProjection.selectedUnits.length} roster unit${
        missionReadinessProjection.selectedUnits.length === 1 ? '' : 's'
      } selected for generated mission.`
    : (missionReadinessProjection.unresolvedBlockers[0]?.message ??
      'Resolve roster readiness before generating a mission.');

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
    const currentCampaign = store.getState().campaign;
    if (!currentCampaign) {
      return;
    }
    setIsGenerating(true);
    setMissionGenerationError(null);
    clearLaunchConflict();

    try {
      if (!missionReadinessProjection.canLaunch) {
        return;
      }

      const deployableUnits = selectedRosterUnitsForLaunch(
        missionReadinessProjection,
      );
      const launchGate = admitCampaignLaunch({
        snapshot: { campaignId: currentCampaign.id, catalog },
        expected: { campaignId: currentCampaign.id },
        selectedUnits: deployableUnits,
      });
      if (!launchGate.admitted) {
        setMissionGenerationError(launchGate.blocker.message);
        return;
      }
      const deployedUnitIds = deployableUnits.map((unit) => unit.unitId);
      const missionNumber = missionCount + 1;
      const missionName = `Mission ${missionNumber}`;
      const missionId = `mission-${generateId()}`;
      const mission = createCampaignMission({
        id: missionId,
        name: missionName,
        description: `Campaign mission ${missionNumber}`,
      });
      const launchCampaign: ICampaign = {
        ...currentCampaign,
        missions: new Map(currentCampaign.missions).set(missionId, mission),
      };
      const ownedForces = await resolveDashboardLaunchForces({
        campaignId: currentCampaign.id,
        missionId,
        launchHead,
        ...(currentCampaign.coopSession?.matchId === undefined
          ? {}
          : { sessionId: currentCampaign.coopSession.matchId }),
      });

      const result = await materializeCampaignMissionEncounter({
        campaign: launchCampaign,
        missionId,
        rosterUnits: deployableUnits,
        catalog,
        ...(ownedForces === undefined ? {} : { ownedForces }),
      });
      rosterStore
        .getState()
        .createMission(
          missionName,
          deployedUnitIds,
          result.encounterId,
          missionId,
        );
      await syncLaunchedMission(
        launchCampaign,
        missionId,
        result.encounterId,
        store,
      );

      await router.push(
        `/gameplay/encounters/${result.encounterId}?campaignId=${currentCampaign.id}&missionId=${missionId}`,
      );
    } catch (error) {
      const failure = classifyLaunchFailure(error);
      if (failure.kind === 'conflict') {
        reportLaunchConflict(failure.conflict);
        return;
      }
      setMissionGenerationError(failure.message);
    } finally {
      setIsGenerating(false);
    }
  }, [
    catalog,
    clearLaunchConflict,
    launchHead,
    missionCount,
    missionReadinessProjection,
    reportLaunchConflict,
    rosterStore,
    router,
    store,
  ]);

  const handleNavigate = useCallback(
    (href: string) => {
      router.push(href);
    },
    [router],
  );

  const handleDeleteCampaign = useCallback(async () => {
    if (!campaign) {
      return;
    }

    setDeleteError(null);
    try {
      const response = await fetch(
        `/api/campaigns/${encodeURIComponent(campaign.id)}`,
        { method: 'DELETE' },
      );
      if (!response.ok) {
        throw new Error(`server responded ${response.status}`);
      }

      store.setState({
        campaign: null,
        forcesStore: null,
        missionsStore: null,
        pendingBattleOutcomes: [],
        processedBattleIds: [],
        reviewedBattleIds: {},
        outcomeApplyErrors: {},
        activityLog: [],
      });
      useCampaignPersistenceStore.getState().reset();
      setShowDeleteConfirm(false);
      await router.push('/gameplay/campaigns');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'failed to delete campaign';
      setDeleteError(`Campaign could not be deleted: ${message}`);
    }
  }, [campaign, router, store]);

  if (!isClient || routeLoader.isLoadingCampaign) {
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
       * Share surface (task 2.2). Reads the campaign's STORED authority,
       * so a replica shows the shared-copy notice rather than share
       * controls that the server would refuse anyway.
       */}
      <CampaignSharePanelConnected
        campaignId={campaign.id}
        matchId={getCoopMatchId(campaign.coopSession)}
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
          isGenerating || !missionReadinessProjection.canLaunch
        }
        readinessSummary={missionReadinessSummary}
        onGenerateMission={handleGenerateMission}
      />

      {missionGenerationError && (
        <p
          className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200"
          data-testid="generate-mission-error"
        >
          {missionGenerationError}
        </p>
      )}

      <CampaignRosterCard units={units} />
      <CampaignMissionHistoryCard missions={missions} />

      <CampaignQuickActionsCard
        campaignId={campaign.id}
        onNavigate={handleNavigate}
      />
      <CampaignInformationCard campaign={campaign} />

      {deleteError && (
        <p
          className="mt-4 rounded-lg border border-red-700 bg-red-950/40 p-3 text-sm text-red-200"
          data-testid="delete-campaign-error"
        >
          {deleteError}
        </p>
      )}

      <div className="border-border-theme-subtle mt-6 flex justify-end border-t pt-6">
        <Button
          variant="danger"
          onClick={() => setShowDeleteConfirm(true)}
          data-testid="delete-campaign-btn"
        >
          Delete Campaign
        </Button>
      </div>
      <DeleteCampaignDialog
        open={showDeleteConfirm}
        campaignName={campaign.name}
        onCancel={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteCampaign}
      />
    </PageLayout>
  );
}
