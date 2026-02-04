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
// Base Icon Components
// =============================================================================

/** Swords icon - Combat, kills */
export const SwordsIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 3L9 15" />
    <path d="M14 4L20 10" />
    <path d="M3 21L15 9" />
    <path d="M4 14L10 20" />
    <path d="M14.5 9.5L9.5 14.5" />
  </svg>
);

/** Target icon - Precision, accuracy */
export const TargetIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

/** Shield icon - Defense, survival */
export const ShieldIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z" />
  </svg>
);

/** Crown icon - Legendary, leadership */
export const CrownIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2 17l2-9 4 4 4-8 4 8 4-4 2 9H2z" />
    <path d="M2 17h20v4H2z" />
  </svg>
);

/** Star icon - Achievement, excellence */
export const StarIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
  </svg>
);

/** Trophy icon - Victory, campaign */
export const TrophyIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6" />
    <path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
    <path d="M4 22h16" />
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
    <path d="M18 2H6v7a6 6 0 0012 0V2z" />
  </svg>
);

/** Medal icon - Service, achievement */
export const MedalIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M7.21 15L2.66 7.14a2 2 0 01.55-2.51l3.5-2.86a1 1 0 011.28.02L12 5l4.01-3.21a1 1 0 011.28-.02l3.5 2.86a2 2 0 01.55 2.51L16.79 15" />
    <circle cx="12" cy="17" r="5" />
  </svg>
);

/** Flame icon - Destruction, damage */
export const FlameIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
  </svg>
);

/** Skull icon - Kills, death */
export const SkullIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="10" r="7" />
    <circle cx="9" cy="9" r="1.5" fill="currentColor" />
    <circle cx="15" cy="9" r="1.5" fill="currentColor" />
    <path d="M9 17v5" />
    <path d="M12 17v5" />
    <path d="M15 17v5" />
    <path d="M9 13h6" />
  </svg>
);

/** Zap/Lightning icon - Power, speed */
export const ZapIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
  </svg>
);

/** Heart icon - Health, survival */
export const HeartIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0016.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 002 8.5c0 2.3 1.5 4.05 3 5.5l7 7z" />
  </svg>
);

/** Sparkles icon - Special, rare */
export const SparklesIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M19 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
    <path d="M5 15l1 3 3 1-3 1-1 3-1-3-3-1 3-1z" />
  </svg>
);

/** Flag icon - Campaign, territory */
export const FlagIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
    <line x1="4" y1="22" x2="4" y2="15" />
  </svg>
);

/** Clock icon - Time, service */
export const ClockIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="10" />
    <polyline points="12,6 12,12 16,14" />
  </svg>
);

/** Users icon - Team, group */
export const UsersIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 00-3-3.87" />
    <path d="M16 3.13a4 4 0 010 7.75" />
  </svg>
);

/** Gem icon - Rare, precious */
export const GemIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M6 3h12l4 6-10 13L2 9z" />
    <path d="M12 22V9" />
    <path d="M2 9h20" />
    <path d="M6 3l6 6 6-6" />
  </svg>
);

/** Default Award icon */
export const AwardIcon: IconComponent = ({ className = '', size = 24, strokeWidth = 2 }) => (
  <svg
    className={className}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="6" />
    <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
  </svg>
);

// =============================================================================
// Icon Mapping
// =============================================================================

/**
 * Map of award icon identifiers to icon components.
 */
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
