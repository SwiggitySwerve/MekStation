/**
 * Award Icon Components
 *
 * SVG icon components for awards. Uses inline SVGs to avoid
 * adding external dependencies.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */

import React from 'react';

import { AwardCategory, AwardRarity } from '@/types/award/AwardInterfaces';

import {
  SwordsIcon,
  TargetIcon,
  ShieldIcon,
  CrownIcon,
  StarIcon,
  TrophyIcon,
  MedalIcon,
  FlameIcon,
  SkullIcon,
  ZapIcon,
  HeartIcon,
  SparklesIcon,
  FlagIcon,
  ClockIcon,
  UsersIcon,
  GemIcon,
  AwardIcon,
} from './awardIconComponents';

export {
  SwordsIcon,
  TargetIcon,
  ShieldIcon,
  CrownIcon,
  StarIcon,
  TrophyIcon,
  MedalIcon,
  FlameIcon,
  SkullIcon,
  ZapIcon,
  HeartIcon,
  SparklesIcon,
  FlagIcon,
  ClockIcon,
  UsersIcon,
  GemIcon,
  AwardIcon,
};

// =============================================================================
// Types
// =============================================================================

export interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

type IconComponent = React.FC<IconProps>;

// =============================================================================
// Icon Mapping
// =============================================================================

export const AWARD_ICON_MAP: Record<string, IconComponent> = {
  // Combat Awards
  'award-first-blood': SwordsIcon,
  'award-warrior': SwordsIcon,
  'award-ace': StarIcon,
  'award-double-ace': StarIcon,
  'award-triple-ace': CrownIcon,
  'award-legend': CrownIcon,
  'award-marksman': TargetIcon,
  'award-sharpshooter': TargetIcon,
  'award-one-man-army': SkullIcon,
  'award-devastator': FlameIcon,
  'award-annihilator': ZapIcon,

  // Survival Awards
  'award-survivor': ShieldIcon,
  'award-iron-will': ShieldIcon,
  'award-unkillable': HeartIcon,
  'award-phoenix': FlameIcon,
  'award-lucky': SparklesIcon,
  'award-close-call': HeartIcon,

  // Campaign Awards
  'award-campaign-victor': TrophyIcon,
  'award-campaign-veteran': MedalIcon,
  'award-liberator': FlagIcon,
  'award-conqueror': FlagIcon,
  'award-crusader': FlagIcon,

  // Service Awards
  'award-enlisted': ClockIcon,
  'award-career-soldier': MedalIcon,
  'award-lifer': MedalIcon,
  'award-centurion': TrophyIcon,
  'award-100-games': MedalIcon,
  'award-500-games': TrophyIcon,
  'award-1000-games': CrownIcon,

  // Special Awards
  'award-against-all-odds': GemIcon,
  'award-mech-slayer': SkullIcon,
  'award-lance-killer': UsersIcon,
  'award-company-killer': UsersIcon,
  'award-perfect-mission': StarIcon,
  'award-flawless': SparklesIcon,
  'award-clutch': ZapIcon,
  'award-last-standing': ShieldIcon,

  // Default
  default: AwardIcon,
};

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get the icon component for an award.
 *
 * @param iconId The award's icon identifier
 * @returns The corresponding icon component
 */
export function getAwardIcon(iconId: string): IconComponent {
  return AWARD_ICON_MAP[iconId] || AWARD_ICON_MAP['default'];
}

/**
 * Get a default icon for an award category.
 *
 * @param category The award category
 * @returns A suitable default icon
 */
export function getCategoryDefaultIcon(category: AwardCategory): IconComponent {
  switch (category) {
    case AwardCategory.Combat:
      return SwordsIcon;
    case AwardCategory.Survival:
      return ShieldIcon;
    case AwardCategory.Campaign:
      return TrophyIcon;
    case AwardCategory.Service:
      return MedalIcon;
    case AwardCategory.Special:
      return SparklesIcon;
    default:
      return AwardIcon;
  }
}

/**
 * Get the icon stroke width based on award rarity.
 *
 * @param rarity The award rarity
 * @returns Stroke width value
 */
export function getRarityStrokeWidth(rarity: AwardRarity): number {
  switch (rarity) {
    case AwardRarity.Legendary:
      return 2.5;
    case AwardRarity.Rare:
      return 2;
    case AwardRarity.Uncommon:
      return 1.75;
    case AwardRarity.Common:
    default:
      return 1.5;
  }
}
