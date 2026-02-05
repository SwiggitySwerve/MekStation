/**
 * Layout Validator
 *
 * Validates resolved layouts for overlaps, gap violations, and missing anchors.
 */

import { MechLocation } from '@/types/construction';

import {
  BoundingBox,
  MechLayoutConfig,
  ResolvedLayout,
  ResolvedPosition,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from './LayoutTypes';

// ============================================================================
// Bounding Box Utilities
// ============================================================================

/**
 * Convert a resolved position to a bounding box
 */
function toBoundingBox(pos: ResolvedPosition): BoundingBox {
  return {
    x: pos.x,
    y: pos.y,
    width: pos.width,
    height: pos.height,
  };
}

/**
 * Check if two bounding boxes overlap
 */
function boxesOverlap(
  a: BoundingBox,
  b: BoundingBox,
  tolerance: number = 0,
): boolean {
  return !(
    a.x + a.width <= b.x + tolerance ||
    b.x + b.width <= a.x + tolerance ||
    a.y + a.height <= b.y + tolerance ||
    b.y + b.height <= a.y + tolerance
  );
}

/**
 * Calculate the gap between two bounding boxes
 * Returns negative if overlapping, 0 if touching, positive if separated
 */
function calculateGap(a: BoundingBox, b: BoundingBox): number {
  // Calculate distances between edges
  const horizontalGap = Math.max(
    a.x - (b.x + b.width), // a is to the right of b
    b.x - (a.x + a.width), // b is to the right of a
  );

  const verticalGap = Math.max(
    a.y - (b.y + b.height), // a is below b
    b.y - (a.y + a.height), // b is below a
  );

  // If either gap is positive, they don't overlap
  if (horizontalGap > 0 || verticalGap > 0) {
    // Return the actual gap (minimum of positive gaps)
    if (horizontalGap > 0 && verticalGap > 0) {
      return Math.min(horizontalGap, verticalGap);
    }
    return Math.max(horizontalGap, verticalGap);
  }

  // They overlap - return the negative overlap amount
  return Math.max(horizontalGap, verticalGap);
}

// ============================================================================
// Connection Checking
// ============================================================================

/**
 * Check if two parts are connected by a constraint
 */
function arePartsConnected(
  config: MechLayoutConfig,
  part1: MechLocation,
  part2: MechLocation,
): boolean {
  return config.constraints.some(
    (c) =>
      (c.source.part === part1 && c.target.part === part2) ||
      (c.source.part === part2 && c.target.part === part1),
  );
}

// ============================================================================
// Validation Checks
// ============================================================================

/**
 * Check for overlapping parts
 */
function checkOverlaps(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const positions = Object.entries(layout.positions) as Array<
    [MechLocation, ResolvedPosition]
  >;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const [loc1, pos1] = positions[i];
      const [loc2, pos2] = positions[j];

      if (!pos1 || !pos2) continue;

      const box1 = toBoundingBox(pos1);
      const box2 = toBoundingBox(pos2);

      // Allow small overlaps for connected parts
      const tolerance = arePartsConnected(config, loc1, loc2) ? 2 : 0;

      if (boxesOverlap(box1, box2, tolerance)) {
        // Check if this is intentional (contain constraint)
        const isContained = config.constraints.some(
          (c) =>
            c.type === 'contain' &&
            ((c.source.part === loc1 && c.target.part === loc2) ||
              (c.source.part === loc2 && c.target.part === loc1)),
        );

        if (!isContained) {
          errors.push({
            type: 'overlap',
            parts: [loc1, loc2],
            message: `Parts ${loc1} and ${loc2} overlap`,
          });
        }
      }
    }
  }

  return errors;
}

/**
 * Check for gap violations between non-connected parts
 */
function checkGapViolations(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const positions = Object.entries(layout.positions) as Array<
    [MechLocation, ResolvedPosition]
  >;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const [loc1, pos1] = positions[i];
      const [loc2, pos2] = positions[j];

      if (!pos1 || !pos2) continue;

      // Skip connected parts - they have their own gap rules
      if (arePartsConnected(config, loc1, loc2)) continue;

      const box1 = toBoundingBox(pos1);
      const box2 = toBoundingBox(pos2);
      const gap = calculateGap(box1, box2);

      if (gap >= 0 && gap < config.minGap) {
        errors.push({
          type: 'gap_violation',
          parts: [loc1, loc2],
          message: `Gap between ${loc1} and ${loc2} is ${gap.toFixed(1)}px, minimum is ${config.minGap}px`,
        });
      }
    }
  }

  return errors;
}

/**
 * Symmetric part pairs that should never overlap
 * These are parts on opposite sides of the mech that must have separation
 */
const SYMMETRIC_PAIRS: Array<[MechLocation, MechLocation]> = [
  [MechLocation.LEFT_LEG, MechLocation.RIGHT_LEG],
  [MechLocation.LEFT_ARM, MechLocation.RIGHT_ARM],
  [MechLocation.LEFT_TORSO, MechLocation.RIGHT_TORSO],
];

/**
 * Check for overlapping symmetric parts (legs, arms, torsos)
 * These parts should never overlap regardless of connection status
 */
function checkSymmetricPartOverlaps(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const minSymmetricGap = config.minGap || 5;

  for (const [leftPart, rightPart] of SYMMETRIC_PAIRS) {
    const leftPos = layout.positions[leftPart];
    const rightPos = layout.positions[rightPart];

    if (!leftPos || !rightPos) continue;

    const leftBox = toBoundingBox(leftPos);
    const rightBox = toBoundingBox(rightPos);
    const gap = calculateGap(leftBox, rightBox);

    if (gap < 0) {
      // Parts overlap
      errors.push({
        type: 'overlap',
        parts: [leftPart, rightPart],
        message: `Symmetric parts ${leftPart} and ${rightPart} overlap by ${Math.abs(gap).toFixed(1)}px - they must have separation`,
      });
    } else if (gap < minSymmetricGap) {
      // Parts are too close
      errors.push({
        type: 'gap_violation',
        parts: [leftPart, rightPart],
        message: `Symmetric parts ${leftPart} and ${rightPart} have only ${gap.toFixed(1)}px gap, minimum is ${minSymmetricGap}px`,
      });
    }
  }

  return errors;
}

/**
 * Check for missing parts that are referenced in constraints
 */
function checkMissingParts(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationError[] {
  const errors: ValidationError[] = [];
  const resolvedParts = new Set(
    Object.keys(layout.positions) as MechLocation[],
  );

  for (const constraint of config.constraints) {
    if (!resolvedParts.has(constraint.source.part)) {
      errors.push({
        type: 'missing_part',
        parts: [constraint.source.part],
        message: `Part ${constraint.source.part} is referenced but not resolved`,
        constraint,
      });
    }

    if (!resolvedParts.has(constraint.target.part)) {
      errors.push({
        type: 'missing_part',
        parts: [constraint.target.part],
        message: `Part ${constraint.target.part} is referenced but not resolved`,
        constraint,
      });
    }
  }

  return errors;
}

/**
 * Check for missing anchors
 */
function checkMissingAnchors(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const constraint of config.constraints) {
    if (constraint.source.anchor) {
      const pos = layout.positions[constraint.source.part];
      if (pos && !pos.anchors[constraint.source.anchor]) {
        errors.push({
          type: 'missing_anchor',
          parts: [constraint.source.part],
          message: `Anchor '${constraint.source.anchor}' not found on part ${constraint.source.part}`,
          constraint,
        });
      }
    }

    if (constraint.target.anchor) {
      const pos = layout.positions[constraint.target.part];
      if (pos && !pos.anchors[constraint.target.anchor]) {
        errors.push({
          type: 'missing_anchor',
          parts: [constraint.target.part],
          message: `Anchor '${constraint.target.anchor}' not found on part ${constraint.target.part}`,
          constraint,
        });
      }
    }
  }

  return errors;
}

// ============================================================================
// Warning Checks
// ============================================================================

/**
 * Check for tight gaps that might cause visual issues
 */
function checkTightGaps(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const positions = Object.entries(layout.positions) as Array<
    [MechLocation, ResolvedPosition]
  >;
  const tightGapThreshold = config.minGap * 1.5;

  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const [loc1, pos1] = positions[i];
      const [loc2, pos2] = positions[j];

      if (!pos1 || !pos2) continue;
      if (arePartsConnected(config, loc1, loc2)) continue;

      const box1 = toBoundingBox(pos1);
      const box2 = toBoundingBox(pos2);
      const gap = calculateGap(box1, box2);

      if (gap >= config.minGap && gap < tightGapThreshold) {
        warnings.push({
          type: 'tight_gap',
          parts: [loc1, loc2],
          message: `Gap between ${loc1} and ${loc2} is tight (${gap.toFixed(1)}px)`,
        });
      }
    }
  }

  return warnings;
}

/**
 * Check for large gaps that might indicate layout issues
 */
function checkLargeGaps(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const largeGapThreshold = config.minGap * 5;

  for (const constraint of config.constraints) {
    if (constraint.type !== 'anchor-to-anchor') continue;

    const sourcePos = layout.positions[constraint.source.part];
    const targetPos = layout.positions[constraint.target.part];

    if (!sourcePos || !targetPos) continue;

    const sourceAnchor = constraint.source.anchor
      ? sourcePos.anchors[constraint.source.anchor]
      : sourcePos.anchors['center'];
    const targetAnchor = constraint.target.anchor
      ? targetPos.anchors[constraint.target.anchor]
      : targetPos.anchors['center'];

    if (!sourceAnchor || !targetAnchor) continue;

    const distance = Math.sqrt(
      Math.pow(sourceAnchor.x - targetAnchor.x, 2) +
        Math.pow(sourceAnchor.y - targetAnchor.y, 2),
    );

    const expectedGap = constraint.gap ?? 0;
    if (distance > expectedGap + largeGapThreshold) {
      warnings.push({
        type: 'large_gap',
        parts: [constraint.source.part, constraint.target.part],
        message: `Large gap between ${constraint.source.part} and ${constraint.target.part} (${distance.toFixed(1)}px)`,
      });
    }
  }

  return warnings;
}

/**
 * Check for unused anchors
 */
function checkUnusedAnchors(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationWarning[] {
  const warnings: ValidationWarning[] = [];
  const usedAnchors = new Set<string>();

  // Collect all used anchors from constraints
  for (const constraint of config.constraints) {
    if (constraint.source.anchor) {
      usedAnchors.add(`${constraint.source.part}:${constraint.source.anchor}`);
    }
    if (constraint.target.anchor) {
      usedAnchors.add(`${constraint.target.part}:${constraint.target.anchor}`);
    }
  }

  // Check for unused custom anchors (skip standard anchors)
  const standardAnchors = new Set(['top', 'bottom', 'left', 'right', 'center']);

  for (const part of config.parts) {
    for (const anchor of part.anchors) {
      if (standardAnchors.has(anchor.id)) continue;

      const key = `${part.id}:${anchor.id}`;
      if (!usedAnchors.has(key)) {
        warnings.push({
          type: 'unused_anchor',
          parts: [part.id],
          message: `Anchor '${anchor.id}' on part ${part.id} is not used in any constraint`,
        });
      }
    }
  }

  return warnings;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a resolved layout against its configuration
 */
export function validateLayout(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): ValidationResult {
  const errors: ValidationError[] = [
    ...checkMissingParts(layout, config),
    ...checkMissingAnchors(layout, config),
    ...checkOverlaps(layout, config),
    ...checkGapViolations(layout, config),
    ...checkSymmetricPartOverlaps(layout, config),
  ];

  const warnings: ValidationWarning[] = [
    ...checkTightGaps(layout, config),
    ...checkLargeGaps(layout, config),
    ...checkUnusedAnchors(layout, config),
  ];

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Quick check if a layout is valid (no detailed errors)
 */
export function isLayoutValid(
  layout: ResolvedLayout,
  config: MechLayoutConfig,
): boolean {
  return validateLayout(layout, config).valid;
}

/**
 * Format validation result as a human-readable string
 */
export function formatValidationResult(result: ValidationResult): string {
  const lines: string[] = [];

  if (result.valid) {
    lines.push('Layout is valid');
  } else {
    lines.push('Layout validation failed:');
  }

  if (result.errors.length > 0) {
    lines.push('');
    lines.push('Errors:');
    for (const error of result.errors) {
      lines.push(`  - [${error.type}] ${error.message}`);
    }
  }

  if (result.warnings.length > 0) {
    lines.push('');
    lines.push('Warnings:');
    for (const warning of result.warnings) {
      lines.push(`  - [${warning.type}] ${warning.message}`);
    }
  }

  return lines.join('\n');
}
