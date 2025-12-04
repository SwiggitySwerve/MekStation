import React from 'react';
import { render, screen } from '@testing-library/react';
import { MultiUnitTabs } from '@/components/customizer/tabs/MultiUnitTabs';
import { useTabManagerStore } from '@/stores/useTabManagerStore';
import { useRouter } from 'next/router';

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
  const mockRouter = {
    push: jest.fn(),
    query: {},
  };

  const mockTabManager = {
    tabs: [
      { id: 'tab-1', name: 'Atlas AS7-D', isModified: false },
    ],
    activeTabId: 'tab-1',
    isLoading: false,
    isNewTabModalOpen: false,
    selectTab: jest.fn(),
    closeTab: jest.fn(),
    renameTab: jest.fn(),
    createTab: jest.fn(),
    openNewTabModal: jest.fn(),
    closeNewTabModal: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useTabManagerStore as jest.Mock).mockImplementation((selector: (state: typeof mockTabManager) => unknown) => {
      if (typeof selector === 'function') {
        return selector(mockTabManager);
      }
      return undefined;
    });
  });

  it('should render tab bar', () => {
    render(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
    
    expect(screen.getByTestId('tab-bar')).toBeInTheDocument();
  });

  it('should render children content', () => {
    render(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
    
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('should render new tab modal when open', () => {
    (useTabManagerStore as jest.Mock).mockImplementation((selector: (state: typeof mockTabManager & { isNewTabModalOpen: boolean }) => unknown) => {
      if (typeof selector === 'function') {
        return selector({ ...mockTabManager, isNewTabModalOpen: true });
      }
      return undefined;
    });
    
    render(<MultiUnitTabs><div>Content</div></MultiUnitTabs>);
    
    expect(screen.getByTestId('new-tab-modal')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<MultiUnitTabs className="custom-class"><div>Content</div></MultiUnitTabs>);
    
    const tabs = container.firstChild;
    expect(tabs).toHaveClass('custom-class');
  });
});

