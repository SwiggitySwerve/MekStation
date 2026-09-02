/**
 * Durable, role-resolved campaign activity read (umbrella task 8.3).
 *
 * `projectCampaignActivityForViewer` is pure and takes an audience as an
 * argument; something has to decide WHICH audience a caller actually is.
 * That decision is the whole reason this file exists separately, and it
 * has exactly one rule: THE SEAT IS READ, NEVER ASSERTED. A caller names
 * a participant; the durable `campaign_session_participant` row says
 * whether that participant is the GM, a tactical player, or nobody. A
 * caller that could hand in its own role would make the role-scoping
 * decorative.
 *
 * Absence is a refusal rather than a downgrade. A participant with no
 * active membership - never bound, or bound and revoked - is answered
 * `not-a-participant`, not served the campaign-scoped subset. The scope
 * boundary's `campaign` tier means "every participant in this session",
 * and a stranger is not one; serving them the shared feed would read
 * that tier as "everyone", which is the fail-open form of the same
 * question `activeCampaignSessionMembership` was written to close.
 *
 * The journal read and the membership read are injected. Production
 * supplies SQLite-backed ones; a test supplies whatever it can prove
 * with. Neither is constructed here, so this module never opens a
 * database just by being imported.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-persistence/spec.md
 */

import type { ICampaignWireViewer } from '@/lib/multiplayer/server/campaignWireScopeBoundary';
import type {
  CampaignSeat,
  ICampaignSessionMembership,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { campaignScopeAdmits } from '@/lib/multiplayer/server/campaignWireScopeBoundary';

import type { ICampaignActivityEntry } from './campaignActivityProjection';

import { projectCampaignActivityForViewer } from './campaignActivityProjection';

/** The two durable reads this projection needs, injected by the caller. */
export interface ICampaignActivityReadPorts {
  /** The participant's ACTIVE membership, or null (revoked counts as null). */
  readonly readMembership: (
    campaignId: string,
    sessionId: string,
    participantId: string,
  ) => ICampaignSessionMembership | null;
  /** Every committed campaign fact, in order. */
  readonly readEvents: (
    campaignId: string,
  ) => Promise<readonly ICampaignEvent[]>;
}

/** Who is asking, and about which session. */
export interface ICampaignActivityReadRequest {
  readonly campaignId: string;
  readonly sessionId: string;
  readonly participantId: string;
}

/**
 * The read's answer. `viewerSeat` is echoed because it is the seat the
 * durable row resolved, not the one the caller supposed - a surface that
 * renders a GM-only affordance should key off the answer, not the ask.
 */
export type CampaignActivityReadResult =
  | {
      readonly kind: 'activity';
      readonly viewerSeat: CampaignSeat;
      readonly entries: readonly ICampaignActivityEntry[];
    }
  | { readonly kind: 'not-a-participant' };

/**
 * Read one viewer's authoritative activity feed.
 *
 * Order is load-bearing: membership resolves BEFORE any campaign fact is
 * read, so a refused caller never causes the journal to be walked on
 * their behalf.
 */
export async function readCampaignActivityForViewer(
  ports: ICampaignActivityReadPorts,
  request: ICampaignActivityReadRequest,
): Promise<CampaignActivityReadResult> {
  const membership = ports.readMembership(
    request.campaignId,
    request.sessionId,
    request.participantId,
  );
  if (membership === null) {
    return { kind: 'not-a-participant' };
  }

  const isGm = membership.seat === 'gm';
  const wireViewer: ICampaignWireViewer = {
    participantId: request.participantId,
    isGm,
  };
  const events = await ports.readEvents(request.campaignId);
  return {
    kind: 'activity',
    viewerSeat: membership.seat,
    entries: projectCampaignActivityForViewer(request.campaignId, events, {
      // The shared audience policy, bound to this viewer - not a second
      // opinion about what a seat may see.
      admits: (scope) => campaignScopeAdmits(scope, wireViewer),
      seesGmPrivateDetail: isGm,
    }),
  };
}
