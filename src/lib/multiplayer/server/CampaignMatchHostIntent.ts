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
  CampaignIntentRejectionReason,
  CampaignIntentResult,
  ICampaignAuthoritativeState,
  ICampaignEventOf,
  ICampaignIntent,
  CampaignEventType,
  ICampaignEventPayloadMap,
} from '@/types/campaign/CampaignSync';

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

/** Helper — build a typed rejection. */
function reject(
  reason: CampaignIntentRejectionReason,
): Extract<CampaignIntentResult, { ok: false }> {
  return { ok: false, code: INVALID_CAMPAIGN_INTENT, reason };
}

/**
 * Helper — build one unsequenced event of a given type. The return is
 * structurally exactly `Omit<ICampaignEventOf<T>, 'sequence'>`, but TS
 * cannot verify that against the deferred distributive conditional
 * while `T` is generic, so the assertion makes the (sound) intent
 * explicit at this single chokepoint.
 */
function event<T extends CampaignEventType>(
  type: T,
  campaignId: string,
  authorPlayerId: string,
  ts: string,
  payload: ICampaignEventPayloadMap[T],
): UnsequencedCampaignEvent<T> {
  const built: Omit<ICampaignEventOf<T>, 'sequence'> = {
    type,
    campaignId,
    authorPlayerId,
    ts,
    payload,
  };
  return built as UnsequencedCampaignEvent<T>;
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
 * @param intent      a structurally-valid intent (already zod-parsed).
 * @param state       the host's current authoritative campaign state.
 * @param authorPlayerId the player whose intent this is (stamped on the
 *                    derived events).
 * @param ts          host wall-clock ISO timestamp for the events.
 */
export function validateCampaignIntent(
  intent: ICampaignIntent,
  state: ICampaignAuthoritativeState,
  authorPlayerId: string,
  ts: string,
): CampaignIntentValidation {
  // The intent must target the campaign this host owns.
  if (intent.campaignId !== state.campaignId) {
    return reject('campaign-mismatch');
  }

  const mk = <T extends CampaignEventType>(
    type: T,
    payload: ICampaignEventPayloadMap[T],
  ): UnsequencedCampaignEvent<T> =>
    event(type, state.campaignId, authorPlayerId, ts, payload);

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

    case 'HirePilot': {
      const { pilot, cost } = intent.payload;
      // Hiring spends C-bills — the same balance invariant applies.
      if (cost > state.balance) {
        return reject('insufficient-funds');
      }
      const newBalance = state.balance - cost;
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
            balance: newBalance,
          }),
          mk('PilotHired', { pilot, cost }),
        ],
      };
    }

    case 'AcceptContract': {
      const { contract } = intent.payload;
      // Faction-standing gate — the campaign analogue of the combat
      // "unit ownership" validation (design D4 step 3).
      const standing = state.factionStanding[contract.employerFactionId] ?? 0;
      if (standing < CONTRACT_MIN_STANDING) {
        return reject('insufficient-standing');
      }
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
