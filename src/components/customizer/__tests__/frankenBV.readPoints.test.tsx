/**
 * FrankenMek donor-tonnage BV at the editor's real read points.
 *
 * `projectEditableMech(state)` with a full loaded state is not how the editor
 * reads BV: the status bar and the record-sheet preview each assemble the
 * projection input by hand. These tests run those read points on a store
 * loaded with a real FrankenMek and assert Java's total.
 *
 * Java (pinned MegaMek 48fcb2f64): Sneede 1248, Sneede II 2165,
 * Temax Cat Ninjabolt 1490, Schwerer Gustav 1643; Atlas AS7-D 1897.
 */

import { render, renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import React from 'react';

import type { IUnitConfig } from '@/services/printing/recordsheet/types';
import type { UnitState } from '@/stores/unitState';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { unitLoaderService } from '@/services/units/unitLoaderService';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { createUnitStore } from '@/stores/unit/useUnitStore';
import { UnitStoreContext } from '@/stores/useUnitStore';

import { RecordSheetPreview } from '../preview/RecordSheetPreview';
import { PreviewTab } from '../tabs/PreviewTab';
import { useUnitEditorRoutingStats } from '../UnitEditorWithRoutingStats';

const mockCaptured: {
  toolbar?: IUnitConfig;
  canvas?: IUnitConfig;
} = {};

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
jest.mock('@/hooks/useEquipmentRegistry', () => ({
  useEquipmentRegistry: () => ({ isReady: true }),
}));
jest.mock('@/hooks/useUnitValidation', () => ({
  ...jest.requireActual('@/hooks/useUnitValidation'),
  usePreviewValidation: () => ({
    issues: [],
    errorCount: 0,
    warningCount: 0,
    isValid: true,
  }),
}));
jest.mock('../preview/RecordSheetCanvasPreview', () => ({
  useRecordSheetToolbarActions: (unitConfig: IUnitConfig) => {
    mockCaptured.toolbar = unitConfig;
    return null;
  },
  useRecordSheetCanvasRenderer: ({
    unitObject,
  }: {
    unitObject: IUnitConfig;
  }) => {
    mockCaptured.canvas = unitObject;
    return { current: null };
  },
  RecordSheetCanvasPreview: () => null,
}));
jest.mock('../preview/PreviewTabFrame', () => ({
  PreviewTabFrame: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

const franken = [
  {
    file: '3-succession-wars/standard/Hybrid Rifleman RFL-3N (Sneede).json',
    java: 1248,
  },
  {
    file: '6-dark-age/standard/Hybrid Rifleman RFL-3N (Sneede II).json',
    java: 2165,
  },
  {
    file: '5-civil-war/standard/Temax Cat Ninjabolt TMC-NB.json',
    java: 1490,
  },
  {
    file: '5-civil-war/standard/Schwerer Gustav Unknown.json',
    java: 1643,
  },
];
const atlas = '2-star-league/standard/Atlas AS7-D.json';

function load(file: string): UnitState {
  const definition = parseUnit(
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/units/battlemechs', file),
        'utf8',
      ),
    ),
    file,
  );
  return unitLoaderService.mapToUnitState(definition, true);
}

function statusBarBV(file: string): number {
  const store = createUnitStore(load(file));
  const state = store.getState();
  const { result } = renderHook(() =>
    useUnitEditorRoutingStats({
      ...state,
      unitName: state.name,
      validation: { status: 'valid', errorCount: 0, warningCount: 0 },
    }),
  );
  return result.current.unitStats.battleValue ?? Number.NaN;
}

function withStore(
  file: string,
  node: React.ReactElement,
  withoutDonor = false,
) {
  const store = createUnitStore(load(file));
  if (withoutDonor) store.setState({ frankenStructure: undefined });
  return (
    <UnitStoreContext.Provider value={store}>{node}</UnitStoreContext.Provider>
  );
}

beforeAll(async () => {
  await getEquipmentLookupService().initialize();
  await getEquipmentRegistry().initialize();
});

beforeEach(() => {
  mockCaptured.toolbar = undefined;
  mockCaptured.canvas = undefined;
});

describe('status bar (useUnitEditorRoutingStats)', () => {
  it.each(franken)('$file shows the Java BV', ({ file, java }) => {
    expect(statusBarBV(file)).toBe(java);
  });

  it('leaves the ordinary Atlas AS7-D unchanged', () => {
    expect(statusBarBV(atlas)).toBe(1897);
  });
});

describe('record-sheet preview', () => {
  it.each(franken)(
    'RecordSheetPreview $file prints the Java BV',
    ({ file, java }) => {
      render(withStore(file, <RecordSheetPreview />));
      expect(mockCaptured.canvas?.battleValue).toBe(java);
    },
  );

  // PreviewTab does not pass `bvContext` (it only forwards `chassisSource`), so
  // its total is not Java's; that omission is a separate, known gap. The donor
  // tonnage must still reach it: clearing it has to move the printed BV by the
  // same amount as on the Java-exact RecordSheetPreview path.
  it.each(franken)(
    'PreviewTab $file applies the donor-tonnage BV',
    ({ file }) => {
      const printed = (
        node: (f: string, withoutDonor: boolean) => React.ReactElement,
        pick: () => number | undefined,
        withoutDonor: boolean,
      ) => {
        mockCaptured.toolbar = undefined;
        mockCaptured.canvas = undefined;
        const { unmount } = render(node(file, withoutDonor));
        const bv = pick();
        unmount();
        return bv;
      };
      const tab = (f: string, withoutDonor: boolean) =>
        withStore(f, <PreviewTab />, withoutDonor);
      const sheet = (f: string, withoutDonor: boolean) =>
        withStore(f, <RecordSheetPreview />, withoutDonor);
      const tabWith = printed(
        tab,
        () => mockCaptured.toolbar?.battleValue,
        false,
      );
      const tabWithout = printed(
        tab,
        () => mockCaptured.toolbar?.battleValue,
        true,
      );
      const sheetWith = printed(
        sheet,
        () => mockCaptured.canvas?.battleValue,
        false,
      );
      const sheetWithout = printed(
        sheet,
        () => mockCaptured.canvas?.battleValue,
        true,
      );
      expect(sheetWith).not.toBe(sheetWithout);
      expect((tabWith ?? 0) - (tabWithout ?? 0)).toBe(
        (sheetWith ?? 0) - (sheetWithout ?? 0),
      );
    },
  );

  it('leaves the ordinary Atlas AS7-D unchanged', () => {
    render(withStore(atlas, <RecordSheetPreview />));
    expect(mockCaptured.canvas?.battleValue).toBe(1897);
  });
});
