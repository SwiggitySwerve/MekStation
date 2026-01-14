import React from 'react';
import { render, screen } from '@testing-library/react';
import { MultiUnitTabs } from '@/components/customizer/tabs/MultiUnitTabs';
import { useTabManagerStore, TabManagerState, TabInfo } from '@/stores/useTabManagerStore';
import { useRouter } from 'next/router';
import { TechBase } from '@/types/enums/TechBase';
import { ToastProvider } from '@/components/shared/Toast';

// Mock dependencies
jest.mock('next/router', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/stores/useTabManagerStore', () => ({
  useTabManagerStore: jest.fn(),
}));

jest.mock('@/components/customizer/tabs/TabBar', () => ({
  TabBar: () => <div data-testid="tab-bar" />,
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

describe('MultiUnitTabs', () => {
  const mockUseTabManagerStore = useTabManagerStore as jest.MockedFunction<typeof useTabManagerStore>;
  const mockRouter = {
    push: jest.fn(),
    query: {},
  };

  const mockTab: TabInfo = {
    id: 'tab-1',
    name: 'Atlas AS7-D',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
  };

  const mockTabManager: TabManagerState = {
    tabs: [mockTab],
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
    getActiveTab: jest.fn(() => mockTab),
    setLoading: jest.fn(),
    setLastSubTab: jest.fn(),
    getLastSubTab: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
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

  it('should render tab bar', () => {
    renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
    
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
  });

  it('should render children content', () => {
    renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render new tab modal when open', () => {
    mockUseTabManagerStore.mockImplementation((selector: (state: typeof mockTabManager & { isNewTabModalOpen: boolean }) => unknown) => {
      if (typeof selector === 'function') {
        return selector({ ...mockTabManager, isNewTabModalOpen: true });
      }
      return undefined;
    });
    
    renderWithToast(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
    
    expect(screen.getByTestId('new-tab-modal')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = renderWithToast(<MultiUnitTabs className="custom-class"><div>Content</div></MultiUnitTabs>);
    
    const tabs = container.firstChild;
    expect(tabs).toHaveClass('custom-class');
  });
});

