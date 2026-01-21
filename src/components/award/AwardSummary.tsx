/**
 * AwardSummary Component
 * Post-game summary displaying awards earned during a session.
 * Shows newly earned awards, progress toward next awards, and stats.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */
import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui';
import { AwardBadge } from './AwardBadge';
import { AwardDetailModal } from './AwardDetailModal';
import {
  IAward,
  IPilotAward,
  AwardRarity,
  getRarityColor,
} from '@/types/award';
import { getAwardIcon, getRarityStrokeWidth } from '@/types/award/awardIcons';

// =============================================================================
// Types
// =============================================================================

interface EarnedAwardData {
  award: IAward;
  pilotAward: IPilotAward;
  pilotId: string;
  pilotName: string;
}

interface ProgressData {
  award: IAward;
  pilotId: string;
  pilotName: string;
  current: number;
  required: number;
}

interface AwardSummaryProps {
  /** Awards earned during this game session */
  earnedAwards: EarnedAwardData[];
  /** Progress toward awards that were not yet earned */
  progressUpdates?: ProgressData[];
  /** Optional title override */
  title?: string;
  /** Callback when an award is clicked */
  onAwardClick?: (award: IAward) => void;
  /** Additional CSS classes */
  className?: string;
}

// =============================================================================
// Rarity Styling Helpers
// =============================================================================

const RARITY_ORDER: Record<AwardRarity, number> = {
  [AwardRarity.Legendary]: 0,
  [AwardRarity.Rare]: 1,
  [AwardRarity.Uncommon]: 2,
  [AwardRarity.Common]: 3,
};

const RARITY_LABELS: Record<AwardRarity, string> = {
  [AwardRarity.Legendary]: 'Legendary',
  [AwardRarity.Rare]: 'Rare',
  [AwardRarity.Uncommon]: 'Uncommon',
  [AwardRarity.Common]: 'Common',
};

function getRarityGlowClass(rarity: AwardRarity): string {
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

// =============================================================================
// Sub-Components
// =============================================================================

interface EarnedAwardCardProps {
  award: IAward;
  pilotName: string;
  onClick?: (award: IAward) => void;
}

function EarnedAwardCard({ award, pilotName, onClick }: EarnedAwardCardProps): React.ReactElement {
  const rarityColor = getRarityColor(award.rarity);
  const rarityGlow = getRarityGlowClass(award.rarity);
  const IconComponent = getAwardIcon(award.icon);
  const strokeWidth = getRarityStrokeWidth(award.rarity);
  const isLegendary = award.rarity === AwardRarity.Legendary;

  return (
    <button
      type="button"
      onClick={() => onClick?.(award)}
      className={`
        w-full p-4 rounded-xl
        bg-surface-raised border border-border-theme-subtle
        hover:border-border-theme
        transition-all duration-200
        text-left
        ${rarityGlow ? `shadow-lg ${rarityGlow}` : ''}
        ${isLegendary ? 'ring-1 ring-amber-400/20' : ''}
        ${onClick ? 'cursor-pointer hover:scale-[1.02]' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div
          className={`
            flex-shrink-0 w-14 h-14 rounded-full
            bg-surface-deep border-2 border-border-theme-subtle
            flex items-center justify-center
            ${rarityColor}
          `}
        >
          <IconComponent size={28} strokeWidth={strokeWidth} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-base font-bold text-text-theme-primary truncate">
              {award.name}
            </h4>
            <span
              className={`
                text-xs font-medium uppercase tracking-wider
                px-2 py-0.5 rounded
                ${rarityColor}
                bg-surface-deep
              `}
            >
              {RARITY_LABELS[award.rarity]}
            </span>
          </div>
          <p className="text-xs text-text-theme-muted mb-1">
            Earned by {pilotName}
          </p>
          <p className="text-sm text-text-theme-secondary line-clamp-2">
            {award.description}
          </p>
        </div>
      </div>
    </button>
  );
}

interface ProgressBarProps {
  award: IAward;
  pilotName: string;
  current: number;
  required: number;
}

function ProgressBar({ award, pilotName, current, required }: ProgressBarProps): React.ReactElement {
  const percentage = Math.min((current / required) * 100, 100);
  const rarityColor = getRarityColor(award.rarity);

  return (
    <div className="p-3 rounded-lg bg-surface-deep/50 border border-border-theme-subtle">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-text-theme-secondary truncate">
            {award.name}
          </span>
          <span className="text-xs text-text-theme-muted">
            ({pilotName})
          </span>
        </div>
        <span className={`text-sm font-bold tabular-nums ${rarityColor}`}>
          {current}/{required}
        </span>
      </div>
      <div className="h-2 bg-surface-base rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            award.rarity === AwardRarity.Legendary
              ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
              : award.rarity === AwardRarity.Rare
              ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
              : award.rarity === AwardRarity.Uncommon
              ? 'bg-gradient-to-r from-emerald-500 to-green-400'
              : 'bg-gradient-to-r from-slate-500 to-slate-400'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function AwardSummary({
  earnedAwards,
  progressUpdates = [],
  title = 'Awards Earned',
  onAwardClick,
  className = '',
}: AwardSummaryProps): React.ReactElement {
  const [selectedAward, setSelectedAward] = useState<IAward | null>(null);

  // Sort earned awards by rarity (legendary first)
  const sortedEarnedAwards = useMemo(() => {
    return [...earnedAwards].sort(
      (a, b) => RARITY_ORDER[a.award.rarity] - RARITY_ORDER[b.award.rarity]
    );
  }, [earnedAwards]);

  // Sort progress updates by percentage (highest first)
  const sortedProgress = useMemo(() => {
    return [...progressUpdates].sort((a, b) => {
      const pctA = a.current / a.required;
      const pctB = b.current / b.required;
      return pctB - pctA;
    });
  }, [progressUpdates]);

  // Stats
  const legendaryCount = earnedAwards.filter(
    (e) => e.award.rarity === AwardRarity.Legendary
  ).length;
  const rareCount = earnedAwards.filter(
    (e) => e.award.rarity === AwardRarity.Rare
  ).length;

  const handleAwardClick = (award: IAward) => {
    setSelectedAward(award);
    onAwardClick?.(award);
  };

  const handleCloseModal = () => {
    setSelectedAward(null);
  };

  // Find the pilot award and pilotId for the selected award
  const selectedEarned = selectedAward
    ? earnedAwards.find((e) => e.award.id === selectedAward.id)
    : undefined;
  const selectedPilotAward = selectedEarned?.pilotAward;
  const selectedPilotId = selectedEarned?.pilotId;

  // Empty state
  if (earnedAwards.length === 0 && progressUpdates.length === 0) {
    return (
      <Card className={`p-8 text-center ${className}`}>
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-raised/50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-text-theme-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-text-theme-primary mb-2">
          No Awards This Game
        </h3>
        <p className="text-text-theme-secondary text-sm">
          Keep fighting - awards will come with experience!
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-theme-subtle">
          <div>
            <h3 className="text-xl font-bold text-text-theme-primary">{title}</h3>
            {earnedAwards.length > 0 && (
              <p className="text-sm text-text-theme-muted mt-1">
                {earnedAwards.length} award{earnedAwards.length !== 1 ? 's' : ''} earned
                {legendaryCount > 0 && (
                  <span className="text-amber-400 ml-2">
                    {legendaryCount} Legendary!
                  </span>
                )}
                {rareCount > 0 && legendaryCount === 0 && (
                  <span className="text-blue-400 ml-2">
                    {rareCount} Rare
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Quick badge display for earned awards */}
          {earnedAwards.length > 0 && earnedAwards.length <= 4 && (
            <div className="flex items-center gap-2">
              {sortedEarnedAwards.slice(0, 4).map((earned) => (
                <AwardBadge
                  key={`${earned.award.id}-${earned.pilotId}`}
                  award={earned.award}
                  earned={true}
                  size="sm"
                  showName={false}
                  onClick={() => handleAwardClick(earned.award)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Earned Awards Section */}
        {earnedAwards.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-theme-muted mb-4">
              Newly Earned
            </h4>
            <div className="space-y-3">
              {sortedEarnedAwards.map((earned) => (
                <EarnedAwardCard
                  key={`${earned.award.id}-${earned.pilotId}`}
                  award={earned.award}
                  pilotName={earned.pilotName}
                  onClick={handleAwardClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Progress Section */}
        {sortedProgress.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-text-theme-muted mb-4">
              Progress Toward Awards
            </h4>
            <div className="space-y-2">
              {sortedProgress.slice(0, 5).map((progress) => (
                <ProgressBar
                  key={`${progress.award.id}-${progress.pilotId}`}
                  award={progress.award}
                  pilotName={progress.pilotName}
                  current={progress.current}
                  required={progress.required}
                />
              ))}
            </div>
            {sortedProgress.length > 5 && (
              <p className="text-xs text-text-theme-muted text-center mt-3">
                +{sortedProgress.length - 5} more awards in progress
              </p>
            )}
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedAward && selectedPilotId && (
        <AwardDetailModal
          award={selectedAward}
          pilotAward={selectedPilotAward}
          pilotId={selectedPilotId}
          isOpen={true}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

export default AwardSummary;
