import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { PanelStack, Panel } from '@/components/mobile/PanelStack';
import { useDeviceType } from '@/hooks/useDeviceType';
import {
  useNavigationStore,
  useNavigationSelector,
} from '@/stores/useNavigationStore';

// Mock dependencies
jest.mock('../../../stores/useNavigationStore');
jest.mock('../../../hooks/useDeviceType');

describe('PanelStack', () => {
  const mockUseNavigationStore = useNavigationStore as jest.MockedFunction<
    typeof useNavigationStore
  >;

  const mockUseNavigationSelector =
    useNavigationSelector as jest.MockedFunction<typeof useNavigationSelector>;

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

    mockUseNavigationSelector.mockImplementation((selector) =>
      selector(mockUseNavigationStore()),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
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
});
