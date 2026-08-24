/**
 * CampaignGrantAck handler (task 5.5; design D4/D5).
 *
 * A participant reports the highest delivery sequence it has applied and
 * the server records it durably, so a later join can resume from where
 * that participant actually got to rather than re-reading the stream.
 *
 * The socket's own bound grants are the first gate: a connection may
 * only acknowledge a grant IT joined with, verified through the token at
 * join time. Without that, one authenticated socket could advance
 * another participant's cursor by naming their grant, and the cursor is
 * exactly the thing that decides what a resume skips.
 *
 * Beyond that gate the cursor module re-derives authorization itself -
 * the bound-grant map is a session fact and can be stale the moment a
 * revocation lands, which is precisely when the answer must change.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D5)
 */

import type { Database } from 'better-sqlite3';

import type { IProjectCampaignStreamDeps } from '@/lib/campaign/delivery/projectCampaignStreamForGrant';
import type { ICampaignClientMessage } from '@/types/multiplayer/Protocol';

import {
  recordParticipantAcknowledgement,
  type ParticipantAckResult,
} from '@/lib/campaign/delivery/participantDeliveryCursor';
import { mintVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

/** What a socket proved at join time about one grant. */
export interface IBoundGrantSession {
  readonly campaignId: string;
  readonly participantId: string;
}

export interface IHandleCampaignGrantAckDeps {
  readonly envelope: Extract<
    ICampaignClientMessage,
    { kind: 'CampaignGrantAck' }
  >;
  /** Grants this socket authenticated, keyed by grantId. */
  readonly boundGrants: ReadonlyMap<string, IBoundGrantSession>;
  readonly projectDeps: IProjectCampaignStreamDeps | null | undefined;
  readonly database: () => Database;
  readonly nowIso: () => string;
  readonly logger?: Pick<Console, 'warn'>;
}

/**
 * Records the acknowledgement. Returns the outcome for tests and
 * logging; the socket is never closed on a refusal, because a client
 * whose cursor claim is rejected is still a client with a valid
 * subscription - dropping it would turn a bookkeeping disagreement into
 * a reconnect storm.
 */
export async function handleCampaignGrantAck(
  deps: IHandleCampaignGrantAckDeps,
): Promise<ParticipantAckResult> {
  const unauthorized: ParticipantAckResult = {
    kind: 'not-authorized',
    reason: 'not-authorized',
  };
  if (deps.projectDeps == null) return unauthorized;

  const bound = deps.boundGrants.get(deps.envelope.grantId);
  if (bound === undefined || bound.campaignId !== deps.envelope.campaignId) {
    return unauthorized;
  }

  try {
    return await recordParticipantAcknowledgement(
      deps.database(),
      deps.projectDeps,
      {
        principal: mintVerifiedPrincipal(bound.participantId),
        grantId: deps.envelope.grantId,
        deliveryEpochId: deps.envelope.deliveryEpochId,
        ackedSequence: deps.envelope.ackedSequence,
      },
      deps.nowIso(),
    );
  } catch (error) {
    // An unavailable store is infrastructure, never a verdict about the
    // holder. The cursor simply does not move; the socket stays up.
    deps.logger?.warn('campaign grant ack failed', error);
    return unauthorized;
  }
}
