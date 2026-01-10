import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNavBar } from '../../../components/mobile/BottomNavBar';
import { useNavigationStore } from '../../../stores/navigationStore';
import { useDeviceCapabilities } from '../../../hooks/useDeviceCapabilities';

// Mock dependencies
jest.mock('../../../stores/navigationStore');
jest.mock('../../../hooks/useDeviceCapabilities');

describe('BottomNavBar', () => {
  const mockPushPanel = jest.fn();
  const mockUseNavigationStore = useNavigationStore as jest.MockedFunction<typeof useNavigationStore>;
  const mockUseDeviceCapabilities = useDeviceCapabilities as jest.MockedFunction<typeof useDeviceCapabilities>;

  // Sample tabs for testing
  const sampleTabs = [
    { id: 'structure', icon: <span data-testid="icon-structure">S</span>, label: 'Structure', panelId: 'structure' },
    { id: 'armor', icon: <span data-testid="icon-armor">A</span>, label: 'Armor', panelId: 'armor' },
    { id: 'equipment', icon: <span data-testid="icon-equipment">E</span>, label: 'Equipment', panelId: 'equipment' },
  ];

  beforeEach(() => {
    mockUseDeviceCapabilities.mockReturnValue({
      hasTouch: true,
      hasMouse: false,
      isMobile: true,
    });

    mockUseNavigationStore.mockReturnValue({
      history: [{ id: 'structure' }],
      currentIndex: 0,
      currentPanel: 'structure',
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
      mockUseDeviceCapabilities.mockReturnValue({
        hasTouch: false,
        hasMouse: true,
        isMobile: false,
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

      expect(screen.getByText('Structure')).toBeInTheDocument();
      expect(screen.getByText('Armor')).toBeInTheDocument();
      expect(screen.getByText('Equipment')).toBeInTheDocument();
    });

    it('should render tab icons', () => {
      render(<BottomNavBar tabs={sampleTabs} />);

      expect(screen.getByTestId('icon-structure')).toBeInTheDocument();
      expect(screen.getByTestId('icon-armor')).toBeInTheDocument();
      expect(screen.getByTestId('icon-equipment')).toBeInTheDocument();
    });

    it('should highlight active tab', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'structure' }],
        currentIndex: 0,
        currentPanel: 'structure',
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
      const structureButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Structure')
      );

      expect(structureButton).toHaveClass('text-blue-600');
    });

    it('should not highlight inactive tabs', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const armorButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Armor')
      );

      expect(armorButton).not.toHaveClass('text-blue-600');
      expect(armorButton).toHaveClass('text-gray-600');
    });

    it('should update active tab when currentPanel changes', () => {
      const { rerender } = render(<BottomNavBar tabs={sampleTabs} />);

      // Initially structure is active
      let container = render(<BottomNavBar tabs={sampleTabs} />).container;
      let buttons = container.querySelectorAll('button');
      const structureButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Structure')
      );
      expect(structureButton).toHaveClass('text-blue-600');

      // Change to armor
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'structure' }, { id: 'armor' }],
        currentIndex: 1,
        currentPanel: 'armor',
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
      const armorButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Armor')
      );

      expect(armorButton).toHaveClass('text-blue-600');
    });
  });

  describe('tab interactions', () => {
    it('should call pushPanel when tapping inactive tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const armorButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Armor')
      );

      fireEvent.click(armorButton!);

      expect(mockPushPanel).toHaveBeenCalledWith('armor');
    });

    it('should not call pushPanel when tapping active tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const structureButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Structure')
      );

      fireEvent.click(structureButton!);

      expect(mockPushPanel).not.toHaveBeenCalled();
    });

    it('should push correct panelId for each tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');

      // Click armor tab
      fireEvent.click(Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Armor')
      )!);
      expect(mockPushPanel).toHaveBeenLastCalledWith('armor');

      // Click equipment tab
      fireEvent.click(Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Equipment')
      )!);
      expect(mockPushPanel).toHaveBeenLastCalledWith('equipment');
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

      expect(screen.getByLabelText('Structure')).toBeInTheDocument();
      expect(screen.getByLabelText('Armor')).toBeInTheDocument();
      expect(screen.getByLabelText('Equipment')).toBeInTheDocument();
    });

    it('should set aria-current on active tab', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');
      const structureButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Structure')
      );

      expect(structureButton).toHaveAttribute('aria-current', 'page');
    });

    it('should set aria-selected on tabs', () => {
      const { container } = render(<BottomNavBar tabs={sampleTabs} />);

      const buttons = container.querySelectorAll('button');

      buttons.forEach((button) => {
        expect(button).toHaveAttribute('aria-selected');
      });

      const structureButton = Array.from(buttons).find((btn) =>
        btn.textContent?.includes('Structure')
      );
      expect(structureButton).toHaveAttribute('aria-selected', 'true');
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
      const manyTabs = [
        ...sampleTabs,
        { id: 'weapons', icon: <span>W</span>, label: 'Weapons', panelId: 'weapons' },
        { id: 'ammo', icon: <span>A</span>, label: 'Ammo', panelId: 'ammo' },
      ];

      const { container } = render(<BottomNavBar tabs={manyTabs} />);

      const buttons = container.querySelectorAll('button');
      expect(buttons).toHaveLength(5);
    });

    it('should handle no active tab found', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'unknown' }],
        currentIndex: 0,
        currentPanel: 'unknown',
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

      const tabsWithCustomIcon = [
        { id: 'custom', icon: customIcon, label: 'Custom', panelId: 'custom' },
      ];

      render(<BottomNavBar tabs={tabsWithCustomIcon} />);

      expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    });
  });
});
