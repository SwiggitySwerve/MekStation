/**
 * Arrow-key focus moves for the Blueprint biped armor diagram.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import { MechLocation } from '@/types/construction';

import type { BlueprintView } from './BlueprintArmorDiagram.geometry';

export type BlueprintArrow =
  | 'ArrowUp'
  | 'ArrowDown'
  | 'ArrowLeft'
  | 'ArrowRight';

type Neighbours = Partial<Record<BlueprintArrow, MechLocation>>;

/**
 * Arrow-key moves inside each view, following the drawing: the arms, side
 * torsos and centre torso form the top row under the head, the legs the row
 * below.
 */
const FRONT_NEIGHBOURS: Readonly<Record<string, Neighbours>> = {
  [MechLocation.HEAD]: {
    ArrowDown: MechLocation.CENTER_TORSO,
    ArrowLeft: MechLocation.LEFT_TORSO,
    ArrowRight: MechLocation.RIGHT_TORSO,
  },
  [MechLocation.LEFT_ARM]: {
    ArrowRight: MechLocation.LEFT_TORSO,
    ArrowDown: MechLocation.LEFT_LEG,
    ArrowUp: MechLocation.HEAD,
  },
  [MechLocation.LEFT_TORSO]: {
    ArrowLeft: MechLocation.LEFT_ARM,
    ArrowRight: MechLocation.CENTER_TORSO,
    ArrowUp: MechLocation.HEAD,
    ArrowDown: MechLocation.LEFT_LEG,
  },
  [MechLocation.CENTER_TORSO]: {
    ArrowLeft: MechLocation.LEFT_TORSO,
    ArrowRight: MechLocation.RIGHT_TORSO,
    ArrowUp: MechLocation.HEAD,
    ArrowDown: MechLocation.LEFT_LEG,
  },
  [MechLocation.RIGHT_TORSO]: {
    ArrowLeft: MechLocation.CENTER_TORSO,
    ArrowRight: MechLocation.RIGHT_ARM,
    ArrowUp: MechLocation.HEAD,
    ArrowDown: MechLocation.RIGHT_LEG,
  },
  [MechLocation.RIGHT_ARM]: {
    ArrowLeft: MechLocation.RIGHT_TORSO,
    ArrowDown: MechLocation.RIGHT_LEG,
    ArrowUp: MechLocation.HEAD,
  },
  [MechLocation.LEFT_LEG]: {
    ArrowUp: MechLocation.LEFT_TORSO,
    ArrowLeft: MechLocation.LEFT_ARM,
    ArrowRight: MechLocation.RIGHT_LEG,
  },
  [MechLocation.RIGHT_LEG]: {
    ArrowUp: MechLocation.RIGHT_TORSO,
    ArrowLeft: MechLocation.LEFT_LEG,
    ArrowRight: MechLocation.RIGHT_ARM,
  },
};

const REAR_NEIGHBOURS: Readonly<Record<string, Neighbours>> = {
  [MechLocation.LEFT_TORSO]: { ArrowRight: MechLocation.CENTER_TORSO },
  [MechLocation.CENTER_TORSO]: {
    ArrowLeft: MechLocation.LEFT_TORSO,
    ArrowRight: MechLocation.RIGHT_TORSO,
  },
  [MechLocation.RIGHT_TORSO]: { ArrowLeft: MechLocation.CENTER_TORSO },
};

/** The plate an arrow key moves focus to, or null at the drawing's edge. */
export function blueprintNeighbour(
  view: BlueprintView,
  location: MechLocation,
  key: BlueprintArrow,
): MechLocation | null {
  const map = view === 'front' ? FRONT_NEIGHBOURS : REAR_NEIGHBOURS;
  return map[location]?.[key] ?? null;
}

export function isBlueprintArrow(key: string): key is BlueprintArrow {
  return (
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight'
  );
}
