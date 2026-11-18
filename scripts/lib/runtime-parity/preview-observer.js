/**
 * The record-sheet read point of the load capture: the BV (and cost) the real PreviewTab hands to the sheet
 * renderer, observed in the same UnitStoreContext as the status-bar read.
 *
 * PreviewTab builds its own projection of the store (buildBattleMechPreviewProjection) and passes the resulting
 * unitConfig to RecordSheetPreview, whose useRecordSheetCanvasRenderer calls the real
 * getRecordSheetService().extractData(unitConfig) and draws the result. This module renders the real PreviewTab and
 * records what extractData returns (data.header.battleValue and cost), which is what the sheet draws, as close to the
 * canvas as jsdom allows. Only the canvas drawing (renderPreview) is replaced by a no-op on the service instance;
 * nothing that computes BV is mocked, spied results are returned unchanged, and nothing here changes the status read.
 *
 * A failed sheet calculation is NEVER recorded as a value. recordSheetPreview.logic's calculateBattleValueAndCost
 * catches a throw and returns { battleValue: 0, cost: 0 }, and extractHeader does `battleValue || 0`, so a calculation
 * failure (or a registry that is not ready) reaches the sheet as a plain 0. The mechBV probe from ./install-mocks (the one
 * the status observer uses) sees the calculation the preview made: a missing call, a thrown call, or a BV that is not the
 * one the sheet was handed is a harness failure (ObservationError, stage 'preview'), so the unit becomes an
 * infrastructure failure and never a fake `previewEqualsStatus: false`.
 *
 * Usage (load capture, after the status observer is imported):
 *   import * as observer from '../lib/runtime-parity/status-observer';
 *   import { createPreviewObserver } from '../lib/runtime-parity/preview-observer';
 *   const preview = createPreviewObserver();
 *   const { bv, cost } = await preview.observe(store);   // after observer.observeStore(store)
 */
// Relative imports only, and in this order (they sort that way): ./install-mocks registers the mocks before ./preview-view
// loads the product modules. install-mocks.test-order guards it.
import { probe } from './install-mocks';
import {
  checkCanvasMockCleared,
  checkSheetCalculation,
  previewFailure,
} from './observation.cjs';
import {
  cleanup,
  getRecordSheetService,
  renderPreviewTab,
} from './preview-view';

export function createPreviewObserver() {
  const service = getRecordSheetService();
  const extracted = [];
  const realExtract = service.extractData;
  // The real extraction, recorded. The returned data is exactly what the real service returned.
  service.extractData = (...args) => {
    const data = realExtract(...args);
    extracted.push(data);
    return data;
  };
  // Canvas drawing is the one thing replaced: there is no canvas in jsdom.
  service.renderPreview = async () => undefined;

  /** Render the real PreviewTab over `store` and read what the sheet renderer was handed. */
  async function observe(store) {
    extracted.length = 0;
    probe.bv = null; // the mechBV calculator probe: what the preview's own calculation did
    // The previous unit's canvases were released (see the finally below and checkCanvasMockCleared).
    checkCanvasMockCleared(HTMLCanvasElement.prototype.getContext);
    try {
      await renderPreviewTab(store);
      const data = extracted.at(-1);
      if (!data)
        throw previewFailure(
          'PreviewTab did not hand a unit to the sheet renderer (extractData was not called)',
        );
      const header = data.header;
      if (
        !header ||
        typeof header.battleValue !== 'number' ||
        typeof header.cost !== 'number'
      )
        throw previewFailure(
          'The extracted sheet data has no numeric BV and cost',
        );
      // A failed sheet calculation is never a value: see checkSheetCalculation (tested in plain Node).
      return checkSheetCalculation(header, probe.bv);
    } finally {
      cleanup();
      // The getContext jest.fn from jest.setup.js records every canvas, which keeps this unit's unmounted PreviewTab
      // tree reachable. Setup's beforeEach clear runs once for the capture's one test, so clear it per unit.
      HTMLCanvasElement.prototype.getContext.mockClear?.();
    }
  }

  return { observe };
}
