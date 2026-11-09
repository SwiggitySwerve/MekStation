import type { RecordSheetAerospaceArc } from '@/types/printing';

import { AerospaceLocation } from '@/types/construction/UnitLocation';

export interface IAerospaceSheetArc {
  /** The store's persisted arc key; labels never change what is saved. */
  readonly location: AerospaceLocation;
  readonly label: RecordSheetAerospaceArc;
}

/**
 * The four armor arcs as the record sheet prints them, in display order.
 *
 * Small craft use SmallCraft.java LOCATION_NAMES ("Left Side"/"Right Side")
 * and fighters keep the wing labels. The editor's arc labels
 * (`customizer/aerospace/aerospaceLocationLabels.ts`, #3165) restate the same
 * names and can consume this table.
 */
export function getAerospaceSheetArcs(
  smallCraft: boolean,
): readonly IAerospaceSheetArc[] {
  return [
    { location: AerospaceLocation.NOSE, label: 'Nose' },
    {
      location: AerospaceLocation.LEFT_WING,
      label: smallCraft ? 'Left Side' : 'Left Wing',
    },
    {
      location: AerospaceLocation.RIGHT_WING,
      label: smallCraft ? 'Right Side' : 'Right Wing',
    },
    { location: AerospaceLocation.AFT, label: 'Aft' },
  ];
}
