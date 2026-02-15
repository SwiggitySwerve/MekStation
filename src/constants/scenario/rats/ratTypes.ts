import { UnitTypeCategory } from '@/types/scenario';
import { Era } from '@/types/temporal/Era';

export { UnitTypeCategory, Era };

export interface IRATEntry {
  readonly chassis: string;
  readonly variant: string;
  readonly designation: string;
  readonly bv: number;
  readonly tonnage: number;
  readonly unitType: UnitTypeCategory;
  readonly weight: number;
  readonly introductionYear?: number;
  readonly extinctionYear?: number;
}

export interface IRandomAssignmentTable {
  readonly faction: string;
  readonly factionName: string;
  readonly era: Era;
  readonly entries: readonly IRATEntry[];
  readonly totalWeight: number;
}

export enum Faction {
  LYRAN_COMMONWEALTH = 'LC',
  FEDERATED_SUNS = 'FS',
  DRACONIS_COMBINE = 'DC',
  FREE_WORLDS_LEAGUE = 'FWL',
  CAPELLAN_CONFEDERATION = 'CC',
  CLAN_WOLF = 'CW',
  CLAN_JADE_FALCON = 'CJF',
  CLAN_GHOST_BEAR = 'CGB',
  CLAN_SMOKE_JAGUAR = 'CSJ',
  PIRATES = 'PIR',
  MERCENARY = 'MERC',
  COMSTAR = 'CS',
  WORD_OF_BLAKE = 'WOB',
}

export const FACTION_NAMES: Readonly<Record<Faction, string>> = {
  [Faction.LYRAN_COMMONWEALTH]: 'Lyran Commonwealth',
  [Faction.FEDERATED_SUNS]: 'Federated Suns',
  [Faction.DRACONIS_COMBINE]: 'Draconis Combine',
  [Faction.FREE_WORLDS_LEAGUE]: 'Free Worlds League',
  [Faction.CAPELLAN_CONFEDERATION]: 'Capellan Confederation',
  [Faction.CLAN_WOLF]: 'Clan Wolf',
  [Faction.CLAN_JADE_FALCON]: 'Clan Jade Falcon',
  [Faction.CLAN_GHOST_BEAR]: 'Clan Ghost Bear',
  [Faction.CLAN_SMOKE_JAGUAR]: 'Clan Smoke Jaguar',
  [Faction.PIRATES]: 'Pirates',
  [Faction.MERCENARY]: 'Mercenary',
  [Faction.COMSTAR]: 'ComStar',
  [Faction.WORD_OF_BLAKE]: 'Word of Blake',
};
