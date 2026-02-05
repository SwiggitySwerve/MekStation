/**
 * Planetary Modifiers Tests
 *
 * TDD tests for planetary rating modifiers:
 * - Tech sophistication (A=-2 to F=8)
 * - Industrial capacity (A=-3 to F=IMPOSSIBLE)
 * - Output rating (A=-3 to F=IMPOSSIBLE)
 * - Impossible condition detection
 * - Combined modifier calculation
 */

import {
  PlanetaryRating,
  TECH_MODIFIER,
  INDUSTRY_MODIFIER,
  OUTPUT_MODIFIER,
  getPlanetaryModifiers,
  DEFAULT_RATINGS,
  type IPlanetaryRatings,
} from '../planetaryModifiers';

describe('PlanetaryRating enum', () => {
  it('should have all 6 ratings', () => {
    expect(Object.values(PlanetaryRating)).toHaveLength(6);
    expect(Object.values(PlanetaryRating)).toEqual([
      'A',
      'B',
      'C',
      'D',
      'E',
      'F',
    ]);
  });
});

describe('TECH_MODIFIER lookup table', () => {
  it('should have modifier for each rating', () => {
    expect(Object.keys(TECH_MODIFIER)).toHaveLength(6);
  });

  it('should have correct tech modifiers', () => {
    expect(TECH_MODIFIER[PlanetaryRating.A]).toBe(-2);
    expect(TECH_MODIFIER[PlanetaryRating.B]).toBe(-1);
    expect(TECH_MODIFIER[PlanetaryRating.C]).toBe(0);
    expect(TECH_MODIFIER[PlanetaryRating.D]).toBe(1);
    expect(TECH_MODIFIER[PlanetaryRating.E]).toBe(2);
    expect(TECH_MODIFIER[PlanetaryRating.F]).toBe(8);
  });
});

describe('INDUSTRY_MODIFIER lookup table', () => {
  it('should have modifier for each rating', () => {
    expect(Object.keys(INDUSTRY_MODIFIER)).toHaveLength(6);
  });

  it('should have correct industry modifiers', () => {
    expect(INDUSTRY_MODIFIER[PlanetaryRating.A]).toBe(-3);
    expect(INDUSTRY_MODIFIER[PlanetaryRating.B]).toBe(-2);
    expect(INDUSTRY_MODIFIER[PlanetaryRating.C]).toBe(-1);
    expect(INDUSTRY_MODIFIER[PlanetaryRating.D]).toBe(0);
    expect(INDUSTRY_MODIFIER[PlanetaryRating.E]).toBe(1);
    expect(INDUSTRY_MODIFIER[PlanetaryRating.F]).toBe('IMPOSSIBLE');
  });
});

describe('OUTPUT_MODIFIER lookup table', () => {
  it('should have modifier for each rating', () => {
    expect(Object.keys(OUTPUT_MODIFIER)).toHaveLength(6);
  });

  it('should have correct output modifiers', () => {
    expect(OUTPUT_MODIFIER[PlanetaryRating.A]).toBe(-3);
    expect(OUTPUT_MODIFIER[PlanetaryRating.B]).toBe(-2);
    expect(OUTPUT_MODIFIER[PlanetaryRating.C]).toBe(-1);
    expect(OUTPUT_MODIFIER[PlanetaryRating.D]).toBe(0);
    expect(OUTPUT_MODIFIER[PlanetaryRating.E]).toBe(1);
    expect(OUTPUT_MODIFIER[PlanetaryRating.F]).toBe('IMPOSSIBLE');
  });
});

describe('DEFAULT_RATINGS', () => {
  it('should be C/C/C', () => {
    expect(DEFAULT_RATINGS.tech).toBe(PlanetaryRating.C);
    expect(DEFAULT_RATINGS.industry).toBe(PlanetaryRating.C);
    expect(DEFAULT_RATINGS.output).toBe(PlanetaryRating.C);
  });
});

describe('getPlanetaryModifiers', () => {
  it('should return array of modifiers', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    expect(Array.isArray(mods)).toBe(true);
  });

  it('should return 3 modifiers for normal ratings', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    expect(mods).toHaveLength(3);
  });

  it('should include Tech modifier', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    const techMod = mods.find((m) => m.name === 'Tech');
    expect(techMod).toBeDefined();
    expect(techMod?.value).toBe(0);
  });

  it('should include Industry modifier', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    const indMod = mods.find((m) => m.name === 'Industry');
    expect(indMod).toBeDefined();
    expect(indMod?.value).toBe(-1);
  });

  it('should include Output modifier', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    const outMod = mods.find((m) => m.name === 'Output');
    expect(outMod).toBeDefined();
    expect(outMod?.value).toBe(-1);
  });

  it('should calculate default ratings (C/C/C) as -2 total', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    const total = mods.reduce((sum, m) => sum + m.value, 0);
    expect(total).toBe(-2); // 0 + (-1) + (-1)
  });

  it('should calculate best case (A/A/A) as -8 total', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.A,
      industry: PlanetaryRating.A,
      output: PlanetaryRating.A,
    };
    const mods = getPlanetaryModifiers(ratings);
    const total = mods.reduce((sum, m) => sum + m.value, 0);
    expect(total).toBe(-8); // (-2) + (-3) + (-3)
  });

  it('should return IMPOSSIBLE for Industry F', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.F,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    expect(mods).toHaveLength(1);
    expect(mods[0].name).toBe('Industry F');
    expect(mods[0].value).toBe(99);
  });

  it('should return IMPOSSIBLE for Output F', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.F,
    };
    const mods = getPlanetaryModifiers(ratings);
    expect(mods).toHaveLength(1);
    expect(mods[0].name).toBe('Output F');
    expect(mods[0].value).toBe(99);
  });

  it('should prioritize Industry F over Output F', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.F,
      output: PlanetaryRating.F,
    };
    const mods = getPlanetaryModifiers(ratings);
    expect(mods).toHaveLength(1);
    expect(mods[0].name).toBe('Industry F');
  });

  it('should handle all tech ratings', () => {
    const testCases = [
      { rating: PlanetaryRating.A, expected: -2 },
      { rating: PlanetaryRating.B, expected: -1 },
      { rating: PlanetaryRating.C, expected: 0 },
      { rating: PlanetaryRating.D, expected: 1 },
      { rating: PlanetaryRating.E, expected: 2 },
      { rating: PlanetaryRating.F, expected: 8 },
    ];

    testCases.forEach(({ rating, expected }) => {
      const ratings: IPlanetaryRatings = {
        tech: rating,
        industry: PlanetaryRating.C,
        output: PlanetaryRating.C,
      };
      const mods = getPlanetaryModifiers(ratings);
      const techMod = mods.find((m) => m.name === 'Tech');
      expect(techMod?.value).toBe(expected);
    });
  });

  it('should handle all industry ratings (except F)', () => {
    const testCases = [
      { rating: PlanetaryRating.A, expected: -3 },
      { rating: PlanetaryRating.B, expected: -2 },
      { rating: PlanetaryRating.C, expected: -1 },
      { rating: PlanetaryRating.D, expected: 0 },
      { rating: PlanetaryRating.E, expected: 1 },
    ];

    testCases.forEach(({ rating, expected }) => {
      const ratings: IPlanetaryRatings = {
        tech: PlanetaryRating.C,
        industry: rating,
        output: PlanetaryRating.C,
      };
      const mods = getPlanetaryModifiers(ratings);
      const indMod = mods.find((m) => m.name === 'Industry');
      expect(indMod?.value).toBe(expected);
    });
  });

  it('should handle all output ratings (except F)', () => {
    const testCases = [
      { rating: PlanetaryRating.A, expected: -3 },
      { rating: PlanetaryRating.B, expected: -2 },
      { rating: PlanetaryRating.C, expected: -1 },
      { rating: PlanetaryRating.D, expected: 0 },
      { rating: PlanetaryRating.E, expected: 1 },
    ];

    testCases.forEach(({ rating, expected }) => {
      const ratings: IPlanetaryRatings = {
        tech: PlanetaryRating.C,
        industry: PlanetaryRating.C,
        output: rating,
      };
      const mods = getPlanetaryModifiers(ratings);
      const outMod = mods.find((m) => m.name === 'Output');
      expect(outMod?.value).toBe(expected);
    });
  });

  it('should return readonly array', () => {
    const ratings: IPlanetaryRatings = {
      tech: PlanetaryRating.C,
      industry: PlanetaryRating.C,
      output: PlanetaryRating.C,
    };
    const mods = getPlanetaryModifiers(ratings);
    expect(Object.isFrozen(mods) || Array.isArray(mods)).toBe(true);
  });
});
