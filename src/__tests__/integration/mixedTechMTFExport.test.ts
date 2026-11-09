/** @spec openspec/changes/establish-all-unit-data-parity/specs/serialization-formats/spec.md */

import { createMinimalUnit } from '@/services/conversion/__tests__/MTFExportService.test-helpers';
import { MTFExportService } from '@/services/conversion/MTFExportService';
import { MTFParserService } from '@/services/conversion/MTFParserService';
import {
  UnitLoaderService,
  parseUnit,
} from '@/services/units/unitLoaderService';
import { TechBase } from '@/types/enums/TechBase';
import { Era } from '@/types/temporal/Era';
import { serializeCustomUnitState } from '@/utils/serialization/CustomUnitSerializer';

it.each([
  ['INNER_SPHERE', TechBase.INNER_SPHERE, 'Mixed (IS Chassis)'],
  ['CLAN', TechBase.CLAN, 'Mixed (Clan Chassis)'],
] as const)(
  'preserves explicit %s Mixed identity through load, save, export and re-import',
  (chassis, editorChassis, header) => {
    const source = createMinimalUnit({
      techBase: 'MIXED',
      componentTechBases: { chassis },
      configuration: 'Biped',
      cockpit: 'STANDARD',
    });
    const loader = new UnitLoaderService();
    const loaded = loader.mapToUnitState(parseUnit(source), true);
    expect(loaded.componentTechBases.chassis).toBe(editorChassis);
    const saved = serializeCustomUnitState(loaded, {
      id: loaded.id,
      chassis: source.chassis,
      variant: source.model,
      era: Era.LATE_SUCCESSION_WARS,
    });
    const document = parseUnit(JSON.parse(JSON.stringify(saved)));
    expect(document.unitType).toBe('BattleMech');
    const reopened = loader.mapToUnitState(document, false);
    expect(saved.techBase).toBe('MIXED');
    expect(saved.componentTechBases?.chassis).toBe(chassis);
    expect(reopened.componentTechBases).toEqual(loaded.componentTechBases);

    const exported = new MTFExportService().export(saved);
    expect(exported.success).toBe(true);
    expect(exported.errors).toEqual([]);
    expect(exported.content?.split('\n')).toContain(`techbase:${header}`);
    const imported = new MTFParserService().parse(exported.content ?? '');
    expect(imported.success).toBe(true);
    expect(imported.unit).toMatchObject({
      chassis: source.chassis,
      model: source.model,
      techBase: 'MIXED',
      tonnage: source.tonnage,
      engine: saved.engine,
      movement: source.movement,
    });
    // m6 owns retaining this header family as parsed componentTechBases.chassis.
    // Until then, assert its exact identity in the real parser's retained source.
    expect(imported.unit).toHaveProperty('mtfSource.text', exported.content);
  },
);
