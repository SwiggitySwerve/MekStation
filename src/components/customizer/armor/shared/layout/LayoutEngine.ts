import { MechLocation } from '@/types/construction';
import { logger } from '@/utils/logger';

import { PartState, resolveConstraint } from './LayoutEngine.constraints';
import {
  calculateAllAnchors,
  calculateEdges,
  calculateViewBox,
  resolvePathTemplate,
} from './LayoutEngine.geometry';
import {
  ConnectorPath,
  LayoutResolveOptions,
  MechLayoutConfig,
  ResolvedAnchor,
  ResolvedLayout,
  ResolvedPosition,
} from './LayoutTypes';

function generateConnectors(
  config: MechLayoutConfig,
  positions: Partial<Record<MechLocation, ResolvedPosition>>,
): ConnectorPath[] {
  if (!config.visualConnectors) {
    return [];
  }

  const connectors: ConnectorPath[] = [];

  for (const constraint of config.constraints) {
    if (constraint.type !== 'anchor-to-anchor') {
      continue;
    }

    const sourcePos = positions[constraint.source.part];
    const targetPos = positions[constraint.target.part];

    if (!sourcePos || !targetPos) {
      continue;
    }

    const sourceAnchor = constraint.source.anchor
      ? sourcePos.anchors[constraint.source.anchor]
      : sourcePos.anchors['center'];
    const targetAnchor = constraint.target.anchor
      ? targetPos.anchors[constraint.target.anchor]
      : targetPos.anchors['center'];

    if (!sourceAnchor || !targetAnchor) {
      continue;
    }

    connectors.push({
      from: constraint.source,
      to: constraint.target,
      path: `M ${sourceAnchor.x} ${sourceAnchor.y} L ${targetAnchor.x} ${targetAnchor.y}`,
      style: 'line',
    });
  }

  return connectors;
}

export { calculateViewBox } from './LayoutEngine.geometry';

export function resolveLayout(
  config: MechLayoutConfig,
  options: LayoutResolveOptions = {},
): ResolvedLayout {
  const scale = options.scale ?? config.scale ?? 1;
  const padding = options.padding ?? config.padding;

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

  const rootPart = config.parts.find((part) => part.isRoot);
  if (rootPart) {
    const rootState = states.get(rootPart.id);
    if (rootState) {
      rootState.x = 0;
      rootState.y = 0;
      rootState.resolved = true;
    }
  }

  const sortedConstraints = [...config.constraints].sort(
    (a, b) => (b.priority ?? 0) - (a.priority ?? 0),
  );

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
      edges: calculateEdges(state.x, state.y, state.width, state.height),
      center: {
        x: state.x + state.width / 2,
        y: state.y + state.height / 2,
      },
      orientation: state.part.orientation,
    };
  }

  const bounds = calculateViewBox(positions, padding);
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

export function getPosition(
  layout: ResolvedLayout,
  location: MechLocation,
): ResolvedPosition | undefined {
  return layout.positions[location];
}

export function getAnchor(
  layout: ResolvedLayout,
  location: MechLocation,
  anchorId: string,
): ResolvedAnchor | undefined {
  const position = layout.positions[location];
  return position?.anchors[anchorId];
}
