import { MechLocation } from '@/types/construction';

import {
  AnchorPoint,
  AnchorPosition,
  EdgeName,
  PartDefinition,
  ResolvedAnchor,
  ResolvedEdge,
  ResolvedPosition,
} from './LayoutTypes';

export function calculateAnchorPosition(
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
    case 'custom':
    default:
      ax = x + width / 2;
      ay = y + height / 2;
  }

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

  if (anchor.offset) {
    ax += anchor.offset.x;
    ay += anchor.offset.y;
  }

  const result: ResolvedAnchor = { x: ax, y: ay };
  if (anchor.facing) {
    result.facing =
      anchor.facing === 'inward' || anchor.facing === 'outward'
        ? 'right'
        : anchor.facing;
  }

  return result;
}

export function calculateEdges(
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

export function calculateAllAnchors(
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

  const standardAnchors: Array<{ id: string; position: AnchorPosition }> = [
    { id: 'top', position: 'top' },
    { id: 'bottom', position: 'bottom' },
    { id: 'left', position: 'left' },
    { id: 'right', position: 'right' },
    { id: 'center', position: 'center' },
  ];

  for (const standard of standardAnchors) {
    if (!anchors[standard.id]) {
      anchors[standard.id] = calculateAnchorPosition(
        { id: standard.id, position: standard.position },
        x,
        y,
        width,
        height,
      );
    }
  }

  return anchors;
}

export function resolvePathTemplate(
  template: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
): string {
  if (!template) {
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

  for (const position of Object.values(positions)) {
    if (!position) {
      continue;
    }

    minX = Math.min(minX, position.x);
    minY = Math.min(minY, position.y);
    maxX = Math.max(maxX, position.x + position.width);
    maxY = Math.max(maxY, position.y + position.height);
  }

  if (!isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 100;
    maxY = 100;
  }

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
