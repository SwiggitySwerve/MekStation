// The battlemech family's facts: its fact tables and its two pure derivers (a row and the unit's Java reference row in,
// facts out). Its git blob is the battlemech `familyDeriverSha` (facts-provenance.mjs): changing this file rebaselines
// battlemechs only. Shared helpers come from facts-core.mjs.
import { distance, identity, sortedSet, unknownOf } from './facts-core.mjs';
import { canonicalJson } from './rows.mjs';

/**
 * The battlemech family's gated facts per measure: name -> kind. This is the whole list; the baseline and the gate read it
 * through factDefs(measure, family), which also holds the other families' tables (VEHICLE_FACT_DEFS).
 */
export const FACT_DEFS = {
  load: {
    bvExact: 'bool',
    bvDistance: 'distance',
    validity: 'bool',
    weightOwners: 'bool',
    // The BV the real PreviewTab hands to the record-sheet renderer against the status bar's BV.
    previewEqualsStatus: 'bool',
  },
  reopen: {
    reopenLoad: 'bool',
    reopenJava: 'bool',
    reopenJavaDistance: 'distance',
    // How far reopen moved BV from load, so a unit that already fails reopen = load and gets worse still shows.
    reopenLoadDistance: 'distance',
    noLossConfirmationBefore: 'bool',
    noticeResidual: 'set',
    noticeMismatch: 'set',
    rawIdentityLosses: 'set',
    loadedMountLosses: 'set',
    reopenValid: 'bool',
  },
};

/**
 * REPORTED facts: measured per unit and written to facts.ndjson and the gate report, but NOT gated: they are not in
 * FACT_DEFS, the baseline holds no entry for them and the gate never compares them. previewStatusDistance
 * (|record-sheet BV - status BV|) is reported only because a correct status-bar fix on one of the units whose sheet
 * differs would raise it and turn the night red, which is not a regression of the sheet.
 */
export const REPORTED_DEFS = {
  load: { previewStatusDistance: 'distance' },
  reopen: {},
};

// Set members are compact, readable text, so a baseline diff can be read. A cell is `LT:4:<token text>`:
// a short location code, the zero-based slot, then the token (which may contain colons). Locations
// outside the table are kept as `~<name>`, so the encoding is total and exactly reversible.
const LOCATION_CODES = {
  Head: 'HD',
  'Center Torso': 'CT',
  'Left Torso': 'LT',
  'Right Torso': 'RT',
  'Left Arm': 'LA',
  'Right Arm': 'RA',
  'Left Leg': 'LL',
  'Right Leg': 'RL',
  'Center Leg': 'CL',
  'Front Left Leg': 'FLL',
  'Front Right Leg': 'FRL',
  'Rear Left Leg': 'RLL',
  'Rear Right Leg': 'RRL',
};
const CODE_LOCATIONS = Object.fromEntries(
  Object.entries(LOCATION_CODES).map(([name, code]) => [code, name]),
);

export function encodeCell({ location, slot, text }) {
  const code = LOCATION_CODES[location];
  if (code === undefined && String(location).includes(':'))
    throw new Error(
      `cannot encode the location ${location}: it contains a colon`,
    );
  return `${code ?? `~${location}`}:${slot}:${text}`;
}

export function decodeCell(member) {
  const first = member.indexOf(':');
  const second = member.indexOf(':', first + 1);
  if (first < 0 || second < 0) throw new Error(`not a cell member: ${member}`);
  const code = member.slice(0, first);
  return {
    location: code.startsWith('~') ? code.slice(1) : CODE_LOCATIONS[code],
    slot: Number(member.slice(first + 1, second)),
    text: member.slice(second + 1),
  };
}

const cellMember = encodeCell;
/** A notice/round-trip disagreement: `n:` = only the notice has the cell, `r:` = only the round trip does. */
const taggedCell = (tag, c) => `${tag}:${encodeCell(c)}`;

/** Load row + the unit's Java reference row -> facts. */
export function loadFacts(row, ref) {
  if (row.status !== 'ok')
    return {
      ...identity(row),
      status: 'error',
      facts: unknownOf(FACT_DEFS.load),
      reported: unknownOf(REPORTED_DEFS.load),
    };
  const { observed } = row.load;
  const javaBv = ref?.battleValue?.total;
  const javaValid = ref?.construction?.valid;
  const sheetBv = row.load.preview?.bv ?? null;
  return {
    ...identity(row),
    status: 'ok',
    facts: {
      // A null BV (no calculator result) is a miss, not unknown: the unit ran and had no BV.
      bvExact: typeof javaBv === 'number' ? observed.bv === javaBv : null,
      bvDistance:
        typeof javaBv === 'number' ? distance(observed.bv, javaBv) : null,
      validity:
        typeof javaValid === 'boolean'
          ? (observed.validity === 'valid') === javaValid
          : null,
      weightOwners: observed.weight === observed.allocatedWeight,
      // Unknown (null) when the preview was not captured or either BV is missing; never a pass.
      previewEqualsStatus:
        sheetBv === null || observed.bv === null
          ? null
          : sheetBv === observed.bv,
    },
    // Reported per unit, not gated (see REPORTED_DEFS).
    reported: { previewStatusDistance: distance(sheetBv, observed.bv) },
  };
}

/** The save dialog would not ask: settled, tracking known, no notice entries, no armor loss. Unknown stays null. */
function noLossConfirmationBefore(loss) {
  if (!loss.settled || loss.lossTrackingUnknown) return null;
  return loss.noticeBefore.length === 0 && !loss.armorSaveLoss;
}

/** Reopen row + the unit's Java reference row -> facts. */
export function reopenFacts(row, ref) {
  if (row.status !== 'ok')
    return {
      ...identity(row),
      status: 'error',
      facts: unknownOf(FACT_DEFS.reopen),
      reported: unknownOf(REPORTED_DEFS.reopen),
    };
  const r = row.reopen;
  const javaBv = ref?.battleValue?.total;
  const hasJava = typeof javaBv === 'number';
  return {
    ...identity(row),
    status: 'ok',
    facts: {
      reopenLoad:
        r.before.bv !== null && r.after.bv !== null
          ? r.after.bv === r.before.bv
          : false,
      reopenJava: hasJava ? r.after.bv === javaBv : null,
      reopenJavaDistance: hasJava ? distance(r.after.bv, javaBv) : null,
      reopenLoadDistance: distance(r.after.bv, r.before.bv),
      noLossConfirmationBefore: noLossConfirmationBefore(r.saveLoss),
      noticeResidual: sortedSet(r.noticeResidual.residual.map(cellMember)),
      // What the summary's noticeResidual.equal holds: any cell the notice and the round trip disagree on.
      noticeMismatch: sortedSet([
        ...r.noticeResidual.noticeOnly.map((c) => taggedCell('n', c)),
        ...r.noticeResidual.roundTripOnly.map((c) => taggedCell('r', c)),
      ]),
      rawIdentityLosses: sortedSet(r.rawIdentityLosses.map(cellMember)),
      loadedMountLosses: sortedSet(
        r.loadedMountLosses.map((m) => canonicalJson(m)),
      ),
      reopenValid: r.after.validity === 'valid',
    },
    reported: {},
  };
}
