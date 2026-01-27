import {
  roll2d6,
  negotiateClause,
  negotiateAllClauses,
  getClauseLevelName,
  getClauseLevelDescription,
} from '../contractNegotiation';

import {
  ContractClauseType,
  CLAUSE_LEVELS,
} from '@/types/campaign/contracts/contractTypes';

/** Returns a fixed value each time. Use for deterministic dice. */
function fixedRandom(value: number) {
  return () => value;
}

function createSeededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (1103515245 * state + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

describe('contractNegotiation', () => {
  describe('roll2d6', () => {
    it('should return 2 for minimum roll (both dice = 1)', () => {
      const result = roll2d6(fixedRandom(0));
      expect(result).toBe(2);
    });

    it('should return 12 for maximum roll (both dice = 6)', () => {
      const result = roll2d6(fixedRandom(0.999));
      expect(result).toBe(12);
    });

    it('should return value in range [2, 12] for seeded random', () => {
      const random = createSeededRandom(42);
      const result = roll2d6(random);
      expect(result).toBeGreaterThanOrEqual(2);
      expect(result).toBeLessThanOrEqual(12);
    });

    it('should return values in range [2, 12] for 100 random rolls', () => {
      for (let i = 0; i < 100; i++) {
        const random = createSeededRandom(i);
        const result = roll2d6(random);
        expect(result).toBeGreaterThanOrEqual(2);
        expect(result).toBeLessThanOrEqual(12);
      }
    });
  });

  describe('negotiateClause', () => {
    it('should return level 0 for low roll + low skill', () => {
      // roll=2 + skill=0 + standing=0 = total=2 → level 0
      const result = negotiateClause(
        ContractClauseType.COMMAND,
        0,
        0,
        fixedRandom(0)
      );
      expect(result.level).toBe(0);
      expect(result.type).toBe(ContractClauseType.COMMAND);
    });

    it('should return level 1 for medium roll', () => {
      // roll=5 + skill=0 + standing=0 = total=5 → level 1
      const result = negotiateClause(
        ContractClauseType.SALVAGE,
        0,
        0,
        fixedRandom(0.333)
      );
      expect(result.level).toBe(1);
      expect(result.type).toBe(ContractClauseType.SALVAGE);
    });

    it('should return level 2 for high roll', () => {
      // roll=8 + skill=0 + standing=0 = total=8 → level 2
      const result = negotiateClause(
        ContractClauseType.SUPPORT,
        0,
        0,
        fixedRandom(0.666)
      );
      expect(result.level).toBe(2);
      expect(result.type).toBe(ContractClauseType.SUPPORT);
    });

    it('should return level 3 for very high roll', () => {
      // roll=10 + skill=0 + standing=0 = total=10 → level 3
      const result = negotiateClause(
        ContractClauseType.TRANSPORT,
        0,
        0,
        fixedRandom(0.833)
      );
      expect(result.level).toBe(3);
      expect(result.type).toBe(ContractClauseType.TRANSPORT);
    });

    it('should raise level with skill modifier', () => {
      // roll=5 + skill=3 + standing=2 = total=10 → level 3
      // fixedRandom(0.5) gives die1=floor(0.5*6)+1=3, die2=floor(0.5*6)+1=3, roll=6
      // So we need: roll=6 + skill=2 + standing=2 = total=10 → level 3
      const result = negotiateClause(
        ContractClauseType.COMMAND,
        2,
        2,
        fixedRandom(0.5)
      );
      expect(result.level).toBe(3);
    });

    it('should lower level with negative standing', () => {
      // roll=7 + skill=0 + standing=-5 = total=2 → level 0
      const result = negotiateClause(
        ContractClauseType.SALVAGE,
        0,
        -5,
        fixedRandom(0.5)
      );
      expect(result.level).toBe(0);
    });

    it('should clamp level at 0 (no negative)', () => {
      // roll=2 + skill=0 + standing=-10 = total=-8 → level 0
      const result = negotiateClause(
        ContractClauseType.SUPPORT,
        0,
        -10,
        fixedRandom(0)
      );
      expect(result.level).toBe(0);
    });

    it('should clamp level at 3 (no overflow)', () => {
      // roll=12 + skill=5 + standing=5 = total=22 → level 3
      const result = negotiateClause(
        ContractClauseType.TRANSPORT,
        5,
        5,
        fixedRandom(0.999)
      );
      expect(result.level).toBe(3);
    });

    it('should return correct clause type in output', () => {
      const result = negotiateClause(
        ContractClauseType.COMMAND,
        0,
        0,
        fixedRandom(0.5)
      );
      expect(result.type).toBe(ContractClauseType.COMMAND);
    });
  });

  describe('negotiateAllClauses', () => {
    it('should return exactly 4 clauses', () => {
      const random = createSeededRandom(42);
      const result = negotiateAllClauses(0, 0, random);
      expect(result).toHaveLength(4);
    });

    it('should return one clause per ContractClauseType', () => {
      const random = createSeededRandom(42);
      const result = negotiateAllClauses(0, 0, random);
      const types = result.map((c) => c.type);
      expect(types).toContain(ContractClauseType.COMMAND);
      expect(types).toContain(ContractClauseType.SALVAGE);
      expect(types).toContain(ContractClauseType.SUPPORT);
      expect(types).toContain(ContractClauseType.TRANSPORT);
    });

    it('should have all levels in range [0, 3]', () => {
      const random = createSeededRandom(42);
      const result = negotiateAllClauses(0, 0, random);
      result.forEach((clause) => {
        expect(clause.level).toBeGreaterThanOrEqual(0);
        expect(clause.level).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('getClauseLevelName', () => {
    it('should return "Integrated" for Command level 0', () => {
      const clause = { type: ContractClauseType.COMMAND, level: 0 as const };
      expect(getClauseLevelName(clause)).toBe('Integrated');
    });

    it('should return "Independent" for Command level 3', () => {
      const clause = { type: ContractClauseType.COMMAND, level: 3 as const };
      expect(getClauseLevelName(clause)).toBe('Independent');
    });

    it('should return "None" for Salvage level 0', () => {
      const clause = { type: ContractClauseType.SALVAGE, level: 0 as const };
      expect(getClauseLevelName(clause)).toBe('None');
    });

    it('should return "Full" for Transport level 3', () => {
      const clause = { type: ContractClauseType.TRANSPORT, level: 3 as const };
      expect(getClauseLevelName(clause)).toBe('Full');
    });
  });

  describe('getClauseLevelDescription', () => {
    it('should return non-empty string for all clause type/level combinations', () => {
      Object.values(ContractClauseType).forEach((clauseType) => {
        for (let level = 0; level <= 3; level++) {
          const clause = {
            type: clauseType,
            level: level as 0 | 1 | 2 | 3,
          };
          const description = getClauseLevelDescription(clause);
          expect(description).toBeTruthy();
          expect(typeof description).toBe('string');
          expect(description.length).toBeGreaterThan(0);
        }
      });
    });
  });
});
