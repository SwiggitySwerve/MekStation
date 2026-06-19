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
    describe('basic parsing', () => {
      it('should parse foot rifle platoon successfully', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit).toBeDefined();
        expect(result.data?.unit?.unitType).toBe(UnitType.INFANTRY);
        expect(result.data?.unit?.metadata.chassis).toBe('Foot Rifle Platoon');
      });

      it('should parse name and model correctly', () => {
        const doc = createMockBlkDocument({
          name: 'Test Platoon',
          model: 'Mark II',
        });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.metadata.chassis).toBe('Test Platoon');
        expect(result.data?.unit?.metadata.model).toBe('Mark II');
      });

      it('should parse year correctly', () => {
        const doc = createMockBlkDocument({ year: 3050 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.metadata.year).toBe(3050);
      });
    });

    describe('squad configuration', () => {
      it('should parse squad size', () => {
        const doc = createMockBlkDocument({ squadSize: 7 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.squadSize).toBe(7);
      });

      it('should parse number of squads', () => {
        const doc = createMockBlkDocument({ squadn: 4 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.numberOfSquads).toBe(4);
      });

      it('should calculate platoon strength correctly', () => {
        const doc = createMockBlkDocument({ squadSize: 7, squadn: 4 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.platoonStrength).toBe(28);
      });

      it('should use default squad size if not specified', () => {
        // Create document without squadSize by spreading without that field
        const { squadSize: _unused, ...docWithoutSquadSize } =
          createMockBlkDocument();
        const doc = docWithoutSquadSize as IBlkDocument;
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.squadSize).toBe(7); // Default
      });

      it('should use default number of squads if not specified', () => {
        // Create document without squadn by spreading without that field
        const { squadn: _unused, ...docWithoutSquadn } =
          createMockBlkDocument();
        const doc = docWithoutSquadn as IBlkDocument;
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.numberOfSquads).toBe(4); // Default
      });
    });

    describe('motion type mapping', () => {
      it('should parse foot motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Foot' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.FOOT);
      });

      it('should parse leg motion type as foot', () => {
        const doc = createMockBlkDocument({ motionType: 'Leg' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.FOOT);
      });

      it('should parse jump motion type', () => {
        const doc = createJumpInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.JUMP);
      });

      it('should parse motorized motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Motorized' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.MOTORIZED);
      });

      it('should parse mechanized motion type', () => {
        const doc = createMechanizedInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.MECHANIZED);
      });

      it('should parse wheeled motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Wheeled' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.WHEELED);
      });

      it('should parse tracked motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Tracked' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.TRACKED);
      });

      it('should parse hover motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Hover' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.HOVER);
      });

      it('should parse vtol motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'VTOL' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.VTOL);
      });

      it('should parse beast motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'Beast' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.BEAST);
      });

      it('should default to foot for unknown motion type', () => {
        const doc = createMockBlkDocument({ motionType: 'UnknownType' });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.motionType).toBe(SquadMotionType.FOOT);
      });
    });

    describe('movement parsing', () => {
      it('should parse ground MP', () => {
        const doc = createMockBlkDocument({ cruiseMP: 2 });
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.groundMP).toBe(2);
      });

      it('should parse jump MP', () => {
        const doc = createJumpInfantryDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.jumpMP).toBe(3);
      });

      it('should default jump MP to 0 if not specified', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.jumpMP).toBe(0);
      });

      it('should set UMU MP to 0', () => {
        const doc = createMockBlkDocument();
        const result = handler.parse(doc);

        expect(result.success).toBe(true);
        expect(result.data?.unit?.movement.umuMP).toBe(0);
      });
    });
  });
});
