/**
 * WarShipUnitHandler Tests
 *
 * Tests for WarShip BLK parsing and validation
 *
 * @see openspec/changes/add-multi-unit-type-support/tasks.md
 */

import { TechBase, RulesLevel } from '@/types/enums';
import { IBlkDocument } from '@/types/formats/BlkFormat';
import { UnitType } from '@/types/unit/BattleMechInterfaces';
import { CapitalArc, KFDriveType } from '@/types/unit/CapitalShipInterfaces';

import {
  WarShipUnitHandler,
  createWarShipHandler,
} from '../WarShipUnitHandler';
// ============================================================================
import { createMockBlkDocument } from './WarShipUnitHandler.test-helpers';

describe('WarShipUnitHandler', () => {
  let handler: WarShipUnitHandler;

  beforeEach(() => {
    handler = createWarShipHandler();
  });

  describe('parse', () => {
    it('should parse basic WarShip successfully', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit).toBeDefined();
      expect(result.data?.unit?.unitType).toBe(UnitType.WARSHIP);
      expect(result.data?.unit?.tonnage).toBe(1400000);
      expect(result.data?.unit?.metadata.chassis).toBe('McKenna');
      expect(result.data?.unit?.metadata.model).toBe('Battleship');
    });

    it('should parse movement values correctly', () => {
      const doc = createMockBlkDocument({ safeThrust: 3 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.movement.safeThrust).toBe(3);
      expect(result.data?.unit?.movement.maxThrust).toBe(4); // floor(3 * 1.5)
    });

    it('should parse structural integrity', () => {
      const doc = createMockBlkDocument({ structuralIntegrity: 80 });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.structuralIntegrity).toBe(80);
    });

    it('should parse armor by arc with broadsides', () => {
      const doc = createMockBlkDocument({
        armor: [500, 400, 400, 350, 350, 300, 450, 450],
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.armorByArc.nose).toBe(500);
      expect(result.data?.unit?.armorByArc.frontLeftSide).toBe(400);
      expect(result.data?.unit?.armorByArc.frontRightSide).toBe(400);
      expect(result.data?.unit?.armorByArc.aftLeftSide).toBe(350);
      expect(result.data?.unit?.armorByArc.aftRightSide).toBe(350);
      expect(result.data?.unit?.armorByArc.aft).toBe(300);
      expect(result.data?.unit?.armorByArc.leftBroadside).toBe(450);
      expect(result.data?.unit?.armorByArc.rightBroadside).toBe(450);
    });

    it('should calculate total armor points', () => {
      const doc = createMockBlkDocument({
        armor: [500, 400, 400, 350, 350, 300, 450, 450], // Total: 3200
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.totalArmorPoints).toBe(3200);
    });

    it('should parse K-F drive type', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.kfDriveType).toBe(KFDriveType.STANDARD);
    });

    it('should parse compact K-F drive', () => {
      const doc = createMockBlkDocument({
        rawTags: { kfdrivetype: 'compact' },
      });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.kfDriveType).toBe(KFDriveType.COMPACT);
    });

    it('should parse lithium-fusion battery', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.hasLFBattery).toBe(true);
    });

    it('should parse gravity decks', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.gravityDecks.length).toBe(3);
      expect(
        result.data?.unit?.gravityDecks.some((d) => d.size === 'Large'),
      ).toBe(true);
    });

    it('should parse docking hardpoints', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.dockingHardpoints).toBe(6);
    });

    it('should parse crew configuration', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.crewConfiguration.crew).toBe(2200);
      expect(result.data?.unit?.crewConfiguration.officers).toBe(150);
      expect(result.data?.unit?.crewConfiguration.gunners).toBe(400);
      expect(result.data?.unit?.crewConfiguration.marines).toBe(60);
    });

    it('should parse transport bays', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.transportBays.length).toBe(3);
    });

    it('should parse equipment with arcs', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.equipment.length).toBeGreaterThan(0);

      const noseWeapon = result.data?.unit?.equipment.find(
        (e) => e.arc === CapitalArc.NOSE,
      );
      expect(noseWeapon).toBeDefined();
    });

    it('should identify capital weapons', () => {
      const doc = createMockBlkDocument();
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      const capitalWeapon = result.data?.unit?.equipment.find((e) =>
        e.name.toLowerCase().includes('naval'),
      );
      expect(capitalWeapon?.isCapital).toBe(true);
    });

    it('should parse Inner Sphere tech base', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
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

    it('should parse rules level', () => {
      const doc = createMockBlkDocument({ type: 'IS Level 3' });
      const result = handler.parse(doc);

      expect(result.success).toBe(true);
      expect(result.data?.unit?.rulesLevel).toBe(RulesLevel.ADVANCED);
    });
  });
});
