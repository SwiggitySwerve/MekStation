/**
 * Customizer Tabs Component
 *
 * Tabbed navigation for unit configuration sections.
 * Responsive: Shows icons-only on mobile, icons + labels on larger screens.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/customizer-responsive-layout/spec.md
 */

import React, { useState, useRef, useEffect } from 'react';

import { ValidationTabBadge } from '@/components/customizer/shared/ValidationTabBadge';
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { ValidationCountsByTab } from '@/utils/validation/validationNavigation';

/**
 * Customizer tab configuration
 */
export interface CustomizerTabConfig {
  /** Tab identifier */
  id: string;
  /** Tab label */
  label: string;
  /** Icon (optional) */
  icon?: React.ReactNode;
  /** Is tab disabled */
  disabled?: boolean;
}

interface CustomizerTabsProps {
  tabs: CustomizerTabConfig[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  readOnly?: boolean;
  className?: string;
  validationCounts?: ValidationCountsByTab;
}

// Simple SVG icons for mobile view
const TabIcons: Record<string, React.ReactNode> = {
  overview: (
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
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  structure: (
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
        d="M12 2v2m0 0a2 2 0 012 2v1h2a1 1 0 011 1v3l2 1v6h-3v2h-2v-2h-4v2H8v-2H5v-6l2-1V8a1 1 0 011-1h2V6a2 2 0 012-2z"
      />
    </svg>
  ),
  armor: (
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
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  ),
  equipment: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <circle cx="12" cy="12" r="3" strokeWidth={2} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 2v4m0 12v4m10-10h-4M6 12H2"
      />
    </svg>
  ),
  criticals: (
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
        d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
      />
    </svg>
  ),
  fluff: (
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
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  preview: (
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  ),
};

/**
 * Default customizer tabs
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * Note: Weapons tab merged into Equipment tab per unify-equipment-tab change
 * Note: Preview tab added for record sheet generation per add-record-sheet-pdf-export change
 */
export const DEFAULT_CUSTOMIZER_TABS: CustomizerTabConfig[] = [
  { id: 'overview', label: 'Overview', icon: TabIcons.overview },
  { id: 'structure', label: 'Structure', icon: TabIcons.structure },
  { id: 'armor', label: 'Armor', icon: TabIcons.armor },
  { id: 'equipment', label: 'Equipment', icon: TabIcons.equipment },
  { id: 'criticals', label: 'Critical Slots', icon: TabIcons.criticals },
  { id: 'fluff', label: 'Fluff', icon: TabIcons.fluff },
  { id: 'preview', label: 'Preview', icon: TabIcons.preview },
];

/**
 * Customizer section tabs
 *
 * Responsive behavior:
 * - Mobile (<640px): Icons only, minimum 44px touch targets
 * - Desktop (>=640px): Icons + labels
 * - Scroll indicators appear when tabs overflow
 */
export function CustomizerTabs({
  tabs,
  activeTab,
  onTabChange,
  readOnly = false,
  className = '',
  validationCounts,
}: CustomizerTabsProps): React.ReactElement {
  const handleKeyDown = useTabKeyboardNavigation(tabs, activeTab, onTabChange);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  // Check scroll position to show/hide fade indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const canScroll = scrollWidth > clientWidth;
      setShowLeftFade(canScroll && scrollLeft > 0);
      setShowRightFade(canScroll && scrollLeft < scrollWidth - clientWidth - 1);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [tabs]);

  return (
    <div
      className={`bg-surface-base border-border-theme-subtle relative border-b ${className}`}
    >
      {/* Left scroll fade indicator */}
      {showLeftFade && (
        <div className="from-surface-base pointer-events-none absolute top-0 bottom-0 left-0 z-10 w-8 bg-gradient-to-r to-transparent" />
      )}

      {/* Tabs container */}
      <div
        ref={scrollContainerRef}
        className="scrollbar-thin scrollbar-thumb-border-theme flex justify-evenly overflow-x-auto"
        role="tablist"
        aria-label="Unit configuration tabs"
        onKeyDown={handleKeyDown}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={tab.id === activeTab}
            aria-controls={`tabpanel-${tab.id}`}
            aria-label={tab.label}
            tabIndex={tab.id === activeTab ? 0 : -1}
            onClick={() => !tab.disabled && onTabChange(tab.id)}
            disabled={tab.disabled}
            className={`focus:ring-accent flex min-h-[44px] min-w-[44px] flex-1 items-center justify-center gap-1 border-b-2 px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors focus:ring-2 focus:outline-none focus:ring-inset sm:gap-2 sm:px-4 ${
              tab.id === activeTab
                ? 'text-accent border-accent'
                : 'text-text-theme-secondary hover:border-border-theme-subtle border-transparent hover:text-white'
            } ${tab.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${readOnly ? 'pointer-events-none' : ''} `}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
            {validationCounts && (
              <ValidationTabBadge
                counts={
                  validationCounts[tab.id as keyof ValidationCountsByTab] ?? {
                    errors: 0,
                    warnings: 0,
                    infos: 0,
                  }
                }
                className="ml-1"
              />
            )}
          </button>
        ))}
      </div>

      {/* Right scroll fade indicator */}
      {showRightFade && (
        <div className="from-surface-base pointer-events-none absolute top-0 right-0 bottom-0 z-10 w-8 bg-gradient-to-l to-transparent" />
      )}
    </div>
  );
}

/**
 * Hook for managing customizer tab state
 */
export function useCustomizerTabs(
  initialTab: string = 'overview',
  tabs: CustomizerTabConfig[] = DEFAULT_CUSTOMIZER_TABS,
): {
  tabs: CustomizerTabConfig[];
  activeTab: string;
  currentTab: CustomizerTabConfig;
  setActiveTab: (tabId: string) => void;
} {
  const [activeTab, setActiveTab] = useState(initialTab);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  return {
    tabs,
    activeTab,
    currentTab,
    setActiveTab,
  };
}
