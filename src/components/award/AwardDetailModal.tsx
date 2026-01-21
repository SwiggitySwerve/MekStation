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

function getRarityBadgeVariant(rarity: AwardRarity): 'slate' | 'emerald' | 'blue' | 'amber' {
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

function getRarityRingColor(rarity: AwardRarity): string {
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
    [onClose]
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
        className={`
          relative w-full max-w-md
          bg-surface-base border border-border-theme-subtle
          rounded-2xl shadow-2xl
          transform transition-all duration-300
          ${isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
        `}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="
            absolute top-4 right-4 z-10
            w-8 h-8 rounded-full
            flex items-center justify-center
            text-text-theme-muted hover:text-text-theme-primary
            hover:bg-surface-raised transition-colors
          "
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header with Icon */}
        <div className="relative pt-8 pb-6 px-6 text-center border-b border-border-theme-subtle">
          {/* Decorative glow for legendary */}
          {award.rarity === AwardRarity.Legendary && isEarned && (
            <div className="absolute inset-0 bg-gradient-to-b from-amber-500/10 to-transparent rounded-t-2xl" />
          )}

          {/* Award Icon */}
          <div
            className={`
              relative inline-flex items-center justify-center
              w-24 h-24 rounded-full
              border-2 ${rarityBg}
              ${isEarned ? `${rarityColor} ring-4 ${rarityRing}` : 'text-text-theme-muted opacity-50'}
              text-3xl font-bold uppercase
              mb-4
            `}
          >
            {isEarned ? (
              iconLetter
            ) : (
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <h2 className={`text-xl font-bold mb-2 ${isEarned ? 'text-text-theme-primary' : 'text-text-theme-muted'}`}>
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
        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-theme-muted mb-2">
              Description
            </h3>
            <p className={`text-sm leading-relaxed ${isEarned ? 'text-text-theme-secondary' : 'text-text-theme-muted italic'}`}>
              {isEarned ? award.description : 'Complete the requirements to reveal this award.'}
            </p>
          </div>

          {/* Requirements */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-theme-muted mb-2">
              Requirements
            </h3>
            <p className="text-sm text-text-theme-secondary mb-3">
              {award.criteria.description}
            </p>

            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-theme-muted">Progress</span>
                <span className="text-xs font-medium text-text-theme-secondary tabular-nums">
                  {progress.progress.current} / {progress.progress.target}
                </span>
              </div>
              <div className="h-3 bg-surface-deep rounded-full overflow-hidden">
                <div
                  className={`
                    h-full rounded-full transition-all duration-500
                    ${isEarned
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                      : 'bg-gradient-to-r from-cyan-600 to-cyan-500'
                    }
                  `}
                  style={{ width: `${progress.progress.percentage}%` }}
                />
              </div>
              <p className="text-xs text-text-theme-muted text-right">
                {progress.progress.percentage}% complete
              </p>
            </div>
          </div>

          {/* Earned Info */}
          {isEarned && pilotAward && (
            <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-emerald-400">Award Earned</p>
                  <p className="text-xs text-text-theme-muted">
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
            <div className="p-4 rounded-lg bg-surface-deep border border-border-theme-subtle">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-surface-raised flex items-center justify-center">
                  <svg className="w-5 h-5 text-text-theme-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-text-theme-secondary">Not Yet Earned</p>
                  <p className="text-xs text-text-theme-muted">
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
