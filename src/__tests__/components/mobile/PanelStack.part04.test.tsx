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
