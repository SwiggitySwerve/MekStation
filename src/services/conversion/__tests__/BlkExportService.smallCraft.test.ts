import { getBlkExportService } from '@/services/conversion/BlkExportService';
import { BlkParserService } from '@/services/conversion/BlkParserService';
import { AerospaceSubType } from '@/types/unit/AerospaceInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import { createMockAerospaceState } from './BlkExportService.test-helpers';

describe('small craft BLK export', () => {
  it('round trips the native SmallCraft type and its explicit SI', () => {
    const unit = createMockAerospaceState({
      aerospaceSubType: AerospaceSubType.SMALL_CRAFT,
      tonnage: 200,
      safeThrust: 3,
      structuralIntegrity: 7,
    });
    const exported = getBlkExportService().export(unit);
    expect(exported.success).toBe(true);
    expect(exported.content).toContain('<UnitType>\nSmallCraft\n</UnitType>');
    const parsed = new BlkParserService().parse(exported.content ?? '');
    expect(parsed.success).toBe(true);
    expect(parsed.data?.document).toMatchObject({
      unitType: 'SmallCraft',
      mappedUnitType: UnitType.SMALL_CRAFT,
      structuralIntegrity: 7,
      tonnage: 200,
      safeThrust: 3,
    });
  });
});
