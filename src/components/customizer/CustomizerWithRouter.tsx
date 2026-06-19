/**
 * Customizer With Router
 *
 * Integrates URL routing with the unit customizer.
 * Handles navigation between units and tabs via URL.
 *
 * @spec openspec/specs/customizer-tabs/spec.md
 * @spec openspec/specs/unit-store-architecture/spec.md
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

import { ErrorBoundary } from '@/components/common';
// Components
import { MultiUnitTabs } from '@/components/customizer/tabs';
// Hooks
import { useAutoSaveIndicator } from '@/hooks/useAutoSaveIndicator';
// Router
import {
  useCustomizerRouter,
  CustomizerTabId,
  isValidTabId,
} from '@/hooks/useCustomizerRouter';
// Stores
import { useTabManagerStore, TabInfo } from '@/stores/useTabManagerStore';
import { logger } from '@/utils/logger';

import { UnitTypeRouter } from './UnitTypeRouter';

// =============================================================================
// Helpers
// =============================================================================

type SyncStateRef = MutableRefObject<{
  unitId: string | null;
  activeTabId: string | null;
}>;
type SyncingRef = MutableRefObject<boolean>;
type StoredSubTab = string | null | undefined;
type GetLastSubTab = (unitId: string) => StoredSubTab;
type SetLastSubTab = (unitId: string, tabId: CustomizerTabId) => void;
type NavigateToTab = (tabId: CustomizerTabId) => void;

interface UrlToStateSyncArgs {
  readonly routerIsReady: boolean;
  readonly isHydrated: boolean;
  readonly isLoading: boolean;
  readonly isSyncingRef: SyncingRef;
  readonly lastSyncedRef: SyncStateRef;
  readonly routerUnitId: string | null;
  readonly routerIsValid: boolean;
  readonly activeTabId: string | null;
  readonly tabs: readonly TabInfo[];
  readonly selectTab: (unitId: string) => void;
  readonly routerNavigateToIndex: () => void;
}

interface StateToUrlSyncArgs {
  readonly routerIsReady: boolean;
  readonly isHydrated: boolean;
  readonly isLoading: boolean;
  readonly isSyncingRef: SyncingRef;
  readonly lastSyncedRef: SyncStateRef;
  readonly activeTabId: string | null;
  readonly routerUnitId: string | null;
  readonly routerSyncUrl: (unitId: string, tabId: CustomizerTabId) => void;
  readonly getLastSubTab: GetLastSubTab;
}

function resetSyncFlag(isSyncingRef: SyncingRef): void {
  setTimeout(() => {
    isSyncingRef.current = false;
  }, 0);
}

function resolveDefaultTab(storedSubTab: StoredSubTab): CustomizerTabId {
  return storedSubTab && isValidTabId(storedSubTab)
    ? storedSubTab
    : 'structure';
}

function resolveEffectiveTabId(
  routerTabId: CustomizerTabId,
  storedSubTab: StoredSubTab,
): CustomizerTabId {
  return routerTabId !== 'structure'
    ? routerTabId
    : resolveDefaultTab(storedSubTab);
}

function findActiveTab(
  tabs: readonly TabInfo[],
  activeTabId: string | null,
): TabInfo | null {
  if (!activeTabId || tabs.length === 0) {
    return null;
  }
  return tabs.find((tab) => tab.id === activeTabId) ?? null;
}

function shouldSkipUrlToStateSync({
  routerIsReady,
  isHydrated,
  isLoading,
  isSyncingRef,
  lastSyncedRef,
  routerUnitId,
  activeTabId,
}: UrlToStateSyncArgs): boolean {
  if (!routerIsReady || !isHydrated || isLoading) return true;
  if (isSyncingRef.current) return true;
  return (
    lastSyncedRef.current.unitId === routerUnitId &&
    lastSyncedRef.current.activeTabId === activeTabId
  );
}

function syncUrlToState(args: UrlToStateSyncArgs): void {
  if (shouldSkipUrlToStateSync(args)) return;

  const {
    activeTabId,
    isSyncingRef,
    lastSyncedRef,
    routerIsValid,
    routerNavigateToIndex,
    routerUnitId,
    selectTab,
    tabs,
  } = args;

  if (!routerUnitId || !routerIsValid || routerUnitId === activeTabId) return;

  isSyncingRef.current = true;
  if (tabs.some((tab) => tab.id === routerUnitId)) {
    selectTab(routerUnitId);
    lastSyncedRef.current = {
      unitId: routerUnitId,
      activeTabId: routerUnitId,
    };
  } else {
    logger.warn('Unit not found in tabs:', routerUnitId);
    routerNavigateToIndex();
  }
  resetSyncFlag(isSyncingRef);
}

function shouldSkipStateToUrlSync({
  routerIsReady,
  isHydrated,
  isLoading,
  isSyncingRef,
  activeTabId,
  routerUnitId,
  lastSyncedRef,
}: StateToUrlSyncArgs): boolean {
  if (!routerIsReady || !isHydrated || isLoading) return true;
  if (isSyncingRef.current) return true;
  if (!activeTabId || routerUnitId === activeTabId) return true;
  return (
    lastSyncedRef.current.unitId === activeTabId &&
    lastSyncedRef.current.activeTabId === activeTabId
  );
}

function syncStateToUrl(args: StateToUrlSyncArgs): void {
  if (shouldSkipStateToUrlSync(args)) return;

  const {
    activeTabId,
    getLastSubTab,
    isSyncingRef,
    lastSyncedRef,
    routerSyncUrl,
  } = args;

  if (!activeTabId) return;

  isSyncingRef.current = true;
  routerSyncUrl(activeTabId, resolveDefaultTab(getLastSubTab(activeTabId)));
  lastSyncedRef.current = { unitId: activeTabId, activeTabId };
  resetSyncFlag(isSyncingRef);
}

function useActiveTab(
  tabs: readonly TabInfo[],
  activeTabId: string | null,
): TabInfo | null {
  return useMemo(() => findActiveTab(tabs, activeTabId), [tabs, activeTabId]);
}

function useUnitTabNavigation(
  activeTabId: string | null,
  setLastSubTab: SetLastSubTab,
  navigateToTab: NavigateToTab,
): NavigateToTab {
  return useCallback(
    (tabId) => {
      if (activeTabId) {
        setLastSubTab(activeTabId, tabId);
      }
      navigateToTab(tabId);
    },
    [activeTabId, setLastSubTab, navigateToTab],
  );
}

function LoadingCustomizerState(): React.ReactElement {
  return (
    <div className="bg-surface-deep flex min-h-screen items-center justify-center">
      <div className="text-text-theme-secondary">Loading customizer...</div>
    </div>
  );
}

function InvalidUnitState({
  onNavigateToIndex,
}: {
  readonly onNavigateToIndex: () => void;
}): React.ReactElement {
  return (
    <div className="bg-surface-deep flex min-h-screen items-center justify-center">
      <div className="text-text-theme-secondary p-8 text-center">
        <p className="mb-2 text-lg">Invalid unit ID</p>
        <p className="mb-4 text-sm">The requested unit could not be found.</p>
        <button
          onClick={onNavigateToIndex}
          className="bg-accent text-surface-deep hover:bg-accent-hover rounded px-4 py-2 transition-colors"
        >
          Go to Customizer
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Customizer with URL routing support
 * Runs only on client side (dynamically imported with SSR disabled)
 */
export default function CustomizerWithRouter(): React.ReactElement {
  const [isHydrated, setIsHydrated] = useState(false);

  // Tab manager store (for multi-unit tabs)
  const tabs = useTabManagerStore((s) => s.tabs);
  const activeTabId = useTabManagerStore((s) => s.activeTabId);
  const isLoading = useTabManagerStore((s) => s.isLoading);
  const selectTab = useTabManagerStore((s) => s.selectTab);
  const setLastSubTab = useTabManagerStore((s) => s.setLastSubTab);
  const getLastSubTab = useTabManagerStore((s) => s.getLastSubTab);

  // URL router - pass activeTabId as fallback for index page navigation
  // This enables tab switching even when on /customizer without unit ID in URL
  const router = useCustomizerRouter({ fallbackUnitId: activeTabId });

  // Prevent sync loops
  const isSyncingRef = useRef(false);
  const lastSyncedRef = useRef<{
    unitId: string | null;
    activeTabId: string | null;
  }>({
    unitId: null,
    activeTabId: null,
  });

  // Extract stable values from router to avoid dependency on router object
  const routerUnitId = router.unitId;
  const routerTabId = router.tabId;
  const routerIsValid = router.isValid;
  const routerIsIndex = router.isIndex;
  const routerIsReady = router.isReady;
  const routerSyncUrl = router.syncUrl;
  const routerNavigateToIndex = router.navigateToIndex;
  const routerNavigateToTab = router.navigateToTab;

  // Get effective tab ID: URL tab takes precedence, then stored lastSubTab, then default
  const effectiveUnitId = routerUnitId || activeTabId;
  const storedSubTab = effectiveUnitId
    ? getLastSubTab(effectiveUnitId)
    : undefined;
  // Use stored sub-tab only when URL has default 'structure' (meaning no explicit tab in URL)
  const effectiveTabId = resolveEffectiveTabId(routerTabId, storedSubTab);

  useAutoSaveIndicator();

  useEffect(() => {
    // `persist.rehydrate()` is async — only flip `isHydrated` once the
    // persisted tab state is actually restored. Flipping synchronously
    // (the old behavior) let the URL<->state sync effects below run against
    // the pre-rehydration store, which redirected valid full-page deep
    // links to the index or another unit (e2e triage RC15).
    void Promise.resolve(useTabManagerStore.persist.rehydrate()).then(() => {
      setIsHydrated(true);
    });
  }, []);

  // ==========================================================================
  // URL -> State Sync (only when URL changes from external navigation)
  // ==========================================================================

  useEffect(() => {
    // Wait for the Next router to parse the URL — before `isReady`,
    // `routerUnitId` is null even for a deep link (e2e triage RC15).
    syncUrlToState({
      routerIsReady,
      isHydrated,
      isLoading,
      isSyncingRef,
      lastSyncedRef,
      routerUnitId,
      routerIsValid,
      activeTabId,
      tabs,
      selectTab,
      routerNavigateToIndex,
    });
  }, [
    routerIsReady,
    isHydrated,
    isLoading,
    routerUnitId,
    routerIsValid,
    activeTabId,
    tabs,
    selectTab,
    routerNavigateToIndex,
  ]);

  // ==========================================================================
  // State -> URL Sync (only when active tab changes from user action)
  // ==========================================================================

  useEffect(() => {
    // NEVER State->URL sync before the router has parsed the URL: with an
    // empty `router.query` the deep-linked unit reads as null, and this
    // effect would `router.replace` the URL over to the stored active tab —
    // clobbering `/customizer/<id>[/<tab>]` deep links (e2e triage RC15).
    // Deep links must win; the URL->State effect above handles them once
    // `routerIsReady` flips.
    syncStateToUrl({
      routerIsReady,
      isHydrated,
      isLoading,
      isSyncingRef,
      lastSyncedRef,
      activeTabId,
      routerUnitId,
      routerSyncUrl,
      getLastSubTab,
    });
  }, [
    routerIsReady,
    isHydrated,
    isLoading,
    activeTabId,
    routerUnitId,
    routerSyncUrl,
    getLastSubTab,
  ]);

  const activeTab = useActiveTab(tabs, activeTabId);
  const handleTabChange = useUnitTabNavigation(
    activeTabId,
    setLastSubTab,
    routerNavigateToTab,
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  // Show loading during initial hydration. Also hold while the router
  // hasn't parsed the URL yet — rendering the stored active unit during
  // that window flashes the WRONG unit on a deep link (e2e triage RC15).
  if (!routerIsReady || !isHydrated || isLoading) {
    return <LoadingCustomizerState />;
  }

  // Invalid unit ID in URL
  if (!routerIsValid && !routerIsIndex) {
    return <InvalidUnitState onNavigateToIndex={routerNavigateToIndex} />;
  }

  return (
    <ErrorBoundary componentName="CustomizerWithRouter">
      <DndProvider backend={HTML5Backend}>
        <div className="bg-surface-deep flex min-h-screen flex-col">
          <MultiUnitTabs>
            <ErrorBoundary componentName="UnitTypeRouter">
              <UnitTypeRouter
                activeTab={activeTab}
                activeTabId={effectiveTabId}
                onTabChange={handleTabChange}
              />
            </ErrorBoundary>
          </MultiUnitTabs>
        </div>
      </DndProvider>
    </ErrorBoundary>
  );
}
