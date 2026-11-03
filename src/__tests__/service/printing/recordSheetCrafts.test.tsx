import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import fs from 'fs';
import path from 'path';
import React from 'react';

import { AerospacePreviewTab } from '@/components/customizer/aerospace/AerospacePreviewTab';
import { buildAerospaceUnitObject } from '@/components/customizer/aerospace/buildAerospaceUnitObject';
import { getMmDataAssetService } from '@/services/assets/MmDataAssetService';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { bindAerospace } from '@/services/printing/svgRecordSheetRenderer/aerospace/bindings';
import { selectAerospaceTemplate } from '@/services/printing/svgRecordSheetRenderer/aerospace/selectTemplate';
import { renderAerospaceTemplated } from '@/services/printing/svgRecordSheetRenderer/renderTemplated';
import { createDefaultAerospaceState } from '@/stores/aerospaceState';
import {
  AerospaceStoreContext,
  createNewAerospaceStore,
} from '@/stores/useAerospaceStore';
import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { TechBase } from '@/types/enums/TechBase';
import { PaperSize } from '@/types/printing';
import { AerospaceRecordSheetDataSchema } from '@/types/printing/RecordSheetSchemas';
import {
  AerospaceArc,
  AerospaceSubType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { normalizeArcLocation } from '@/utils/construction/aerospace/aerospaceBVArcs';

import manifest from '../../../../config/mm-data-assets.json';
import {
  catalog,
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

beforeAll(initializeEquipment);
afterEach(() => jest.restoreAllMocks());
const service = getRecordSheetService();
function craft(motionType = AerospaceMotionType.AERODYNE) {
  const state = createDefaultAerospaceState({
    name: 'Craft',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    isSmallCraft: true,
  });
  return {
    ...state,
    motionType,
    structuralIntegrity: 9,
    heatSinks: 12,
    doubleHeatSinks: true,
    armorAllocation: {
      ...state.armorAllocation,
      [AerospaceLocation.LEFT_WING]: 13,
      [AerospaceLocation.RIGHT_WING]: 17,
    },
  };
}
function sheet(state = craft()) {
  const data = service.extractData(buildAerospaceUnitObject(state));
  if (data.unitType !== 'aerospace') throw new Error('Wrong sheet family');
  return AerospaceRecordSheetDataSchema.parse(data);
}

it.each([AerospaceMotionType.AERODYNE, AerospaceMotionType.SPHEROID])(
  'preserves %s craft selection through schema validation',
  (motion) => {
    const expected =
      motion === AerospaceMotionType.SPHEROID
        ? 'smallcraft_spheroid_default'
        : 'smallcraft_aerodyne_default';
    expect(selectAerospaceTemplate(sheet(craft(motion)))).toBe(expected);
    for (const dir of ['templates_us', 'templates_iso'] as const)
      expect(manifest.patterns[dir]).toContain(expected + '.svg');
  },
);
it('retains conventional selection through the same schema', () => {
  expect(
    selectAerospaceTemplate(
      AerospaceRecordSheetDataSchema.parse({
        ...sheet(),
        isConventional: true,
        smallCraftMotionType: undefined,
      }),
    ),
  ).toBe('fighter_conventional');
});
it('normalizes editor wing aliases to native sides only for small craft', () => {
  for (const [wing, side] of [
    [AerospaceArc.LEFT_WING, AerospaceArc.LEFT_SIDE],
    [AerospaceArc.RIGHT_WING, AerospaceArc.RIGHT_SIDE],
  ] as const) {
    expect(normalizeArcLocation(wing, AerospaceSubType.SMALL_CRAFT)).toBe(side);
    expect(normalizeArcLocation(wing)).toBe(wing);
    expect(normalizeArcLocation(side, AerospaceSubType.SMALL_CRAFT)).toBe(side);
  }
});
it('selects dedicated sheets and preserves source-owner BV for every committed craft', () => {
  const rows = catalog('aerospace')
    .map((entry) => verifyCatalogUnit('aerospace', entry))
    .filter((r) => r.subtype === 'SmallCraft');
  expect(rows).toHaveLength(39);
  expect(
    rows.flatMap((r) =>
      r.differences
        .filter((d) => ['template', 'BV.source'].includes(d.field))
        .map((d) => ({ id: r.id, ...d })),
    ),
  ).toEqual([]);
});
it('binds double heat capacity from the owner and omits heat markers for conventional fighters', () => {
  const data = sheet();
  expect(bindAerospace(data).texts.hsCount).toBe('12 (24)');
  expect(
    bindAerospace({ ...data, isConventional: true }).pips.some(
      (p) => p.groupId === 'heatSinkPips',
    ),
  ).toBe(false);
});

for (const paper of [PaperSize.LETTER, PaperSize.A4])
  for (const motion of [
    AerospaceMotionType.AERODYNE,
    AerospaceMotionType.SPHEROID,
  ])
    it(`${paper} ${motion}: draws native side armor, SI and heat markers in valid SVG groups`, async () => {
      const key =
        motion === AerospaceMotionType.SPHEROID
          ? 'smallcraft_spheroid_default'
          : 'smallcraft_aerodyne_default';
      const dir = paper === PaperSize.A4 ? 'templates_iso' : 'templates_us';
      const fallback =
        '<svg xmlns="http://www.w3.org/2000/svg"><text id="textArmor_LS"/><text id="textArmor_RS"/><text id="hsCount"/><g id="armorPipsLS"><rect width="40" height="40"/></g><g id="armorPipsRS"><rect width="40" height="40"/></g><g id="siPips"><rect width="40" height="40"/></g><rect id="heatSinkPips" width="40" height="40"/></svg>';
      jest
        .spyOn(getMmDataAssetService(), 'loadSVG')
        .mockImplementation(async (asset) => {
          expect(asset).toBe(`/record-sheets/${dir}/${key}.svg`);
          return process.env.RECORD_SHEET_PINNED_ASSETS
            ? fs.readFileSync(
                path.join(
                  process.env.RECORD_SHEET_PINNED_ASSETS,
                  dir,
                  key + '.svg',
                ),
                'utf8',
              )
            : fallback;
        });
      const doc = new DOMParser().parseFromString(
        await renderAerospaceTemplated(sheet(craft(motion)), paper),
        'image/svg+xml',
      );
      expect(doc.querySelectorAll('parsererror')).toHaveLength(0);
      for (const [id, count] of [
        ['armorPipsLS', 13],
        ['armorPipsRS', 17],
        ['siPips', 9],
        ['heatSinkPips', 12],
      ] as const) {
        const group = doc.getElementById(id);
        expect(group?.tagName).toBe('g');
        expect(group?.querySelectorAll('circle')).toHaveLength(count);
      }
      expect(doc.getElementById('textArmor_LS')?.textContent).toBe('13');
      expect(doc.getElementById('textArmor_RS')?.textContent).toBe('17');
      expect(doc.getElementById('hsCount')?.textContent).toBe('12 (24)');
    });

it('updates both live preview and PDF/print inputs when the hull motion changes', async () => {
  const store = createNewAerospaceStore({
    name: 'Craft',
    tonnage: 100,
    techBase: TechBase.INNER_SPHERE,
    isSmallCraft: true,
  });
  const preview = jest
    .spyOn(service, 'renderPreview')
    .mockResolvedValue(undefined);
  const pdf = jest.spyOn(service, 'exportPDF').mockResolvedValue(undefined);
  const print = jest
    .spyOn(service, 'printRecordSheet')
    .mockResolvedValue(undefined);
  render(
    <AerospaceStoreContext.Provider value={store}>
      <AerospacePreviewTab />
    </AerospaceStoreContext.Provider>,
  );
  await waitFor(() => expect(preview).toHaveBeenCalled());
  expect(
    selectAerospaceTemplate(
      AerospaceRecordSheetDataSchema.parse(preview.mock.calls.at(-1)?.[1]),
    ),
  ).toBe('smallcraft_aerodyne_default');
  act(() => store.setState({ motionType: AerospaceMotionType.SPHEROID }));
  await waitFor(() =>
    expect(
      selectAerospaceTemplate(
        AerospaceRecordSheetDataSchema.parse(preview.mock.calls.at(-1)?.[1]),
      ),
    ).toBe('smallcraft_spheroid_default'),
  );
  fireEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
  await waitFor(() => expect(pdf).toHaveBeenCalled());
  expect(
    selectAerospaceTemplate(
      AerospaceRecordSheetDataSchema.parse(pdf.mock.calls.at(-1)?.[0]),
    ),
  ).toBe('smallcraft_spheroid_default');
  await waitFor(() =>
    expect(screen.getByRole('button', { name: /^Print$/i })).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: /^Print$/i }));
  await waitFor(() => expect(print).toHaveBeenCalled());
  expect(
    selectAerospaceTemplate(
      AerospaceRecordSheetDataSchema.parse(print.mock.calls.at(-1)?.[0]),
    ),
  ).toBe('smallcraft_spheroid_default');
});
