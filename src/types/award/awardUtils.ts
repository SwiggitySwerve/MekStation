import { AWARD_CATALOG } from './AwardCatalog';
import { IAward, AwardRarity, AwardCategory } from './AwardInterfaces';

export function getAwardById(id: string): IAward | undefined {
  return AWARD_CATALOG.find((award) => award.id === id);
}

export function getAwardsByCategory(
  category: AwardCategory,
): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => award.category === category);
}

export function getAwardsByRarity(rarity: AwardRarity): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => award.rarity === rarity);
}

export function getVisibleAwards(): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => !award.secret);
}

export function getSortedAwards(awards: readonly IAward[]): readonly IAward[] {
  return [...awards].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAutoGrantableAwards(): readonly IAward[] {
  return AWARD_CATALOG.filter((award) => award.autoGrantCriteria !== undefined);
}
