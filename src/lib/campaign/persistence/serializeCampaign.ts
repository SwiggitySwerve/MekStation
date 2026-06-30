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
import type { IDailyBattleAuditEntry } from '@/types/campaign/IDailyBattleAuditEntry';
import type { IFinances } from '@/types/campaign/IFinances';
import type { ILoan } from '@/types/campaign/Loan';
import type {
  SerializedAmortizedLoan,
  SerializedCampaignBody,
  SerializedFinances,
  SerializedTransaction,
} from '@/types/campaign/SerializedCampaign';
import type { Transaction } from '@/types/campaign/Transaction';

import { CampaignType } from '@/types/campaign/CampaignType';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';

import {
  rehydrateContractMarket,
  rehydrateMissionMap,
} from './missionSerialization';

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
    // W3.1 follow-on (T3): flatten the amortization-engine ledger
    // (Money → scalar, Date → ISO) so financialProcessor's loan state
    // survives the server round trip — the same treatment the store path
    // applies. Omitted when the campaign never used the loan system.
    loans: finances.loans?.map(
      (l): SerializedAmortizedLoan => ({
        id: l.id,
        principal: l.principal.amount,
        annualRate: l.annualRate,
        termMonths: l.termMonths,
        monthlyPayment: l.monthlyPayment.amount,
        remainingPrincipal: l.remainingPrincipal.amount,
        startDate: l.startDate.toISOString(),
        nextPaymentDate: l.nextPaymentDate.toISOString(),
        paymentsRemaining: l.paymentsRemaining,
        isDefaulted: l.isDefaulted,
      }),
    ),
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
    // W3.1 follow-on (T3): rehydrate the amortization ledger with live
    // Money / Date instances — financialProcessor.processLoanPayments does
    // Money math and Date comparisons on these. Absent on pre-fix
    // snapshots, in which case the finances simply carry no ledger.
    loans: finances.loans?.map(
      (l): ILoan => ({
        id: l.id,
        principal: new Money(l.principal),
        annualRate: l.annualRate,
        termMonths: l.termMonths,
        monthlyPayment: new Money(l.monthlyPayment),
        remainingPrincipal: new Money(l.remainingPrincipal),
        startDate: new Date(l.startDate),
        nextPaymentDate: new Date(l.nextPaymentDate),
        paymentsRemaining: l.paymentsRemaining,
        isDefaulted: l.isDefaulted,
      }),
    ),
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
  // Command-tier extension fields (loans / markets) live on the campaign
  // behind `ICampaignCommandExtensions` — widen once so the serializer
  // sees them (same convention as the store-path serializer in
  // stores/campaign/useCampaignStore.persistence.ts).
  const extended = campaign as ICampaignWithCommand;
  const dailyBattleAudit =
    (
      campaign as ICampaign & {
        dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
      }
    ).dailyBattleAudit ?? undefined;
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
    partsInventory: campaign.partsInventory,
    repairQueue: campaign.repairQueue,
    unitMaxStates: campaign.unitMaxStates,
    salvageAllocations: campaign.salvageAllocations,
    salvageReports: campaign.salvageReports,
    pendingBattleOutcomes: campaign.pendingBattleOutcomes,
    processedBattleIds: campaign.processedBattleIds,
    gmInterventionEvents: campaign.gmInterventionEvents,
    timeCascadeEvents: campaign.timeCascadeEvents,
    recentlyAppliedOutcomes: campaign.recentlyAppliedOutcomes,
    dailyBattleAudit,
    // The loan ledger (CP2b — `add-campaign-command-ui`, design D4) is
    // a campaign-extension field; every `ICampaignLoan` field is already
    // a JSON-safe scalar so it serializes directly. Omitted when absent.
    loans: extended.loans,
    // Audit D-10 (W3.4): the replayability seed travels with the body.
    rngSeed: campaign.rngSeed,
    // W3.1 follow-on (T3): mirror the remaining store-path fields into the
    // server body — combat teams, refit/prestige/morale/starmap state,
    // co-op identity, and the command-tier markets. All JSON-safe shapes;
    // all optional, so they vanish from the wire when absent.
    combatTeams: campaign.combatTeams,
    refitOrders: campaign.refitOrders,
    unitConfigurations: campaign.unitConfigurations,
    unitPrestige: campaign.unitPrestige,
    moraleState: campaign.moraleState,
    moraleTransitions: campaign.moraleTransitions,
    currentSystemId: campaign.currentSystemId,
    coopSession: campaign.coopSession,
    personnelMarket: extended.personnelMarket,
    contractMarket: extended.contractMarket,
    activeContract: extended.activeContract,
    unitMarket: extended.unitMarket,
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
    missions: rehydrateMissionMap(body.missions),
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
    partsInventory: body.partsInventory ?? [],
    repairQueue: body.repairQueue,
    unitMaxStates: body.unitMaxStates,
    salvageAllocations: body.salvageAllocations,
    salvageReports: body.salvageReports,
    pendingBattleOutcomes: body.pendingBattleOutcomes,
    processedBattleIds: body.processedBattleIds,
    gmInterventionEvents: body.gmInterventionEvents,
    timeCascadeEvents: body.timeCascadeEvents,
    recentlyAppliedOutcomes: body.recentlyAppliedOutcomes,
    dailyBattleAudit: body.dailyBattleAudit,
    // Restore the loan ledger (design D4). Absent on pre-CP2b snapshots,
    // in which case the campaign simply carries no `loans` field.
    ...(body.loans !== undefined ? { loans: body.loans } : {}),
    // Audit D-10 (W3.4): restore the replayability seed. Absent on
    // pre-fix snapshots — daily RNG falls back to an id-derived seed.
    ...(body.rngSeed !== undefined ? { rngSeed: body.rngSeed } : {}),
    // W3.1 follow-on (T3): restore the mirrored store-path fields. All
    // optional — absent on pre-fix snapshots, in which case the campaign
    // simply carries no such field (every consumer already defaults to an
    // empty projection), matching the store path's deserializeCampaign.
    combatTeams: body.combatTeams,
    refitOrders: body.refitOrders,
    unitConfigurations: body.unitConfigurations,
    unitPrestige: body.unitPrestige,
    moraleState: body.moraleState,
    moraleTransitions: body.moraleTransitions,
    currentSystemId: body.currentSystemId,
    coopSession: body.coopSession,
    personnelMarket: body.personnelMarket,
    contractMarket: rehydrateContractMarket(body.contractMarket),
    activeContract: body.activeContract,
    unitMarket: body.unitMarket,
  } as ICampaign;
}
