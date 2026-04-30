import {
  getPrefersReducedMotion,
  REDUCED_MOTION_QUERY,
} from '@/hooks/useReducedMotion';

describe('getPrefersReducedMotion', () => {
  it('reads the reduced-motion media query', () => {
    const mediaQueryList: MediaQueryList = {
      matches: true,
      media: REDUCED_MOTION_QUERY,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => true,
      addListener: () => undefined,
      removeListener: () => undefined,
    };

    expect(
      getPrefersReducedMotion({
        matchMedia: (query) =>
          query === REDUCED_MOTION_QUERY
            ? mediaQueryList
            : { ...mediaQueryList, matches: false, media: query },
      }),
    ).toBe(true);
  });
});
