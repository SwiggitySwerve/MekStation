/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { renderHook } from '@testing-library/react';
import { useDeviceCapabilities } from '../../hooks/useDeviceCapabilities';

// Extend Window interface to include optional touch event handler
interface WindowWithTouch extends Window {
  ontouchstart?: (() => void) | null;
}

// Mock window.matchMedia for all tests
const mockMatchMedia = jest.fn().mockImplementation((query) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(),
  removeListener: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: mockMatchMedia,
});

describe('useDeviceCapabilities', () => {
  afterEach(() => {
    // Reset mock after each test
    mockMatchMedia.mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('should detect touch capability', () => {
    // Mock touch capability
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    });

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.hasTouch).toBe(true);
  });

  it('should detect no touch capability', () => {
    // Remove touch capability
    delete (window as WindowWithTouch).ontouchstart;

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.hasTouch).toBe(false);
  });

  it('should detect mouse capability via hover media query', () => {
    // Mock matchMedia to return true for hover
    mockMatchMedia.mockImplementation((query) => ({
      matches: query === '(hover: hover)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.hasMouse).toBe(true);
  });

  it('should detect no mouse capability when hover does not match', () => {
    // matchMedia already returns false from mock, no need to change
    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.hasMouse).toBe(false);
  });

  it('should detect mobile viewport (width < 768px)', () => {
    // Mock innerWidth for mobile
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.isMobile).toBe(true);
  });

  it('should detect desktop viewport (width >= 768px)', () => {
    // Mock innerWidth for desktop
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.isMobile).toBe(false);
  });

  it('should detect exact breakpoint (768px is not mobile)', () => {
    // Mock innerWidth at breakpoint
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.isMobile).toBe(false);
  });

  it('should handle SSR gracefully (window undefined)', () => {
    // Mock SSR environment
    const originalWindow = global.window;
    // @ts-ignore - intentionally removing window for SSR test
    delete global.window;

    const { result } = renderHook(() => useDeviceCapabilities());

    // Should return safe defaults
    expect(result.current.hasTouch).toBe(false);
    expect(result.current.hasMouse).toBe(false);
    expect(result.current.isMobile).toBe(false);

    // Restore window
    global.window = originalWindow;
  });

  it('should detect device with both touch and mouse', () => {
    // Mock both capabilities
    Object.defineProperty(window, 'ontouchstart', {
      value: () => {},
      writable: true,
      configurable: true,
    });

    mockMatchMedia.mockImplementation((query) => ({
      matches: query === '(hover: hover)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { result } = renderHook(() => useDeviceCapabilities());

    expect(result.current.hasTouch).toBe(true);
    expect(result.current.hasMouse).toBe(true);
  });

  it('should compute values once on mount and not change', () => {
    const { result, rerender } = renderHook(() => useDeviceCapabilities());

    const initialCapabilities = result.current;

    // Rerender should not recompute
    rerender();

    expect(result.current).toBe(initialCapabilities);
  });
});
