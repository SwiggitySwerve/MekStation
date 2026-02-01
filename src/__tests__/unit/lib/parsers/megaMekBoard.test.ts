/**
 * Tests for MegaMek .board file parser
 */

import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { join } from 'path';
import { parseMegaMekBoard } from '@/lib/parsers/megaMekBoard';
import { TerrainType } from '@/types/gameplay/TerrainTypes';

describe('parseMegaMekBoard', () => {
  describe('basic parsing', () => {
    it('should parse size line correctly', () => {
      const content = `size 16 17
end`;
      const result = parseMegaMekBoard(content);
      expect(result.width).toBe(16);
      expect(result.height).toBe(17);
      expect(result.hexes).toHaveLength(0);
    });

    it('should parse empty hex', () => {
      const content = `size 2 2
hex 0101 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes).toHaveLength(1);
      expect(result.hexes[0]).toEqual({
        coordinate: { q: 0, r: 0 },
        elevation: 0,
        features: [],
      });
    });

    it('should parse hex with elevation', () => {
      const content = `size 2 2
hex 0101 3 "" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].elevation).toBe(3);
    });
  });

  describe('coordinate conversion', () => {
    it('should convert offset coords to axial (0101)', () => {
      const content = `size 2 2
hex 0101 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].coordinate).toEqual({ q: 0, r: 0 });
    });

    it('should convert offset coords to axial (0201)', () => {
      const content = `size 2 2
hex 0201 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      // col=2, row=1: q = 2-1 = 1, r = 1-1 - floor(1/2) = 0
      expect(result.hexes[0].coordinate).toEqual({ q: 1, r: 0 });
    });

    it('should convert offset coords to axial (0102)', () => {
      const content = `size 2 2
hex 0102 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      // col=1, row=2: q = 1-1 = 0, r = 2-1 - floor(0/2) = 1
      expect(result.hexes[0].coordinate).toEqual({ q: 0, r: 1 });
    });

    it('should convert offset coords to axial (0202)', () => {
      const content = `size 2 2
hex 0202 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      // col=2, row=2: q = 2-1 = 1, r = 2-1 - floor(1/2) = 1 - 0 = 1
      expect(result.hexes[0].coordinate).toEqual({ q: 1, r: 1 });
    });

    it('should convert offset coords to axial (0303)', () => {
      const content = `size 3 3
hex 0303 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      // col=3, row=3: q = 3-1 = 2, r = 3-1 - floor(2/2) = 2 - 1 = 1
      expect(result.hexes[0].coordinate).toEqual({ q: 2, r: 1 });
    });
  });

  describe('single terrain features', () => {
    it('should parse light woods (woods:1)', () => {
      const content = `size 2 2
hex 0101 0 "woods:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(1);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.LightWoods,
        level: 1,
      });
    });

    it('should parse heavy woods (woods:2)', () => {
      const content = `size 2 2
hex 0101 0 "woods:2" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.HeavyWoods,
        level: 2,
      });
    });

    it('should parse water with level', () => {
      const content = `size 2 2
hex 0101 0 "water:2" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Water,
        level: 2,
      });
    });

    it('should parse rough terrain', () => {
      const content = `size 2 2
hex 0101 0 "rough:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Rough,
        level: 1,
      });
    });

    it('should parse rubble', () => {
      const content = `size 2 2
hex 0101 0 "rubble:3" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Rubble,
        level: 3,
      });
    });

    it('should parse pavement', () => {
      const content = `size 2 2
hex 0101 0 "pavement:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Pavement,
        level: 1,
      });
    });

    it('should parse road', () => {
      const content = `size 2 2
hex 0101 0 "road:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Road,
        level: 1,
      });
    });

    it('should parse mud', () => {
      const content = `size 2 2
hex 0101 0 "mud:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Mud,
        level: 1,
      });
    });

    it('should parse sand', () => {
      const content = `size 2 2
hex 0101 0 "sand:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Sand,
        level: 1,
      });
    });

    it('should parse snow', () => {
      const content = `size 2 2
hex 0101 0 "snow:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Snow,
        level: 1,
      });
    });

    it('should parse ice', () => {
      const content = `size 2 2
hex 0101 0 "ice:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Ice,
        level: 1,
      });
    });

    it('should parse swamp', () => {
      const content = `size 2 2
hex 0101 0 "swamp:2" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Swamp,
        level: 2,
      });
    });
  });

  describe('building terrain', () => {
    it('should parse building with construction factor', () => {
      const content = `size 2 2
hex 0101 0 "building:2;bldg_cf:40" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(1);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Building,
        level: 2,
        constructionFactor: 40,
      });
    });

    it('should parse building without CF', () => {
      const content = `size 2 2
hex 0101 0 "building:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features[0]).toEqual({
        type: TerrainType.Building,
        level: 1,
      });
    });
  });

  describe('multi-terrain hexes', () => {
    it('should parse woods and water', () => {
      const content = `size 2 2
hex 0101 0 "woods:1;water:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(2);
      expect(result.hexes[0].features).toContainEqual({
        type: TerrainType.LightWoods,
        level: 1,
      });
      expect(result.hexes[0].features).toContainEqual({
        type: TerrainType.Water,
        level: 1,
      });
    });

    it('should parse rough and pavement', () => {
      const content = `size 2 2
hex 0101 0 "rough:1;pavement:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(2);
      expect(result.hexes[0].features).toContainEqual({
        type: TerrainType.Rough,
        level: 1,
      });
      expect(result.hexes[0].features).toContainEqual({
        type: TerrainType.Pavement,
        level: 1,
      });
    });

    it('should parse building with CF and other terrain', () => {
      const content = `size 2 2
hex 0101 0 "building:2;bldg_cf:40;rubble:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(2);
      expect(result.hexes[0].features).toContainEqual({
        type: TerrainType.Building,
        level: 2,
        constructionFactor: 40,
      });
      expect(result.hexes[0].features).toContainEqual({
        type: TerrainType.Rubble,
        level: 1,
      });
    });
  });

  describe('full board parsing', () => {
    it('should parse sample.board fixture', () => {
      const fixturePath = join(__dirname, '../../../../lib/parsers/__fixtures__/sample.board');
      const content = readFileSync(fixturePath, 'utf-8');
      const result = parseMegaMekBoard(content);

      expect(result.width).toBe(16);
      expect(result.height).toBe(17);
      expect(result.hexes.length).toBeGreaterThan(0);

      // Verify specific hexes
      const hex0101 = result.hexes.find((h) => h.coordinate.q === 0 && h.coordinate.r === 0);
      expect(hex0101).toBeDefined();
      expect(hex0101?.features).toContainEqual({
        type: TerrainType.LightWoods,
        level: 1,
      });

      const hex0109 = result.hexes.find((h) => h.coordinate.q === 0 && h.coordinate.r === 8);
      expect(hex0109).toBeDefined();
      expect(hex0109?.features).toContainEqual({
        type: TerrainType.Building,
        level: 2,
        constructionFactor: 40,
      });
    });
  });

  describe('edge cases', () => {
    it('should handle missing end tag', () => {
      const content = `size 2 2
hex 0101 0 "" ""`;
      const result = parseMegaMekBoard(content);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    });

    it('should skip option lines', () => {
      const content = `size 2 2
option exit_roads_to_pavement false
hex 0101 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes).toHaveLength(1);
    });

    it('should handle empty terrain string', () => {
      const content = `size 2 2
hex 0101 0 "" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(0);
    });

    it('should ignore unknown terrain types', () => {
      const content = `size 2 2
hex 0101 0 "unknown:1;woods:1" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(1);
      expect(result.hexes[0].features[0].type).toBe(TerrainType.LightWoods);
    });

    it('should handle bldg_cf without building terrain', () => {
      const content = `size 2 2
hex 0101 0 "bldg_cf:40" ""
end`;
      const result = parseMegaMekBoard(content);
      expect(result.hexes[0].features).toHaveLength(0);
    });
  });

  describe('error handling', () => {
    it('should throw on missing size line', () => {
      const content = `hex 0101 0 "" ""
end`;
      expect(() => parseMegaMekBoard(content)).toThrow('Missing size declaration');
    });

    it('should throw on invalid size format', () => {
      const content = `size invalid
end`;
      expect(() => parseMegaMekBoard(content)).toThrow('Invalid size format');
    });

    it('should throw on invalid hex coordinate', () => {
      const content = `size 2 2
hex XXXX 0 "" ""
end`;
      expect(() => parseMegaMekBoard(content)).toThrow('Invalid hex coordinate');
    });

    it('should throw on invalid elevation', () => {
      const content = `size 2 2
hex 0101 invalid "" ""
end`;
      expect(() => parseMegaMekBoard(content)).toThrow('Invalid elevation');
    });
  });
});
