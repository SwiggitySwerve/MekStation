import type { IBlkDocument } from '@/types/formats/BlkFormat';

import { VehicleLocation } from '@/types/construction/UnitLocation';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { TurretType } from '@/types/unit/VehicleInterfaces';

import { VehicleUnitHandler } from '../VehicleUnitHandler';
import { VTOLUnitHandler } from '../VTOLUnitHandler';
import { createMockBlkDocument } from './VTOLUnitHandler.test-helpers';

const ground = (overrides: Partial<IBlkDocument> = {}) =>
  createMockBlkDocument({
    unitType: 'Tank',
    mappedUnitType: UnitType.VEHICLE,
    motionType: 'Tracked',
    tonnage: 50,
    cruiseMP: 4,
    armor: [0, 0, 0, 0],
    equipmentByLocation: {},
    ...overrides,
  });
const air = (overrides: Partial<IBlkDocument> = {}) =>
  createMockBlkDocument({
    equipmentByLocation: {},
    armor: [0, 0, 0, 0, 0],
    ...overrides,
  });

describe('installed combat turret source facts', () => {
  it('keeps separate empty zero-armored primary and secondary turrets', () => {
    const result = new VehicleUnitHandler().parse(
      ground({ armor: [0, 0, 0, 0, 0, 0] }),
    );
    expect(result.success).toBe(true);
    const unit = result.data!.unit;
    expect(unit.turret).toEqual({
      type: TurretType.DUAL,
      currentWeight: 0,
      rotationArc: 360,
    });
    expect(unit.secondaryTurret).toEqual({
      type: TurretType.SINGLE,
      currentWeight: 0,
      rotationArc: 360,
    });
    expect(unit.secondaryTurret).not.toBe(unit.turret);
    expect(unit.structureLocations).toContain(VehicleLocation.TURRET_2);
  });

  it('keeps a zero-armored single primary without inventing a secondary', () => {
    const unit = new VehicleUnitHandler().parse(
      ground({ armor: [0, 0, 0, 0, 0] }),
    ).data!.unit;
    expect(unit.turret?.type).toBe(TurretType.SINGLE);
    expect(unit.secondaryTurret).toBeUndefined();
  });

  it('does not invent a secondary from an explicit dual label or rejected armor layout', () => {
    for (const armor of [
      [0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ]) {
      const unit = new VehicleUnitHandler().parse(
        ground({ armor, rawTags: { turrettype: 'Dual' } }),
      ).data!.unit;
      expect(unit.turret?.type).toBe(TurretType.DUAL);
      expect(unit.secondaryTurret).toBeUndefined();
    }
  });

  it('uses the accepted superheavy layout and preserves independent rear-facing flags', () => {
    const unit = new VehicleUnitHandler().parse(
      ground({
        tonnage: 150,
        armor: [1, 2, 3, 4, 5, 6, 0, 0],
        equipmentByLocation: {
          'Rear Turret': ['Laser'],
          'Front Turret': ['(R) Laser'],
          Rear: ['Gun'],
        },
      }),
    ).data!.unit;
    expect(unit.secondaryTurret?.type).toBe(TurretType.SINGLE);
    expect(
      unit.equipment.map((item) => [item.location, item.isRearMounted]),
    ).toEqual([
      [VehicleLocation.TURRET, false],
      [VehicleLocation.TURRET_2, true],
      [VehicleLocation.REAR, true],
    ]);
  });

  it('preserves an installed empty six-slot chin independently of armor amount', () => {
    for (const chinArmor of [0, 1]) {
      const unit = new VTOLUnitHandler().parse(
        air({ armor: [0, 0, 0, 0, 0, chinArmor] }),
      ).data!.unit;
      expect(unit.chinTurret).toEqual({
        type: TurretType.CHIN,
        currentWeight: 0,
        rotationArc: 180,
      });
    }
  });

  it('keeps a five-slot or rejected empty VTOL without a chin', () => {
    for (const armor of [
      [0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
    ]) {
      const unit = new VTOLUnitHandler().parse(air({ armor })).data!.unit;
      expect(unit.chinTurret).toBeUndefined();
    }
  });

  describe.each([
    ['ground', new VehicleUnitHandler(), ground],
    ['VTOL', new VTOLUnitHandler(), air],
  ] as const)('%s allowance projection', (_name, handler, document) => {
    it.each([-1, 0, 0.25])(
      'carries primary %s and Omni tag presence without installing a turret',
      (allowance) => {
        const doc = document({
          rawTags: {
            OMNI: 'false',
            BaseChassisTurretWeight: String(allowance),
            baseChassisTurret2Weight: '-2',
          },
        });
        const before = JSON.stringify(doc);
        const result = handler.parse(doc);
        expect(result.success).toBe(true);
        expect(result.data!.unit.isOmni).toBe(true);
        expect(result.data!.unit.baseChassisTurretWeight).toBe(allowance);
        const unit = result.data!.unit;
        if (unit.unitType === UnitType.VEHICLE) {
          expect(unit.baseChassisSecondaryTurretWeight).toBe(-2);
          expect(unit.turret).toBeUndefined();
          expect(unit.secondaryTurret).toBeUndefined();
        } else {
          expect(unit.baseChassisSecondaryTurretWeight).toBeUndefined();
          expect(unit.chinTurret).toBeUndefined();
          expect(result.data!.warnings.join(' ')).toContain(
            'ignores baseChassisTurret2Weight',
          );
        }
        expect(JSON.stringify(doc)).toBe(before);
      },
    );

    it('keeps omitted allowances absent and the ordinary identity false', () => {
      const unit = handler.parse(document()).data!.unit;
      expect(unit.isOmni).toBe(false);
      expect(unit.baseChassisTurretWeight).toBeUndefined();
      expect(unit.baseChassisSecondaryTurretWeight).toBeUndefined();
    });

    it('uses the mapped combat family for raw allowance projection', () => {
      const result = handler.parse(
        document({
          unitType: 'legacy alias',
          rawTags: { omni: '', baseChassisTurretWeight: '0' },
        }),
      );
      expect(result.success).toBe(true);
      expect(result.data!.unit.baseChassisTurretWeight).toBe(0);
      expect(result.data!.unit.isOmni).toBe(true);
    });

    it.each(['NaN', '1t', 'Infinity'])(
      'reports invalid primary %s instead of guessing a total',
      (value) => {
        const doc = document({ rawTags: { baseChassisTurretWeight: value } });
        const before = JSON.stringify(doc);
        const result = handler.parse(doc);
        expect(result.success).toBe(false);
        expect(result.error!.errors.join(' ')).toContain(
          'Invalid baseChassisTurretWeight',
        );
        expect(JSON.stringify(doc)).toBe(before);
      },
    );

    it('retains the incomplete combat total rejection after carrying source facts', () => {
      const unit = handler.parse(
        document({ rawTags: { omni: '', baseChassisTurretWeight: '0' } }),
      ).data!.unit;
      // Each handler receives its own discriminated unit from the matching factory.
      if (unit.unitType === UnitType.VEHICLE)
        expect(() => new VehicleUnitHandler().calculateWeight(unit)).toThrow(
          /incomplete|unavailable/i,
        );
      else
        expect(() => new VTOLUnitHandler().calculateWeight(unit)).toThrow(
          /incomplete|unavailable/i,
        );
    });
  });

  it('reports malformed ground secondary but preserves the VTOL ignored-tag warning', () => {
    const rawTags = { baseChassisTurret2Weight: 'bad' };
    const result = new VehicleUnitHandler().parse(ground({ rawTags }));
    expect(result.success).toBe(false);
    expect(result.error!.errors.join(' ')).toContain(
      'Invalid baseChassisTurret2Weight',
    );
    const vtol = new VTOLUnitHandler().parse(air({ rawTags }));
    expect(vtol.success).toBe(true);
    expect(vtol.data!.warnings.join(' ')).toContain(
      'ignores baseChassisTurret2Weight',
    );
  });

  it('preserves the VTOL numeric source error and its early return', () => {
    const result = new VTOLUnitHandler().parse(
      air({
        cruiseMP: 4,
        rawTags: { cruiseMP: 'bad', baseChassisTurretWeight: 'bad' },
      }),
    );
    expect(result.success).toBe(false);
    expect(result.error!.errors.join(' ')).toContain('cruiseMP');
    expect(result.error!.errors.join(' ')).not.toContain(
      'baseChassisTurretWeight',
    );
  });
});
