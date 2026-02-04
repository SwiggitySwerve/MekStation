/**
 * AwardProgress Component
 * Displays progress toward earning awards with progress bars
 * and remaining requirements.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */
import React, { useMemo } from 'react';
import { Card } from '@/components/ui';
import {
  IAward,
  AwardRarity,
  AwardCategory,
  AWARD_CATALOG,
  getRarityColor,
} from '@/types/award';
import { getAwardIcon, getRarityStrokeWidth } from './awardIcons';
import { useAwardStore } from '@/stores/useAwardStore';

// =============================================================================
// Types
// =============================================================================

interface AwardProgressProps {
  /** Pilot ID to show progress for */
  pilotId: string;
  /** Filter to specific category */
  filterCategory?: AwardCategory;
  /** Maximum number of awards to show */
  maxItems?: number;
  /** Whether to show only close-to-completion awards (>50%) */
  nearCompletionOnly?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface ProgressInfo {
  award: IAward;
  current: number;
  required: number;
  percentage: number;
}

// =============================================================================
// Rarity Styling
// =============================================================================

const RARITY_ORDER: Record<AwardRarity, number> = {
  [AwardRarity.Legendary]: 0,
  [AwardRarity.Rare]: 1,
  [AwardRarity.Uncommon]: 2,
  [AwardRarity.Common]: 3,
};

function getProgressBarColor(rarity: AwardRarity): string {
  switch (rarity) {
    case AwardRarity.Legendary:
      return 'bg-gradient-to-r from-amber-500 to-yellow-400';
    case AwardRarity.Rare:
      return 'bg-gradient-to-r from-blue-500 to-cyan-400';
    case AwardRarity.Uncommon:
      return 'bg-gradient-to-r from-emerald-500 to-green-400';
    case AwardRarity.Common:
    default:
      return 'bg-gradient-to-r from-slate-500 to-slate-400';
  }
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ProgressItemProps {
  progressInfo: ProgressInfo;
  compact?: boolean;
}

function ProgressItem({ progressInfo, compact = false }: ProgressItemProps): React.ReactElement {
  const { award, current, required, percentage } = progressInfo;
  const rarityColor = getRarityColor(award.rarity);
  const progressBarColor = getProgressBarColor(award.rarity);
  const IconComponent = getAwardIcon(award.icon);
  const strokeWidth = getRarityStrokeWidth(award.rarity);
  const isNearComplete = percentage >= 75;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-deep/30">
        <div className={`w-8 h-8 rounded-full bg-surface-deep flex items-center justify-center ${rarityColor}`}>
          <IconComponent size={16} strokeWidth={strokeWidth} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-text-theme-secondary truncate">
              {award.name}
            </span>
            <span className={`text-xs font-bold tabular-nums ${rarityColor}`}>
              {current}/{required}
            </span>
          </div>
          <div className="h-1.5 bg-surface-base rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${progressBarColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-surface-raised border border-border-theme-subtle">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-12 h-12 rounded-full
            bg-surface-deep border-2 border-border-theme-subtle
            flex items-center justify-center
            ${rarityColor}
          `}
        >
          <IconComponent size={24} strokeWidth={strokeWidth} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-bold text-text-theme-primary truncate">
              {award.name}
            </h4>
            <span className={`text-sm font-bold tabular-nums ${rarityColor}`}>
              {current}/{required}
            </span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-surface-deep rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 rounded-full ${progressBarColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Description */}
          <p className="text-xs text-text-theme-muted line-clamp-1">
            {award.criteria.description}
          </p>

          {/* Near completion indicator */}
          {isNearComplete && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Almost there!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AwardProgress({
  pilotId,
  filterCategory,
  maxItems = 5,
  nearCompletionOnly = false,
  className = '',
}: AwardProgressProps): React.ReactElement {
  const getPilotAwards = useAwardStore((state) => state.getPilotAwards);
  const pilotStats = useAwardStore((state) => state.pilotStats);

  const pilotAwards = getPilotAwards(pilotId);
  const stats = pilotStats[pilotId];

  // Build set of already-earned award IDs
  const earnedAwardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pa of pilotAwards) {
      ids.add(pa.awardId);
    }
    return ids;
  }, [pilotAwards]);

  // Calculate progress for each unearned award
  const progressList = useMemo((): ProgressInfo[] => {
    if (!stats) return [];

    const results: ProgressInfo[] = [];

    for (const award of AWARD_CATALOG) {
      // Skip if already earned (unless repeatable)
      if (earnedAwardIds.has(award.id) && !award.repeatable) {
        continue;
      }

      // Skip secret awards
      if (award.secret) {
        continue;
      }

      // Filter by category if specified
      if (filterCategory && award.category !== filterCategory) {
        continue;
      }

      // Calculate current progress based on criteria type
      let current = 0;
      const required = award.criteria.threshold;

      switch (award.criteria.type) {
        case 'total_kills':
          current = stats.combat?.totalKills ?? 0;
          break;
        case 'damage_dealt':
          current = stats.combat?.totalDamageDealt ?? 0;
          break;
        case 'missions_completed':
          current = stats.career?.missionsCompleted ?? 0;
          break;
        case 'campaigns_completed':
          current = stats.career?.campaignsCompleted ?? 0;
          break;
        case 'consecutive_survival':
          current = stats.career?.consecutiveSurvival ?? 0;
          break;
        case 'games_played':
          current = stats.career?.gamesPlayed ?? 0;
          break;
        // Other criteria types would need additional stat tracking
        default:
          continue; // Skip criteria we can't calculate
      }

      const percentage = Math.min((current / required) * 100, 100);

      // Filter near-completion only if requested
      if (nearCompletionOnly && percentage < 50) {
        continue;
      }

      // Only include if there's some progress
      if (current > 0) {
        results.push({ award, current, required, percentage });
      }
    }

    // Sort by percentage (highest first), then by rarity
    results.sort((a, b) => {
      if (Math.abs(b.percentage - a.percentage) > 0.1) {
        return b.percentage - a.percentage;
      }
      return RARITY_ORDER[a.award.rarity] - RARITY_ORDER[b.award.rarity];
    });

    return results.slice(0, maxItems);
  }, [stats, earnedAwardIds, filterCategory, nearCompletionOnly, maxItems]);

  // Empty state
  if (progressList.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-surface-raised/50 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-text-theme-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="text-sm text-text-theme-muted">
          {stats ? 'No award progress to show' : 'Play games to track award progress'}
        </p>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border-theme-subtle">
        <h3 className="text-lg font-bold text-text-theme-primary">Award Progress</h3>
        <span className="text-xs text-text-theme-muted">
          {progressList.length} in progress
        </span>
      </div>

      {/* Progress Items */}
      <div className="space-y-3">
        {progressList.map((info) => (
          <ProgressItem key={info.award.id} progressInfo={info} />
        ))}
      </div>
    </Card>
  );
}

// =============================================================================
// Compact Variant
// =============================================================================

interface AwardProgressCompactProps {
  pilotId: string;
  maxItems?: number;
  className?: string;
}

export function AwardProgressCompact({
  pilotId,
  maxItems = 3,
  className = '',
}: AwardProgressCompactProps): React.ReactElement {
  const getPilotAwards = useAwardStore((state) => state.getPilotAwards);
  const pilotStats = useAwardStore((state) => state.pilotStats);

  const pilotAwards = getPilotAwards(pilotId);
  const stats = pilotStats[pilotId];

  // Build set of already-earned award IDs
  const earnedAwardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const pa of pilotAwards) {
      ids.add(pa.awardId);
    }
    return ids;
  }, [pilotAwards]);

  // Calculate progress for each unearned award (near completion only)
  const progressList = useMemo((): ProgressInfo[] => {
    if (!stats) return [];

    const results: ProgressInfo[] = [];

    for (const award of AWARD_CATALOG) {
      if (earnedAwardIds.has(award.id) && !award.repeatable) continue;
      if (award.secret) continue;

      let current = 0;
      const required = award.criteria.threshold;

      switch (award.criteria.type) {
        case 'total_kills':
          current = stats.combat?.totalKills ?? 0;
          break;
        case 'damage_dealt':
          current = stats.combat?.totalDamageDealt ?? 0;
          break;
        case 'missions_completed':
          current = stats.career?.missionsCompleted ?? 0;
          break;
        case 'campaigns_completed':
          current = stats.career?.campaignsCompleted ?? 0;
          break;
        case 'consecutive_survival':
          current = stats.career?.consecutiveSurvival ?? 0;
          break;
        case 'games_played':
          current = stats.career?.gamesPlayed ?? 0;
          break;
        default:
          continue;
      }

      const percentage = Math.min((current / required) * 100, 100);

      // Only show awards with significant progress
      if (percentage >= 50 && percentage < 100) {
        results.push({ award, current, required, percentage });
      }
    }

    results.sort((a, b) => b.percentage - a.percentage);
    return results.slice(0, maxItems);
  }, [stats, earnedAwardIds, maxItems]);

  if (progressList.length === 0) {
    return <></>;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {progressList.map((info) => (
        <ProgressItem key={info.award.id} progressInfo={info} compact />
      ))}
    </div>
  );
}

export default AwardProgress;
