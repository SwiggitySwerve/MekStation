import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavBar, Tab } from '../../../components/mobile/BottomNavBar';
import { useNavigationStore, PanelId } from '../../../stores/navigationStore';
import { useDeviceType } from '../../../hooks/useDeviceType';

// Mock dependencies
jest.mock('../../../stores/navigationStore');
jest.mock('../../../hooks/useDeviceType');

describe('BottomNavBar', () => {
  const mockPushPanel = jest.fn();
  const mockUseNavigationStore = useNavigationStore as jest.MockedFunction<typeof useNavigationStore>;
  const mockUseDeviceType = useDeviceType as jest.MockedFunction<typeof useDeviceType>;

  // Sample tabs for testing - use valid PanelId values
  const sampleTabs: Tab[] = [
    { id: 'catalog', icon: <span data-testid="icon-catalog">C</span>, label: 'Catalog', panelId: 'catalog' },
    { id: 'editor', icon: <span data-testid="icon-editor">E</span>, label: 'Editor', panelId: 'editor' },
    { id: 'equipment-browser', icon: <span data-testid="icon-equipment">Q</span>, label: 'Equipment', panelId: 'equipment-browser' },
  ];

beforeEach(() => {
    mockUseDeviceType.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isTouch: true,
      hasMouse: false,
      isHybrid: false,
      viewportWidth: 375,
    });

    mockUseNavigationStore.mockReturnValue({
      history: [{ id: 'catalog' as PanelId }],
      currentIndex: 0,
      currentPanel: 'catalog' as PanelId,
      canGoBack: false,
      canGoForward: false,
      pushPanel: mockPushPanel,
      goBack: jest.fn(),
      goForward: jest.fn(),
      resetNavigation: jest.fn(),
      replacePanel: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('mobile rendering', () => {
    it('should render when isMobile is true', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav).toHaveClass('md:hidden');
    });

it('should not render when isMobile is false', () => {
      mockUseDeviceType.mockReturnValue({
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        hasMouse: true,
        isHybrid: false,
        viewportWidth: 1024,
      });

      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      expect(container.firstChild).toBeNull();
    });

    it('should have fixed positioning at bottom', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('fixed', 'bottom-0', 'left-0', 'right-0');
    });

    it('should have z-index of 50', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('z-50');
    });
  });

  describe('tabs rendering', () => {
    it('should render all tabs', () => {
      render(<BottomNavBar tabs={sampleTabs} />);

      expect(screen.getByText('Catalog')).toBeInTheDocument();
      expect(screen.getByText('Editor')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('should render tab icons', () => {
      render(<BottomNavBar tabs={sampleTabs} />);

      expect(screen.getByTestId('icon-catalog')).toBeInTheDocument();
      expect(screen.getByTestId('icon-editor')).toBeInTheDocument();
      expect(screen.getByTestId('icon-equipment')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' as PanelId }],
        currentIndex: 0,
        currentPanel: 'catalog' as PanelId,
        canGoBack: false,
        canGoForward: false,
        pushPanel: mockPushPanel,
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const catalogButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Catalog')
      );

      expect(catalogButton).toHaveClass('text-blue-600');
    });

    it('should not highlight inactive tabs', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const editorButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Editor')
      );

      expect(editorButton).not.toHaveClass('text-blue-600');
      expect(editorButton).toHaveClass('text-gray-600');
    });

    it('should update active tab when currentPanel changes', () => {
      const { rerender } = render(<BottomNavBar tabs={sampleTabs} />);

      // Initially catalog is active
      let container = render(<BottomNavBar tabs={sampleTabs} />).container;
      let buttons = container.querySelectorAll('button');
      const catalogButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Catalog')
      );
      expect(catalogButton).toHaveClass('text-blue-600');

      // Change to editor
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' as PanelId }, { id: 'editor' as PanelId }],
        currentIndex: 1,
        currentPanel: 'editor' as PanelId,
        canGoBack: true,
        canGoForward: false,
        pushPanel: mockPushPanel,
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      rerender(<BottomNavBar tabs={sampleTabs} />);
      container = render(<BottomNavBar tabs={sampleTabs} />).container;
      buttons = container.querySelectorAll('button');
      const editorButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Editor')
      );

      expect(editorButton).toHaveClass('text-blue-600');
    });
  });

  describe('tab interactions', () => {
    it('should call pushPanel when tapping inactive tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const editorButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Editor')
      );

      fireEvent.click(editorButton!);

      expect(mockPushPanel).toHaveBeenCalledWith('editor');
    });

    it('should not call pushPanel when tapping active tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const catalogButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Catalog')
      );

      fireEvent.click(catalogButton!);

      expect(mockPushPanel).not.toHaveBeenCalled();
    });

    it('should push correct panelId for each tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');

      // Click editor tab
      fireEvent.click(Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Editor')
      )!);
      expect(mockPushPanel).toHaveBeenLastCalledWith('editor');

      // Click equipment tab
      fireEvent.click(Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Equipment')
      )!);
      expect(mockPushPanel).toHaveBeenLastCalledWith('equipment-browser');
    });
  });

  describe('styling and layout', () => {
    it('should have minimum height of 56px', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveStyle({ minHeight: '56px' });
    });

    it('should apply safe-area padding to bottom', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveStyle({
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      });
    });

    it('should have border at top', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('border-t');
    });

    it('should have proper background colors for light/dark mode', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('bg-white', 'dark:bg-gray-900');
    });

    it('should have flex layout for tab distribution', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      const flexContainer = nav?.querySelector('.flex');
      expect(flexContainer).toHaveClass('justify-around');
    });

    it('should apply custom className', () => {
      const { container } = render(
        <BottomNavBar tabs={sampleTabs} className="custom-class" />
      );

      const nav = container.querySelector('nav');
      expect(nav).toHaveClass('custom-class');
    });
  });

  describe('accessibility', () => {
    it('should have nav role and aria-label', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const nav = container.querySelector('nav');
      expect(nav).toHaveAttribute('role', 'navigation');
      expect(nav).toHaveAttribute('aria-label', 'Editor tabs');
    });

    it('should have tab role on buttons', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('role', 'tab');
      });
    });

    it('should have aria-label on each tab', () => {
      render(<BottomNavBar tabs={sampleTabs} />);

      expect(screen.getByLabelText('Catalog')).toBeInTheDocument();
      expect(screen.getByLabelText('Editor')).toBeInTheDocument();
      expect(screen.getByLabelText('Equipment')).toBeInTheDocument();
    });

    it('should set aria-current on active tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const catalogButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Catalog')
      );

      expect(catalogButton).toHaveAttribute('aria-current', 'page');
    });

    it('should set aria-selected on tabs', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-selected');
      });

      const catalogButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Catalog')
      );
      expect(catalogButton).toHaveAttribute('aria-selected', 'true');
    });

    it('should hide icons from screen readers', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      // The icon wrapper divs have aria-hidden="true"
      const iconWrappers = container.querySelectorAll('[aria-hidden="true"]');
      expect(iconWrappers.length).toBeGreaterThan(0);
    });
  });

  describe('touch targets', () => {
    it('should have minimum touch target size of 44x44px', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toHaveClass('min-w-[44px]', 'min-h-[44px]');
      });
    });

    it('should be type button to prevent form submission', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).toHaveAttribute('type', 'button');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty tabs array', () => {
      const { container } = render(<BottomNavBar tabs={[]} />);

      const nav = container.querySelector('nav');
      expect(nav).toBeInTheDocument();
      expect(nav?.querySelectorAll('button')).toHaveLength(0);
    });

    it('should handle single tab', () => {
      const singleTab = [sampleTabs[0]];
      const { container } = render(<BottomNavBar tabs={singleTab} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(1);
    });

    it('should handle many tabs (flex distribution)', () => {
      const manyTabs: Tab[] = [
        ...sampleTabs,
        { id: 'sidebar', icon: <span>S</span>, label: 'Sidebar', panelId: 'sidebar' },
        { id: 'unit-detail', icon: <span>U</span>, label: 'Unit', panelId: 'unit-detail' },
      ];

      const { container } = render(<BottomNavBar tabs={manyTabs} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(5);
    });

    it('should handle no active tab found', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'sidebar' as PanelId }],
        currentIndex: 0,
        currentPanel: 'sidebar' as PanelId,
        canGoBack: false,
        canGoForward: false,
        pushPanel: mockPushPanel,
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      buttons.forEach((button) => {
        expect(button).not.toHaveClass('text-blue-600');
      });
    });

    it('should handle tabs with React elements as icons', () => {
      const customIcon = (
        <svg data-testid="custom-icon" viewBox="0 0 24 24" width="24" height="24">
          <circle cx="12" cy="12" r="10" />
        </svg>
      );

      const tabsWithCustomIcon: Tab[] = [
        { id: 'catalog', icon: customIcon, label: 'Custom', panelId: 'catalog' },
      ];

      render(<BottomNavBar tabs={tabsWithCustomIcon} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });
});
