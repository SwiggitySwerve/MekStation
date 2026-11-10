import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import fixtures from '@/services/units/__tests__/fixtures/mixed-blk-technology.pinned.json';
import { importBLKDefinition } from '@/services/units/importBLKDefinition';
import { loadUnitDefinition } from '@/services/units/unitLoaderService/loadUnitDefinition';
import { getUnitRepository } from '@/services/units/UnitRepository';

beforeEach(() => {
  getSQLiteService({ path: ':memory:' }).initialize();
});
afterEach(() => {
  resetSQLiteService();
});

/** @spec openspec/changes/establish-all-unit-data-parity/specs/serialization-formats/spec.md */
it.each(fixtures.fixtures)(
  'retains binary import facts through SQLite and definition reopen: $path',
  async (source) => {
    const imported = await importBLKDefinition(source.blk);
    if (!imported.success)
      throw new Error(
        imported.error.validationErrors?.join('; ') ?? imported.error.message,
      );
    const definition = imported.data.definition;
    const saved = getUnitRepository().create({
      chassis: String(definition.chassis),
      variant: String(definition.model),
      data: definition,
    });
    if (!saved.success) throw new Error(saved.error.message);
    const stored = getUnitRepository().getById(saved.data.id);
    if (!stored) throw new Error('Missing SQLite record');
    expect(JSON.parse(stored.data)).toEqual(definition);
    const reopened = await loadUnitDefinition(
      { read: async () => JSON.parse(stored.data) },
      { source: 'custom', family: definition.family, id: saved.data.id },
    );
    expect(reopened).toMatchObject({
      success: true,
      definition: {
        techBase: source.techBase,
        rulesLevel: source.rulesLevel,
        blkSource: { text: source.blk },
      },
    });
  },
);
