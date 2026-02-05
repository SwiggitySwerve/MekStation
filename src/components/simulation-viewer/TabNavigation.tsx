import React, { useRef, useCallback } from 'react';

import type { ITabNavigationProps } from '@/components/simulation-viewer/types';

const TABS = [
  { id: 'campaign-dashboard', label: 'Campaign Dashboard' },
  { id: 'encounter-history', label: 'Encounter History' },
  { id: 'analysis-bugs', label: 'Analysis & Bugs' },
] as const;

type _TabId = (typeof TABS)[number]['id'];

export const TabNavigation: React.FC<ITabNavigationProps> = ({
  activeTab,
  onTabChange,
  className = '',
}) => {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = TABS.findIndex((t) => t.id === activeTab);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      let nextIndex = activeIndex;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (activeIndex + 1) % TABS.length;
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (activeIndex - 1 + TABS.length) % TABS.length;
      } else if (e.key === 'Home') {
        e.preventDefault();
        nextIndex = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        nextIndex = TABS.length - 1;
      } else {
        return;
      }

      onTabChange(TABS[nextIndex].id);
      tabRefs.current[nextIndex]?.focus();
    },
    [activeIndex, onTabChange],
  );

  const containerClasses = [
    'flex overflow-x-auto border-b border-gray-200 dark:border-gray-700',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      role="tablist"
      aria-label="Simulation viewer tabs"
      className={containerClasses}
      onKeyDown={handleKeyDown}
      data-testid="tab-navigation"
    >
      {TABS.map((tab, index) => {
        const isActive = tab.id === activeTab;

        const tabClasses = [
          'px-4 py-3 min-h-[44px] md:px-6 md:min-h-0 text-sm font-medium transition-colors whitespace-nowrap',
          'flex-1 sm:flex-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
          isActive
            ? 'bg-white dark:bg-gray-800 border-b-2 border-blue-600 text-blue-600'
            : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800',
        ].join(' ');

        return (
          <button
            key={tab.id}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            role="tab"
            type="button"
            id={`tab-${tab.id}`}
            aria-selected={isActive}
            aria-controls={`panel-${tab.id}`}
            tabIndex={isActive ? 0 : -1}
            className={tabClasses}
            onClick={() => onTabChange(tab.id)}
            data-testid={`tab-${tab.id}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
