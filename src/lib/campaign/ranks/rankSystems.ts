import { IRank, IRankSystem, Profession, createRanks } from '@/types/campaign/ranks/rankTypes';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function createRankSystem(
  code: string,
  name: string,
  description: string,
  officerCut: number,
  populatedRanks: Record<number, IRank>,
): IRankSystem {
  return Object.freeze({
    code,
    name,
    description,
    type: 'default' as const,
    ranks: createRanks(populatedRanks),
    officerCut,
  });
}

// ---------------------------------------------------------------------------
// Rank builder helpers (reduce repetition)
// ---------------------------------------------------------------------------

function rank(
  names: Partial<Record<Profession, string>>,
  officer: boolean,
  payMultiplier: number,
): IRank {
  return { names, officer, payMultiplier };
}

/** Shorthand: single mekwarrior-only name */
function mekRank(name: string, officer: boolean, payMultiplier: number): IRank {
  return rank({ [Profession.MEKWARRIOR]: name }, officer, payMultiplier);
}

// ---------------------------------------------------------------------------
// 1. MERCENARY
// ---------------------------------------------------------------------------

export const RANK_SYSTEM_MERCENARY: IRankSystem = createRankSystem(
  'MERC',
  'Mercenary',
  'Standard mercenary command rank structure used by most Inner Sphere mercenary units.',
  31,
  {
    0: rank(
      {
        [Profession.MEKWARRIOR]: 'None',
        [Profession.AEROSPACE]: 'None',
        [Profession.VEHICLE]: 'None',
        [Profession.NAVAL]: 'None',
        [Profession.INFANTRY]: 'None',
        [Profession.TECH]: 'None',
        [Profession.MEDICAL]: 'None',
        [Profession.ADMINISTRATOR]: 'None',
      },
      false,
      1.0,
    ),
    1: rank(
      {
        [Profession.MEKWARRIOR]: 'Private',
        [Profession.AEROSPACE]: 'Airman',
        [Profession.VEHICLE]: 'Crewman',
        [Profession.NAVAL]: 'Seaman',
        [Profession.INFANTRY]: 'Trooper',
        [Profession.TECH]: 'Tech',
        [Profession.MEDICAL]: 'Orderly',
        [Profession.ADMINISTRATOR]: 'Clerk',
      },
      false,
      1.0,
    ),
    3: mekRank('Corporal', false, 1.05),
    5: rank(
      {
        [Profession.MEKWARRIOR]: 'Sergeant',
        [Profession.AEROSPACE]: 'Flight Sergeant',
        [Profession.VEHICLE]: 'Crew Chief',
        [Profession.NAVAL]: 'Petty Officer',
        [Profession.INFANTRY]: 'Squad Leader',
      },
      false,
      1.1,
    ),
    8: mekRank('Staff Sergeant', false, 1.15),
    11: rank(
      {
        [Profession.MEKWARRIOR]: 'Master Sergeant',
        [Profession.AEROSPACE]: 'Chief Master Sergeant',
        [Profession.NAVAL]: 'Master Chief',
      },
      false,
      1.2,
    ),
    15: mekRank('Sergeant Major', false, 1.25),
    21: mekRank('Warrant Officer', false, 1.3),
    25: mekRank('Chief Warrant Officer', false, 1.35),
    31: rank(
      {
        [Profession.MEKWARRIOR]: 'Lieutenant',
        [Profession.AEROSPACE]: 'Flight Lieutenant',
        [Profession.NAVAL]: 'Ensign',
      },
      true,
      1.4,
    ),
    34: rank(
      {
        [Profession.MEKWARRIOR]: 'Captain',
        [Profession.AEROSPACE]: 'Flight Captain',
        [Profession.NAVAL]: 'Lieutenant Commander',
      },
      true,
      1.6,
    ),
    37: rank(
      {
        [Profession.MEKWARRIOR]: 'Major',
        [Profession.AEROSPACE]: 'Wing Commander',
        [Profession.NAVAL]: 'Commander',
      },
      true,
      1.8,
    ),
    40: mekRank('Colonel', true, 2.0),
    43: mekRank('Brigadier General', true, 2.2),
    45: mekRank('Major General', true, 2.5),
    48: mekRank('Lieutenant General', true, 2.8),
    50: mekRank('General', true, 3.0),
  },
);

// ---------------------------------------------------------------------------
// 2. SLDF
// ---------------------------------------------------------------------------

export const RANK_SYSTEM_SLDF: IRankSystem = createRankSystem(
  'SLDF',
  'Star League Defense Force',
  'Rank structure of the original Star League Defense Force.',
  31,
  {
    0: mekRank('None', false, 1.0),
    1: mekRank('Recruit', false, 1.0),
    3: mekRank('Private', false, 1.05),
    5: mekRank('Corporal', false, 1.1),
    8: mekRank('Sergeant', false, 1.15),
    11: mekRank('Staff Sergeant', false, 1.2),
    15: mekRank('Master Sergeant', false, 1.25),
    21: mekRank('Warrant Officer', false, 1.3),
    25: mekRank('Senior Warrant Officer', false, 1.35),
    31: mekRank('Lieutenant', true, 1.4),
    34: mekRank('Captain', true, 1.6),
    37: mekRank('Major', true, 1.8),
    40: mekRank('Colonel', true, 2.0),
    43: mekRank('Brigadier General', true, 2.2),
    45: mekRank('Major General', true, 2.5),
    48: mekRank('Lieutenant General', true, 2.8),
    50: mekRank('General', true, 3.0),
  },
);

// ---------------------------------------------------------------------------
// 3. CLAN
// ---------------------------------------------------------------------------

export const RANK_SYSTEM_CLAN: IRankSystem = createRankSystem(
  'CLAN',
  'Clan Warrior Caste',
  'Clan warrior caste rank structure used by all Clans.',
  31,
  {
    0: mekRank('Freeborn', false, 1.0),
    1: mekRank('Warrior', false, 1.0),
    5: mekRank('Point Commander', false, 1.1),
    10: mekRank('Star Commander', false, 1.2),
    15: mekRank('Nova Commander', false, 1.3),
    21: mekRank('Star Captain', false, 1.35),
    31: mekRank('Star Colonel', true, 1.5),
    35: mekRank('Galaxy Commander', true, 1.8),
    40: mekRank('saKhan', true, 2.2),
    45: mekRank('Khan', true, 2.8),
    50: mekRank('ilKhan', true, 3.5),
  },
);

// ---------------------------------------------------------------------------
// 4. COMSTAR
// ---------------------------------------------------------------------------

export const RANK_SYSTEM_COMSTAR: IRankSystem = createRankSystem(
  'COMSTAR',
  'ComStar',
  'ComStar religious-themed rank hierarchy.',
  31,
  {
    0: mekRank('Acolyte', false, 1.0),
    3: mekRank('Adept', false, 1.05),
    8: mekRank('Demi-Precentor', false, 1.15),
    15: mekRank('Precentor', false, 1.3),
    31: mekRank('Precentor Martial', true, 1.6),
    37: mekRank('Precentor ROM', true, 1.8),
    40: mekRank('Primus', true, 2.5),
  },
);

// ---------------------------------------------------------------------------
// 5. GENERIC HOUSE
// ---------------------------------------------------------------------------

export const RANK_SYSTEM_GENERIC_HOUSE: IRankSystem = createRankSystem(
  'HOUSE',
  'Great House (Generic)',
  'Generic Great House military rank structure blending Lyran, Davion, Liao, Marik, and Kurita conventions.',
  31,
  {
    0: mekRank('None', false, 1.0),
    1: mekRank('Private', false, 1.0),
    3: mekRank('Corporal', false, 1.05),
    5: mekRank('Sergeant', false, 1.1),
    8: mekRank('Staff Sergeant', false, 1.15),
    11: mekRank('Master Sergeant', false, 1.2),
    15: mekRank('Sergeant Major', false, 1.25),
    21: mekRank('Warrant Officer', false, 1.3),
    31: mekRank('Leutnant', true, 1.4),
    34: mekRank('Hauptmann', true, 1.6),
    37: mekRank('Kommandant', true, 1.8),
    40: mekRank('Colonel', true, 2.0),
    43: mekRank('Leutnant-General', true, 2.2),
    45: mekRank('General', true, 2.5),
    48: mekRank('Marshal', true, 2.8),
    50: mekRank("Archon's Champion", true, 3.0),
  },
);

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

export const BUILT_IN_RANK_SYSTEMS: Record<string, IRankSystem> = Object.freeze({
  [RANK_SYSTEM_MERCENARY.code]: RANK_SYSTEM_MERCENARY,
  [RANK_SYSTEM_SLDF.code]: RANK_SYSTEM_SLDF,
  [RANK_SYSTEM_CLAN.code]: RANK_SYSTEM_CLAN,
  [RANK_SYSTEM_COMSTAR.code]: RANK_SYSTEM_COMSTAR,
  [RANK_SYSTEM_GENERIC_HOUSE.code]: RANK_SYSTEM_GENERIC_HOUSE,
});

export function getRankSystem(code: string): IRankSystem | undefined {
  return BUILT_IN_RANK_SYSTEMS[code];
}

export function getDefaultRankSystem(): IRankSystem {
  return RANK_SYSTEM_MERCENARY;
}
