/**
 * MTFParser.mapping Tests
 *
 * Tier 1 invariant tests for the pure-function mapping helpers used by the MTF
 * parser. These functions are the single source of truth for translating raw
 * MTF text values (era years, tech-base strings, engine/structure/armor names,
 * location labels) into the canonical enum-style identifiers consumed by
 * `ISerializedUnit` downstream.
 *
 * Each test asserts a concrete invariant pulled from the BattleTech rules
 * and/or MegaMekLab MUL conventions — boundary years for era buckets, the
 * canonical engine/structure/armor type tokens, and the deterministic
 * normalization rules for equipment IDs and unit IDs. Internal call shape is
 * never asserted; only the input → output contract.
 */

import {
  generateUnitId,
  mapArmorType,
  mapEngineType,
  mapEraFromYear,
  mapRulesLevel,
  mapStructureType,
  mapTechBase,
  normalizeEquipmentId,
  normalizeLocation,
} from '../MTFParser.mapping';

describe('MTFParser.mapping', () => {
  // ============================================================================
  // mapEraFromYear() — era boundary table from BT canon
  // ============================================================================
  describe('mapEraFromYear()', () => {
    it.each([
      [1900, 'EARLY_SPACEFLIGHT'],
      [2004, 'EARLY_SPACEFLIGHT'],
      [2005, 'AGE_OF_WAR'],
      [2569, 'AGE_OF_WAR'],
      [2570, 'STAR_LEAGUE'],
      [2780, 'STAR_LEAGUE'],
      [2781, 'EARLY_SUCCESSION_WARS'],
      [2900, 'EARLY_SUCCESSION_WARS'],
      [2901, 'LATE_SUCCESSION_WARS'],
      [3019, 'LATE_SUCCESSION_WARS'],
      [3020, 'RENAISSANCE'],
      [3049, 'RENAISSANCE'],
      [3050, 'CLAN_INVASION'],
      [3060, 'CLAN_INVASION'],
      [3061, 'CIVIL_WAR'],
      [3067, 'CIVIL_WAR'],
      [3068, 'JIHAD'],
      [3080, 'JIHAD'],
      [3081, 'DARK_AGE'],
      [3150, 'DARK_AGE'],
      [3151, 'IL_CLAN'],
      [3200, 'IL_CLAN'],
    ])('year %i maps to era %s', (year, expected) => {
      expect(mapEraFromYear(year)).toBe(expected);
    });
  });

  // ============================================================================
  // mapTechBase()
  // ============================================================================
  describe('mapTechBase()', () => {
    it('maps Inner Sphere to INNER_SPHERE', () => {
      expect(mapTechBase('Inner Sphere')).toBe('INNER_SPHERE');
    });

    it('maps Clan to CLAN', () => {
      expect(mapTechBase('Clan')).toBe('CLAN');
    });

    it('maps Mixed (IS Chassis) to MIXED', () => {
      expect(mapTechBase('Mixed (IS Chassis)')).toBe('MIXED');
    });

    it('maps Mixed (Clan Chassis) to MIXED (mixed wins over clan)', () => {
      expect(mapTechBase('Mixed (Clan Chassis)')).toBe('MIXED');
    });

    it('falls back to INNER_SPHERE for unknown tokens', () => {
      expect(mapTechBase('Primitive')).toBe('INNER_SPHERE');
    });

    it('is case-insensitive', () => {
      expect(mapTechBase('CLAN')).toBe('CLAN');
      expect(mapTechBase('clan')).toBe('CLAN');
    });
  });

  // ============================================================================
  // mapRulesLevel()
  // ============================================================================
  describe('mapRulesLevel()', () => {
    it('maps "1" to INTRODUCTORY', () => {
      expect(mapRulesLevel('1')).toBe('INTRODUCTORY');
    });

    it('maps "2" to STANDARD', () => {
      expect(mapRulesLevel('2')).toBe('STANDARD');
    });

    it('maps "3" to ADVANCED', () => {
      expect(mapRulesLevel('3')).toBe('ADVANCED');
    });

    it('maps "4" to EXPERIMENTAL', () => {
      expect(mapRulesLevel('4')).toBe('EXPERIMENTAL');
    });

    it('falls back to STANDARD for unknown values', () => {
      expect(mapRulesLevel('')).toBe('STANDARD');
      expect(mapRulesLevel('99')).toBe('STANDARD');
    });
  });

  // ============================================================================
  // mapEngineType() — order-sensitive: XXL beats XL, XL+clan beats XL alone
  // ============================================================================
  describe('mapEngineType()', () => {
    it('detects XXL before XL', () => {
      expect(mapEngineType('300 XXL Fusion Engine')).toBe('XXL');
      expect(mapEngineType('XXL Engine (Clan)')).toBe('XXL');
    });

    it('detects XL Clan as XL_CLAN, not generic XL', () => {
      expect(mapEngineType('300 XL (Clan) Fusion Engine')).toBe('XL_CLAN');
    });

    it('detects XL (IS) as XL', () => {
      expect(mapEngineType('300 XL Fusion Engine')).toBe('XL');
    });

    it('detects Light Fusion', () => {
      expect(mapEngineType('Light Fusion Engine')).toBe('LIGHT');
    });

    it('detects Compact Fusion', () => {
      expect(mapEngineType('Compact Fusion Engine')).toBe('COMPACT');
    });

    it('detects ICE engines', () => {
      expect(mapEngineType('I.C.E. Engine')).toBe('ICE');
    });

    it('detects Fuel Cell engines (with hyphen and space variants)', () => {
      expect(mapEngineType('Fuel Cell Engine')).toBe('FUEL_CELL');
      expect(mapEngineType('Fuel-Cell Engine')).toBe('FUEL_CELL');
    });

    it('detects Fission engines', () => {
      expect(mapEngineType('Fission Engine')).toBe('FISSION');
    });

    it('falls back to FUSION for plain Fusion engines', () => {
      expect(mapEngineType('Fusion Engine')).toBe('FUSION');
      expect(mapEngineType('Standard')).toBe('FUSION');
    });
  });

  // ============================================================================
  // mapStructureType() — order-sensitive: Endo Composite beats Endo+Composite
  // ============================================================================
  describe('mapStructureType()', () => {
    it('maps Endo-Composite to ENDO_COMPOSITE (must beat Endo and Composite alone)', () => {
      expect(mapStructureType('Endo-Composite')).toBe('ENDO_COMPOSITE');
    });

    it('maps Clan Endo Steel to ENDO_STEEL_CLAN (must beat plain Endo)', () => {
      expect(mapStructureType('Clan Endo Steel')).toBe('ENDO_STEEL_CLAN');
    });

    it('maps IS Endo Steel to ENDO_STEEL', () => {
      expect(mapStructureType('IS Endo Steel')).toBe('ENDO_STEEL');
    });

    it('maps Reinforced to REINFORCED', () => {
      expect(mapStructureType('Reinforced')).toBe('REINFORCED');
    });

    it('maps Composite to COMPOSITE', () => {
      expect(mapStructureType('Composite')).toBe('COMPOSITE');
    });

    it('maps Industrial to INDUSTRIAL', () => {
      expect(mapStructureType('Industrial')).toBe('INDUSTRIAL');
    });

    it('falls back to STANDARD for plain or unknown structures', () => {
      expect(mapStructureType('IS Standard')).toBe('STANDARD');
      expect(mapStructureType('')).toBe('STANDARD');
    });
  });

  // ============================================================================
  // mapArmorType() — order-sensitive: stealth/reactive/reflective/hardened win
  //                                    over generic ferro variants
  // ============================================================================
  describe('mapArmorType()', () => {
    it('maps Stealth (highest precedence)', () => {
      expect(mapArmorType('Stealth')).toBe('STEALTH');
    });

    it('maps Reactive', () => {
      expect(mapArmorType('Reactive')).toBe('REACTIVE');
    });

    it('maps Reflective', () => {
      expect(mapArmorType('Reflective')).toBe('REFLECTIVE');
    });

    it('maps Hardened', () => {
      expect(mapArmorType('Hardened')).toBe('HARDENED');
    });

    it('maps Heavy Ferro-Fibrous to HEAVY_FERRO (beats plain ferro)', () => {
      expect(mapArmorType('Heavy Ferro-Fibrous')).toBe('HEAVY_FERRO');
    });

    it('maps Light Ferro-Fibrous to LIGHT_FERRO', () => {
      expect(mapArmorType('Light Ferro-Fibrous')).toBe('LIGHT_FERRO');
    });

    it('maps Clan Ferro-Fibrous to FERRO_FIBROUS_CLAN (beats plain ferro)', () => {
      expect(mapArmorType('Clan Ferro-Fibrous')).toBe('FERRO_FIBROUS_CLAN');
    });

    it('maps plain Ferro-Fibrous to FERRO_FIBROUS', () => {
      expect(mapArmorType('Ferro-Fibrous')).toBe('FERRO_FIBROUS');
    });

    it('falls back to STANDARD', () => {
      expect(mapArmorType('Standard(Inner Sphere)')).toBe('STANDARD');
      expect(mapArmorType('')).toBe('STANDARD');
    });
  });

  // ============================================================================
  // normalizeEquipmentId() — deterministic ID slug builder
  // ============================================================================
  describe('normalizeEquipmentId()', () => {
    it('lowercases names', () => {
      expect(normalizeEquipmentId('Medium Laser')).toBe('medium-laser');
    });

    it('replaces spaces with hyphens', () => {
      expect(normalizeEquipmentId('ER Large Laser')).toBe('er-large-laser');
    });

    it('strips parentheses entirely', () => {
      expect(normalizeEquipmentId('Gauss Rifle (Clan)')).toBe(
        'clan-gauss-rifle',
      );
    });

    it('replaces slashes with hyphens (e.g. AC/20 -> ac-20)', () => {
      expect(normalizeEquipmentId('AC/20')).toBe('ac-20');
    });

    it('collapses multi-space runs to a single hyphen', () => {
      expect(normalizeEquipmentId('Large  Pulse   Laser')).toBe(
        'large-pulse-laser',
      );
    });
  });

  // ============================================================================
  // normalizeLocation() — table for the canonical mech locations
  // ============================================================================
  describe('normalizeLocation()', () => {
    it.each([
      ['Left Arm', 'LEFT_ARM'],
      ['Right Arm', 'RIGHT_ARM'],
      ['Left Torso', 'LEFT_TORSO'],
      ['Right Torso', 'RIGHT_TORSO'],
      ['Center Torso', 'CENTER_TORSO'],
      ['Head', 'HEAD'],
      ['Left Leg', 'LEFT_LEG'],
      ['Right Leg', 'RIGHT_LEG'],
      ['Front Left Leg', 'FRONT_LEFT_LEG'],
      ['Front Right Leg', 'FRONT_RIGHT_LEG'],
      ['Rear Left Leg', 'REAR_LEFT_LEG'],
      ['Rear Right Leg', 'REAR_RIGHT_LEG'],
    ])('"%s" maps to %s', (input, expected) => {
      expect(normalizeLocation(input)).toBe(expected);
    });

    it('falls back to upper-snake-case for unknown locations', () => {
      expect(normalizeLocation('Center Leg')).toBe('CENTER_LEG');
      expect(normalizeLocation('Some Other Slot')).toBe('SOME_OTHER_SLOT');
    });
  });

  // ============================================================================
  // generateUnitId() — must match the ID slug pattern for unit lookups
  // ============================================================================
  describe('generateUnitId()', () => {
    it('joins chassis and model with hyphen and lowercases', () => {
      expect(generateUnitId('Atlas', 'AS7-D')).toBe('atlas-as7-d');
    });

    it('strips parentheses', () => {
      expect(generateUnitId('Marauder II', 'MAD-4A (Bounty Hunter)')).toBe(
        'marauder-ii-mad-4a-bounty-hunter',
      );
    });

    it('replaces slashes with hyphens', () => {
      expect(generateUnitId('Some Mech', 'X/Y')).toBe('some-mech-x-y');
    });

    it('replaces spaces with hyphens', () => {
      expect(generateUnitId('King Crab', 'KGC-000')).toBe('king-crab-kgc-000');
    });
  });
});
