import React from 'react';

import type { BreadcrumbItem } from '@/components/ui';
import type { IMissionReadinessProjection } from '@/lib/campaign/readiness/missionReadinessProjection';
import type { ICampaign } from '@/types/campaign/Campaign';
import type { CoopParticipationChoice } from '@/types/campaign/CoopCampaign';

import { CampaignNavigation } from '@/components/campaign/CampaignNavigation';
import { CoopParticipationPicker } from '@/components/campaign/coop';
import { PageLayout } from '@/components/ui';
import { buildCampaignCustomizerHref } from '@/lib/campaign/customizer/campaignCustomizerRoute';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { generateUUID } from '@/utils/uuid';

import {
  coopLaunchReadiness,
  type CoopCampaign,
} from './missionLaunchPage.launch';
import { MissionReadinessPanel } from './missionLaunchReadinessPanel';
import { MissionRefitReturnStatus } from './MissionRefitReturnStatus';

interface ISinglePlayerMissionLaunchSurfaceProps {
  readonly breadcrumbs: BreadcrumbItem[];
  readonly customizerResult: string | null;
  readonly isLaunching: boolean;
  readonly launchError: string | null;
  readonly loadedCampaign: ICampaign;
  readonly missionDisplayName: string;
  readonly missionKey: string | null;
  readonly onLaunch: () => void;
  readonly onToggleRosterUnit: (unitId: string) => void;
  readonly readinessProjection: IMissionReadinessProjection;
}

interface ICoopMissionLaunchSurfaceProps {
  readonly breadcrumbs: BreadcrumbItem[];
  readonly launchError: string | null;
  readonly loadedCampaign: CoopCampaign;
  readonly localChoice: CoopParticipationChoice;
  readonly missionDisplayName: string;
  readonly onClearLaunchError: () => void;
  readonly onLaunch: () => void;
  readonly onLocalChoiceChange: (choice: CoopParticipationChoice) => void;
  readonly otherChoice?: CoopParticipationChoice;
}

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

export function SinglePlayerMissionLaunchSurface({
  breadcrumbs,
  customizerResult,
  isLaunching,
  launchError,
  loadedCampaign,
  missionDisplayName,
  missionKey,
  onLaunch,
  onToggleRosterUnit,
  readinessProjection,
}: ISinglePlayerMissionLaunchSurfaceProps): React.ReactElement {
  return (
    <PageLayout
      title="Mission Launch"
      subtitle={`${loadedCampaign.name} - ${missionDisplayName}`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
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
            onToggleUnit={onToggleRosterUnit}
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
                editorUnitId: generateUUID(),
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
              onClick={onLaunch}
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

export function CoopMissionLaunchSurface({
  breadcrumbs,
  launchError,
  loadedCampaign,
  localChoice,
  missionDisplayName,
  onClearLaunchError,
  onLaunch,
  onLocalChoiceChange,
  otherChoice,
}: ICoopMissionLaunchSurfaceProps): React.ReactElement {
  const { bothChosen, canLaunch, noDeploy } = coopLaunchReadiness(
    localChoice,
    otherChoice,
  );
  const localPlayerName = localPlayerNameForMode(
    loadedCampaign.coopSession.mode,
  );

  return (
    <PageLayout
      title="Co-op Mission Launch"
      subtitle={`${loadedCampaign.name} - ${missionDisplayName}`}
      maxWidth="wide"
      breadcrumbs={breadcrumbs}
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
            onClearLaunchError();
            onLocalChoiceChange(choice);
          }}
          otherPlayerChoice={otherChoice}
        />

        {!bothChosen ? (
          <p
            data-testid="coop-launch-waiting"
            className="text-sm text-slate-400"
          >
            Waiting for the other player&apos;s pick - the launch button enables
            once both players choose.
          </p>
        ) : null}

        {noDeploy ? (
          <p
            data-testid="coop-launch-zero-deploy-block"
            className="text-sm text-rose-400"
          >
            Neither player chose to deploy - the mission cannot launch (at least
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
          onClick={onLaunch}
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
