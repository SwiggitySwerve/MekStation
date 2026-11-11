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
 * Usage (load capture, after the status observer is imported):
 *   import * as observer from '../lib/runtime-parity/status-observer';
 *   import { createPreviewObserver } from '../lib/runtime-parity/preview-observer';
 *   const preview = createPreviewObserver();
 *   const { bv, cost } = await preview.observe(store);   // after observer.observeStore(store)
 */
import './install-mocks';
import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import { PreviewTab } from '@/components/customizer/tabs/PreviewTab';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { UnitStoreContext } from '@/stores/useUnitStore';

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
    try {
      await act(async () => {
        render(
          React.createElement(
            UnitStoreContext.Provider,
            { value: store },
            React.createElement(PreviewTab),
          ),
        );
      });
      const data = extracted.at(-1);
      if (!data)
        throw new Error(
          'PreviewTab did not hand a unit to the sheet renderer (extractData was not called)',
        );
      const header = data.header;
      if (
        !header ||
        typeof header.battleValue !== 'number' ||
        typeof header.cost !== 'number'
      )
        throw new Error('The extracted sheet data has no numeric BV and cost');
      return { bv: header.battleValue, cost: header.cost };
    } finally {
      cleanup();
    }
  }

  return { observe };
}
