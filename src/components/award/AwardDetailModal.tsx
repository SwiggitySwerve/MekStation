/**
 * AwardDetailModal Component
 * Modal showing full award details, requirements progress, and lore.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */
import React, { useEffect, useCallback } from 'react';

import { Badge, Button } from '@/components/ui';
import { useAwardStore } from '@/stores/useAwardStore';
import {
  IAward,
  IPilotAward,
  AwardRarity,
  AwardCategory,
  getRarityColor,
  getRarityBackground,
} from '@/types/award';

import { getRarityBadgeVariant, getRarityRingColor } from './awardRarityStyles';

// =============================================================================
// Types
// =============================================================================

interface AwardDetailModalProps {
  award: IAward;
  pilotAward?: IPilotAward;
  pilotId: string;
  isOpen: boolean;
  onClose: () => void;
}

// =============================================================================
// Helpers
// =============================================================================

const CATEGORY_LABELS: Record<AwardCategory, string> = {
  [AwardCategory.Combat]: 'Combat',
  [AwardCategory.Survival]: 'Survival',
  [AwardCategory.Campaign]: 'Campaign',
  [AwardCategory.Service]: 'Service',
  [AwardCategory.Special]: 'Special',
};

const RARITY_LABELS: Record<AwardRarity, string> = {
  [AwardRarity.Common]: 'Common',
  [AwardRarity.Uncommon]: 'Uncommon',
  [AwardRarity.Rare]: 'Rare',
  [AwardRarity.Legendary]: 'Legendary',
};

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// =============================================================================
// Component
// =============================================================================

export function AwardDetailModal({
  award,
  pilotAward,
  pilotId,
  isOpen,
  onClose,
}: AwardDetailModalProps): React.ReactElement | null {
  const checkAwardCriteria = useAwardStore((state) => state.checkAwardCriteria);

  // Check current progress
  const progress = checkAwardCriteria(pilotId, award);
  const isEarned = pilotAward !== undefined;

  const rarityColor = getRarityColor(award.rarity);
  const rarityBg = getRarityBackground(award.rarity);
  const rarityRing = getRarityRingColor(award.rarity);
  const iconLetter = award.name.charAt(0).toUpperCase();

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`bg-surface-base border-border-theme-subtle relative w-full max-w-md transform rounded-2xl border shadow-2xl transition-all duration-300 ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'} `}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="text-text-theme-muted hover:text-text-theme-primary hover:bg-surface-raised absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full transition-colors"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Header with Icon */}
        <div className="border-border-theme-subtle relative border-b px-6 pt-8 pb-6 text-center">
          {/* Decorative glow for legendary */}
          {award.rarity === AwardRarity.Legendary && isEarned && (
            <div className="absolute inset-0 rounded-t-2xl bg-gradient-to-b from-amber-500/10 to-transparent" />
          )}

          {/* Award Icon */}
          <div
            className={`relative inline-flex h-24 w-24 items-center justify-center rounded-full border-2 ${rarityBg} ${isEarned ? `${rarityColor} ring-4 ${rarityRing}` : 'text-text-theme-muted opacity-50'} mb-4 text-3xl font-bold uppercase`}
          >
            {isEarned ? (
              iconLetter
            ) : (
              <svg
                className="h-10 w-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            )}
          </div>

          {/* Award Name */}
          <h2
            className={`mb-2 text-xl font-bold ${isEarned ? 'text-text-theme-primary' : 'text-text-theme-muted'}`}
          >
            {isEarned ? award.name : '???'}
          </h2>

          {/* Badges */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant={getRarityBadgeVariant(award.rarity)} size="sm">
              {RARITY_LABELS[award.rarity]}
            </Badge>
            <Badge variant="slate" size="sm">
              {CATEGORY_LABELS[award.category]}
            </Badge>
            {award.repeatable && (
              <Badge variant="violet" size="sm">
                Repeatable
              </Badge>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">
          {/* Description */}
          <div>
            <h3 className="text-text-theme-muted mb-2 text-xs font-semibold tracking-wider uppercase">
              Description
            </h3>
            <p
              className={`text-sm leading-relaxed ${isEarned ? 'text-text-theme-secondary' : 'text-text-theme-muted italic'}`}
            >
              {isEarned
                ? award.description
                : 'Complete the requirements to reveal this award.'}
            </p>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-text-theme-muted mb-2 text-xs font-semibold tracking-wider uppercase">
              Requirements
            </h3>
            <p className="text-text-theme-secondary mb-3 text-sm">
              {award.criteria.description}
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-text-theme-muted text-xs">Progress</span>
                <span className="text-text-theme-secondary text-xs font-medium tabular-nums">
                  {progress.progress.current} / {progress.progress.target}
                </span>
              </div>
              <div className="bg-surface-deep h-3 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isEarned
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-500'
                  } `}
                  style={{ width: `${progress.progress.percentage}%` }}
                />
              </div>
              <p className="text-text-theme-muted text-right text-xs">
                {progress.progress.percentage}% complete
              </p>
            </div>
          </div>

          {/* Earned Info */}
          {isEarned && pilotAward && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20">
                  <svg
                    className="h-5 w-5 text-emerald-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-400">
                    Award Earned
                  </p>
                  <p className="text-text-theme-muted text-xs">
                    {formatDate(pilotAward.earnedAt)}
                    {pilotAward.timesEarned > 1 && (
                      <span className="ml-2 text-violet-400">
                        x{pilotAward.timesEarned}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Not Earned Hint */}
          {!isEarned && (
            <div className="bg-surface-deep border-border-theme-subtle rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <div className="bg-surface-raised flex h-10 w-10 items-center justify-center rounded-full">
                  <svg
                    className="text-text-theme-muted h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-text-theme-secondary text-sm font-medium">
                    Not Yet Earned
                  </p>
                  <p className="text-text-theme-muted text-xs">
                    Keep playing to unlock this award!
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <Button variant="secondary" fullWidth onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AwardDetailModal;
