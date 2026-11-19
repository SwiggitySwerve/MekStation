// The vehicle family's facts: its fact tables and its two pure derivers. Its git blob is the vehicle `familyDeriverSha`
// (facts-provenance.mjs): changing this file rebaselines vehicles only. Shared helpers come from facts-core.mjs.
import { distance, identity, sortedSet, unknownOf } from './facts-core.mjs';

/**
 * The vehicle family's gated facts. FACT_DEFS above is the battlemech table, unchanged; each family has its own table and
 * its own baseline files, and this one file stays the single deriver for all of them (one fingerprint, facts-provenance.mjs).
 */
export const VEHICLE_FACT_DEFS = {
  load: {
    bvExact: 'bool',
    bvDistance: 'distance',
    validity: 'bool',
    // Sheet = screen: the BV the vehicle record sheet is handed against the status bar's BV.
    previewEqualsStatus: 'bool',
  },
  reopen: {
    reopenLoad: 'bool',
    reopenJava: 'bool',
    reopenJavaDistance: 'distance',
    reopenLoadDistance: 'distance',
    // Unrounded used mass at both ends.
    reopenMass: 'bool',
    // Validity, completeness and the reason codes (rule ids only; messages are diagnostics in the row, not gated).
    reopenVerdict: 'bool',
    reopenMP: 'bool',
    reopenCrew: 'bool',
    reopenValid: 'bool',
    // Source-document key paths the saved document lost or changed, outside the editor-owned list (vehicle-document.mjs).
    documentLosses: 'set',
    // Equipment as a multiset: `-<mount>` only in the source, `+<mount>` only in the saved document.
    mountLosses: 'set',
  },
};

/**
 * The vehicle family's reported (never gated) facts. crewOracle is UNAVAILABLE: no crew oracle is committed to the
 * repository (C3 owns committing it), so it is always null (unknown) and the baseline notes say so.
 */
export const VEHICLE_REPORTED_DEFS = {
  load: {
    previewStatusDistance: 'distance',
    // |status-bar used mass - Java's TestTank weightExact|.
    massJavaDistance: 'distance',
    crewOracle: 'bool',
  },
  reopen: {},
};

/** Vehicle load row + the unit's Java reference row -> facts. */
export function vehicleLoadFacts(row, ref) {
  if (row.status !== 'ok')
    return {
      ...identity(row),
      status: 'error',
      facts: unknownOf(VEHICLE_FACT_DEFS.load),
      reported: unknownOf(VEHICLE_REPORTED_DEFS.load),
    };
  const { observed } = row.load;
  const javaBv = ref?.battleValue?.total;
  const javaValid = ref?.construction?.valid;
  const javaMass = ref?.construction?.verifierQuantities?.weightExact?.value;
  const sheetBv = row.load.preview?.bv ?? null;
  return {
    ...identity(row),
    status: 'ok',
    facts: {
      // A null BV (the calculator threw) is a miss, not unknown, as for mechs.
      bvExact: typeof javaBv === 'number' ? observed.bv === javaBv : null,
      bvDistance:
        typeof javaBv === 'number' ? distance(observed.bv, javaBv) : null,
      validity:
        typeof javaValid === 'boolean'
          ? (observed.validity === 'valid') === javaValid
          : null,
      previewEqualsStatus:
        sheetBv === null || observed.bv === null
          ? null
          : sheetBv === observed.bv,
    },
    // Reported per unit, not gated (see VEHICLE_REPORTED_DEFS).
    reported: {
      previewStatusDistance: distance(sheetBv, observed.bv),
      massJavaDistance:
        typeof javaMass === 'number'
          ? distance(observed.weight, javaMass)
          : null,
      // Unavailable: no committed crew oracle. Always unknown, never gated.
      crewOracle: null,
    },
  };
}

const sameList = (a, b) =>
  a.length === b.length && a.every((item, i) => item === b[i]);

/** Vehicle reopen row + the unit's Java reference row -> facts. */
export function vehicleReopenFacts(row, ref) {
  if (row.status !== 'ok')
    return {
      ...identity(row),
      status: 'error',
      facts: unknownOf(VEHICLE_FACT_DEFS.reopen),
      reported: unknownOf(VEHICLE_REPORTED_DEFS.reopen),
    };
  const r = row.reopen;
  const { before, after } = r;
  const javaBv = ref?.battleValue?.total;
  const hasJava = typeof javaBv === 'number';
  return {
    ...identity(row),
    status: 'ok',
    facts: {
      reopenLoad:
        before.bv !== null && after.bv !== null
          ? after.bv === before.bv
          : false,
      reopenJava: hasJava ? after.bv === javaBv : null,
      reopenJavaDistance: hasJava ? distance(after.bv, javaBv) : null,
      reopenLoadDistance: distance(after.bv, before.bv),
      // Like a BV, a null (incomplete) mass at either end is a miss, never a pass.
      reopenMass:
        before.weight !== null && after.weight !== null
          ? after.weight === before.weight
          : false,
      reopenVerdict:
        after.validity === before.validity &&
        after.complete === before.complete &&
        sameList(after.reasons, before.reasons),
      reopenMP:
        after.mp.cruise === before.mp.cruise &&
        after.mp.flank === before.mp.flank &&
        after.mp.jump === before.mp.jump,
      // A null crew is a value the store keeps (explicit unknown), so null at both ends is the same crew.
      reopenCrew: after.crew === before.crew,
      reopenValid: after.validity === 'valid',
      documentLosses: sortedSet(
        r.documentLosses.map(({ change, path }) => `${change}:${path}`),
      ),
      mountLosses: sortedSet([
        ...r.mountLosses.map((mount) => `-${mount}`),
        ...r.mountAdditions.map((mount) => `+${mount}`),
      ]),
    },
    reported: {},
  };
}
