import type { ICampaign } from '@/types/campaign/Campaign';
import type { IRosterUnitProjection } from '@/types/campaign/RosterUnitProjection';

import {
  logCommandDiagnostic,
  logInvalidCommandAction,
  logMalformedCommandPayload,
} from '@/lib/command-screen/commandDiagnostics';

type CampaignMissionSource = Pick<ICampaign, 'id' | 'name' | 'missions'>;

const MISSION_LAUNCH_COMMAND_DOMAIN = 'mission-readiness';

export function logLaunchRosterPreflightDiagnostics(
  campaign: CampaignMissionSource,
  missionId: string,
  rosterUnits: readonly IRosterUnitProjection[],
): void {
  if (rosterUnits.length === 0) {
    logMalformedCommandPayload({
      commandId: missionLaunchCommandId(campaign.id, missionId),
      domain: MISSION_LAUNCH_COMMAND_DOMAIN,
      payloadKind: 'mission-launch-roster',
      subjectRefs: missionLaunchSubjectRefs(campaign, missionId, rosterUnits),
      reasonCodes: ['empty-roster'],
      metadata: {
        rosterUnitCount: 0,
      },
    });
    return;
  }

  const destroyed = rosterUnits.find((unit) => unit.readiness === 'Destroyed');
  if (!destroyed) return;

  logInvalidCommandAction({
    commandId: missionLaunchCommandId(campaign.id, missionId),
    domain: MISSION_LAUNCH_COMMAND_DOMAIN,
    subjectRefs: missionLaunchSubjectRefs(campaign, missionId, rosterUnits),
    reasonCodes: ['destroyed-roster'],
    resultingStateSummary: 'Mission launch blocked by destroyed roster unit.',
    metadata: {
      rosterUnitCount: rosterUnits.length,
      blockedUnitId: destroyed.unitId,
      blockedUnitReadiness: destroyed.readiness,
    },
  });
}

export function logMissionLaunchCommitRejected(input: {
  readonly campaign: CampaignMissionSource;
  readonly missionId: string;
  readonly rosterUnits: readonly IRosterUnitProjection[];
  readonly error: unknown;
}): void {
  logCommandDiagnostic({
    event: 'command_commit_rejected',
    level: 'error',
    commandId: missionLaunchCommandId(input.campaign.id, input.missionId),
    domain: MISSION_LAUNCH_COMMAND_DOMAIN,
    status: 'rejected',
    authority: 'player',
    subjectRefs: missionLaunchSubjectRefs(
      input.campaign,
      input.missionId,
      input.rosterUnits,
    ),
    reasonCodes: ['campaign-mission-encounter-failed'],
    userVisibleStateChanged: false,
    resultingStateSummary: 'Mission launch encounter materialization failed.',
    metadata: {
      rosterUnitCount: input.rosterUnits.length,
    },
    error: input.error,
  });
}

export function logMissionLaunchCommitSucceeded(input: {
  readonly campaign: CampaignMissionSource;
  readonly missionId: string;
  readonly rosterUnits: readonly IRosterUnitProjection[];
  readonly encounterId: string;
  readonly reused: boolean;
  readonly playerForceId?: string;
  readonly opponentForceId?: string;
}): void {
  logCommandDiagnostic({
    event: 'command_commit_succeeded',
    commandId: missionLaunchCommandId(input.campaign.id, input.missionId),
    domain: MISSION_LAUNCH_COMMAND_DOMAIN,
    status: 'committed',
    authority: 'player',
    subjectRefs: missionLaunchSubjectRefs(
      input.campaign,
      input.missionId,
      input.rosterUnits,
      input.encounterId,
    ),
    reasonCodes: [],
    userVisibleStateChanged: true,
    ledgerRef: `mission:${input.missionId}:encounter:${input.encounterId}`,
    persistenceRef: `encounter:${input.encounterId}`,
    resultingStateSummary: input.reused
      ? 'Mission launch reused an existing playable encounter.'
      : 'Mission launch created a playable encounter.',
    metadata: {
      rosterUnitCount: input.rosterUnits.length,
      reused: input.reused,
      playerForceId: input.playerForceId,
      opponentForceId: input.opponentForceId,
    },
  });
}

export function isRosterPreflightFailure(
  rosterUnits: readonly IRosterUnitProjection[],
): boolean {
  return (
    rosterUnits.length === 0 ||
    rosterUnits.some((unit) => unit.readiness === 'Destroyed')
  );
}

function missionLaunchCommandId(campaignId: string, missionId: string): string {
  return `mission-readiness.launch.${campaignId}.${missionId}`;
}

function missionLaunchSubjectRefs(
  campaign: CampaignMissionSource,
  missionId: string,
  rosterUnits: readonly IRosterUnitProjection[],
  encounterId?: string,
) {
  return [
    { id: campaign.id, type: 'campaign', label: campaign.name },
    { id: missionId, type: 'mission' },
    ...rosterUnits.map((unit) => ({
      id: unit.unitId,
      type: 'roster-unit',
      label: unit.unitName,
    })),
    ...(encounterId ? [{ id: encounterId, type: 'encounter' }] : []),
  ];
}
