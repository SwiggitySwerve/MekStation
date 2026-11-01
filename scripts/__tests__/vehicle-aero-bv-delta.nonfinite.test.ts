import * as fs from 'fs';
import * as path from 'path';

import {
  buildDeltaReport,
  type IConvertedRow,
  type IJavaReferenceRow,
} from '../vehicle-aero-bv-delta';

// A NaN total must not count as a compared number: it would fall into neither
// percentage bucket and drop out of the summary silently (#2443 review).
jest.mock('../../src/utils/construction/battleValueCalculations', () => ({
  calculateBattleValueForUnit: () => ({
    kind: 'vehicle',
    breakdown: { final: NaN, defensive: 0, offensive: 0 },
  }),
}));

const fixture = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, 'fixtures', 'vehicle_aero_contract_bv.json'),
    'utf-8',
  ),
) as { units: IConvertedRow[]; reference: IJavaReferenceRow[] };

describe('a non-finite BV total', () => {
  it('is reported as undefined, never as a compared number', () => {
    const report = buildDeltaReport([fixture.units[0]], fixture.reference);
    expect(report.rows[0]).toMatchObject({
      status: 'undefined',
      ourTotal: null,
    });
    expect(report.total).toMatchObject({ numeric: 0, undefinedResults: 1 });
  });
});
