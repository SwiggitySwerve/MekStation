/**
 * FacingPickerOverlay
 *
 * Per `tactical-movement-intent-composer` (tactical-map-interface delta, task
 * 3.5): the existing Facing Picker Overlay requirement is UNCHANGED — the player
 * still picks the final facing, but at the LAST WAYPOINT of the composed
 * Locomotion Path (instead of the single legacy destination). The chosen facing
 * feeds `intent.finalFacing` via `onSelect`.
 *
 * The picker is a real control (a 6-way rosette of buttons), so it renders as an
 * absolutely-positioned HTML panel on the map — anchored in the map's
 * bottom-right corner (clear of the bottom-left MP legend) and shown only while a
 * last waypoint exists. It reuses the shared `FacingPicker` component so the
 * facing geometry + a11y semantics stay identical to the legacy planning-panel
 * picker.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import React, { useState } from 'react';

import type { Facing, IHexCoordinate } from '@/types/gameplay';

import { FacingPicker } from '@/components/gameplay/FacingPicker';

export interface FacingPickerOverlayProps {
  /** The last-waypoint hex the final facing applies to (drives visibility + label). */
  readonly anchorHex: IHexCoordinate;
  /** Fired when the player picks a facing — feeds `intent.finalFacing`. */
  readonly onSelect: (facing: Facing) => void;
}

export function FacingPickerOverlay({
  anchorHex,
  onSelect,
}: FacingPickerOverlayProps): React.ReactElement {
  const [selected, setSelected] = useState<Facing | null>(null);

  const handleSelect = (facing: Facing): void => {
    setSelected(facing);
    onSelect(facing);
  };

  return (
    <div
      className="pointer-events-auto absolute right-4 bottom-4 flex flex-col gap-1 rounded bg-white/95 p-2 text-xs shadow"
      data-testid="facing-picker-overlay"
      data-anchor-hex={`${anchorHex.q},${anchorHex.r}`}
    >
      <div className="font-semibold text-slate-700">Final facing</div>
      <FacingPicker selected={selected} onSelect={handleSelect} />
    </div>
  );
}

export default FacingPickerOverlay;
