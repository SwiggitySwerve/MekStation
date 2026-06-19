/**
 * BlkParserService — parseByUnitType dispatcher tests
 *
 * Verifies that the dispatcher returns the correct discriminated-union `kind`
 * and that key fields are extracted from each unit type's BLK fixture.
 */

import {
  getBlkParserService,
  resetBlkParserService,
} from '../BlkParserService';
import {
  VEHICLE_BLK,
  VTOL_BLK,
  AERO_BLK,
  CONV_FIGHTER_BLK,
  BATTLEARMOR_BLK,
  INFANTRY_BLK,
  PROTOMECH_BLK,
  WARSHIP_BLK,
} from './BlkParserServiceDispatch.test-helpers';

describe('BlkParserService.parseByUnitType', () => {
  let parser: ReturnType<typeof getBlkParserService>;

  beforeEach(() => {
    resetBlkParserService();
    parser = getBlkParserService();
  });

  // ------ Vehicle --------------------------------------------------------

  it('dispatches Tank BLK to kind=vehicle with correct fields', () => {
    const result = parser.parseByUnitType(VEHICLE_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('vehicle');
    if (result.result.kind !== 'vehicle') return;

    const v = result.result.data;
    expect(v.name).toBe('Manticore Heavy Tank');
    expect(v.tonnage).toBe(60);
    expect(v.cruiseMP).toBe(4);
    expect(v.motionType).toBe('Tracked');
    expect(v.techBase).toBe('INNER_SPHERE');
    expect(v.blkUnitType).toBe('Tank');
    // Armor array: Front, Right, Left, Rear, Turret
    expect(v.armor).toHaveLength(5);
    expect(v.armor[0]).toBe(42);
    // Equipment extracted
    expect(v.equipmentByLocation['Turret']).toContain('LRM 10');
  });

  it('dispatches VTOL BLK to kind=vehicle', () => {
    const result = parser.parseByUnitType(VTOL_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('vehicle');
    if (result.result.kind !== 'vehicle') return;
    expect(result.result.data.blkUnitType).toBe('VTOL');
    expect(result.result.data.name).toBe('Warrior Attack Helicopter');
  });

  // ------ Aerospace ------------------------------------------------------

  it('dispatches Aero BLK to kind=aerospace with correct fields', () => {
    const result = parser.parseByUnitType(AERO_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('aerospace');
    if (result.result.kind !== 'aerospace') return;

    const a = result.result.data;
    expect(a.name).toBe('Shilone');
    expect(a.tonnage).toBe(65);
    expect(a.safeThrust).toBe(6);
    expect(a.maxThrust).toBe(12);
    expect(a.fuelPoints).toBe(400);
    expect(a.heatsinks).toBe(20);
    // Armor [Nose, LW, RW, Aft]
    expect(a.armor).toHaveLength(4);
    expect(a.armor[0]).toBe(60);
    expect(a.equipmentByLocation['Nose']).toContain('LRM 20');
  });

  it('dispatches ConvFighter BLK to kind=aerospace', () => {
    const result = parser.parseByUnitType(CONV_FIGHTER_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('aerospace');
    if (result.result.kind !== 'aerospace') return;
    expect(result.result.data.blkUnitType).toBe('ConvFighter');
  });

  // ------ Battle Armor ---------------------------------------------------

  it('dispatches BattleArmor BLK to kind=battlearmor with correct fields', () => {
    const result = parser.parseByUnitType(BATTLEARMOR_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('battlearmor');
    if (result.result.kind !== 'battlearmor') return;

    const ba = result.result.data;
    expect(ba.name).toBe('Elemental Battle Armor');
    expect(ba.trooperCount).toBe(5);
    expect(ba.chassis).toBe('biped');
    expect(ba.motionType).toBe('Jump');
    expect(ba.jumpMP).toBe(3);
    expect(ba.armorPerTrooper).toBe(10);
    expect(ba.techBase).toBe('CLAN');
    expect(ba.equipmentByLocation['Point']).toContain('CLBAMG:RA');
  });

  // ------ Infantry -------------------------------------------------------

  it('dispatches Infantry BLK to kind=infantry with correct fields', () => {
    const result = parser.parseByUnitType(INFANTRY_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('infantry');
    if (result.result.kind !== 'infantry') return;

    const inf = result.result.data;
    expect(inf.name).toBe('Clan Heavy Foot Infantry');
    expect(inf.squadSize).toBe(5);
    expect(inf.squadCount).toBe(1);
    expect(inf.primaryWeapon).toBe('InfantryClanMauserIICIAS');
    expect(inf.motionType).toBe('Leg');
    expect(inf.techBase).toBe('CLAN');
    expect(inf.armorKit).toBe('ClanKit');
  });

  // ------ ProtoMech ------------------------------------------------------

  it('dispatches ProtoMech BLK to kind=protomech with correct fields', () => {
    const result = parser.parseByUnitType(PROTOMECH_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('protomech');
    if (result.result.kind !== 'protomech') return;

    const proto = result.result.data;
    expect(proto.name).toBe('Roc');
    expect(proto.tonnage).toBe(7);
    expect(proto.cruiseMP).toBe(5);
    expect(proto.jumpMP).toBe(5);
    // motionType is the SoT for chassis configuration at the BLK boundary;
    // a non-Glider Roc parses with motionType "Biped".
    expect(proto.motionType.toLowerCase()).not.toBe('glider');
    expect(proto.techBase).toBe('CLAN');
    // armor array: Head, Torso, L Arm, R Arm, Legs
    expect(proto.armor).toHaveLength(5);
    expect(proto.equipmentByLocation['Main Gun']).toContain(
      'CLHeavyMediumLaser',
    );
  });

  // ------ Unsupported ----------------------------------------------------

  it('returns kind=unsupported with reason=warship for Warship BLK', () => {
    const result = parser.parseByUnitType(WARSHIP_BLK);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.result.kind).toBe('unsupported');
    if (result.result.kind !== 'unsupported') return;
    expect(result.result.data.reason).toBe('warship');
    expect(result.result.data.blkUnitType).toBe('Warship');
    expect(result.result.data.name).toBe('Fredasa');
  });

  // ------ Parse failure --------------------------------------------------

  it('returns success=false when BLK content is malformed', () => {
    const result = parser.parseByUnitType('<UnitType>Tank</UnitType>');
    // Missing required Name / year / tonnage — should fail
    expect(result.success).toBe(false);
  });
});
