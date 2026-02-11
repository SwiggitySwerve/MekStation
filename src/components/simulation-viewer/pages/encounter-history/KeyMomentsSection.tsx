import React, { useMemo, useState } from 'react';

import { FilterPanel } from '@/components/simulation-viewer/FilterPanel';
import { FOCUS_RING_CLASSES } from '@/utils/accessibility';

import type { IBattle, IKeyMoment } from './types';

import { TIER_COLORS, TIER_FILTER_DEF, TYPE_FILTER_DEF } from './types';

export interface IKeyMomentsSectionProps {
  readonly battle: IBattle;
  readonly onMomentClick: (moment: IKeyMoment) => void;
}

export const KeyMomentsSection: React.FC<IKeyMomentsSectionProps> = ({
  battle,
  onMomentClick,
}) => {
  const [momentFilter, setMomentFilter] = useState<Record<string, string[]>>(
    {},
  );

  const filteredKeyMoments = useMemo(() => {
    let moments = [...battle.keyMoments];
    const tiers = momentFilter.tier ?? [];
    if (tiers.length > 0) {
      moments = moments.filter((m) => tiers.includes(m.tier));
    }
    const types = momentFilter.type ?? [];
    if (types.length > 0) {
      moments = moments.filter((m) => types.includes(m.type));
    }
    return moments;
  }, [battle, momentFilter]);

  return (
    <section aria-label="Key moments" data-testid="key-moments-section">
      <h2
        className="mb-3 text-lg font-semibold text-gray-800 dark:text-gray-200"
        data-testid="section-heading"
      >
        Key Moments
      </h2>
      <div data-testid="key-moments-filter" className="mb-3">
        <FilterPanel
          filters={[TIER_FILTER_DEF, TYPE_FILTER_DEF]}
          activeFilters={momentFilter}
          onFilterChange={setMomentFilter}
        />
      </div>
      {filteredKeyMoments.length === 0 ? (
        <p
          className="text-sm text-gray-500 italic dark:text-gray-400"
          data-testid="empty-key-moments"
        >
          No key moments match the current filters.
        </p>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto pb-2"
          data-testid="key-moments-timeline"
        >
          {filteredKeyMoments.map((moment) => (
            <button
              key={moment.id}
              type="button"
              onClick={() => onMomentClick(moment)}
              className={`min-h-[44px] w-44 flex-shrink-0 rounded-lg border border-gray-200 bg-white p-3 text-left transition-shadow hover:shadow-md md:w-48 dark:border-gray-700 dark:bg-gray-800 ${FOCUS_RING_CLASSES}`}
              aria-label={`${moment.tier} moment: ${moment.description}, turn ${moment.turn}`}
              data-testid={`key-moment-${moment.id}`}
            >
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${TIER_COLORS[moment.tier]}`}
                  data-testid={`key-moment-tier-badge-${moment.id}`}
                >
                  {moment.tier}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Turn {moment.turn}
                </span>
              </div>
              <p className="text-sm text-gray-800 dark:text-gray-200">
                {moment.description}
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {moment.phase} · {moment.type}
              </p>
            </button>
          ))}
        </div>
      )}
    </section>
  );
};
