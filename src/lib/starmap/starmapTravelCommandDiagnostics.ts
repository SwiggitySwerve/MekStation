import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICommandSubjectRef } from '@/types/command-screen';

import {
  logCommandDiagnostic,
  logInvalidCommandAction,
  logMalformedCommandPayload,
} from '@/lib/command-screen/commandDiagnostics';

import type { IStarmapTravelPreview } from './starmapTravelTypes';

export function logTravelNoCampaign(systemId: string): void {
  logInvalidCommandAction({
    commandId: travelCommandId(systemId),
    domain: 'starmap',
    reasonCodes: ['campaign-missing'],
    metadata: {
      requestedSystemId: systemId,
    },
  });
}

export function logTravelMalformedDestination(campaign: ICampaign): void {
  logMalformedCommandPayload({
    commandId: travelCommandId(''),
    domain: 'starmap',
    payloadKind: 'destination-system-id',
    subjectRefs: travelSubjectRefs(campaign),
    reasonCodes: ['destination-empty'],
  });
}

export function logTravelPreview(
  campaign: ICampaign,
  systemId: string,
  preview: IStarmapTravelPreview,
): void {
  const destinationName = preview.destinationSystem?.name ?? systemId;
  logCommandDiagnostic({
    event:
      preview.status === 'ready'
        ? 'command_preview_created'
        : 'command_preview_rejected',
    level: preview.status === 'ready' ? 'info' : 'warn',
    commandId: travelCommandId(systemId),
    previewId: travelPreviewId(campaign, systemId, preview),
    domain: 'starmap',
    status: preview.status,
    authority: 'player',
    subjectRefs: travelSubjectRefs(campaign, preview),
    reasonCodes: travelReasonCodes(preview),
    userVisibleStateChanged: false,
    resultingStateSummary:
      preview.status === 'ready'
        ? `Travel preview to ${destinationName}`
        : `Travel blocked to ${destinationName}`,
    metadata: {
      fromSystemId: preview.fromSystem.id,
      destinationSystemId: preview.destinationSystem?.id ?? systemId,
      jumpCount: preview.jumpCount,
      elapsedDays: preview.elapsedDays,
      travelFeeCents: preview.travelFees.centsValue,
      dailyCostCents: preview.dailyCosts.centsValue,
      routeLegCount: preview.routeLegs.length,
    },
  });
}

export function logTravelInvalidAction(
  campaign: ICampaign | null,
  systemId: string,
  preview: IStarmapTravelPreview | null,
): void {
  logInvalidCommandAction({
    commandId: travelCommandId(systemId),
    domain: 'starmap',
    subjectRefs: campaign ? travelSubjectRefs(campaign, preview) : [],
    reasonCodes:
      preview?.status === 'blocked'
        ? travelReasonCodes(preview)
        : [campaign ? 'preview-unavailable' : 'campaign-missing'],
    metadata: {
      requestedSystemId: systemId,
      previewStatus: preview?.status,
      hasAfterCampaign: Boolean(preview?.afterCampaign),
    },
  });
}

export function logTravelCommitSucceeded(preview: IStarmapTravelPreview): void {
  const campaign = preview.afterCampaign;
  const destination = preview.destinationSystem;
  if (!campaign || !destination) return;

  logCommandDiagnostic({
    event: 'command_commit_succeeded',
    commandId: travelCommandId(destination.id),
    previewId: travelPreviewId(campaign, destination.id, preview),
    domain: 'starmap',
    status: 'committed',
    authority: 'player',
    subjectRefs: travelSubjectRefs(campaign, preview),
    reasonCodes: [],
    userVisibleStateChanged: true,
    ledgerRef: travelTransactionRef(campaign.id, preview),
    persistenceRef: `campaign:${campaign.id}:travel:${destination.id}:${preview.generatedAt}`,
    resultingStateSummary: `${campaign.name} arrived at ${destination.name}`,
    metadata: {
      fromSystemId: preview.fromSystem.id,
      destinationSystemId: destination.id,
      arrivalDate: preview.arrivalDate,
      elapsedDays: preview.elapsedDays,
      generatedEventCount: preview.generatedEvents.length,
    },
  });
}

function travelCommandId(systemId: string): string {
  return `starmap.travel.${systemId || 'unknown'}`;
}

function travelPreviewId(
  campaign: Pick<ICampaign, 'id'>,
  systemId: string,
  preview: Pick<IStarmapTravelPreview, 'generatedAt'>,
): string {
  return `travel-preview:${campaign.id}:${systemId || 'unknown'}:${preview.generatedAt}`;
}

function travelTransactionRef(
  campaignId: string,
  preview: Pick<IStarmapTravelPreview, 'destinationSystem' | 'generatedAt'>,
): string | undefined {
  return preview.destinationSystem
    ? `tx-travel-${campaignId}-${preview.generatedAt}-${preview.destinationSystem.id}`
    : undefined;
}

function travelSubjectRefs(
  campaign: Pick<ICampaign, 'id' | 'name'>,
  preview?: IStarmapTravelPreview | null,
): readonly ICommandSubjectRef[] {
  return [
    { id: campaign.id, type: 'campaign', label: campaign.name },
    ...(preview?.fromSystem
      ? [
          {
            id: preview.fromSystem.id,
            type: 'star-system',
            label: preview.fromSystem.name,
          },
        ]
      : []),
    ...(preview?.destinationSystem
      ? [
          {
            id: preview.destinationSystem.id,
            type: 'star-system',
            label: preview.destinationSystem.name,
          },
        ]
      : []),
  ];
}

function travelReasonCodes(
  preview: Pick<IStarmapTravelPreview, 'reasons' | 'status'>,
): readonly string[] {
  if (preview.reasons.length === 0) {
    return preview.status === 'ready' ? ['travel-route-ready'] : [];
  }

  return preview.reasons.map((reason) => {
    const [code] = reason.split(':');
    return code.trim() || 'travel-blocked';
  });
}
