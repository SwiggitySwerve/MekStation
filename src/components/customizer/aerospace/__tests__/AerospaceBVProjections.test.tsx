import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import fs from 'node:fs';
import React from 'react';

import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import {
  AerospaceStoreContext,
  createAerospaceStore,
} from '@/stores/useAerospaceStore';
import { ArmorTypeEnum } from '@/types/construction/ArmorType';
import { UnitContract } from '@/types/contracts';

import { AerospacePreviewTab } from '../AerospacePreviewTab';
import { AerospaceStatusBar } from '../AerospaceStatusBar';

jest.mock('@/services/printing/RecordSheetService', () => {
  const service = {
    extractData: jest.fn((unit: unknown) => unit),
    renderPreview: jest.fn().mockResolvedValue(undefined),
    exportPDF: jest.fn().mockResolvedValue(undefined),
  };
  return { getRecordSheetService: () => service };
});

function nanookStore() {
  const unit = UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        "public/data/units/aerospace/Sangihe Shrike-Thrush 'Nanook'.json",
        'utf8',
      ),
    ),
  );
  if (!isDefinitionForFamily('aerospace', unit))
    throw Error('Expected aircraft');
  return createAerospaceStore(mapAerospaceDefinitionToState(unit));
}

it.each([true, false])(
  'shows patchwork BV in the real status bar, compact=%s',
  (compact) => {
    const store = nanookStore();
    const view = render(
      <AerospaceStoreContext.Provider value={store}>
        <AerospaceStatusBar compact={compact} />
      </AerospaceStoreContext.Provider>,
    );
    expect(view.container.textContent).toContain('1571');
    if (!compact)
      expect(view.container.textContent).toContain('D 368 / O 1204');
    const armorAllocation = store.getState().armorAllocation;
    act(() =>
      store.setState({ armorAllocation: { ...armorAllocation, Nose: 12 } }),
    );
    expect(view.container.textContent).toContain('1511');
    act(() => store.setState({ armorAllocation }));
    act(() =>
      store.setState({
        armorTypeByArc: { ...store.getState().armorTypeByArc, NOSE: 3 },
      }),
    );
    expect(view.container.textContent).toContain('1619');
    act(() => store.getState().setArmorType(ArmorTypeEnum.STANDARD));
    expect(view.container.textContent).toContain('1490');
  },
);

it('updates canvas and PDF BV from both real record-sheet callers', async () => {
  const store = nanookStore(),
    service = getRecordSheetService();
  render(
    <AerospaceStoreContext.Provider value={store}>
      <AerospacePreviewTab />
    </AerospaceStoreContext.Provider>,
  );
  await waitFor(() =>
    expect(service.extractData).toHaveBeenCalledWith(
      expect.objectContaining({ battleValue: 1571 }),
    ),
  );
  jest.mocked(service.extractData).mockClear();
  fireEvent.click(screen.getByRole('button', { name: /pdf/i }));
  await waitFor(() => expect(service.exportPDF).toHaveBeenCalled());
  expect(service.extractData).toHaveBeenCalledWith(
    expect.objectContaining({ battleValue: 1571 }),
  );
  act(() =>
    store.setState({
      armorTypeByArc: { ...store.getState().armorTypeByArc, NOSE: 3 },
    }),
  );
  await waitFor(() =>
    expect(service.extractData).toHaveBeenCalledWith(
      expect.objectContaining({ battleValue: 1619 }),
    ),
  );
  jest.mocked(service.extractData).mockClear();
  fireEvent.click(screen.getByRole('button', { name: /pdf/i }));
  await waitFor(() =>
    expect(service.extractData).toHaveBeenCalledWith(
      expect.objectContaining({ battleValue: 1619 }),
    ),
  );
});
