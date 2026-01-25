/**
 * Tab Switching Test Helpers
 * 
 * Utilities for testing tab switching, URL synchronization, and sub-tab persistence.
 * These helpers simplify creating multi-unit test scenarios and verifying state.
 */

import { act } from '@testing-library/react';
import { useTabManagerStore, UNIT_TEMPLATES, TabInfo } from '@/stores/useTabManagerStore';
import { clearAllStores, getUnitStore, hasUnitStore } from '@/stores/unitStoreRegistry';
import { TechBase } from '@/types/enums/TechBase';
import { CustomizerTabId, VALID_TAB_IDS, DEFAULT_TAB } from '@/hooks/useCustomizerRouter';
import { setupMockLocalStorage, MockLocalStorage } from './storeTestHelpers';

// =============================================================================
// Types
// =============================================================================

/**
 * Test scenario with multiple units
 */
export interface TestScenario {
  /** Array of created tab IDs */
  tabIds: string[];
  /** Tab info for each unit */
  tabs: TabInfo[];
  /** Cleanup function */
  cleanup: () => void;
}

/**
 * Options for creating a mock unit with data
 */
export interface UnitDataOptions {
  name?: string;
  tonnage?: number;
  techBase?: TechBase;
  walkMP?: number;
  lastSubTab?: CustomizerTabId;
}

/**
 * Mock router state for testing URL synchronization
 */
export interface MockRouterState {
  pathname: string;
  query: { slug?: string[] };
  push: jest.Mock;
  replace: jest.Mock;
}

// =============================================================================
// Mock Router
// =============================================================================

/**
 * Create a mock Next.js router for testing
 */
export function createMockRouter(initialPath: string = '/customizer'): MockRouterState {
  const parsePathToQuery = (path: string): { slug?: string[] } => {
    const match = path.match(/^\/customizer(?:\/(.+))?$/);
    if (!match || !match[1]) {
      return {};
    }
    const slug = match[1].split('/');
    return { slug };
  };

  const mockRouter: MockRouterState = {
    pathname: initialPath,
    query: parsePathToQuery(initialPath),
    push: jest.fn((url: string) => {
      mockRouter.pathname = url;
      mockRouter.query = parsePathToQuery(url);
      return Promise.resolve(true);
    }),
    replace: jest.fn((url: string) => {
      mockRouter.pathname = url;
      mockRouter.query = parsePathToQuery(url);
      return Promise.resolve(true);
    }),
  };

  return mockRouter;
}

/**
 * Parse URL path to extract unitId and tabId
 */
export function parseCustomizerUrl(path: string): { unitId: string | null; tabId: CustomizerTabId } {
  const match = path.match(/^\/customizer(?:\/([^/]+))?(?:\/([^/]+))?$/);
  
  if (!match) {
    return { unitId: null, tabId: DEFAULT_TAB };
  }
  
  const unitId = match[1] || null;
  const tabId = match[2] as CustomizerTabId || DEFAULT_TAB;
  
  return { unitId, tabId };
}

/**
 * Verify URL matches expected state
 */
export function verifyUrlMatchesState(
  mockRouter: MockRouterState,
  expectedUnitId: string,
  expectedSubTab: CustomizerTabId
): void {
  const { unitId, tabId } = parseCustomizerUrl(mockRouter.pathname);
  expect(unitId).toBe(expectedUnitId);
  expect(tabId).toBe(expectedSubTab);
}

// =============================================================================
// Scenario Creation
// =============================================================================

/**
 * Create a test scenario with multiple units
 */
export function createMultiUnitScenario(unitCount: number): TestScenario {
  const mockStorage = setupMockLocalStorage();
  
  // Reset stores
  clearAllStores(true);
  useTabManagerStore.setState({
    tabs: [],
    activeTabId: null,
    isLoading: false,
    isNewTabModalOpen: false,
  });
  
  const tabIds: string[] = [];
  
  // Create units
  act(() => {
    for (let i = 0; i < unitCount; i++) {
      const template = UNIT_TEMPLATES[i % UNIT_TEMPLATES.length];
      const tabId = useTabManagerStore.getState().createTab(template, `Unit ${i + 1}`);
      tabIds.push(tabId);
    }
  });
  
  const tabs = useTabManagerStore.getState().tabs;
  
  return {
    tabIds,
    tabs,
    cleanup: () => {
      clearAllStores(true);
      mockStorage.cleanup();
    },
  };
}

/**
 * Create a mock unit with specific data options
 */
export function createMockUnitWithData(options: UnitDataOptions = {}): string {
  const {
    name = 'Test Unit',
    tonnage = 50,
    techBase = TechBase.INNER_SPHERE,
    walkMP = 4,
    lastSubTab,
  } = options;
  
  // Find matching template or use medium as fallback, then override with requested values
  const baseTemplate = UNIT_TEMPLATES.find(t => t.tonnage === tonnage) || UNIT_TEMPLATES[1];
  const customTemplate = { 
    ...baseTemplate, 
    tonnage, // Override with requested tonnage
    techBase,
    walkMP,
  };
  
  let tabId = '';
  act(() => {
    tabId = useTabManagerStore.getState().createTab(customTemplate, name);
    
    if (lastSubTab) {
      useTabManagerStore.getState().setLastSubTab(tabId, lastSubTab);
    }
  });
  
  return tabId;
}

// =============================================================================
// Tab Operations
// =============================================================================

/**
 * Simulate switching from one unit tab to another
 */
export function simulateTabSwitch(fromUnitId: string, toUnitId: string): void {
  act(() => {
    useTabManagerStore.getState().selectTab(toUnitId);
  });
}

/**
 * Simulate navigating to a sub-tab within a unit
 */
export function simulateSubTabNavigation(unitId: string, subTab: CustomizerTabId): void {
  act(() => {
    useTabManagerStore.getState().setLastSubTab(unitId, subTab);
  });
}

/**
 * Get the current active tab's lastSubTab
 */
export function getActiveSubTab(): string | undefined {
  const state = useTabManagerStore.getState();
  if (!state.activeTabId) return undefined;
  return state.getLastSubTab(state.activeTabId);
}

// =============================================================================
// Assertions
// =============================================================================

/**
 * Assert that each unit has the expected lastSubTab
 */
export function expectSubTabsMatch(
  expectedSubTabs: Record<string, CustomizerTabId>
): void {
  const state = useTabManagerStore.getState();
  
  for (const [tabId, expectedSubTab] of Object.entries(expectedSubTabs)) {
    const actualSubTab = state.getLastSubTab(tabId);
    expect(actualSubTab).toBe(expectedSubTab);
  }
}

/**
 * Assert that all units have their stores registered
 */
export function expectAllStoresRegistered(tabIds: string[]): void {
  for (const tabId of tabIds) {
    expect(hasUnitStore(tabId)).toBe(true);
    expect(getUnitStore(tabId)).not.toBeNull();
  }
}

/**
 * Assert that the active tab matches expected
 */
export function expectActiveTab(expectedTabId: string): void {
  const state = useTabManagerStore.getState();
  expect(state.activeTabId).toBe(expectedTabId);
}

/**
 * Assert that tab count matches expected
 */
export function expectTabCount(expectedCount: number): void {
  const state = useTabManagerStore.getState();
  expect(state.tabs.length).toBe(expectedCount);
}

// =============================================================================
// Valid Sub-tab Types
// =============================================================================

/**
 * All valid sub-tab types for testing
 */
export const ALL_VALID_SUB_TABS: CustomizerTabId[] = [...VALID_TAB_IDS];

/**
 * Commonly used sub-tabs for testing (excludes less common ones)
 */
export const COMMON_SUB_TABS: CustomizerTabId[] = [
  'structure',
  'armor',
  'equipment',
  'criticals',
  'preview',
];

// =============================================================================
// Store Reset Helpers
// =============================================================================

/**
 * Reset all tab-related stores to initial state
 */
export function resetTabStores(): void {
  clearAllStores(true);
  useTabManagerStore.setState({
    tabs: [],
    activeTabId: null,
    isLoading: false,
    isNewTabModalOpen: false,
  });
}

/**
 * Setup function for tab switching tests
 * Returns cleanup function
 */
export function setupTabSwitchingTest(): { 
  mockStorage: ReturnType<typeof setupMockLocalStorage>;
  cleanup: () => void;
} {
  const mockStorage = setupMockLocalStorage();
  resetTabStores();
  
  return {
    mockStorage,
    cleanup: () => {
      resetTabStores();
      mockStorage.cleanup();
    },
  };
}
