/**
 * InfantryUnitHandler Tests
 *
 * Comprehensive tests for Infantry BLK parsing, validation, calculations, and serialization
 */

import { IBlkDocument } from '@/types/formats/BlkFormat';
import { SquadMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import {
  InfantryArmorKit,
  InfantrySpecialization,
} from '@/types/unit/PersonnelInterfaces';
import { calculateInfantryBVFromUnit } from '@/utils/construction/infantry';

import {
  InfantryUnitHandler,
  createInfantryHandler,
} from '../InfantryUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createJumpInfantryDocument,
  createMechanizedInfantryDocument,
  createFieldGunInfantryDocument,
  createAntiMechInfantryDocument,
  createAugmentedInfantryDocument,
  createClanInfantryDocument,
} from './InfantryUnitHandler.test-helpers';

describe('InfantryUnitHandler', () => {
  let handler: InfantryUnitHandler;

  beforeEach(() => {
    handler = createInfantryHandler();
  });

  // ==========================================================================
  // Constructor and Properties
  // ==========================================================================

  describe('parse', () => {
    describe('weapons parsing', () => {
      it('should parse primary weapon', () => {
        const doc = createMockBlkDocument({ primary: 'Rifle' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.primaryWeapon).toBe('Rifle');
      });

      it('should default primary weapon to Rifle', () => {
        // Create document without primary by spreading without that field
        const { primary: _unused, ...docWithoutPrimary } =
          createMockBlkDocument();
        const doc = docWithoutPrimary as IBlkDocument;
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.primaryWeapon).toBe('Rifle');
      });

      it('should parse secondary weapon', () => {
        const doc = createMockBlkDocument({
          primary: 'Rifle',
          secondary: 'SRM',
          secondn: 2,
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.secondaryWeapon).toBe('SRM');
      });

      it('should parse secondary weapon count', () => {
        const doc = createMockBlkDocument({
          primary: 'Rifle',
          secondary: 'SRM',
          secondn: 3,
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.secondaryWeaponCount).toBe(3);
      });

      it('should default secondary weapon count to 0', () => {
        const doc = createMockBlkDocument({ primary: 'Rifle' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.secondaryWeaponCount).toBe(0);
      });
    });

    describe('armor kit mapping', () => {
      it('should parse none armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'None' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(InfantryArmorKit.NONE);
      });

      it('should parse standard armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'Standard' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(InfantryArmorKit.STANDARD);
      });

      it('should parse flak armor kit', () => {
        const doc = createJumpInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(InfantryArmorKit.FLAK);
      });

      it('should parse ablative armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'Ablative' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(InfantryArmorKit.ABLATIVE);
      });

      it('should parse clan armor kit', () => {
        const doc = createClanInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(InfantryArmorKit.CLAN);
      });

      it('should parse environmental armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'Environmental' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(
          InfantryArmorKit.ENVIRONMENTAL,
        );
      });

      it('should default to none for unknown armor kit', () => {
        const doc = createMockBlkDocument({ armorKit: 'UnknownArmor' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(InfantryArmorKit.NONE);
      });

      it('should handle case-insensitive armor kit names', () => {
        const doc = createMockBlkDocument({ armorKit: 'FLAK' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorKit).toBe(InfantryArmorKit.FLAK);
      });
    });

    describe('specialization parsing', () => {
      it('should parse anti-mech specialization', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.ANTI_MECH,
        );
      });

      it('should parse antimech variant specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'antimech' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.ANTI_MECH,
        );
      });

      it('should parse paratrooper specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'paratrooper' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.PARATROOPER,
        );
      });

      it('should parse mountain specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'mountain' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.MOUNTAIN,
        );
      });

      it('should parse marine specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'marine' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.MARINE,
        );
      });

      it('should parse xct specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'xct' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.XCT,
        );
      });

      it('should parse tag specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'tag' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.TAG,
        );
      });

      it('should parse engineer specialization', () => {
        const doc = createMockBlkDocument({
          rawTags: { specialization: 'engineer' },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.ENGINEER,
        );
      });

      it('should default to none for no specialization', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.specialization).toBe(
          InfantrySpecialization.NONE,
        );
      });
    });

    describe('field gun parsing', () => {
      it('should parse field guns from equipment', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.fieldGuns.length).toBe(2);
      });

      it('should set field gun name from equipment', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.fieldGuns[0].name).toBe('Light Field Gun');
        expect(result.data?.unit?.fieldGuns[1].name).toBe('Medium Field Gun');
      });

      it('should set default crew size of 2', () => {
        const doc = createFieldGunInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.fieldGuns[0].crew).toBe(2);
      });

      it('should return empty array when no field guns', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.fieldGuns).toEqual([]);
      });
    });

    describe('anti-mech training and augmentation flags', () => {
      it('should parse anti-mech training flag', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasAntiMechTraining).toBe(true);
      });

      it('should set canSwarm based on anti-mech training', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.canSwarm).toBe(true);
      });

      it('should set canLegAttack based on anti-mech training', () => {
        const doc = createAntiMechInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.canLegAttack).toBe(true);
      });

      it('should parse augmented flag', () => {
        const doc = createAugmentedInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.isAugmented).toBe(true);
      });

      it('should parse augmentation type', () => {
        const doc = createAugmentedInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.augmentationType).toBe('DEST');
      });

      it('should default anti-mech training to false', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasAntiMechTraining).toBe(false);
        expect(result.data?.unit?.canSwarm).toBe(false);
        expect(result.data?.unit?.canLegAttack).toBe(false);
      });
    });
  });
});
