import fixture from '../../../../../scripts/__tests__/fixtures/vehicle_aero_contract_bv.json';
import { calculateBattleValueForUnit } from '../../battleValueCalculations';
import {
  contractUnitToBVUnit,
  type IContractBVSource,
} from '../../contractBVUnitAdapter';
import { calculateVehicleDefensiveBV } from '../vehicleBV';
import { toVehicleBVInput } from '../vehicleBVAdapter';
import { getVehicleDefensiveTypeModifier } from '../vehicleBVTypeModifier';
import { baseInput } from './vehicleBV.test.helpers';

/** @spec establish-all-unit-data-parity/battle-value-system */
describe('Pinned MegaMek vehicle defensive type modifier', () => {
  it('applies Tamerlane (Flamer) hover type modifier to the defensive pool', () => {
    const result = calculateBattleValueForUnit(
      contractUnitToBVUnit(fixture.units[0].unit as IContractBVSource),
    );
    if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
    // Java defense is (120 + 15) * 0.7 * 1.5 = 141.75. The existing TS
    // structure remains unchanged by the type and TMM corrections.
    expect(result.breakdown.armorBV).toBe(120);
    expect(result.breakdown.structureBV).toBe(36);
    expect(result.breakdown.defensiveFactor).toBe(1.5);
    expect(result.breakdown.defensive).toBeCloseTo(163.8, 8);
    expect(result.breakdown.offensive).toBeCloseTo(293.76, 8);
  });

  it.each([
    [GroundMotionType.TRACKED, 0.9],
    [GroundMotionType.WHEELED, 0.8],
    [GroundMotionType.HOVER, 0.7],
    [GroundMotionType.VTOL, 0.7],
    [GroundMotionType.WIGE, 0.7],
    [GroundMotionType.NAVAL, 0.6],
    [GroundMotionType.SUBMARINE, 0.6],
    [GroundMotionType.HYDROFOIL, 0.6],
    [GroundMotionType.RAIL, 0.6],
    [GroundMotionType.MAGLEV, 0.6],
  ])(
    'scales the entire %s defensive pool by %s before TMM',
    (motionType, modifier) => {
      const def = calculateVehicleDefensiveBV(
        baseInput({
          motionType,
          flankMP: 0,
          totalArmorPoints: 100,
          totalStructurePoints: 20,
          defensiveEquipment: [
            { id: 'shield', location: 'body', bvOverride: 10 },
          ],
          explosivePenalty: 5,
        }),
      );
      expect(def.total).toBeCloseTo(
        (250 + 30 + 10 - 5) * modifier * def.defensiveFactor,
        8,
      );
    },
  );

  it.each([
    ['ISFullyAmphibiousChassis', 0.2],
    ['ClanFullyAmphibious', 0.2],
    ['Combat Vehicle Chassis Mod [Fully Amphibious]', 0.2],
    ['islimitedamphibiouschassis', 0.1],
    ['ISCVDuneBuggy', 0.1],
    ['ClanFlotationHull', 0.1],
    ['environmental-sealed-chassis', 0.1],
    ['environmental-sealing', 0.1],
    ['EnvironmentalSealingChassisMod', 0.1],
    ['Vacuum Protection', 0.1],
    ['isarmoredmotivesystem', 0.1],
    ['clarmoredmotivesystem', 0.1],
    ['amphibiouschassis', 0],
    ['unknown-fully-amphibious', 0],
  ])('recognizes only the applicable mounted flag for %s', (id, bonus) => {
    expect(
      getVehicleDefensiveTypeModifier(baseInput({ chassisEquipment: [id] })),
    ).toBeCloseTo(0.9 + bonus, 8);
    expect(
      getVehicleDefensiveTypeModifier(
        baseInput({
          chassisEquipment: [id],
          isSupportVehicle: true,
        }),
      ),
    ).toBe(0.9);
  });

  it('counts each mounted modification without clamping the modifier to one', () => {
    expect(
      getVehicleDefensiveTypeModifier(
        baseInput({
          chassisEquipment: [
            'ISFullyAmphibiousChassis',
            'ISLimitedAmphibious',
            'CLArmoredMotiveSystem',
          ],
        }),
      ),
    ).toBeCloseTo(1.3, 8);
  });

  it('transports zero-BV equipment and support identity through the contract path', () => {
    const source = fixture.units[0].unit as IContractBVSource;
    const defense = (
      unitType: string,
      equipment: IContractBVSource['equipment'],
    ) => {
      const result = calculateBattleValueForUnit(
        contractUnitToBVUnit({
          ...source,
          unitType,
          equipment,
        }),
      );
      if (result?.kind !== 'vehicle') throw new Error('Expected vehicle BV');
      return result.breakdown.defensive;
    };
    const modification = [{ id: 'ISFullyAmphibiousChassis', location: 'BODY' }];
    expect(
      defense(UnitType.VEHICLE, modification) / defense(UnitType.VEHICLE, []),
    ).toBeCloseTo(0.9 / 0.7, 8);
    expect(defense(UnitType.SUPPORT_VEHICLE, modification)).toBe(
      defense(UnitType.SUPPORT_VEHICLE, []),
    );
  });

  it('transports store flags without counting their equipment mount twice', () => {
    const state = {
      motionType: GroundMotionType.TRACKED,
      unitType: UnitType.VEHICLE,
      tonnage: 30,
      cruiseMP: 4,
      armorType: 'standard',
      armorAllocation: {},
      structureType: 'standard',
      turret: null,
      secondaryTurret: null,
      barRating: null,
      equipment: [],
      hasEnvironmentalSealing: true,
      hasFlotationHull: true,
    };
    const input = toVehicleBVInput(state);
    expect(getVehicleDefensiveTypeModifier(input)).toBeCloseTo(1.1, 8);
    expect(
      getVehicleDefensiveTypeModifier({
        ...input,
        chassisEquipment: ['Environmental Sealed Chassis', 'ISFlotationHull'],
      }),
    ).toBeCloseTo(1.1, 8);
    expect(
      getVehicleDefensiveTypeModifier(
        toVehicleBVInput({
          ...state,
          unitType: UnitType.SUPPORT_VEHICLE,
        }),
      ),
    ).toBe(0.9);
  });
});
import { GroundMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
