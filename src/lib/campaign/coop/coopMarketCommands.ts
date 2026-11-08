/**
 * A co-op host's market commands, committed by the live campaign host (K14b).
 *
 * The host's Hire and Accept buttons no longer write the local store: they
 * send `HireOffer` / `AcceptContract` on the host's active campaign-sync
 * transport. The campaign host judges each against the market it holds
 * (PR3) and commits `FundsChanged` + `PilotHired` or `ContractAccepted`,
 * which every viewer folds like any other event - so the result reaches the
 * host's own page through the ledger, not through a local write that could
 * disagree with it.
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignEvent,
  ICampaignIntent,
} from '@/types/campaign/CampaignSync';
import type { IContract } from '@/types/campaign/Mission';

import { hiredPilotId } from '@/lib/campaign/markets/offerLifecycle';

import {
  campaignEventFromMessage,
  getActiveCampaignSyncTransport,
} from './campaignSyncTransport';
import { NO_LIVE_HOST } from './coopGmIntervention';

/**
 * One id per press, as the GM ledger's corrections are. A second hire or
 * acceptance of the same offer is refused by the authority
 * (`offer-consumed`), so the id need not dedupe it - and a per-offer id would
 * let a retried press replay a committed command whose event is never
 * broadcast again.
 */
function pressIntentId(prefix: string, offerId: string): string {
  return `${prefix}-${offerId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** The intent a host's Hire of `offerId` sends: the offer id, nothing else. */
export function hireOfferIntent(
  campaign: Pick<ICampaign, 'id'>,
  offerId: string,
): Extract<ICampaignIntent, { kind: 'HireOffer' }> {
  return {
    kind: 'HireOffer',
    campaignId: campaign.id,
    intentId: pressIntentId('coop-hire', offerId),
    payload: { offerId },
  };
}

/**
 * The intent a host's Accept of `offer` sends. The intent schema still
 * carries the compact contract, so it names the listed offer as listed; the
 * authority uses only `contractId` and takes the name and employer from the
 * market it holds (K14b PR3), never from this payload.
 */
export function acceptContractIntent(
  campaign: Pick<ICampaign, 'id'>,
  offer: Pick<IContract, 'id' | 'name' | 'employerId'>,
): Extract<ICampaignIntent, { kind: 'AcceptContract' }> {
  return {
    kind: 'AcceptContract',
    campaignId: campaign.id,
    intentId: pressIntentId('coop-accept', offer.id),
    payload: {
      contract: {
        contractId: offer.id,
        name: offer.name,
        employerFactionId: offer.employerId,
      },
    },
  };
}

/**
 * Send `intent` to `campaign`'s live co-op host and resolve with the host's
 * answer: null once an event `settles` accepts arrives, the reason (or code)
 * of the Error frame carrying the intent's id, the message of a transport
 * error or a send that threw, or NO_LIVE_HOST when no host-role transport is
 * active. There is no timeout, as with the GM ledger's correction: an
 * unanswered command stays pending.
 */
function sendCoopMarketIntent(
  campaign: ICampaign,
  intent: ICampaignIntent,
  settles: (event: ICampaignEvent) => boolean,
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
        if (event?.campaignId === campaign.id && settles(event)) answer(null);
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

/** A Hire of `offerId`; settles on the PilotHired of its deterministic pilot. */
export function sendCoopHireOffer(
  campaign: ICampaign,
  offerId: string,
): Promise<string | null> {
  const pilotId = hiredPilotId(offerId);
  return sendCoopMarketIntent(
    campaign,
    hireOfferIntent(campaign, offerId),
    (event) =>
      event.type === 'PilotHired' && event.payload.pilot.pilotId === pilotId,
  );
}

/** An Accept of `offer`; settles on the ContractAccepted of that contract. */
export function sendCoopAcceptContract(
  campaign: ICampaign,
  offer: Pick<IContract, 'id' | 'name' | 'employerId'>,
): Promise<string | null> {
  return sendCoopMarketIntent(
    campaign,
    acceptContractIntent(campaign, offer),
    (event) =>
      event.type === 'ContractAccepted' &&
      event.payload.contract.contractId === offer.id,
  );
}

/** Sentences for the refusals both commands can meet. */
const SHARED_REFUSAL_SENTENCES: Readonly<Record<string, string>> = {
  [NO_LIVE_HOST]:
    'The co-op host connection is unavailable. Reconnect and try again.',
  'offer-source-unavailable':
    "The campaign host can't read its market right now. Try again shortly.",
};

const HIRE_REFUSAL_SENTENCES: Readonly<Record<string, string>> = {
  ...SHARED_REFUSAL_SENTENCES,
  'insufficient-funds': 'The campaign cannot afford this hire.',
  'offer-not-found': "This recruit is no longer on the host's market.",
  'offer-consumed': 'This recruit has already been hired.',
  'offer-expired': 'This offer has expired.',
};

const ACCEPT_REFUSAL_SENTENCES: Readonly<Record<string, string>> = {
  ...SHARED_REFUSAL_SENTENCES,
  'insufficient-standing':
    "The campaign's standing with this employer is too low to accept.",
  'offer-not-found': "This contract is no longer on the host's market.",
  'offer-consumed': 'This contract has already been accepted.',
  'offer-declined': 'This contract was declined and cannot be accepted.',
  'offer-expired': 'This contract has already ended.',
};

/** The sentence a refused co-op hire shows. */
export function coopHireRefusalMessage(refusal: string): string {
  return (
    HIRE_REFUSAL_SENTENCES[refusal] ??
    `The co-op host did not hire this recruit: ${refusal}.`
  );
}

/** The sentence a refused co-op acceptance shows. */
export function coopAcceptRefusalMessage(refusal: string): string {
  return (
    ACCEPT_REFUSAL_SENTENCES[refusal] ??
    `The co-op host did not accept this contract: ${refusal}.`
  );
}
