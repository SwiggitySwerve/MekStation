import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VehicleUnitHandler } from '../VehicleUnitHandler';
import { VTOLUnitHandler } from '../VTOLUnitHandler';

const doc = (unitType: 'Tank' | 'VTOL'): IBlkDocument => ({
  blockVersion: 1,
  version: 'MAM0',
  unitType,
  mappedUnitType: unitType === 'Tank' ? UnitType.VEHICLE : UnitType.VTOL,
  name: 'Weight availability',
  model: '',
  year: 3050,
  type: 'IS Level 2',
  tonnage: 20,
  cruiseMP: 4,
  motionType: unitType === 'Tank' ? 'Tracked' : 'VTOL',
  armor: unitType === 'Tank' ? [1, 2, 3, 4, 5] : [1, 2, 3, 4, 2, 5],
  equipmentByLocation: { Turret: ['Unresolved source mount'] },
  rawTags: {},
});

describe('combat handler total availability', () => {
  it('keeps Tank parsing independent while rejecting an incomplete total', () => {
    const handler = new VehicleUnitHandler();
    const loaded = handler.parse(doc('Tank'));
    expect(loaded.success).toBe(true);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    expect(() => handler.calculateWeight(loaded.data.unit)).toThrow(
      /weight.*incomplete.*resolved equipment/i,
    );
    const empty = handler.parse({ ...doc('Tank'), equipmentByLocation: {} });
    if (!empty.success) throw new Error(JSON.stringify(empty.error));
    expect(() => handler.calculateWeight(empty.data.unit)).toThrow(
      /weight.*incomplete/i,
    );
    expect(() =>
      handler.calculateWeight({
        ...loaded.data.unit,
        turret: {
          type: TurretType.SINGLE,
          rotationArc: 360,
          currentWeight: 7,
        },
      }),
    ).toThrow(/weight.*incomplete/i);
  });

  it('keeps VTOL parsing independent while rejecting an incomplete total', () => {
    const handler = new VTOLUnitHandler();
    const loaded = handler.parse(doc('VTOL'));
    expect(loaded.success).toBe(true);
    if (!loaded.success) throw new Error(JSON.stringify(loaded.error));
    expect(() => handler.calculateWeight(loaded.data.unit)).toThrow(
      /weight.*incomplete.*resolved equipment/i,
    );
  });
});
