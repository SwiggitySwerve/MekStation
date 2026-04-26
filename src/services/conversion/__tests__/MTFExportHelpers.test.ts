/**
 * MTFExportHelpers Tests
 *
 * Tier 1 invariant tests for the MTF export-side formatters and writers.
 * These functions are the inverse of the MTFParser mapping helpers — they
 * take canonical enum tokens and emit the exact text that MegaMek/MekHQ
 * expect to see in `.mtf` files.
 *
 * Tests assert the literal output strings (exact spelling, capitalisation,
 * punctuation) and the location-order arrays for biped/quad/tripod chassis,
 * because round-trip parity validators compare these byte-for-byte.
 */

import {
  MTF_SLOTS_PER_LOCATION,
  formatArmorType,
  formatConfig,
  formatEngineType,
  formatEquipmentName,
  formatHeatSinkType,
  formatRulesLevel,
  formatStructureType,
  formatTechBase,
  getLocationDisplayName,
  getLocationOrder,
  writeArmorValues,
  writeFluff,
  writeLicenseHeader,
} from '../MTFExportHelpers';

describe('MTFExportHelpers', () => {
  // ============================================================================
  // Constants
  // ============================================================================
  describe('MTF_SLOTS_PER_LOCATION', () => {
    it('is 12 (per MTF format spec for arm/torso slots)', () => {
      expect(MTF_SLOTS_PER_LOCATION).toBe(12);
    });
  });

  // ============================================================================
  // writeLicenseHeader() — must emit the exact MegaMek CC-BY-NC-SA preamble
  // ============================================================================
  describe('writeLicenseHeader()', () => {
    it('emits the Creative Commons license preamble', () => {
      const lines: string[] = [];
      writeLicenseHeader(lines);
      const text = lines.join('\n');
      expect(text).toContain('CC BY-NC-SA 4.0');
      expect(text).toContain(
        'https://creativecommons.org/licenses/by-nc-sa/4.0/',
      );
    });

    it('mentions BattleTech trademarks', () => {
      const lines: string[] = [];
      writeLicenseHeader(lines);
      const text = lines.join('\n');
      expect(text).toContain('MechWarrior');
      expect(text).toContain('Topps Company');
    });

    it('terminates with a blank line so the next field starts cleanly', () => {
      const lines: string[] = [];
      writeLicenseHeader(lines);
      expect(lines[lines.length - 1]).toBe('');
    });
  });

  // ============================================================================
  // formatConfig() — Biped/Quad/Tripod/LAM/QuadVee + Omnimech suffix
  // ============================================================================
  describe('formatConfig()', () => {
    it('formats BIPED as "Biped"', () => {
      expect(formatConfig('BIPED')).toBe('Biped');
    });

    it('formats QUAD as "Quad"', () => {
      expect(formatConfig('QUAD')).toBe('Quad');
    });

    it('formats TRIPOD as "Tripod"', () => {
      expect(formatConfig('TRIPOD')).toBe('Tripod');
    });

    it('formats LAM as "LAM" (no case change)', () => {
      expect(formatConfig('LAM')).toBe('LAM');
    });

    it('formats QUADVEE as "QuadVee"', () => {
      expect(formatConfig('QUADVEE')).toBe('QuadVee');
    });

    it('appends Omnimech suffix when isOmni=true', () => {
      expect(formatConfig('BIPED', true)).toBe('Biped Omnimech');
      expect(formatConfig('QUAD', true)).toBe('Quad Omnimech');
    });

    it('does not append Omnimech when isOmni=false or unset', () => {
      expect(formatConfig('BIPED', false)).toBe('Biped');
      expect(formatConfig('BIPED')).toBe('Biped');
    });

    it('passes through unknown configs untouched', () => {
      expect(formatConfig('UNKNOWN_CONFIG')).toBe('UNKNOWN_CONFIG');
    });
  });

  // ============================================================================
  // formatTechBase() — must emit "Inner Sphere" / "Clan" / "Mixed" exactly
  // ============================================================================
  describe('formatTechBase()', () => {
    it('formats CLAN to "Clan"', () => {
      expect(formatTechBase('CLAN')).toBe('Clan');
    });

    it('formats MIXED to "Mixed"', () => {
      expect(formatTechBase('MIXED')).toBe('Mixed');
    });

    it('formats INNER_SPHERE to "Inner Sphere"', () => {
      expect(formatTechBase('INNER_SPHERE')).toBe('Inner Sphere');
    });

    it('falls back to "Inner Sphere" for unknown values', () => {
      expect(formatTechBase('UNKNOWN')).toBe('Inner Sphere');
    });
  });

  // ============================================================================
  // formatRulesLevel() — must emit "1"/"2"/"3"/"4"
  // ============================================================================
  describe('formatRulesLevel()', () => {
    it.each([
      ['INTRODUCTORY', '1'],
      ['STANDARD', '2'],
      ['ADVANCED', '3'],
      ['EXPERIMENTAL', '4'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatRulesLevel(input)).toBe(expected);
    });

    it('falls back to "2" for unknown levels', () => {
      expect(formatRulesLevel('UNKNOWN')).toBe('2');
    });
  });

  // ============================================================================
  // formatEngineType() — must emit MegaMek-canonical engine strings
  // ============================================================================
  describe('formatEngineType()', () => {
    it.each([
      ['FUSION', 'Fusion Engine'],
      ['STANDARD', 'Fusion Engine'],
      ['XL', 'XL Fusion Engine'],
      ['XL_IS', 'XL Fusion Engine'],
      ['XL_CLAN', 'XL Fusion Engine (Clan)'],
      ['LIGHT', 'Light Fusion Engine'],
      ['COMPACT', 'Compact Fusion Engine'],
      ['XXL', 'XXL Fusion Engine'],
      ['ICE', 'ICE Engine'],
      ['FUEL_CELL', 'Fuel Cell Engine'],
      ['FISSION', 'Fission Engine'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatEngineType(input)).toBe(expected);
    });

    it('falls back to "Fusion Engine" for unknown types', () => {
      expect(formatEngineType('UNKNOWN')).toBe('Fusion Engine');
    });
  });

  // ============================================================================
  // formatStructureType() — must emit MegaMek-canonical structure strings
  // ============================================================================
  describe('formatStructureType()', () => {
    it.each([
      ['STANDARD', 'IS Standard'],
      ['ENDO_STEEL', 'IS Endo Steel'],
      ['ENDO_STEEL_IS', 'IS Endo Steel'],
      ['ENDO_STEEL_CLAN', 'Clan Endo Steel'],
      ['ENDO_COMPOSITE', 'Endo-Composite'],
      ['REINFORCED', 'Reinforced'],
      ['COMPOSITE', 'Composite'],
      ['INDUSTRIAL', 'Industrial'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatStructureType(input)).toBe(expected);
    });

    it('falls back to "IS Standard" for unknown types', () => {
      expect(formatStructureType('UNKNOWN')).toBe('IS Standard');
    });
  });

  // ============================================================================
  // formatHeatSinkType() — must emit "Single" or "Double" only
  // ============================================================================
  describe('formatHeatSinkType()', () => {
    it('formats DOUBLE to "Double"', () => {
      expect(formatHeatSinkType('DOUBLE')).toBe('Double');
    });

    it('formats DOUBLE_IS to "Double"', () => {
      expect(formatHeatSinkType('DOUBLE_IS')).toBe('Double');
    });

    it('formats DOUBLE_CLAN to "Double"', () => {
      expect(formatHeatSinkType('DOUBLE_CLAN')).toBe('Double');
    });

    it('falls back to "Single" for SINGLE or unknown', () => {
      expect(formatHeatSinkType('SINGLE')).toBe('Single');
      expect(formatHeatSinkType('UNKNOWN')).toBe('Single');
    });
  });

  // ============================================================================
  // formatArmorType() — must emit MegaMek-canonical armor strings
  // ============================================================================
  describe('formatArmorType()', () => {
    it.each([
      ['STANDARD', 'Standard(Inner Sphere)'],
      ['FERRO_FIBROUS', 'Ferro-Fibrous'],
      ['FERRO_FIBROUS_IS', 'Ferro-Fibrous'],
      ['FERRO_FIBROUS_CLAN', 'Ferro-Fibrous(Clan)'],
      ['LIGHT_FERRO', 'Light Ferro-Fibrous'],
      ['HEAVY_FERRO', 'Heavy Ferro-Fibrous'],
      ['STEALTH', 'Stealth'],
      ['REACTIVE', 'Reactive'],
      ['REFLECTIVE', 'Reflective'],
      ['HARDENED', 'Hardened'],
    ])('formats %s to "%s"', (input, expected) => {
      expect(formatArmorType(input)).toBe(expected);
    });

    it('falls back to "Standard(Inner Sphere)" for unknown types', () => {
      expect(formatArmorType('UNKNOWN')).toBe('Standard(Inner Sphere)');
    });
  });

  // ============================================================================
  // getLocationOrder() — must return the exact MTF write order per chassis
  // ============================================================================
  describe('getLocationOrder()', () => {
    it('returns the biped order (LA, RA, LT, RT, CT, HD, LL, RL)', () => {
      expect(getLocationOrder('Biped')).toEqual([
        'LEFT_ARM',
        'RIGHT_ARM',
        'LEFT_TORSO',
        'RIGHT_TORSO',
        'CENTER_TORSO',
        'HEAD',
        'LEFT_LEG',
        'RIGHT_LEG',
      ]);
    });

    it('returns the quad order (FLL, FRL, LT, RT, CT, HD, RLL, RRL) for Quad', () => {
      expect(getLocationOrder('Quad')).toEqual([
        'FRONT_LEFT_LEG',
        'FRONT_RIGHT_LEG',
        'LEFT_TORSO',
        'RIGHT_TORSO',
        'CENTER_TORSO',
        'HEAD',
        'REAR_LEFT_LEG',
        'REAR_RIGHT_LEG',
      ]);
    });

    it('returns the quad order for QuadVee', () => {
      expect(getLocationOrder('QuadVee')[0]).toBe('FRONT_LEFT_LEG');
    });

    it('returns the tripod order including CENTER_LEG', () => {
      const order = getLocationOrder('Tripod');
      expect(order).toContain('CENTER_LEG');
      expect(order[order.length - 1]).toBe('CENTER_LEG');
    });

    it('returns biped order for unknown configurations', () => {
      const order = getLocationOrder('Unknown');
      expect(order[0]).toBe('LEFT_ARM');
    });
  });

  // ============================================================================
  // getLocationDisplayName()
  // ============================================================================
  describe('getLocationDisplayName()', () => {
    it.each([
      ['LEFT_ARM', 'Left Arm'],
      ['CENTER_TORSO', 'Center Torso'],
      ['HEAD', 'Head'],
      ['FRONT_LEFT_LEG', 'Front Left Leg'],
      ['CENTER_LEG', 'Center Leg'],
    ])('maps %s to "%s"', (input, expected) => {
      expect(getLocationDisplayName(input)).toBe(expected);
    });

    it('passes through unknown locations unchanged', () => {
      expect(getLocationDisplayName('UNKNOWN_SLOT')).toBe('UNKNOWN_SLOT');
    });
  });

  // ============================================================================
  // writeArmorValues() — must emit MTF armor field lines in the right order
  // ============================================================================
  describe('writeArmorValues()', () => {
    it('emits biped armor lines including front + rear torso splits', () => {
      const lines: string[] = [];
      writeArmorValues(
        lines,
        {
          LEFT_ARM: 34,
          RIGHT_ARM: 34,
          LEFT_TORSO: { front: 32, rear: 10 },
          RIGHT_TORSO: { front: 32, rear: 10 },
          CENTER_TORSO: { front: 47, rear: 14 },
          HEAD: 9,
          LEFT_LEG: 41,
          RIGHT_LEG: 41,
        },
        'Biped',
      );

      expect(lines).toContain('LA armor:34');
      expect(lines).toContain('RA armor:34');
      expect(lines).toContain('LT armor:32');
      expect(lines).toContain('RT armor:32');
      expect(lines).toContain('CT armor:47');
      expect(lines).toContain('HD armor:9');
      expect(lines).toContain('LL armor:41');
      expect(lines).toContain('RL armor:41');
      expect(lines).toContain('RTL armor:10');
      expect(lines).toContain('RTR armor:10');
      expect(lines).toContain('RTC armor:14');
    });

    it('emits quad armor lines using FLL/FRL/RLL/RRL fields', () => {
      const lines: string[] = [];
      writeArmorValues(
        lines,
        {
          FRONT_LEFT_LEG: 24,
          FRONT_RIGHT_LEG: 24,
          LEFT_TORSO: { front: 30, rear: 8 },
          RIGHT_TORSO: { front: 30, rear: 8 },
          CENTER_TORSO: { front: 40, rear: 10 },
          HEAD: 9,
          REAR_LEFT_LEG: 24,
          REAR_RIGHT_LEG: 24,
        },
        'Quad',
      );

      expect(lines).toContain('FLL armor:24');
      expect(lines).toContain('FRL armor:24');
      expect(lines).toContain('RLL armor:24');
      expect(lines).toContain('RRL armor:24');
    });

    it('emits CL armor for tripod configurations', () => {
      const lines: string[] = [];
      writeArmorValues(
        lines,
        {
          LEFT_ARM: 20,
          RIGHT_ARM: 20,
          LEFT_TORSO: { front: 25, rear: 5 },
          RIGHT_TORSO: { front: 25, rear: 5 },
          CENTER_TORSO: { front: 35, rear: 10 },
          HEAD: 9,
          LEFT_LEG: 30,
          RIGHT_LEG: 30,
          CENTER_LEG: 30,
        },
        'Tripod',
      );

      expect(lines).toContain('CL armor:30');
    });

    it('skips locations whose value is undefined', () => {
      const lines: string[] = [];
      writeArmorValues(
        lines,
        {
          LEFT_ARM: 10,
          // others undefined
        },
        'Biped',
      );
      expect(lines).toContain('LA armor:10');
      expect(lines.filter((l) => l.startsWith('RA armor'))).toHaveLength(0);
    });
  });

  // ============================================================================
  // formatEquipmentName() — id slug → display string for MTF lines
  // ============================================================================
  describe('formatEquipmentName()', () => {
    it.each([
      ['medium-laser', 'Medium Laser'],
      ['ppc', 'PPC'],
      ['er-ppc', 'ER PPC'],
      ['lrm-15', 'LRM 15'],
      ['ac-20', 'AC/20'],
      ['gauss-rifle', 'Gauss Rifle'],
    ])('maps slug "%s" to display "%s"', (slug, display) => {
      expect(formatEquipmentName(slug)).toBe(display);
    });

    it('title-cases unknown slug-case strings', () => {
      expect(formatEquipmentName('beagle-active-probe')).toBe(
        'Beagle Active Probe',
      );
    });

    it('handles single-word slugs', () => {
      expect(formatEquipmentName('targeting')).toBe('Targeting');
    });
  });

  // ============================================================================
  // writeFluff() — emits only the keys present in the fluff object
  // ============================================================================
  describe('writeFluff()', () => {
    it('writes overview/capabilities/deployment/history fields with blank-line separators', () => {
      const lines: string[] = [];
      writeFluff(lines, {
        overview: 'A heavy mech.',
        capabilities: 'Long-range firepower.',
        deployment: 'House Davion.',
        history: 'Built in 3025.',
      });

      expect(lines).toContain('overview:A heavy mech.');
      expect(lines).toContain('capabilities:Long-range firepower.');
      expect(lines).toContain('deployment:House Davion.');
      expect(lines).toContain('history:Built in 3025.');

      const overviewIdx = lines.indexOf('overview:A heavy mech.');
      expect(lines[overviewIdx + 1]).toBe('');
    });

    it('writes manufacturer and primaryFactory without blank-line separators', () => {
      const lines: string[] = [];
      writeFluff(lines, {
        manufacturer: 'Defiance Industries',
        primaryFactory: 'Hesperus II',
      });

      expect(lines).toContain('manufacturer:Defiance Industries');
      expect(lines).toContain('primaryfactory:Hesperus II');
    });

    it('writes systemmanufacturer entries one per (system, manufacturer) pair', () => {
      const lines: string[] = [];
      writeFluff(lines, {
        systemManufacturer: {
          ENGINE: 'GM',
          ARMOR: 'Krupp',
        },
      });

      expect(lines).toContain('systemmanufacturer:ENGINE:GM');
      expect(lines).toContain('systemmanufacturer:ARMOR:Krupp');
    });

    it('emits no fluff lines for an empty object', () => {
      const lines: string[] = [];
      writeFluff(lines, {});
      expect(lines).toHaveLength(0);
    });
  });
});
