// The save-loss rule, in one place. This is the only file that decides what "the save asks for a loss
// confirmation" means and what the third nightly number, "saves with no loss confirmation", counts.
//
// Source today: the dialog's own inputs, list-based. The save dialog confirms on
//   unrecoveredCriticalSlots?.length || lossTrackingUnknown || armorSaveLoss
// (SaveUnitDialog.tsx handleSave), fed by useUnitLoadDiagnostics() (MultiUnitTabs.tsx
// StoreValidatedSaveUnitDialog). The shared observer reads those inputs from that hook; nothing is
// recomputed here.
//
// Later: C3's stage-1 save-loss comparator (save-loss-detector/DESIGN.md) becomes the one owner of
// the number, comparing the editor state before a save with the state after a real serializer, JSON
// and reopen. When it is on main, switch `noSaveLossConfirmation` to call that module (no copy). The
// callers (rows.mjs, the reopen report) use only the exports below, so that is the whole change.
// Unknown stays distinct from clean and failed rows stay in the denominator either way.
import { z } from 'zod';

export const NUMBER_SOURCE = 'dialog-inputs:useUnitLoadDiagnostics';

/**
 * The shape of one end's save-loss facts. `noticeEntry` is the attributed cell shape and `noticeKey`
 * names the entries field (`noticeBefore` for the loaded store, `noticeAfter` for the reopened one).
 */
export function saveLossSchema(noticeEntry, noticeKey) {
  return z.strictObject({
    /** The diagnostics had finished refreshing when read (the dialog disables save while they have not). */
    settled: z.boolean(),
    /** The entries were undefined (`lossTrackingUnknown={entries === undefined}`). Never coerced to empty. */
    lossTrackingUnknown: z.boolean(),
    /** The store's exact unrecoveredCriticalSlots with attribution; null exactly when lossTrackingUnknown. */
    [noticeKey]: z.array(noticeEntry).nullable(),
    /** getArmorSaveLoss(source, armorType) returned a loss (called, not recomputed). */
    armorSaveLoss: z.boolean(),
    /** That loss's `sourceType`; null exactly when armorSaveLoss is false. */
    armorSaveLossSourceType: z.string().nullable(),
    /** The dialog's predicate: lossTrackingUnknown || entries non-empty || armorSaveLoss. */
    confirmation: z.boolean(),
  });
}

/** SaveUnitDialog's trigger over its three inputs. */
export const saveLossConfirms = (s, noticeKey = 'noticeBefore') =>
  Boolean(s[noticeKey]?.length) || s.lossTrackingUnknown || s.armorSaveLoss;

/**
 * "Saves with no loss confirmation" for one row: a complete, settled row whose loaded (BEFORE) store
 * would not make the dialog ask. Error rows, unsettled rows, unknown tracking and rows that need a
 * confirmation are not it (they stay in the denominator).
 */
export const noSaveLossConfirmation = (row) =>
  row.measure === 'reopen' &&
  row.status === 'ok' &&
  row.reopen.saveLoss.settled &&
  !row.reopen.saveLoss.lossTrackingUnknown &&
  row.reopen.saveLoss.noticeBefore.length === 0 &&
  !row.reopen.saveLoss.armorSaveLoss;

/** Same, for the reopened (AFTER) store: would the dialog ask if the reopened unit were saved. */
export const noSaveLossConfirmationAfter = (row) =>
  row.measure === 'reopen' &&
  row.status === 'ok' &&
  row.reopen.saveLossAfter.settled &&
  !row.reopen.saveLossAfter.lossTrackingUnknown &&
  row.reopen.saveLossAfter.noticeAfter.length === 0 &&
  !row.reopen.saveLossAfter.armorSaveLoss;

/** Cross-field problems for one end's facts; `sameCells(entries, list)` is the caller's exact-triple set check. */
export function saveLossProblems(s, noticeKey, label, { cells, sameCells }) {
  const problems = [];
  if ((s[noticeKey] === null) !== s.lossTrackingUnknown)
    problems.push(`${label}.${noticeKey} must be null exactly when lossTrackingUnknown (unknown is never coerced to empty)`);
  if (s.armorSaveLoss !== (s.armorSaveLossSourceType !== null))
    problems.push(`${label}.armorSaveLossSourceType must be set exactly when armorSaveLoss`);
  if (s.confirmation !== saveLossConfirms(s, noticeKey))
    problems.push(`${label}.confirmation is not the dialog's predicate over its own fields`);
  // One owner for the cells: they are the same list as the notice residual, not a second reading.
  if (s[noticeKey] !== null && !sameCells(s[noticeKey], cells))
    problems.push(`${label}.${noticeKey} differs from the notice residual it was read from`);
  return problems;
}
