/**
 * Co-op Mission Launch Page
 *
 * The `/gameplay/campaigns/[id]/missions/[missionId]/launch` route added
 * by `wire-coop-campaign-route` (Wave 6.1, task 3.1). The route is the
 * pre-launch handshake for co-op missions: each player picks `deploy`
 * or `command-hq`, and the launch button stays gated until both have
 * picked. The zero-`deploy` rule from `add-coop-campaign-play` (Wave 5)
 * blocks the launch if neither player chose to deploy.
 *
 * For a single-player (non-co-op) campaign the route SHALL skip the
 * picker and launch directly (existing single-player behavior is
 * preserved — spec scenario "non-co-op mission skips the picker and
 * launches directly").
 *
 * The picker publishes the local participation choice into the co-op
 * runtime session and subscribes to the other player's choice before
 * allowing the composed co-op encounter launch.
 *
 * @spec openspec/changes/wire-coop-campaign-route/specs/coop-campaign-sync/spec.md
 */

import { useRouter } from 'next/router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { CoopParticipationPicker } from '@/components/campaign/coop';
import { PageLayout } from '@/components/ui';
import {
  getCoopLocalPlayerId,
  getCoopMatchId,
  getCoopOtherPlayerId,
  type ICoopParticipationRecord,
  publishCoopParticipation,
  subscribeCoopParticipation,
} from '@/lib/campaign/coop/coopRuntimeSession';
import { buildCampaignCustomizerHref } from '@/lib/campaign/customizer/campaignCustomizerRoute';
import { materializeCampaignMissionEncounter } from '@/lib/campaign/encounter/materializeCampaignMissionEncounter';
import {
  buildMissionReadinessProjection,
  selectedRosterUnitsForLaunch,
} from '@/lib/campaign/readiness/missionReadinessProjection';
import {
  getLoadedCampaign,
  renderPendingCampaignPage,
  useCampaignPageShell,
} from '@/pages-modules/gameplay/campaigns/campaignPageShell';
import {
  buildLaunchEncounter,
  campaignEncounterHref,
  rootForceForCampaign,
  routeParam,
  withMissionScenario,
} from '@/pages-modules/gameplay/campaigns/missionLaunchPage.helpers';
import { MissionReadinessPanel } from '@/pages-modules/gameplay/campaigns/missionLaunchReadinessPanel';
import { MissionRefitReturnStatus } from '@/pages-modules/gameplay/campaigns/MissionRefitReturnStatus';
import { selectRepairBay } from '@/stores/campaign/campaignBaySelectors';
import { useCampaignRosterStore } from '@/stores/campaign/useCampaignRosterStore';
import { RulesLevel } from '@/types/enums/RulesLevel';

function localPlayerNameForMode(mode: 'host' | 'guest'): string {
  return mode === 'host' ? 'You (Host)' : 'You (Guest)';
}

function directLaunchButtonLabel({
  isLaunching,
  warningCount,
}: {
  readonly isLaunching: boolean;
  readonly warningCount: number;
}): string {
  if (isLaunching) return 'Launching mission...';
  return warningCount > 0 ? 'Launch with warnings' : 'Launch mission';
}

function directLaunchButtonClass({
  canLaunch,
  isLaunching,
  warningCount,
}: {
  readonly canLaunch: boolean;
  readonly isLaunching: boolean;
  readonly warningCount: number;
}): string {
  if (isLaunching) {
    return 'cursor-wait rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2 font-semibold text-slate-500';
  }
  if (!canLaunch) {
    return 'cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2 font-semibold text-slate-500';
  }
  if (warningCount > 0) {
    return 'rounded-lg border border-amber-500/70 bg-amber-500/15 px-4 py-2 font-semibold text-amber-100';
  }
  return 'rounded-lg border border-sky-500/60 bg-sky-600/20 px-4 py-2 font-semibold text-sky-100';
}

export default function CoopMissionLaunchPage(): React.ReactElement {
  const router = useRouter();
  const { missionId } = router.query;
  const shell = useCampaignPageShell('Mission Launch');
  const campaignKey = shell.routeCampaignId;
  const missionKey = routeParam(missionId);
  const customizerResult = routeParam(router.query.customizerResult);

  const store = shell.store;
  const campaign = shell.campaign;
  const matchId = getCoopMatchId(campaign?.coopSession);
  const localPlayerId = campaign?.coopSession
    ? getCoopLocalPlayerId(campaign.coopSession)
    : 'host';
  const otherPlayerId = campaign?.coopSession
    ? getCoopOtherPlayerId(campaign.coopSession)
    : 'guest';
  const localForce = useMemo(
    () => (campaign ? rootForceForCampaign(campaign) : null),
    [campaign],
  );
  const rosterUnits = useCampaignRosterStore((state) =>
    state.getUnitsWithReadiness(),
  );
  const rosterPilots = useCampaignRosterStore((state) => state.pilots);
  const mission =
    campaign && missionKey ? campaign.missions.get(missionKey) : undefined;
  const [selectedRosterUnitIds, setSelectedRosterUnitIds] = useState<
    readonly string[] | null
  >(null);
  const readinessProjection = useMemo(
    () =>
      buildMissionReadinessProjection({
        campaignId: campaign?.id ?? campaignKey ?? 'campaign-pending',
        mission,
        units: rosterUnits,
        pilots: rosterPilots,
        repairBay: selectRepairBay(campaign ?? null),
        selectedRosterUnitIds: selectedRosterUnitIds ?? undefined,
        maxUnits: 4,
        baseCampaignHref: campaign
          ? `/gameplay/campaigns/${encodeURIComponent(campaign.id)}`
          : undefined,
      }),
    [
      campaign,
      campaignKey,
      mission,
      rosterPilots,
      rosterUnits,
      selectedRosterUnitIds,
    ],
  );

  const [participationRecords, setParticipationRecords] = useState<
    readonly ICoopParticipationRecord[]
  >([]);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);

  // Local player's pick — `deploy` is the canonical default so a host who
  // never opens the picker still launches. Guests start at `command-hq` so
  // the gating rule visibly fires until they pick.
  const localDefault: CoopParticipationChoice =
    campaign?.coopSession?.mode === 'host' ? 'deploy' : 'command-hq';
  const [localChoice, setLocalChoice] =
    useState<CoopParticipationChoice>(localDefault);

  useEffect(() => {
    setSelectedRosterUnitIds(null);
  }, [campaignKey, missionKey]);

  const handleToggleRosterUnit = useCallback(
    (unitId: string) => {
      setLaunchError(null);
      const selected = readinessProjection.selectedRosterUnitIds;
      setSelectedRosterUnitIds(
        selected.includes(unitId)
          ? selected.filter((candidate) => candidate !== unitId)
          : [...selected, unitId],
      );
    },
    [readinessProjection.selectedRosterUnitIds],
  );

  useEffect(() => {
    if (!campaign?.coopSession || !matchId || !missionKey || !localForce) {
      return;
    }
    publishCoopParticipation({
      matchId,
      missionId: missionKey,
      playerId: localPlayerId,
      role: campaign.coopSession.mode,
      choice: localChoice,
      force: localForce,
    });
  }, [
    campaign?.coopSession,
    localChoice,
    localForce,
    localPlayerId,
    matchId,
    missionKey,
  ]);

  useEffect(() => {
    if (!campaign?.coopSession || !matchId || !missionKey) {
      setParticipationRecords([]);
      return () => undefined;
    }
    return subscribeCoopParticipation(
      matchId,
      missionKey,
      setParticipationRecords,
    );
  }, [campaign?.coopSession, matchId, missionKey]);

  const otherRecord = useMemo(
    () =>
      participationRecords.find((entry) => entry.playerId === otherPlayerId),
    [otherPlayerId, participationRecords],
  );
  const otherChoice = otherRecord?.choice;

  const handleLaunch = useCallback(async () => {
    if (!campaignKey || !missionKey) {
      return;
    }
    if (campaign?.coopSession) {
      if (!matchId || !localForce || !otherRecord) {
        return;
      }
      const localRecord: ICoopParticipationRecord = {
        matchId,
        missionId: missionKey,
        playerId: localPlayerId,
        role: campaign.coopSession.mode,
        choice: localChoice,
        force: localForce,
      };
      const contributions = [localRecord, otherRecord].map((entry) => ({
        playerId: entry.playerId,
        role: entry.role,
        force: entry.force,
        participation: entry.choice,
      }));
      let result;
      try {
        const { launchCoopMission } =
          await import('@/lib/campaign/coop/launchCoopMission');
        result = launchCoopMission(
          buildLaunchEncounter(campaign, missionKey),
          contributions,
        );
      } catch (error) {
        setLaunchError(
          error instanceof Error
            ? error.message
            : 'Failed to load co-op launch runtime',
        );
        return;
      }
      if (!result.ok) {
        setLaunchError(result.error);
        return;
      }
      setLaunchError(null);
      if (localChoice === 'deploy') {
        void router.push(
          campaignEncounterHref({
            encounterId: result.encounterId ?? missionKey,
            campaignId: campaign.id,
            missionId: missionKey,
          }),
        );
        return;
      }
      void router.push(`/gameplay/campaigns/${campaign.id}`);
      return;
    }

    if (!campaign) {
      return;
    }

    setIsLaunching(true);
    setLaunchError(null);
    try {
      if (!readinessProjection.canLaunch) {
        setLaunchError(
          readinessProjection.unresolvedBlockers
            .map((reason) => reason.message)
            .join(' '),
        );
        return;
      }
      const result = await materializeCampaignMissionEncounter({
        campaign,
        missionId: missionKey,
        rosterUnits: selectedRosterUnitsForLaunch(readinessProjection),
      });
      const mission = campaign.missions.get(missionKey);
      if (mission) {
        const nextMission = withMissionScenario(mission, result.encounterId);
        const missions = new Map(campaign.missions);
        missions.set(missionKey, nextMission);
        store.getState().updateCampaign({ missions });
        store.getState().getMissionsStore()?.getState().addMission(nextMission);
        store.getState().saveCampaign();
      }
      await router.push(
        campaignEncounterHref({
          encounterId: result.encounterId,
          campaignId: campaignKey,
          missionId: missionKey,
        }),
      );
    } catch (error) {
      setLaunchError(
        error instanceof Error ? error.message : 'Failed to launch mission',
      );
    } finally {
      setIsLaunching(false);
    }
  }, [
    campaign,
    campaignKey,
    localChoice,
    localForce,
    localPlayerId,
    matchId,
    missionKey,
    otherRecord,
    readinessProjection,
    router,
    store,
  ]);

  const pending = renderPendingCampaignPage(shell, {
    title: 'Mission Launch',
    subtitle: 'Loading mission launch surface...',
  });
  if (pending) return pending;

  const loadedCampaign = getLoadedCampaign(shell);
  const missionDisplayName = mission?.name ?? 'Selected mission';

  // Non-co-op mission — skip the picker and launch directly, preserving
  // the existing single-player behavior. Spec scenario "Single-player
  // campaign mounts neither co-op surface" + the launch-direct expectation.
  if (!loadedCampaign.coopSession) {
    return (
      <PageLayout
        title="Mission Launch"
        subtitle={`${loadedCampaign.name} - ${missionDisplayName}`}
        maxWidth="wide"
        breadcrumbs={shell.breadcrumbs}
      >
        <CampaignNavigation
          campaignId={loadedCampaign.id}
          currentPage="missions"
          coopSession={loadedCampaign.coopSession}
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <MissionRefitReturnStatus customizerResult={customizerResult} />

            <MissionReadinessPanel
              projection={readinessProjection}
              onToggleUnit={handleToggleRosterUnit}
              buildCustomizeHref={(unitId) =>
                buildCampaignCustomizerHref({
                  campaignId: loadedCampaign.id,
                  unitId,
                  missionId: missionKey ?? undefined,
                  returnTo: 'mission-readiness',
                  campaignDate: loadedCampaign.currentDate.toISOString(),
                  budget: loadedCampaign.finances.balance.amount,
                  rulesLevel: RulesLevel.STANDARD,
                  refitConstraints: 'campaign-owned-refit',
                })
              }
            />
          </div>

          <aside
            className="lg:sticky lg:top-6 lg:self-start"
            data-testid="mission-launch-briefing"
          >
            <div className="border-border-theme-subtle bg-surface-base/70 rounded-lg border p-4">
              <h2 className="text-text-theme-primary text-lg font-semibold">
                Mission briefing
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-theme-secondary">Mission</dt>
                  <dd className="text-text-theme-primary text-right font-medium">
                    {missionDisplayName}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-theme-secondary">Company</dt>
                  <dd className="text-text-theme-primary text-right font-medium">
                    {loadedCampaign.name}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-text-theme-secondary">Units selected</dt>
                  <dd className="text-text-theme-primary text-right font-medium">
                    {readinessProjection.selectedUnits.length} /{' '}
                    {readinessProjection.units.length}
                  </dd>
                </div>
              </dl>

              {launchError ? (
                <p
                  role="alert"
                  data-testid="mission-launch-error"
                  className="mt-3 text-sm text-rose-300"
                >
                  {launchError}
                </p>
              ) : null}

              <button
                type="button"
                data-testid="launch-mission-direct"
                disabled={isLaunching || !readinessProjection.canLaunch}
                onClick={handleLaunch}
                className={`mt-4 w-full ${directLaunchButtonClass({
                  canLaunch: readinessProjection.canLaunch,
                  isLaunching,
                  warningCount: readinessProjection.warnings.length,
                })}`}
              >
                {directLaunchButtonLabel({
                  isLaunching,
                  warningCount: readinessProjection.warnings.length,
                })}
              </button>
            </div>
          </aside>
        </div>
      </PageLayout>
    );
  }

  // Co-op mission — mount the picker for the local player. The launch
  // button is gated until both players have picked AND at least one
  // chose `deploy` (the Wave-5 zero-deploy block).
  const bothChosen = otherChoice !== undefined;
  const noDeploy =
    bothChosen && localChoice !== 'deploy' && otherChoice !== 'deploy';
  const canLaunch = bothChosen && !noDeploy;

  const localPlayerName = localPlayerNameForMode(
    loadedCampaign.coopSession.mode,
  );

  return (
    <PageLayout
      title="Co-op Mission Launch"
      subtitle={`${loadedCampaign.name} - ${missionDisplayName}`}
      maxWidth="wide"
      breadcrumbs={shell.breadcrumbs}
    >
      <CampaignNavigation
        campaignId={loadedCampaign.id}
        currentPage="missions"
        coopSession={loadedCampaign.coopSession}
      />

      <div className="mt-6 space-y-4">
        <CoopParticipationPicker
          playerName={localPlayerName}
          value={localChoice}
          onChange={(choice) => {
            setLaunchError(null);
            setLocalChoice(choice);
          }}
          otherPlayerChoice={otherChoice}
        />

        {!bothChosen ? (
          <p
            data-testid="coop-launch-waiting"
            className="text-sm text-slate-400"
          >
            Waiting for the other player&apos;s pick — the launch button enables
            once both players choose.
          </p>
        ) : null}

        {noDeploy ? (
          <p
            data-testid="coop-launch-zero-deploy-block"
            className="text-sm text-rose-400"
          >
            Neither player chose to deploy — the mission cannot launch (at least
            one player must take the field).
          </p>
        ) : null}

        {launchError ? (
          <p
            role="alert"
            data-testid="coop-launch-error"
            className="text-sm text-rose-300"
          >
            {launchError}
          </p>
        ) : null}

        <button
          type="button"
          data-testid="coop-launch-mission"
          disabled={!canLaunch}
          onClick={handleLaunch}
          className={
            canLaunch
              ? 'rounded-lg border border-sky-500/60 bg-sky-600/20 px-4 py-2 font-semibold text-sky-100'
              : 'cursor-not-allowed rounded-lg border border-slate-700 bg-slate-900/40 px-4 py-2 font-semibold text-slate-500'
          }
        >
          Launch mission
        </button>
      </div>
    </PageLayout>
  );
}
