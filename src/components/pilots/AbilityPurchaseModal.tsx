/**
 * Ability Purchase Modal
 *
 * Modal for browsing and purchasing pilot special abilities.
 * Abilities are grouped by category with visual indicators for status.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import React, { useState, useMemo, useCallback } from 'react';

import { ModalOverlay } from '@/components/customizer/dialogs/ModalOverlay';
import { Button } from '@/components/ui';
import { usePilotStore } from '@/stores/usePilotStore';
import {
  IPilot,
  ISpecialAbility,
  AbilityCategory,
  getAbilitiesByCategory,
  getAvailableAbilities,
  SPECIAL_ABILITIES,
} from '@/types/pilot';

import { CategorySection } from './AbilityPurchaseCard';
import { CATEGORY_INFO } from './AbilityPurchaseConstants';

// =============================================================================
// Types
// =============================================================================

interface AbilityPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  pilot: IPilot;
  onPurchase?: () => void;
}

// =============================================================================
// Main Component
// =============================================================================

export function AbilityPurchaseModal({
  isOpen,
  onClose,
  pilot,
  onPurchase,
}: AbilityPurchaseModalProps): React.ReactElement | null {
  const { purchaseAbility, error } = usePilotStore();
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<
    AbilityCategory | 'all'
  >('all');

  // Get abilities grouped by category
  const abilitiesByCategory = useMemo(() => getAbilitiesByCategory(), []);

  // Available XP
  const availableXp = pilot.career?.xp ?? 0;
  const ownedIds = (pilot.abilities || []).map((a) => a.abilityId);

  // Stats
  const stats = useMemo(() => {
    const total = Object.values(SPECIAL_ABILITIES).length;
    const owned = ownedIds.length;
    const affordable = getAvailableAbilities(
      pilot.skills.gunnery,
      pilot.skills.piloting,
      ownedIds,
    ).filter((a) => a.xpCost <= availableXp).length;

    return { total, owned, affordable };
  }, [ownedIds, pilot.skills, availableXp]);

  // Handle purchase
  const handlePurchase = useCallback(
    async (ability: ISpecialAbility) => {
      setPurchasingId(ability.id);
      const success = await purchaseAbility(
        pilot.id,
        ability.id,
        ability.xpCost,
      );
      setPurchasingId(null);

      if (success) {
        onPurchase?.();
      }
    },
    [purchaseAbility, pilot.id, onPurchase],
  );

  // Filter categories
  const visibleCategories =
    selectedCategory === 'all'
      ? Object.values(AbilityCategory)
      : [selectedCategory];

  return (
    <ModalOverlay
      isOpen={isOpen}
      onClose={onClose}
      preventClose={purchasingId !== null}
      className="max-h-[85vh] w-[720px] overflow-hidden"
    >
      <div className="flex h-full max-h-[85vh] flex-col">
        {/* Header */}
        <div className="border-border-theme-subtle bg-surface-deep/50 flex flex-shrink-0 items-center justify-between border-b px-6 py-4">
          <div>
            <h2 className="text-text-theme-primary text-xl font-bold">
              Special Abilities
            </h2>
            <p className="text-text-theme-secondary text-sm">
              Enhance {pilot.name}&apos;s combat capabilities
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={purchasingId !== null}
            className="text-text-theme-secondary hover:text-text-theme-primary hover:bg-surface-raised rounded-lg p-2 transition-colors"
            aria-label="Close"
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
        </div>

        {/* Stats Bar */}
        <div className="bg-surface-base border-border-theme-subtle flex-shrink-0 border-b px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <svg
                  className="text-accent h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span className="text-accent text-lg font-bold tabular-nums">
                  {availableXp}
                </span>
                <span className="text-text-theme-secondary text-sm">
                  XP available
                </span>
              </div>

              <div className="bg-border-theme-subtle h-6 w-px" />

              <div className="flex items-center gap-4 text-sm">
                <span className="text-text-theme-secondary">
                  <span className="font-medium text-emerald-400">
                    {stats.owned}
                  </span>{' '}
                  owned
                </span>
                <span className="text-text-theme-secondary">
                  <span className="text-accent font-medium">
                    {stats.affordable}
                  </span>{' '}
                  purchasable
                </span>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-accent/20 text-accent border-accent/30 border'
                    : 'bg-surface-raised text-text-theme-secondary hover:text-text-theme-primary border-border-theme-subtle border'
                }`}
              >
                All
              </button>
              {Object.values(AbilityCategory).map((cat) => {
                const info = CATEGORY_INFO[cat];
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                      selectedCategory === cat
                        ? 'bg-accent/20 text-accent border-accent/30 border'
                        : 'bg-surface-raised text-text-theme-secondary hover:text-text-theme-primary border-border-theme-subtle border'
                    }`}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
          {visibleCategories.map((category) => (
            <CategorySection
              key={category}
              category={category}
              abilities={abilitiesByCategory[category]}
              pilot={pilot}
              onPurchase={handlePurchase}
              purchasingId={purchasingId}
            />
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mb-4 flex-shrink-0 rounded-lg border border-red-600/30 bg-red-900/20 p-4">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Footer */}
        <div className="border-border-theme-subtle bg-surface-deep/50 flex flex-shrink-0 items-center justify-end border-t px-6 py-4">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={purchasingId !== null}
          >
            Close
          </Button>
        </div>
      </div>
    </ModalOverlay>
  );
}

export default AbilityPurchaseModal;
