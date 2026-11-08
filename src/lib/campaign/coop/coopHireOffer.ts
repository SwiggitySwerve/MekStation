/**
 * A co-op host's Hire, committed by the live campaign host (K14b).
 *
 * The host's Hire button no longer writes the local store: it sends
 * `HireOffer { offerId }` on the host's active campaign-sync transport. The
 * campaign host prices the hire from the market it holds and commits
 * `FundsChanged` then `PilotHired`, which every viewer folds like any other
 * event - so the hire reaches the host's own page through the ledger, not
 * through a local write that could disagree with it.
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignIntent } from '@/types/campaign/CampaignSync';

import { hiredPilotId } from '@/lib/campaign/markets/offerLifecycle';

import {
  campaignEventFromMessage,
  getActiveCampaignSyncTransport,
} from './campaignSyncTransport';
import { NO_LIVE_HOST } from './coopGmIntervention';

/** The intent a host's Hire of `offerId` sends: the offer id, nothing else. */
export function hireOfferIntent(
  campaign: Pick<ICampaign, 'id'>,
  offerId: string,
): Extract<ICampaignIntent, { kind: 'HireOffer' }> {
  return {
    kind: 'HireOffer',
    campaignId: campaign.id,
    // One id per press, as the GM ledger's corrections are. A second hire of
    // the same offer is refused by the authority (`offer-consumed`), so the
    // id need not dedupe it - and a per-offer id would let a retried press
    // replay a committed hire whose event is never broadcast again.
    intentId: `coop-hire-${offerId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    payload: { offerId },
  };
}

/**
 * Send a Hire of `offerId` to `campaign`'s live co-op host and resolve with
 * the host's answer: null once a PilotHired of the offer's deterministic pilot
 * arrives, the reason (or code) of the Error frame carrying the intent's id,
 * the message of a transport error or a send that threw, or NO_LIVE_HOST when
 * no host-role transport is active. There is no timeout, as with the GM
 * ledger's correction: an unanswered hire stays pending.
 */
export function sendCoopHireOffer(
  campaign: ICampaign,
  offerId: string,
): Promise<string | null> {
  const session = campaign.coopSession;
  const transport = getActiveCampaignSyncTransport(
    session?.matchId ?? session?.hostMatchId,
  );
  if (transport?.role !== 'host') return Promise.resolve(NO_LIVE_HOST);
  const intent = hireOfferIntent(campaign, offerId);
  const pilotId = hiredPilotId(offerId);
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
          event?.type === 'PilotHired' &&
          event.campaignId === campaign.id &&
          event.payload.pilot.pilotId === pilotId
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

/** The sentence a refused co-op hire shows, for every reason the host sends. */
const HIRE_REFUSAL_SENTENCES: Readonly<Record<string, string>> = {
  [NO_LIVE_HOST]:
    'The co-op host connection is unavailable. Reconnect and try again.',
  'insufficient-funds': 'The campaign cannot afford this hire.',
  'offer-not-found': "This recruit is no longer on the host's market.",
  'offer-consumed': 'This recruit has already been hired.',
  'offer-expired': 'This offer has expired.',
  'offer-source-unavailable':
    "The campaign host can't read its market right now. Try again shortly.",
};

export function coopHireRefusalMessage(refusal: string): string {
  return (
    HIRE_REFUSAL_SENTENCES[refusal] ??
    `The co-op host did not hire this recruit: ${refusal}.`
  );
}
