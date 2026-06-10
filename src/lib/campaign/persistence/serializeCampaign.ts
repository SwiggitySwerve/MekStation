/**
 * Campaign serialization
 *
 * Pure, total `serializeCampaign` / `deserializeCampaignBody` functions.
 * Per design D3 they share the `campaignFieldMap` constants so the two
 * directions cannot drift, and a round-trip
 * (`deserializeCampaignBody(serializeCampaign(c))`) reproduces the
 * original campaign — `Map`s restored as `Map`s, `Date`s restored as
 * `Date`s, `Money` restored as `Money`.
 *
 * @spec openspec/changes/add-campaign-persistence/specs/campaign-persistence/spec.md
 * @spec openspec/changes/add-campaign-persistence/design.md (D2, D3)
 */

import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICampaignWithCommand } from '@/types/campaign/CampaignCommandExtensions';
import type { IFinances } from '@/types/campaign/IFinances';
import type {
  SerializedCampaignBody,
  SerializedFinances,
  SerializedTransaction,
} from '@/types/campaign/SerializedCampaign';
import type { Transaction } from '@/types/campaign/Transaction';

import { CampaignType } from '@/types/campaign/CampaignType';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

// =============================================================================
// Finances (nested Money + Date)
// =============================================================================

/**
 * Flatten `IFinances` into a JSON-safe shape — `Money` instances become
 * C-bill scalars and transaction `Date`s become ISO strings.
 */
function serializeFinances(finances: IFinances): SerializedFinances {
  return {
    transactions: finances.transactions.map(
      (t): SerializedTransaction => ({
        id: t.id,
        type: t.type,
        amount: t.amount.amount,
        date: t.date.toISOString(),
        description: t.description,
      }),
    ),
    balance: finances.balance.amount,
  };
}

/**
 * Rebuild `IFinances` from its JSON-safe form — C-bill scalars become
 * `Money` instances and ISO strings become `Date`s.
 */
function deserializeFinances(finances: SerializedFinances): IFinances {
  return {
    transactions: finances.transactions.map(
      (t): Transaction => ({
        id: t.id,
        type: t.type as TransactionType,
        amount: new Money(t.amount),
        date: new Date(t.date),
        description: t.description,
      }),
    ),
    balance: new Money(finances.balance),
  };
}

// =============================================================================
// Campaign body
// =============================================================================

/**
 * Serialize a live `ICampaign` into a JSON-safe `SerializedCampaignBody`:
 * `Map` fields become arrays of `[key, value]` pairs, `Date` fields
 * become ISO strings, and the `finances` sub-tree is flattened.
 *
 * Pure and total — never throws, never mutates the input.
 */
export function serializeCampaign(campaign: ICampaign): SerializedCampaignBody {
  return {
    id: campaign.id,
    name: campaign.name,
    // CAMPAIGN_DATE_FIELDS: currentDate
    currentDate: campaign.currentDate.toISOString(),
    factionId: campaign.factionId,
    // CAMPAIGN_MAP_FIELDS: forces
    forces: Array.from(campaign.forces.entries()),
    rootForceId: campaign.rootForceId,
    // CAMPAIGN_MAP_FIELDS: missions
    missions: Array.from(campaign.missions.entries()),
    finances: serializeFinances(campaign.finances),
    factionStandings: campaign.factionStandings,
    shoppingList: campaign.shoppingList,
    options: campaign.options,
    campaignType: campaign.campaignType,
    activePreset: campaign.activePreset,
    // CAMPAIGN_DATE_FIELDS: campaignStartDate (optional)
    campaignStartDate: campaign.campaignStartDate
      ? campaign.campaignStartDate.toISOString()
      : undefined,
    description: campaign.description,
    iconUrl: campaign.iconUrl,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    unitCombatStates: campaign.unitCombatStates,
    // The loan ledger (CP2b — `add-campaign-command-ui`, design D4) is
    // a campaign-extension field; every `ICampaignLoan` field is already
    // a JSON-safe scalar so it serializes directly. Omitted when absent.
    loans: (campaign as ICampaignWithCommand).loans,
    // Audit D-10 (W3.4): the replayability seed travels with the body.
    rngSeed: campaign.rngSeed,
  };
}

/**
 * Rebuild a live `ICampaign` from a `SerializedCampaignBody`: arrays of
 * pairs become `Map`s, ISO strings become `Date`s, and `finances` is
 * rehydrated with `Money` instances.
 *
 * Pure and total — the inverse of `serializeCampaign`.
 */
export function deserializeCampaignBody(
  body: SerializedCampaignBody,
): ICampaign {
  return {
    id: body.id,
    name: body.name,
    currentDate: new Date(body.currentDate),
    factionId: body.factionId,
    forces: new Map(body.forces),
    rootForceId: body.rootForceId,
    missions: new Map(body.missions),
    finances: deserializeFinances(body.finances),
    factionStandings: body.factionStandings,
    shoppingList: body.shoppingList,
    options: body.options,
    campaignType: body.campaignType as CampaignType,
    activePreset: body.activePreset,
    campaignStartDate: body.campaignStartDate
      ? new Date(body.campaignStartDate)
      : undefined,
    description: body.description,
    iconUrl: body.iconUrl,
    createdAt: body.createdAt,
    updatedAt: body.updatedAt,
    unitCombatStates: body.unitCombatStates,
    // Restore the loan ledger (design D4). Absent on pre-CP2b snapshots,
    // in which case the campaign simply carries no `loans` field.
    ...(body.loans !== undefined ? { loans: body.loans } : {}),
    // Audit D-10 (W3.4): restore the replayability seed. Absent on
    // pre-fix snapshots — daily RNG falls back to an id-derived seed.
    ...(body.rngSeed !== undefined ? { rngSeed: body.rngSeed } : {}),
  } as ICampaign;
}
