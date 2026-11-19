/**
 * FrankenMek donor tonnage at the editor's BV read points. The four units below mix structure from
 * donor chassis of different tonnage (`frankenStructure.locationTonnage`); Java's structure term uses
 * the donor tonnage per location. The value reaches every read point only through the one owner of
 * `projectEditableMech`'s input (`buildEditableMechProjectionInput`).
 *
 * Real catalog units, loader, store, calculator and components. Stubs, as in
 * `src/__tests__/components/customizer/EditorBVProjectionOwner.test.tsx`, cover only what the BV does
 * not read: canvas drawing, the preview frame, the validation banner and the registry readiness flag.
 *
 * Java (pinned MegaMek 48fcb2f64, MekBVCalculator.java:80-123; Mek.java:1062-1087 owns donor-tonnage
 * internals): Sneede 1248, Sneede II 2165, Temax Cat Ninjabolt 1490, Schwerer Gustav 1643;
 * Atlas AS7-D 1897 as the ordinary control.
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
import { buildEditableMechProjectionInput } from '@/services/construction/editableMechProjection';
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

const DIR = 'public/data/units/battlemechs';
const FRANKEN = [
  ['3-succession-wars/standard/Hybrid Rifleman RFL-3N (Sneede).json', 1248],
  ['6-dark-age/standard/Hybrid Rifleman RFL-3N (Sneede II).json', 2165],
  ['5-civil-war/standard/Temax Cat Ninjabolt TMC-NB.json', 1490],
  ['5-civil-war/standard/Schwerer Gustav Unknown.json', 1643],
] as const;
const ATLAS = ['2-star-league/standard/Atlas AS7-D.json', 1897] as const;

function openUnit(file: string) {
  const raw: unknown = JSON.parse(
    fs.readFileSync(path.join(process.cwd(), DIR, file), 'utf8'),
  );
  return createUnitStore(
    unitLoaderService.mapToUnitState(
      parseUnit(raw as Parameters<typeof parseUnit>[0]),
      true,
    ),
  );
}

function statusBV(store: ReturnType<typeof openUnit>) {
  const state = store.getState();
  const { result } = renderHook(() =>
    useUnitEditorRoutingStats({
      ...state,
      unitName: state.name,
      validation: { status: 'valid', errorCount: 0, warningCount: 0 },
    }),
  );
  return result.current.unitStats.battleValue;
}

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

describe.each([...FRANKEN, ATLAS])('%s', (file, java) => {
  it('status bar shows the Java BV', () => {
    expect(statusBV(openUnit(file))).toBe(java);
  });

  it('PreviewTab prints the Java BV', async () => {
    const config = await renderSheet(openUnit(file), <PreviewTab />);
    expect(config.battleValue).toBe(java);
  });

  it('RecordSheetPreview prints the Java BV', async () => {
    const config = await renderSheet(openUnit(file), <RecordSheetPreview />);
    expect(config.battleValue).toBe(java);
  });
});

it.each(FRANKEN)(
  'the owner carries donor tonnage for %s by identity',
  (file) => {
    const state = openUnit(file).getState();
    expect(state.frankenStructure?.locationTonnage).toBeDefined();
    expect(buildEditableMechProjectionInput(state).frankenStructure).toBe(
      state.frankenStructure,
    );
  },
);

it('the ordinary Atlas AS7-D carries no donor tonnage', () => {
  const state = openUnit(ATLAS[0]).getState();
  expect(state.frankenStructure).toBeUndefined();
  expect(buildEditableMechProjectionInput(state)).not.toHaveProperty(
    'frankenStructure',
  );
});
