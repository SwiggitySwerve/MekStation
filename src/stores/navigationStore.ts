import { create } from 'zustand';

/**
 * Panel identifiers for mobile navigation
 */
export type PanelId =
  | 'catalog'
  | 'unit-detail'
  | 'editor'
  | 'equipment-browser'
  | 'sidebar';

/**
 * Panel entry in navigation history
 */
interface PanelEntry {
  id: PanelId;
  /** Optional data to preserve/restore panel state */
  state?: Record<string, unknown>;
}

/**
 * Navigation state
 */
interface NavigationState {
  /** Array of panels in navigation history */
  history: PanelEntry[];
  /** Current panel index in history */
  currentIndex: number;
  /** Current panel ID (derived from history[currentIndex]) */
  currentPanel: PanelId;
  /** Whether back navigation is available */
  canGoBack: boolean;
  /** Whether forward navigation is available */
  canGoForward: boolean;
}

/**
 * Navigation actions
 */
interface NavigationActions {
  /** Push a new panel to the navigation stack */
  pushPanel: (panelId: PanelId, state?: Record<string, unknown>) => void;
  /** Navigate back to the previous panel */
  goBack: () => void;
  /** Navigate forward to the next panel (if available) */
  goForward: () => void;
  /** Reset navigation to default state */
  resetNavigation: () => void;
  /** Replace current panel (useful for redirects) */
  replacePanel: (panelId: PanelId, state?: Record<string, unknown>) => void;
}

/**
 * Navigation store state type
 */
type NavigationStore = NavigationState & NavigationActions;

/**
 * Default panel for mobile app
 */
const DEFAULT_PANEL: PanelId = 'catalog';

/**
 * Create navigation store with Zustand
 *
 * Manages panel stack navigation for mobile layout.
 * Provides push/pop navigation patterns similar to browser history.
 *
 * @example
 * ```tsx
 * const { currentPanel, pushPanel, goBack, canGoBack } = useNavigationStore();
 *
 * // Navigate to a new panel
 * pushPanel('unit-detail', { unitId: '123' });
 *
 * // Go back to previous panel
 * goBack();
 * ```
 */
export const useNavigationStore = create<NavigationStore>((set, get) => ({
  // Initial state
  history: [{ id: DEFAULT_PANEL }],
  currentIndex: 0,
  currentPanel: DEFAULT_PANEL,
  canGoBack: false,
  canGoForward: false,

  // Actions
  pushPanel: (panelId, state) => {
    const { history, currentIndex } = get();

    // If we're not at the end of history, truncate forward history
    const newHistory =
      currentIndex === history.length - 1
        ? [...history, { id: panelId, state }]
        : [...history.slice(0, currentIndex + 1), { id: panelId, state }];

    set({
      history: newHistory,
      currentIndex: newHistory.length - 1,
      currentPanel: panelId,
      canGoBack: newHistory.length > 1,
      canGoForward: false,
    });
  },

  goBack: () => {
    const { history, currentIndex } = get();

    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      const currentPanel = history[newIndex].id;

      set({
        currentIndex: newIndex,
        currentPanel,
        canGoBack: newIndex > 0,
        canGoForward: true,
      });
    }
  },

  goForward: () => {
    const { history, currentIndex } = get();

    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      const currentPanel = history[newIndex].id;

      set({
        currentIndex: newIndex,
        currentPanel,
        canGoBack: true,
        canGoForward: newIndex < history.length - 1,
      });
    }
  },

  resetNavigation: () => {
    set({
      history: [{ id: DEFAULT_PANEL }],
      currentIndex: 0,
      currentPanel: DEFAULT_PANEL,
      canGoBack: false,
      canGoForward: false,
    });
  },

  replacePanel: (panelId, state) => {
    const { history, currentIndex } = get();
    const newHistory = [...history];
    newHistory[currentIndex] = { id: panelId, state };

    set({
      history: newHistory,
      currentPanel: panelId,
    });
  },
}));
