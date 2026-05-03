import { renderHook } from '@testing-library/react';

import { BREAKPOINTS as LAYOUT_BREAKPOINTS, TOUCH } from '@/constants/layout';
import { useDeviceType } from '@/hooks/useDeviceType';
import { useTouchTarget } from '@/hooks/useTouchTarget';
import {
  BREAKPOINTS as RESPONSIVE_BREAKPOINTS,
  MIN_TOUCH_TARGET,
} from '@/utils/responsive';

const originalInnerWidth = window.innerWidth;
const originalMatchMedia = window.matchMedia;

function setViewportWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  });

  window.matchMedia = jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

describe('responsive constants source of truth', () => {
  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
      writable: true,
    });

    window.matchMedia = originalMatchMedia;
  });

  it('keeps md/mobile breakpoints resolved to 768 across current sites', () => {
    expect(LAYOUT_BREAKPOINTS.MD).toBe(768);
    expect(RESPONSIVE_BREAKPOINTS.md).toBe(LAYOUT_BREAKPOINTS.MD);

    setViewportWidth(LAYOUT_BREAKPOINTS.MD - 1);
    const { result: mobileResult } = renderHook(() => useDeviceType());
    expect(mobileResult.current.isMobile).toBe(true);
    expect(mobileResult.current.isTablet).toBe(false);

    setViewportWidth(LAYOUT_BREAKPOINTS.MD);
    const { result: tabletResult } = renderHook(() => useDeviceType());
    expect(tabletResult.current.isMobile).toBe(false);
    expect(tabletResult.current.isTablet).toBe(true);
  });

  it('keeps lg/tablet breakpoints resolved to 1024 across current sites', () => {
    expect(LAYOUT_BREAKPOINTS.LG).toBe(1024);
    expect(RESPONSIVE_BREAKPOINTS.lg).toBe(LAYOUT_BREAKPOINTS.LG);

    setViewportWidth(LAYOUT_BREAKPOINTS.LG - 1);
    const { result: tabletResult } = renderHook(() => useDeviceType());
    expect(tabletResult.current.isTablet).toBe(true);
    expect(tabletResult.current.isDesktop).toBe(false);

    setViewportWidth(LAYOUT_BREAKPOINTS.LG);
    const { result: desktopResult } = renderHook(() => useDeviceType());
    expect(desktopResult.current.isTablet).toBe(false);
    expect(desktopResult.current.isDesktop).toBe(true);
  });

  it('keeps minimum touch target defaults resolved to 44 across current sites', () => {
    expect(TOUCH.MIN_TARGET_SIZE).toBe(44);
    expect(MIN_TOUCH_TARGET).toBe(TOUCH.MIN_TARGET_SIZE);

    const { result } = renderHook(() =>
      useTouchTarget({ contentWidth: 20, contentHeight: 20 }),
    );

    expect(result.current.style.paddingLeft).toBe(12);
    expect(result.current.style.paddingRight).toBe(12);
    expect(result.current.style.paddingTop).toBe(12);
    expect(result.current.style.paddingBottom).toBe(12);
  });
});
