// The facts registry: which families have a fact table, and the one place every caller imports facts from. It holds no
// fact reading of its own and is not fingerprinted: provenance finds a family's deriver by its file name,
// facts-<family>.mjs (facts-provenance.mjs), never through this file. So wiring a family here cannot point another
// family's fingerprint anywhere, and registering a new family rebaselines nobody else.
//   facts-core.mjs          kinds, value contract, facts-row schema, shared helpers  (coreDeriverSha: every family)
//   facts-<family>.mjs      that family's tables and derivers                       (familyDeriverSha: that family)
import * as battlemechs from './facts-battlemechs.mjs';
import { factsIO } from './facts-core.mjs';
import * as vehicles from './facts-vehicles.mjs';
import { DEFAULT_FAMILY } from './family-names.mjs';

export {
  FACTS_FILE,
  FACTS_SCHEMA_VERSION,
  isFactValue,
  unitKey,
} from './facts-core.mjs';
export {
  FACT_DEFS,
  REPORTED_DEFS,
  decodeCell,
  encodeCell,
  loadFacts,
  reopenFacts,
} from './facts-battlemechs.mjs';
export {
  VEHICLE_FACT_DEFS,
  VEHICLE_REPORTED_DEFS,
  vehicleLoadFacts,
  vehicleReopenFacts,
} from './facts-vehicles.mjs';

const FAMILY_FACT_DEFS = {
  battlemechs: battlemechs.FACT_DEFS,
  vehicles: vehicles.VEHICLE_FACT_DEFS,
};
const FAMILY_REPORTED_DEFS = {
  battlemechs: battlemechs.REPORTED_DEFS,
  vehicles: vehicles.VEHICLE_REPORTED_DEFS,
};

/** The families that have a fact table. Each has its own deriver file, facts-<family>.mjs. */
export const FACT_FAMILIES = Object.keys(FAMILY_FACT_DEFS);

/** A family's gated facts for a measure (name -> kind); undefined for an unknown family or measure. */
export const factDefs = (measure, family = DEFAULT_FAMILY) =>
  Object.hasOwn(FAMILY_FACT_DEFS, family)
    ? FAMILY_FACT_DEFS[family][measure]
    : undefined;

/** A family's reported facts for a measure; undefined for an unknown family or measure. */
export const reportedDefs = (measure, family = DEFAULT_FAMILY) =>
  Object.hasOwn(FAMILY_REPORTED_DEFS, family)
    ? FAMILY_REPORTED_DEFS[family][measure]
    : undefined;

export const setFactNames = (measure, family = DEFAULT_FAMILY) =>
  Object.entries(factDefs(measure, family))
    .filter(([, kind]) => kind === 'set')
    .map(([name]) => name);

export const { validateFacts, serializeFacts, parseFacts } = factsIO(
  (measure, family) => {
    const facts = factDefs(measure, family);
    return facts
      ? { facts, reported: reportedDefs(measure, family) }
      : undefined;
  },
);
