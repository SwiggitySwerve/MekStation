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
    // Hard-cutover policy (PR2 cluster J): hireDate required on
    // every roster entry — fixtures must provide a deterministic value.
    hireDate: new Date('2025-06-15T00:00:00Z'),
    // PR1.5 Tier 1 required fields (live bug fixes)
    primaryRole: CampaignPersonnelRole.PILOT,
    rankIndex: 0,
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

      // PR1.5: primaryRole forwarded from roster entry (was hardcoded PILOT)
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

    it('threads roster.hireDate through to recruitmentDate', () => {
      // Hard-cutover policy (PR2 cluster J): hireDate is required on
      // every roster entry — no fallback chain. The shim reads it
      // directly and stamps it onto recruitmentDate.
      const hire = new Date('2025-06-15T00:00:00Z');
      const withHire = rosterEntryToPerson(
        makeRosterEntry({ hireDate: hire }),
        makeVaultPilot(),
      );
      expect(withHire.recruitmentDate).toEqual(hire);

      // The fixture default also propagates correctly.
      const defaulted = rosterEntryToPerson(
        makeRosterEntry(),
        makeVaultPilot(),
      );
      expect(defaulted.recruitmentDate).toEqual(
        new Date('2025-06-15T00:00:00Z'),
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

  // ===========================================================================
  // PR1.5 forward paths — verifies all 6 new fields forwarded from roster entry
  // (Council #4 Tier 1 live bug fixes + Tier 2 additive fields)
  // ===========================================================================

  describe('PR1.5 forward paths', () => {
    it('forwards non-PILOT primaryRole (Tier 1 live bug fix)', () => {
      // Live bug: bridge hardcoded PILOT, making DOCTOR entries invisible
      // to getBestAvailableDoctor and salary-role categorization.
      const entry = makeRosterEntry({
        primaryRole: CampaignPersonnelRole.DOCTOR,
      });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.primaryRole).toBe(CampaignPersonnelRole.DOCTOR);
    });

    it('forwards non-zero rankIndex (Tier 1 live bug fix)', () => {
      // Live bug: bridge hardcoded 0, blocking all promotions because
      // rankService.ts:208 compares newRankIndex <= currentRankIndex.
      const entry = makeRosterEntry({ rankIndex: 3 });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.rankIndex).toBe(3);
    });

    it('forwards traits with glassJaw / slowLearner flags (Tier 1 live bug fix)', () => {
      // Live bug: bridge omitted traits entirely, so aging.ts and
      // vocationalTrainingProcessor.ts silently discarded all trait flags
      // on every processing pass.
      const entry = makeRosterEntry({
        traits: { glassJaw: true, slowLearner: true },
      });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.traits).toEqual({ glassJaw: true, slowLearner: true });
    });

    it('defaults traits to empty object when roster entry has no traits', () => {
      // No traits set → bridge yields {} so helpers don't crash on
      // undefined?.glassJaw access.
      const entry = makeRosterEntry({ traits: undefined });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.traits).toEqual({});
    });

    it('forwards lastPromotionDate (Tier 1 live bug fix)', () => {
      // Live bug: bridge omitted this field, so isRecentlyPromoted always
      // returned false and the promotion-recency turnover modifier never fired.
      const promoDate = new Date('2025-03-10T00:00:00Z');
      const entry = makeRosterEntry({ lastPromotionDate: promoDate });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.lastPromotionDate).toEqual(promoDate);
    });

    it('lastPromotionDate is undefined when not set on roster entry', () => {
      const entry = makeRosterEntry({ lastPromotionDate: undefined });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.lastPromotionDate).toBeUndefined();
    });

    it('forwards isFounder flag (Tier 2 additive)', () => {
      const entry = makeRosterEntry({ isFounder: true });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.isFounder).toBe(true);
    });

    it('forwards isCommander flag (Tier 2 additive)', () => {
      const entry = makeRosterEntry({ isCommander: true });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.isCommander).toBe(true);
    });

    it('isFounder and isCommander are undefined when not set', () => {
      const entry = makeRosterEntry({
        isFounder: undefined,
        isCommander: undefined,
      });
      const person = rosterEntryToPerson(entry, makeVaultPilot());
      expect(person.isFounder).toBeUndefined();
      expect(person.isCommander).toBeUndefined();
    });
  });
});
