/**
 * rosterEntryToPerson shim — unit tests.
 *
 * Asserts field-by-field correctness of the bridge from
 * `ICampaignRosterEntry` (+ optional vault `IPilot`) to the legacy
 * `IPerson` shape consumed by 72 helper files. The shim's correctness
 * is load-bearing: every repointed feature in
 * `migrate-personnel-to-roster-employment` calls this function per
 * roster iteration before invoking unchanged helpers.
 *
 * @spec openspec/changes/migrate-personnel-to-roster-employment/specs/personnel-management/spec.md
 */

import type { ICampaignRosterEntry } from '@/types/campaign/CampaignRosterEntry';

import { CampaignPilotStatus } from '@/types/campaign/CampaignInterfaces.types';
import { CampaignPersonnelRole } from '@/types/campaign/enums/CampaignPersonnelRole';
import { PersonnelStatus } from '@/types/campaign/enums/PersonnelStatus';
import {
  PilotStatus,
  PilotType,
  type IPilot,
  type IPilotStatblock,
} from '@/types/pilot/PilotInterfaces';

import { rosterEntryToPerson } from '../rosterEntryToPerson';

// =============================================================================
// Fixture builders
// =============================================================================

function makeVaultPilot(overrides?: Partial<IPilot>): IPilot {
  const now = new Date('2025-01-01T00:00:00Z').toISOString();
  return {
    id: 'pilot-vault-1',
    name: 'Sarah Connor',
    type: PilotType.Persistent,
    status: PilotStatus.Active,
    skills: { gunnery: 3, piloting: 4 },
    wounds: 0,
    abilities: [],
    awards: [],
    career: {
      missionsCompleted: 10,
      victories: 7,
      defeats: 2,
      draws: 1,
      totalKills: 15,
      killRecords: [],
      missionHistory: [],
      xp: 100,
      totalXpEarned: 600,
      rank: 'Captain',
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeRosterEntry(
  overrides?: Partial<ICampaignRosterEntry>,
): ICampaignRosterEntry {
  return {
    pilotId: 'pilot-vault-1',
    pilotName: 'Sarah Connor',
    status: CampaignPilotStatus.Active,
    wounds: 0,
    recoveryTime: 0,
    xp: 50,
    campaignXpEarned: 80,
    campaignKills: 3,
    campaignMissions: 4,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('rosterEntryToPerson', () => {
  describe('PC case (vault pilot present)', () => {
    it('maps identity from vault, employment from roster', () => {
      const vault = makeVaultPilot();
      const entry = makeRosterEntry();
      const person = rosterEntryToPerson(entry, vault);

      // Identity from roster.pilotName (cached) + vault skills
      expect(person.id).toBe('pilot-vault-1');
      expect(person.name).toBe('Sarah Connor');
      expect(person.givenName).toBe('Sarah');
      expect(person.surname).toBe('Connor');
      expect(person.pilotSkills).toEqual({ gunnery: 3, piloting: 4 });

      // Career from vault
      expect(person.rank).toBe('Captain');
      expect(person.totalXpEarned).toBe(600);
      expect(person.xpSpent).toBe(550); // 600 total - 50 current

      // Campaign-scoped stats from roster
      expect(person.xp).toBe(50);
      expect(person.totalKills).toBe(3);
      expect(person.missionsCompleted).toBe(4);

      // Always defaults to PILOT role until follow-up role-expansion change
      expect(person.primaryRole).toBe(CampaignPersonnelRole.PILOT);
    });

    it('maps Active CampaignPilotStatus to ACTIVE PersonnelStatus', () => {
      const person = rosterEntryToPerson(
        makeRosterEntry({ status: CampaignPilotStatus.Active }),
        makeVaultPilot(),
      );
      expect(person.status).toBe(PersonnelStatus.ACTIVE);
    });

    it('maps Wounded and Critical CampaignPilotStatus to WOUNDED', () => {
      const wounded = rosterEntryToPerson(
        makeRosterEntry({ status: CampaignPilotStatus.Wounded }),
        makeVaultPilot(),
      );
      expect(wounded.status).toBe(PersonnelStatus.WOUNDED);

      const critical = rosterEntryToPerson(
        makeRosterEntry({ status: CampaignPilotStatus.Critical }),
        makeVaultPilot(),
      );
      expect(critical.status).toBe(PersonnelStatus.WOUNDED);
    });

    it('maps MIA / KIA CampaignPilotStatus to legacy equivalents', () => {
      expect(
        rosterEntryToPerson(
          makeRosterEntry({ status: CampaignPilotStatus.MIA }),
          makeVaultPilot(),
        ).status,
      ).toBe(PersonnelStatus.MIA);

      expect(
        rosterEntryToPerson(
          makeRosterEntry({ status: CampaignPilotStatus.KIA }),
          makeVaultPilot(),
        ).status,
      ).toBe(PersonnelStatus.KIA);
    });

    it('uses roster.hireDate when present, else falls back to vault createdAt', () => {
      const hire = new Date('2025-06-15T00:00:00Z');
      const withHire = rosterEntryToPerson(
        makeRosterEntry({ hireDate: hire }),
        makeVaultPilot(),
      );
      expect(withHire.recruitmentDate).toEqual(hire);

      const withoutHire = rosterEntryToPerson(
        makeRosterEntry(),
        makeVaultPilot(),
      );
      // Falls back to vault createdAt → Date.
      expect(withoutHire.recruitmentDate).toEqual(
        new Date('2025-01-01T00:00:00Z'),
      );
    });

    it('passes campaign wounds + recoveryTime through to hits + daysToWaitForHealing', () => {
      const person = rosterEntryToPerson(
        makeRosterEntry({ wounds: 3, recoveryTime: 14 }),
        makeVaultPilot(),
      );
      expect(person.hits).toBe(3);
      expect(person.daysToWaitForHealing).toBe(14);
    });

    it('passes departureReason through when populated', () => {
      const person = rosterEntryToPerson(
        makeRosterEntry({ departureReason: 'contract ended' }),
        makeVaultPilot(),
      );
      expect(person.departureReason).toBe('contract ended');
    });

    it('returns default IAttributes when neither vault nor statblock provides them', () => {
      const person = rosterEntryToPerson(makeRosterEntry(), makeVaultPilot());
      expect(person.attributes).toEqual({
        STR: 5,
        BOD: 5,
        REF: 5,
        DEX: 5,
        INT: 5,
        WIL: 5,
        CHA: 5,
        Edge: 2,
      });
    });
  });

  describe('NPC case (statblock present, vault absent)', () => {
    it('uses statblock for name + skills when vault is null', () => {
      const statblock: IPilotStatblock = {
        name: 'Anonymous Pirate',
        gunnery: 5,
        piloting: 6,
        abilityIds: ['spa-marksman'],
      };
      const entry = makeRosterEntry({
        pilotId: 'roster-local-npc-1',
        pilotName: 'Anonymous Pirate',
        statblockData: statblock,
      });
      const person = rosterEntryToPerson(entry, null);

      expect(person.id).toBe('roster-local-npc-1');
      expect(person.name).toBe('Anonymous Pirate');
      expect(person.pilotSkills).toEqual({ gunnery: 5, piloting: 6 });
      expect(person.specialAbilities).toEqual(['spa-marksman']);
    });

    it('NPCs get default rank and zero awards', () => {
      const statblock: IPilotStatblock = {
        name: 'NPC',
        gunnery: 4,
        piloting: 5,
      };
      const person = rosterEntryToPerson(
        makeRosterEntry({ statblockData: statblock }),
        null,
      );
      expect(person.rank).toBe('MechWarrior');
      expect(person.awards).toEqual([]);
    });
  });

  describe('degenerate case', () => {
    it('throws when both vault and statblock are absent', () => {
      const entry = makeRosterEntry({ statblockData: undefined });
      expect(() => rosterEntryToPerson(entry, null)).toThrow(
        /neither vault pilot nor inline statblock/,
      );
    });
  });

  describe('campaign-scoped XP', () => {
    it('person.xp uses roster.xp (current pool), not vault total', () => {
      const vault = makeVaultPilot({
        career: {
          ...makeVaultPilot().career!,
          xp: 999, // vault current pool — should NOT leak into person.xp
          totalXpEarned: 999,
        },
      });
      const entry = makeRosterEntry({ xp: 25 });
      const person = rosterEntryToPerson(entry, vault);

      // person.xp tracks the campaign-scoped current pool.
      expect(person.xp).toBe(25);
      // person.totalXpEarned tracks vault lifetime (cross-campaign aggregate).
      expect(person.totalXpEarned).toBe(999);
    });
  });
});
