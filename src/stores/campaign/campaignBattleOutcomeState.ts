import type { ICampaign } from '@/types/campaign/Campaign';
import type { ICombatOutcome } from '@/types/combat/CombatOutcome';

import type { CampaignStore } from './useCampaignStore.types';

/** Battle-ledger rules: openspec/changes/fix-campaign-outcome-ledgers. */
interface IBattleOutcomeLedgers {
  readonly pendingBattleOutcomes?: readonly ICombatOutcome[];
  readonly processedBattleIds?: readonly string[];
  readonly reviewedBattleIds?: Readonly<Record<string, number>>;
}

type BattleOutcomeState = Pick<
  CampaignStore,
  'pendingBattleOutcomes' | 'processedBattleIds' | 'reviewedBattleIds'
>;

export function isOutcomeApplied(
  store: IBattleOutcomeLedgers,
  campaign: ICampaign | null,
  matchId: string,
): boolean {
  return (
    (store.processedBattleIds ?? []).includes(matchId) ||
    (campaign?.processedBattleIds ?? []).includes(matchId)
  );
}

/** Callers supply only ledgers belonging to this campaign. */
export function mergeBattleOutcomeState(
  campaign: ICampaign | null,
  store: IBattleOutcomeLedgers = {},
): BattleOutcomeState {
  const embedded = campaign as (ICampaign & IBattleOutcomeLedgers) | null;
  const processedBattleIds = Array.from(
    new Set([
      ...(store.processedBattleIds ?? []),
      ...(embedded?.processedBattleIds ?? []),
    ]),
  );
  const pending = new Map(
    [
      ...(embedded?.pendingBattleOutcomes ?? []),
      ...(store.pendingBattleOutcomes ?? []),
    ].map((outcome) => [outcome.matchId, outcome] as const),
  );
  const reviewedBattleIds = { ...embedded?.reviewedBattleIds };
  for (const [matchId, timestamp] of Object.entries(
    store.reviewedBattleIds ?? {},
  )) {
    reviewedBattleIds[matchId] = Math.max(
      reviewedBattleIds[matchId] ?? timestamp,
      timestamp,
    );
  }
  return {
    pendingBattleOutcomes: [...pending.values()].filter(
      (outcome) =>
        !isOutcomeApplied({ processedBattleIds }, campaign, outcome.matchId),
    ),
    processedBattleIds,
    reviewedBattleIds,
  };
}

export type CampaignPendingOutcomeSource = 'merge' | 'server';

/** Server installs replace pending entries; processed/reviewed evidence still merges. */
export function hydrateCampaignBattleState(
  campaign: ICampaign,
  previous?: BattleOutcomeState & { readonly campaign: ICampaign | null },
  pendingSource: CampaignPendingOutcomeSource = 'merge',
): BattleOutcomeState & Pick<CampaignStore, 'campaign' | 'outcomeApplyErrors'> {
  const sameCampaign =
    previous?.campaign?.id === campaign.id ? previous : undefined;
  const ledgers = mergeBattleOutcomeState(
    campaign,
    pendingSource === 'server' && sameCampaign
      ? { ...sameCampaign, pendingBattleOutcomes: [] }
      : sameCampaign,
  );
  return {
    ...ledgers,
    campaign: { ...campaign, ...ledgers },
    outcomeApplyErrors: {},
  };
}
