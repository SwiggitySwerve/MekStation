import type { IShoppingList } from '@/types/campaign/acquisition/acquisitionTypes';
import type {
  ICampaign,
  ICampaignOptions,
  IMission,
} from '@/types/campaign/Campaign';
import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { ICoopSession } from '@/types/campaign/CoopSession';
import type { IFactionStanding } from '@/types/campaign/factionStanding/IFactionStanding';
import type { IForce } from '@/types/campaign/Force';
import type { IDailyBattleAuditEntry } from '@/types/campaign/IDailyBattleAuditEntry';
import type { Transaction } from '@/types/campaign/Transaction';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import { clientSafeStorage } from '@/stores/utils/clientSafeStorage';
import { CampaignType } from '@/types/campaign/CampaignType';
import { TransactionType } from '@/types/campaign/enums/TransactionType';
import { Money } from '@/types/campaign/Money';
import { emitPendingOutcomeAdded } from '@/utils/events/campaignOutcomeEvents';

import { useCampaignRosterStore } from './useCampaignRosterStore';

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
  };
  factionStandings: Record<string, IFactionStanding>;
  shoppingList?: IShoppingList;
  options: ICampaignOptions;
  campaignType: string;
  campaignStartDate: string;
  description?: string;
  iconUrl?: string;
  pendingBattleOutcomes: ICombatOutcome[];
  processedBattleIds: string[];
  reviewedBattleIds: Record<string, number>;
  dailyBattleAudit: IDailyBattleAuditEntry[];
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
    },
    factionStandings: campaign.factionStandings,
    shoppingList: campaign.shoppingList,
    options: campaign.options,
    campaignType: campaign.campaignType,
    campaignStartDate: startDate.toISOString(),
    description: campaign.description,
    iconUrl: campaign.iconUrl,
    pendingBattleOutcomes: [...pendingBattleOutcomes],
    processedBattleIds: [...processedBattleIds],
    reviewedBattleIds: { ...reviewedBattleIds },
    dailyBattleAudit: [...audit],
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
    },
    factionStandings: serialized.factionStandings,
    shoppingList: serialized.shoppingList,
    options: serialized.options,
    campaignType: serialized.campaignType as CampaignType,
    campaignStartDate: new Date(serialized.campaignStartDate),
    description: serialized.description,
    iconUrl: serialized.iconUrl,
    createdAt: serialized.createdAt,
    updatedAt: serialized.updatedAt,
    unitCombatStates: {},
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
