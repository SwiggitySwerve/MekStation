import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MultiUnitTabs } from '@/components/customizer/tabs/MultiUnitTabs';
import { useTabManagerStore, TabManagerState, TabInfo } from '@/stores/useTabManagerStore';
import { useRouter } from 'next/router';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ToastProvider } from '@/components/shared/Toast';
import { CustomizerTabId, DEFAULT_TAB } from '@/hooks/useCustomizerRouter';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/stores/useTabManagerStore', () => ({
  useTabManagerStore: jest.fn(),
}));

// Mock TabBar with click handlers to test tab selection
jest.mock('@/components/customizer/tabs/TabBar', () => ({
  TabBar: ({ onSelectTab, tabs, activeTabId }: { 
    onSelectTab: (id: string) => void; 
    tabs: { id: string; name: string }[];
    activeTabId: string | null;
  }) => (
    <div data-testid="tab-bar">
      {tabs.map((tab: { id: string; name: string }) => (
        <button 
          key={tab.id}
          data-testid={`tab-${tab.id}`}
          data-active={tab.id === activeTabId}
          onClick={() => onSelectTab(tab.id)}
        >
          {tab.name}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/components/customizer/tabs/NewTabModal', () => ({
  NewTabModal: () => <div data-testid="new-tab-modal" />,
}));

jest.mock('@/components/customizer/dialogs/UnsavedChangesDialog', () => ({
  UnsavedChangesDialog: () => <div data-testid="unsaved-changes-dialog" />,
}));

jest.mock('@/components/customizer/dialogs/SaveUnitDialog', () => ({
  SaveUnitDialog: () => <div data-testid="save-unit-dialog" />,
}));

jest.mock('@/components/customizer/dialogs/UnitLoadDialog', () => ({
  UnitLoadDialog: () => <div data-testid="unit-load-dialog" />,
}));

jest.mock('@/components/vault/ExportDialog', () => ({
  ExportDialog: () => <div data-testid="export-dialog" />,
}));

jest.mock('@/components/vault/ImportDialog', () => ({
  ImportDialog: () => <div data-testid="import-dialog" />,
}));

describe('MultiUnitTabs', () => {
  const mockUseTabManagerStore = useTabManagerStore as jest.MockedFunction<typeof useTabManagerStore>;
  const mockRouter = {
    push: jest.fn(),
    query: {},
  };

  const mockTab1: TabInfo = {
    id: 'tab-1',
    name: 'Atlas AS7-D',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    unitType: UnitType.BATTLEMECH,
    lastSubTab: 'armor',
  };

  const mockTab2: TabInfo = {
    id: 'tab-2',
    name: 'Locust LCT-1V',
    tonnage: 20,
    techBase: TechBase.INNER_SPHERE,
    unitType: UnitType.BATTLEMECH,
    lastSubTab: 'preview',
  };

  const createMockTabManager = (overrides?: Partial<TabManagerState>): TabManagerState => ({
    tabs: [mockTab1],
    activeTabId: 'tab-1',
    isLoading: false,
    isNewTabModalOpen: false,
    selectTab: jest.fn(),
    closeTab: jest.fn(),
    renameTab: jest.fn(),
    createTab: jest.fn(),
    duplicateTab: jest.fn(),
    reorderTabs: jest.fn(),
    addTab: jest.fn(),
    openNewTabModal: jest.fn(),
    closeNewTabModal: jest.fn(),
    getActiveTab: jest.fn(() => mockTab1),
    setLoading: jest.fn(),
    setLastSubTab: jest.fn(),
    getLastSubTab: jest.fn((tabId: string) => {
      if (tabId === 'tab-1') return 'armor';
      if (tabId === 'tab-2') return 'preview';
      return undefined;
    }),
    ...overrides,
  });

  let mockTabManager: TabManagerState;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTabManager = createMockTabManager();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockUseTabManagerStore.mockImplementation((selector: (state: typeof mockTabManager) => unknown) => {
      if (typeof selector === 'function') {
        return selector(mockTabManager);
      }
      return undefined;
    });
  });

  const renderWithToast = (ui: React.ReactElement) => {
    return render(<ToastProvider>{ui}</ToastProvider>);
  };

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================
  describe('Basic Rendering', () => {
    it('should render tab bar', () => {
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
    });

    it('should render children content', () => {
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render new tab modal when open', () => {
      mockTabManager = createMockTabManager({ isNewTabModalOpen: true });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      expect(screen.getByTestId('new-tab-modal')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderWithToast(<MultiUnitTabs className="custom-class"><div>Content</div></MultiUnitTabs>);
      
      const tabs = container.firstChild;
      expect(tabs).toHaveClass('custom-class');
    });

    it('should render loading state', () => {
      mockTabManager = createMockTabManager({ isLoading: true });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render empty state when no tabs', () => {
      mockTabManager = createMockTabManager({ tabs: [], activeTabId: null });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      expect(screen.getByText('No Units Open')).toBeInTheDocument();
    });
  });

  // ===========================================================================
  // Tab Selection with lastSubTab Tests
  // ===========================================================================
  describe('Tab Selection with lastSubTab', () => {
    it('should call selectTab and navigate when clicking a tab', () => {
      mockTabManager = createMockTabManager({ tabs: [mockTab1, mockTab2] });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      // Click on second tab
      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);
      
      // Should have called selectTab
      expect(mockTabManager.selectTab).toHaveBeenCalledWith('tab-2');
    });

    it('should call getLastSubTab when selecting a tab', () => {
      mockTabManager = createMockTabManager({ tabs: [mockTab1, mockTab2] });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);
      
      // Should have called getLastSubTab to determine navigation target
      expect(mockTabManager.getLastSubTab).toHaveBeenCalledWith('tab-2');
    });

    it('should navigate to lastSubTab when selecting a tab with stored sub-tab', () => {
      const getLastSubTabMock = jest.fn((tabId: string) => {
        if (tabId === 'tab-2') return 'preview';
        return undefined;
      });
      
      mockTabManager = createMockTabManager({ 
        tabs: [mockTab1, mockTab2],
        getLastSubTab: getLastSubTabMock,
      });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);
      
      // Should navigate to the unit with its stored lastSubTab
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/customizer/tab-2/preview',
        undefined,
        { shallow: true }
      );
    });

    it('should navigate to DEFAULT_TAB when selecting a tab without stored sub-tab', () => {
      const getLastSubTabMock = jest.fn(() => undefined);
      
      mockTabManager = createMockTabManager({ 
        tabs: [mockTab1, mockTab2],
        getLastSubTab: getLastSubTabMock,
      });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);
      
      // Should navigate to the unit with DEFAULT_TAB (structure)
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/customizer/tab-2/${DEFAULT_TAB}`,
        undefined,
        { shallow: true }
      );
    });

    it('should handle invalid lastSubTab by falling back to DEFAULT_TAB', () => {
      const getLastSubTabMock = jest.fn(() => 'invalid-tab-id');
      
      mockTabManager = createMockTabManager({ 
        tabs: [mockTab1, mockTab2],
        getLastSubTab: getLastSubTabMock,
      });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);
      
      // Should fall back to DEFAULT_TAB for invalid lastSubTab
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/customizer/tab-2/${DEFAULT_TAB}`,
        undefined,
        { shallow: true }
      );
    });
  });

  // ===========================================================================
  // Multiple Tab Operations Tests
  // ===========================================================================
  describe('Multiple Tab Operations', () => {
    it('should render all tabs in the tab bar', () => {
      mockTabManager = createMockTabManager({ tabs: [mockTab1, mockTab2] });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      expect(screen.getByTestId('tab-tab-1')).toBeInTheDocument();
      expect(screen.getByTestId('tab-tab-2')).toBeInTheDocument();
    });

    it('should mark active tab correctly', () => {
      mockTabManager = createMockTabManager({ 
        tabs: [mockTab1, mockTab2],
        activeTabId: 'tab-1',
      });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      const tab1 = screen.getByTestId('tab-tab-1');
      const tab2 = screen.getByTestId('tab-tab-2');
      
      expect(tab1).toHaveAttribute('data-active', 'true');
      expect(tab2).toHaveAttribute('data-active', 'false');
    });
  });

  // ===========================================================================
  // Empty State Tests
  // ===========================================================================
  describe('Empty State', () => {
    it('should show New Unit and Load from Library buttons', () => {
      mockTabManager = createMockTabManager({ tabs: [], activeTabId: null });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      expect(screen.getByText('New Unit')).toBeInTheDocument();
      expect(screen.getByText('Load from Library')).toBeInTheDocument();
    });

    it('should open new tab modal when clicking New Unit in empty state', () => {
      mockTabManager = createMockTabManager({ tabs: [], activeTabId: null });
      
      renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
      
      const newUnitButton = screen.getByText('New Unit');
      fireEvent.click(newUnitButton);
      
      expect(mockTabManager.openNewTabModal).toHaveBeenCalled();
    });
  });
});

