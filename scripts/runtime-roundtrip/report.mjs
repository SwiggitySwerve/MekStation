// Capture records -> reopen rows, and the counts the nightly publishes. No BV arithmetic here: the
// capture reads both ends from the app through the shared observer and compares the round trip with
// C3's v2 logic; this maps the records to schema rows and counts agreement.
import {
  assertPopulation,
  noSaveLossConfirmation,
  noSaveLossConfirmationAfter,
  saveLossConfirms,
} from '../lib/runtime-parity/rows.mjs';

const endOf = ({ observed, terms }) => ({ ...observed, occupancy: null, terms: terms ?? {} });

/** One captured record -> one reopen row (validated by serializeRows before it is written). */
export function capturedToRow(record) {
  const key = {
    schemaVersion: 1,
    family: record.family,
    unitId: record.unitId,
    path: record.path,
    sha256: record.sha256,
    catalog: record.catalog,
    measure: 'reopen',
  };
  if (record.error) {
    const { stage, name, message } = record.error;
    return { ...key, status: 'error', error: { stage, name, message } };
  }
  return {
    ...key,
    status: 'ok',
    reopen: {
      before: endOf(record.before),
      after: endOf(record.after),
      lostCells: record.lostCells,
      tokenChanges: record.tokenChanges,
      rawIdentityLosses: record.rawIdentityLosses,
      noticeResidual: record.noticeResidual,
      loadedMountLosses: record.loadedMountLosses,
      changedLoadedMounts: record.changedLoadedMounts,
      addedLoadedMounts: record.addedLoadedMounts,
      // The dialog's predicate comes from the schema module's one definition, over the same fields.
      saveLoss: { ...record.saveLoss, confirmation: saveLossConfirms(record.saveLoss) },
      saveLossAfter: {
        ...record.saveLossAfter,
        confirmation: saveLossConfirms(record.saveLossAfter, 'noticeAfter'),
      },
    },
  };
}

const fmt = (n) => n.toLocaleString('en-US');
const AFTER_NOTE = 'loss already written to file; not a progress measure';

/**
 * Counts against the Java reference (battleValue.total). A null BV at either end and every error row
 * count as a miss in every count; nothing is skipped or treated as zero. Returns the summary and the
 * per-unit differences so a drop names its units.
 */
export function summarize({ rows, referenceByPath, scope, deterministic }) {
  assertPopulation(scope, rows.length);
  if (new Set(rows.map((row) => `${row.family}\0${row.unitId}`)).size !== rows.length)
    throw new Error('Population mismatch: more than one row for a unit');
  const errorsByStage = {};
  const tally = () => ({ equal: 0, different: 0, missing: 0 });
  const loadJava = tally();
  const reopenLoad = tally();
  const reopenJava = tally();
  const validityKept = tally();
  // weightUsed vs allocatedWeight at both ends, compared exactly; a difference is a finding.
  const weightOwners = { agree: 0, mismatch: 0, missing: 0 };
  const notice = { equal: 0, different: 0, missing: 0 };
  const cells = { unitsWithLoss: 0, lostCells: 0, systemCellsLost: 0, tokenChanges: 0, byBucket: {} };
  const mounts = { lost: 0, changed: 0, added: 0 };
  // The save dialog's loss confirmation. `noLossConfirmation.before` is the published third nightly number,
  // read on the loaded store: settled, tracking known, no entries, no armor loss (noSaveLossConfirmation, one
  // owner). Every row is in the denominator; an error row or an unsettled row is never counted as "no".
  // `noLossConfirmation.after` is the same read on the reopened store. It is NOT a progress measure: the save
  // already wrote the loss into the file, so the dialog has nothing left to warn about.
  const noLossConfirmation = { before: 0, after: 0, afterNote: AFTER_NOTE };
  const saveLossDetail = {
    before: { confirmation: 0, unsettled: 0, unknown: 0, noticeEntries: 0, armorSaveLoss: 0, errorRows: 0 },
    after: { confirmation: 0, unsettled: 0, unknown: 0, noticeEntries: 0, armorSaveLoss: 0 },
    afterNote: AFTER_NOTE,
  };
  const differences = [];
  for (const row of rows) {
    const javaBv = referenceByPath.get(row.path)?.battleValue?.total ?? null;
    const identity = { family: row.family, unitId: row.unitId, path: row.path, catalogPath: row.catalog.path };
    if (row.status === 'error') {
      errorsByStage[row.error.stage] = (errorsByStage[row.error.stage] ?? 0) + 1;
      for (const t of [loadJava, reopenLoad, reopenJava, validityKept, notice]) t.missing++;
      weightOwners.missing++;
      saveLossDetail.before.errorRows++;
      differences.push({ ...identity, measure: 'reopen=load', loadBV: null, reopenBV: null, javaBV: javaBv, why: `error:${row.error.stage}` });
      continue;
    }
    const { before, after } = row.reopen;
    const count = (t, a, b) => {
      if (a === null || b === null || b === undefined) t.missing++;
      else if (a === b) t.equal++;
      else t.different++;
    };
    count(loadJava, before.bv, javaBv);
    count(reopenLoad, after.bv, before.bv);
    count(reopenJava, after.bv, javaBv);
    if (before.validity === after.validity) validityKept.equal++;
    else validityKept.different++;
    if (before.bv === null || after.bv === null || before.bv !== after.bv)
      differences.push({
        ...identity,
        measure: 'reopen=load',
        loadBV: before.bv,
        reopenBV: after.bv,
        javaBV: javaBv,
        why: before.bv === null || after.bv === null ? 'no-calculator-result' : 'different',
      });
    const owners = [before, after].every((end) => end.weight === end.allocatedWeight);
    if (owners) weightOwners.agree++;
    else {
      weightOwners.mismatch++;
      differences.push({ ...identity, measure: 'weight-owner', before: [before.weight, before.allocatedWeight], after: [after.weight, after.allocatedWeight], why: 'weightUsed differs from allocatedWeight' });
    }
    if (row.reopen.noticeResidual.equal) notice.equal++;
    else notice.different++;
    const nonSystem = row.reopen.lostCells.filter((c) => c.identity === 'non-system');
    if (nonSystem.length) cells.unitsWithLoss++;
    cells.lostCells += nonSystem.length;
    cells.systemCellsLost += row.reopen.lostCells.length - nonSystem.length;
    cells.tokenChanges += row.reopen.tokenChanges.length;
    for (const cell of nonSystem) {
      const bucket = (cells.byBucket[cell.bucket] ??= { lostCells: 0, units: new Set() });
      bucket.lostCells++;
      bucket.units.add(row.unitId);
    }
    const loss = row.reopen.saveLoss;
    const beforeCounts = saveLossDetail.before;
    if (noSaveLossConfirmation(row)) noLossConfirmation.before++;
    if (loss.confirmation) beforeCounts.confirmation++;
    if (!loss.settled) beforeCounts.unsettled++;
    if (loss.lossTrackingUnknown) beforeCounts.unknown++;
    if (loss.noticeBefore?.length) beforeCounts.noticeEntries++;
    if (loss.armorSaveLoss) beforeCounts.armorSaveLoss++;
    const lossAfter = row.reopen.saveLossAfter;
    const afterCounts = saveLossDetail.after;
    if (noSaveLossConfirmationAfter(row)) noLossConfirmation.after++;
    if (lossAfter.confirmation) afterCounts.confirmation++;
    if (!lossAfter.settled) afterCounts.unsettled++;
    if (lossAfter.lossTrackingUnknown) afterCounts.unknown++;
    if (lossAfter.noticeAfter?.length) afterCounts.noticeEntries++;
    if (lossAfter.armorSaveLoss) afterCounts.armorSaveLoss++;
    mounts.lost += row.reopen.loadedMountLosses.length;
    mounts.changed += row.reopen.changedLoadedMounts.length;
    mounts.added += row.reopen.addedLoadedMounts.length;
  }
  cells.byBucket = Object.fromEntries(
    Object.entries(cells.byBucket)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([bucket, value]) => [bucket, { lostCells: value.lostCells, units: value.units.size }]),
  );
  const units = rows.length;
  const ok = rows.filter((row) => row.status === 'ok').length;
  return {
    summary: {
      schemaVersion: 1,
      measure: 'reopen',
      scope,
      units,
      ok,
      errors: units - ok,
      errorsByStage,
      loadJava,
      reopenLoad,
      reopenJava,
      validityKept,
      weightOwners,
      noticeResidual: notice,
      cells,
      mounts,
      noLossConfirmation,
      saveLossDetail,
      deterministic,
      headline: `reopen=load ${fmt(reopenLoad.equal)}/${fmt(units)} · reopen=Java ${fmt(reopenJava.equal)}/${fmt(units)} · load=Java ${fmt(loadJava.equal)}/${fmt(units)} · no loss confirmation (before save) ${fmt(noLossConfirmation.before)}/${fmt(units)} · notice residual equal ${fmt(notice.equal)}/${fmt(units)} · weight owners ${fmt(weightOwners.agree)}/${fmt(units)}${weightOwners.mismatch ? ` (DIFFER ${fmt(weightOwners.mismatch)})` : ''}${scope.unitIds ? ' · NARROWED SCOPE' : ''}`,
    },
    differences,
  };
}
