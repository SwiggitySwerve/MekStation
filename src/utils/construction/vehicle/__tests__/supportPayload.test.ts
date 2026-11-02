import { BlkParserService } from '@/services/conversion/BlkParserService';
import { SupportVehicleUnitHandler } from '@/services/units/handlers/SupportVehicleUnitHandler';

import { computeSupportVehicleWeight } from '../supportWeight';
import sources from './supportPayload.pinned.json';

// Construction excerpts: mm-data 50f7efef, CC BY-NC-SA 4.0.
// Oracle terms: MegaMek 48fcb2f6, UL-16 construction.weightMethods.
it.each(sources)('$path matches the represented payload terms', (row) => {
  const document = new BlkParserService().parse(row.content);
  if (!document.success) throw new Error('source parse');
  const result = new SupportVehicleUnitHandler().parse(document.data.document);
  if (!result.success) throw new Error('handler parse');
  expect(computeSupportVehicleWeight(result.data.unit).unresolved).toEqual([]);
  expect(computeSupportVehicleWeight(result.data.unit)).toMatchObject(
    row.expected,
  );
});
