import React from 'react';

import { MechLocation } from '@/types/construction';

import type {
  AvailableLocation,
  LoadoutEquipmentItem,
} from './GlobalLoadoutTray.types';

import { isFixedSystem } from './GlobalLoadoutTray.helpers';

interface LoadoutPlacementControlsProps {
  item: LoadoutEquipmentItem;
  locations: AvailableLocation[];
  isOmni: boolean;
  onAssign?: (id: string, location: MechLocation) => void;
  onUnassign?: (id: string) => void;
  onCancel: () => void;
}

export function LoadoutPlacementControls({
  item,
  locations,
  isOmni,
  onAssign,
  onUnassign,
  onCancel,
}: LoadoutPlacementControlsProps): React.ReactElement {
  const fixed = isFixedSystem(item, isOmni);
  return (
    <section
      aria-label="Equipment placement"
      tabIndex={-1}
      data-equipment-placement={item.instanceId}
      className="border-border-theme bg-surface-raised/50 focus:outline-text-theme-primary shrink-0 border-b p-2 focus:outline-2 focus:outline-offset-[-2px]"
    >
      <p
        className="text-text-theme-primary truncate text-xs font-semibold"
        title={item.name}
      >
        {item.name} · {item.criticalSlots} cr
      </p>
      <div className="mt-1 flex items-center gap-1">
        <select
          aria-label="Place selected equipment"
          disabled={fixed || !onAssign}
          value=""
          onChange={(event) => {
            if (event.target.value)
              onAssign?.(item.instanceId, event.target.value as MechLocation);
          }}
          className="border-border-theme bg-surface-base text-text-theme-primary focus:outline-accent min-h-11 min-w-0 flex-1 rounded border px-2 text-xs focus:outline-2 disabled:opacity-50"
        >
          <option value="">
            {fixed ? 'Fixed Equipment' : 'Choose location…'}
          </option>
          {locations.map((option) => (
            <option
              key={option.location}
              value={option.location}
              disabled={!option.canFit}
            >
              {option.label}
              {option.canFit ? '' : ` — ${option.reason}`}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Cancel selection"
          onClick={onCancel}
          className="text-text-theme-secondary hover:bg-surface-base focus-visible:outline-text-theme-primary min-h-11 min-w-11 rounded px-1 text-xs focus-visible:outline-2"
        >
          Cancel
        </button>
      </div>
      {item.location && onUnassign && (
        <button
          type="button"
          disabled={fixed}
          onClick={() => onUnassign(item.instanceId)}
          className="border-border-theme text-accent focus-visible:outline-text-theme-primary hover:bg-surface-base mt-1 min-h-11 w-full rounded border text-xs focus-visible:outline-2 disabled:opacity-40"
        >
          Unassign Selected Equipment
        </button>
      )}
    </section>
  );
}
