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

// =============================================================================
// Rarity Styling
// =============================================================================

function getRarityGlowClass(rarity: AwardRarity): string {
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

function getRarityBorderClass(rarity: AwardRarity): string {
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

function getRarityAccentBg(rarity: AwardRarity): string {
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
      className={`
        fixed bottom-6 right-6 z-50
        w-80 max-w-[calc(100vw-3rem)]
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0'
        }
        ${className}
      `}
    >
      <div
        className={`
          relative overflow-hidden
          bg-surface-base/95 backdrop-blur-sm
          border ${rarityBorder}
          rounded-xl shadow-2xl ${rarityGlow}
        `}
      >
        {/* Gradient accent at top */}
        <div
          className={`
            absolute top-0 left-0 right-0 h-1
            bg-gradient-to-r ${rarityAccent} to-transparent
          `}
        />

        {/* Legendary shimmer effect */}
        {isLegendary && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/5 to-transparent animate-shimmer" />
        )}

        {/* Content */}
        <div className="relative p-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            {/* Award Icon */}
            <div
              className={`
                flex-shrink-0
                w-12 h-12 rounded-full
                border-2 ${rarityBg}
                flex items-center justify-center
                text-lg font-bold uppercase
                ${rarityColor}
                ${isLegendary ? 'ring-2 ring-amber-400/30 ring-offset-1 ring-offset-surface-base' : ''}
              `}
            >
              {iconLetter}
            </div>

            {/* Text Content */}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium uppercase tracking-wider text-accent mb-1">
                Award Earned!
              </p>
              <h4 className="text-base font-bold text-text-theme-primary truncate">
                {award.name}
              </h4>
              <p className="text-xs text-text-theme-muted mt-0.5">
                {pilotName}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              className="
                flex-shrink-0 w-6 h-6
                flex items-center justify-center
                text-text-theme-muted hover:text-text-theme-primary
                transition-colors rounded-full
                hover:bg-surface-raised
              "
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Description */}
          <p className="mt-3 text-sm text-text-theme-secondary line-clamp-2">
            {award.description}
          </p>

          {/* Rarity Badge */}
          <div className="mt-3 flex items-center justify-between">
            <span
              className={`
                inline-flex items-center px-2 py-0.5
                text-xs font-medium uppercase tracking-wider
                rounded ${rarityBg} ${rarityColor}
              `}
            >
              {RARITY_LABELS[award.rarity]}
            </span>

            {/* Progress indicator */}
            <div className="h-1 flex-1 mx-3 bg-surface-deep rounded-full overflow-hidden">
              <div
                className="h-full bg-accent transition-all duration-[5000ms] ease-linear"
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
    <div className="fixed bottom-6 right-6 z-50 space-y-3">
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
