/**
 * The product modules the record-sheet read point renders, in their own module so that preview-observer.js can import
 * ./install-mocks BEFORE this file loads them. The formatter sorts imports (external, then `@/`, then relative), which
 * would otherwise put these product imports above a relative ./install-mocks import; keeping them here means the order
 * is carried by relative names that sort the right way (./install-mocks, ./preview-view, ./status-observer), and
 * install-mocks.test-order checks it.
 */
import { act, cleanup, render } from '@testing-library/react';
import React from 'react';

import { PreviewTab } from '@/components/customizer/tabs/PreviewTab';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { UnitStoreContext } from '@/stores/useUnitStore';

export { cleanup, getRecordSheetService };

/** Render the real PreviewTab over `store` and let its effects run (the sheet renderer's extraction is one). */
export async function renderPreviewTab(store) {
  await act(async () => {
    render(
      React.createElement(
        UnitStoreContext.Provider,
        { value: store },
        React.createElement(PreviewTab),
      ),
    );
  });
}
