/**
 * SmallCraftUnitHandler Tests
 *
 * Tests for Small Craft BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { SmallCraftLocation } from '@/types/construction/UnitLocation';
import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { AerospaceMotionType } from '@/types/unit/BaseUnitInterfaces';
import { UnitType } from '@/types/unit/BattleMechInterfaces';

import {
  SmallCraftUnitHandler,
  createSmallCraftHandler,
} from '../SmallCraftUnitHandler';
// ============================================================================
import {
  createMockBlkDocument,
  createSpheroidSmallCraft,
  createAssaultBoat,
} from './SmallCraftUnitHandler.test-helpers';

describe('SmallCraftUnitHandler', () => {
  let handler: SmallCraftUnitHandler;

  beforeEach(() => {
    handler = createSmallCraftHandler();
  });

  describe('parse', () => {
    it('should parse basic aerodyne Small Craft successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.SMALL_CRAFT);
      expect(result.data?.unit?.tonnage).toBe(100);
      expect(result.data?.unit?.metadata.chassis).toBe('K-1');
      expect(result.data?.unit?.motionType).toBe(AerospaceMotionType.AERODYNE);
    });

    it('should parse spheroid Small Craft', () => {
      const doc = createSpheroidSmallCraft();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.motionType).toBe(AerospaceMotionType.SPHEROID);
      expect(result.data?.unit?.metadata.chassis).toBe('Hunter');
    });

    it('should parse movement values correctly', () => {
      const doc = createMockBlkDocument({ safeThrust: 5 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.safeThrust).toBe(5);
      expect(result.data?.unit?.movement.maxThrust).toBe(7); // floor(5 * 1.5)
    });

    it('should parse structural integrity', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 6 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.structuralIntegrity).toBe(6);
    });

    it('should parse armor by arc', () => {
      const doc = createMockBlkDocument({
        armor: [40, 30, 30, 20],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByArc.nose).toBe(40);
      expect(result.data?.unit?.armorByArc.leftSide).toBe(30);
      expect(result.data?.unit?.armorByArc.rightSide).toBe(30);
      expect(result.data?.unit?.armorByArc.aft).toBe(20);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [40, 30, 30, 20], // Total: 120
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(120);
    });

    it('should parse crew and passengers', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crew).toBe(2);
      expect(result.data?.unit?.passengers).toBe(8);
    });

    it('should parse cargo capacity', () => {
      const doc = createMockBlkDocument({
        rawTags: { cargo: '10.5' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.cargoCapacity).toBe(10.5);
    });

    it('should parse escape pods and life boats', () => {
      const doc = createMockBlkDocument({
        escapePod: 3,
        lifeBoat: 1,
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.escapePods).toBe(3);
      expect(result.data?.unit?.lifeBoats).toBe(1);
    });

    it('should parse equipment with locations', () => {
      const doc = createAssaultBoat();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBeGreaterThan(0);

      const noseWeapon = result.data?.unit?.equipment.find(
        (e) => e.location === SmallCraftLocation.NOSE,
      );
      expect(noseWeapon).toBeDefined();
    });

    it('should fail parse for under-tonnage craft', () => {
      const doc = createMockBlkDocument({ tonnage: 50 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('100'))).toBe(true);
    });

    it('should fail parse for over-tonnage craft', () => {
      const doc = createMockBlkDocument({ tonnage: 250 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('200'))).toBe(true);
    });

    it('should fail parse for zero thrust', () => {
      const doc = createMockBlkDocument({ safeThrust: 0 });
      const result = handler.parse(doc);

      expect(result.success).toBe(false);
      expect(result.error!.errors.some((e) => e.includes('thrust'))).toBe(true);
    });

    it('should parse tech base', () => {
      const isDoc = createMockBlkDocument({ type: 'IS Level 2' });
      const clanDoc = createMockBlkDocument({ type: 'Clan Level 2' });

      const isResult = handler.parse(isDoc);
      const clanResult = handler.parse(clanDoc);

      expect(isResult.data?.unit?.techBase).toBe(TechBase.INNER_SPHERE);
      expect(clanResult.data?.unit?.techBase).toBe(TechBase.CLAN);
    });

    it('should parse rules level', () => {
      const introDoc = createMockBlkDocument({ type: 'IS Level 1' });
      const standardDoc = createMockBlkDocument({ type: 'IS Level 2' });
      const advancedDoc = createMockBlkDocument({ type: 'IS Level 3' });

      expect(handler.parse(introDoc).data?.unit?.rulesLevel).toBe(
        RulesLevel.INTRODUCTORY,
      );
      expect(handler.parse(standardDoc).data?.unit?.rulesLevel).toBe(
        RulesLevel.STANDARD,
      );
      expect(handler.parse(advancedDoc).data?.unit?.rulesLevel).toBe(
        RulesLevel.ADVANCED,
      );
    });
  });
});
