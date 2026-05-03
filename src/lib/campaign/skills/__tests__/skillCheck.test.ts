import { describe, it, expect } from '@jest/globals';

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';
import type { IPilot } from '@/types/pilot/PilotInterfaces';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { ISkillType } from '@/types/campaign/skills';
import { PilotStatus, PilotType } from '@/types/pilot/PilotInterfaces';

import { performSkillCheck, getEffectiveSkillTN } from '../skillCheck';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeEntry(
  overrides: Partial<ICampaignRosterEntry> = {},
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-001',
    pilotName: 'Test Pilot',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 500,
    campaignXpEarned: 1500,
    campaignKills: 8,
    campaignMissions: 12,
    hireDate: new Date('3000-01-01'),
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
    ...overrides,
  };
}

function makePilot(overrides: Partial<IPilot> = {}): IPilot {
  return {
    id: 'pilot-001',
    name: 'Test Pilot',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    // Gunnery 4, Piloting 5 — the only skills on IPilotSkills today
    skills: { gunnery: 4, piloting: 5 },
    wounds: 0,
    abilities: [],
    createdAt: '3000-01-01T00:00:00Z',
    updatedAt: '3025-06-15T00:00:00Z',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Skill type fixtures
// ---------------------------------------------------------------------------

const gunneryType: ISkillType = {
  id: 'gunnery',
  name: 'Gunnery',
  description: 'Ability to aim and fire ballistic weapons',
  targetNumber: 4,
  costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  linkedAttribute: 'DEX',
};

const pilotingType: ISkillType = {
  id: 'piloting-mech',
  name: 'Piloting (Mech)',
  description: 'Ability to pilot a BattleMech',
  targetNumber: 4,
  costs: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  linkedAttribute: 'REF',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Skill Check Resolution', () => {
  const baseEntry = makeEntry();
  // Pilot with gunnery 4 — TN = 4 - 4 = 0
  const skilledPilot = makePilot({ skills: { gunnery: 4, piloting: 5 } });

  describe('getEffectiveSkillTN', () => {
    it('RED: pilot with known skill has lower TN than NPC', () => {
      const pilotTN = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
      );
      const npcTN = getEffectiveSkillTN(
        baseEntry,
        null,
        'gunnery',
        gunneryType,
        [],
      );

      expect(pilotTN).toBeLessThan(npcTN);
    });

    it('RED: NPC (null pilot) gets unskilled penalty — TN = baseTN + 4', () => {
      // baseTN = 4, unskilled adds +4 = 8
      const tn = getEffectiveSkillTN(
        baseEntry,
        null,
        'gunnery',
        gunneryType,
        [],
      );
      expect(tn).toBe(8);
    });

    it('RED: pilot with gunnery 4 — TN = 4 - 4 = 0', () => {
      const tn = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
      );
      // @stub Plan 7 — attribute modifier not applied yet (IPilot has no attributes)
      expect(tn).toBe(0);
    });

    it('RED: pilot with unknown skill gets unskilled penalty', () => {
      // 'medicine' is not on IPilotSkills — treated as unskilled
      const tn = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'medicine',
        gunneryType,
        [],
      );
      expect(tn).toBe(8);
    });

    it('RED: modifiers add/subtract from TN', () => {
      const baseTN = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
      );

      const withPositive = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [{ name: 'Called Shot', value: 2 }],
      );
      const withNegative = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [{ name: 'Injured', value: -2 }],
      );

      expect(withPositive).toBe(baseTN + 2);
      expect(withNegative).toBe(baseTN - 2);
    });

    it('RED: multiple modifiers sum correctly', () => {
      const baseTN = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
      );

      const withMultiple = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [
          { name: 'Called Shot', value: 2 },
          { name: 'Injured', value: -1 },
          { name: 'Darkness', value: 1 },
        ],
      );

      // 2 - 1 + 1 = +2
      expect(withMultiple).toBe(baseTN + 2);
    });

    it('GREEN: default modifiers param is empty array', () => {
      // Should not throw when modifiers omitted
      const tn = getEffectiveSkillTN(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
      );
      expect(typeof tn).toBe('number');
    });
  });

  describe('performSkillCheck', () => {
    it('RED: success when roll >= TN', () => {
      // Pilot gunnery 4, baseTN 4 → TN 0. Roll 6 (3+3) >= 0 → success
      const random = () => 3;
      const result = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        random,
      );

      expect(result.success).toBe(true);
      expect(result.roll).toBe(6);
      expect(result.targetNumber).toBe(0);
    });

    it('RED: NPC failure — unskilled TN 8, roll 2 (1+1) < 8', () => {
      const random = () => 1;
      const result = performSkillCheck(
        baseEntry,
        null,
        'gunnery',
        gunneryType,
        [],
        random,
      );

      expect(result.success).toBe(false);
      expect(result.roll).toBe(2);
      expect(result.targetNumber).toBe(8);
    });

    it('RED: critical success at margin >= 4', () => {
      // Roll 12 (6+6), TN 0 → margin 12 >= 4 → criticalSuccess
      const random = () => 6;
      const result = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        random,
      );

      expect(result.criticalSuccess).toBe(true);
      expect(result.margin).toBeGreaterThanOrEqual(4);
    });

    it('RED: critical failure at margin <= -4', () => {
      // Roll 2 (1+1), NPC TN 8 → margin 2 - 8 = -6 <= -4 → criticalFailure
      const random = () => 1;
      const result = performSkillCheck(
        baseEntry,
        null,
        'gunnery',
        gunneryType,
        [],
        random,
      );

      expect(result.criticalFailure).toBe(true);
      expect(result.margin).toBeLessThanOrEqual(-4);
    });

    it('RED: margin calculation is correct', () => {
      // Roll 8 (4+4), gunnery 4 → TN 0 → margin 8
      const random = () => 4;
      const result = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        random,
      );

      expect(result.margin).toBe(8);
    });

    it('RED: deterministic with seeded random', () => {
      const random1 = () => 3;
      const random2 = () => 3;

      const r1 = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        random1,
      );
      const r2 = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        random2,
      );

      expect(r1.roll).toBe(r2.roll);
      expect(r1.success).toBe(r2.success);
      expect(r1.margin).toBe(r2.margin);
    });

    it('GREEN: modifiers are included in result', () => {
      const modifiers = [
        { name: 'Called Shot', value: 2 },
        { name: 'Injured', value: -1 },
      ];
      const random = () => 3;
      const result = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        modifiers,
        random,
      );

      expect(result.modifiers).toEqual(modifiers);
    });

    it('GREEN: result is array (readonly modifiers)', () => {
      const random = () => 3;
      const result = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        random,
      );

      expect(Array.isArray(result.modifiers)).toBe(true);
    });

    it('GREEN: 2d6 roll range is 2-12', () => {
      const minResult = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        () => 1,
      );
      expect(minResult.roll).toBe(2);

      const maxResult = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        () => 6,
      );
      expect(maxResult.roll).toBe(12);
    });

    it('GREEN: handles NPC unskilled check — TN 8, roll 10 (5+5) succeeds', () => {
      const random = () => 5;
      const result = performSkillCheck(
        baseEntry,
        null,
        'piloting-mech',
        pilotingType,
        [],
        random,
      );

      expect(result.targetNumber).toBe(8);
      expect(result.success).toBe(true);
    });

    it('GREEN: result contains all required fields', () => {
      const random = () => 3;
      const result = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [{ name: 'Test', value: 1 }],
        random,
      );

      expect(result).toHaveProperty('roll');
      expect(result).toHaveProperty('targetNumber');
      expect(result).toHaveProperty('margin');
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('criticalSuccess');
      expect(result).toHaveProperty('criticalFailure');
      expect(result).toHaveProperty('modifiers');
    });

    it('GREEN: result fields have correct types', () => {
      const random = () => 3;
      const result = performSkillCheck(
        baseEntry,
        skilledPilot,
        'gunnery',
        gunneryType,
        [],
        random,
      );

      expect(typeof result.roll).toBe('number');
      expect(typeof result.targetNumber).toBe('number');
      expect(typeof result.margin).toBe('number');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.criticalSuccess).toBe('boolean');
      expect(typeof result.criticalFailure).toBe('boolean');
      expect(Array.isArray(result.modifiers)).toBe(true);
    });
  });
});
