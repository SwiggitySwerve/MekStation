/**
 * AwardRibbon Component
 * Compact horizontal ribbon for showing key awards in pilot cards.
 * Shows first N awards with "+X more" overflow indicator.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */
import React, { useMemo } from 'react';

import { useAwardStore } from '@/stores/useAwardStore';
import {
  IAward,
  AwardRarity,
  getRarityColor,
  getRarityBackground,
  getAwardById,
} from '@/types/award';

// =============================================================================
// Types
// =============================================================================

interface AwardRibbonProps {
  pilotId: string;
  maxDisplay?: number;
  onAwardClick?: (award: IAward) => void;
  onOverflowClick?: () => void;
  size?: 'sm' | 'md';
  className?: string;
}

// =============================================================================
// Rarity Priority (for sorting)
// =============================================================================

const RARITY_PRIORITY: Record<AwardRarity, number> = {
  [AwardRarity.Legendary]: 0,
  [AwardRarity.Rare]: 1,
  [AwardRarity.Uncommon]: 2,
  [AwardRarity.Common]: 3,
};

// =============================================================================
// Size Configurations
// =============================================================================

const sizeConfig = {
  sm: {
    badge: 'w-6 h-6 text-[10px]',
    gap: 'gap-1',
    overflow: 'text-[10px] px-1.5',
  },
  md: {
    badge: 'w-8 h-8 text-xs',
    gap: 'gap-1.5',
    overflow: 'text-xs px-2',
  },
};

// =============================================================================
// Mini Badge Component
// =============================================================================

interface MiniBadgeProps {
  award: IAward;
  size: 'sm' | 'md';
  onClick?: () => void;
}

function MiniBadge({
  award,
  size,
  onClick,
}: MiniBadgeProps): React.ReactElement {
  const config = sizeConfig[size];
  const rarityColor = getRarityColor(award.rarity);
  const rarityBg = getRarityBackground(award.rarity);
  const iconLetter = award.name.charAt(0).toUpperCase();

  const isLegendary = award.rarity === AwardRarity.Legendary;

  return (
    <button
      onClick={onClick}
      className={` ${config.badge} flex items-center justify-center rounded-full border font-bold uppercase transition-all duration-200 ${rarityBg} ${rarityColor} ${isLegendary ? 'border-amber-500/60' : 'border-transparent'} focus:ring-accent/50 hover:z-10 hover:scale-110 focus:ring-2 focus:outline-none`}
      title={award.name}
    >
      {iconLetter}
    </button>
  );
}

// =============================================================================
// Component
// =============================================================================

export function AwardRibbon({
  pilotId,
  maxDisplay = 5,
  onAwardClick,
  onOverflowClick,
  size = 'md',
  className = '',
}: AwardRibbonProps): React.ReactElement {
  const config = sizeConfig[size];

  // Get pilot awards from store
  const getPilotAwards = useAwardStore((state) => state.getPilotAwards);
  const pilotAwards = getPilotAwards(pilotId);

  // Sort awards by rarity (legendary first) and get display awards
  const { displayAwards, overflowCount } = useMemo(() => {
    // Map pilot awards to full award objects and sort by rarity
    const fullAwards = pilotAwards
      .map((pa) => getAwardById(pa.awardId))
      .filter((a): a is IAward => a !== undefined)
      .sort((a, b) => RARITY_PRIORITY[a.rarity] - RARITY_PRIORITY[b.rarity]);

    const display = fullAwards.slice(0, maxDisplay);
    const overflow = Math.max(0, fullAwards.length - maxDisplay);

    return { displayAwards: display, overflowCount: overflow };
  }, [pilotAwards, maxDisplay]);

  // Empty state
  if (pilotAwards.length === 0) {
    return (
      <div className={`flex items-center ${config.gap} ${className}`}>
        <span className="text-text-theme-muted text-xs italic">No awards</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center ${config.gap} ${className}`}>
      {/* Display awards */}
      {displayAwards.map((award) => (
        <MiniBadge
          key={award.id}
          award={award}
          size={size}
          onClick={onAwardClick ? () => onAwardClick(award) : undefined}
        />
      ))}

      {/* Overflow indicator */}
      {overflowCount > 0 && (
        <button
          onClick={onOverflowClick}
          className={` ${config.overflow} bg-surface-raised/80 border-border-theme-subtle text-text-theme-muted hover:text-text-theme-secondary focus:ring-accent/50 h-full rounded-full border py-0.5 transition-colors focus:ring-2 focus:outline-none`}
        >
          +{overflowCount}
        </button>
      )}
    </div>
  );
}

export default AwardRibbon;
