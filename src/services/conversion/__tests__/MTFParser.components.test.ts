/**
 * MTFParser.components Tests
 *
 * Tier 1 invariant tests for the engine / heat-sink / armor block parsers.
 * These functions read raw MTF lines and produce structured component data;
 * the round-trip pipeline relies on them to extract values that downstream
 * BV calculations and validators consume.
 *
 * Tests assert the literal contract: numeric ratings, type tokens, and the
 * front/rear vs simple-number armor allocation shape (front/rear pairs only
 * for the three torso locations).
 */

import {
  parseArmor,
  parseEngine,
  parseHeatSinks,
} from '../MTFParser.components';

describe('MTFParser.components', () => {
  // ============================================================================
  // parseEngine() — extracts rating + type from "engine:NNN <type>"
  // ============================================================================
  describe('parseEngine()', () => {
    it('extracts rating and type from a standard engine line', () => {
      const lines = ['engine:300 Fusion Engine'];
      expect(parseEngine(lines)).toEqual({
        rating: 300,
        type: 'Fusion Engine',
      });
    });

    it('handles XL engines', () => {
      const lines = ['engine:280 XL Fusion Engine'];
      expect(parseEngine(lines)).toEqual({
        rating: 280,
        type: 'XL Fusion Engine',
      });
    });

    it('handles Clan XL engines with parenthetical', () => {
      const lines = ['engine:300 XL Fusion Engine (Clan)'];
      expect(parseEngine(lines)).toEqual({
        rating: 300,
        type: 'XL Fusion Engine (Clan)',
      });
    });

    it('returns default Fusion/0 when no engine field present', () => {
      const lines = ['chassis:Atlas'];
      expect(parseEngine(lines)).toEqual({ type: 'Fusion', rating: 0 });
    });

    it('returns rating 0 when value does not start with a number', () => {
      const lines = ['engine:Fusion Engine'];
      expect(parseEngine(lines)).toEqual({ type: 'Fusion Engine', rating: 0 });
    });

    it('trims whitespace around type token', () => {
      const lines = ['engine:255   Light Fusion Engine'];
      expect(parseEngine(lines)).toEqual({
        rating: 255,
        type: 'Light Fusion Engine',
      });
    });
  });

  // ============================================================================
  // parseHeatSinks() — extracts count + type from "heat sinks:N <type>"
  // ============================================================================
  describe('parseHeatSinks()', () => {
    it('extracts count and type from a Single line', () => {
      const lines = ['heat sinks:10 Single'];
      expect(parseHeatSinks(lines)).toEqual({ count: 10, type: 'Single' });
    });

    it('extracts count and type from a Double line', () => {
      const lines = ['heat sinks:14 Double'];
      expect(parseHeatSinks(lines)).toEqual({ count: 14, type: 'Double' });
    });

    it('returns default Single/10 when no heat sinks field present', () => {
      expect(parseHeatSinks([])).toEqual({ type: 'Single', count: 10 });
    });

    it('returns default Single/10 when value cannot be parsed', () => {
      const lines = ['heat sinks:Unknown'];
      expect(parseHeatSinks(lines)).toEqual({ type: 'Single', count: 10 });
    });
  });

  // ============================================================================
  // parseArmor() — front/rear-pair shape for torsos, simple number elsewhere
  // ============================================================================
  describe('parseArmor()', () => {
    it('returns torso allocations as front/rear pair objects', () => {
      const lines = [
        'armor:Standard(Inner Sphere)',
        'LA armor:34',
        'RA armor:34',
        'LT armor:32',
        'RT armor:32',
        'CT armor:47',
        'HD armor:9',
        'LL armor:41',
        'RL armor:41',
        'RTL armor:10',
        'RTR armor:10',
        'RTC armor:14',
      ];

      const result = parseArmor(lines);

      expect(result.type).toBe('Standard(Inner Sphere)');
      expect(result.allocation.LEFT_ARM).toBe(34);
      expect(result.allocation.RIGHT_ARM).toBe(34);
      expect(result.allocation.HEAD).toBe(9);
      expect(result.allocation.LEFT_LEG).toBe(41);
      expect(result.allocation.RIGHT_LEG).toBe(41);
      expect(result.allocation.LEFT_TORSO).toEqual({ front: 32, rear: 10 });
      expect(result.allocation.RIGHT_TORSO).toEqual({ front: 32, rear: 10 });
      expect(result.allocation.CENTER_TORSO).toEqual({ front: 47, rear: 14 });
    });

    it('defaults rear to 0 if rear armor field is missing for a torso', () => {
      const lines = [
        'armor:Standard',
        'LT armor:20',
        // No RTL armor
      ];
      const result = parseArmor(lines);
      expect(result.allocation.LEFT_TORSO).toEqual({ front: 20, rear: 0 });
    });

    it('handles quad legs (FLL/FRL/RLL/RRL armor fields)', () => {
      const lines = [
        'armor:Standard',
        'FLL armor:24',
        'FRL armor:24',
        'RLL armor:24',
        'RRL armor:24',
      ];
      const result = parseArmor(lines);
      expect(result.allocation.FRONT_LEFT_LEG).toBe(24);
      expect(result.allocation.FRONT_RIGHT_LEG).toBe(24);
      expect(result.allocation.REAR_LEFT_LEG).toBe(24);
      expect(result.allocation.REAR_RIGHT_LEG).toBe(24);
    });

    it('handles tripod center leg (CL armor)', () => {
      const lines = ['armor:Standard', 'CL armor:18'];
      const result = parseArmor(lines);
      expect(result.allocation.CENTER_LEG).toBe(18);
    });

    it('falls back to default armor type when missing', () => {
      const result = parseArmor([]);
      expect(result.type).toBe('Standard(Inner Sphere)');
      expect(result.allocation).toEqual({});
    });

    it('parses values with location prefix delimiter (e.g. "RT armor:32:Foo")', () => {
      // The implementation takes the LAST colon-separated segment as the value.
      const lines = ['armor:Standard', 'RT armor:somelabel:32', 'RTR armor:5'];
      const result = parseArmor(lines);
      expect(result.allocation.RIGHT_TORSO).toEqual({ front: 32, rear: 5 });
    });
  });
});
