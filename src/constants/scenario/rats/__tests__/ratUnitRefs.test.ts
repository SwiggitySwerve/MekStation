import fs from 'node:fs';
import path from 'node:path';

import {
  CW_CLAN_INVASION_RAT,
  FS_CLAN_INVASION_RAT,
} from '../clanInvasionRats';
import { PIRATES_GENERIC_RAT } from '../piratesRat';
import {
  DC_SUCCESSION_WARS_RAT,
  LC_SUCCESSION_WARS_RAT,
} from '../successionWarsRats';

interface UnitIndex {
  readonly units: readonly {
    readonly id: string;
  }[];
}

describe('scenario RAT unit references', () => {
  it('points every generated unit at a canonical catalog entry', () => {
    const indexPath = path.resolve(
      process.cwd(),
      'public/data/units/battlemechs/index.json',
    );
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as UnitIndex;
    const catalogIds = new Set(index.units.map((unit) => unit.id));
    const entries = [
      ...CW_CLAN_INVASION_RAT.entries,
      ...FS_CLAN_INVASION_RAT.entries,
      ...PIRATES_GENERIC_RAT.entries,
      ...LC_SUCCESSION_WARS_RAT.entries,
      ...DC_SUCCESSION_WARS_RAT.entries,
    ];

    expect(entries).not.toHaveLength(0);
    for (const entry of entries) {
      expect({
        designation: entry.designation,
        sourceUnitId: entry.sourceUnitId,
        resolves: catalogIds.has(entry.sourceUnitId),
      }).toEqual({
        designation: entry.designation,
        sourceUnitId: entry.sourceUnitId,
        resolves: true,
      });
    }
  });
});
