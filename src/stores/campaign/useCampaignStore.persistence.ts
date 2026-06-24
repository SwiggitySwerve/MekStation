import type { IShoppingList } from '@/types/campaign/acquisition/acquisitionTypes';
import type {
  ICampaign,
  ICampaignOptions,
  IMission,
} from '@/types/campaign/Campaign';
import type {
  ICampaignCommandExtensions,
  ICampaignContractMarket,
} from '@/types/campaign/CampaignCommandExtensions';
import type { ICampaignLoan } from '@/types/campaign/CampaignLoan';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICoopSession } from '@/types/campaign/CoopSession';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';
import type { IForce } from '@/types/campaign/Force';
import type { IDailyBattleAuditEntry } from '@/types/campaign/IDailyBattleAuditEntry';
import type { ILoan } from '@/types/campaign/Loan';
import type {
  IPersonnelMarketOffer,
  IUnitMarketOffer,
} from '@/types/campaign/markets/marketTypes';
import type { IPartsInventoryItem } from '@/types/campaign/PartsInventory';
import type {
  IMoraleTransition,
  IUnitPrestige,
  MoraleState,
} from '@/types/campaign/Prestige';
import type { IRefitOrder } from '@/types/campaign/Refit';
import type { IRepairTicket } from '@/types/campaign/RepairTicket';
import type {
  ISalvageAllocation,
  ISalvageReport,
} from '@/types/campaign/Salvage';
import type { ICombatTeam } from '@/types/campaign/scenario/scenarioTypes';
import type { Transaction } from '@/types/campaign/Transaction';
import type {
  IUnitCombatState,
  IUnitMaxState,
} from '@/types/campaign/UnitCombatState';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';
import type { IGmCampaignProjectedEffect } from '@/types/interventions';
import type { MechBuildConfig } from '@/utils/construction/constructionRules/types';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignType } from '@/types/campaign/CampaignType';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';
import { emitPendingOutcomeAdded } from '@/utils/events/campaignOutcomeEvents';

import { useCampaignRosterStore } from './useCampaignRosterStore';

/**
 * JSON-safe form of the amortization-engine `ILoan` (`IFinances.loans`).
 * The live record carries `Money` instances and `Date`s; both are
 * flattened here (Money → C-bill scalar, Date → ISO string) so the
 * ledger survives `JSON.stringify`/`JSON.parse` without custom revivers —
 * the same convention `finances.transactions` already follows.
 */
export interface SerializedAmortizedLoan {
  id: string;
  principal: number;
  annualRate: number;
  termMonths: number;
  monthlyPayment: number;
  remainingPrincipal: number;
  startDate: string; // ISO 8601 string
  nextPaymentDate: string; // ISO 8601 string
  paymentsRemaining: number;
  isDefaulted: boolean;
}

export interface SerializedCampaignState {
  id: string;
  name: string;
  currentDate: string; // ISO 8601 string
  factionId: string;
  rootForceId: string;
  finances: {
    transactions: Array<{
      id: string;
      type: string;
      amount: number;
      date: string;
      description: string;
    }>;
    balance: number;
    /**
     * Amortization-engine loan ledger (`IFinances.loans`), flattened to
     * JSON-safe scalars (D-1 fix, 2026-06-09 audit). Absent on pre-fix
     * snapshots and on campaigns that never used the loan system.
     */
    loans?: SerializedAmortizedLoan[];
  };
  factionStandings: Record<string, IFactionStanding>;
  shoppingList?: IShoppingList;
  options: ICampaignOptions;
  campaignType: string;
  /** Creation preset id. Absent on pre-fix snapshots (D-1 sweep). */
  activePreset?: string;
  campaignStartDate: string;
  description?: string;
  iconUrl?: string;
  pendingBattleOutcomes: ICombatOutcome[];
  processedBattleIds: string[];
  reviewedBattleIds: Record<string, number>;
  dailyBattleAudit: IDailyBattleAuditEntry[];
  /**
   * Canonical per-unit post-deploy combat state (unit battle damage).
   * Before the D-1 fix (2026-06-09 audit) this was silently dropped on
   * save and hard-reset to `{}` on load — every reload wiped battle
   * damage. Optional so pre-fix snapshots still load (defaults to `{}`).
   */
  unitCombatStates?: Readonly<Record<string, IUnitCombatState>>;
  partsInventory?: readonly IPartsInventoryItem[];
  repairQueue?: readonly IRepairTicket[];
  unitMaxStates?: Readonly<Record<string, IUnitMaxState>>;
  salvageAllocations?: Readonly<Record<string, ISalvageAllocation>>;
  salvageReports?: Readonly<Record<string, ISalvageReport>>;
  gmInterventionEvents?: readonly IGmCampaignProjectedEffect[];
  recentlyAppliedOutcomes?: readonly ICombatOutcome[];
  /**
   * Campaign command-tier loan ledger (`ICampaignCommandExtensions.loans`,
   * CP2b design D4). Before the D-1 fix a reload kept the borrowed cash
   * (persisted as a finances transaction) but erased the debt. Every
   * `ICampaignLoan` field is already a JSON-safe scalar.
   */
  loans?: readonly ICampaignLoan[];
  /** Personnel-market hiring offers (CP2b design D2; D-1 sweep). */
  personnelMarket?: readonly IPersonnelMarketOffer[];
  /** Contract-market offers + declined ids (CP2b design D5; D-1 sweep). */
  contractMarket?: ICampaignContractMarket;
  /** Unit-market offers stored by unitMarketProcessor (audit D-7, W3.4). */
  unitMarket?: readonly IUnitMarketOffer[];
  /**
   * Campaign RNG seed for replayable daily rolls (audit D-10, W3.4).
   * Absent on pre-fix snapshots — consumers fall back to an id-derived
   * seed via `resolveCampaignSeed`.
   */
  rngSeed?: number;
  /** Combat teams for AtB scenario generation (D-1 sweep). */
  combatTeams?: readonly ICombatTeam[];
  /** Refit orders (`add-campaign-refit-and-prestige` D2; D-1 sweep). */
  refitOrders?: readonly IRefitOrder[];
  /** Per-unit campaign loadouts written by completed refits (D5; D-1 sweep). */
  unitConfigurations?: Readonly<Record<string, MechBuildConfig>>;
  /** Per-unit prestige scores (D7; D-1 sweep). */
  unitPrestige?: readonly IUnitPrestige[];
  /** Company morale state (D8; D-1 sweep). */
  moraleState?: MoraleState;
  /** Company morale transition history (D9; D-1 sweep). */
  moraleTransitions?: readonly IMoraleTransition[];
  /** Starmap "you are here" pin (`wire-starmap-into-campaign`; D-1 sweep). */
  currentSystemId?: string;
  /**
   * Co-op session metadata round-trip (`wire-coop-campaign-route`, Wave 6.1).
   * Absent on single-player campaigns; present on host or guest mirror
   * campaigns so a reload preserves the co-op surfaces.
   */
  coopSession?: ICoopSession;
  createdAt: string;
  updatedAt: string;
}
export function withBattleQueueAttached(
  campaign: ICampaign,
  pending: readonly ICombatOutcome[],
  processed: readonly string[],
): ICampaign {
  return {
    ...campaign,
    pendingBattleOutcomes: pending,
    processedBattleIds: processed,
  } as ICampaign & {
    readonly pendingBattleOutcomes: readonly ICombatOutcome[];
    readonly processedBattleIds: readonly string[];
  };
}
export function snapshotRosterPilots(): readonly ICampaignRosterEntry[] {
  return [...useCampaignRosterStore.getState().pilots];
}
export function serializeCampaign(
  campaign: ICampaign,
  pendingBattleOutcomes: readonly ICombatOutcome[] = [],
  processedBattleIds: readonly string[] = [],
  reviewedBattleIds: Record<string, number> = {},
): SerializedCampaignState {
  const audit =
    (
      campaign as ICampaign & {
        dailyBattleAudit?: readonly IDailyBattleAuditEntry[];
      }
    ).dailyBattleAudit ?? [];
  const startDate = campaign.campaignStartDate ?? campaign.currentDate;
  // Command-tier extension fields (loans / personnelMarket / contractMarket)
  // live on the campaign behind `ICampaignCommandExtensions` — widen once
  // so the serializer sees them (same convention as the server-side
  // serializer in lib/campaign/persistence/serializeCampaign.ts).
  const extended = campaign as ICampaign & ICampaignCommandExtensions;
  return {
    id: campaign.id,
    name: campaign.name,
    currentDate: campaign.currentDate.toISOString(),
    factionId: campaign.factionId,
    rootForceId: campaign.rootForceId,
    finances: {
      transactions: campaign.finances.transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount.amount,
        date: t.date.toISOString(),
        description: t.description,
      })),
      balance: campaign.finances.balance.amount,
      // D-1 fix: flatten the amortization-engine ledger (Money → scalar,
      // Date → ISO) so financialProcessor's loan state survives reload.
      // Omitted entirely when the campaign never used the loan system.
      loans: campaign.finances.loans?.map(
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
    },
    factionStandings: campaign.factionStandings,
    shoppingList: campaign.shoppingList,
    options: campaign.options,
    campaignType: campaign.campaignType,
    activePreset: campaign.activePreset,
    campaignStartDate: startDate.toISOString(),
    description: campaign.description,
    iconUrl: campaign.iconUrl,
    pendingBattleOutcomes: [...pendingBattleOutcomes],
    processedBattleIds: [...processedBattleIds],
    reviewedBattleIds: { ...reviewedBattleIds },
    dailyBattleAudit: [...audit],
    // D-1 fix (2026-06-09 audit): unit battle damage is canonical state —
    // dropping it here was the audit's headline data-loss finding. The map
    // is already JSON-safe (scalars, strings, plain records).
    unitCombatStates: campaign.unitCombatStates,
    partsInventory: campaign.partsInventory,
    repairQueue: campaign.repairQueue,
    unitMaxStates: campaign.unitMaxStates,
    salvageAllocations: campaign.salvageAllocations,
    salvageReports: campaign.salvageReports,
    gmInterventionEvents: campaign.gmInterventionEvents,
    recentlyAppliedOutcomes: campaign.recentlyAppliedOutcomes,
    // D-1 fix: the command-tier loan ledger. The borrowed cash is already
    // persisted as a finances transaction; the debt must travel with it.
    loans: extended.loans,
    // D-1 sweep: remaining command/refit/prestige/starmap state that the
    // pre-fix serializer silently dropped. All JSON-safe shapes.
    personnelMarket: extended.personnelMarket,
    contractMarket: extended.contractMarket,
    unitMarket: extended.unitMarket,
    combatTeams: campaign.combatTeams,
    refitOrders: campaign.refitOrders,
    unitConfigurations: campaign.unitConfigurations,
    unitPrestige: campaign.unitPrestige,
    moraleState: campaign.moraleState,
    moraleTransitions: campaign.moraleTransitions,
    currentSystemId: campaign.currentSystemId,
    // Audit D-10 (W3.4): the replayability seed travels with the campaign.
    rngSeed: campaign.rngSeed,
    // Per `wire-coop-campaign-route` Wave 6.1: the coopSession bit is
    // per-campaign identity (host vs guest vs single-player). Persisting it
    // here means a reload of a host or guest campaign still mounts the
    // host-review surface / guest-proposal overlays / coop nav badge.
    // Absent (undefined) means single-player — no surfaces render.
    coopSession: campaign.coopSession,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}
export function deserializeCampaign(
  serialized: SerializedCampaignState,
  forces: Map<string, IForce>,
  missions: Map<string, IMission>,
): ICampaign {
  return {
    id: serialized.id,
    name: serialized.name,
    currentDate: new Date(serialized.currentDate),
    factionId: serialized.factionId,
    forces,
    rootForceId: serialized.rootForceId,
    missions,
    finances: {
      transactions: serialized.finances.transactions.map(
        (t): Transaction => ({
          id: t.id,
          type: t.type as TransactionType,
          amount: new Money(t.amount),
          date: new Date(t.date),
          description: t.description,
        }),
      ),
      balance: new Money(serialized.finances.balance),
      // D-1 fix: rehydrate the amortization ledger with live Money / Date
      // instances — financialProcessor.processLoanPayments does Money math
      // and Date comparisons on these. Absent on pre-fix snapshots.
      loans: serialized.finances.loans?.map(
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
    },
    factionStandings: serialized.factionStandings,
    shoppingList: serialized.shoppingList,
    options: serialized.options,
    campaignType: serialized.campaignType as CampaignType,
    activePreset: serialized.activePreset,
    campaignStartDate: new Date(serialized.campaignStartDate),
    description: serialized.description,
    iconUrl: serialized.iconUrl,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
    // D-1 fix (2026-06-09 audit): rehydrate unit battle damage instead of
    // hard-resetting it. Pre-fix snapshots lack the field — default to the
    // fresh-campaign empty map, which is the old (lossy) behavior for
    // saves that never carried the state in the first place.
    unitCombatStates: serialized.unitCombatStates ?? {},
    partsInventory: serialized.partsInventory ?? [],
    repairQueue: serialized.repairQueue,
    unitMaxStates: serialized.unitMaxStates,
    salvageAllocations: serialized.salvageAllocations,
    salvageReports: serialized.salvageReports,
    gmInterventionEvents: serialized.gmInterventionEvents,
    recentlyAppliedOutcomes: serialized.recentlyAppliedOutcomes,
    // D-1 fix + sweep: command-tier ledger/markets and the
    // refit/prestige/morale/starmap fields. All optional — absent on
    // pre-fix snapshots, in which case the campaign simply carries no
    // such field (every consumer already defaults to an empty projection).
    loans: serialized.loans,
    personnelMarket: serialized.personnelMarket,
    contractMarket: serialized.contractMarket,
    unitMarket: serialized.unitMarket,
    combatTeams: serialized.combatTeams,
    refitOrders: serialized.refitOrders,
    unitConfigurations: serialized.unitConfigurations,
    unitPrestige: serialized.unitPrestige,
    moraleState: serialized.moraleState,
    moraleTransitions: serialized.moraleTransitions,
    currentSystemId: serialized.currentSystemId,
    // Audit D-10 (W3.4): rehydrate the replayability seed. Absent on
    // pre-fix snapshots — daily RNG falls back to an id-derived seed.
    rngSeed: serialized.rngSeed,
    dailyBattleAudit: serialized.dailyBattleAudit,
    // Per `wire-coop-campaign-route` Wave 6.1: the coopSession field
    // survives reload so every co-op surface remounts on the same campaign.
    coopSession: serialized.coopSession,
  } as ICampaign;
}
export function persistCampaignRecord(
  campaign: ICampaign,
  pendingBattleOutcomes: readonly ICombatOutcome[],
  processedBattleIds: readonly string[],
  reviewedBattleIds: Record<string, number>,
): void {
  const serialized = serializeCampaign(
    campaign,
    pendingBattleOutcomes,
    processedBattleIds,
    reviewedBattleIds,
  );
  clientSafeStorage.setItem(
    `campaign-${campaign.id}`,
    JSON.stringify({ state: serialized }),
  );
}
export function emitPendingOutcomeAddedEvent(
  campaign: ICampaign | null,
  outcome: ICombatOutcome,
  queueLength: number,
): void {
  if (!campaign) return;
  try {
    emitPendingOutcomeAdded({
      campaignId: campaign.id,
      matchId: outcome.matchId,
      contractId: outcome.contractId,
      scenarioId: outcome.scenarioId,
      queueLength,
    });
  } catch {
    return;
  }
}
