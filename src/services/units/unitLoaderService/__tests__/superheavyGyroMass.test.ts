import { renderHook } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { useUnitCalculations } from '@/hooks/useUnitCalculations';
import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';

import axman from '../../../../../public/data/units/battlemechs/5-civil-war/advanced/Axman AXM-5R.json';
import zeus from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Ares ARS-V1 Zeus.json';
import omega from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Omega SHP-5R.json';
import poseidon from '../../../../../public/data/units/battlemechs/6-dark-age/experimental/Poseidon PSD-V2.json';
import malice from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Malice MAL-Y-SH-RISC.json';
import orca from '../../../../../public/data/units/battlemechs/6-dark-age/standard/Orca OC-1X.json';
import { UnitLoaderService } from '../unitLoader';

jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));
beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

function controls(unit: Parameters<UnitLoaderService['mapToUnitState']>[0]) {
  const state = new UnitLoaderService().mapToUnitState(unit, true);
  const { result } = renderHook(() =>
    useUnitCalculations(
      state.tonnage,
      state,
      state.armorTonnage,
      state.configuration,
    ),
  );
  return result.current;
}

// MegaMek 48fcb2f64 TestMek.java:249-264: heavy-duty and superheavy gyros
// weigh twice ceil(rating / 100). TestMek.getWeightControls is cockpit + gyro
// (:244-247). Expected values are the pinned-Java getWeightControls terms
// from the CW1 census (construction-weight-rows.jsonl).
describe('superheavy gyro mass through the loader', () => {
  it.each([
    ['Omega SHP-5R', omega, 6, 10],
    ['Ares ARS-V1 Zeus', zeus, 6, 11],
    ['Poseidon PSD-V2', poseidon, 8, 13],
    ['Malice MAL-Y-SH-RISC', malice, 8, 12],
    ['Orca OC-1X', orca, 8, 11],
  ])('%s gyro %s t, controls %s t', (_name, unit, gyro, total) => {
    const calc = controls(unit as never);
    expect(calc.gyroWeight).toBe(gyro);
    expect(calc.cockpitWeight + calc.gyroWeight).toBe(total);
  });

  it('keeps the heavy-duty gyro at twice the base weight', () => {
    // Axman AXM-5R: rating 260 -> ceil(2.6) = 3, heavy-duty x2.
    expect(controls(axman as never).gyroWeight).toBe(6);
  });
});
