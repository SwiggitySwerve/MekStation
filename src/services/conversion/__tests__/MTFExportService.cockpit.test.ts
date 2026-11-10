/** @spec openspec/changes/establish-all-unit-data-parity/specs/serialization-formats/spec.md */
import { MTFExportService } from '@/services/conversion/MTFExportService';
import {
  COCKPIT_DEFINITIONS,
  CockpitType,
} from '@/types/construction/CockpitType';

import { createMinimalUnit } from './MTFExportService.test-helpers';

const exporter = new MTFExportService();
const cockpitLines = (text: string | undefined) =>
  text?.split('\n').filter((line) => line.startsWith('cockpit:'));
const withoutCockpit = (text: string | undefined) =>
  text?.replace(/^cockpit:.*\n/m, '');

it.each(COCKPIT_DEFINITIONS)(
  'exports the $sourceTag cockpit identity through the complete service',
  (definition) => {
    const standard = exporter.export(createMinimalUnit());
    const result = exporter.export(
      createMinimalUnit({ cockpit: definition.sourceTag }),
    );
    expect(result.success).toBe(true);
    expect(result.errors).toEqual([]);
    expect(cockpitLines(result.content)).toEqual(
      definition.type === CockpitType.STANDARD
        ? []
        : [`cockpit:${definition.name}`],
    );
    // Only the named line changes; structure, armor, equipment and grids keep their bytes.
    expect(withoutCockpit(result.content)).toBe(standard.content);
    if (definition.type !== CockpitType.STANDARD) {
      expect(result.content).toContain(
        `myomer:Standard\ncockpit:${definition.name}\n\nheat sinks:`,
      );
    }
  },
);

it.each(['XL', 'COMPACT', 'HEAVY_DUTY', 'SUPERHEAVY', 'NONE'])(
  'emits the Standard cockpit for a %s gyro without changing other bytes',
  (gyro) => {
    const standard = exporter.export(createMinimalUnit());
    const result = exporter.export(createMinimalUnit({ gyro: { type: gyro } }));
    expect(result.success).toBe(true);
    expect(cockpitLines(result.content)).toEqual(['cockpit:Standard Cockpit']);
    expect(withoutCockpit(result.content)).toBe(standard.content);
  },
);

it.each(['INNER_SPHERE', 'CLAN'] as const)(
  'retains qualified Mixed %s headers alongside cockpit output',
  (chassis) => {
    const result = exporter.export(
      createMinimalUnit({
        techBase: 'MIXED',
        componentTechBases: { chassis },
        cockpit: 'QUADVEE',
      }),
    );
    expect(result.success).toBe(true);
    expect(cockpitLines(result.content)).toEqual(['cockpit:QuadVee Cockpit']);
    expect(result.content).toContain(
      chassis === 'CLAN'
        ? 'techbase:Mixed (Clan Chassis)'
        : 'techbase:Mixed (IS Chassis)',
    );
  },
);

it('keeps Standard/Standard output identical across accepted cockpit aliases', () => {
  const baseline = exporter.export(createMinimalUnit());
  expect(cockpitLines(baseline.content)).toEqual([]);
  expect(exporter.export(createMinimalUnit({ cockpit: 'STANDARD' }))).toEqual(
    baseline,
  );
  expect(
    exporter.export(createMinimalUnit({ cockpit: 'Standard Cockpit' })),
  ).toEqual(baseline);
});

it('refuses an unknown cockpit and reports independent missing Mixed context before emitting content', () => {
  const result = exporter.export(
    createMinimalUnit({ techBase: 'MIXED', cockpit: 'UNKNOWN' }),
  );
  expect(result.success).toBe(false);
  expect(result.content).toBeUndefined();
  expect(result.errors.some((error) => error.includes('cockpit'))).toBe(true);
  expect(
    result.errors.some((error) => error.includes('chassis-tech-context')),
  ).toBe(true);
});
