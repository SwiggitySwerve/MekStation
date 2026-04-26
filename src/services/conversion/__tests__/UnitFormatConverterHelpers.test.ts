/**
 * UnitFormatConverterHelpers Tests
 *
 * Tier 1 invariant tests for the helpers that translate the raw MegaMekLab
 * JSON shape into the canonical `ISerializedUnit` shape consumed by the rest
 * of the app.
 *
 * Tests assert the deterministic ID rule (mul- prefix when MUL ID exists,
 * else slug from chassis-model), the armor allocation shape (front/rear-pair
 * for torsos), the movement-data extraction (walk/jump + MASC/TSM/Supercharger
 * detection), and the fluff-data passthrough rules.
 */

import { TechBase } from '@/types/enums/TechBase';

import type { MegaMekLabUnit } from '../UnitFormatConverterTypes';

import {
  convertArmorData,
  convertCriticalEntries,
  convertFluffData,
  convertMovementData,
  generateUnitId,
} from '../UnitFormatConverterHelpers';

// ============================================================================
// Helper: build a MegaMekLabUnit fixture with sensible defaults
// ============================================================================
function buildSourceUnit(
  overrides: Partial<MegaMekLabUnit> = {},
): MegaMekLabUnit {
  return {
    chassis: 'Atlas',
    model: 'AS7-D',
    mul_id: 11,
    config: 'Biped',
    tech_base: 'Inner Sphere',
    era: 2755,
    source: 'TRO 3025',
    rules_level: 2,
    mass: 100,
    engine: { type: 'Standard Fusion', rating: 300 },
    structure: { type: 'IS Standard' },
    heat_sinks: { type: 'Single', count: 20 },
    walk_mp: 3,
    jump_mp: 0,
    armor: { type: 'Standard', locations: [] },
    weapons_and_equipment: [],
    criticals: [],
    ...overrides,
  };
}

describe('UnitFormatConverterHelpers', () => {
  // ============================================================================
  // generateUnitId() — mul-prefix wins; else slug from chassis-model
  // ============================================================================
  describe('generateUnitId()', () => {
    it('uses the mul-NNN prefix when mul_id is present', () => {
      const unit = buildSourceUnit({ mul_id: 11 });
      expect(generateUnitId(unit)).toBe('mul-11');
    });

    it('uses string mul_id verbatim with mul- prefix', () => {
      const unit = buildSourceUnit({ mul_id: 'abc-99' });
      expect(generateUnitId(unit)).toBe('mul-abc-99');
    });

    it('falls back to chassis-model slug when mul_id is empty', () => {
      const unit = buildSourceUnit({
        mul_id: '',
        chassis: 'Atlas',
        model: 'AS7-D',
      });
      expect(generateUnitId(unit)).toBe('atlas-as7-d');
    });

    it('lowercases and replaces non-alphanumeric runs with hyphens', () => {
      const unit = buildSourceUnit({
        mul_id: '',
        chassis: 'Marauder II',
        model: 'MAD-4A (Bounty Hunter)',
      });
      expect(generateUnitId(unit)).toBe('marauder-ii-mad-4a-bounty-hunter');
    });

    it('strips leading and trailing hyphens', () => {
      const unit = buildSourceUnit({
        mul_id: '',
        chassis: '!!!Mech',
        model: 'X???',
      });
      expect(generateUnitId(unit)).toBe('mech-x');
    });
  });

  // ============================================================================
  // convertArmorData() — produces the front/rear-pair torso allocation shape
  // ============================================================================
  describe('convertArmorData()', () => {
    it('emits torso allocations as { front, rear } pair objects', () => {
      const result = convertArmorData(
        {
          type: 'Standard',
          locations: [
            { location: 'HD', armor_points: 9 },
            { location: 'CT', armor_points: 47, rear_armor_points: 14 },
            { location: 'LT', armor_points: 32, rear_armor_points: 10 },
            { location: 'RT', armor_points: 32, rear_armor_points: 10 },
            { location: 'LA', armor_points: 34 },
            { location: 'RA', armor_points: 34 },
            { location: 'LL', armor_points: 41 },
            { location: 'RL', armor_points: 41 },
          ],
        },
        TechBase.INNER_SPHERE,
      );

      expect(result.allocation.head).toBe(9);
      expect(result.allocation.leftArm).toBe(34);
      expect(result.allocation.rightArm).toBe(34);
      expect(result.allocation.leftLeg).toBe(41);
      expect(result.allocation.rightLeg).toBe(41);
      expect(result.allocation.centerTorso).toEqual({ front: 47, rear: 14 });
      expect(result.allocation.leftTorso).toEqual({ front: 32, rear: 10 });
      expect(result.allocation.rightTorso).toEqual({ front: 32, rear: 10 });
    });

    it('passes the resolved armor type through (mapArmorType output)', () => {
      const result = convertArmorData(
        { type: 'Standard', locations: [] },
        TechBase.INNER_SPHERE,
      );
      // The exact resolved string depends on mapArmorType, but it must be a
      // non-empty string and match for the same input.
      expect(typeof result.type).toBe('string');
      expect(result.type.length).toBeGreaterThan(0);
    });

    it('returns zero-filled torso pairs when no rear armor points are given', () => {
      const result = convertArmorData(
        {
          type: 'Standard',
          locations: [{ location: 'CT', armor_points: 30 }],
        },
        TechBase.INNER_SPHERE,
      );
      expect(result.allocation.centerTorso).toEqual({ front: 30, rear: 0 });
    });
  });

  // ============================================================================
  // convertMovementData() — walk/jump + MASC/TSM/Supercharger + jet type
  // ============================================================================
  describe('convertMovementData()', () => {
    it('coerces string walk/jump MP into numbers', () => {
      const unit = buildSourceUnit({ walk_mp: '4', jump_mp: '4' });
      const movement = convertMovementData(unit);
      expect(movement.walk).toBe(4);
      expect(movement.jump).toBe(4);
    });

    it('passes numeric walk/jump through unchanged', () => {
      const unit = buildSourceUnit({ walk_mp: 5, jump_mp: 0 });
      const movement = convertMovementData(unit);
      expect(movement.walk).toBe(5);
      expect(movement.jump).toBe(0);
    });

    it('detects MASC, TSM, and Supercharger from weapons_and_equipment item_type', () => {
      const unit = buildSourceUnit({
        walk_mp: 4,
        jump_mp: 0,
        weapons_and_equipment: [
          {
            item_name: 'MASC',
            location: 'CT',
            item_type: 'MASC',
            tech_base: 'IS',
          },
          {
            item_name: 'TSM',
            location: 'CT',
            item_type: 'TripleStrengthMyomer',
            tech_base: 'IS',
          },
          {
            item_name: 'Supercharger',
            location: 'CT',
            item_type: 'Supercharger',
            tech_base: 'IS',
          },
        ],
      });
      const movement = convertMovementData(unit);
      expect(movement.enhancements).toEqual(
        expect.arrayContaining(['MASC', 'TSM', 'Supercharger']),
      );
    });

    it('returns enhancements undefined when none are present', () => {
      const unit = buildSourceUnit({ weapons_and_equipment: [] });
      const movement = convertMovementData(unit);
      expect(movement.enhancements).toBeUndefined();
    });

    it('detects "Improved Jump Jet" as Improved jumpJetType', () => {
      const unit = buildSourceUnit({
        walk_mp: 4,
        jump_mp: 4,
        weapons_and_equipment: [
          {
            item_name: 'Improved Jump Jet',
            location: 'LT',
            item_type: 'ImprovedJumpJet',
            tech_base: 'IS',
          },
        ],
      });
      expect(convertMovementData(unit).jumpJetType).toBe('Improved');
    });

    it('detects standard "Jump Jet" as Standard jumpJetType', () => {
      const unit = buildSourceUnit({
        walk_mp: 4,
        jump_mp: 4,
        weapons_and_equipment: [
          {
            item_name: 'Jump Jet',
            location: 'LT',
            item_type: 'JumpJet',
            tech_base: 'IS',
          },
        ],
      });
      expect(convertMovementData(unit).jumpJetType).toBe('Standard');
    });

    it('omits jumpJetType when jump MP is zero (no jets to record)', () => {
      const unit = buildSourceUnit({
        walk_mp: 4,
        jump_mp: 0,
        weapons_and_equipment: [
          {
            item_name: 'Jump Jet',
            location: 'LT',
            item_type: 'JumpJet',
            tech_base: 'IS',
          },
        ],
      });
      expect(convertMovementData(unit).jumpJetType).toBeUndefined();
    });
  });

  // ============================================================================
  // convertCriticalEntries() — empty/-Empty- slot tokens normalise to null
  //
  // The underlying parseCriticalSlots() requires 8 entries (one per biped
  // location) to engage; the result is keyed by the MechLocation enum value
  // (e.g. 'Head' / 'Left Arm') rather than the abbreviation.
  // ============================================================================
  describe('convertCriticalEntries()', () => {
    it('normalises -Empty-, Empty, and "" slots to null in each location\'s slot list', () => {
      const filler = Array.from({ length: 12 }, () => '-Empty-');
      const headSlots = [
        'Life Support',
        '-Empty-',
        'Cockpit',
        'Empty',
        '',
        'Sensors',
      ];
      const result = convertCriticalEntries([
        { location: 'HD', slots: headSlots },
        { location: 'LT', slots: [...filler] },
        { location: 'RT', slots: [...filler] },
        { location: 'CT', slots: [...filler] },
        { location: 'LA', slots: [...filler] },
        { location: 'RA', slots: [...filler] },
        { location: 'LL', slots: [...filler] },
        { location: 'RL', slots: [...filler] },
      ]);

      // Result key is the MechLocation enum value (display string)
      const head = result.Head;
      expect(head).toBeDefined();
      expect(head[0]).toBe('Life Support');
      expect(head[1]).toBeNull();
      expect(head[2]).toBe('Cockpit');
      expect(head[3]).toBeNull();
      expect(head[4]).toBeNull();
      expect(head[5]).toBe('Sensors');
    });

    it('returns an empty object when given no entries', () => {
      expect(convertCriticalEntries([])).toEqual({});
    });
  });

  // ============================================================================
  // convertFluffData() — returns undefined when no source fluff fields exist
  // ============================================================================
  describe('convertFluffData()', () => {
    it('returns undefined when no fluff_text / manufacturers / system_manufacturers', () => {
      const unit = buildSourceUnit();
      expect(convertFluffData(unit)).toBeUndefined();
    });

    it('extracts overview/capabilities/history/deployment from fluff_text', () => {
      const unit = buildSourceUnit({
        fluff_text: {
          overview: 'A',
          capabilities: 'B',
          history: 'C',
          deployment: 'D',
        },
      });
      const fluff = convertFluffData(unit);
      expect(fluff?.overview).toBe('A');
      expect(fluff?.capabilities).toBe('B');
      expect(fluff?.history).toBe('C');
      expect(fluff?.deployment).toBe('D');
    });

    it('extracts the first manufacturer + its location into manufacturer/primaryFactory', () => {
      const unit = buildSourceUnit({
        manufacturers: [
          { name: 'Defiance Industries', location: 'Hesperus II' },
          { name: 'Other', location: 'Other Factory' },
        ],
      });
      const fluff = convertFluffData(unit);
      expect(fluff?.manufacturer).toBe('Defiance Industries');
      expect(fluff?.primaryFactory).toBe('Hesperus II');
    });

    it('lowercases system_manufacturers type as the systemManufacturer key', () => {
      const unit = buildSourceUnit({
        system_manufacturers: [
          { type: 'ENGINE', name: 'GM 300' },
          { type: 'ARMOR', name: 'Kallon' },
        ],
      });
      const fluff = convertFluffData(unit);
      expect(fluff?.systemManufacturer).toEqual({
        engine: 'GM 300',
        armor: 'Kallon',
      });
    });
  });
});
