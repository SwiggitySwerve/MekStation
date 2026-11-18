'use strict';
// The parts of the status-bar and record-sheet observers that need no product code, so plain Node can test them
// (the observers themselves load the app under Jest). A CommonJS file only so that both Node and the Jest transform
// can load it unchanged; it requires nothing.

/** A failed observation, carrying the stage and whether it is a harness (not product) failure. */
class ObservationError extends Error {
  constructor(error, stage, infrastructure) {
    super(String(error?.message ?? error));
    this.name = String(error?.name ?? 'Error');
    this.stage = stage;
    this.infrastructure = infrastructure;
  }
}

const previewFailure = (message, cause) => {
  const error = new Error(message);
  if (cause !== undefined) error.cause = cause;
  return new ObservationError(error, 'preview', true);
};

/**
 * The record sheet's BV and cost, accepted only if the preview's own calculation succeeded and produced that BV.
 *
 * recordSheetPreview.logic's calculateBattleValueAndCost catches a throwing calculation and returns { 0, 0 }, and the
 * sheet extractor does `battleValue || 0`, so a failure reaches the sheet as a plain 0. `calculation` is what the mechBV
 * calculator probe saw during the preview render: `{ result, error }`, or null if no calculation ran. Each of these is a
 * harness failure (ObservationError, stage 'preview', infrastructure), never a value:
 *   - no calculation ran (the projection failed before calculating, or the registry was not ready);
 *   - the calculation threw;
 *   - the sheet was handed a BV that is not the one the calculation produced (its cost calculation failed after the BV
 *     succeeded, or the value was replaced).
 * A calculation that succeeded with a real 0 is a value.
 */
function checkSheetCalculation(header, calculation) {
  if (!calculation)
    throw previewFailure(
      "The sheet was handed a BV but no mechBV calculation ran for it (the projection failed before calculating, or the sheet's 0 fallback)",
    );
  if (calculation.error)
    throw previewFailure(
      `The sheet's BV calculation threw: ${calculation.error?.message ?? calculation.error}`,
      calculation.error,
    );
  if (calculation.result.bv !== header.battleValue)
    throw previewFailure(
      `The sheet was handed BV ${header.battleValue} but its calculation produced ${calculation.result.bv} (its cost calculation failed, or the value was replaced)`,
    );
  return { bv: header.battleValue, cost: header.cost };
}

module.exports = { ObservationError, previewFailure, checkSheetCalculation };
