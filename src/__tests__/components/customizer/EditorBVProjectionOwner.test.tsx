/**
 * The status bar, PreviewTab and RecordSheetPreview project the same BV from the one owner of
 * `projectEditableMech`'s input. Real catalog units, real calculator, real components; only canvas
 * drawing, the frame and the validation banner are no-ops.
 *
 * Before the owner, PreviewTab dropped `bvContext` and printed Masakari L at 2467 against 3695.
 *
 * @spec openspec/specs/battle-value-system/spec.md
 * @spec openspec/specs/record-sheet-export/spec.md
 */
import { act, render, renderHook } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';

import type { IUnitConfig } from '@/services/printing/recordsheet/types';

import { initializeEquipment } from '@/__tests__/service/printing/catalogRecordSheets.helpers';
import { RecordSheetPreview } from '@/components/customizer/preview/RecordSheetPreview';
import { PreviewTab } from '@/components/customizer/tabs/PreviewTab';
import { useUnitEditorRoutingStats } from '@/components/customizer/UnitEditorWithRoutingStats';
import {
  buildEditableMechProjectionInput,
  type IEditableMechProjectionInput,
} from '@/services/construction/editableMechProjection';
import { RecordSheetService } from '@/services/printing/RecordSheetService';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { unitLoaderService } from '@/services/units/unitLoaderService/unitLoader';
import { UnitStoreContext, createUnitStore } from '@/stores/unit/useUnitStore';

let sheetConfig: IUnitConfig | undefined;

jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: true }),
}));
jest.mock('@/hooks/useUnitValidation', () => ({
  ...jest.requireActual('@/hooks/useUnitValidation'),
  usePreviewValidation: () => ({ issues: [], errorCount: 0, warningCount: 0 }),
}));
jest.mock('@/components/customizer/preview/PreviewTabFrame', () => ({
  PreviewTabFrame: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock(
  '@/components/customizer/preview/RecordSheetPreviewValidationBanner',
  () => ({ RecordSheetPreviewValidationBanner: () => null }),
);
jest.mock('@/components/customizer/preview/RecordSheetCanvasPreview', () => ({
  RecordSheetCanvasPreview: () => null,
  useRecordSheetCanvasRenderer: ({
    unitObject,
  }: {
    unitObject: IUnitConfig;
  }) => {
    sheetConfig = unitObject;
    return { current: null };
  },
  useRecordSheetToolbarActions: () => ({}),
}));

const UNITS = [
  [
    'atlas-as7-d',
    'public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json',
    1897,
  ],
  [
    'masakari-l',
    'public/data/units/battlemechs/6-dark-age/advanced/Masakari L.json',
    3695,
  ],
  [
    'mad-cat-prime',
    'public/data/units/battlemechs/3-succession-wars/advanced/Mad Cat Prime.json',
    2737,
  ],
] as const;

function openUnit(file: string) {
  const raw: unknown = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), file), 'utf8'),
  );
  const state = unitLoaderService.mapToUnitState(
    parseUnit(raw as Parameters<typeof parseUnit>[0]),
    true,
  );
  return createUnitStore(state);
}

const statusBV = (store: ReturnType<typeof openUnit>) => {
  const state = store.getState();
  const { result } = renderHook(() =>
    useUnitEditorRoutingStats({
      ...state,
      unitName: state.name,
      validation: { status: 'valid', errorCount: 0, warningCount: 0 },
    }),
  );
  return result.current.unitStats.battleValue;
};

async function renderSheet(
  store: ReturnType<typeof openUnit>,
  element: React.ReactElement,
): Promise<IUnitConfig> {
  sheetConfig = undefined;
  await act(async () => {
    render(
      <UnitStoreContext.Provider value={store}>
        {element}
      </UnitStoreContext.Provider>,
    );
  });
  if (!sheetConfig) throw new Error('the sheet was not projected');
  return sheetConfig;
}

beforeAll(initializeEquipment);

describe.each(UNITS)('%s', (_id, file, expectedBV) => {
  it('status bar BV is unchanged', () => {
    expect(statusBV(openUnit(file))).toBe(expectedBV);
  });

  it('PreviewTab prints the status-bar BV', async () => {
    const store = openUnit(file);
    const config = await renderSheet(store, <PreviewTab />);
    expect(config.battleValue).toBe(statusBV(store));
    expect(config.battleValue).toBe(expectedBV);
    expect(new RecordSheetService().extractData(config)).toMatchObject({
      header: { battleValue: expectedBV },
    });
  });

  it('RecordSheetPreview prints the status-bar BV', async () => {
    const store = openUnit(file);
    const config = await renderSheet(store, <RecordSheetPreview />);
    expect(config.battleValue).toBe(statusBV(store));
    expect(config.battleValue).toBe(expectedBV);
  });
});

describe('buildEditableMechProjectionInput', () => {
  it('carries every projection field, bvContext included, by identity', () => {
    const state = openUnit(UNITS[1][1]).getState();
    const input = buildEditableMechProjectionInput(state);
    expect(input.bvContext).toBe(state.bvContext);
    expect(input.bvContext).toBeDefined();
    for (const key of [
      'jumpMP',
      'name',
      'chassis',
      'model',
      'tonnage',
      'configuration',
      'techBase',
      'techBaseMode',
      'componentTechBases',
      'engineType',
      'engineRating',
      'internalStructureType',
      'gyroType',
      'cockpitType',
      'armorType',
      'armorAllocation',
      'heatSinkType',
      'heatSinkCount',
      'equipment',
    ] as const)
      expect(input[key]).toBe(state[key as keyof typeof state]);
  });

  it('picks only projection fields and leaves absent ones absent', () => {
    const input = buildEditableMechProjectionInput({
      name: 'x',
      chassis: 'x',
      model: 'x',
      tonnage: 20,
      stray: 1,
    } as unknown as IEditableMechProjectionInput);
    expect(Object.keys(input).sort()).toEqual([
      'chassis',
      'model',
      'name',
      'tonnage',
    ]);
  });
});
