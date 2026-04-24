/**
 * Tests: elevationShading
 *
 * Covers `terrain-rendering` spec:
 *  - Shading increases monotonically with elevation.
 *  - +/- ~6% per level.
 *  - Clamping at +6 / -4.
 */

import {
  BASE_LIGHTNESS,
  LIGHTNESS_STEP_PERCENT,
  MAX_ELEVATION,
  MIN_ELEVATION,
  clampElevation,
  isDarkShading,
  lightnessFor,
  shadingFor,
} from '../elevationShading';

describe('elevationShading — monotonic lightness across BattleTech range', () => {
  it('produces strictly increasing lightness from -4 to +6', () => {
    const samples = [];
    for (let e = MIN_ELEVATION; e <= MAX_ELEVATION; e++) {
      samples.push(lightnessFor(e));
    }
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]).toBeGreaterThan(samples[i - 1]);
    }
  });

  it('step per level matches LIGHTNESS_STEP_PERCENT (~6%)', () => {
    expect(lightnessFor(1) - lightnessFor(0)).toBe(LIGHTNESS_STEP_PERCENT);
    expect(lightnessFor(0) - lightnessFor(-1)).toBe(LIGHTNESS_STEP_PERCENT);
  });

  it('elevation 0 produces neutral BASE_LIGHTNESS', () => {
    expect(lightnessFor(0)).toBe(BASE_LIGHTNESS);
  });

  it('+2 hex is lighter than elevation-0 hex; -2 hex is darker', () => {
    expect(lightnessFor(2)).toBeGreaterThan(lightnessFor(0));
    expect(lightnessFor(-2)).toBeLessThan(lightnessFor(0));
  });
});

describe('elevationShading — clamping to BattleTech range', () => {
  it('clamps +8 to +6', () => {
    expect(clampElevation(8)).toBe(MAX_ELEVATION);
    expect(lightnessFor(8)).toBe(lightnessFor(MAX_ELEVATION));
  });

  it('clamps -6 to -4', () => {
    expect(clampElevation(-6)).toBe(MIN_ELEVATION);
    expect(lightnessFor(-6)).toBe(lightnessFor(MIN_ELEVATION));
  });

  it('passes through values within range', () => {
    expect(clampElevation(0)).toBe(0);
    expect(clampElevation(3)).toBe(3);
    expect(clampElevation(-2)).toBe(-2);
  });
});

describe('elevationShading — shadingFor', () => {
  it('returns a neutral hsl color', () => {
    expect(shadingFor(0)).toBe(`hsl(0, 0%, ${BASE_LIGHTNESS}%)`);
  });

  it('lightness increases with elevation in the returned color string', () => {
    // Pull numeric lightness out of the hsl() and confirm ordering.
    const extract = (s: string): number =>
      Number(s.match(/(\d+(?:\.\d+)?)%\)/)?.[1] ?? '0');
    expect(extract(shadingFor(-2))).toBeLessThan(extract(shadingFor(0)));
    expect(extract(shadingFor(2))).toBeGreaterThan(extract(shadingFor(0)));
  });
});

describe('elevationShading — isDarkShading', () => {
  it('elevations below 0 count as dark', () => {
    expect(isDarkShading(-1)).toBe(true);
    expect(isDarkShading(-4)).toBe(true);
  });

  it('elevations at or above 0 count as light', () => {
    expect(isDarkShading(0)).toBe(false);
    expect(isDarkShading(3)).toBe(false);
  });
});
