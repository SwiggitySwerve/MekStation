/**
 * AwardGrid Component
 * Grid display of awards for pilot profile view.
 * Fetches awards from store and displays them in a responsive grid.
 *
 * @spec openspec/changes/add-awards-system/specs/awards/spec.md
 */
import React, { useMemo, useState } from 'react';

import { Card } from '@/components/ui';
import { useAwardStore } from '@/stores/useAwardStore';
import {
  IAward,
  IPilotAward,
  AwardCategory,
  AwardRarity,
  AWARD_CATALOG,
} from '@/types/award';

import { AwardBadge } from './AwardBadge';
import { AwardDetailModal } from './AwardDetailModal';

// =============================================================================
// Types
// =============================================================================

interface AwardGridProps {
  pilotId: string;
  showUnearned?: boolean;
  filterCategory?: AwardCategory;
  filterRarity?: AwardRarity;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

type SortOption = 'rarity' | 'earned' | 'category' | 'name';

// =============================================================================
// Category Labels
// =============================================================================

const _CATEGORY_LABELS: Record<AwardCategory, string> = {
  [AwardCategory.Combat]: 'Combat',
  [AwardCategory.Survival]: 'Survival',
  [AwardCategory.Campaign]: 'Campaign',
  [AwardCategory.Service]: 'Service',
  [AwardCategory.Special]: 'Special',
};

const RARITY_ORDER: Record<AwardRarity, number> = {
  [AwardRarity.Legendary]: 0,
  [AwardRarity.Rare]: 1,
  [AwardRarity.Uncommon]: 2,
  [AwardRarity.Common]: 3,
};

// =============================================================================
// Component
// =============================================================================

export function AwardGrid({
  pilotId,
  showUnearned = true,
  filterCategory,
  filterRarity,
  columns = 4,
  className = '',
}: AwardGridProps): React.ReactElement {
  const [selectedAward, setSelectedAward] = useState<IAward | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('rarity');

  // Get pilot awards from store
  const getPilotAwards = useAwardStore((state) => state.getPilotAwards);
  const pilotAwards = getPilotAwards(pilotId);

  // Build earned award map for quick lookup
  const earnedAwardMap = useMemo(() => {
    const map = new Map<string, IPilotAward>();
    for (const pa of pilotAwards) {
      map.set(pa.awardId, pa);
    }
    return map;
  }, [pilotAwards]);

  // Filter and sort awards
  const displayAwards = useMemo(() => {
    let awards = [...AWARD_CATALOG];

    // Filter by category
    if (filterCategory) {
      awards = awards.filter((a) => a.category === filterCategory);
    }

    // Filter by rarity
    if (filterRarity) {
      awards = awards.filter((a) => a.rarity === filterRarity);
    }

    // Filter unearned if not showing them
    if (!showUnearned) {
      awards = awards.filter((a) => earnedAwardMap.has(a.id));
    }

    // Hide secret awards that haven't been earned
    awards = awards.filter((a) => !a.secret || earnedAwardMap.has(a.id));

    // Sort
    switch (sortBy) {
      case 'rarity':
        awards.sort((a, b) => {
          const rarityDiff = RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity];
          if (rarityDiff !== 0) return rarityDiff;
          return a.sortOrder - b.sortOrder;
        });
        break;
      case 'earned':
        awards.sort((a, b) => {
          const aEarned = earnedAwardMap.has(a.id) ? 0 : 1;
          const bEarned = earnedAwardMap.has(b.id) ? 0 : 1;
          if (aEarned !== bEarned) return aEarned - bEarned;
          return a.sortOrder - b.sortOrder;
        });
        break;
      case 'category':
        awards.sort((a, b) => {
          if (a.category !== b.category) {
            return a.category.localeCompare(b.category);
          }
          return a.sortOrder - b.sortOrder;
        });
        break;
      case 'name':
        awards.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return awards;
  }, [filterCategory, filterRarity, showUnearned, sortBy, earnedAwardMap]);

  // Stats
  const earnedCount = pilotAwards.length;
  const totalVisible = displayAwards.length;

  // Grid column classes
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
    5: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5',
    6: 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6',
  };

  const handleAwardClick = (award: IAward) => {
    setSelectedAward(award);
  };

  const handleCloseModal = () => {
    setSelectedAward(null);
  };

  // Find pilot award data for selected award
  const selectedPilotAward = selectedAward
    ? earnedAwardMap.get(selectedAward.id)
    : undefined;

  return (
    <>
      <Card className={className}>
        {/* Header */}
        <div className="border-border-theme-subtle mb-6 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-text-theme-primary text-lg font-bold">
              Awards
            </h3>
            <p className="text-text-theme-muted text-sm">
              {earnedCount} of {totalVisible} earned
            </p>
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <span className="text-text-theme-muted text-xs">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-surface-deep border-border-theme-subtle text-text-theme-secondary focus:border-accent rounded-md border px-2 py-1 text-sm focus:outline-none"
            >
              <option value="rarity">Rarity</option>
              <option value="earned">Earned First</option>
              <option value="category">Category</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {/* Empty State */}
        {displayAwards.length === 0 && (
          <div className="py-12 text-center">
            <svg
              className="text-text-theme-muted mx-auto mb-4 h-16 w-16 opacity-30"
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
            <p className="text-text-theme-muted">No awards to display</p>
          </div>
        )}

        {/* Awards Grid */}
        {displayAwards.length > 0 && (
          <div className={`grid ${gridCols[columns]} gap-6`}>
            {displayAwards.map((award) => (
              <AwardBadge
                key={award.id}
                award={award}
                earned={earnedAwardMap.has(award.id)}
                onClick={handleAwardClick}
                size="md"
              />
            ))}
          </div>
        )}

        {/* Progress Bar */}
        {totalVisible > 0 && (
          <div className="border-border-theme-subtle mt-6 border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-text-theme-muted text-xs">Progress</span>
              <span className="text-text-theme-secondary text-xs font-medium">
                {Math.round((earnedCount / totalVisible) * 100)}%
              </span>
            </div>
            <div className="bg-surface-deep h-2 overflow-hidden rounded-full">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-amber-500 transition-all duration-500"
                style={{ width: `${(earnedCount / totalVisible) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Card>

      {/* Detail Modal */}
      {selectedAward && (
        <AwardDetailModal
          award={selectedAward}
          pilotAward={selectedPilotAward}
          pilotId={pilotId}
          isOpen={true}
          onClose={handleCloseModal}
        />
      )}
    </>
  );
}

export default AwardGrid;
