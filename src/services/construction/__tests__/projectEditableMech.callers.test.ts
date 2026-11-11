/**
 * Pins every product caller of `projectEditableMech` and every hand-built
 * `PreviewUnitState`, so the optional `frankenStructure` field cannot be
 * silently dropped by a new read point.
 *
 * `IEditableMechProjectionInput.frankenStructure` stays optional because the
 * stores' `UnitState` declares it optional (a required-but-nullable input would
 * not accept a `UnitState`). The compiler therefore cannot find an omission;
 * this test does. A new caller or builder fails here until it is reviewed and
 * added below with how it supplies the donor tonnage.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = join(process.cwd(), 'src');

function productFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      productFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const files = productFiles(SRC).map((file) => ({
  path: relative(process.cwd(), file).replace(/\\/g, '/'),
  text: readFileSync(file, 'utf8'),
}));

const sources = (pattern: RegExp, exclude: string[] = []) =>
  files
    .filter((file) => !exclude.includes(file.path) && pattern.test(file.text))
    .map((file) => file.path)
    .sort();

describe('projectEditableMech callers', () => {
  it('lists the reviewed call sites', () => {
    expect(
      sources(
        /\bprojectEditableMech\(/,
        // The definition itself.
        ['src/services/construction/editableMechProjection.ts'],
      ),
    ).toEqual([
      // Hand-built literal: passes frankenStructure.
      'src/components/customizer/UnitEditorWithRoutingStats.ts',
      // Via PreviewUnitState (see builders below).
      'src/components/customizer/tabs/PreviewTab.builders.ts',
      // Full UnitState: carries frankenStructure.
      'src/services/units/quickGameSavedDesigns.ts',
      // Full UnitState: carries frankenStructure (critical slots only).
      'src/utils/serialization/CustomUnitSerializer.ts',
    ]);
  });

  it('passes frankenStructure at the status-bar literal', () => {
    const file = files.find(
      (f) =>
        f.path === 'src/components/customizer/UnitEditorWithRoutingStats.ts',
    );
    const literal =
      /projectEditableMech\(\s*\{([\s\S]*?)\},\s*calculations\.walkMP/.exec(
        file?.text ?? '',
      );
    expect(literal?.[1]).toMatch(/\bfrankenStructure,/);
    // And it re-projects when the donor map changes.
    expect(file?.text).toMatch(
      /internalStructureType,\s*frankenStructure,\s*gyroType,\s*cockpitType,\s*armorType,\s*armorAllocation,\s*heatSinkType,\s*heatSinkCount,\s*equipment,\s*calculations\.walkMP,\s*\]/,
    );
  });

  it('lists every hand-built PreviewUnitState and each passes frankenStructure', () => {
    const builders = sources(/useMemo<PreviewUnitState>\(/);
    expect(builders).toEqual([
      'src/components/customizer/preview/RecordSheetPreview.tsx',
      'src/components/customizer/tabs/PreviewTab.tsx',
    ]);
    for (const path of builders) {
      const text = files.find((f) => f.path === path)?.text ?? '';
      const literal =
        /useMemo<PreviewUnitState>\(\s*\(\)\s*=>\s*\(\{([\s\S]*?)\}\),\s*\[([\s\S]*?)\],?\s*\)/.exec(
          text,
        );
      expect(`${path}: ${literal?.[1]}`).toMatch(/\bfrankenStructure,/);
      expect(`${path}: ${literal?.[2]}`).toMatch(/\bfrankenStructure,/);
    }
  });
});
