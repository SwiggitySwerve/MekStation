/**
 * Tests for XP Calculator
 */

import {
  calculateMissionXP,
  calculateXPBreakdown,
  xpRequiredForLevel,
  canImproveSkill,
  calculateTeamXP,
  XP_VALUES,
} from '../XPCalculator';

describe('XPCalculator', () => {
  describe('calculateMissionXP', () => {
    it('should award base XP for participation', () => {
      const xp = calculateMissionXP({
        kills: 0,
        victory: false,
        survivedCritical: false,
        optionalObjectivesCompleted: 0,
      });

      expect(xp).toBe(XP_VALUES.BASE_PARTICIPATION);
    });

    it('should award XP for kills', () => {
      const xp = calculateMissionXP({
        kills: 3,
        victory: false,
        survivedCritical: false,
        optionalObjectivesCompleted: 0,
      });

      expect(xp).toBe(XP_VALUES.BASE_PARTICIPATION + 3 * XP_VALUES.PER_KILL);
    });

    it('should award victory bonus', () => {
      const xp = calculateMissionXP({
        kills: 0,
        victory: true,
        survivedCritical: false,
        optionalObjectivesCompleted: 0,
      });

      expect(xp).toBe(XP_VALUES.BASE_PARTICIPATION + XP_VALUES.VICTORY_BONUS);
    });

    it('should award critical survival bonus', () => {
      const xp = calculateMissionXP({
        kills: 0,
        victory: false,
        survivedCritical: true,
        optionalObjectivesCompleted: 0,
      });

      expect(xp).toBe(
        XP_VALUES.BASE_PARTICIPATION + XP_VALUES.CRITICAL_SURVIVAL,
      );
    });

    it('should award objective bonus', () => {
      const xp = calculateMissionXP({
        kills: 0,
        victory: false,
        survivedCritical: false,
        optionalObjectivesCompleted: 2,
      });

      expect(xp).toBe(
        XP_VALUES.BASE_PARTICIPATION + 2 * XP_VALUES.PER_OBJECTIVE,
      );
    });

    it('should stack all bonuses correctly', () => {
      const xp = calculateMissionXP({
        kills: 2,
        victory: true,
        survivedCritical: true,
        optionalObjectivesCompleted: 1,
        wasWounded: true,
        heavyDamage: true,
      });

      const expected =
        XP_VALUES.BASE_PARTICIPATION +
        2 * XP_VALUES.PER_KILL +
        XP_VALUES.VICTORY_BONUS +
        XP_VALUES.CRITICAL_SURVIVAL +
        XP_VALUES.PER_OBJECTIVE +
        XP_VALUES.WOUNDED_SURVIVAL +
        XP_VALUES.HEAVY_DAMAGE_SURVIVAL;

      expect(xp).toBe(expected);
    });
  });

  describe('calculateXPBreakdown', () => {
    it('should provide detailed breakdown', () => {
      const breakdown = calculateXPBreakdown({
        kills: 2,
        victory: true,
        survivedCritical: true,
        optionalObjectivesCompleted: 1,
      });

      expect(breakdown.baseXP).toBe(XP_VALUES.BASE_PARTICIPATION);
      expect(breakdown.killXP).toBe(2 * XP_VALUES.PER_KILL);
      expect(breakdown.victoryXP).toBe(XP_VALUES.VICTORY_BONUS);
      expect(breakdown.survivalXP).toBe(XP_VALUES.CRITICAL_SURVIVAL);
      expect(breakdown.objectiveXP).toBe(XP_VALUES.PER_OBJECTIVE);
      expect(breakdown.totalXP).toBe(
        breakdown.baseXP +
          breakdown.killXP +
          breakdown.victoryXP +
          breakdown.survivalXP +
          breakdown.objectiveXP +
          breakdown.bonusXP,
      );
    });

    it('should include bonus XP for wounds and damage', () => {
      const breakdown = calculateXPBreakdown({
        kills: 0,
        victory: false,
        survivedCritical: false,
        optionalObjectivesCompleted: 0,
        wasWounded: true,
        heavyDamage: true,
      });

      expect(breakdown.bonusXP).toBe(
        XP_VALUES.WOUNDED_SURVIVAL + XP_VALUES.HEAVY_DAMAGE_SURVIVAL,
      );
    });
  });

  describe('xpRequiredForLevel', () => {
    it('should require more XP for better skills', () => {
      const xp5to4 = xpRequiredForLevel(5);
      const xp4to3 = xpRequiredForLevel(4);
      const xp3to2 = xpRequiredForLevel(3);
      const xp2to1 = xpRequiredForLevel(2);
      const xp1to0 = xpRequiredForLevel(1);

      expect(xp4to3).toBeGreaterThan(xp5to4);
      expect(xp3to2).toBeGreaterThan(xp4to3);
      expect(xp2to1).toBeGreaterThan(xp3to2);
      expect(xp1to0).toBeGreaterThan(xp2to1);
    });

    it('should return Infinity for skill 0', () => {
      expect(xpRequiredForLevel(0)).toBe(Infinity);
    });

    it('should return low XP for green pilots', () => {
      expect(xpRequiredForLevel(6)).toBe(5);
    });
  });

  describe('canImproveSkill', () => {
    it('should return true when enough XP', () => {
      const result = canImproveSkill(5, 20);

      expect(result.canImprove).toBe(true);
      expect(result.xpRequired).toBe(xpRequiredForLevel(5));
      expect(result.xpRemaining).toBe(20 - result.xpRequired);
    });

    it('should return false when not enough XP', () => {
      const result = canImproveSkill(5, 1);

      expect(result.canImprove).toBe(false);
      expect(result.xpRemaining).toBe(1);
    });

    it('should handle exact XP requirement', () => {
      const required = xpRequiredForLevel(5);
      const result = canImproveSkill(5, required);

      expect(result.canImprove).toBe(true);
      expect(result.xpRemaining).toBe(0);
    });
  });

  describe('calculateTeamXP', () => {
    it('should calculate XP for all surviving pilots', () => {
      const pilots = [
        { id: 'pilot1', kills: 2, survived: true, survivedCritical: false },
        { id: 'pilot2', kills: 1, survived: true, survivedCritical: true },
        { id: 'pilot3', kills: 0, survived: true, survivedCritical: false },
      ];

      const xp = calculateTeamXP(pilots, true, 1);

      expect(xp['pilot1']).toBeGreaterThan(0);
      expect(xp['pilot2']).toBeGreaterThan(0);
      expect(xp['pilot3']).toBeGreaterThan(0);

      // Pilot with more kills should have more XP
      expect(xp['pilot1']).toBeGreaterThan(xp['pilot3']);
    });

    it('should award 0 XP to dead pilots', () => {
      const pilots = [
        { id: 'pilot1', kills: 5, survived: false, survivedCritical: false },
        { id: 'pilot2', kills: 0, survived: true, survivedCritical: false },
      ];

      const xp = calculateTeamXP(pilots, true, 0);

      expect(xp['pilot1']).toBe(0);
      expect(xp['pilot2']).toBeGreaterThan(0);
    });

    it('should include victory bonus for all survivors', () => {
      const pilots = [
        { id: 'pilot1', kills: 0, survived: true, survivedCritical: false },
        { id: 'pilot2', kills: 0, survived: true, survivedCritical: false },
      ];

      const victoryXP = calculateTeamXP(pilots, true, 0);
      const defeatXP = calculateTeamXP(pilots, false, 0);

      expect(victoryXP['pilot1']).toBeGreaterThan(defeatXP['pilot1']);
      expect(victoryXP['pilot2']).toBeGreaterThan(defeatXP['pilot2']);
    });
  });
});
