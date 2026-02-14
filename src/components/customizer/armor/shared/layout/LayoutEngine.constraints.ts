import { MechLocation } from '@/types/construction';

import {
  calculateAllAnchors,
  calculateAnchorPosition,
} from './LayoutEngine.geometry';
import {
  AnchorPoint,
  AnchorPosition,
  LayoutConstraint,
  PartDefinition,
  ResolvedAnchor,
} from './LayoutTypes';

export interface PartState {
  part: PartDefinition;
  resolved: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}

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

  return anchors['center'];
}

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

function positionByAnchorDef(
  state: PartState,
  anchorDef: AnchorPoint,
  targetPoint: ResolvedAnchor,
  gap: number,
): void {
  const anchorAtOrigin = calculateAnchorPosition(
    anchorDef,
    0,
    0,
    state.width,
    state.height,
  );

  state.x = targetPoint.x - anchorAtOrigin.x;
  state.y = targetPoint.y - anchorAtOrigin.y;

  const position = anchorDef.position;
  if (
    position === 'right' ||
    position === 'top-right' ||
    position === 'bottom-right'
  ) {
    state.x -= gap;
  } else if (
    position === 'left' ||
    position === 'top-left' ||
    position === 'bottom-left'
  ) {
    state.x += gap;
  } else if (position === 'bottom') {
    state.y -= gap;
  } else if (position === 'top') {
    state.y += gap;
  }
}

export function resolveConstraint(
  constraint: LayoutConstraint,
  states: Map<MechLocation, PartState>,
  scale: number,
): boolean {
  const sourceState = states.get(constraint.source.part);
  const targetState = states.get(constraint.target.part);

  if (!sourceState || !targetState) {
    return false;
  }

  if (!targetState.resolved) {
    return false;
  }

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
      const sourceAnchorDef = sourceState.part.anchors.find(
        (anchor) => anchor.id === constraint.source.anchor,
      );

      if (!sourceAnchorDef && constraint.source.anchor) {
        const position = constraint.source.anchor as AnchorPosition;
        positionByAnchor(sourceState, position, targetAnchor, gap);
      } else if (sourceAnchorDef) {
        positionByAnchorDef(sourceState, sourceAnchorDef, targetAnchor, gap);
      } else {
        sourceState.x = targetAnchor.x - sourceState.width / 2;
        sourceState.y = targetAnchor.y - sourceState.height / 2 + gap;
      }

      sourceState.resolved = true;
      return true;
    }

    case 'align-horizontal': {
      sourceState.y =
        targetState.y + targetState.height / 2 - sourceState.height / 2;
      if (!sourceState.resolved) {
        sourceState.x = targetState.x + targetState.width + gap;
      }

      sourceState.resolved = true;
      return true;
    }

    case 'align-vertical': {
      sourceState.x =
        targetState.x + targetState.width / 2 - sourceState.width / 2;
      if (!sourceState.resolved) {
        sourceState.y = targetState.y + targetState.height + gap;
      }

      sourceState.resolved = true;
      return true;
    }

    case 'stack-vertical': {
      sourceState.x =
        targetState.x + targetState.width / 2 - sourceState.width / 2;
      sourceState.y = targetState.y + targetState.height + gap;
      sourceState.resolved = true;
      return true;
    }

    case 'stack-horizontal': {
      sourceState.x = targetState.x + targetState.width + gap;
      sourceState.y =
        targetState.y + targetState.height / 2 - sourceState.height / 2;
      sourceState.resolved = true;
      return true;
    }

    case 'gap': {
      sourceState.x = targetState.x + targetState.width + gap;
      sourceState.y = targetState.y;
      sourceState.resolved = true;
      return true;
    }

    default:
      return false;
  }
}
