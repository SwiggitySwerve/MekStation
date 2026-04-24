/**
 * Tests: terrainVisualMap
 *
 * Covers `terrain-rendering` spec requirements:
 *  - Homemade Terrain Art Catalog -> every terrain type resolves to
 *    exactly one SVG asset URL under public/sprites/terrain/.
 *  - Density variants resolve to different assets.
 *
 * Covers `terrain-system` spec requirements:
 *  - Each terrain type declares a `visualKey`; density variants expose
 *    distinct keys.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { TerrainType } from '@/types/gameplay/TerrainTypes';

import {
  TERRAIN_VISUAL_KEYS,
  assetUrlFor,
  symbolIdFor,
  visualKeyFor,
} from '../terrainVisualMap';

const publicSpritesRoot = path.join(
  process.cwd(),
  'public',
  'sprites',
  'terrain',
);

describe('terrainVisualMap — Homemade Terrain Art Catalog (spec: every type has a visual key)', () => {
  const specTypes: ReadonlyArray<{
    key: string;
    type: TerrainType;
    level: number;
  }> = [
    { key: 'clear', type: TerrainType.Clear, level: 0 },
    { key: 'light-woods', type: TerrainType.LightWoods, level: 1 },
    { key: 'heavy-woods', type: TerrainType.HeavyWoods, level: 2 },
    { key: 'light-building', type: TerrainType.Building, level: 1 },
    { key: 'medium-building', type: TerrainType.Building, level: 2 },
    { key: 'heavy-building', type: TerrainType.Building, level: 3 },
    { key: 'hardened-building', type: TerrainType.Building, level: 4 },
    { key: 'shallow-water', type: TerrainType.Water, level: 0 },
    { key: 'deep-water', type: TerrainType.Water, level: 2 },
    { key: 'rough', type: TerrainType.Rough, level: 0 },
    { key: 'rubble', type: TerrainType.Rubble, level: 0 },
    { key: 'pavement', type: TerrainType.Pavement, level: 0 },
  ];

  specTypes.forEach(({ key, type, level }) => {
    it(`${key}: resolves to exactly one asset`, () => {
      const resolved = visualKeyFor(type, level);
      expect(resolved).toBe(key);
    });

    it(`${key}: asset URL lives under public/sprites/terrain/`, () => {
      const url = assetUrlFor(key as (typeof TERRAIN_VISUAL_KEYS)[number]);
      expect(url).toBe(`/sprites/terrain/${key}.svg`);
    });

    it(`${key}: asset file exists on disk (homemade art, not a licensed reference)`, () => {
      const filePath = path.join(publicSpritesRoot, `${key}.svg`);
      expect(fs.existsSync(filePath)).toBe(true);

      // Spec: asset SHALL be homemade (no licensed art reference). We
      // enforce by checking the file has no external `<image>` tags
      // (a licensed raster reference) and is pure inline SVG shapes.
      const contents = fs.readFileSync(filePath, 'utf8');
      expect(contents).not.toMatch(/<image[^>]*xlink:href/i);
      expect(contents).not.toMatch(/<image[^>]*href\s*=/i);
    });
  });

  it('exposes the exact 12 keys called out by the spec', () => {
    expect([...TERRAIN_VISUAL_KEYS].sort()).toEqual(
      [
        'clear',
        'deep-water',
        'hardened-building',
        'heavy-building',
        'heavy-woods',
        'light-building',
        'light-woods',
        'medium-building',
        'pavement',
        'rough',
        'rubble',
        'shallow-water',
      ].sort(),
    );
  });
});

describe('terrainVisualMap — Density variants resolve to different assets', () => {
  it('light woods vs heavy woods resolve to different keys', () => {
    expect(visualKeyFor(TerrainType.LightWoods, 1)).toBe('light-woods');
    expect(visualKeyFor(TerrainType.HeavyWoods, 1)).toBe('heavy-woods');
    expect(visualKeyFor(TerrainType.LightWoods, 1)).not.toBe(
      visualKeyFor(TerrainType.HeavyWoods, 1),
    );
  });

  it('building densities map to distinct keys', () => {
    expect(visualKeyFor(TerrainType.Building, 1)).toBe('light-building');
    expect(visualKeyFor(TerrainType.Building, 2)).toBe('medium-building');
    expect(visualKeyFor(TerrainType.Building, 3)).toBe('heavy-building');
    expect(visualKeyFor(TerrainType.Building, 4)).toBe('hardened-building');
  });

  it('water depth 0/1 resolves to shallow; depth 2+ to deep', () => {
    expect(visualKeyFor(TerrainType.Water, 0)).toBe('shallow-water');
    expect(visualKeyFor(TerrainType.Water, 1)).toBe('shallow-water');
    expect(visualKeyFor(TerrainType.Water, 2)).toBe('deep-water');
    expect(visualKeyFor(TerrainType.Water, 5)).toBe('deep-water');
  });

  it('returns null for terrain types outside the art catalog', () => {
    // Sand, Mud, Snow, Ice, Swamp, Road, Bridge, Fire, Smoke are not
    // part of this change's art set; callers must fall back to flat.
    expect(visualKeyFor(TerrainType.Sand)).toBeNull();
    expect(visualKeyFor(TerrainType.Mud)).toBeNull();
    expect(visualKeyFor(TerrainType.Snow)).toBeNull();
    expect(visualKeyFor(TerrainType.Fire)).toBeNull();
  });

  it('symbolIdFor produces stable, namespaced ids', () => {
    expect(symbolIdFor('clear')).toBe('terrain-clear');
    expect(symbolIdFor('deep-water')).toBe('terrain-deep-water');
    expect(symbolIdFor('hardened-building')).toBe('terrain-hardened-building');
  });
});
