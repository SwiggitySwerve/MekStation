/**
 * Layout Engine
 *
 * Core constraint resolver that computes absolute positions for mech parts
 * based on anchor points and connection constraints.
 */

import { MechLocation } from '@/types/construction';
import { logger } from '@/utils/logger';

import {
  AnchorPoint,
  AnchorPosition,
  ConnectorPath,
  EdgeName,
  LayoutConstraint,
  LayoutResolveOptions,
  MechLayoutConfig,
  PartDefinition,
  ResolvedAnchor,
  ResolvedEdge,
  ResolvedLayout,
  ResolvedPosition,
} from './LayoutTypes';

// ============================================================================
// Anchor Position Calculation
// ============================================================================

/**
 * Calculate the absolute position of an anchor point given the part's bounds
 */
function calculateAnchorPosition(
  anchor: AnchorPoint,
  x: number,
  y: number,
  width: number,
  height: number,
): ResolvedAnchor {
  let ax: number;
  let ay: number;

  switch (anchor.position) {
    case 'top':
      ax = x + width / 2;
      ay = y;
      break;
    case 'top-left':
      ax = x;
      ay = y;
      break;
    case 'top-right':
      ax = x + width;
      ay = y;
      break;
    case 'bottom':
      ax = x + width / 2;
      ay = y + height;
      break;
    case 'bottom-left':
      ax = x;
      ay = y + height;
      break;
    case 'bottom-right':
      ax = x + width;
      ay = y + height;
      break;
    case 'left':
      ax = x;
      ay = y + height / 2;
      break;
    case 'right':
      ax = x + width;
      ay = y + height / 2;
      break;
    case 'center':
      ax = x + width / 2;
      ay = y + height / 2;
      break;
    case 'custom':
      ax = x + width / 2;
      ay = y + height / 2;
      break;
    default:
      ax = x + width / 2;
      ay = y + height / 2;
  }

  // Apply edge-relative positioning if specified
  if (anchor.edgePosition) {
    const { edge, at } = anchor.edgePosition;
    switch (edge) {
      case 'top':
        ax = x + width * at;
        ay = y;
        break;
      case 'bottom':
        ax = x + width * at;
        ay = y + height;
        break;
      case 'left':
        ax = x;
        ay = y + height * at;
        break;
      case 'right':
        ax = x + width;
        ay = y + height * at;
        break;
    }
  }

  // Apply offset if specified
  if (anchor.offset) {
    ax += anchor.offset.x;
    ay += anchor.offset.y;
  }

  // Include facing direction if specified
  const result: ResolvedAnchor = { x: ax, y: ay };
  if (anchor.facing) {
    // Convert relative facing to absolute direction
    result.facing =
      anchor.facing === 'inward' || anchor.facing === 'outward'
        ? 'right' // Will be computed based on part position relative to center
        : anchor.facing;
  }

  return result;
}

// ============================================================================
// Edge Calculation
// ============================================================================

/**
 * Calculate the resolved edges for a part
 */
function calculateEdges(
  x: number,
  y: number,
  width: number,
  height: number,
): Record<EdgeName, ResolvedEdge> {
  return {
    top: {
      start: { x, y },
      end: { x: x + width, y },
    },
    bottom: {
      start: { x, y: y + height },
      end: { x: x + width, y: y + height },
    },
    left: {
      start: { x, y },
      end: { x, y: y + height },
    },
    right: {
      start: { x: x + width, y },
      end: { x: x + width, y: y + height },
    },
  };
}

/**
 * Calculate all anchor positions for a part
 */
function calculateAllAnchors(
  part: PartDefinition,
  x: number,
  y: number,
  width: number,
  height: number,
): Record<string, ResolvedAnchor> {
  const anchors: Record<string, ResolvedAnchor> = {};

  for (const anchor of part.anchors) {
    anchors[anchor.id] = calculateAnchorPosition(anchor, x, y, width, height);
  }

  // Always include standard edge anchors
  const standardAnchors: Array<{ id: string; position: AnchorPosition }> = [
    { id: 'top', position: 'top' },
    { id: 'bottom', position: 'bottom' },
    { id: 'left', position: 'left' },
    { id: 'right', position: 'right' },
    { id: 'center', position: 'center' },
  ];

  for (const std of standardAnchors) {
    if (!anchors[std.id]) {
      anchors[std.id] = calculateAnchorPosition(
        { id: std.id, position: std.position },
        x,
        y,
        width,
        height,
      );
    }
  }

  return anchors;
}

// ============================================================================
// Path Template Resolution
// ============================================================================

/**
 * Resolve a path template with actual coordinates
 */
function resolvePathTemplate(
  template: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  if (!template) {
    // Generate a simple rectangle path
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }

  return template
    .replace(/\{x\}/g, x.toString())
    .replace(/\{y\}/g, y.toString())
    .replace(/\{w\}/g, width.toString())
    .replace(/\{h\}/g, height.toString())
    .replace(/\{cx\}/g, (x + width / 2).toString())
    .replace(/\{cy\}/g, (y + height / 2).toString())
    .replace(/\{x2\}/g, (x + width).toString())
    .replace(/\{y2\}/g, (y + height).toString());
}

// ============================================================================
// Constraint Resolution
// ============================================================================

interface PartState {
  part: PartDefinition;
  resolved: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Find the anchor position for a part reference
 */
function getAnchorFromPart(
  state: PartState,
  anchorId: string | undefined,
): ResolvedAnchor | null {
  const anchors = calculateAllAnchors(
    state.part,
    state.x,
    state.y,
    state.width,
    state.height,
  );

  if (anchorId) {
    return anchors[anchorId] ?? null;
  }

  // Default to center if no anchor specified
  return anchors['center'];
}

/**
 * Resolve a single constraint and update part positions
 */
function resolveConstraint(
  constraint: LayoutConstraint,
  states: Map<MechLocation, PartState>,
  scale: number,
): boolean {
  const sourceState = states.get(constraint.source.part);
  const targetState = states.get(constraint.target.part);

  if (!sourceState || !targetState) {
    return false;
  }

  // Target must be resolved first
  if (!targetState.resolved) {
    return false;
  }

  // Source already resolved - skip
  if (sourceState.resolved) {
    return true;
  }

  const targetAnchor = getAnchorFromPart(targetState, constraint.target.anchor);
  if (!targetAnchor) {
    return false;
  }

  const gap = (constraint.gap ?? 0) * scale;

  switch (constraint.type) {
    case 'anchor-to-anchor': {
      // Position source so its anchor aligns with target anchor
      const sourceAnchorDef = sourceState.part.anchors.find(
        (a) => a.id === constraint.source.anchor,
      );

      if (!sourceAnchorDef && constraint.source.anchor) {
        // Use standard anchor position
        const pos = constraint.source.anchor as AnchorPosition;
        positionByAnchor(sourceState, pos, targetAnchor, gap);
      } else if (sourceAnchorDef) {
        positionByAnchorDef(sourceState, sourceAnchorDef, targetAnchor, gap);
      } else {
        // Default: position center to target
        sourceState.x = targetAnchor.x - sourceState.width / 2;
        sourceState.y = targetAnchor.y - sourceState.height / 2 + gap;
      }
      sourceState.resolved = true;
      return true;
    }

    case 'align-horizontal': {
      // Align centers horizontally (same Y)
      sourceState.y =
        targetState.y + targetState.height / 2 - sourceState.height / 2;
      if (!sourceState.resolved) {
        sourceState.x = targetState.x + targetState.width + gap;
      }
      sourceState.resolved = true;
      return true;
    }

    case 'align-vertical': {
      // Align centers vertically (same X)
      sourceState.x =
        targetState.x + targetState.width / 2 - sourceState.width / 2;
      if (!sourceState.resolved) {
        sourceState.y = targetState.y + targetState.height + gap;
      }
      sourceState.resolved = true;
      return true;
    }

    case 'stack-vertical': {
      // Stack below target
      sourceState.x =
        targetState.x + targetState.width / 2 - sourceState.width / 2;
      sourceState.y = targetState.y + targetState.height + gap;
      sourceState.resolved = true;
      return true;
    }

    case 'stack-horizontal': {
      // Stack to the right of target
      sourceState.x = targetState.x + targetState.width + gap;
      sourceState.y =
        targetState.y + targetState.height / 2 - sourceState.height / 2;
      sourceState.resolved = true;
      return true;
    }

    case 'gap': {
      // Maintain gap between edges (source goes to the right/below)
      sourceState.x = targetState.x + targetState.width + gap;
      sourceState.y = targetState.y;
      sourceState.resolved = true;
      return true;
    }

    default:
      return false;
  }
}

/**
 * Position a part by placing its anchor at a target point
 */
function positionByAnchor(
  state: PartState,
  anchorPos: AnchorPosition,
  targetPoint: ResolvedAnchor,
  gap: number,
): void {
  switch (anchorPos) {
    case 'top':
      state.x = targetPoint.x - state.width / 2;
      state.y = targetPoint.y + gap;
      break;
    case 'bottom':
      state.x = targetPoint.x - state.width / 2;
      state.y = targetPoint.y - state.height - gap;
      break;
    case 'left':
      state.x = targetPoint.x + gap;
      state.y = targetPoint.y - state.height / 2;
      break;
    case 'right':
      state.x = targetPoint.x - state.width - gap;
      state.y = targetPoint.y - state.height / 2;
      break;
    case 'center':
      state.x = targetPoint.x - state.width / 2;
      state.y = targetPoint.y - state.height / 2;
      break;
    default:
      state.x = targetPoint.x - state.width / 2;
      state.y = targetPoint.y + gap;
  }
}

/**
 * Position a part by placing a specific anchor definition at a target point
 * Gap is applied to push the part AWAY from the target based on which edge the anchor is on:
 * - Anchor on right edge means part is left of target → push left (subtract from x)
 * - Anchor on left edge means part is right of target → push right (add to x)
 * - Anchor on bottom edge means part is above target → push up (subtract from y)
 * - Anchor on top edge means part is below target → push down (add to y)
 */
function positionByAnchorDef(
  state: PartState,
  anchorDef: AnchorPoint,
  targetPoint: ResolvedAnchor,
  gap: number,
): void {
  // Calculate where the anchor would be if part was at (0, 0)
  const anchorAtOrigin = calculateAnchorPosition(
    anchorDef,
    0,
    0,
    state.width,
    state.height,
  );

  // Position so anchor aligns with target
  state.x = targetPoint.x - anchorAtOrigin.x;
  state.y = targetPoint.y - anchorAtOrigin.y;

  // Apply gap to push part AWAY from target based on anchor edge
  const pos = anchorDef.position;
  if (pos === 'right' || pos === 'top-right' || pos === 'bottom-right') {
    // Anchor is on right edge → part is to the left of target → push further left
    state.x -= gap;
  } else if (pos === 'left' || pos === 'top-left' || pos === 'bottom-left') {
    // Anchor is on left edge → part is to the right of target → push further right
    state.x += gap;
  } else if (pos === 'bottom') {
    // Anchor is on bottom edge → part is above target → push further up
    state.y -= gap;
  } else if (pos === 'top') {
    // Anchor is on top edge → part is below target → push further down
    state.y += gap;
  }
  // For 'center' or 'custom', no gap is applied
}

// ============================================================================
// ViewBox Calculation
// ============================================================================

/**
 * Calculate the viewBox from resolved positions
 */
export function calculateViewBox(
  positions: Partial<Record<MechLocation, ResolvedPosition>>,
  padding: number,
): {
  viewBox: string;
  width: number;
  height: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const pos of Object.values(positions)) {
    if (!pos) continue;
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + pos.width);
    maxY = Math.max(maxY, pos.y + pos.height);
  }

  // Handle empty positions
  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

  // Apply padding
  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = maxX - minX;
  const height = maxY - minY;

  return {
    viewBox: `${minX} ${minY} ${width} ${height}`,
    width,
    height,
    minX,
    minY,
    maxX,
    maxY,
  };
}

// ============================================================================
// Connector Path Generation
// ============================================================================

/**
 * Generate connector paths between anchors
 */
function generateConnectors(
  config: MechLayoutConfig,
  positions: Partial<Record<MechLocation, ResolvedPosition>>,
): ConnectorPath[] {
  if (!config.visualConnectors) {
    return [];
  }

  const connectors: ConnectorPath[] = [];

  for (const constraint of config.constraints) {
    if (constraint.type !== 'anchor-to-anchor') continue;

    const sourcePos = positions[constraint.source.part];
    const targetPos = positions[constraint.target.part];

    if (!sourcePos || !targetPos) continue;

    const sourceAnchor = constraint.source.anchor
      ? sourcePos.anchors[constraint.source.anchor]
      : sourcePos.anchors['center'];
    const targetAnchor = constraint.target.anchor
      ? targetPos.anchors[constraint.target.anchor]
      : targetPos.anchors['center'];

    if (!sourceAnchor || !targetAnchor) continue;

    // Simple line connector
    const path = `M ${sourceAnchor.x} ${sourceAnchor.y} L ${targetAnchor.x} ${targetAnchor.y}`;

    connectors.push({
      from: constraint.source,
      to: constraint.target,
      path,
      style: 'line',
    });
  }

  return connectors;
}

// ============================================================================
// Main Layout Resolution
// ============================================================================

/**
 * Resolve a layout configuration into absolute positions
 */
export function resolveLayout(
  config: MechLayoutConfig,
  options: LayoutResolveOptions = {},
): ResolvedLayout {
  const scale = options.scale ?? config.scale ?? 1;
  const padding = options.padding ?? config.padding;

  // Initialize part states
  const states = new Map<MechLocation, PartState>();

  for (const part of config.parts) {
    states.set(part.id, {
      part,
      resolved: false,
      x: 0,
      y: 0,
      width: part.baseWidth * scale,
      height: part.baseHeight * scale,
    });
  }

  // Find and resolve root part first
  const rootPart = config.parts.find((p) => p.isRoot);
  if (rootPart) {
    const rootState = states.get(rootPart.id);
    if (rootState) {
      // Position root at origin (padding will be applied via viewBox)
      rootState.x = 0;
      rootState.y = 0;
      rootState.resolved = true;
    }
  }

  // Sort constraints by priority
  const sortedConstraints = [...config.constraints].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

  // Iteratively resolve constraints
  let maxIterations = sortedConstraints.length * 3;
  let resolved = 0;
  let lastResolved = -1;

  while (
    resolved < sortedConstraints.length &&
    maxIterations > 0 &&
    resolved !== lastResolved
  ) {
    lastResolved = resolved;
    resolved = 0;

    for (const constraint of sortedConstraints) {
      if (resolveConstraint(constraint, states, scale)) {
        resolved++;
      }
    }

    maxIterations--;
  }

  // Build resolved positions
  const positions: Partial<Record<MechLocation, ResolvedPosition>> = {};

  const stateEntries = Array.from(states.entries());
  for (const entry of stateEntries) {
    const location = entry[0];
    const state = entry[1];

    if (!state.resolved) {
      if (options.debug) {
        logger.warn(`Layout: Part ${location} was not resolved`);
      }
      continue;
    }

    const anchors = calculateAllAnchors(
      state.part,
      state.x,
      state.y,
      state.width,
      state.height,
    );

    const edges = calculateEdges(state.x, state.y, state.width, state.height);

    positions[location] = {
      x: state.x,
      y: state.y,
      width: state.width,
      height: state.height,
      path: resolvePathTemplate(
        state.part.pathTemplate,
        state.x,
        state.y,
        state.width,
        state.height,
      ),
      anchors,
      edges,
      center: {
        x: state.x + state.width / 2,
        y: state.y + state.height / 2,
      },
      orientation: state.part.orientation,
    };
  }

  // Calculate viewBox
  const bounds = calculateViewBox(positions, padding);

  // Generate connectors
  const connectors = generateConnectors(config, positions);

  return {
    configId: config.id,
    viewBox: bounds.viewBox,
    positions,
    connectors,
    bounds: {
      width: bounds.width,
      height: bounds.height,
      minX: bounds.minX,
      minY: bounds.minY,
      maxX: bounds.maxX,
      maxY: bounds.maxY,
    },
    scale,
  };
}

/**
 * Get a specific position from a resolved layout
 */
export function getPosition(
  layout: ResolvedLayout,
  location: MechLocation,
): ResolvedPosition | undefined {
  return layout.positions[location];
}

/**
 * Get anchor coordinates from a resolved layout
 */
export function getAnchor(
  layout: ResolvedLayout,
  location: MechLocation,
  anchorId: string,
): ResolvedAnchor | undefined {
  const pos = layout.positions[location];
  return pos?.anchors[anchorId];
}
