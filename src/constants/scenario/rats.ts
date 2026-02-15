export type { IRATEntry, IRandomAssignmentTable } from './rats/ratTypes';
export { Faction, FACTION_NAMES } from './rats/ratTypes';
export {
  getRAT,
  getAvailableFactions,
  getAvailableErasForFaction,
  selectUnitFromRAT,
  selectUnitsFromRAT,
} from './rats/ratRegistry';
