import type { IBlkDocument } from '@/types/formats/BlkFormat';

import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VTOLUnitHandler } from '../VTOLUnitHandler';
import { createMockBlkDocument } from './VTOLUnitHandler.test-helpers';

/** Refactor controls: characterize the pre-S14 public handler output. */
describe('VTOL chin configuration compatibility', () => {
  it.each(['Turret', 'Turret Equipment', 'Chin'])(
    '%s equipment installs a chin configuration',
    (location) => {
      const document = createMockBlkDocument({
        equipmentByLocation: { [location]: ['Machine Gun'] },
      });
      const result = new VTOLUnitHandler().parse(document);
      expect(result.success).toBe(true);
      expect(result.data?.unit.chinTurret).toEqual({
        type: TurretType.CHIN,
        currentWeight: 0,
        rotationArc: 180,
      });
    },
  );

  it.each(['Chin', 'CHIN', 'chin'])(
    'explicit %s installs an empty chin configuration',
    (turrettype) => {
      const result = new VTOLUnitHandler().parse(
        createMockBlkDocument({
          rawTags: { turrettype },
          equipmentByLocation: {},
        }),
      );
      expect(result.success).toBe(true);
      expect(result.data?.unit.chinTurret).toEqual({
        type: TurretType.CHIN,
        currentWeight: 0,
        rotationArc: 180,
      });
    },
  );

  it.each([undefined, 'Single', 'Dual', 'Machine'])(
    'empty explicit %s does not invent a chin',
    (turrettype) => {
      const rawTags: IBlkDocument['rawTags'] =
        turrettype === undefined ? {} : { turrettype };
      const result = new VTOLUnitHandler().parse(
        createMockBlkDocument({
          rawTags,
          equipmentByLocation: { Turret: [], Chin: [], 'Machine Bay': ['Gun'] },
        }),
      );
      expect(result.success).toBe(true);
      expect(result.data?.unit.chinTurret).toBeUndefined();
    },
  );

  it('preserves equipment installation despite an unrelated explicit type', () => {
    const result = new VTOLUnitHandler().parse(
      createMockBlkDocument({
        rawTags: { turrettype: 'Dual' },
        equipmentByLocation: { Turret: ['Gun'] },
      }),
    );
    expect(result.success).toBe(true);
    expect(result.data?.unit.chinTurret?.type).toBe(TurretType.CHIN);
  });
});
