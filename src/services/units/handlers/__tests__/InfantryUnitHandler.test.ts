/**
 * InfantryUnitHandler Tests
 *
 * Comprehensive tests for Infantry BLK parsing, validation, calculations, and serialization
 */

import { InfantryUnitHandler, createInfantryHandler } from '../InfantryUnitHandler';
import { IBlkDocument } from '../../../../types/formats/BlkFormat';
import { UnitType } from '../../../../types/unit/BattleMechInterfaces';
import { SquadMotionType } from '../../../../types/unit/BaseUnitInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '../../../../types/unit/PersonnelInterfaces';

// ============================================================================
// Test Fixtures
// ============================================================================

function createMockBlkDocument(overrides: Partial<IBlkDocument> = {}): IBlkDocument {
  return {
    blockVersion: 1,
    version: 'MAM0',
    unitType: 'Infantry',
    mappedUnitType: UnitType.INFANTRY,
    name: 'Foot Rifle Platoon',
    model: 'Standard',
    year: 2750,
    type: 'IS Level 1',
    tonnage: 0.1,
    motionType: 'Foot',
    squadSize: 7,
    squadn: 4,
    primary: 'Rifle',
    cruiseMP: 1,
    armor: [0],
    equipmentByLocation: {},
    rawTags: {},
    ...overrides,
  };
}

function createJumpInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Jump Rifle Platoon',
    motionType: 'Jump',
    cruiseMP: 1,
    jumpingMP: 3,
    armorKit: 'Flak',
    armor: [1],
  });
}

function createMechanizedInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Mechanized Rifle Platoon',
    motionType: 'Mechanized',
    cruiseMP: 3,
    squadSize: 6,
    squadn: 3,
    primary: 'Auto-Rifle',
    armorKit: 'Standard',
    armor: [1],
  });
}

function createFieldGunInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Foot Field Gun Platoon',
    motionType: 'Foot',
    squadSize: 8,
    squadn: 2,
    primary: 'Rifle',
    equipmentByLocation: {
      'Platoon': ['Light Field Gun', 'Medium Field Gun'],
    },
  });
}

function createAntiMechInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Anti-Mech Infantry',
    motionType: 'Foot',
    squadSize: 7,
    squadn: 4,
    primary: 'SRM',
    rawTags: {
      antimech: 'true',
      specialization: 'anti-mech',
    },
  });
}

function createAugmentedInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Augmented Infantry',
    motionType: 'Foot',
    squadSize: 5,
    squadn: 4,
    rawTags: {
      augmented: 'true',
      augmentationtype: 'DEST',
    },
  });
}

function createClanInfantryDocument(): IBlkDocument {
  return createMockBlkDocument({
    name: 'Clan Elemental Infantry',
    type: 'Clan Level 2',
    motionType: 'Jump',
    jumpingMP: 2,
    armorKit: 'Clan',
    armor: [2],
  });
}

// ============================================================================
// Tests
// ============================================================================

describe('InfantryUnitHandler', () => {
  let handler: InfantryUnitHandler;

  beforeEach(() => {
    handler = createInfantryHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================
  describe('handler properties', () => {
    it('should have correct unit type', () => {
      expect(handler.unitType).toBe(UnitType.INFANTRY);
    });

    it('should have correct display name', () => {
      expect(handler.displayName).toBe('Infantry');
    });
  });

  describe('getLocations', () => {
    it('should return Platoon as the only location', () => {
      const locations = handler.getLocations();
      expect(locations).toEqual(['Platoon']);
    });

    it('should return a readonly array', () => {
      const locations = handler.getLocations();
      expect(Array.isArray(locations)).toBe(true);
      expect(locations.length).toBe(1);
    });
  });

  // ==========================================================================
  // canHandle
  // ==========================================================================
  describe('canHandle', () => {
    it('should handle Infantry unit type', () => {
      const doc = createMockBlkDocument();
      expect(handler.canHandle(doc)).toBe(true);
    });

    it('should not handle BattleArmor unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'BattleArmor',
        mappedUnitType: UnitType.BATTLE_ARMOR,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Vehicle unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Tank',
        mappedUnitType: UnitType.VEHICLE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });

    it('should not handle Aerospace unit type', () => {
      const doc = createMockBlkDocument({
        unitType: 'Aero',
        mappedUnitType: UnitType.AEROSPACE,
      });
      expect(handler.canHandle(doc)).toBe(false);
    });
  });

  // ==========================================================================
  // Parsing
  // ==========================================================================
  describe('parse', () => {
    describe('basic parsing', () => {
      it('should parse foot rifle platoon successfully', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit).toBeDefined();
        expect(result.unit?.unitType).toBe(UnitType.INFANTRY);
        expect(result.unit?.metadata.chassis).toBe('Foot Rifle Platoon');
      });

      it('should parse name and model correctly', () => {
        const doc = createMockBlkDocument({ name: 'Test Platoon', model: 'Mark II' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.metadata.chassis).toBe('Test Platoon');
        expect(result.unit?.metadata.model).toBe('Mark II');
      });

      it('should parse year correctly', () => {
        const doc = createMockBlkDocument({ year: 3050 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.metadata.year).toBe(3050);
      });
    });

    describe('squad configuration', () => {
      it('should parse squad size', () => {
        const doc = createMockBlkDocument({ squadSize: 7 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.squadSize).toBe(7);
      });

      it('should parse number of squads', () => {
        const doc = createMockBlkDocument({ squadn: 4 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.numberOfSquads).toBe(4);
      });

      it('should calculate platoon strength correctly', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.platoonStrength).toBe(28);
      });

      it('should use default squad size if not specified', () => {
        // Create document without squadSize by spreading without that field
        const { squadSize: _unused, ...docWithoutSquadSize } = createMockBlkDocument();
        const doc = docWithoutSquadSize as IBlkDocument;
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.squadSize).toBe(7); // Default
      });

      it('should use default number of squads if not specified', () => {
        // Create document without squadn by spreading without that field
        const { squadn: _unused, ...docWithoutSquadn } = createMockBlkDocument();
        const doc = docWithoutSquadn as IBlkDocument;
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.numberOfSquads).toBe(4); // Default
      });
    });

    describe('motion type mapping', () => {
      it('should parse foot motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Foot' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.FOOT);
      });

      it('should parse leg motion type as foot', () => {
        const doc = createMockBlkDocument({ motionType: 'Leg' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.FOOT);
      });

      it('should parse jump motion type', () => {
        const doc = createJumpInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.JUMP);
      });

      it('should parse motorized motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Motorized' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.MOTORIZED);
      });

      it('should parse mechanized motion type', () => {
        const doc = createMechanizedInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.MECHANIZED);
      });

      it('should parse wheeled motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Wheeled' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.WHEELED);
      });

      it('should parse tracked motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Tracked' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.TRACKED);
      });

      it('should parse hover motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Hover' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.HOVER);
      });

      it('should parse vtol motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'VTOL' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.VTOL);
      });

      it('should parse beast motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Beast' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.BEAST);
      });

      it('should default to foot for unknown motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'UnknownType' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.motionType).toBe(SquadMotionType.FOOT);
      });
    });

    describe('movement parsing', () => {
      it('should parse ground MP', () => {
        const doc = createMockBlkDocument({ cruiseMP: 2 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.movement.groundMP).toBe(2);
      });

      it('should parse jump MP', () => {
        const doc = createJumpInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.movement.jumpMP).toBe(3);
      });

      it('should default jump MP to 0 if not specified', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.movement.jumpMP).toBe(0);
      });

      it('should set UMU MP to 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.movement.umuMP).toBe(0);
      });
    });

    describe('weapons parsing', () => {
      it('should parse primary weapon', () => {
        const doc = createMockBlkDocument({ primary: 'Rifle' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.primaryWeapon).toBe('Rifle');
      });

      it('should default primary weapon to Rifle', () => {
        // Create document without primary by spreading without that field
        const { primary: _unused, ...docWithoutPrimary } = createMockBlkDocument();
        const doc = docWithoutPrimary as IBlkDocument;
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.primaryWeapon).toBe('Rifle');
      });

      it('should parse secondary weapon', () => {
        const doc = createMockBlkDocument({
          primary: 'Rifle',
          secondary: 'SRM',
          secondn: 2,
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.secondaryWeapon).toBe('SRM');
      });

      it('should parse secondary weapon count', () => {
        const doc = createMockBlkDocument({
          primary: 'Rifle',
          secondary: 'SRM',
          secondn: 3,
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.secondaryWeaponCount).toBe(3);
      });

      it('should default secondary weapon count to 0', () => {
        const doc = createMockBlkDocument({ primary: 'Rifle' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.secondaryWeaponCount).toBe(0);
      });
    });

    describe('armor kit mapping', () => {
      it('should parse none armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'None' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.NONE);
      });

      it('should parse standard armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'Standard' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.STANDARD);
      });

      it('should parse flak armor kit', () => {
        const doc = createJumpInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.FLAK);
      });

      it('should parse ablative armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'Ablative' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.ABLATIVE);
      });

      it('should parse clan armor kit', () => {
        const doc = createClanInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.CLAN);
      });

      it('should parse environmental armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'Environmental' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.ENVIRONMENTAL);
      });

      it('should default to none for unknown armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'UnknownArmor' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.NONE);
      });

      it('should handle case-insensitive armor kit names', () => {
        const doc = createMockBlkDocument({ armorKit: 'FLAK' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.armorKit).toBe(InfantryArmorKit.FLAK);
      });
    });

    describe('specialization parsing', () => {
      it('should parse anti-mech specialization', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.ANTI_MECH);
      });

      it('should parse antimech variant specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'antimech' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.ANTI_MECH);
      });

      it('should parse paratrooper specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'paratrooper' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.PARATROOPER);
      });

      it('should parse mountain specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'mountain' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.MOUNTAIN);
      });

      it('should parse marine specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'marine' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.MARINE);
      });

      it('should parse xct specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'xct' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.XCT);
      });

      it('should parse tag specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'tag' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.TAG);
      });

      it('should parse engineer specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'engineer' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.ENGINEER);
      });

      it('should default to none for no specialization', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.specialization).toBe(InfantrySpecialization.NONE);
      });
    });

    describe('field gun parsing', () => {
      it('should parse field guns from equipment', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.fieldGuns.length).toBe(2);
      });

      it('should set field gun name from equipment', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.fieldGuns[0].name).toBe('Light Field Gun');
        expect(result.unit?.fieldGuns[1].name).toBe('Medium Field Gun');
      });

      it('should set default crew size of 2', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.fieldGuns[0].crew).toBe(2);
      });

      it('should return empty array when no field guns', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.fieldGuns).toEqual([]);
      });
    });

    describe('anti-mech training and augmentation flags', () => {
      it('should parse anti-mech training flag', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.hasAntiMechTraining).toBe(true);
      });

      it('should set canSwarm based on anti-mech training', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.canSwarm).toBe(true);
      });

      it('should set canLegAttack based on anti-mech training', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.canLegAttack).toBe(true);
      });

      it('should parse augmented flag', () => {
        const doc = createAugmentedInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.isAugmented).toBe(true);
      });

      it('should parse augmentation type', () => {
        const doc = createAugmentedInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.augmentationType).toBe('DEST');
      });

      it('should default anti-mech training to false', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.unit?.hasAntiMechTraining).toBe(false);
        expect(result.unit?.canSwarm).toBe(false);
        expect(result.unit?.canLegAttack).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Validation
  // ==========================================================================
  describe('validate', () => {
    it('should pass validation for valid infantry', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);
      expect(result.success).toBe(true);

      const validation = handler.validate(result.unit!);
      expect(validation.isValid).toBe(true);
    });

    describe('squad size validation', () => {
      it('should default squad size of 0 to 7 during parsing (falsy value)', () => {
        // When squadSize is 0 (falsy), parser defaults it to 7
        const doc = createMockBlkDocument({ squadSize: 0 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);
        expect(result.unit?.squadSize).toBe(7); // Defaulted from falsy 0
      });

      it('should fail validation for squad size greater than 10', () => {
        const doc = createMockBlkDocument({ squadSize: 15 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.includes('squad size'))).toBe(true);
      });

      it('should pass validation for squad size of 1', () => {
        const doc = createMockBlkDocument({ squadSize: 1 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.errors.some(e => e.includes('squad size'))).toBe(false);
      });

      it('should pass validation for squad size of 10', () => {
        const doc = createMockBlkDocument({ squadSize: 10 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.errors.some(e => e.includes('squad size'))).toBe(false);
      });
    });

    describe('number of squads validation', () => {
      it('should default number of squads of 0 to 4 during parsing (falsy value)', () => {
        // When squadn is 0 (falsy), parser defaults it to 4
        const doc = createMockBlkDocument({ squadn: 0 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);
        expect(result.unit?.numberOfSquads).toBe(4); // Defaulted from falsy 0
      });

      it('should warn about number of squads greater than 4', () => {
        const doc = createMockBlkDocument({ squadn: 6 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.warnings.some(w => w.includes('squads'))).toBe(true);
      });

      it('should not warn for standard squad count of 4', () => {
        const doc = createMockBlkDocument({ squadn: 4 });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.warnings.some(w => w.includes('squads'))).toBe(false);
      });
    });

    describe('jump infantry field gun restriction', () => {
      it('should fail validation for jump infantry with field guns', () => {
        const doc = createMockBlkDocument({
          motionType: 'Jump',
          jumpingMP: 3,
          equipmentByLocation: {
            'Platoon': ['Light Field Gun'],
          },
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.includes('Jump infantry cannot carry field guns'))).toBe(true);
      });

      it('should pass validation for foot infantry with field guns', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.errors.some(e => e.includes('field guns'))).toBe(false);
      });
    });

    describe('anti-mech training validation', () => {
      it('should fail if canSwarm is true but anti-mech training is false', () => {
        // Note: This shouldn't normally happen since canSwarm is derived from hasAntiMechTraining
        // But we test the validation logic itself
        const doc = createMockBlkDocument({
          rawTags: { antimech: 'true' },
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        // With anti-mech training, validation should pass
        const validation = handler.validate(result.unit!);
        expect(validation.errors.some(e => e.includes('Swarm attacks require anti-mech training'))).toBe(false);
      });
    });

    describe('field gun crew size validation', () => {
      it('should fail if field gun crew exceeds squad size', () => {
        const doc = createMockBlkDocument({
          squadSize: 1, // Squad size of 1, but field gun needs crew of 2
          equipmentByLocation: {
            'Platoon': ['Light Field Gun'],
          },
        });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.isValid).toBe(false);
        expect(validation.errors.some(e => e.includes('requires more crew than squad size'))).toBe(true);
      });

      it('should pass if squad size accommodates field gun crew', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const validation = handler.validate(result.unit!);
        expect(validation.errors.some(e => e.includes('requires more crew'))).toBe(false);
      });
    });
  });

  // ==========================================================================
  // Calculations
  // ==========================================================================
  describe('calculations', () => {
    describe('calculateWeight', () => {
      it('should calculate weight based on platoon strength', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 }); // 28 soldiers
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.unit!);
        // 28 soldiers * 0.08 tons = 2.24 tons
        expect(weight).toBeCloseTo(2.24, 2);
      });

      it('should add field gun weight', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.unit!);
        // 16 soldiers * 0.08 + 2 field guns * 0.5 = 1.28 + 1.0 = 2.28 tons
        expect(weight).toBeCloseTo(2.28, 2);
      });

      it('should return positive weight', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const weight = handler.calculateWeight(result.unit!);
        expect(weight).toBeGreaterThan(0);
      });
    });

    describe('calculateBV', () => {
      it('should calculate base BV based on platoon strength', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 }); // 28 soldiers
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.unit!);
        // 28 soldiers * 2 base BV = 56
        expect(bv).toBe(56);
      });

      it('should add BV for laser weapons', () => {
        const doc = createMockBlkDocument({ primary: 'Laser Rifle' });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.unit!);
        // 28 * (2 + 1) = 84
        expect(bv).toBe(84);
      });

      it('should add BV for SRM weapons', () => {
        const doc = createMockBlkDocument({ primary: 'SRM' });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.unit!);
        // 28 * (2 + 2) = 112
        expect(bv).toBe(112);
      });

      it('should add BV for anti-mech training', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.unit!);
        // 28 * (2 + 2 for SRM + 1 for anti-mech) = 28 * 5 = 140
        expect(bv).toBe(140);
      });

      it('should add BV for armor', () => {
        const doc = createMockBlkDocument({ armorKit: 'Standard' });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.unit!);
        // 28 * (2 + 0.5) = 70
        expect(bv).toBe(70);
      });

      it('should return positive BV', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const bv = handler.calculateBV(result.unit!);
        expect(bv).toBeGreaterThan(0);
      });
    });

    describe('calculateCost', () => {
      it('should calculate base cost', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 }); // 28 soldiers
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.unit!);
        // 28 * 1000 = 28000
        expect(cost).toBe(28000);
      });

      it('should add cost for anti-mech training', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.unit!);
        // 28 * (1000 + 500) = 42000
        expect(cost).toBe(42000);
      });

      it('should add cost for standard armor', () => {
        const doc = createMockBlkDocument({ armorKit: 'Standard' });
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.unit!);
        // 28 * (1000 + 500) = 42000
        expect(cost).toBe(42000);
      });

      it('should add higher cost for clan armor', () => {
        const doc = createClanInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.unit!);
        // 28 * (1000 + 2000) = 84000
        expect(cost).toBe(84000);
      });

      it('should add cost for field guns', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.unit!);
        // 16 * 1000 + 2 * 50000 = 16000 + 100000 = 116000
        expect(cost).toBe(116000);
      });

      it('should return positive cost', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);
        expect(result.success).toBe(true);

        const cost = handler.calculateCost(result.unit!);
        expect(cost).toBeGreaterThan(0);
      });
    });
  });

  // ==========================================================================
  // Serialization
  // ==========================================================================
  describe('serialize', () => {
    it('should serialize successfully', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.success).toBe(true);
      expect(serializeResult.serialized).toBeDefined();
    });

    it('should include unit type in serialized output', () => {
      const doc = createMockBlkDocument();
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.unitType).toBe(UnitType.INFANTRY);
    });

    it('should include configuration (motion type) in serialized output', () => {
      const doc = createMockBlkDocument({ motionType: 'Jump', jumpingMP: 3 });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.configuration).toBe(SquadMotionType.JUMP);
    });

    it('should include chassis and model', () => {
      const doc = createMockBlkDocument({ name: 'Test Platoon', model: 'Alpha' });
      const parseResult = handler.parse(doc);
      expect(parseResult.success).toBe(true);

      const serializeResult = handler.serialize(parseResult.unit!);
      expect(serializeResult.serialized?.chassis).toBe('Test Platoon');
      expect(serializeResult.serialized?.model).toBe('Alpha');
    });
  });

  // ==========================================================================
  // Deserialization
  // ==========================================================================
  describe('deserialize', () => {
    it('should return failure result (not yet implemented)', () => {
      // Create a minimal mock ISerializedUnit for testing
      const serialized = {
        id: 'test-id',
        chassis: 'Test',
        model: 'Test',
        unitType: 'Infantry',
        configuration: 'Foot',
        techBase: 'Inner Sphere',
        rulesLevel: 'Introductory',
        era: 'Succession Wars',
        year: 3025,
        tonnage: 0.1,
        engine: { type: 'None', rating: 0 },
        gyro: { type: 'None' },
        cockpit: 'None',
        structure: { type: 'None' },
        armor: { type: 'None', allocation: {} },
        heatSinks: { type: 'None', count: 0 },
        movement: { walk: 1, jump: 0 },
        equipment: [],
        criticalSlots: {},
      };

      const result = handler.deserialize(serialized);
      expect(result.success).toBe(false);
      expect(result.errors.some(e => e.includes('not yet implemented'))).toBe(true);
    });
  });

  // ==========================================================================
  // Factory Function
  // ==========================================================================
  describe('createInfantryHandler', () => {
    it('should create an InfantryUnitHandler instance', () => {
      const newHandler = createInfantryHandler();
      expect(newHandler).toBeInstanceOf(InfantryUnitHandler);
    });

    it('should create independent instances', () => {
      const handler1 = createInfantryHandler();
      const handler2 = createInfantryHandler();
      expect(handler1).not.toBe(handler2);
    });

    it('should have correct unit type', () => {
      const newHandler = createInfantryHandler();
      expect(newHandler.unitType).toBe(UnitType.INFANTRY);
    });
  });
});
