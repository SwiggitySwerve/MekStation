/**
 * CampaignGrantJoin handler (design D5, task 3.3).
 *
 * Verifies the grant token first, refuses campaign/grant/participant
 * mismatches without extra store reads, then starts the per-grant
 * delivery session. Lives beside handleCampaignJoin; it does not
 * replace the room-code guest path.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D5)
 */

import type { CampaignGrantNullCursorBackfill } from '@/lib/campaign/delivery/campaignDeliveryTypes';
import type { ICampaignGrantLiveSource } from '@/lib/campaign/delivery/campaignGrantChannelSession';
import type { IProjectCampaignStreamDeps } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import type {
  ICampaignClientMessage,
  IErrorCode,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import {
  grantCampaignMismatchFrame,
  grantChannelUnavailableFrame,
  grantIdMismatchFrame,
  grantParticipantMismatchFrame,
  grantTokenFailureFrame,
} from '@/lib/campaign/delivery/campaignGrantChannelAuth';
import { startCampaignGrantChannelSession } from '@/lib/campaign/delivery/campaignGrantChannelSession';
import { verifyCampaignGrantToken } from '@/lib/campaign/grants/campaignGrantToken';
import { mintVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import type { ICampaignHostRegistryEntry } from './CampaignHostRegistry';

export interface ICampaignGrantChannelDeps {
  readonly projectDeps: IProjectCampaignStreamDeps;
  readonly nowMs: () => number;
  readonly nowIso: () => string;
  /**
   * Optional. Defaults to full-stream so existing joins keep the
   * task-3.3 backfill. Pass snapshot-plus-tail to opt a socket into
   * scoped snapshot hydration.
   */
  readonly nullCursorBackfill?: CampaignGrantNullCursorBackfill;
}

export interface IHandleCampaignGrantJoinDeps {
  readonly envelope: Extract<
    ICampaignClientMessage,
    { kind: 'CampaignGrantJoin' }
  >;
  readonly entry: ICampaignHostRegistryEntry;
  readonly matchId: string;
  readonly verifiedPlayerId: string;
  readonly cleanupFns: Set<() => void>;
  readonly grantChannel: ICampaignGrantChannelDeps | null | undefined;
  readonly liveSource: ICampaignGrantLiveSource;
  readonly send: (message: IServerMessage) => void;
  readonly closeTyped: (code: IErrorCode, reason: string) => void;
}

/**
 * Authenticates a grant join and starts cursor-resumable delivery.
 * Token verification runs before any projection.
 */
export async function handleCampaignGrantJoin(
  deps: IHandleCampaignGrantJoinDeps,
): Promise<void> {
  if (deps.grantChannel == null) {
    const frame = grantChannelUnavailableFrame();
    deps.closeTyped(frame.code, frame.reason);
    return;
  }

  const verified = await verifyCampaignGrantToken(
    deps.envelope.token,
    deps.grantChannel.projectDeps.grantStore,
    deps.grantChannel.nowMs(),
  );
  if (!verified.ok) {
    const frame = grantTokenFailureFrame(verified.reason);
    deps.closeTyped(frame.code, frame.reason);
    return;
  }

  const grant = verified.grant;
  if (deps.envelope.campaignId !== grant.campaignId) {
    const frame = grantCampaignMismatchFrame();
    deps.closeTyped(frame.code, frame.reason);
    return;
  }
  if (deps.envelope.grantId !== grant.grantId) {
    const frame = grantIdMismatchFrame();
    deps.closeTyped(frame.code, frame.reason);
    return;
  }
  if (deps.envelope.campaignId !== deps.entry.campaignId) {
    const frame = grantCampaignMismatchFrame();
    deps.closeTyped(frame.code, frame.reason);
    return;
  }
  if (deps.verifiedPlayerId !== grant.participantId) {
    const frame = grantParticipantMismatchFrame();
    deps.closeTyped(frame.code, frame.reason);
    return;
  }

  await startCampaignGrantChannelSession(
    {
      socketSend: deps.send,
      closeTyped: deps.closeTyped,
      matchId: deps.matchId,
      campaignId: grant.campaignId,
      grantId: grant.grantId,
      principal: mintVerifiedPrincipal(grant.participantId),
      projectDeps: deps.grantChannel.projectDeps,
      liveSource: deps.liveSource,
      cleanupFns: deps.cleanupFns,
      nowIso: deps.grantChannel.nowIso,
      nullCursorBackfill: deps.grantChannel.nullCursorBackfill ?? 'full-stream',
    },
    deps.envelope.cursor,
  );
}
