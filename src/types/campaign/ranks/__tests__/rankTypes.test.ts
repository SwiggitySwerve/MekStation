import {
  Profession,
  IRank,
  RANK_TIERS,
  getRankTier,
  isValidRankIndex,
  createEmptyRank,
  createRanks,
  isProfession,
  isRankTier,
  ALL_PROFESSIONS,
} from '../rankTypes';

describe('rankTypes', () => {
  describe('RANK_TIERS', () => {
    it('should have TOTAL equal to 51', () => {
      expect(RANK_TIERS.TOTAL).toBe(51);
    });

    it('should have correct enlisted tier boundaries', () => {
      expect(RANK_TIERS.ENLISTED_MIN).toBe(0);
      expect(RANK_TIERS.ENLISTED_MAX).toBe(20);
    });

    it('should have correct warrant officer tier boundaries', () => {
      expect(RANK_TIERS.WARRANT_MIN).toBe(21);
      expect(RANK_TIERS.WARRANT_MAX).toBe(30);
    });

    it('should have correct officer tier boundaries', () => {
      expect(RANK_TIERS.OFFICER_MIN).toBe(31);
      expect(RANK_TIERS.OFFICER_MAX).toBe(50);
    });
  });

  describe('Profession enum', () => {
    it('should have 9 profession values', () => {
      const professions = Object.values(Profession);
      expect(professions).toHaveLength(9);
    });

    it('should have all unique profession values', () => {
      const professions = Object.values(Profession);
      const uniqueProfessions = new Set(professions);
      expect(uniqueProfessions.size).toBe(professions.length);
    });
  });

  describe('getRankTier', () => {
    it('should return enlisted for rank 0', () => {
      expect(getRankTier(0)).toBe('enlisted');
    });

    it('should return enlisted for rank 20 (boundary)', () => {
      expect(getRankTier(20)).toBe('enlisted');
    });

    it('should return warrant_officer for rank 21', () => {
      expect(getRankTier(21)).toBe('warrant_officer');
    });

    it('should return warrant_officer for rank 30 (boundary)', () => {
      expect(getRankTier(30)).toBe('warrant_officer');
    });

    it('should return officer for rank 31', () => {
      expect(getRankTier(31)).toBe('officer');
    });

    it('should return officer for rank 50 (boundary)', () => {
      expect(getRankTier(50)).toBe('officer');
    });
  });

  describe('isValidRankIndex', () => {
    it('should return true for rank 0', () => {
      expect(isValidRankIndex(0)).toBe(true);
    });

    it('should return true for rank 50', () => {
      expect(isValidRankIndex(50)).toBe(true);
    });

    it('should return false for rank 51', () => {
      expect(isValidRankIndex(51)).toBe(false);
    });

    it('should return false for rank -1', () => {
      expect(isValidRankIndex(-1)).toBe(false);
    });

    it('should return false for non-integer values', () => {
      expect(isValidRankIndex(10.5)).toBe(false);
    });
  });

  describe('createEmptyRank', () => {
    it('should return a rank with empty names object', () => {
      const rank = createEmptyRank();
      expect(rank.names).toEqual({});
    });

    it('should return a rank with officer set to false', () => {
      const rank = createEmptyRank();
      expect(rank.officer).toBe(false);
    });

    it('should return a rank with payMultiplier of 1.0', () => {
      const rank = createEmptyRank();
      expect(rank.payMultiplier).toBe(1.0);
    });
  });

  describe('createRanks', () => {
    it('should return an array of length 51', () => {
      const ranks = createRanks({});
      expect(ranks).toHaveLength(51);
    });

    it('should populate specified indices with provided ranks', () => {
      const customRank: IRank = {
        names: { [Profession.MEKWARRIOR]: 'Colonel' },
        officer: true,
        payMultiplier: 2.5,
      };
      const ranks = createRanks({ 50: customRank });
      expect(ranks[50]).toBe(customRank);
    });

    it('should fill unpopulated indices with empty ranks', () => {
      const customRank: IRank = {
        names: { [Profession.MEKWARRIOR]: 'Major' },
        officer: true,
        payMultiplier: 2.0,
      };
      const ranks = createRanks({ 0: customRank });
      expect(ranks[1]).toEqual(createEmptyRank());
    });

    it('should return a frozen array', () => {
      const ranks = createRanks({});
      expect(Object.isFrozen(ranks)).toBe(true);
    });
  });

  describe('isProfession', () => {
    it('should return true for valid profession values', () => {
      expect(isProfession(Profession.MEKWARRIOR)).toBe(true);
      expect(isProfession(Profession.TECH)).toBe(true);
      expect(isProfession(Profession.CIVILIAN)).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isProfession('invalid')).toBe(false);
      expect(isProfession(123)).toBe(false);
      expect(isProfession(null)).toBe(false);
    });
  });

  describe('isRankTier', () => {
    it('should return true for valid rank tier values', () => {
      expect(isRankTier('enlisted')).toBe(true);
      expect(isRankTier('warrant_officer')).toBe(true);
      expect(isRankTier('officer')).toBe(true);
    });

    it('should return false for invalid values', () => {
      expect(isRankTier('invalid')).toBe(false);
      expect(isRankTier(123)).toBe(false);
      expect(isRankTier(null)).toBe(false);
    });
  });

  describe('ALL_PROFESSIONS', () => {
    it('should be a frozen array', () => {
      expect(Object.isFrozen(ALL_PROFESSIONS)).toBe(true);
    });

    it('should contain all profession values', () => {
      expect(ALL_PROFESSIONS).toContain(Profession.MEKWARRIOR);
      expect(ALL_PROFESSIONS).toContain(Profession.AEROSPACE);
      expect(ALL_PROFESSIONS).toContain(Profession.VEHICLE);
      expect(ALL_PROFESSIONS).toContain(Profession.NAVAL);
      expect(ALL_PROFESSIONS).toContain(Profession.INFANTRY);
      expect(ALL_PROFESSIONS).toContain(Profession.TECH);
      expect(ALL_PROFESSIONS).toContain(Profession.MEDICAL);
      expect(ALL_PROFESSIONS).toContain(Profession.ADMINISTRATOR);
      expect(ALL_PROFESSIONS).toContain(Profession.CIVILIAN);
    });
  });
});
