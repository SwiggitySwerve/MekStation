import {
  IFactionStanding,
  FactionStandingLevel,
} from '@/types/campaign/factionStanding/IFactionStanding';

import {
  AccoladeLevel,
  CensureLevel,
  checkAccoladeEscalation,
  checkCensureEscalation,
  applyAccolade,
  applyCensure,
} from '../escalation';

describe('Accolade/Censure Escalation', () => {
  const createStanding = (
    overrides: Partial<IFactionStanding> = {},
  ): IFactionStanding => ({
    factionId: 'test-faction',
    regard: 0,
    level: FactionStandingLevel.LEVEL_4,
    accoladeLevel: 0,
    censureLevel: 0,
    history: [],
    ...overrides,
  });

  describe('checkAccoladeEscalation', () => {
    it('should return null when regard < Level 5 threshold (+10)', () => {
      const standing = createStanding({ regard: 9 });
      expect(checkAccoladeEscalation(standing)).toBeNull();
    });

    it('should return TAKING_NOTICE when regard >= +10 and accoladeLevel is NONE', () => {
      const standing = createStanding({ regard: 10, accoladeLevel: 0 });
      expect(checkAccoladeEscalation(standing)).toBe(
        AccoladeLevel.TAKING_NOTICE,
      );
    });

    it('should return PRESS_RECOGNITION when regard >= +10 and accoladeLevel is TAKING_NOTICE', () => {
      const standing = createStanding({ regard: 10, accoladeLevel: 1 });
      expect(checkAccoladeEscalation(standing)).toBe(
        AccoladeLevel.PRESS_RECOGNITION,
      );
    });

    it('should return CASH_BONUS when regard >= +10 and accoladeLevel is PRESS_RECOGNITION', () => {
      const standing = createStanding({ regard: 10, accoladeLevel: 2 });
      expect(checkAccoladeEscalation(standing)).toBe(AccoladeLevel.CASH_BONUS);
    });

    it('should return ADOPTION when regard >= +10 and accoladeLevel is CASH_BONUS', () => {
      const standing = createStanding({ regard: 10, accoladeLevel: 3 });
      expect(checkAccoladeEscalation(standing)).toBe(AccoladeLevel.ADOPTION);
    });

    it('should return STATUE when regard >= +10 and accoladeLevel is ADOPTION', () => {
      const standing = createStanding({ regard: 10, accoladeLevel: 4 });
      expect(checkAccoladeEscalation(standing)).toBe(AccoladeLevel.STATUE);
    });

    it('should return null when accoladeLevel is at max (STATUE)', () => {
      const standing = createStanding({ regard: 10, accoladeLevel: 5 });
      expect(checkAccoladeEscalation(standing)).toBeNull();
    });

    it('should return null when regard is exactly at threshold but accoladeLevel is max', () => {
      const standing = createStanding({ regard: 10, accoladeLevel: 5 });
      expect(checkAccoladeEscalation(standing)).toBeNull();
    });
  });

  describe('checkCensureEscalation', () => {
    it('should return null when regard >= 0', () => {
      const standing = createStanding({ regard: 0 });
      expect(checkCensureEscalation(standing)).toBeNull();
    });

    it('should return FORMAL_WARNING when regard < 0 and censureLevel is NONE', () => {
      const standing = createStanding({ regard: -1, censureLevel: 0 });
      expect(checkCensureEscalation(standing)).toBe(
        CensureLevel.FORMAL_WARNING,
      );
    });

    it('should return NEWS_ARTICLE when regard < 0 and censureLevel is FORMAL_WARNING', () => {
      const standing = createStanding({ regard: -1, censureLevel: 1 });
      expect(checkCensureEscalation(standing)).toBe(CensureLevel.NEWS_ARTICLE);
    });

    it('should return COMMANDER_RETIREMENT when regard < 0 and censureLevel is NEWS_ARTICLE', () => {
      const standing = createStanding({ regard: -1, censureLevel: 2 });
      expect(checkCensureEscalation(standing)).toBe(
        CensureLevel.COMMANDER_RETIREMENT,
      );
    });

    it('should return LEADERSHIP_REPLACEMENT when regard < 0 and censureLevel is COMMANDER_RETIREMENT', () => {
      const standing = createStanding({ regard: -1, censureLevel: 3 });
      expect(checkCensureEscalation(standing)).toBe(
        CensureLevel.LEADERSHIP_REPLACEMENT,
      );
    });

    it('should return DISBAND when regard < 0 and censureLevel is LEADERSHIP_REPLACEMENT', () => {
      const standing = createStanding({ regard: -1, censureLevel: 4 });
      expect(checkCensureEscalation(standing)).toBe(CensureLevel.DISBAND);
    });

    it('should return null when censureLevel is at max (DISBAND)', () => {
      const standing = createStanding({ regard: -1, censureLevel: 5 });
      expect(checkCensureEscalation(standing)).toBeNull();
    });

    it('should return null when regard is exactly 0', () => {
      const standing = createStanding({ regard: 0, censureLevel: 0 });
      expect(checkCensureEscalation(standing)).toBeNull();
    });
  });

  describe('applyAccolade', () => {
    it('should increment accoladeLevel from NONE to TAKING_NOTICE', () => {
      const standing = createStanding({ accoladeLevel: 0 });
      const updated = applyAccolade(standing, AccoladeLevel.TAKING_NOTICE);
      expect(updated.accoladeLevel).toBe(1);
    });

    it('should increment accoladeLevel from TAKING_NOTICE to PRESS_RECOGNITION', () => {
      const standing = createStanding({ accoladeLevel: 1 });
      const updated = applyAccolade(standing, AccoladeLevel.PRESS_RECOGNITION);
      expect(updated.accoladeLevel).toBe(2);
    });

    it('should increment accoladeLevel from PRESS_RECOGNITION to CASH_BONUS', () => {
      const standing = createStanding({ accoladeLevel: 2 });
      const updated = applyAccolade(standing, AccoladeLevel.CASH_BONUS);
      expect(updated.accoladeLevel).toBe(3);
    });

    it('should increment accoladeLevel from CASH_BONUS to ADOPTION', () => {
      const standing = createStanding({ accoladeLevel: 3 });
      const updated = applyAccolade(standing, AccoladeLevel.ADOPTION);
      expect(updated.accoladeLevel).toBe(4);
    });

    it('should increment accoladeLevel from ADOPTION to STATUE', () => {
      const standing = createStanding({ accoladeLevel: 4 });
      const updated = applyAccolade(standing, AccoladeLevel.STATUE);
      expect(updated.accoladeLevel).toBe(5);
    });

    it('should not exceed max accoladeLevel (5)', () => {
      const standing = createStanding({ accoladeLevel: 5 });
      const updated = applyAccolade(standing, AccoladeLevel.STATUE);
      expect(updated.accoladeLevel).toBe(5);
    });

    it('should return a new standing object', () => {
      const standing = createStanding({ accoladeLevel: 0 });
      const updated = applyAccolade(standing, AccoladeLevel.TAKING_NOTICE);
      expect(updated).not.toBe(standing);
      expect(standing.accoladeLevel).toBe(0);
    });

    it('should preserve other properties', () => {
      const standing = createStanding({
        regard: 15,
        factionId: 'test-faction',
        accoladeLevel: 0,
      });
      const updated = applyAccolade(standing, AccoladeLevel.TAKING_NOTICE);
      expect(updated.regard).toBe(15);
      expect(updated.factionId).toBe('test-faction');
    });
  });

  describe('applyCensure', () => {
    it('should increment censureLevel from NONE to FORMAL_WARNING', () => {
      const standing = createStanding({ censureLevel: 0 });
      const updated = applyCensure(standing, CensureLevel.FORMAL_WARNING);
      expect(updated.censureLevel).toBe(1);
    });

    it('should increment censureLevel from FORMAL_WARNING to NEWS_ARTICLE', () => {
      const standing = createStanding({ censureLevel: 1 });
      const updated = applyCensure(standing, CensureLevel.NEWS_ARTICLE);
      expect(updated.censureLevel).toBe(2);
    });

    it('should increment censureLevel from NEWS_ARTICLE to COMMANDER_RETIREMENT', () => {
      const standing = createStanding({ censureLevel: 2 });
      const updated = applyCensure(standing, CensureLevel.COMMANDER_RETIREMENT);
      expect(updated.censureLevel).toBe(3);
    });

    it('should increment censureLevel from COMMANDER_RETIREMENT to LEADERSHIP_REPLACEMENT', () => {
      const standing = createStanding({ censureLevel: 3 });
      const updated = applyCensure(
        standing,
        CensureLevel.LEADERSHIP_REPLACEMENT,
      );
      expect(updated.censureLevel).toBe(4);
    });

    it('should increment censureLevel from LEADERSHIP_REPLACEMENT to DISBAND', () => {
      const standing = createStanding({ censureLevel: 4 });
      const updated = applyCensure(standing, CensureLevel.DISBAND);
      expect(updated.censureLevel).toBe(5);
    });

    it('should not exceed max censureLevel (5)', () => {
      const standing = createStanding({ censureLevel: 5 });
      const updated = applyCensure(standing, CensureLevel.DISBAND);
      expect(updated.censureLevel).toBe(5);
    });

    it('should return a new standing object', () => {
      const standing = createStanding({ censureLevel: 0 });
      const updated = applyCensure(standing, CensureLevel.FORMAL_WARNING);
      expect(updated).not.toBe(standing);
      expect(standing.censureLevel).toBe(0);
    });

    it('should preserve other properties', () => {
      const standing = createStanding({
        regard: -15,
        factionId: 'test-faction',
        censureLevel: 0,
      });
      const updated = applyCensure(standing, CensureLevel.FORMAL_WARNING);
      expect(updated.regard).toBe(-15);
      expect(updated.factionId).toBe('test-faction');
    });
  });

  describe('Integration: Escalation chains', () => {
    it('should handle full accolade escalation chain', () => {
      let standing = createStanding({ regard: 10, accoladeLevel: 0 });

      standing = applyAccolade(standing, checkAccoladeEscalation(standing)!);
      expect(standing.accoladeLevel).toBe(1);

      standing = applyAccolade(standing, checkAccoladeEscalation(standing)!);
      expect(standing.accoladeLevel).toBe(2);

      standing = applyAccolade(standing, checkAccoladeEscalation(standing)!);
      expect(standing.accoladeLevel).toBe(3);

      standing = applyAccolade(standing, checkAccoladeEscalation(standing)!);
      expect(standing.accoladeLevel).toBe(4);

      standing = applyAccolade(standing, checkAccoladeEscalation(standing)!);
      expect(standing.accoladeLevel).toBe(5);

      expect(checkAccoladeEscalation(standing)).toBeNull();
    });

    it('should handle full censure escalation chain', () => {
      let standing = createStanding({ regard: -1, censureLevel: 0 });

      standing = applyCensure(standing, checkCensureEscalation(standing)!);
      expect(standing.censureLevel).toBe(1);

      standing = applyCensure(standing, checkCensureEscalation(standing)!);
      expect(standing.censureLevel).toBe(2);

      standing = applyCensure(standing, checkCensureEscalation(standing)!);
      expect(standing.censureLevel).toBe(3);

      standing = applyCensure(standing, checkCensureEscalation(standing)!);
      expect(standing.censureLevel).toBe(4);

      standing = applyCensure(standing, checkCensureEscalation(standing)!);
      expect(standing.censureLevel).toBe(5);

      expect(checkCensureEscalation(standing)).toBeNull();
    });
  });
});
