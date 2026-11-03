import { createHash } from 'crypto';
import fs from 'fs';

import {
  catalog,
  families,
  initializeEquipment,
  verifyCatalogUnit,
} from './catalogRecordSheets.helpers';

jest.setTimeout(300000);
beforeAll(initializeEquipment);

describe('committed catalog record-sheet model parity', () => {
  for (const family of families) {
    it(`${family}: checks every indexed unit and records every mismatch/rejection`, () => {
      const rows = catalog(family).map((entry) =>
        verifyCatalogUnit(family, entry),
      );
      const counts: Record<string, number> = {};
      for (const row of rows)
        for (const field of new Set(
          row.differences.map((d) => d.field.replace(/\.\d+$/, '')),
        ))
          counts[field] = (counts[field] ?? 0) + 1;
      const summary = {
        total: rows.length,
        rejected: rows.filter((r) => r.rejection).length,
        counts,
      };
      // New Java-value assertions must not become accepted snapshot rejections.
      expect(summary.rejected).toBe(0);
      if (process.env.RECORD_SHEET_AUDIT)
        fs.writeFileSync(
          `${process.env.RECORD_SHEET_AUDIT}/${family}.json`,
          JSON.stringify({ summary, rows }, null, 2),
        );
      expect(rows.length).toBeGreaterThan(0);
      // These repaired classes are a strict gate; remaining gaps are explicitly
      // counted below instead of silently skipping rejected or mismatched units.
      if (family === 'vehicles' || family === 'aerospace') {
        expect(
          rows
            .flatMap((r) =>
              r.differences
                .filter(
                  (d) =>
                    d.field === 'BV' ||
                    d.field === 'motion' ||
                    d.field === 'weightClass' ||
                    d.field === 'binding.inventory' ||
                    (family === 'vehicles' && d.field.startsWith('armor.')) ||
                    d.field.startsWith('weaponStats') ||
                    d.field.startsWith('weaponAliasStats') ||
                    (d.field === 'template' && r.subtype !== 'SmallCraft'),
                )
                .map((d) => ({ id: r.id, ...d })),
            )
            .slice(0, 10),
        ).toEqual([]);
      }
      if (family === 'vehicles')
        expect(
          rows.filter((r) => r.stage === 'template' && r.rejection),
        ).toEqual([]);
      const residual = rows.filter((r) => r.rejection || r.differences.length);
      const digest = createHash('sha256')
        .update(JSON.stringify(residual))
        .digest('hex');
      expect({ ...summary, residualDigest: digest }).toMatchSnapshot();
    });
  }
});
