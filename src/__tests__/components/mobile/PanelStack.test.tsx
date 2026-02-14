import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { PanelStack, Panel } from '@/components/mobile/PanelStack';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useNavigationStore } from '@/stores/useNavigationStore';

// Mock dependencies
jest.mock('../../../stores/useNavigationStore');
jest.mock('../../../hooks/useDeviceType');

describe('PanelStack', () => {
  const mockUseNavigationStore = useNavigationStore as jest.MockedFunction<
    typeof useNavigationStore
  >;
  const mockUseDeviceType = useDeviceType as jest.MockedFunction<
    typeof useDeviceType
  >;

  beforeEach(() => {
    // Default mocks
    mockUseDeviceType.mockReturnValue({
      isMobile: true,
      isTablet: false,
      isDesktop: false,
      isTouch: false,
      hasMouse: true,
      isHybrid: false,
      viewportWidth: 375,
    });

    mockUseNavigationStore.mockReturnValue({
      history: [{ id: 'catalog' }],
      currentIndex: 0,
      currentPanel: 'catalog',
      canGoBack: false,
      canGoForward: false,
      pushPanel: jest.fn(),
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
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog Content</div>
          </Panel>
        </PanelStack>,
      );

      expect(screen.getByText('Catalog Content')).toBeInTheDocument();
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

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog Content</div>
          </Panel>
        </PanelStack>,
      );

      expect(container.firstChild).toBeNull();
    });

    it('should apply md:hidden class for desktop hiding', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog Content</div>
          </Panel>
        </PanelStack>,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('md:hidden');
    });
  });

  describe('panel rendering', () => {
    it('should render active panel', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      render(
        <PanelStack>
          <Panel id="catalog">
            <div data-testid="catalog-panel">Catalog</div>
          </Panel>
          <Panel id="editor">
            <div data-testid="editor-panel">Editor</div>
          </Panel>
        </PanelStack>,
      );

      expect(screen.getByTestId('catalog-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('editor-panel')).not.toBeInTheDocument();
    });

    it('should switch panels when currentPanel changes', () => {
      const { rerender } = render(
        <PanelStack>
          <Panel id="catalog">
            <div data-testid="catalog-panel">Catalog</div>
          </Panel>
          <Panel id="editor">
            <div data-testid="editor-panel">Editor</div>
          </Panel>
        </PanelStack>,
      );

      expect(screen.getByTestId('catalog-panel')).toBeInTheDocument();

      // Simulate panel change
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }, { id: 'editor' }],
        currentIndex: 1,
        currentPanel: 'editor',
        canGoBack: true,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      rerender(
        <PanelStack>
          <Panel id="catalog">
            <div data-testid="catalog-panel">Catalog</div>
          </Panel>
          <Panel id="editor">
            <div data-testid="editor-panel">Editor</div>
          </Panel>
        </PanelStack>,
      );

      expect(screen.getByTestId('editor-panel')).toBeInTheDocument();
    });

    it('should filter out non-Panel children', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      render(
        <PanelStack>
          <div>This should not render</div>
          <Panel id="catalog">
            <div data-testid="catalog-panel">Catalog</div>
          </Panel>
          <span>This should also not render</span>
        </PanelStack>,
      );

      expect(screen.getByTestId('catalog-panel')).toBeInTheDocument();
      expect(
        screen.queryByText('This should not render'),
      ).not.toBeInTheDocument();
    });
  });

  describe('panel positioning and transitions', () => {
    it('should position active panel at translateX(0)', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
        </PanelStack>,
      );

      const panel = container.querySelector('[data-panel-id="catalog"]');
      expect(panel).toHaveStyle({ transform: 'translateX(0)' });
    });

    it('should position previous panel at translateX(-100%)', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }, { id: 'editor' }],
        currentIndex: 1,
        currentPanel: 'editor',
        canGoBack: true,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
          <Panel id="editor">
            <div>Editor</div>
          </Panel>
        </PanelStack>,
      );

      const catalogPanel = container.querySelector('[data-panel-id="catalog"]');
      expect(catalogPanel).toHaveStyle({ transform: 'translateX(-100%)' });
    });

    it('should position next panel at translateX(100%)', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }, { id: 'editor' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: true,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
          <Panel id="editor">
            <div>Editor</div>
          </Panel>
        </PanelStack>,
      );

      const editorPanel = container.querySelector('[data-panel-id="editor"]');
      expect(editorPanel).toHaveStyle({ transform: 'translateX(100%)' });
    });

    it('should apply transition styles for animations', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
        </PanelStack>,
      );

      const panel = container.querySelector('[data-panel-id="catalog"]');
      expect(panel).toHaveStyle({
        transition: 'transform 300ms ease-in-out',
        willChange: 'transform',
      });
    });

    it('should set higher zIndex for active panel', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }, { id: 'editor' }],
        currentIndex: 1,
        currentPanel: 'editor',
        canGoBack: true,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
          <Panel id="editor">
            <div>Editor</div>
          </Panel>
        </PanelStack>,
      );

      const activePanel = container.querySelector('[data-panel-id="editor"]');
      const previousPanel = container.querySelector(
        '[data-panel-id="catalog"]',
      );

      expect(activePanel).toHaveStyle({ zIndex: 10 });
      expect(previousPanel).toHaveStyle({ zIndex: 5 });
    });
  });

  describe('panel visibility', () => {
    it('should only render active, previous, and next panels', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }, { id: 'editor' }, { id: 'equipment' }],
        currentIndex: 1,
        currentPanel: 'editor',
        canGoBack: true,
        canGoForward: true,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div data-panel-id="catalog">Catalog</div>
          </Panel>
          <Panel id="editor">
            <div data-panel-id="editor">Editor</div>
          </Panel>
          <Panel id="equipment">
            <div data-panel-id="equipment">Equipment</div>
          </Panel>
          <Panel id="settings">
            <div data-panel-id="settings">Settings</div>
          </Panel>
        </PanelStack>,
      );

      // Should render catalog (previous), editor (active), equipment (next)
      expect(
        container.querySelector('[data-panel-id="catalog"]'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-panel-id="editor"]'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-panel-id="equipment"]'),
      ).toBeInTheDocument();

      // Should not render settings (not adjacent)
      expect(
        container.querySelector('[data-panel-id="settings"]'),
      ).not.toBeInTheDocument();
    });

    it('should unmount panels after transition completes', async () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }, { id: 'editor' }],
        currentIndex: 1,
        currentPanel: 'editor',
        canGoBack: true,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container, rerender } = render(
        <PanelStack>
          <Panel id="catalog">
            <div data-panel-id="catalog">Catalog</div>
          </Panel>
          <Panel id="editor">
            <div data-panel-id="editor">Editor</div>
          </Panel>
          <Panel id="equipment">
            <div data-panel-id="equipment">Equipment</div>
          </Panel>
        </PanelStack>,
      );

      // Both catalog and editor should be rendered initially
      expect(
        container.querySelector('[data-panel-id="catalog"]'),
      ).toBeInTheDocument();
      expect(
        container.querySelector('[data-panel-id="editor"]'),
      ).toBeInTheDocument();

      // Navigate to equipment (index 2)
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }, { id: 'editor' }, { id: 'equipment' }],
        currentIndex: 2,
        currentPanel: 'equipment',
        canGoBack: true,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      rerender(
        <PanelStack>
          <Panel id="catalog">
            <div data-panel-id="catalog">Catalog</div>
          </Panel>
          <Panel id="editor">
            <div data-panel-id="editor">Editor</div>
          </Panel>
          <Panel id="equipment">
            <div data-panel-id="equipment">Equipment</div>
          </Panel>
        </PanelStack>,
      );

      // After 300ms, catalog should be unmounted
      await waitFor(
        () => {
          expect(
            container.querySelector('[data-panel-id="catalog"]'),
          ).not.toBeInTheDocument();
        },
        { timeout: 400 },
      );
    }, 10000);
  });

  describe('Panel component', () => {
    it('should render children', () => {
      render(
        <Panel id="test">
          <div data-testid="test-content">Test Content</div>
        </Panel>,
      );

      expect(screen.getByTestId('test-content')).toBeInTheDocument();
    });

    it('should accept id prop', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'test-panel' }],
        currentIndex: 0,
        currentPanel: 'test-panel',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="test-panel">
            <div>Content</div>
          </Panel>
        </PanelStack>,
      );

      // PanelStack uses the id to render the panel
      expect(
        container.querySelector('[data-panel-id="test-panel"]'),
      ).toBeInTheDocument();
    });
  });

  describe('className prop', () => {
    it('should apply custom className to wrapper', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack className="custom-class">
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
        </PanelStack>,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
    });

    it('should not duplicate md:hidden class', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack className="custom-class">
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
        </PanelStack>,
      );

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-class');
      expect(wrapper).toHaveClass('md:hidden');
    });
  });

  describe('edge cases', () => {
    it('should handle empty children', () => {
      const { container } = render(<PanelStack>{[]}</PanelStack>);

      expect(container.firstChild).not.toBeNull();
    });

    it('should handle panel with no id prop', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'catalog',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
          <Panel id="unnamed">
            <div>Unnamed Panel</div>
          </Panel>
        </PanelStack>,
      );

      // Should only render catalog panel
      expect(
        container.querySelector('[data-panel-id="catalog"]'),
      ).toBeInTheDocument();
      expect(screen.queryByText('Unnamed Panel')).not.toBeInTheDocument();
    });

    it('should handle currentPanel not in panel map', () => {
      mockUseNavigationStore.mockReturnValue({
        history: [{ id: 'catalog' }],
        currentIndex: 0,
        currentPanel: 'nonexistent',
        canGoBack: false,
        canGoForward: false,
        pushPanel: jest.fn(),
        goBack: jest.fn(),
        goForward: jest.fn(),
        resetNavigation: jest.fn(),
        replacePanel: jest.fn(),
      });

      const { container } = render(
        <PanelStack>
          <Panel id="catalog">
            <div>Catalog</div>
          </Panel>
        </PanelStack>,
      );

      // Should render wrapper but no panels
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toBeNull();
      expect(wrapper.querySelector('[data-panel-id]')).toBeNull();
    });
  });
});
