import { MechLocation } from '@/types/construction';

import type {
  AnchorPoint,
  AnchorPosition,
  EdgeName,
  LayoutConstraint,
  LayoutStyle,
  MechLayoutConfig,
  PartReference,
  PartDefinition,
} from '../LayoutTypes';

import { RECTANGULAR_PART_PATH } from './LayoutPathTemplates';

interface RectangularPartInput {
  id: MechLocation;
  baseWidth: number;
  baseHeight: number;
  anchors: AnchorPoint[];
  isRoot?: boolean;
}

interface PathPartInput extends RectangularPartInput {
  pathTemplate: string;
}

interface LayoutInput {
  id: string;
  name: string;
  style: LayoutStyle;
  parts: PartDefinition[];
  constraints: LayoutConstraint[];
  minGap: number;
}

export function offsetAnchor(
  id: string,
  position: AnchorPosition,
): AnchorPoint {
  return { id, position, offset: { x: 0, y: 0 } };
}

export function edgeAnchor(
  id: string,
  position: AnchorPosition,
  edge: EdgeName,
  at: number,
): AnchorPoint {
  return { id, position, edgePosition: { edge, at } };
}

export function rectangularPart({
  id,
  baseWidth,
  baseHeight,
  anchors,
  isRoot,
}: RectangularPartInput): PartDefinition {
  return {
    id,
    baseWidth,
    baseHeight,
    shape: 'path',
    anchors,
    pathTemplate: RECTANGULAR_PART_PATH,
    ...(isRoot ? { isRoot: true } : {}),
  };
}

export function pathPart({
  id,
  baseWidth,
  baseHeight,
  anchors,
  pathTemplate,
  isRoot,
}: PathPartInput): PartDefinition {
  return {
    id,
    baseWidth,
    baseHeight,
    shape: 'path',
    anchors,
    pathTemplate,
    ...(isRoot ? { isRoot: true } : {}),
  };
}

export function resizePart(
  part: PartDefinition,
  baseWidth: number,
  baseHeight: number,
): PartDefinition {
  return { ...part, baseWidth, baseHeight };
}

export function connectAnchors(
  id: string,
  source: Required<Pick<PartReference, 'part' | 'anchor'>>,
  target: Required<Pick<PartReference, 'part' | 'anchor'>>,
  gap: number,
  priority: number,
): LayoutConstraint {
  return {
    id,
    type: 'anchor-to-anchor',
    source,
    target,
    gap,
    priority,
  };
}

export function gapConstraint(
  id: string,
  sourcePart: MechLocation,
  targetPart: MechLocation,
  gap: number,
  priority: number,
): LayoutConstraint {
  return {
    id,
    type: 'gap',
    source: { part: sourcePart },
    target: { part: targetPart },
    gap,
    priority,
  };
}

export function layoutConfig({
  id,
  name,
  style,
  parts,
  constraints,
  minGap,
}: LayoutInput): MechLayoutConfig {
  return {
    id,
    name,
    style,
    parts,
    constraints,
    padding: 10,
    minGap,
    visualConnectors: false,
    scale: 1,
  };
}
