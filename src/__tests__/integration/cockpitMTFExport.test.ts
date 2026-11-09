/** @spec openspec/changes/establish-all-unit-data-parity/specs/serialization-formats/spec.md */
import { createMinimalUnit } from '@/services/conversion/__tests__/MTFExportService.test-helpers';
import { MTFExportService } from '@/services/conversion/MTFExportService';
import { MTFParserService } from '@/services/conversion/MTFParserService';
import {
  UnitLoaderService,
  parseUnit,
} from '@/services/units/unitLoaderService';
import { createUnitStore } from '@/stores/useUnitStore';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

it.each([
  ['QUADVEE', 'QuadVee', 50, 'STANDARD', 'QuadVee Cockpit'],
  ['VRRP', 'Biped', 50, 'STANDARD', 'Virtual Reality Piloting Pod'],
  ['TRIPOD', 'Tripod', 50, 'STANDARD', 'Tripod Cockpit'],
  [
    'SUPERHEAVY_TRIPOD',
    'Tripod',
    150,
    'SUPERHEAVY',
    'Superheavy Tripod Cockpit',
  ],
  ['STANDARD', 'Biped', 50, 'XL', 'Standard Cockpit'],
] as const)(
  'preserves %s through real load, store, save, reopen and MTF header export',
  (cockpit, configuration, tonnage, gyro, nativeName) => {
    const source = createMinimalUnit({
      cockpit,
      configuration,
      tonnage,
      gyro: { type: gyro },
    });
    const loader = new UnitLoaderService();
    const loaded = loader.mapToUnitState(parseUnit(source), true);
    const store = createUnitStore(loaded);
    const saved = serializeCustomUnitState(store.getState(), {
      id: loaded.id,
      chassis: source.chassis,
      variant: source.model,
      era: Era.DARK_AGE,
    });
    const reopened = loader.mapToUnitState(
      parseUnit(JSON.parse(JSON.stringify(saved))),
      false,
    );
    expect(reopened.cockpitType).toBe(loaded.cockpitType);
    expect(reopened.gyroType).toBe(loaded.gyroType);
    const result = new MTFExportService().export(saved);
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(
      result.content?.split('\n').filter((line) => line.startsWith('cockpit:')),
    ).toEqual([`cockpit:${nativeName}`]);
    const parsed = new MTFParserService().parse(result.content ?? '');
    expect(parsed.success).toBe(true);
    // The parser owner separately retains typed cockpit/gyro identity. Do not
    // freeze its current Standard substitution as the expected identity here.
    expect(parsed.unit).toHaveProperty('mtfSource.text', result.content);
  },
);
