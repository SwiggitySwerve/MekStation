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
import { z } from 'zod';

import { AerospacePreviewTab } from '@/components/customizer/aerospace/AerospacePreviewTab';
import { AerospaceStatusBar } from '@/components/customizer/aerospace/AerospaceStatusBar';
import { buildAerospaceUnitObject } from '@/components/customizer/aerospace/buildAerospaceUnitObject';
import { getRecordSheetService } from '@/services/printing/RecordSheetService';
import { mapAerospaceDefinitionToState } from '@/services/units/unitLoaderService/aerospaceDefinitionMapper';
import { isDefinitionForFamily } from '@/services/units/unitLoaderService/definitionTypes';
import { mapToVehicleState } from '@/services/units/unitLoaderService/vehicleMapping';
import {
  AerospaceStoreContext,
  createAerospaceStore,
} from '@/stores/useAerospaceStore';
import { UnitContract } from '@/types/contracts';
import { Era } from '@/types/temporal/Era';
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { calculateBattleValueForUnit } from '@/utils/construction/battleValueCalculations';
import { contractUnitToBVUnit } from '@/utils/construction/contractBVUnitAdapter';
import { computeVehicleBVStructurePoints } from '@/utils/construction/vehicle/structure';
import { computeVehicleBVFromState } from '@/utils/construction/vehicle/vehicleBVAdapter';
import { serializeCustomAerospaceState } from '@/utils/serialization/CustomUnitSerializer';

import {
  catalog,
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

beforeAll(initializeEquipment);
afterEach(() => jest.restoreAllMocks());
const service = getRecordSheetService();
function definition(family: 'vehicles' | 'aerospace', entry: { path: string }) {
  return UnitContract.parse(
    JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), 'public/data/units', family, entry.path),
        'utf8',
      ),
    ),
  );
}
function caravan() {
  const entry = catalog('aerospace').find(
    (e) => e.id === 'caravan-heavy-transport',
  );
  if (!entry) throw new Error('Missing Caravan');
  const raw = definition('aerospace', entry);
  if (!isDefinitionForFamily('aerospace', raw)) throw new Error('Wrong family');
  return mapAerospaceDefinitionToState(raw);
}
it('retains source BAR and custom-library BAR through a full save/reload', () => {
  const state = caravan();
  expect(state.barRating).toBe(6);
  const saved = serializeCustomAerospaceState(
    { ...state, barRating: 8 },
    {
      id: state.id,
      chassis: state.chassis,
      variant: state.model,
      era: Era.RENAISSANCE,
    },
  );
  expect(saved.armor?.type).toBe('BAR');
  expect(saved.armor?.barRating).toBe(8);
  expect(saved.aerospaceEditor.barRating).toBe(8);
  if (!isDefinitionForFamily('aerospace', saved))
    throw new Error('Wrong family');
  expect(mapAerospaceDefinitionToState(saved).barRating).toBe(8);
});
it('persists BAR in the editor draft', () => {
  const state = caravan();
  const store = createAerospaceStore(state);
  store.setState({ barRating: 8 });
  expect(
    JSON.parse(localStorage.getItem(`megamek-aerospace-${state.id}`) ?? '{}')
      .state.barRating,
  ).toBe(8);
});
it('matches source-owner BV for every fixed-wing support aircraft', () => {
  const entries = catalog('aerospace').filter(
    (e) => definition('aerospace', e).subType === 'FixedWingSupport',
  );
  expect(entries.length).toBeGreaterThanOrEqual(21);
  expect(
    entries.flatMap((entry) =>
      verifyCatalogUnit('aerospace', entry)
        .differences.filter((d) => d.field === 'BV.source')
        .map((d) => ({ id: entry.id, ...d })),
    ),
  ).toEqual([]);
});
it('keeps the status bar, live preview, PDF and print on the same BAR-aware owner result', async () => {
  const store = createAerospaceStore(caravan());
  const preview = jest
    .spyOn(service, 'renderPreview')
    .mockResolvedValue(undefined);
  const pdf = jest.spyOn(service, 'exportPDF').mockResolvedValue(undefined);
  const print = jest
    .spyOn(service, 'printRecordSheet')
    .mockResolvedValue(undefined);
  render(
    <AerospaceStoreContext.Provider value={store}>
      <AerospaceStatusBar compact />
      <AerospacePreviewTab />
    </AerospaceStoreContext.Provider>,
  );
  for (const barRating of [6, 8]) {
    act(() => store.setState({ barRating }));
    const expected = buildAerospaceUnitObject(store.getState()).battleValue;
    await waitFor(() =>
      expect(screen.queryByText(`BV ${expected}`)).toBeInTheDocument(),
    );
    await waitFor(() =>
      expect(preview.mock.calls.at(-1)?.[1].header.battleValue).toBe(expected),
    );
    fireEvent.click(screen.getByRole('button', { name: /Download PDF/i }));
    await waitFor(() =>
      expect(pdf.mock.calls.at(-1)?.[0].header.battleValue).toBe(expected),
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /^Print$/i })).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: /^Print$/i }));
    await waitFor(() =>
      expect(print.mock.calls.at(-1)?.[0].header.battleValue).toBe(expected),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Download PDF/i }),
      ).toBeEnabled(),
    );
  }
});
it('retains native six-side structure BV for all 25 large support chassis', () => {
  let checked = 0;
  for (const entry of catalog('vehicles')) {
    const raw = definition('vehicles', entry);
    if (
      raw.unitType !== 'Support Vehicle' ||
      raw.armor?.byLocation?.FRONT_LEFT === undefined
    )
      continue;
    checked++;
    expect(mapToVehicleState(raw).isSuperheavy).toBe(true);
    if (!raw.movement || !raw.armor || typeof raw.tonnage !== 'number')
      throw new Error('Incomplete chassis');
    const movement = z
      .object({
        cruiseMP: z.number().optional(),
        flankMP: z.number().optional(),
        jumpMP: z.number().optional(),
      })
      .parse(raw.movement);
    const expected = calculateBattleValueForUnit(
      contractUnitToBVUnit({
        ...raw,
        movement,
        tonnage: raw.tonnage,
        armor: raw.armor,
      }),
    );
    if (expected?.kind !== 'vehicle') throw new Error('Wrong BV owner');
    expect({
      id: raw.id,
      structureBV: computeVehicleBVFromState(mapToVehicleState(raw))
        .structureBV,
    }).toEqual({ id: raw.id, structureBV: expected.breakdown.structureBV });
  }
  expect(checked).toBe(25);
});
it.each([
  [GroundMotionType.WHEELED, 80],
  [GroundMotionType.TRACKED, 100],
  [GroundMotionType.HOVER, 50],
  [GroundMotionType.WIGE, 80],
  [GroundMotionType.RAIL, 300],
  [GroundMotionType.NAVAL, 300],
] as const)('uses the support size boundary for %s', (motionType, limit) => {
  expect(
    computeVehicleBVStructurePoints({
      tonnage: limit,
      motionType,
      isSupportVehicle: true,
    }),
  ).toBe(Math.ceil(limit / 10) * 4);
  expect(
    computeVehicleBVStructurePoints({
      tonnage: limit + 1,
      motionType,
      isSupportVehicle: true,
    }),
  ).toBe(Math.ceil((limit + 1) / 10) * 6);
});
it('keeps explicit locations and VTOL structure layouts authoritative', () => {
  expect(
    computeVehicleBVStructurePoints({
      tonnage: 600,
      motionType: GroundMotionType.RAIL,
      isSupportVehicle: true,
      structureLocations: ['Body', 'Front', 'Left', 'Right', 'Rear', 'Turret'],
    }),
  ).toBe(300);
  expect(
    computeVehicleBVStructurePoints({
      tonnage: 40,
      motionType: GroundMotionType.VTOL,
      isSupportVehicle: true,
      turretKind: 'dual',
    }),
  ).toBe(28);
});
