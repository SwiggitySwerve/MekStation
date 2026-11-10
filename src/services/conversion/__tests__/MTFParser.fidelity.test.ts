import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { importMTFDefinition } from '@/services/units/importMTFDefinition';
import { UnitLoaderService } from '@/services/units/unitLoaderService';
import { CockpitType } from '@/types/construction/CockpitType';
import { GyroType } from '@/types/construction/GyroType';
import { HeatSinkType } from '@/types/construction/HeatSinkType';

import { captureMechValidity } from '../../../../scripts/unit-construction-validity';
import { MTFParserService } from '../MTFParserService';
import fixtures from './MTFParser.fidelity-sources.json';

// Original mm-data 50f7efe bytes, one unit per source string (and per explicit
// case). Each row pins the strict converter's output for the fields this suite
// covers (`converter`, from the unmodified origin/main export) next to the
// unit's committed catalog JSON. The importer must equal the converter on every
// covered field and the catalog on gyro and heat sinks.
//
// The catalog is not the reference for `rulesLevel` or Wildfire P1-WF's
// cockpit: the committed JSON still holds the pre-#3129 rules-level decode
// (`rules level:2` -> ADVANCED; 4,253 of 4,263 mechs differ) and a STANDARD
// cockpit where the converter now emits VRRP. Catalog regeneration is a
// separate decision, so the real-route comparison overlays the converter's
// values on the catalog unit. Later PRs (m2-m4) append rows and fields; the
// census over all 4,263 MTFs is the full proof.
// Validity differences that are not m1's. Scarecrow UCU-F4's Compact gyro now
// imports; the parser's B-Pod equipment id still resolves to a different catalog
// item (report cause 3, fixed by m3). Its 3 t of missing probe and IS CASE II
// belong to FU-101 PR-D and are not asserted here.
const VALIDITY_RESIDUAL: Record<string, string[]> = {
  'data/mekfiles/meks/3145/Davion/Scarecrow UCU-F4.mtf': [
    'VAL-UNIV-015: Anti-BattleArmor Pods (B-Pods) in Left Leg needs 1 distinct critical slots.',
    'VAL-UNIV-015: Anti-BattleArmor Pods (B-Pods) in Right Leg needs 1 distinct critical slots.',
  ],
};

const CATALOG = path.join(process.cwd(), 'public/data/units/battlemechs');

const catalogUnit = (catalog: string) =>
  JSON.parse(readFileSync(path.join(CATALOG, catalog), 'utf8'));

// The validity projection prices equipment from the committed catalog.
jest.mock('@/services/equipment/EquipmentFileReader', () => ({
  readJsonFile: async (file: string) =>
    JSON.parse(
      readFileSync(
        path.join(process.cwd(), 'public/data/equipment/official', file),
        'utf8',
      ),
    ),
}));

beforeAll(async () => {
  await getEquipmentRegistry().initialize();
  await getEquipmentLookupService().initialize();
});

describe('MTF import fidelity to the committed catalog (m1 fields)', () => {
  it.each(fixtures.rows)('$path', async (row) => {
    const bytes = Buffer.from(row.base64, 'base64');
    expect(bytes.length).toBe(row.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(row.sha256);
    const text = bytes.toString('utf8');
    const catalog = catalogUnit(row.catalog);
    const canonical = { ...catalog, ...row.converter };

    const parsed = new MTFParserService().parse(text);
    expect(parsed.success).toBe(true);
    if (!parsed.unit) throw new Error(parsed.errors.join('; '));
    expect({
      gyro: parsed.unit.gyro,
      cockpit: parsed.unit.cockpit,
      heatSinks: parsed.unit.heatSinks,
      rulesLevel: parsed.unit.rulesLevel,
    }).toEqual(row.converter);
    expect(parsed.unit.gyro).toEqual(catalog.gyro);
    expect(parsed.unit.heatSinks).toEqual(catalog.heatSinks);

    // Real import route: the editor state it resolves, and the validity the
    // same projection gives, must equal the catalog unit's.
    const imported = await importMTFDefinition(text);
    if (!imported.success) {
      throw new Error(
        `import failed: ${imported.error.message} ${(imported.error.validationErrors ?? []).join('; ')}`,
      );
    }
    const loader = new UnitLoaderService();
    const importedState = loader.mapToUnitState(
      imported.data.definition as never,
      true,
    );
    const canonicalState = loader.mapToUnitState(canonical, true);
    expect({
      gyroType: importedState.gyroType,
      cockpitType: importedState.cockpitType,
      heatSinkType: importedState.heatSinkType,
      heatSinkCount: importedState.heatSinkCount,
      rulesLevel: importedState.rulesLevel,
    }).toEqual({
      gyroType: canonicalState.gyroType,
      cockpitType: canonicalState.cockpitType,
      heatSinkType: canonicalState.heatSinkType,
      heatSinkCount: canonicalState.heatSinkCount,
      rulesLevel: canonicalState.rulesLevel,
    });
    const importedValidity = captureMechValidity(
      imported.data.definition,
      row.path,
    );
    const canonicalValidity = captureMechValidity(canonical, row.path);
    const residual = VALIDITY_RESIDUAL[row.path];
    if (residual) {
      // Owned by a later PR: assert the exact current errors so that PR must
      // delete this entry when it lands.
      expect(canonicalValidity.isValid).toBe(true);
      expect(importedValidity.errors).toEqual(residual);
    } else {
      expect(importedValidity.isValid).toBe(canonicalValidity.isValid);
      expect(importedValidity.errors).toEqual(canonicalValidity.errors);
    }
  });
});

// The pinned loader never refuses a file over an unrecognised gyro, cockpit or
// heat sink string: it loads Standard, Standard and Single (MtfFile.java:252-269,
// :566-598). The real import route must load the unit the same way, keep the
// declared heat sink count, and return the warnings to the caller.
describe('unrecognised component strings on the real import route', () => {
  const clint = fixtures.rows.find((row) =>
    row.path.endsWith('/Clint CLNT-6S.mtf'),
  );
  if (!clint) throw new Error('Missing Clint CLNT-6S fixture');
  const original = Buffer.from(clint.base64, 'base64').toString('utf8');

  it('loads Standard, Standard and Single with a warning for each', async () => {
    const text = original
      .replace(/^cockpit:.*$/im, 'cockpit:Mystery Cockpit')
      .replace(/^heat sinks:(\d+) .*$/im, 'heat sinks:$1 Dissipators')
      .replace(/^(cockpit:.*)$/im, '$1\ngyro:Quantum Gyro');
    expect(text).toContain('gyro:Quantum Gyro');
    expect(text).toContain('heat sinks:12 Dissipators');

    const imported = await importMTFDefinition(text);
    if (!imported.success) {
      throw new Error(
        `import failed: ${imported.error.message} ${(imported.error.validationErrors ?? []).join('; ')}`,
      );
    }
    expect(imported.data.warnings).toEqual(
      expect.arrayContaining([
        'Unsupported MTF gyro "Quantum Gyro" loaded as Standard (MtfFile.java:252-259)',
        'Unsupported MTF cockpit "Mystery Cockpit" loaded as Standard (MtfFile.java:262-269)',
        'Unsupported MTF heat sink "Dissipators" loaded as Single (MtfFile.java:566-598)',
      ]),
    );
    const state = new UnitLoaderService().mapToUnitState(
      imported.data.definition as never,
      true,
    );
    expect(state.gyroType).toBe(GyroType.STANDARD);
    expect(state.cockpitType).toBe(CockpitType.STANDARD);
    expect(state.heatSinkType).toBe(HeatSinkType.SINGLE);
    expect(state.heatSinkCount).toBe(12);
  });

  it('loads a pinned Tripod Cockpit unit as a Tripod cockpit, with no warning', async () => {
    const triskelion = fixtures.rows.find((row) =>
      row.path.endsWith('/Triskelion TRK-4V.mtf'),
    );
    if (!triskelion) throw new Error('Missing Triskelion TRK-4V fixture');
    const text = Buffer.from(triskelion.base64, 'base64').toString('utf8');
    expect(text).toMatch(/^cockpit:Tripod Cockpit$/im);

    const imported = await importMTFDefinition(text);
    if (!imported.success) {
      throw new Error(
        `import failed: ${imported.error.message} ${(imported.error.validationErrors ?? []).join('; ')}`,
      );
    }
    expect(imported.data.definition.cockpit).toBe('TRIPOD');
    expect(imported.data.warnings).toEqual([]);
    expect(
      new UnitLoaderService().mapToUnitState(
        imported.data.definition as never,
        true,
      ).cockpitType,
    ).toBe(CockpitType.TRIPOD);
  });

  // Java loads Dual, Small Command and Superheavy Command as their own types
  // (Mek.java:214-230) and the contract holds all 19, so they import as such.
  it.each([
    ['Dual Cockpit', 'DUAL', CockpitType.DUAL],
    [
      'Small Command Console',
      'SMALL_COMMAND_CONSOLE',
      CockpitType.SMALL_COMMAND_CONSOLE,
    ],
  ])('imports a %s unit as %s', async (cockpit, serialized, expected) => {
    const text = original.replace(/^cockpit:.*$/im, `cockpit:${cockpit}`);
    expect(text).toContain(`cockpit:${cockpit}`);

    const imported = await importMTFDefinition(text);
    if (!imported.success) {
      throw new Error(
        `import failed: ${imported.error.message} ${(imported.error.validationErrors ?? []).join('; ')}`,
      );
    }
    expect(imported.data.definition.cockpit).toBe(serialized);
    expect(imported.data.warnings).toEqual([]);
    expect(
      new UnitLoaderService().mapToUnitState(
        imported.data.definition as never,
        true,
      ).cockpitType,
    ).toBe(expected);
  });
});
