// The one owner of runtime-parity family names and of the baseline file names they map to. The gate, the census, the
// deriver provenance and the hosted family registry (scripts/ci/parity-runtime-families.mjs) all read these; none keeps
// a copy. This module imports nothing, so the registry's plan step, which runs before (and without) npm ci, can import
// it too.

/** A family id: lowercase letters, digits and dashes, starting with a letter. It is also a file-name fragment. */
export const FAMILY_ID_PATTERN = /^[a-z][a-z0-9-]*$/;

/** The family that keeps the names it had before families (baselines, artifacts, last-green chain, output dir). */
export const DEFAULT_FAMILY = 'battlemechs';

export const isFamilyId = (family) =>
  typeof family === 'string' && FAMILY_ID_PATTERN.test(family);

/** Throws on anything that is not a family id, so a name never becomes a path it should not. */
export function assertFamilyId(family) {
  if (!isFamilyId(family)) throw new Error(`not a family name: ${family}`);
  return family;
}

export const BASELINE_DIR = 'config/parity-runtime';

/** The default family keeps baseline-<measure>; every other family is baseline-<family>-<measure>. */
const baselineStem = (measure, family) =>
  assertFamilyId(family) === DEFAULT_FAMILY
    ? `${BASELINE_DIR}/baseline-${measure}`
    : `${BASELINE_DIR}/baseline-${family}-${measure}`;

/** The committed baseline (main file) of a family and measure. */
export const baselinePath = (measure, family = DEFAULT_FAMILY) =>
  `${baselineStem(measure, family)}.json`;

/** Its set-fact sidecar. It exists only for a measure with set facts; the gate decides that, not the name. */
export const baselineSetsPath = (measure, family = DEFAULT_FAMILY) =>
  `${baselineStem(measure, family)}.sets.ndjson`;
