/**
 * Award Rarity Styling Utilities
 * Shared functions for rarity-based styling across award components.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import { AwardRarity } from '@/types/award';

/**
 * Get rarity border class for award badges.
 * Used in AwardBadge component.
 */
export function getRarityBorder(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return 'border-slate-500/50 hover:border-slate-400';
    case AwardRarity.Uncommon:
      return 'border-emerald-500/50 hover:border-emerald-400';
    case AwardRarity.Rare:
      return 'border-blue-500/50 hover:border-blue-400';
    case AwardRarity.Legendary:
      return 'border-amber-500/50 hover:border-amber-400';
    default:
      return 'border-slate-500/50';
  }
}

/**
 * Get rarity glow shadow class for award badges.
 * Used in AwardBadge component.
 */
export function getRarityGlow(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return '';
    case AwardRarity.Uncommon:
      return 'shadow-emerald-500/20';
    case AwardRarity.Rare:
      return 'shadow-blue-500/30';
    case AwardRarity.Legendary:
      return 'shadow-amber-500/40';
    default:
      return '';
  }
}

/**
 * Get rarity badge variant for Badge component.
 * Used in AwardDetailModal component.
 */
export function getRarityBadgeVariant(
  rarity: AwardRarity,
): 'slate' | 'emerald' | 'blue' | 'amber' {
  switch (rarity) {
    case AwardRarity.Common:
      return 'slate';
    case AwardRarity.Uncommon:
      return 'emerald';
    case AwardRarity.Rare:
      return 'blue';
    case AwardRarity.Legendary:
      return 'amber';
    default:
      return 'slate';
  }
}

/**
 * Get rarity ring color class for award icons.
 * Used in AwardDetailModal component.
 */
export function getRarityRingColor(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return 'ring-slate-500/30';
    case AwardRarity.Uncommon:
      return 'ring-emerald-500/30';
    case AwardRarity.Rare:
      return 'ring-blue-500/30';
    case AwardRarity.Legendary:
      return 'ring-amber-500/40';
    default:
      return 'ring-slate-500/30';
  }
}

/**
 * Get rarity glow shadow class for toast notifications.
 * Used in AwardEarnedToast component.
 */
export function getRarityGlowClass(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return 'shadow-slate-500/20';
    case AwardRarity.Uncommon:
      return 'shadow-emerald-500/30';
    case AwardRarity.Rare:
      return 'shadow-blue-500/40';
    case AwardRarity.Legendary:
      return 'shadow-amber-500/50';
    default:
      return 'shadow-slate-500/20';
  }
}

/**
 * Get rarity border class for toast notifications.
 * Used in AwardEarnedToast component.
 */
export function getRarityBorderClass(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return 'border-slate-500/30';
    case AwardRarity.Uncommon:
      return 'border-emerald-500/40';
    case AwardRarity.Rare:
      return 'border-blue-500/50';
    case AwardRarity.Legendary:
      return 'border-amber-500/60';
    default:
      return 'border-slate-500/30';
  }
}

/**
 * Get rarity accent background gradient class for toast notifications.
 * Used in AwardEarnedToast component.
 */
export function getRarityAccentBg(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Common:
      return 'from-slate-500/10';
    case AwardRarity.Uncommon:
      return 'from-emerald-500/10';
    case AwardRarity.Rare:
      return 'from-blue-500/10';
    case AwardRarity.Legendary:
      return 'from-amber-500/15';
    default:
      return 'from-slate-500/10';
  }
}
