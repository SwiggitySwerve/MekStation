/**
 * AwardEarnedToast Component
 * Toast notification displayed when an award is earned.
 * Features animated entrance and rarity-based glow effects.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */
import React, { useEffect, useState } from 'react';

import {
  IAward,
  AwardRarity,
  getRarityColor,
  getRarityBackground,
} from '@/types/award';

import {
  getRarityGlowClass,
  getRarityBorderClass,
  getRarityAccentBg,
} from './awardRarityStyles';

// =============================================================================
// Types
// =============================================================================

interface AwardEarnedToastProps {
  award: IAward;
  pilotName: string;
  onDismiss: () => void;
  autoDismissMs?: number;
  className?: string;
}

const RARITY_LABELS: Record<AwardRarity, string> = {
  [AwardRarity.Common]: 'Common',
  [AwardRarity.Uncommon]: 'Uncommon',
  [AwardRarity.Rare]: 'Rare',
  [AwardRarity.Legendary]: 'Legendary',
};

// =============================================================================
// Component
// =============================================================================

export function AwardEarnedToast({
  award,
  pilotName,
  onDismiss,
  autoDismissMs = 5000,
  className = '',
}: AwardEarnedToastProps): React.ReactElement {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const rarityColor = getRarityColor(award.rarity);
  const rarityBg = getRarityBackground(award.rarity);
  const rarityGlow = getRarityGlowClass(award.rarity);
  const rarityBorder = getRarityBorderClass(award.rarity);
  const rarityAccent = getRarityAccentBg(award.rarity);
  const iconLetter = award.name.charAt(0).toUpperCase();

  const isLegendary = award.rarity === AwardRarity.Legendary;

  // Animate in on mount
  useEffect(() => {
    const showTimer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(showTimer);
  }, []);

  const handleDismiss = React.useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss();
    }, 300);
  }, [onDismiss]);

  // Auto-dismiss timer
  useEffect(() => {
    if (autoDismissMs <= 0) return;

    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => clearTimeout(dismissTimer);
  }, [autoDismissMs, handleDismiss]);

  return (
    <div
      className={`fixed right-6 bottom-6 z-50 w-80 max-w-[calc(100vw-3rem)] transform transition-all duration-300 ease-out ${
        isVisible && !isExiting
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
      } ${className} `}
    >
      <div
        className={`bg-surface-base/95 relative overflow-hidden border backdrop-blur-sm ${rarityBorder} rounded-xl shadow-2xl ${rarityGlow} `}
      >
        {/* Gradient accent at top */}
        <div
          className={`absolute top-0 right-0 left-0 h-1 bg-gradient-to-r ${rarityAccent} to-transparent`}
        />

        {/* Legendary shimmer effect */}
        {isLegendary && (
          <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent" />
        )}

        {/* Content */}
        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Award Icon */}
            <div
              className={`h-12 w-12 flex-shrink-0 rounded-full border-2 ${rarityBg} flex items-center justify-center text-lg font-bold uppercase ${rarityColor} ${isLegendary ? 'ring-offset-surface-base ring-2 ring-amber-400/30 ring-offset-1' : ''} `}
            >
              {iconLetter}
            </div>

            {/* Text Content */}
            <div className="min-w-0 flex-1">
              <p className="text-accent mb-1 text-xs font-medium tracking-wider uppercase">
                Award Earned!
              </p>
              <h4 className="text-text-theme-primary truncate text-base font-bold">
                {award.name}
              </h4>
              <p className="text-text-theme-muted mt-0.5 text-xs">
                {pilotName}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="text-text-theme-muted hover:text-text-theme-primary hover:bg-surface-raised flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors"
            >
              <svg
                className="h-4 w-4"
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
          </div>

          {/* Description */}
          <p className="text-text-theme-secondary mt-3 line-clamp-2 text-sm">
            {award.description}
          </p>

          {/* Rarity Badge */}
          <div className="mt-3 flex items-center justify-between">
            <span
              className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium tracking-wider uppercase ${rarityBg} ${rarityColor} `}
            >
              {RARITY_LABELS[award.rarity]}
            </span>

            {/* Progress indicator */}
            <div className="bg-surface-deep mx-3 h-1 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-accent h-full transition-all duration-[5000ms] ease-linear"
                style={{
                  width: isVisible ? '0%' : '100%',
                  transitionDuration: `${autoDismissMs}ms`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Toast Container for Multiple Toasts
// =============================================================================

interface AwardToastContainerProps {
  toasts: Array<{
    id: string;
    award: IAward;
    pilotName: string;
  }>;
  onDismiss: (id: string) => void;
}

export function AwardToastContainer({
  toasts,
  onDismiss,
}: AwardToastContainerProps): React.ReactElement {
  return (
    <div className="fixed right-6 bottom-6 z-50 space-y-3">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          style={{
            transform: `translateY(-${index * 8}px)`,
            zIndex: toasts.length - index,
          }}
        >
          <AwardEarnedToast
            award={toast.award}
            pilotName={toast.pilotName}
            onDismiss={() => onDismiss(toast.id)}
          />
        </div>
      ))}
    </div>
  );
}

export default AwardEarnedToast;
