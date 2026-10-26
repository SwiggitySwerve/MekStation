/**
 * Customizer Tabs Component
 *
 * Tabbed navigation for unit configuration sections.
 * Compact: hides icons, keeps labels, start-justifies a scrollable strip
 * with 44px targets. Default: icons+labels, even justification.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/customizer-responsive-layout/spec.md
 */

import React, { useState, useRef, useEffect, useId } from 'react';

import { buildStatusCountText } from '@/components/customizer/shared/buildStatusSummary';
import { AppIcon } from '@/components/ui/AppIcon';
import { useTabKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import {
  TabValidationCounts,
  ValidationCountsByTab,
} from '@/utils/validation/validationNavigation';

import workbenchStyles from '../CustomizerWorkbench.module.css';
import { CUSTOMIZER_TAB_ICONS as TabIcons } from './CustomizerTabIcons';
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
  compact?: boolean;
  /**
   * Set of tab ids that have unsaved field changes.
   * When a tab id is present here the label shows a yellow dirty marker (●).
   * Satisfies Spec § Requirement: Tab Dirty Tracking.
   */
  dirtyTabs?: Set<string>;
  /**
   * Map of tab ids whose fields currently fail validation to the rule code of
   * the failing constraint (e.g. `VAL-VEHICLE-ARMOR-MAX`).  When a tab id is
   * present the label shows a red error dot (●) whose ARIA label is the rule
   * code.  For backwards compatibility a plain Set is still accepted; when a
   * Set is supplied the ARIA label falls back to the generic string
   * "Validation error".
   *
   * Satisfies Spec § Requirement: Validation Error Markers — "an ARIA label
   * naming the failing rule (`VAL-VEHICLE-ARMOR-MAX`)".
   */
  errorTabs?: Map<string, string> | Set<string>;
}

/**
 * Compute the ARIA label + tooltip string for a validation-error dot.
 *
 * When `errorTabs` is a Map the value is the rule code (e.g.
 * `VAL-VEHICLE-ARMOR-MAX`) and is used verbatim so screen-reader users hear
 * the specific failing rule.  When `errorTabs` is a Set (legacy) or the map
 * entry has an empty/undefined value we fall back to the generic label.
 *
 * Satisfies Spec § Requirement: Validation Error Markers.
 */
function getErrorRuleCode(
  errorTabs: Map<string, string> | Set<string>,
  tabId: string,
): string {
  if (errorTabs instanceof Map)
    return errorTabs.get(tabId) || 'Validation error';
  return 'Validation error';
}

/** "2 errors, 1 warning" for a section tab's badge and description. */
function sectionCountsText(counts: TabValidationCounts | undefined): string {
  if (!counts) return '';
  return [
    counts.errors > 0 ? buildStatusCountText('error', counts.errors) : '',
    counts.warnings > 0 ? buildStatusCountText('warning', counts.warnings) : '',
  ]
    .filter(Boolean)
    .join(', ');
}

function badgeCount(count: number): string {
  return count > 99 ? '99+' : String(count);
}

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
 * Compact: hides icons, keeps labels, start-justified scrollable strip
 * with 44px targets. Default: icons+labels, even justification.
 * Scroll indicators appear when tabs overflow.
 */
export function CustomizerTabs({
  tabs,
  activeTab,
  onTabChange,
  readOnly = false,
  className = '',
  validationCounts,
  compact = false,
  dirtyTabs,
  errorTabs,
}: CustomizerTabsProps): React.ReactElement {
  const handleKeyDown = useTabKeyboardNavigation(tabs, activeTab, onTabChange);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);
  const [sectionsOpen, setSectionsOpen] = useState(false);
  const selectorRef = useRef<HTMLButtonElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sectionsId = useId();
  const currentIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const closeSections = (): void => {
    setSectionsOpen(false);
    selectorRef.current?.focus();
  };

  useEffect(() => {
    if (!sectionsOpen) return;
    scrollContainerRef.current
      ?.querySelector<HTMLButtonElement>('[aria-selected="true"]')
      ?.focus();
    const handleOutside = (event: PointerEvent): void => {
      if (
        event.target instanceof Node &&
        !rootRef.current?.contains(event.target)
      ) {
        // Focus the trigger before hiding its focused tab. A pointer target
        // that accepts focus will then receive it through the browser default.
        if (scrollContainerRef.current?.contains(document.activeElement))
          selectorRef.current?.focus();
        setSectionsOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleOutside);
    return () => {
      document.removeEventListener('pointerdown', handleOutside);
    };
  }, [sectionsOpen]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    const selected = container?.querySelector<HTMLButtonElement>(
      '[role="tab"][aria-selected="true"]',
    );
    if (container?.contains(document.activeElement)) selected?.focus();
    const revealSelected = (): void => {
      selected?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    };
    revealSelected();
    const observer = new ResizeObserver(revealSelected);
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, [activeTab]);

  const scrollTabs = (direction: -1 | 1): void => {
    const container = scrollContainerRef.current;
    if (!container) return;
    container.scrollBy({
      left: direction * Math.max(120, container.clientWidth * 0.6),
      behavior: 'smooth',
    });
  };

  // Check scroll position to show/hide fade indicators
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScroll = () => {
      if (window.innerWidth >= 640) setSectionsOpen(false);
      const { scrollLeft, scrollWidth, clientWidth } = container;
      const canScroll = scrollWidth > clientWidth;
      setShowLeftFade(canScroll && scrollLeft > 0);
      setShowRightFade(canScroll && scrollLeft < scrollWidth - clientWidth - 1);
    };

    checkScroll();
    container.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    // Tabs can grow after mount (badges, layout switches) without the strip
    // itself resizing, so watch every tab as well as the strip.
    const observer =
      typeof ResizeObserver === 'undefined'
        ? undefined
        : new ResizeObserver(checkScroll);
    observer?.observe(container);
    for (const tab of Array.from(container.querySelectorAll('[role="tab"]')))
      observer?.observe(tab);

    return () => {
      container.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
      observer?.disconnect();
    };
  }, [tabs]);

  return (
    <div
      ref={rootRef}
      className={`bg-surface-base border-border-theme-subtle relative border-b ${className}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setSectionsOpen(false);
      }}
      onKeyDown={(event) => {
        if (sectionsOpen && event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          closeSections();
        }
      }}
    >
      <button
        ref={selectorRef}
        type="button"
        className={workbenchStyles.sectionSelector}
        aria-label={`Section: ${tabs[currentIndex]?.label ?? 'Choose section'}, ${currentIndex + 1} of ${tabs.length}`}
        aria-expanded={sectionsOpen}
        aria-controls={sectionsId}
        disabled={readOnly}
        onClick={() => setSectionsOpen((open) => !open)}
      >
        <span>{tabs[currentIndex]?.label ?? 'Choose section'}</span>
        <span className="text-text-theme-secondary">
          · {currentIndex + 1} of {tabs.length}
        </span>
        <AppIcon
          name={sectionsOpen ? 'chevron-up' : 'chevron-down'}
          size="inline"
          className="ml-auto"
        />
      </button>
      {/* Left overflow cue: fade plus chevron; pointer shortcut only, since
          arrow keys already move between tabs. */}
      {showLeftFade && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Scroll tabs left"
          data-testid="customizer-tabs-scroll-cue-left"
          className={workbenchStyles.sectionFadeLeft}
          onClick={() => scrollTabs(-1)}
        >
          <AppIcon name="chevron-left" size="inline" aria-hidden="true" />
        </button>
      )}

      {/* Tabs container */}
      <div
        id={sectionsId}
        ref={scrollContainerRef}
        className={`${workbenchStyles.sectionTablist} scrollbar-thumb-border-theme flex scroll-px-11 scrollbar-thin overflow-x-auto ${compact ? 'justify-start' : 'justify-evenly'}`}
        data-sections-open={sectionsOpen}
        role="tablist"
        aria-orientation={sectionsOpen ? 'vertical' : 'horizontal'}
        aria-label="Unit configuration tabs"
        onKeyDown={(event) => {
          if (
            sectionsOpen &&
            ['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)
          ) {
            event.preventDefault();
            const choices = Array.from(
              event.currentTarget.querySelectorAll<HTMLButtonElement>(
                '[role="tab"]:not(:disabled)',
              ),
            );
            const index = choices.indexOf(
              document.activeElement as HTMLButtonElement,
            );
            const next = {
              Home: 0,
              End: choices.length - 1,
              ArrowDown: (index + 1) % choices.length,
              ArrowUp: (index - 1 + choices.length) % choices.length,
            };
            choices[next[event.key as keyof typeof next]]?.focus();
            return;
          }
          if (sectionsOpen) return;
          if ((event.target as HTMLElement).getAttribute('role') === 'tab')
            handleKeyDown(event);
        }}
      >
        {tabs.map((tab) => {
          const counts =
            validationCounts?.[tab.id as keyof ValidationCountsByTab];
          const validationId = `customizer-tab-validation-${tab.id}`;
          const countsText = sectionCountsText(counts);
          return (
            <div
              key={tab.id}
              className={compact ? 'flex shrink-0 items-center' : 'contents'}
            >
              <button
                id={`customizer-tab-${tab.id}`}
                role="tab"
                aria-selected={tab.id === activeTab}
                aria-controls={`tabpanel-${tab.id}`}
                aria-label={tab.label}
                aria-describedby={
                  counts?.errors || counts?.warnings ? validationId : undefined
                }
                tabIndex={tab.id === activeTab ? 0 : -1}
                onClick={() => {
                  if (tab.disabled) return;
                  onTabChange(tab.id);
                  if (sectionsOpen) closeSections();
                }}
                disabled={tab.disabled}
                className={`${workbenchStyles.sectionTab} focus-visible:ring-accent flex min-h-[44px] min-w-[72px] flex-shrink-0 flex-row items-center justify-center gap-2 border-b-2 px-2 py-2 text-sm font-medium whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset sm:min-h-[44px] sm:min-w-[44px] ${compact ? 'sm:flex-none sm:px-2' : 'sm:flex-1 sm:px-4'} sm:flex-row sm:gap-2 ${
                  tab.id === activeTab
                    ? 'text-accent border-accent bg-accent/5'
                    : 'text-text-theme-secondary border-transparent bg-transparent'
                } ${tab.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'} ${readOnly ? 'pointer-events-none' : ''} `}
              >
                {!compact && tab.icon}
                <span className="text-xs sm:text-sm">{tab.label}</span>
                {tab.id === activeTab && (
                  <AppIcon
                    name="check"
                    size="inline"
                    className={workbenchStyles.sectionSelected}
                  />
                )}
                {/* Dirty marker — yellow dot for unsaved changes */}
                {dirtyTabs?.has(tab.id) && (
                  <span
                    className="ml-1 text-yellow-400"
                    aria-label="Unsaved changes"
                    role="img"
                    title="Unsaved changes"
                  >
                    ●
                  </span>
                )}
                {/* Validation error marker — red dot for failing constraints.
                When errorTabs is a Map, the value is the rule code (e.g.
                "VAL-VEHICLE-ARMOR-MAX") and becomes the ARIA label + tooltip
                so screen-reader users hear the specific failing rule.  A
                plain Set falls back to the generic "Validation error" label.
                Satisfies Spec § Requirement: Validation Error Markers. */}
                {errorTabs?.has(tab.id) && (
                  <span
                    className="ml-1 text-red-500"
                    aria-label={getErrorRuleCode(errorTabs, tab.id)}
                    role="img"
                    title={getErrorRuleCode(errorTabs, tab.id)}
                  >
                    ●
                  </span>
                )}
                {/* Validation badges: shape and count, never color alone.
                Errors are a red circle, warnings a yellow rounded square,
                each holding its count; the slot keeps its width when the
                counts clear. */}
                {validationCounts && (
                  <span
                    className={workbenchStyles.sectionValidationDot}
                    data-severity={
                      counts?.errors
                        ? 'error'
                        : counts?.warnings
                          ? 'warning'
                          : undefined
                    }
                    role={countsText ? 'img' : undefined}
                    aria-label={
                      countsText ? `${tab.label}: ${countsText}` : undefined
                    }
                    title={
                      countsText ? `${tab.label}: ${countsText}` : undefined
                    }
                  >
                    {counts && counts.errors > 0 && (
                      <span
                        aria-hidden="true"
                        data-section-badge="error"
                        className={workbenchStyles.sectionBadge}
                      >
                        {badgeCount(counts.errors)}
                      </span>
                    )}
                    {counts && counts.warnings > 0 && (
                      <span
                        aria-hidden="true"
                        data-section-badge="warning"
                        className={workbenchStyles.sectionBadge}
                      >
                        {badgeCount(counts.warnings)}
                      </span>
                    )}
                    {countsText && (
                      <span id={validationId} className="sr-only">
                        {countsText}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Right overflow cue */}
      {showRightFade && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Scroll tabs right"
          data-testid="customizer-tabs-scroll-cue-right"
          className={workbenchStyles.sectionFadeRight}
          onClick={() => scrollTabs(1)}
        >
          <AppIcon name="chevron-right" size="inline" aria-hidden="true" />
        </button>
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
