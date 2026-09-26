/**
 * A co-op host's GM funds correction, committed by the live campaign host as
 * the host-only ApplyGmIntervention campaign intent (roadmap unit U92).
 *
 * The GM ledger page builds the intent from an approval and sends it on the
 * host's active campaign-sync transport; the host commits it as one
 * FundsChanged, which every viewer folds like any other.
 *
 * @spec openspec/specs/coop-campaign-sync/spec.md (Co-op player-safe GM result projection)
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignApplyGmInterventionIntent } from '@/types/campaign/CampaignSync';
import type {
  IGmCampaignFundsTransactionEffect,
  IGmCampaignProjectedEffect,
} from '@/types/interventions';

import {
  campaignEventFromMessage,
  getActiveCampaignSyncTransport,
} from './campaignSyncTransport';

/** The answer when the campaign's co-op match has no active host transport. */
export const NO_LIVE_HOST = 'no live host connection';

/**
 * The ApplyGmIntervention intent for a GM ledger approval of `campaign`, or
 * null when the approval added no funds-transaction effect.
 *
 * `gmInterventionEvents` is the campaign's intervention list with the
 * approval's effects appended, so the approval's effects are the entries past
 * the length of `campaign.gmInterventionEvents`. The first funds-transaction
 * among them gives the summary (its public summary) and the delta (its
 * after-minus-before balance in cents, divided by 100). Every call mints a new
 * intervention id - the effect's canned id, the time in base 36 and six random
 * base-36 characters - and the intent id is derived from it, so two approvals
 * of one canned correction are two commands while a resend of one is not.
 */
export function gmFundsInterventionIntent(
  campaign: ICampaign,
  gmInterventionEvents: readonly IGmCampaignProjectedEffect[] | undefined,
): ICampaignApplyGmInterventionIntent | null {
  const effect = (gmInterventionEvents ?? [])
    .slice(campaign.gmInterventionEvents?.length ?? 0)
    .find(
      (candidate): candidate is IGmCampaignFundsTransactionEffect =>
        candidate.family === 'funds-transaction',
    );
  if (!effect) return null;
  const interventionId = `${effect.interventionId ?? 'gm-intervention'}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    kind: 'ApplyGmIntervention',
    campaignId: campaign.id,
    intentId: `gm-intervention-${interventionId}`,
    payload: {
      interventionId,
      summary: effect.publicSummary,
      deltaCBills:
        (effect.after.balanceCents - effect.before.balanceCents) / 100,
    },
  };
}

/**
 * Send `intent` on the active host-role transport of `campaign`'s co-op match
 * and resolve with the host's answer: null when a FundsChanged event of the
 * intent's campaign with the intent's delta and summary arrives (the event
 * carries no intent id), the reason (or, without one, the code) of the Error
 * frame carrying the intent's id, the message of a transport error or of a
 * send that threw, or NO_LIVE_HOST when no host-role transport is active.
 * There is no timeout: an unanswered intent leaves it pending, as the co-op
 * day advance's AdvanceDay does.
 */
export function sendCoopGmIntervention(
  campaign: ICampaign,
  intent: ICampaignApplyGmInterventionIntent,
): Promise<string | null> {
  const session = campaign.coopSession;
  const transport = getActiveCampaignSyncTransport(
    session?.matchId ?? session?.hostMatchId,
  );
  if (transport?.role !== 'host') return Promise.resolve(NO_LIVE_HOST);
  return new Promise((resolve) => {
    const stops: (() => void)[] = [];
    const answer = (refusal: string | null): void => {
      stops.forEach((stop) => stop());
      resolve(refusal);
    };
    stops.push(
      transport.onFrame((message) => {
        if (message.kind === 'Error' && message.intentId === intent.intentId) {
          answer(message.reason ?? message.code);
          return;
        }
        const event =
          message.kind === 'CampaignEvent'
            ? campaignEventFromMessage(message)
            : null;
        if (
          event?.type === 'FundsChanged' &&
          event.campaignId === intent.campaignId &&
          event.payload.delta === intent.payload.deltaCBills &&
          event.payload.reason === intent.payload.summary
        ) {
          answer(null);
        }
      }),
      transport.onError((error) =>
        answer(error instanceof Error ? error.message : 'campaign sync error'),
      ),
    );
    try {
      transport.sendHostIntent(intent);
    } catch (error) {
      answer(error instanceof Error ? error.message : 'co-op push failed');
    }
  });
}
