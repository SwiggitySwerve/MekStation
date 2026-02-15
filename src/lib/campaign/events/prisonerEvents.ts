export type { IPrisonerEventDefinition } from './prisoner/minorEventDefinitions';
export { MINOR_EVENT_DEFINITIONS } from './prisoner/minorEventDefinitions';
export { MAJOR_EVENT_DEFINITIONS } from './prisoner/majorEventDefinitions';
export type { IPrisonerCapacity } from './prisoner/prisonerEventProcessor';
export {
  countPrisoners,
  calculatePrisonerCapacity,
  generateEventId,
  _resetEventCounter,
  createRansomEvent,
  processPrisonerEvents,
} from './prisoner/prisonerEventProcessor';
