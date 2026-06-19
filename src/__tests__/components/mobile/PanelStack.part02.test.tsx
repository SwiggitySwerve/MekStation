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
});
