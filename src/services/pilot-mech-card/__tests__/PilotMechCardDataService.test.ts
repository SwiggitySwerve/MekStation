/**
 * Pilot-Mech Card Data Service Tests
 */

import {
  calculateBaseToHit,
  calculateConsciousnessTarget,
  getStatusDisplayName,
  formatSkills,
  isPilotCombatReady,
  getWoundSeverity,
  calculateArmorPercentage,
  createPilotMechCardData,
  BASE_TO_HIT,
  BASE_CONSCIOUSNESS,
  MAX_WOUNDS,
} from '../PilotMechCardDataService';
import { PilotStatus, PilotType, IPilot } from '@/types/pilot';
import { IPilotMechCardData } from '@/types/pilot/pilot-mech-card';

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockPilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-1',
    name: 'John Doe',
    callsign: 'Viper',
    affiliation: 'Lyran Commonwealth',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: {
      gunnery: 4,
      piloting: 5,
    },
    wounds: 0,
    abilities: [
      { abilityId: 'marksman', acquiredDate: '3025-01-01' },
      { abilityId: 'iron-will', acquiredDate: '3025-06-01' },
    ],
    career: {
      missionsCompleted: 12,
      victories: 8,
      defeats: 2,
      draws: 2,
      totalKills: 15,
      killRecords: [],
      missionHistory: [],
      xp: 150,
      totalXpEarned: 300,
      rank: 'MechWarrior',
    },
    createdAt: '3025-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

function createMockPilotMechCardData(
  overrides: Partial<IPilotMechCardData> = {}
): IPilotMechCardData {
  return {
    pilotId: 'pilot-1',
    pilotName: 'John Doe',
    callsign: 'Viper',
    affiliation: 'Lyran Commonwealth',
    rank: 'MechWarrior',
    gunnery: 4,
    piloting: 5,
    missions: 12,
    kills: 15,
    xp: 150,
    wounds: 0,
    status: 'Active',
    abilities: ['marksman', 'iron-will'],
    baseToHit: 8,
    consciousnessTarget: 3,
    mech: {
      unitId: 'mech-1',
      name: 'Atlas AS7-D',
      chassis: 'Atlas',
      tonnage: 100,
      weightClass: 'Assault',
      techBase: 'IS',
      battleValue: 1897,
      walkMP: 3,
      runMP: 5,
      jumpMP: 0,
      totalArmor: 304,
      maxArmor: 304,
    },
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('PilotMechCardDataService', () => {
  describe('Constants', () => {
    it('has correct base to-hit value', () => {
      expect(BASE_TO_HIT).toBe(4);
    });

    it('has correct base consciousness value', () => {
      expect(BASE_CONSCIOUSNESS).toBe(3);
    });

    it('has correct max wounds value', () => {
      expect(MAX_WOUNDS).toBe(6);
    });
  });

  describe('calculateBaseToHit', () => {
    it('calculates correct to-hit for gunnery 4', () => {
      expect(calculateBaseToHit(4)).toBe(8); // 4 + 4
    });

    it('calculates correct to-hit for gunnery 2 (elite)', () => {
      expect(calculateBaseToHit(2)).toBe(6); // 4 + 2
    });

    it('calculates correct to-hit for gunnery 6 (green)', () => {
      expect(calculateBaseToHit(6)).toBe(10); // 4 + 6
    });

    it('handles edge case gunnery 1', () => {
      expect(calculateBaseToHit(1)).toBe(5);
    });

    it('handles edge case gunnery 8', () => {
      expect(calculateBaseToHit(8)).toBe(12);
    });
  });

  describe('calculateConsciousnessTarget', () => {
    it('calculates target with no wounds', () => {
      expect(calculateConsciousnessTarget(0)).toBe(3);
    });

    it('calculates target with 3 wounds', () => {
      expect(calculateConsciousnessTarget(3)).toBe(6);
    });

    it('calculates target with max wounds', () => {
      expect(calculateConsciousnessTarget(6)).toBe(9);
    });
  });

  describe('getStatusDisplayName', () => {
    it('returns "Active" for Active status', () => {
      expect(getStatusDisplayName(PilotStatus.Active)).toBe('Active');
    });

    it('returns "Injured" for Injured status', () => {
      expect(getStatusDisplayName(PilotStatus.Injured)).toBe('Injured');
    });

    it('returns "MIA" for MIA status', () => {
      expect(getStatusDisplayName(PilotStatus.MIA)).toBe('MIA');
    });

    it('returns "KIA" for KIA status', () => {
      expect(getStatusDisplayName(PilotStatus.KIA)).toBe('KIA');
    });

    it('returns "Retired" for Retired status', () => {
      expect(getStatusDisplayName(PilotStatus.Retired)).toBe('Retired');
    });
  });

  describe('formatSkills', () => {
    it('formats standard 4/5 skills', () => {
      expect(formatSkills(4, 5)).toBe('4/5');
    });

    it('formats elite 2/3 skills', () => {
      expect(formatSkills(2, 3)).toBe('2/3');
    });

    it('formats green 6/7 skills', () => {
      expect(formatSkills(6, 7)).toBe('6/7');
    });
  });

  describe('isPilotCombatReady', () => {
    it('returns true for active pilot with mech and no wounds', () => {
      const data = createMockPilotMechCardData();
      expect(isPilotCombatReady(data)).toBe(true);
    });

    it('returns false when pilot has no mech', () => {
      const data = createMockPilotMechCardData({ mech: null });
      expect(isPilotCombatReady(data)).toBe(false);
    });

    it('returns false when pilot is injured status', () => {
      const data = createMockPilotMechCardData({ status: 'Injured' });
      expect(isPilotCombatReady(data)).toBe(false);
    });

    it('returns false when pilot has max wounds', () => {
      const data = createMockPilotMechCardData({ wounds: 6 });
      expect(isPilotCombatReady(data)).toBe(false);
    });

    it('returns true when pilot has some wounds but under max', () => {
      const data = createMockPilotMechCardData({ wounds: 3 });
      expect(isPilotCombatReady(data)).toBe(true);
    });
  });

  describe('getWoundSeverity', () => {
    it('returns "none" for 0 wounds', () => {
      expect(getWoundSeverity(0)).toBe('none');
    });

    it('returns "light" for 1-2 wounds', () => {
      expect(getWoundSeverity(1)).toBe('light');
      expect(getWoundSeverity(2)).toBe('light');
    });

    it('returns "moderate" for 3-4 wounds', () => {
      expect(getWoundSeverity(3)).toBe('moderate');
      expect(getWoundSeverity(4)).toBe('moderate');
    });

    it('returns "severe" for 5 wounds', () => {
      expect(getWoundSeverity(5)).toBe('severe');
    });

    it('returns "critical" for 6 wounds', () => {
      expect(getWoundSeverity(6)).toBe('critical');
    });
  });

  describe('calculateArmorPercentage', () => {
    it('calculates 100% for full armor', () => {
      expect(calculateArmorPercentage(304, 304)).toBe(100);
    });

    it('calculates correct percentage for partial armor', () => {
      expect(calculateArmorPercentage(152, 304)).toBe(50);
    });

    it('returns 0 for no armor', () => {
      expect(calculateArmorPercentage(0, 304)).toBe(0);
    });

    it('handles zero max armor edge case', () => {
      expect(calculateArmorPercentage(100, 0)).toBe(0);
    });

    it('rounds to nearest integer', () => {
      expect(calculateArmorPercentage(100, 304)).toBe(33); // 32.89...
    });
  });

  describe('createPilotMechCardData', () => {
    it('creates complete data from pilot without mech', () => {
      const pilot = createMockPilot();
      const data = createPilotMechCardData(pilot, null);

      expect(data.pilotId).toBe('pilot-1');
      expect(data.pilotName).toBe('John Doe');
      expect(data.callsign).toBe('Viper');
      expect(data.affiliation).toBe('Lyran Commonwealth');
      expect(data.rank).toBe('MechWarrior');
      expect(data.gunnery).toBe(4);
      expect(data.piloting).toBe(5);
      expect(data.missions).toBe(12);
      expect(data.kills).toBe(15);
      expect(data.xp).toBe(150);
      expect(data.wounds).toBe(0);
      expect(data.status).toBe('Active');
      expect(data.abilities).toEqual(['marksman', 'iron-will']);
      expect(data.baseToHit).toBe(8);
      expect(data.consciousnessTarget).toBe(3);
      expect(data.mech).toBeNull();
    });

    it('includes career data when present', () => {
      const pilot = createMockPilot();
      const data = createPilotMechCardData(pilot, null);

      expect(data.missions).toBe(12);
      expect(data.kills).toBe(15);
      expect(data.xp).toBe(150);
    });

    it('handles pilot without career data', () => {
      const pilot = createMockPilot({
        type: PilotType.Statblock,
        career: undefined,
      });
      const data = createPilotMechCardData(pilot, null);

      expect(data.missions).toBeUndefined();
      expect(data.kills).toBeUndefined();
      expect(data.xp).toBeUndefined();
      expect(data.rank).toBeUndefined();
    });

    it('handles pilot without callsign', () => {
      const pilot = createMockPilot({ callsign: undefined });
      const data = createPilotMechCardData(pilot, null);

      expect(data.callsign).toBeUndefined();
    });

    it('handles pilot with wounds', () => {
      const pilot = createMockPilot({ wounds: 3 });
      const data = createPilotMechCardData(pilot, null);

      expect(data.wounds).toBe(3);
      expect(data.consciousnessTarget).toBe(6); // 3 + 3
    });

    it('handles pilot with different gunnery skill', () => {
      const pilot = createMockPilot({
        skills: { gunnery: 2, piloting: 3 },
      });
      const data = createPilotMechCardData(pilot, null);

      expect(data.gunnery).toBe(2);
      expect(data.baseToHit).toBe(6); // 4 + 2
    });

    it('extracts pilot abilities', () => {
      const pilot = createMockPilot({
        abilities: [
          { abilityId: 'melee-specialist', acquiredDate: '3025-01-01' },
        ],
      });
      const data = createPilotMechCardData(pilot, null);

      expect(data.abilities).toEqual(['melee-specialist']);
    });

    it('handles empty abilities list', () => {
      const pilot = createMockPilot({ abilities: [] });
      const data = createPilotMechCardData(pilot, null);

      expect(data.abilities).toEqual([]);
    });
  });
});
