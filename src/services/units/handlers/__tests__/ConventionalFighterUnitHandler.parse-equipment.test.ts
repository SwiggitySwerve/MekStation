/**
 * ConventionalFighterUnitHandler Tests
 *
 * Tests for conventional fighter BLK parsing, validation, and serialization.
 * Conventional fighters are atmospheric-only aircraft that cannot operate in space.
 */

import { AerospaceLocation } from '@/types/construction/UnitLocation';
import { RulesLevel } from '@/types/enums/RulesLevel';
import { TechBase } from '@/types/enums/TechBase';
import { WeightClass } from '@/types/enums/WeightClass';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import {
  ConventionalFighterEngineType,
  AerospaceCockpitType,
} from '@/types/unit/AerospaceInterfaces';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { ISerializedUnit } from '@/types/unit/UnitSerialization';

import {
  ConventionalFighterUnitHandler,
  createConventionalFighterHandler,
} from '../ConventionalFighterUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createLightFighterDocument,
  createMediumFighterDocument,
  createHeavyFighterDocument,
} from './ConventionalFighterUnitHandler.test-helpers';

describe('ConventionalFighterUnitHandler', () => {
  let handler: ConventionalFighterUnitHandler;

  beforeEach(() => {
    handler = createConventionalFighterHandler();
  });

  describe('parse', () => {
    describe('armor by arc parsing', () => {
      it('should parse armor correctly into arcs', () => {
        const doc = createMockBlkDocument({ armor: [20, 15, 15, 10] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorByArc.nose).toBe(20);
        expect(result.data?.unit?.armorByArc.leftWing).toBe(15);
        expect(result.data?.unit?.armorByArc.rightWing).toBe(15);
        expect(result.data?.unit?.armorByArc.aft).toBe(10);
      });

      it('should calculate total armor points correctly', () => {
        const doc = createMockBlkDocument({ armor: [20, 15, 15, 10] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.totalArmorPoints).toBe(60);
      });

      it('should handle empty armor array', () => {
        const doc = createMockBlkDocument({ armor: [] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorByArc.nose).toBe(0);
        expect(result.data?.unit?.armorByArc.leftWing).toBe(0);
        expect(result.data?.unit?.armorByArc.rightWing).toBe(0);
        expect(result.data?.unit?.armorByArc.aft).toBe(0);
        expect(result.data?.unit?.totalArmorPoints).toBe(0);
      });

      it('should handle partial armor array', () => {
        const doc = createMockBlkDocument({ armor: [20, 15] });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.armorByArc.nose).toBe(20);
        expect(result.data?.unit?.armorByArc.leftWing).toBe(15);
        expect(result.data?.unit?.armorByArc.rightWing).toBe(0);
        expect(result.data?.unit?.armorByArc.aft).toBe(0);
      });
    });

    describe('cockpit type parsing', () => {
      it('should parse cockpit type 0 as STANDARD', () => {
        const doc = createMockBlkDocument({ cockpitType: 0 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(
          AerospaceCockpitType.STANDARD,
        );
      });

      it('should parse cockpit type 1 as SMALL', () => {
        const doc = createMockBlkDocument({ cockpitType: 1 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(AerospaceCockpitType.SMALL);
      });

      it('should parse cockpit type 2 as PRIMITIVE', () => {
        const doc = createMockBlkDocument({ cockpitType: 2 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(
          AerospaceCockpitType.PRIMITIVE,
        );
      });

      it('should default unknown cockpit type to STANDARD', () => {
        const doc = createMockBlkDocument({ cockpitType: 99 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.cockpitType).toBe(
          AerospaceCockpitType.STANDARD,
        );
      });
    });

    describe('equipment parsing', () => {
      it('should parse equipment from all locations', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Nose Equipment': ['Large Laser'],
            'Left Wing Equipment': ['Medium Laser'],
            'Right Wing Equipment': ['SRM 6'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.equipment.length).toBe(3);
      });

      it('should normalize location names correctly', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            nose: ['Large Laser'],
            'left wing': ['Medium Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        const noseEquip = result.data?.unit?.equipment.find(
          (e) => e.location === AerospaceLocation.NOSE,
        );
        expect(noseEquip).toBeDefined();
      });

      it('should assign unique mount IDs to equipment', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Nose Equipment': ['Medium Laser', 'Medium Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        const ids = result.data?.unit?.equipment.map((e) => e.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids?.length);
      });

      it('should default unknown locations to FUSELAGE', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Unknown Location': ['Large Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.equipment[0].location).toBe(
          AerospaceLocation.FUSELAGE,
        );
      });
    });

    describe('bomb bay detection', () => {
      it('should detect bomb bay in equipment', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Fuselage Equipment': ['Bomb Bay'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasBombBay).toBe(true);
      });

      it('should calculate bomb capacity as 10% of tonnage', () => {
        const doc = createMockBlkDocument({
          tonnage: 80,
          equipmentByLocation: {
            'Fuselage Equipment': ['Bomb Bay'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.bombCapacity).toBe(8); // 80 * 0.1
      });

      it('should set bombCapacity to 0 without bomb bay', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Nose Equipment': ['Large Laser'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasBombBay).toBe(false);
        expect(result.data?.unit?.bombCapacity).toBe(0);
      });

      it('should detect bomb in lowercase', () => {
        const doc = createMockBlkDocument({
          equipmentByLocation: {
            'Fuselage Equipment': ['bomb rack'],
          },
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.hasBombBay).toBe(true);
      });
    });

    describe('tonnage limit validation', () => {
      it('should fail parsing when tonnage exceeds 100', () => {
        const doc = createMockBlkDocument({ tonnage: 120 });
        const result = handler.parse(doc);

        expect(result.success).toBe(false);
        expect(
          result.error!.errors.some((e) =>
            e.includes('cannot exceed 100 tons'),
          ),
        ).toBe(true);
      });

      it('should parse valid 100 ton fighter', () => {
        const doc = createMockBlkDocument({ tonnage: 100 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.tonnage).toBe(100);
      });
    });

    describe('weight class determination', () => {
      it('should classify tonnage <= 45 as LIGHT', () => {
        const doc = createLightFighterDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
      });

      it('should classify tonnage 46-70 as MEDIUM', () => {
        const doc = createMediumFighterDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.MEDIUM);
      });

      it('should classify tonnage > 70 as HEAVY', () => {
        const doc = createHeavyFighterDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.HEAVY);
      });

      it('should classify 45 ton as LIGHT (boundary)', () => {
        const doc = createMockBlkDocument({ tonnage: 45 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.LIGHT);
      });

      it('should classify 70 ton as MEDIUM (boundary)', () => {
        const doc = createMockBlkDocument({ tonnage: 70 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.weightClass).toBe(WeightClass.MEDIUM);
      });
    });

    describe('tech base parsing', () => {
      it('should parse Inner Sphere tech base', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 2' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      });

      it('should parse Clan tech base', () => {
        const doc = createMockBlkDocument({ type: 'Clan Level 3' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.techBase).toBe(TechBase.CLAN);
      });

      it('should default to Inner Sphere for unknown tech base', () => {
        const doc = createMockBlkDocument({ type: 'Unknown' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      });
    });

    describe('rules level parsing', () => {
      it('should parse Level 1 as INTRODUCTORY', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 1' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
      });

      it('should parse Level 2 as STANDARD', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 2' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
      });

      it('should parse Level 3 as ADVANCED', () => {
        const doc = createMockBlkDocument({ type: 'IS Level 3' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
      });

      it('should parse Introductory keyword as INTRODUCTORY', () => {
        const doc = createMockBlkDocument({ type: 'IS Introductory' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.INTRODUCTORY);
      });

      it('should default to STANDARD for unknown rules level', () => {
        const doc = createMockBlkDocument({ type: 'Unknown' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.STANDARD);
      });
    });
  });
});
