/** Player acceptance of allocated salvage; eligibility belongs to the engine. */
import type { ICampaign } from '@/types/campaign/Campaign';
import type { ISalvageBayItem } from '@/types/campaign/CampaignInventory';
import type { ISalvageCandidate } from '@/types/campaign/Salvage';

interface IBoundSalvageRoster {
  readonly campaignId: string | null;
  readonly units: readonly { readonly unitId: string }[];
}

/**
 * One enrollment predicate for display and decisions. Force membership survives
 * reload without the child roster store; a bound roster also protects partial
 * holdings from decline. This is custody evidence, not provenance validation.
 */
export function isSalvageUnitEnrolled(
  campaign: Pick<ICampaign, 'id' | 'forces'>,
  candidate: Pick<ISalvageCandidate, 'source' | 'unitId'>,
  roster?: IBoundSalvageRoster,
): boolean {
  if (candidate.source !== 'unit') return false;
  return (
    Array.from(campaign.forces.values()).some((force) =>
      force.unitIds.includes(candidate.unitId),
    ) ||
    (roster?.campaignId === campaign.id &&
      roster.units.some((unit) => unit.unitId === candidate.unitId))
  );
}

/** Awarded units still need acceptance (D6); parts keep their status mapping. */
export function salvageAcceptanceStatus(
  campaign: Pick<ICampaign, 'id' | 'forces'>,
  candidate: Pick<ISalvageCandidate, 'source' | 'unitId' | 'status'>,
): ISalvageBayItem['status'] {
  if (isSalvageUnitEnrolled(campaign, candidate)) return 'accepted';
  if (candidate.status === 'declined') return 'declined';
  if (candidate.source === 'unit') return 'pending';
  switch (candidate.status) {
    case 'awarded':
    case 'auctioned':
      return 'accepted';
    case 'pending':
      return 'pending';
  }
}
