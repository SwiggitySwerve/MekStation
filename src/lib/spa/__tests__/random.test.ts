/**
 * Tests for the random SPA picker.
 */

import { getEligibleSPAs, pickRandomSPA } from '../random';

describe('getEligibleSPAs', () => {
  it('excludes flaws by default', () => {
    const pool = getEligibleSPAs();
    expect(pool.every((spa) => !spa.isFlaw)).toBe(true);
  });

  it('excludes origin-only abilities by default', () => {
    const pool = getEligibleSPAs();
    expect(pool.every((spa) => !spa.isOriginOnly)).toBe(true);
  });

  it('excludes abilities with null xpCost by default', () => {
    const pool = getEligibleSPAs();
    expect(pool.every((spa) => spa.xpCost !== null)).toBe(true);
  });

  it('respects the excludeIds list', () => {
    const baseline = getEligibleSPAs();
    const firstId = baseline[0].id;
    const pool = getEligibleSPAs({ excludeIds: [firstId] });
    expect(pool.find((s) => s.id === firstId)).toBeUndefined();
  });

  it('respects the category filter', () => {
    const pool = getEligibleSPAs({ category: 'gunnery' });
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((s) => s.category === 'gunnery')).toBe(true);
  });

  it('includes flaws when includeFlaws is true', () => {
    const pool = getEligibleSPAs({ includeFlaws: true });
    expect(pool.some((spa) => spa.isFlaw)).toBe(true);
  });
});

describe('pickRandomSPA', () => {
  it('returns a deterministic choice for a given random() value', () => {
    // A stable 0 pins the choice to pool[0].
    const deterministicRandom = () => 0;
    const first = pickRandomSPA(deterministicRandom);
    expect(first).not.toBeNull();
    const second = pickRandomSPA(deterministicRandom);
    expect(second?.id).toBe(first?.id);
  });

  it('different random values return different SPAs', () => {
    const a = pickRandomSPA(() => 0);
    const b = pickRandomSPA(() => 0.9999);
    expect(a?.id).not.toBe(b?.id);
  });

  it('never returns a flaw by default', () => {
    // Sample a range of random values; none should produce a flaw.
    for (let i = 0; i < 20; i++) {
      const r = i / 20;
      const spa = pickRandomSPA(() => r);
      expect(spa?.isFlaw).toBe(false);
    }
  });

  it('never returns an origin-only ability by default', () => {
    for (let i = 0; i < 20; i++) {
      const r = i / 20;
      const spa = pickRandomSPA(() => r);
      expect(spa?.isOriginOnly).toBe(false);
    }
  });

  it('respects a custom catalog', () => {
    const onlyOne = getEligibleSPAs({ category: 'gunnery' }).slice(0, 1);
    const spa = pickRandomSPA(() => 0.5, { catalog: onlyOne });
    expect(spa?.id).toBe(onlyOne[0].id);
  });

  it('returns null when the pool is empty', () => {
    const spa = pickRandomSPA(() => 0.5, { catalog: [] });
    expect(spa).toBeNull();
  });
});
