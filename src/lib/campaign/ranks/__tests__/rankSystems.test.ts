import {
  RANK_SYSTEM_MERCENARY,
  RANK_SYSTEM_SLDF,
  RANK_SYSTEM_CLAN,
  RANK_SYSTEM_COMSTAR,
  RANK_SYSTEM_GENERIC_HOUSE,
  BUILT_IN_RANK_SYSTEMS,
  getRankSystem,
  getDefaultRankSystem,
} from '@/lib/campaign/ranks/rankSystems';
import { Profession } from '@/types/campaign/ranks/rankTypes';

const ALL_SYSTEMS = [
  RANK_SYSTEM_MERCENARY,
  RANK_SYSTEM_SLDF,
  RANK_SYSTEM_CLAN,
  RANK_SYSTEM_COMSTAR,
  RANK_SYSTEM_GENERIC_HOUSE,
];

describe('rankSystems', () => {
  describe('all systems share structural invariants', () => {
    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s has exactly 51 ranks',
      (_code, system) => {
        expect(system.ranks).toHaveLength(51);
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s has type "default"',
      (_code, system) => {
        expect(system.type).toBe('default');
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s has a non-empty code',
      (_code, system) => {
        expect(system.code.length).toBeGreaterThan(0);
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s has a non-empty name',
      (_code, system) => {
        expect(system.name.length).toBeGreaterThan(0);
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s has a non-empty description',
      (_code, system) => {
        expect(system.description.length).toBeGreaterThan(0);
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s officerCut is 31',
      (_code, system) => {
        expect(system.officerCut).toBe(31);
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s pay multipliers are in [1.0, 3.5]',
      (_code, system) => {
        for (const r of system.ranks) {
          expect(r.payMultiplier).toBeGreaterThanOrEqual(1.0);
          expect(r.payMultiplier).toBeLessThanOrEqual(3.5);
        }
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s is frozen',
      (_code, system) => {
        expect(Object.isFrozen(system)).toBe(true);
      },
    );
  });

  describe('RANK_SYSTEM_MERCENARY', () => {
    const sys = RANK_SYSTEM_MERCENARY;

    it('has code MERC', () => {
      expect(sys.code).toBe('MERC');
    });

    it('has name Mercenary', () => {
      expect(sys.name).toBe('Mercenary');
    });

    it('rank 0 has "None" for all 8 professions', () => {
      const r = sys.ranks[0];
      expect(r.names[Profession.MEKWARRIOR]).toBe('None');
      expect(r.names[Profession.AEROSPACE]).toBe('None');
      expect(r.names[Profession.VEHICLE]).toBe('None');
      expect(r.names[Profession.NAVAL]).toBe('None');
      expect(r.names[Profession.INFANTRY]).toBe('None');
      expect(r.names[Profession.TECH]).toBe('None');
      expect(r.names[Profession.MEDICAL]).toBe('None');
      expect(r.names[Profession.ADMINISTRATOR]).toBe('None');
      expect(r.officer).toBe(false);
      expect(r.payMultiplier).toBe(1.0);
    });

    it('rank 1 has profession-specific enlisted names', () => {
      const r = sys.ranks[1];
      expect(r.names[Profession.MEKWARRIOR]).toBe('Private');
      expect(r.names[Profession.AEROSPACE]).toBe('Airman');
      expect(r.names[Profession.VEHICLE]).toBe('Crewman');
      expect(r.names[Profession.NAVAL]).toBe('Seaman');
      expect(r.names[Profession.INFANTRY]).toBe('Trooper');
      expect(r.names[Profession.TECH]).toBe('Tech');
      expect(r.names[Profession.MEDICAL]).toBe('Orderly');
      expect(r.names[Profession.ADMINISTRATOR]).toBe('Clerk');
    });

    it('rank 5 has branch-specific sergeant names', () => {
      const r = sys.ranks[5];
      expect(r.names[Profession.MEKWARRIOR]).toBe('Sergeant');
      expect(r.names[Profession.AEROSPACE]).toBe('Flight Sergeant');
      expect(r.names[Profession.VEHICLE]).toBe('Crew Chief');
      expect(r.names[Profession.NAVAL]).toBe('Petty Officer');
      expect(r.names[Profession.INFANTRY]).toBe('Squad Leader');
      expect(r.payMultiplier).toBe(1.1);
    });

    it('rank 31 is the first officer rank', () => {
      const r = sys.ranks[31];
      expect(r.officer).toBe(true);
      expect(r.names[Profession.MEKWARRIOR]).toBe('Lieutenant');
      expect(r.names[Profession.AEROSPACE]).toBe('Flight Lieutenant');
      expect(r.names[Profession.NAVAL]).toBe('Ensign');
      expect(r.payMultiplier).toBe(1.4);
    });

    it('rank 50 is General with pay 3.0', () => {
      const r = sys.ranks[50];
      expect(r.names[Profession.MEKWARRIOR]).toBe('General');
      expect(r.officer).toBe(true);
      expect(r.payMultiplier).toBe(3.0);
    });

    it('unpopulated rank 2 is empty', () => {
      const r = sys.ranks[2];
      expect(Object.keys(r.names)).toHaveLength(0);
      expect(r.officer).toBe(false);
      expect(r.payMultiplier).toBe(1.0);
    });

    it('unpopulated rank 20 is empty', () => {
      const r = sys.ranks[20];
      expect(Object.keys(r.names)).toHaveLength(0);
      expect(r.officer).toBe(false);
      expect(r.payMultiplier).toBe(1.0);
    });

    it('enlisted ranks (0-20) are not officers', () => {
      for (let i = 0; i <= 20; i++) {
        expect(sys.ranks[i].officer).toBe(false);
      }
    });
  });

  describe('RANK_SYSTEM_SLDF', () => {
    const sys = RANK_SYSTEM_SLDF;

    it('has code SLDF', () => {
      expect(sys.code).toBe('SLDF');
    });

    it('has name Star League Defense Force', () => {
      expect(sys.name).toBe('Star League Defense Force');
    });

    it('rank 1 is Recruit', () => {
      expect(sys.ranks[1].names[Profession.MEKWARRIOR]).toBe('Recruit');
    });

    it('rank 25 is Senior Warrant Officer', () => {
      expect(sys.ranks[25].names[Profession.MEKWARRIOR]).toBe(
        'Senior Warrant Officer',
      );
      expect(sys.ranks[25].payMultiplier).toBe(1.35);
    });

    it('rank 50 is General with pay 3.0', () => {
      expect(sys.ranks[50].names[Profession.MEKWARRIOR]).toBe('General');
      expect(sys.ranks[50].officer).toBe(true);
      expect(sys.ranks[50].payMultiplier).toBe(3.0);
    });

    it('uses only mekwarrior profession', () => {
      for (const r of sys.ranks) {
        const keys = Object.keys(r.names);
        if (keys.length > 0) {
          expect(keys).toEqual([Profession.MEKWARRIOR]);
        }
      }
    });
  });

  describe('RANK_SYSTEM_CLAN', () => {
    const sys = RANK_SYSTEM_CLAN;

    it('has code CLAN', () => {
      expect(sys.code).toBe('CLAN');
    });

    it('rank 0 is Freeborn', () => {
      expect(sys.ranks[0].names[Profession.MEKWARRIOR]).toBe('Freeborn');
    });

    it('rank 5 is Point Commander', () => {
      expect(sys.ranks[5].names[Profession.MEKWARRIOR]).toBe('Point Commander');
      expect(sys.ranks[5].payMultiplier).toBe(1.1);
    });

    it('rank 10 is Star Commander', () => {
      expect(sys.ranks[10].names[Profession.MEKWARRIOR]).toBe('Star Commander');
      expect(sys.ranks[10].payMultiplier).toBe(1.2);
    });

    it('rank 50 is ilKhan with pay 3.5', () => {
      expect(sys.ranks[50].names[Profession.MEKWARRIOR]).toBe('ilKhan');
      expect(sys.ranks[50].officer).toBe(true);
      expect(sys.ranks[50].payMultiplier).toBe(3.5);
    });

    it('rank 40 is saKhan', () => {
      expect(sys.ranks[40].names[Profession.MEKWARRIOR]).toBe('saKhan');
      expect(sys.ranks[40].officer).toBe(true);
    });

    it('rank 31 is Star Colonel (first officer)', () => {
      expect(sys.ranks[31].names[Profession.MEKWARRIOR]).toBe('Star Colonel');
      expect(sys.ranks[31].officer).toBe(true);
      expect(sys.ranks[31].payMultiplier).toBe(1.5);
    });

    it('has fewer populated ranks than Mercenary', () => {
      const clanPopulated = sys.ranks.filter(
        (r) => Object.keys(r.names).length > 0,
      ).length;
      const mercPopulated = RANK_SYSTEM_MERCENARY.ranks.filter(
        (r) => Object.keys(r.names).length > 0,
      ).length;
      expect(clanPopulated).toBeLessThan(mercPopulated);
    });
  });

  describe('RANK_SYSTEM_COMSTAR', () => {
    const sys = RANK_SYSTEM_COMSTAR;

    it('has code COMSTAR', () => {
      expect(sys.code).toBe('COMSTAR');
    });

    it('rank 0 is Acolyte', () => {
      expect(sys.ranks[0].names[Profession.MEKWARRIOR]).toBe('Acolyte');
    });

    it('rank 3 is Adept', () => {
      expect(sys.ranks[3].names[Profession.MEKWARRIOR]).toBe('Adept');
      expect(sys.ranks[3].payMultiplier).toBe(1.05);
    });

    it('rank 8 is Demi-Precentor', () => {
      expect(sys.ranks[8].names[Profession.MEKWARRIOR]).toBe('Demi-Precentor');
    });

    it('rank 31 is Precentor Martial (first officer)', () => {
      expect(sys.ranks[31].names[Profession.MEKWARRIOR]).toBe(
        'Precentor Martial',
      );
      expect(sys.ranks[31].officer).toBe(true);
    });

    it('rank 40 is Primus with pay 2.5', () => {
      expect(sys.ranks[40].names[Profession.MEKWARRIOR]).toBe('Primus');
      expect(sys.ranks[40].payMultiplier).toBe(2.5);
    });

    it('is the most sparse system (fewest populated ranks)', () => {
      const comstarPopulated = sys.ranks.filter(
        (r) => Object.keys(r.names).length > 0,
      ).length;
      for (const other of ALL_SYSTEMS) {
        if (other.code === 'COMSTAR') continue;
        const otherPopulated = other.ranks.filter(
          (r) => Object.keys(r.names).length > 0,
        ).length;
        expect(comstarPopulated).toBeLessThanOrEqual(otherPopulated);
      }
    });
  });

  describe('RANK_SYSTEM_GENERIC_HOUSE', () => {
    const sys = RANK_SYSTEM_GENERIC_HOUSE;

    it('has code HOUSE', () => {
      expect(sys.code).toBe('HOUSE');
    });

    it('rank 31 is Leutnant (Lyran-style)', () => {
      expect(sys.ranks[31].names[Profession.MEKWARRIOR]).toBe('Leutnant');
      expect(sys.ranks[31].officer).toBe(true);
    });

    it('rank 34 is Hauptmann', () => {
      expect(sys.ranks[34].names[Profession.MEKWARRIOR]).toBe('Hauptmann');
    });

    it('rank 37 is Kommandant', () => {
      expect(sys.ranks[37].names[Profession.MEKWARRIOR]).toBe('Kommandant');
    });

    it("rank 50 is Archon's Champion with pay 3.0", () => {
      expect(sys.ranks[50].names[Profession.MEKWARRIOR]).toBe(
        "Archon's Champion",
      );
      expect(sys.ranks[50].payMultiplier).toBe(3.0);
    });

    it('rank 48 is Marshal', () => {
      expect(sys.ranks[48].names[Profession.MEKWARRIOR]).toBe('Marshal');
      expect(sys.ranks[48].payMultiplier).toBe(2.8);
    });
  });

  describe('BUILT_IN_RANK_SYSTEMS', () => {
    it('contains exactly 5 entries', () => {
      expect(Object.keys(BUILT_IN_RANK_SYSTEMS)).toHaveLength(5);
    });

    it('maps MERC to RANK_SYSTEM_MERCENARY', () => {
      expect(BUILT_IN_RANK_SYSTEMS['MERC']).toBe(RANK_SYSTEM_MERCENARY);
    });

    it('maps SLDF to RANK_SYSTEM_SLDF', () => {
      expect(BUILT_IN_RANK_SYSTEMS['SLDF']).toBe(RANK_SYSTEM_SLDF);
    });

    it('maps CLAN to RANK_SYSTEM_CLAN', () => {
      expect(BUILT_IN_RANK_SYSTEMS['CLAN']).toBe(RANK_SYSTEM_CLAN);
    });

    it('maps COMSTAR to RANK_SYSTEM_COMSTAR', () => {
      expect(BUILT_IN_RANK_SYSTEMS['COMSTAR']).toBe(RANK_SYSTEM_COMSTAR);
    });

    it('maps HOUSE to RANK_SYSTEM_GENERIC_HOUSE', () => {
      expect(BUILT_IN_RANK_SYSTEMS['HOUSE']).toBe(RANK_SYSTEM_GENERIC_HOUSE);
    });

    it('is frozen', () => {
      expect(Object.isFrozen(BUILT_IN_RANK_SYSTEMS)).toBe(true);
    });
  });

  describe('getRankSystem', () => {
    it('returns RANK_SYSTEM_MERCENARY for "MERC"', () => {
      expect(getRankSystem('MERC')).toBe(RANK_SYSTEM_MERCENARY);
    });

    it('returns RANK_SYSTEM_SLDF for "SLDF"', () => {
      expect(getRankSystem('SLDF')).toBe(RANK_SYSTEM_SLDF);
    });

    it('returns RANK_SYSTEM_CLAN for "CLAN"', () => {
      expect(getRankSystem('CLAN')).toBe(RANK_SYSTEM_CLAN);
    });

    it('returns RANK_SYSTEM_COMSTAR for "COMSTAR"', () => {
      expect(getRankSystem('COMSTAR')).toBe(RANK_SYSTEM_COMSTAR);
    });

    it('returns RANK_SYSTEM_GENERIC_HOUSE for "HOUSE"', () => {
      expect(getRankSystem('HOUSE')).toBe(RANK_SYSTEM_GENERIC_HOUSE);
    });

    it('returns undefined for unknown code', () => {
      expect(getRankSystem('UNKNOWN')).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
      expect(getRankSystem('')).toBeUndefined();
    });

    it('is case-sensitive', () => {
      expect(getRankSystem('merc')).toBeUndefined();
      expect(getRankSystem('Merc')).toBeUndefined();
    });
  });

  describe('getDefaultRankSystem', () => {
    it('returns RANK_SYSTEM_MERCENARY', () => {
      expect(getDefaultRankSystem()).toBe(RANK_SYSTEM_MERCENARY);
    });

    it('returns a system with code MERC', () => {
      expect(getDefaultRankSystem().code).toBe('MERC');
    });
  });

  describe('officer flag consistency', () => {
    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s: populated ranks at/above officerCut have officer=true',
      (_code, system) => {
        for (let i = system.officerCut; i < 51; i++) {
          const r = system.ranks[i];
          if (Object.keys(r.names).length > 0) {
            expect(r.officer).toBe(true);
          }
        }
      },
    );

    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s: populated ranks below officerCut have officer=false',
      (_code, system) => {
        for (let i = 0; i < system.officerCut; i++) {
          const r = system.ranks[i];
          if (Object.keys(r.names).length > 0) {
            expect(r.officer).toBe(false);
          }
        }
      },
    );
  });

  describe('pay multiplier ordering', () => {
    it.each(ALL_SYSTEMS.map((s) => [s.code, s] as const))(
      '%s: populated ranks have non-decreasing pay multipliers',
      (_code, system) => {
        let lastPay = 0;
        for (const r of system.ranks) {
          if (Object.keys(r.names).length > 0) {
            expect(r.payMultiplier).toBeGreaterThanOrEqual(lastPay);
            lastPay = r.payMultiplier;
          }
        }
      },
    );
  });
});
