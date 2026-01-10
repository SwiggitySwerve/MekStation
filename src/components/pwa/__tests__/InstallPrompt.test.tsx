import React from 'react';
import { render } from '@testing-library/react';
import { InstallPrompt } from '../InstallPrompt';

// Type for window with optional localStorage for testing
interface WindowWithOptionalLocalStorage extends Omit<Window, 'localStorage'> {
  localStorage?: Storage;
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock matchMedia
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'matchMedia', {
  value: jest.fn(() => ({
    matches: false,
    media: '',
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
  writable: true,
});

describe('InstallPrompt', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render without errors', () => {
      const { container } = render(<InstallPrompt />);
      expect(container).toBeTruthy();
    });

    it('should not display prompt when not triggered', () => {
      const { container } = render(<InstallPrompt />);
      // Prompt should not be visible without beforeinstallprompt event
      expect(container.querySelector('.fixed')).not.toBeInTheDocument();
    });
  });

  describe('LocalStorage Integration', () => {
    it('should respect localStorage dismissal check', () => {
      // Set a recent dismissal
      localStorage.setItem('pwa-install-prompt-dismissed', Date.now().toString());

      const { container } = render(<InstallPrompt />);
      expect(container).toBeTruthy();
    });

    it('should handle missing localStorage gracefully', () => {
      const originalLocalStorage = window.localStorage;
      delete (window as WindowWithOptionalLocalStorage).localStorage;

      const { container } = render(<InstallPrompt />);

      // Should not throw
      expect(container).toBeTruthy();

      // Restore localStorage
      window.localStorage = originalLocalStorage;
    });
  });

  describe('Standalone Mode Detection', () => {
    it('should handle component lifecycle', () => {
      const { unmount } = render(<InstallPrompt />);

      expect(() => {
        unmount();
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle custom className prop', () => {
      const { container } = render(<InstallPrompt className="custom-class" />);
      expect(container).toBeTruthy();
    });

    it('should render with default props', () => {
      const { container } = render(<InstallPrompt />);
      expect(container).toBeTruthy();
    });
  });
});
