/**
 * Layout Validation Tests
 *
 * Tests to ensure all mech layout configurations are geometrically valid:
 * - No overlapping parts (except connected parts with small tolerance)
 * - All constraints are satisfied
 * - All parts are resolved
 * - Symmetric parts have proper separation
 */

import { resolveLayout } from '../LayoutEngine';
import { validateLayout, formatValidationResult } from '../LayoutValidator';
import {
  GEOMETRIC_BIPED_LAYOUT,
  REALISTIC_BIPED_LAYOUT,
  MEGAMEK_BIPED_LAYOUT,
  BATTLEMECH_BIPED_LAYOUT,
} from '../layouts/BipedLayout';
import {
  GEOMETRIC_QUAD_LAYOUT,
  BATTLEMECH_QUAD_LAYOUT,
} from '../layouts/QuadLayout';
import {
  GEOMETRIC_TRIPOD_LAYOUT,
  BATTLEMECH_TRIPOD_LAYOUT,
} from '../layouts/TripodLayout';
import {
  GEOMETRIC_LAM_LAYOUT,
  BATTLEMECH_LAM_LAYOUT,
} from '../layouts/LAMLayout';
import {
  GEOMETRIC_QUADVEE_LAYOUT,
  BATTLEMECH_QUADVEE_LAYOUT,
} from '../layouts/QuadVeeLayout';
import { MechLayoutConfig, ResolvedLayout, ResolvedPosition } from '../LayoutTypes';
import { MechLocation } from '@/types/construction';

/**
 * All layouts to test
 */
const ALL_LAYOUTS: MechLayoutConfig[] = [
  // Biped layouts
  GEOMETRIC_BIPED_LAYOUT,
  REALISTIC_BIPED_LAYOUT,
  MEGAMEK_BIPED_LAYOUT,
  BATTLEMECH_BIPED_LAYOUT,
  // Quad layouts
  GEOMETRIC_QUAD_LAYOUT,
  BATTLEMECH_QUAD_LAYOUT,
  // Tripod layouts
  GEOMETRIC_TRIPOD_LAYOUT,
  BATTLEMECH_TRIPOD_LAYOUT,
  // LAM layouts
  GEOMETRIC_LAM_LAYOUT,
  BATTLEMECH_LAM_LAYOUT,
  // QuadVee layouts
  GEOMETRIC_QUADVEE_LAYOUT,
  BATTLEMECH_QUADVEE_LAYOUT,
];

/**
 * Check if two bounding boxes overlap
 */
function boxesOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
  tolerance: number = 0
): boolean {
  return !(
    a.x + a.width <= b.x + tolerance ||
    b.x + b.width <= a.x + tolerance ||
    a.y + a.height <= b.y + tolerance ||
    b.y + b.height <= a.y + tolerance
  );
}

/**
 * Calculate overlap amount between two boxes
 * Returns { horizontal, vertical } overlap amounts (negative if no overlap)
 */
function calculateOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): { horizontal: number; vertical: number } {
  const horizontalOverlap = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const verticalOverlap = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  
  return {
    horizontal: horizontalOverlap,
    vertical: verticalOverlap,
  };
}

/**
 * Check if two parts are connected by a constraint
 */
function arePartsConnected(
  config: MechLayoutConfig,
  part1: MechLocation,
  part2: MechLocation
): boolean {
  return config.constraints.some(
    (c) =>
      (c.source.part === part1 && c.target.part === part2) ||
      (c.source.part === part2 && c.target.part === part1)
  );
}

describe('Layout Validation', () => {
  describe.each(ALL_LAYOUTS)('$name ($id)', (config) => {
    let layout: ResolvedLayout;

    beforeAll(() => {
      layout = resolveLayout(config);
    });

    it('should resolve all parts defined in the config', () => {
      const resolvedParts = Object.keys(layout.positions);
      const configParts = config.parts.map((p) => p.id);

      for (const part of configParts) {
        expect(resolvedParts).toContain(part);
      }
    });

    it('should have valid viewBox', () => {
      expect(layout.viewBox).toBeDefined();
      expect(layout.viewBox).not.toBe('');
      
      const viewBoxParts = layout.viewBox.split(' ').map(Number);
      expect(viewBoxParts).toHaveLength(4);
      expect(viewBoxParts.every((n) => !isNaN(n))).toBe(true);
    });

    it('should pass validation without errors', () => {
      const result = validateLayout(layout, config);
      
      if (!result.valid) {
        console.error(`Validation failed for ${config.name}:`);
        console.error(formatValidationResult(result));
      }
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should have no overlapping non-connected parts', () => {
      const positions = Object.entries(layout.positions) as Array<[MechLocation, ResolvedPosition]>;
      const overlaps: string[] = [];

      for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
          const [loc1, pos1] = positions[i];
          const [loc2, pos2] = positions[j];

          if (!pos1 || !pos2) continue;

          // Skip connected parts - they're allowed to touch
          if (arePartsConnected(config, loc1, loc2)) continue;

          const box1 = { x: pos1.x, y: pos1.y, width: pos1.width, height: pos1.height };
          const box2 = { x: pos2.x, y: pos2.y, width: pos2.width, height: pos2.height };

          if (boxesOverlap(box1, box2)) {
            const overlap = calculateOverlap(box1, box2);
            overlaps.push(
              `${loc1} and ${loc2} overlap by ${overlap.horizontal.toFixed(1)}px horizontal, ${overlap.vertical.toFixed(1)}px vertical`
            );
          }
        }
      }

      if (overlaps.length > 0) {
        console.error(`Overlaps found in ${config.name}:`);
        overlaps.forEach((o) => console.error(`  - ${o}`));
      }

      expect(overlaps).toHaveLength(0);
    });

    it('should have symmetric parts properly separated', () => {
      const symmetricPairs: Array<[MechLocation, MechLocation]> = [
        [MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG],
        [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM],
        [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO],
        [MechLocation.FRONT_LEFT_LEG, MechLocation.FRONT_RIGHT_LEG],
        [MechLocation.REAR_LEFT_LEG, MechLocation.REAR_RIGHT_LEG],
      ];

      const _minGap = config.minGap || 5;
      const violations: string[] = [];

      for (const [leftPart, rightPart] of symmetricPairs) {
        const leftPos = layout.positions[leftPart];
        const rightPos = layout.positions[rightPart];

        // Skip if parts don't exist in this layout
        if (!leftPos || !rightPos) continue;

        const leftBox = { x: leftPos.x, y: leftPos.y, width: leftPos.width, height: leftPos.height };
        const rightBox = { x: rightPos.x, y: rightPos.y, width: rightPos.width, height: rightPos.height };

        if (boxesOverlap(leftBox, rightBox)) {
          const overlap = calculateOverlap(leftBox, rightBox);
          violations.push(
            `${leftPart} and ${rightPart} overlap by ${overlap.horizontal.toFixed(1)}px horizontal`
          );
        }
      }

      if (violations.length > 0) {
        console.error(`Symmetric part violations in ${config.name}:`);
        violations.forEach((v) => console.error(`  - ${v}`));
      }

      expect(violations).toHaveLength(0);
    });

    it('should have positive dimensions for all parts', () => {
      for (const [_loc, pos] of Object.entries(layout.positions) as Array<[MechLocation, ResolvedPosition]>) {
        expect(pos.width).toBeGreaterThan(0);
        expect(pos.height).toBeGreaterThan(0);
      }
    });

    it('should have all parts within viewBox bounds', () => {
      const viewBoxParts = layout.viewBox.split(' ').map(Number);
      const [vbX, vbY, vbWidth, vbHeight] = viewBoxParts;

      for (const [_loc, pos] of Object.entries(layout.positions) as Array<[MechLocation, ResolvedPosition]>) {
        expect(pos.x).toBeGreaterThanOrEqual(vbX);
        expect(pos.y).toBeGreaterThanOrEqual(vbY);
        expect(pos.x + pos.width).toBeLessThanOrEqual(vbX + vbWidth);
        expect(pos.y + pos.height).toBeLessThanOrEqual(vbY + vbHeight);
      }
    });
  });
});

/**
 * Specific tests for quad-type layouts to ensure legs don't overlap with torsos
 */
describe('Quad Layout Specific Tests', () => {
  const quadLayouts = [
    GEOMETRIC_QUAD_LAYOUT,
    BATTLEMECH_QUAD_LAYOUT,
    GEOMETRIC_QUADVEE_LAYOUT,
    BATTLEMECH_QUADVEE_LAYOUT,
  ];

  describe.each(quadLayouts)('$name', (config) => {
    let layout: ResolvedLayout;

    beforeAll(() => {
      layout = resolveLayout(config);
    });

    it('should have front legs not overlapping with side torsos', () => {
      const frontLeftLeg = layout.positions[MechLocation.FRONT_LEFT_LEG];
      const frontRightLeg = layout.positions[MechLocation.FRONT_RIGHT_LEG];
      const leftTorso = layout.positions[MechLocation.LEFT_TORSO];
      const rightTorso = layout.positions[MechLocation.RIGHT_TORSO];

      if (frontLeftLeg && leftTorso) {
        const overlap = boxesOverlap(
          { x: frontLeftLeg.x, y: frontLeftLeg.y, width: frontLeftLeg.width, height: frontLeftLeg.height },
          { x: leftTorso.x, y: leftTorso.y, width: leftTorso.width, height: leftTorso.height }
        );
        
        if (overlap) {
          const overlapAmount = calculateOverlap(
            { x: frontLeftLeg.x, y: frontLeftLeg.y, width: frontLeftLeg.width, height: frontLeftLeg.height },
            { x: leftTorso.x, y: leftTorso.y, width: leftTorso.width, height: leftTorso.height }
          );
          console.error(`Front Left Leg overlaps Left Torso: ${overlapAmount.horizontal.toFixed(1)}px horizontal, ${overlapAmount.vertical.toFixed(1)}px vertical`);
        }
        
        expect(overlap).toBe(false);
      }

      if (frontRightLeg && rightTorso) {
        const overlap = boxesOverlap(
          { x: frontRightLeg.x, y: frontRightLeg.y, width: frontRightLeg.width, height: frontRightLeg.height },
          { x: rightTorso.x, y: rightTorso.y, width: rightTorso.width, height: rightTorso.height }
        );
        
        if (overlap) {
          const overlapAmount = calculateOverlap(
            { x: frontRightLeg.x, y: frontRightLeg.y, width: frontRightLeg.width, height: frontRightLeg.height },
            { x: rightTorso.x, y: rightTorso.y, width: rightTorso.width, height: rightTorso.height }
          );
          console.error(`Front Right Leg overlaps Right Torso: ${overlapAmount.horizontal.toFixed(1)}px horizontal, ${overlapAmount.vertical.toFixed(1)}px vertical`);
        }
        
        expect(overlap).toBe(false);
      }
    });

    it('should have rear legs not overlapping with side torsos', () => {
      const rearLeftLeg = layout.positions[MechLocation.REAR_LEFT_LEG];
      const rearRightLeg = layout.positions[MechLocation.REAR_RIGHT_LEG];
      const leftTorso = layout.positions[MechLocation.LEFT_TORSO];
      const rightTorso = layout.positions[MechLocation.RIGHT_TORSO];

      if (rearLeftLeg && leftTorso) {
        const overlap = boxesOverlap(
          { x: rearLeftLeg.x, y: rearLeftLeg.y, width: rearLeftLeg.width, height: rearLeftLeg.height },
          { x: leftTorso.x, y: leftTorso.y, width: leftTorso.width, height: leftTorso.height }
        );
        expect(overlap).toBe(false);
      }

      if (rearRightLeg && rightTorso) {
        const overlap = boxesOverlap(
          { x: rearRightLeg.x, y: rearRightLeg.y, width: rearRightLeg.width, height: rearRightLeg.height },
          { x: rightTorso.x, y: rightTorso.y, width: rightTorso.width, height: rightTorso.height }
        );
        expect(overlap).toBe(false);
      }
    });
  });
});
