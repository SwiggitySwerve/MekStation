/**
 * AwardProgress Component
 * Displays progress toward earning awards with progress bars
 * and remaining requirements.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */
import React, { useMemo } from 'react';

import { Card } from '@/components/ui';
import { getCriteriaValue } from '@/stores/awardStoreUtils';
import { useAwardStore } from '@/stores/useAwardStore';
import {
  IAward,
  IPilotAward,
  IPilotStats,
  AwardRarity,
  AwardCategory,
  CriteriaType,
  AWARD_CATALOG,
  getRarityColor,
} from '@/types/award';

import { getAwardIcon, getRarityStrokeWidth } from './awardIcons';
import { RARITY_SORT_ORDER } from './awardRarityStyles';

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

interface BuildProgressOptions {
  stats?: IPilotStats;
  earnedAwardIds: Set<string>;
  filterCategory?: AwardCategory;
  nearCompletionOnly?: boolean;
  minPercentage?: number;
  excludeComplete?: boolean;
  maxItems: number;
  sortByRarity?: boolean;
}

// =============================================================================
// Rarity Styling
// =============================================================================

const DISPLAY_CRITERIA_TYPES = new Set<CriteriaType>([
  CriteriaType.TotalKills,
  CriteriaType.DamageDealt,
  CriteriaType.MissionsCompleted,
  CriteriaType.CampaignsCompleted,
  CriteriaType.ConsecutiveSurvival,
  CriteriaType.GamesPlayed,
]);

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

function buildEarnedAwardIds(pilotAwards: IPilotAward[]): Set<string> {
  return new Set(pilotAwards.map((pilotAward) => pilotAward.awardId));
}

function shouldSkipAward(
  award: IAward,
  { earnedAwardIds, filterCategory }: BuildProgressOptions,
): boolean {
  return (
    (earnedAwardIds.has(award.id) && !award.repeatable) ||
    Boolean(award.secret) ||
    Boolean(filterCategory && award.category !== filterCategory) ||
    !DISPLAY_CRITERIA_TYPES.has(award.criteria.type)
  );
}

function getAwardProgressInfo(
  award: IAward,
  stats: IPilotStats,
): ProgressInfo | null {
  const current = getCriteriaValue(stats, award.criteria.type);
  const required = award.criteria.threshold;
  const percentage = Math.min((current / required) * 100, 100);

  if (current <= 0) {
    return null;
  }

  return { award, current, required, percentage };
}

function isVisibleProgress(
  progressInfo: ProgressInfo,
  { nearCompletionOnly, minPercentage, excludeComplete }: BuildProgressOptions,
): boolean {
  if (nearCompletionOnly && progressInfo.percentage < 50) return false;
  if (minPercentage !== undefined && progressInfo.percentage < minPercentage) {
    return false;
  }
  if (excludeComplete && progressInfo.percentage >= 100) return false;
  return true;
}

function compareProgressByCompletion(
  first: ProgressInfo,
  second: ProgressInfo,
): number {
  return second.percentage - first.percentage;
}

function compareProgressForFullList(
  first: ProgressInfo,
  second: ProgressInfo,
): number {
  const completionDifference = compareProgressByCompletion(first, second);
  if (Math.abs(completionDifference) > 0.1) {
    return completionDifference;
  }

  return (
    RARITY_SORT_ORDER[first.award.rarity] -
    RARITY_SORT_ORDER[second.award.rarity]
  );
}

function buildAwardProgressList(options: BuildProgressOptions): ProgressInfo[] {
  const { stats, maxItems, sortByRarity } = options;
  if (!stats) return [];

  const progressList = AWARD_CATALOG.flatMap((award) => {
    if (shouldSkipAward(award, options)) return [];

    const progressInfo = getAwardProgressInfo(award, stats);
    if (!progressInfo || !isVisibleProgress(progressInfo, options)) return [];

    return [progressInfo];
  });

  progressList.sort(
    sortByRarity ? compareProgressForFullList : compareProgressByCompletion,
  );

  return progressList.slice(0, maxItems);
}

// =============================================================================
// Sub-Components
// =============================================================================

interface ProgressItemProps {
  progressInfo: ProgressInfo;
  compact?: boolean;
}

function ProgressItem({
  progressInfo,
  compact = false,
}: ProgressItemProps): React.ReactElement {
  const { award, current, required, percentage } = progressInfo;
  const rarityColor = getRarityColor(award.rarity);
  const progressBarColor = getProgressBarColor(award.rarity);
  const IconComponent = getAwardIcon(award.icon);
  const strokeWidth = getRarityStrokeWidth(award.rarity);
  const isNearComplete = percentage >= 75;

  if (compact) {
    return (
      <div className="bg-surface-deep/30 flex items-center gap-3 rounded-lg p-2">
        <div
          className={`bg-surface-deep flex h-8 w-8 items-center justify-center rounded-full ${rarityColor}`}
        >
          <IconComponent size={16} strokeWidth={strokeWidth} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-text-theme-secondary truncate text-xs font-medium">
              {award.name}
            </span>
            <span className={`text-xs font-bold tabular-nums ${rarityColor}`}>
              {current}/{required}
            </span>
          </div>
          <div className="bg-surface-base h-1.5 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-raised border-border-theme-subtle rounded-xl border p-4">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`bg-surface-deep border-border-theme-subtle flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 ${rarityColor} `}
        >
          <IconComponent size={24} strokeWidth={strokeWidth} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center justify-between">
            <h4 className="text-text-theme-primary truncate text-sm font-bold">
              {award.name}
            </h4>
            <span className={`text-sm font-bold tabular-nums ${rarityColor}`}>
              {current}/{required}
            </span>
          </div>

          {/* Progress bar */}
          <div className="bg-surface-deep mb-2 h-2 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full transition-all duration-500 ${progressBarColor}`}
              style={{ width: `${percentage}%` }}
            />
          </div>

          {/* Description */}
          <p className="text-text-theme-muted line-clamp-1 text-xs">
            {award.criteria.description}
          </p>

          {/* Near completion indicator */}
          {isNearComplete && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-400">
              <svg
                className="h-3.5 w-3.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
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
  const earnedAwardIds = useMemo(
    () => buildEarnedAwardIds(pilotAwards),
    [pilotAwards],
  );

  // Calculate progress for each unearned award
  const progressList = useMemo(
    () =>
      buildAwardProgressList({
        stats,
        earnedAwardIds,
        filterCategory,
        nearCompletionOnly,
        maxItems,
        sortByRarity: true,
      }),
    [stats, earnedAwardIds, filterCategory, nearCompletionOnly, maxItems],
  );

  // Empty state
  if (progressList.length === 0) {
    return (
      <Card className={`p-6 text-center ${className}`}>
        <div className="bg-surface-raised/50 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          <svg
            className="text-text-theme-muted h-6 w-6"
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
        <p className="text-text-theme-muted text-sm">
          {stats
            ? 'No award progress to show'
            : 'Play games to track award progress'}
        </p>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {/* Header */}
      <div className="border-border-theme-subtle mb-4 flex items-center justify-between border-b pb-3">
        <h3 className="text-text-theme-primary text-lg font-bold">
          Award Progress
        </h3>
        <span className="text-text-theme-muted text-xs">
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
  const earnedAwardIds = useMemo(
    () => buildEarnedAwardIds(pilotAwards),
    [pilotAwards],
  );

  // Calculate progress for each unearned award (near completion only)
  const progressList = useMemo(
    () =>
      buildAwardProgressList({
        stats,
        earnedAwardIds,
        minPercentage: 50,
        excludeComplete: true,
        maxItems,
      }),
    [stats, earnedAwardIds, maxItems],
  );

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
