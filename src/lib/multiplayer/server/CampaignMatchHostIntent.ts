/**
 * Shared Campaign State — campaign intent validation (CO1).
 *
 * The pure validate-and-derive core of the `CampaignMatchHost`. Given a
 * structurally-valid `ICampaignIntent` and the host's current
 * authoritative campaign state, `validateCampaignIntent` either:
 *
 *   - rejects it (`ok: false`, `code: 'INVALID_CAMPAIGN_INTENT'`, a
 *     stable `reason`) — the campaign analogue of the combat intent
 *     error contract; OR
 *   - accepts it (`ok: true`) and derives the resulting
 *     `ICampaignEvent`(s) — minus their `sequence`, which the host
 *     stamps from the event log.
 *
 * This function is the campaign analogue of the combat engine's
 * intent-acceptance step. It is PURE — it never mutates the state, never
 * touches the log, never broadcasts. The host orchestrates the commit +
 * broadcast around it (design D4 steps 4-6). Keeping the validation
 * pure makes the spec scenario "an over-balance spend mutates nothing"
 * structurally true: a rejected intent simply never produces an event.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 * @spec openspec/changes/add-shared-campaign-state/design.md (D4, D8)
 */

import type {
  CampaignEventScope,
  CampaignHostCommand,
  CampaignIntentRejectionReason,
  CampaignIntentResult,
  ICampaignAuthoritativeState,
  ICampaignEventOf,
  CampaignEventType,
  ICampaignEventPayloadMap,
} from '@/types/campaign/CampaignSync';

import { hiredPilotId } from '@/lib/campaign/markets/offerLifecycle';
import {
  freezeCampaignEvent,
  resolveCampaignEventScope,
} from '@/lib/campaign/sync/campaignEventScope';
import {
  CONTRACT_MIN_STANDING,
  INVALID_CAMPAIGN_INTENT,
} from '@/types/campaign/CampaignSync';

/**
 * A campaign event before the host has assigned its `sequence`. The
 * host stamps `sequence` from the event log immediately before append.
 *
 * Built off `ICampaignEventOf` (the per-type variant) rather than
 * `ICampaignEvent` (the deferred-conditional union) so the `Omit`
 * resolves while `T` is still a generic parameter.
 */
export type UnsequencedCampaignEvent<
  T extends CampaignEventType = CampaignEventType,
> = T extends CampaignEventType ? Omit<ICampaignEventOf<T>, 'sequence'> : never;

/**
 * The accepted variant of an intent-validation result — carries the
 * derived, still-unsequenced events.
 */
interface IValidatedIntent {
  readonly ok: true;
  readonly events: readonly UnsequencedCampaignEvent[];
}

/** The full pre-commit validation result. */
export type CampaignIntentValidation =
  | IValidatedIntent
  | Extract<CampaignIntentResult, { ok: false }>;

/**
 * One personnel-market offer as the AUTHORITY holds it - the only place a
 * hire's recruit and price may come from (K14b). Every field is a fact the
 * authority read, already checked to be present and usable.
 */
export interface IAuthoritativePersonnelOffer {
  readonly offerId: string;
  /** The recruit's display name; becomes the hired pilot's name. */
  readonly name: string;
  /** Finite, non-negative C-bill cost; becomes the debit. */
  readonly hireCost: number;
  /** `YYYY-MM-DD` the offer is last valid on. */
  readonly expirationDate: string;
  /** The authority's campaign date the offer is judged against. */
  readonly campaignDate: string;
}

/**
 * Authoritative facts an intent may need beyond the ledger state.
 *
 * `ICampaignAuthoritativeState` carries no market, so a `HireOffer` cannot be
 * judged from it. Each authority supplies the reader for the market IT holds;
 * an authority that supplies none refuses every `HireOffer`
 * (`offer-source-unavailable`) rather than trusting the intent.
 */
/**
 * One contract-market offer as the AUTHORITY holds it - the only place an
 * acceptance's contract id, name and employer may come from (K14b).
 */
export interface IAuthoritativeContractOffer {
  readonly contractId: string;
  readonly name: string;
  /** The exact opaque `IContract.employerId`; drives the standing gate. */
  readonly employerFactionId: string;
  /** The offer is in the market's `declinedOfferIds`. */
  readonly declined: boolean;
  /** The contract's end date, when it has one. */
  readonly endDate?: string;
  /** The authority's campaign date; required to judge a dated offer. */
  readonly campaignDate?: string;
}

/**
 * A reader's answer: the offer, `null` when the market holds no usable offer
 * under that id, or `'source-unavailable'` when the authority cannot read a
 * market at all right now (no saved row, an unreadable one, a host whose
 * campaign is gone). The last is not the same fact as an absent offer.
 */
export type AuthoritativeOfferLookup<T> = T | null | 'source-unavailable';

export interface ICampaignIntentContext {
  readonly personnelOffer?: (
    offerId: string,
  ) => AuthoritativeOfferLookup<IAuthoritativePersonnelOffer>;
  readonly contractOffer?: (
    contractId: string,
  ) => AuthoritativeOfferLookup<IAuthoritativeContractOffer>;
}

/** Helper — build a typed rejection. */
function reject(
  reason: CampaignIntentRejectionReason,
): Extract<CampaignIntentResult, { ok: false }> {
  return { ok: false, code: INVALID_CAMPAIGN_INTENT, reason };
}

/**
 * Helper — build one unsequenced event of a given type. Scope defaults
 * from the per-type classification table and may be overridden when the
 * call site knows a tighter audience. The return is structurally exactly
 * `Omit<ICampaignEventOf<T>, 'sequence'>`, but TS cannot verify that
 * against the deferred distributive conditional while `T` is generic, so
 * the assertion makes the (sound) intent explicit at this single
 * chokepoint. The object is frozen so scope cannot be rewritten.
 */
function event<T extends CampaignEventType>(
  type: T,
  campaignId: string,
  authorPlayerId: string,
  ts: string,
  payload: ICampaignEventPayloadMap[T],
  scope?: CampaignEventScope,
): UnsequencedCampaignEvent<T> {
  const built: Omit<ICampaignEventOf<T>, 'sequence'> = {
    type,
    campaignId,
    authorPlayerId,
    ts,
    payload,
    scope: resolveCampaignEventScope(type, scope),
  };
  return freezeCampaignEvent(built) as UnsequencedCampaignEvent<T>;
}

/**
 * Validate one campaign intent against the host's authoritative state
 * and, on success, derive the resulting unsequenced event(s).
 *
 * Per design D4 step 3, this is where the balance / standing / salvage
 * checks live — and per the spec scenario "Stale-mirror intent is
 * validated against host state", the checks always run against the
 * `state` passed in (the host's CURRENT authoritative state), never
 * against any figure the guest may have included.
 *
 * @param intent      a structurally-valid intent (already zod-parsed), or
 *                    the host's ApplyGmIntervention, which commits one
 *                    FundsChanged of its signed delta with its summary as
 *                    the reason unless the balance would go below zero.
 * @param state       the host's current authoritative campaign state.
 * @param authorPlayerId the player whose intent this is (stamped on the
 *                    derived events).
 * @param ts          host wall-clock ISO timestamp for the events.
 * @param hostPlayerId verified GM identity. Required only for the audited
 *                    participant-removal command; omitted callers cannot
 *                    accidentally authorize it.
 * @param context     the authority's market reader. Required only for a
 *                    `HireOffer`; omitted callers refuse it.
 */
export function validateCampaignIntent(
  intent: CampaignHostCommand,
  state: ICampaignAuthoritativeState,
  authorPlayerId: string,
  ts: string,
  hostPlayerId?: string,
  context?: ICampaignIntentContext,
): CampaignIntentValidation {
  // The intent must target the campaign this host owns.
  if (intent.campaignId !== state.campaignId) {
    return reject('campaign-mismatch');
  }

  const mk = <T extends CampaignEventType>(
    type: T,
    payload: ICampaignEventPayloadMap[T],
    scope?: CampaignEventScope,
  ): UnsequencedCampaignEvent<T> =>
    event(type, state.campaignId, authorPlayerId, ts, payload, scope);

  switch (intent.kind) {
    case 'SpendFunds': {
      const { amount, reason } = intent.payload;
      // Ledger invariant: the balance never goes negative (design D1).
      if (amount > state.balance) {
        return reject('insufficient-funds');
      }
      const newBalance = state.balance - amount;
      return {
        ok: true,
        events: [
          mk('FundsChanged', {
            delta: -amount,
            reason,
            balance: newBalance,
          }),
        ],
      };
    }

    case 'HirePilot':
      // Retired (K14b): it names its own recruit and price, which is how a
      // co-op guest hired an invented pilot for an invented cost.
      return reject('hire-requires-market-offer');

    case 'HireOffer': {
      if (context?.personnelOffer === undefined) {
        return reject('offer-source-unavailable');
      }
      const offer = context.personnelOffer(intent.payload.offerId);
      if (offer === 'source-unavailable') {
        return reject('offer-source-unavailable');
      }
      if (offer === null || offer.offerId !== intent.payload.offerId) {
        return reject('offer-not-found');
      }
      const pilotId = hiredPilotId(offer.offerId);
      // The pilot id is derived from the offer, so a hired offer stays
      // spent in the ledger even when a stale save restores the offer.
      if (state.pilots[pilotId] !== undefined) {
        return reject('offer-consumed');
      }
      if (offer.expirationDate.slice(0, 10) < offer.campaignDate.slice(0, 10)) {
        return reject('offer-expired');
      }
      const cost = offer.hireCost;
      // MekHQ debits FIRST and enrols nobody when the debit fails
      // (ForceHumanResources.recruitPerson, e7adc2c).
      if (cost > state.balance) {
        return reject('insufficient-funds');
      }
      const pilot = { pilotId, name: offer.name };
      // A hire produces TWO events: the funds debit and the roster
      // change. Both go through the host's single append path so the
      // log stays totally ordered (design risk-mitigation "two events
      // interleave out of order").
      return {
        ok: true,
        events: [
          mk('FundsChanged', {
            delta: -cost,
            reason: `Hired pilot ${pilot.name}`,
            balance: state.balance - cost,
          }),
          mk('PilotHired', { pilot, cost }),
        ],
      };
    }

    case 'AcceptContract': {
      // K14b: the intent only NAMES the contract. Its id, name and employer
      // come from the authority's market; a caller-described contract is
      // how a co-op guest had an invented contract committed.
      if (context?.contractOffer === undefined) {
        return reject('offer-source-unavailable');
      }
      const contractId = intent.payload.contract.contractId;
      const offer = context.contractOffer(contractId);
      if (offer === 'source-unavailable') {
        return reject('offer-source-unavailable');
      }
      if (offer === null || offer.contractId !== contractId) {
        return reject('offer-not-found');
      }
      if (state.contracts[contractId] !== undefined) {
        return reject('offer-consumed');
      }
      // MekHQ removes a declined offer from the board (e7adc2c
      // ChaosContractMarketDialog.java:686-695): never signable.
      if (offer.declined) return reject('offer-declined');
      if (offer.endDate) {
        if (!offer.campaignDate) return reject('offer-source-unavailable');
        if (offer.endDate.slice(0, 10) < offer.campaignDate.slice(0, 10)) {
          return reject('offer-expired');
        }
      }
      // Faction-standing gate — the campaign analogue of the combat
      // "unit ownership" validation (design D4 step 3) - judged on the
      // employer the market stored.
      const standing = state.factionStanding[offer.employerFactionId] ?? 0;
      if (standing < CONTRACT_MIN_STANDING) {
        return reject('insufficient-standing');
      }
      const contract = {
        contractId,
        name: offer.name,
        employerFactionId: offer.employerFactionId,
      };
      return {
        ok: true,
        events: [mk('ContractAccepted', { contract })],
      };
    }

    case 'AllocateSalvage': {
      const { value, recoveredUnit } = intent.payload;
      // The allocation cannot draw more than the post-battle pool holds.
      if (value > state.salvagePool) {
        return reject('insufficient-salvage');
      }
      const poolRemaining = state.salvagePool - value;
      return {
        ok: true,
        events: [
          mk('SalvageAllocated', {
            value,
            poolRemaining,
            ...(recoveredUnit ? { recoveredUnit } : {}),
          }),
        ],
      };
    }

    case 'RemoveParticipant': {
      if (authorPlayerId !== hostPlayerId) return reject('host-only');
      const { participantId, reason } = intent.payload;
      return {
        ok: true,
        events: [
          mk('ParticipantRemoved', {
            participantId,
            ...(reason === undefined ? {} : { reason }),
          }),
        ],
      };
    }

    case 'ApplyGmIntervention': {
      const { summary, deltaCBills } = intent.payload;
      const newBalance = state.balance + deltaCBills;
      // Ledger invariant: a GM debit never takes the balance below zero.
      if (newBalance < 0) {
        return reject('insufficient-funds');
      }
      // The public summary is the reason every viewer's feed prints; the
      // intervention's private metadata never enters the intent.
      return {
        ok: true,
        events: [
          mk('FundsChanged', {
            delta: deltaCBills,
            reason: summary,
            balance: newBalance,
          }),
        ],
      };
    }

    case 'AdvanceDay': {
      const days = intent.payload.days ?? 1;
      return {
        ok: true,
        events: [mk('CampaignDayAdvanced', { newDay: state.day + days })],
      };
    }

    default: {
      // Exhaustiveness guard — a new intent kind without a validation
      // arm trips this at compile time.
      const exhaustive: never = intent;
      void exhaustive;
      return reject('malformed-intent');
    }
  }
}
