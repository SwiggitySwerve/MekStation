/**
 * Refusal, projection and proposal helpers of the connected co-op route
 * surface (P2CG1G1, m13), kept out of the component so it has room for
 * creator binding. None of them imports the surface.
 */

import type { ICampaignSyncTransport } from '@/lib/campaign/coop/campaignSyncTransport';
import type { IPendingProposal } from '@/lib/multiplayer/server/CampaignGmArbiter';
import type { useCampaignStore } from '@/stores/campaign/useCampaignStore';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type {
  GuestProposalResult,
  IGuestProposal,
} from '@/types/campaign/CoopCampaign';
import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { projectAuthoritativeStateOntoCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import { useCampaignPersistenceStore } from '@/stores/campaign/useCampaignPersistenceStore';

import type { CampaignCoopRouteSurfaceProps } from './CampaignCoopRouteSurface';

import { isCampaignApplicationError } from './useCampaignApplicationConsumer';

/** The last server refusal: its raw wire code and the recovery it names. */
export interface ICampaignSurfaceRefusal {
  readonly code: string;
  readonly action: string | null;
}

/**
 * Umbrella 19.2: the server's refusal is the ONLY authority on whether a
 * progression command will be taken, and it arrives on the frame stream
 * both roles subscribe to. Returns the refusal an Error frame sets, `null`
 * when a committed campaign event clears the standing one, and `undefined`
 * when the frame leaves it alone. Clearing is deliberately OPTIMISTIC: no
 * "you may command again" frame exists and the server re-refuses if the
 * condition still holds. Application errors are the consumer's, never a
 * command refusal.
 */
export function refusalFromFrame(
  message: IServerMessage,
): ICampaignSurfaceRefusal | null | undefined {
  if (message.kind === 'Error' && !isCampaignApplicationError(message)) {
    return { code: message.code, action: message.recoveryAction ?? null };
  }
  return message.kind === 'CampaignEvent' ? null : undefined;
}

/**
 * Projects authoritative state onto the campaign store through the pure
 * function every viewer uses (design D9): the host's view is a grant
 * property, not a hosting property, so it has no host-specific path.
 */
export function projectStateOntoCampaignStore(
  store: ReturnType<typeof useCampaignStore>,
  campaignId: string,
  state: ICampaignAuthoritativeState | null,
): void {
  const projected = projectAuthoritativeStateOntoCampaign(
    store.getState().campaign,
    campaignId,
    state,
  );
  if (projected) store.setState({ campaign: projected });
}

/** Replaces any pending entry for the same proposal with `entry`. */
export function upsertPendingProposal(
  current: readonly IPendingProposal[],
  entry: IPendingProposal,
): readonly IPendingProposal[] {
  return [
    ...current.filter(
      (pending) => pending.proposal.proposalId !== entry.proposal.proposalId,
    ),
    entry,
  ];
}

/** Drops the pending entry a decision settled. */
export function removePendingProposal(
  current: readonly IPendingProposal[],
  proposalId: string,
): readonly IPendingProposal[] {
  return current.filter((entry) => entry.proposal.proposalId !== proposalId);
}

/** What the guest panel shows about its mirror. */
export function guestMirrorSummaryOf(input: {
  readonly mirrorCampaign: ICampaignAuthoritativeState | null;
  readonly mirrorPaused: boolean;
  readonly mirrorLastSequence: number;
  readonly hasToken: boolean;
}): NonNullable<CampaignCoopRouteSurfaceProps['guestMirrorSummary']> {
  const { mirrorCampaign, mirrorPaused, hasToken } = input;
  return {
    status: mirrorPaused
      ? 'paused'
      : mirrorCampaign
        ? 'synced'
        : hasToken
          ? 'connecting'
          : 'missing-token',
    balance: mirrorCampaign?.balance,
    salvagePool: mirrorCampaign?.salvagePool,
    rosterUnitCount: mirrorCampaign
      ? Object.keys(mirrorCampaign.rosterUnits).length
      : 0,
    pilotCount: mirrorCampaign ? Object.keys(mirrorCampaign.pilots).length : 0,
    lastSequence: input.mirrorLastSequence,
  };
}

/**
 * Hands the persistence store a committed-command acknowledgement for the
 * campaign the EVENT names (U35f; owner decision
 * OD-u35d-server-and-host-fix, host half), so the store ignores an event
 * for any campaign other than the one it holds. For its own campaign the
 * store cancels its armed auto-save and re-reads the record through its
 * load path, adopting the row version it read; a read that fails adopts
 * nothing. Not awaited: the store owns the read and its outcome.
 */
export function refreshSavedRecordAfterCommit(event: ICampaignEvent): void {
  void useCampaignPersistenceStore.getState().refreshAfterCommittedCommand({
    kind: 'committed',
    state: { campaignId: event.campaignId },
  });
}

export function submitGuestProposalOverTransport(
  transport: ICampaignSyncTransport,
  proposal: IGuestProposal,
): Promise<GuestProposalResult> {
  return new Promise((resolve, reject) => {
    let offFrame = (): void => undefined;
    let offError = (): void => undefined;
    const cleanup = (): void => {
      offFrame();
      offError();
    };
    offFrame = transport.onFrame((message) => {
      if (
        message.kind !== 'CampaignDecision' ||
        message.proposalId !== proposal.proposalId
      ) {
        return;
      }
      if (isPendingProposalResult(message.result)) {
        return;
      }
      cleanup();
      resolve(message.result as GuestProposalResult);
    });
    offError = transport.onError((error) => {
      cleanup();
      reject(error instanceof Error ? error : new Error('Campaign sync error'));
    });
    transport.sendProposal(proposal);
  });
}

function isPendingProposalResult(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { status?: unknown }).status === 'pending'
  );
}
