import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { DayReportPanel } from '@/components/campaign/DayReportPanel';
import { PageLayout } from '@/components/ui';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  ScenarioGenerator,
  createDefaultUnitWeights,
  createDefaultTerrainWeights,
} from '@/simulation/generator';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { useCampaignStore } from '@/stores/campaign/useCampaignStore';

import type {
  CampaignDashboardCampaign,
  CampaignMissionHistoryItem,
  CampaignRosterUnit,
} from './CampaignDashboardPage.types';

import {
  useCampaignDayReports,
  useClientReady,
} from './CampaignDashboardPage.hooks';
import {
  CampaignHeaderContent,
  CampaignInformationCard,
  CampaignLoadingState,
  CampaignMissionHistoryCard,
  CampaignNotFoundState,
  CampaignOperationsCard,
  CampaignQuickActionsCard,
  CampaignRosterCard,
  CampaignStatsGrid,
} from './CampaignDashboardPage.sections';

export default function CampaignDashboardPage(): React.ReactElement {
  const router = useRouter();
  const store = useCampaignStore();
  const rosterStore = useCampaignRosterStore;

  const campaign = store
    .getState()
    .getCampaign() as CampaignDashboardCampaign | null;
  const units = rosterStore
    .getState()
    .getUnitsWithReadiness() as CampaignRosterUnit[];
  const missions = rosterStore
    .getState()
    .getMissionHistory() as CampaignMissionHistoryItem[];
  const missionCount = rosterStore.getState().missionCount;

  const isClient = useClientReady();
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
      <CampaignNavigation campaignId={campaign.id} currentPage="dashboard" />

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
