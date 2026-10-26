import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/router';
import React from 'react';

import { UnitEditStatusSlot } from '@/components/customizer/shared/UnitEditStatusSlot';
import {
  MultiUnitTabs,
  TargetedSaveUnitDialog,
} from '@/components/customizer/tabs/MultiUnitTabs';
import { ToastProvider } from '@/components/shared/Toast';
import { DEFAULT_TAB } from '@/hooks/useCustomizerRouter';
import { useUnitValidation } from '@/hooks/useUnitValidation';
import { getUnitStore } from '@/stores/unitStoreRegistry';
import {
  useTabManagerStore,
  TabManagerState,
  TabInfo,
} from '@/stores/useTabManagerStore';
import {
  createNewUnitStore,
  UnitStoreContext,
  useUnitStoreApi,
} from '@/stores/useUnitStore';
import { TechBase } from '@/types/enums/TechBase';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/stores/useTabManagerStore', () => ({
  useTabManagerStore: jest.fn(),
}));

jest.mock('@/hooks/useUnitValidation', () => ({
  useUnitValidation: jest.fn(),
}));

jest.mock('@/stores/unitStoreRegistry', () => ({
  ...jest.requireActual('@/stores/unitStoreRegistry'),
  getUnitStore: jest.fn(),
}));

// Mock TabBar with click handlers to test tab selection
jest.mock('@/components/customizer/tabs/TabBar', () => ({
  TabBar: ({
    onSelectTab,
    tabs,
    activeTabId,
  }: {
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
  SaveUnitDialog: ({
    isOpen,
    initialChassis,
    initialVariant,
    currentUnitId,
    constructionValidation,
    onSave,
  }: {
    isOpen: boolean;
    initialChassis: string;
    initialVariant: string;
    currentUnitId?: string;
    constructionValidation: {
      isValid: boolean;
      isLoading: boolean;
      isValidating: boolean;
    };
    onSave: (chassis: string, variant: string) => void;
  }) => {
    if (!isOpen) return null;
    const canSave =
      constructionValidation.isValid &&
      !constructionValidation.isLoading &&
      !constructionValidation.isValidating;
    return (
      <button
        data-testid="save-unit-dialog"
        data-chassis={initialChassis}
        data-variant={initialVariant}
        data-unit-id={currentUnitId}
        disabled={!canSave}
        onClick={() => onSave('Test', 'TST-1')}
      >
        Save
      </button>
    );
  },
}));

jest.mock('@/components/customizer/dialogs/UnitLoadDialog', () => ({
  UnitLoadDialog: ({ isOpen }: { isOpen: boolean }) => (
    <div data-testid="unit-load-dialog" data-open={isOpen} />
  ),
}));

jest.mock('@/components/vault/ExportDialog', () => ({
  ExportDialog: () => <div data-testid="export-dialog" />,
}));

jest.mock('@/components/vault/ImportDialog', () => ({
  ImportDialog: () => <div data-testid="import-dialog" />,
}));

describe('MultiUnitTabs', () => {
  const mockUseTabManagerStore = useTabManagerStore as jest.MockedFunction<
    typeof useTabManagerStore
  >;
  const mockUseUnitValidation = useUnitValidation as jest.MockedFunction<
    typeof useUnitValidation
  >;
  const mockGetUnitStore = getUnitStore as jest.MockedFunction<
    typeof getUnitStore
  >;
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

  const createMockTabManager = (
    overrides?: Partial<TabManagerState>,
  ): TabManagerState => ({
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
    mockUseUnitValidation.mockReturnValue({
      status: 'valid',
      isValid: true,
      hasCriticalErrors: false,
      isLoading: false,
      isValidating: false,
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      result: null,
    });
    mockTabManager = createMockTabManager();
    Object.assign(mockUseTabManagerStore, {
      getState: () => mockTabManager,
    });
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    mockUseTabManagerStore.mockImplementation(
      (selector: (state: typeof mockTabManager) => unknown) => {
        if (typeof selector === 'function') {
          return selector(mockTabManager);
        }
        return undefined;
      },
    );
  });

  const renderWithToast = (ui: React.ReactElement) => {
    return render(<ToastProvider>{ui}</ToastProvider>);
  };

  describe('Targeted save validation', () => {
    it('validates the save target instead of the active unit store', () => {
      const activeStore = createNewUnitStore({
        name: 'Active Unit',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      });
      const targetStore = createNewUnitStore({
        name: 'Save Target',
        tonnage: 20,
        techBase: TechBase.INNER_SPHERE,
      });
      const onSave = jest.fn();

      mockGetUnitStore.mockReturnValue(targetStore);
      mockUseUnitValidation.mockImplementation(() => {
        const validatedStore = useUnitStoreApi();
        const isTargetStore = validatedStore === targetStore;
        return {
          status: isTargetStore ? 'error' : 'valid',
          isValid: !isTargetStore,
          hasCriticalErrors: false,
          isLoading: false,
          isValidating: false,
          errorCount: isTargetStore ? 1 : 0,
          warningCount: 0,
          infoCount: 0,
          result: null,
        };
      });

      render(
        <UnitStoreContext.Provider value={activeStore}>
          <TargetedSaveUnitDialog
            isOpen
            initialChassis="Test"
            initialVariant="TST-1"
            currentUnitId={targetStore.getState().id}
            onSave={onSave}
            onCancel={jest.fn()}
          />
        </UnitStoreContext.Provider>,
      );

      expect(mockGetUnitStore).toHaveBeenCalledWith(targetStore.getState().id);
      expect(screen.getByTestId('save-unit-dialog')).toBeDisabled();
      fireEvent.click(screen.getByTestId('save-unit-dialog'));
      expect(onSave).not.toHaveBeenCalled();
    });

    it('fails closed when the save target store is missing', () => {
      const onSave = jest.fn();
      mockGetUnitStore.mockReturnValue(undefined);

      render(
        <TargetedSaveUnitDialog
          isOpen
          initialChassis="Missing"
          initialVariant="MISS-1"
          currentUnitId="missing-unit"
          onSave={onSave}
          onCancel={jest.fn()}
        />,
      );

      expect(screen.getByTestId('save-unit-dialog')).toBeDisabled();
      fireEvent.click(screen.getByTestId('save-unit-dialog'));
      expect(onSave).not.toHaveBeenCalled();
      expect(mockUseUnitValidation).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Basic Rendering Tests
  // ===========================================================================
  describe('Basic Rendering', () => {
    it('should render tab bar', () => {
      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
    });

    it('hosts edit history in a layout slot and keeps its own row without one', () => {
      mockGetUnitStore.mockReturnValue(
        createNewUnitStore({
          name: 'Slot Mech',
          tonnage: 50,
          techBase: TechBase.INNER_SPHERE,
        }),
      );
      const { rerender } = renderWithToast(
        <MultiUnitTabs>
          <div>Vehicle editor</div>
        </MultiUnitTabs>,
      );
      expect(screen.queryByTestId('unit-edit-status-slot')).toBeNull();
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveTextContent(
        'Undo',
      );
      // Desktop names the save state beside Save, in the shared wording.
      expect(screen.getByTestId('unit-save-label')).toHaveTextContent(
        'Not in library',
      );

      rerender(
        <ToastProvider>
          <MultiUnitTabs>
            <UnitEditStatusSlot />
          </MultiUnitTabs>
        </ToastProvider>,
      );
      const slot = screen.getByTestId('unit-edit-status-slot');
      expect(
        screen.getAllByRole('group', { name: 'Edit history' }),
      ).toHaveLength(1);
      expect(slot).toContainElement(
        screen.getByRole('group', { name: 'Edit history' }),
      );
      expect(screen.getByRole('button', { name: 'Undo' })).toHaveTextContent(
        '',
      );
      // The slot hosts history only; desktop save state stays on Save.
      expect(slot).not.toHaveTextContent('Not in library');
      expect(
        screen.getByRole('button', { name: 'Save active unit to library' }),
      ).toHaveAccessibleDescription(/Not in library/);
    });

    it('should render children content', () => {
      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render new tab modal when open', () => {
      mockTabManager = createMockTabManager({ isNewTabModalOpen: true });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      expect(screen.getByTestId('new-tab-modal')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      const { container } = renderWithToast(
        <MultiUnitTabs className="custom-class">
          <div>Content</div>
        </MultiUnitTabs>,
      );

      const tabs = container.firstChild;
      expect(tabs).toHaveClass('custom-class');
    });

    it('should render loading state', () => {
      mockTabManager = createMockTabManager({ isLoading: true });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render empty state when no tabs', () => {
      mockTabManager = createMockTabManager({ tabs: [], activeTabId: null });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      expect(screen.getByText('No Units Open')).toBeInTheDocument();
      // One subtitle sentence, not two overlapping paragraphs.
      const heading = screen.getByRole('heading', { name: 'No Units Open' });
      expect(heading.parentElement?.querySelectorAll('p')).toHaveLength(1);
    });
  });

  describe('Library save action', () => {
    it('opens the active BattleMech save dialog with its current identity', () => {
      const activeStore = createNewUnitStore({
        id: 'tab-1',
        name: 'Atlas AS7-D',
        tonnage: 100,
        techBase: TechBase.INNER_SPHERE,
      });
      activeStore.setState({ chassis: 'Atlas', model: 'AS7-D' });
      mockGetUnitStore.mockReturnValue(activeStore);

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      const saveButton = screen.getByRole('button', {
        name: 'Save active unit to library',
      });
      expect(saveButton).toBeEnabled();
      fireEvent.click(saveButton);

      expect(mockGetUnitStore).toHaveBeenCalledWith('tab-1');
      expect(screen.getByTestId('save-unit-dialog')).toHaveAttribute(
        'data-chassis',
        'Atlas',
      );
      expect(screen.getByTestId('save-unit-dialog')).toHaveAttribute(
        'data-variant',
        'AS7-D',
      );
      expect(screen.getByTestId('save-unit-dialog')).toHaveAttribute(
        'data-unit-id',
        'tab-1',
      );
    });

    it('gives unsupported unit families an accessible disabled reason', () => {
      const vehicleTab = { ...mockTab1, unitType: UnitType.VEHICLE };
      mockTabManager = createMockTabManager({
        tabs: [vehicleTab],
        activeTabId: vehicleTab.id,
      });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      const saveButton = screen.getByRole('button', {
        name: 'Save active unit to library',
      });
      expect(saveButton).toBeDisabled();
      expect(saveButton).toHaveAccessibleDescription(
        expect.stringMatching(/not available.*browser draft remains open/i),
      );
      // The instant hint leads with the reason instead of a native title.
      expect(saveButton).not.toHaveAttribute('title');
      expect(saveButton.querySelector('[data-toolbar-hint]')).toHaveTextContent(
        /not available/i,
      );
    });
  });

  // ===========================================================================
  // Tab Selection with lastSubTab Tests
  // ===========================================================================
  describe('Tab Selection with lastSubTab', () => {
    it('navigates before URL synchronization selects the requested unit', () => {
      mockTabManager = createMockTabManager({ tabs: [mockTab1, mockTab2] });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      // Click on second tab
      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);

      expect(mockRouter.push).toHaveBeenCalledWith(
        '/customizer/tab-2/preview',
        undefined,
        { shallow: true },
      );
      expect(mockTabManager.selectTab).not.toHaveBeenCalled();
    });

    it('should call getLastSubTab when selecting a tab', () => {
      mockTabManager = createMockTabManager({ tabs: [mockTab1, mockTab2] });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

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

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);

      // Should navigate to the unit with its stored lastSubTab
      expect(mockRouter.push).toHaveBeenCalledWith(
        '/customizer/tab-2/preview',
        undefined,
        { shallow: true },
      );
    });

    it('should navigate to DEFAULT_TAB when selecting a tab without stored sub-tab', () => {
      const getLastSubTabMock = jest.fn(() => undefined);

      mockTabManager = createMockTabManager({
        tabs: [mockTab1, mockTab2],
        getLastSubTab: getLastSubTabMock,
      });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);

      // Should navigate to the unit with DEFAULT_TAB (structure)
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/customizer/tab-2/${DEFAULT_TAB}`,
        undefined,
        { shallow: true },
      );
    });

    it('should handle invalid lastSubTab by falling back to DEFAULT_TAB', () => {
      const getLastSubTabMock = jest.fn(() => 'invalid-tab-id');

      mockTabManager = createMockTabManager({
        tabs: [mockTab1, mockTab2],
        getLastSubTab: getLastSubTabMock,
      });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      const tab2Button = screen.getByTestId('tab-tab-2');
      fireEvent.click(tab2Button);

      // Should fall back to DEFAULT_TAB for invalid lastSubTab
      expect(mockRouter.push).toHaveBeenCalledWith(
        `/customizer/tab-2/${DEFAULT_TAB}`,
        undefined,
        { shallow: true },
      );
    });
  });

  // ===========================================================================
  // Multiple Tab Operations Tests
  // ===========================================================================
  describe('Multiple Tab Operations', () => {
    it('should render all tabs in the tab bar', () => {
      mockTabManager = createMockTabManager({ tabs: [mockTab1, mockTab2] });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      expect(screen.getByTestId('tab-tab-1')).toBeInTheDocument();
      expect(screen.getByTestId('tab-tab-2')).toBeInTheDocument();
    });

    it('should mark active tab correctly', () => {
      mockTabManager = createMockTabManager({
        tabs: [mockTab1, mockTab2],
        activeTabId: 'tab-1',
      });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

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
    it('should show Add unit and Load from Library buttons', () => {
      mockTabManager = createMockTabManager({ tabs: [], activeTabId: null });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      expect(screen.getByText('Add unit')).toBeInTheDocument();
      expect(screen.getByText('Load from Library')).toBeInTheDocument();
    });

    it('opens the shared Add unit flow from Add unit in the empty state', () => {
      mockTabManager = createMockTabManager({ tabs: [], activeTabId: null });

      renderWithToast(
        <MultiUnitTabs>
          <div>Content</div>
        </MultiUnitTabs>,
      );

      const newUnitButton = screen.getByText('Add unit');
      fireEvent.click(newUnitButton);

      expect(screen.getByTestId('unit-load-dialog')).toHaveAttribute(
        'data-open',
        'true',
      );
      expect(mockTabManager.openNewTabModal).not.toHaveBeenCalled();
    });
  });
});
