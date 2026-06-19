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
});
