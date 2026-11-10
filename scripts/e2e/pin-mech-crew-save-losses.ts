/** Re-pin the crew save-notice fixture through the real canonical loader. */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

import { getEquipmentLookupService } from '@/services/equipment/EquipmentLookupService';
import { getEquipmentRegistry } from '@/services/equipment/EquipmentRegistry';
import { groupCriticalSlotNoticeEntries } from '@/services/units/unitLoaderService/criticalSlotNoticeGroups';
import { parseUnit } from '@/services/units/unitLoaderService/unitContractAdapter';
import { UnitLoaderService } from '@/services/units/unitLoaderService/unitLoader';

import saveLosses from '../../e2e/fixtures/mech-crew-save-losses.json';

async function main(): Promise<void> {
  const sourceCommit = execFileSync(
    'git',
    ['-C', process.cwd(), 'rev-parse', 'HEAD'],
    { encoding: 'utf8' },
  ).trim();
  await getEquipmentRegistry().initialize();
  const lookup = getEquipmentLookupService();
  await lookup.initialize();
  if (lookup.getDataSource() !== 'json') {
    throw new Error('Refusing to pin fallback equipment');
  }

  const loader = new UnitLoaderService();
  const units = Object.fromEntries(
    Object.entries(saveLosses.units).map(([id, { sourcePath }]) => {
      const canonical: unknown = JSON.parse(readFileSync(sourcePath, 'utf8'));
      const definition = parseUnit(canonical, sourcePath);
      if (definition.id !== id) {
        throw new Error(`Catalog identity mismatch for ${id}: ${sourcePath}`);
      }
      const { unrecoveredCriticalSlots: entries } = loader.mapToUnitState(
        definition,
        true,
      );
      if (!entries) {
        throw new Error(`Loader did not provide diagnostics for ${id}`);
      }
      const noticeGroups = groupCriticalSlotNoticeEntries(
        entries,
        definition,
      ).map(({ title, kinds }) => ({
        title,
        kinds: kinds.map((kind) => ({
          title: kind.title,
          entryIndexes: kind.effects.flatMap((effect) =>
            effect.entries.map((entry) => entries.indexOf(entry)),
          ),
        })),
      }));
      return [id, { sourcePath, noticeGroups, entries }];
    }),
  );
  writeFileSync(
    'e2e/fixtures/mech-crew-save-losses.json',
    JSON.stringify(
      { sourceCommit, groupingSourceCommit: sourceCommit, units },
      null,
      2,
    ) + '\n',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(
    `${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
