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

import type { Database } from 'better-sqlite3';

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
import { readParticipantDeliveryCursor } from '@/lib/campaign/delivery/participantDeliveryCursor';
import { verifyCampaignGrantToken } from '@/lib/campaign/grants/campaignGrantToken';
import { mintVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import type { ICampaignHostRegistryEntry } from './CampaignHostRegistry';

/** The cursor shape a grant join may start from. */
type ICampaignGrantJoinCursor = Extract<
  ICampaignClientMessage,
  { kind: 'CampaignGrantJoin' }
>['cursor'];

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
  /**
   * Handle for the durable participant cursor (task 5.5). Optional so a
   * test harness can wire projection only; without it a join simply
   * falls back to the join envelope's own cursor.
   */
  readonly database?: () => Database;
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
  /** Records what this socket proved, for later acknowledgements. */
  readonly onBound?: (
    grantId: string,
    session: { readonly campaignId: string; readonly participantId: string },
  ) => void;
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

  deps.onBound?.(grant.grantId, {
    campaignId: grant.campaignId,
    participantId: grant.participantId,
  });

  // Resume: a client that sends no cursor but HAS a durable one picks up
  // where it left off instead of re-reading the whole stream. A client
  // that names its own cursor is believed over the stored one - it knows
  // what it actually applied, and the stored value may lag the last
  // acknowledgement in flight. A stored cursor from a superseded epoch
  // is not special-cased here: validateCursor rebaselines it, which is
  // the same answer the client would get for any stale cursor.
  const resumeCursor =
    deps.envelope.cursor ?? readDurableCursor(deps, grant.campaignId, grant);

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
    resumeCursor,
  );
}

/**
 * Reads this participant's stored cursor, if the channel was wired with
 * a database. A read failure is not a join failure: the worst case is a
 * fuller backfill, which the replica applies idempotently.
 */
function readDurableCursor(
  deps: IHandleCampaignGrantJoinDeps,
  campaignId: string,
  grant: { readonly grantId: string; readonly participantId: string },
): ICampaignGrantJoinCursor {
  const database = deps.grantChannel?.database;
  if (database === undefined) return null;
  try {
    const stored = readParticipantDeliveryCursor(database(), {
      campaignId,
      grantId: grant.grantId,
      participantId: grant.participantId,
    });
    if (stored === null) return null;
    return {
      deliveryEpochId: stored.deliveryEpochId,
      afterSequence: stored.ackedSequence,
    };
  } catch {
    return null;
  }
}
