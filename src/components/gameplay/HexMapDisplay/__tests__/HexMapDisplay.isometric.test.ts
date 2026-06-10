import type {
  IHexTerrain,
  IUnitToken,
  MapIsometricRotationStep,
} from '@/types/gameplay';

import { Facing, GameSide, TerrainType, TokenUnitType } from '@/types/gameplay';

import {
  buildIsometricSceneItems,
  type IsometricSceneItem,
} from '../HexMapDisplay.isometric';
import {
  deriveIsometricTerrainOcclusionInfoByUnit,
  deriveIsometricTerrainOccluderInfo,
  deriveIsometricTerrainOcclusionInfo,
  getMapProjectionTransform,
  rotateAxialCamera,
} from '../projection';
import { hexToPixel } from '../renderHelpers';

function makeTerrain(
  q: number,
  r: number,
  elevation: number,
  type: TerrainType = TerrainType.Clear,
): IHexTerrain {
  return {
    coordinate: { q, r },
    elevation,
    features: [{ type, level: 0 }],
  };
}

function makeTerrainLookup(
  terrain: readonly IHexTerrain[],
): ReadonlyMap<string, IHexTerrain> {
  return new Map(
    terrain.map((hexTerrain) => [
      `${hexTerrain.coordinate.q},${hexTerrain.coordinate.r}`,
      hexTerrain,
    ]),
  );
}

function makeToken(overrides: Partial<IUnitToken> = {}): IUnitToken {
  return {
    unitId: 'unit',
    name: 'Unit',
    side: GameSide.Player,
    position: { q: 0, r: 0 },
    facing: Facing.North,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: false,
    designation: 'UNT',
    unitType: TokenUnitType.Mech,
    ...overrides,
  } as IUnitToken;
}

function isHexItem(
  item: IsometricSceneItem,
): item is Extract<IsometricSceneItem, { readonly kind: 'hex' }> {
  return item.kind === 'hex';
}

function isTokenItem(
  item: IsometricSceneItem,
): item is Extract<IsometricSceneItem, { readonly kind: 'token' }> {
  return item.kind === 'token';
}

/**
 * SVG affine matrix [a b c d e f] (matching SVG's matrix(a b c d e f)
 * parameter order). Used to verify the composed layer transform against the
 * depth model's assumed geometry.
 */
type SvgMatrix = readonly [number, number, number, number, number, number];

/** Multiply two SVG matrices: the result applies m2 to points first, then m1. */
function multiplyMatrices(m1: SvgMatrix, m2: SvgMatrix): SvgMatrix {
  const [a1, b1, c1, d1, e1, f1] = m1;
  const [a2, b2, c2, d2, e2, f2] = m2;
  return [
    a1 * a2 + c1 * b2,
    b1 * a2 + d1 * b2,
    a1 * c2 + c1 * d2,
    b1 * c2 + d1 * d2,
    a1 * e2 + c1 * f2 + e1,
    b1 * e2 + d1 * f2 + f1,
  ];
}

/** Apply an SVG matrix to a point. */
function applyMatrix(
  m: SvgMatrix,
  point: { readonly x: number; readonly y: number },
): { x: number; y: number } {
  const [a, b, c, d, e, f] = m;
  return { x: a * point.x + c * point.y + e, y: b * point.x + d * point.y + f };
}

/**
 * Parse an SVG transform list ("rotate(deg)" and "matrix(a b c d e f)"
 * tokens) into a single composed matrix. SVG composes list entries
 * left-to-right with the RIGHTMOST entry applied to points first.
 */
function parseSvgTransform(transform: string): SvgMatrix {
  const identity: SvgMatrix = [1, 0, 0, 1, 0, 0];
  const tokens = transform.match(/(rotate|matrix)\(([^)]*)\)/g) ?? [];
  return tokens.reduce<SvgMatrix>((composed, token) => {
    const [, name, args] = token.match(/(rotate|matrix)\(([^)]*)\)/) ?? [];
    const values = (args ?? '')
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    if (name === 'rotate') {
      const radians = ((values[0] ?? 0) * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      return multiplyMatrices(composed, [cos, sin, -sin, cos, 0, 0]);
    }
    return multiplyMatrices(composed, values as unknown as SvgMatrix);
  }, identity);
}

describe('HexMapDisplay isometric projection helpers', () => {
  // Audit 2026-06-09 C-15: the layer transform used to compose
  // rotate-AFTER-shear (`rotate(θ) matrix(shear)` — SVG applies the rightmost
  // entry first, so the shear hit points before the rotation), while the
  // depth/occlusion model (isometricDepthKey → rotateAxialCamera) rotates hex
  // coordinates BEFORE projecting. At rotation steps 2-4 the screen geometry
  // visibly diverged from the assumed paint order. The transform must place
  // each hex exactly where the depth model assumes:
  // shear(hexToPixel(rotateAxial(hex, step))).
  it('matches the depth model geometry at rotation step 2 (rotate before shear)', () => {
    const step = 2;
    const composed = parseSvgTransform(
      getMapProjectionTransform('isometric2d', step) ?? '',
    );
    const shearOnly = parseSvgTransform(
      getMapProjectionTransform('isometric2d', 0) ?? '',
    );
    const sampleHexes = [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
      { q: 2, r: -1 },
      { q: -1, r: 2 },
      { q: 3, r: 1 },
    ];

    for (const hex of sampleHexes) {
      const screen = applyMatrix(composed, hexToPixel(hex));
      const expected = applyMatrix(
        shearOnly,
        hexToPixel(rotateAxialCamera(hex, step)),
      );
      expect(screen.x).toBeCloseTo(expected.x, 6);
      expect(screen.y).toBeCloseTo(expected.y, 6);
    }
  });

  // Audit 2026-06-09 C-15: a full 6-step cycle is a 360° rotation — the
  // composed transform must return every hex to its step-0 screen position.
  it('returns to step-0 screen geometry after a full rotation cycle', () => {
    // The UI wraps step 5 → 0, but the raw matrix at 6 × 60° = 360° must be
    // geometry-identical to step 0 (same invariance the depth tests pin).
    const fullCycle = parseSvgTransform(
      getMapProjectionTransform('isometric2d', 6 as MapIsometricRotationStep) ??
        '',
    );
    const stepZero = parseSvgTransform(
      getMapProjectionTransform('isometric2d', 0) ?? '',
    );
    const point = hexToPixel({ q: 2, r: -1 });

    const cycled = applyMatrix(fullCycle, point);
    const original = applyMatrix(stepZero, point);
    expect(cycled.x).toBeCloseTo(original.x, 6);
    expect(cycled.y).toBeCloseTo(original.y, 6);
  });

  it('changes terrain depth ordering when the isometric camera rotates', () => {
    const terrainLookup = makeTerrainLookup([]);
    const renderedHexes = [
      { q: 1, r: 0 },
      { q: 0, r: 1 },
    ];

    const unrotated = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes,
      tokens: [],
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(),
    });
    const rotated = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes,
      tokens: [],
      terrainLookup,
      rotationStep: 1,
      foregroundUnitIds: new Set(),
    });
    const fullCycle = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes,
      tokens: [],
      terrainLookup,
      rotationStep: 6,
      foregroundUnitIds: new Set(),
    });

    expect(
      unrotated.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['1,0', '0,1']);
    expect(
      rotated.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['0,1', '1,0']);
    expect(
      fullCycle.filter(isHexItem).map((item) => `${item.hex.q},${item.hex.r}`),
    ).toEqual(['1,0', '0,1']);
    expect(fullCycle.map((item) => item.depthKey)).toEqual(
      unrotated.map((item) => item.depthKey),
    );
  });

  it('boosts highlighted units above tall terrain in the isometric scene', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(0, 1, 6, TerrainType.Building),
    ]);
    const ordinary = makeToken({
      unitId: 'ordinary',
      position: { q: -1, r: -1 },
    });
    const highlighted = makeToken({
      unitId: 'highlighted',
      position: { q: -1, r: -1 },
    });

    const items = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes: [{ q: 0, r: 1 }],
      tokens: [ordinary, highlighted],
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(['highlighted']),
    });
    const terrain = items.find(
      (item) => isHexItem(item) && item.hex.q === 0 && item.hex.r === 1,
    );
    const tokenItems = items.filter(isTokenItem);
    const ordinaryItem = tokenItems.find(
      (item) => item.token.unitId === 'ordinary',
    );
    const highlightedItem = tokenItems.find(
      (item) => item.token.unitId === 'highlighted',
    );

    expect(terrain).toBeDefined();
    expect(ordinaryItem).toBeDefined();
    expect(highlightedItem).toBeDefined();
    expect(ordinaryItem?.foregroundBoost).toBe(false);
    expect(highlightedItem?.foregroundBoost).toBe(true);
    expect(ordinaryItem?.depthKey).toBeLessThan(terrain?.depthKey ?? 0);
    expect(highlightedItem?.depthKey).toBeGreaterThan(terrain?.depthKey ?? 0);
  });

  it('reports camera-dependent tall-terrain occlusion for unit readability', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded', position: { q: 0, r: 0 } }),
    ];

    const frontCameraInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const rearCameraInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 3,
    });

    expect(frontCameraInfo).toHaveLength(1);
    expect(frontCameraInfo[0]).toMatchObject({
      unitId: 'occluded',
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      unitElevation: 0,
      rotationStep: 0,
      reason: 'Elevated terrain +4 at (1, 0) may hide unit at elevation +0',
    });
    expect(rearCameraInfo).toHaveLength(0);
  });

  it('reports every tall terrain layer that may hide the same unit', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
      makeTerrain(0, 1, 3, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded', position: { q: 0, r: 0 } }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const occluderInfo = deriveIsometricTerrainOccluderInfo(occlusionInfo);

    expect(occlusionInfo).toHaveLength(2);
    expect(
      deriveIsometricTerrainOcclusionInfoByUnit(occlusionInfo)
        .get('occluded')
        ?.map((info) => `${info.occluderHex.q},${info.occluderHex.r}`),
    ).toEqual(['1,0', '0,1']);
    expect(
      occlusionInfo.map(
        (info) => `${info.occluderHex.q},${info.occluderHex.r}`,
      ),
    ).toEqual(['1,0', '0,1']);
    expect(occluderInfo.get('1,0')).toMatchObject({
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      occludedUnitIds: ['occluded'],
    });
    expect(occluderInfo.get('0,1')).toMatchObject({
      occluderHex: { q: 0, r: 1 },
      occluderElevation: 3,
      occludedUnitIds: ['occluded'],
    });
  });

  it('counts represented building levels as isometric occluder height', () => {
    const terrainLookup = makeTerrainLookup([
      {
        coordinate: { q: 1, r: 0 },
        elevation: 0,
        features: [{ type: TerrainType.Building, level: 3 }],
      },
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded', position: { q: 0, r: 0 } }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const items = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes: [
        { q: 1, r: 0 },
        { q: 0, r: 1 },
      ],
      tokens,
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(),
    });
    const buildingHex = items.find(
      (item) => isHexItem(item) && item.hex.q === 1 && item.hex.r === 0,
    );
    const clearHex = items.find(
      (item) => isHexItem(item) && item.hex.q === 0 && item.hex.r === 1,
    );

    expect(occlusionInfo).toHaveLength(1);
    expect(occlusionInfo[0]).toMatchObject({
      unitId: 'occluded',
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 3,
      unitElevation: 0,
      rotationStep: 0,
      reason: 'Elevated terrain +3 at (1, 0) may hide unit at elevation +0',
    });
    expect(buildingHex?.depthKey).toBe(1030);
    expect(clearHex?.depthKey).toBe(2000);
  });

  it('projects last-known contacts from the displayed ghost hex', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({
        unitId: 'last-known',
        position: { q: -3, r: -3 },
        lastKnownPosition: { q: 0, r: 0 },
        fogStatus: 'lastKnown',
      }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const items = buildIsometricSceneItems({
      isIsometricView: true,
      renderedHexes: [{ q: 1, r: 0 }],
      tokens,
      terrainLookup,
      rotationStep: 0,
      foregroundUnitIds: new Set(),
    });
    const tokenItem = items
      .filter(isTokenItem)
      .find((item) => item.token.unitId === 'last-known');

    expect(occlusionInfo).toHaveLength(1);
    expect(occlusionInfo[0]).toMatchObject({
      unitId: 'last-known',
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      unitElevation: 0,
      rotationStep: 0,
      reason: 'Elevated terrain +4 at (1, 0) may hide unit at elevation +0',
    });
    expect(tokenItem?.depthKey).toBe(5);
    expect(tokenItem?.foregroundBoost).toBe(false);
  });

  it('groups hidden units by the tall terrain hex that may occlude them', () => {
    const terrainLookup = makeTerrainLookup([
      makeTerrain(1, 0, 4, TerrainType.Building),
    ]);
    const tokens = [
      makeToken({ unitId: 'occluded-a', position: { q: 0, r: 0 } }),
      makeToken({ unitId: 'occluded-b', position: { q: 0, r: -1 } }),
    ];

    const occlusionInfo = deriveIsometricTerrainOcclusionInfo({
      tokens,
      terrainLookup,
      rotationStep: 0,
    });
    const occluderInfo = deriveIsometricTerrainOccluderInfo(occlusionInfo);

    expect(occluderInfo.size).toBe(1);
    expect(occluderInfo.get('1,0')).toMatchObject({
      occluderHex: { q: 1, r: 0 },
      occluderElevation: 4,
      rotationStep: 0,
      occludedUnitIds: ['occluded-a', 'occluded-b'],
      reasons: ['Elevated terrain +4 at (1, 0) may hide unit at elevation +0'],
    });
  });
});
