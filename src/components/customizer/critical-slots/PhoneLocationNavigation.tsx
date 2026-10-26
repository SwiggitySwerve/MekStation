import React, { useId, useState } from 'react';

import { LOCATION_SLOT_COUNTS, MechLocation } from '@/types/construction';
import { getLocationShorthand } from '@/utils/locationUtils';

import type { LocationData } from './criticalSlotTypes';

interface PhoneLocationNavigationProps {
  selectedEquipmentId?: string | null;
  locations: readonly MechLocation[];
  getLocationData: (location: MechLocation) => LocationData;
  getAssignableSlots: (location: MechLocation) => number[];
  renderLocation: (
    location: MechLocation,
    hideHeader: boolean,
  ) => React.ReactNode;
}

/** Phone-only navigation over the same slot rows and placement callbacks. */
export function PhoneLocationNavigation({
  selectedEquipmentId,
  locations,
  getLocationData,
  getAssignableSlots,
  renderLocation,
}: PhoneLocationNavigationProps): React.ReactElement {
  const id = useId();
  const defaultLocation = () =>
    locations.find((location) => getAssignableSlots(location).length > 0) ??
    locations[0];
  const [selection, setSelection] = useState(selectedEquipmentId);
  const [activeLocation, setActiveLocation] = useState(defaultLocation);
  if (selection !== selectedEquipmentId) {
    setSelection(selectedEquipmentId);
    setActiveLocation(defaultLocation());
  }
  const summaries = locations.map((location) => {
    const data = getLocationData(location);
    // Count displayed occupied rows, including fixed systems, rather than
    // estimating availability from equipment sizes or construction rules.
    const used = data.entries.length
      ? data.entries.filter(
          (entry) =>
            entry.primary.type !== 'empty' ||
            (entry.secondary && entry.secondary.type !== 'empty'),
        ).length
      : data.slots.filter((slot) => slot.type !== 'empty').length;
    return {
      location,
      count: `${used}/${LOCATION_SLOT_COUNTS[location]}`,
      free: LOCATION_SLOT_COUNTS[location] - used,
    };
  });

  return (
    <div className="sm:hidden">
      <nav
        aria-label="Critical slot location shortcuts"
        className="bg-surface-deep border-border-theme sticky top-0 z-10 border-b py-1"
      >
        <div
          className="mb-1 flex gap-1 overflow-x-auto"
          aria-label="Free slots by location"
        >
          {summaries.map(({ location, free }) => (
            <button
              key={location}
              type="button"
              aria-label={`${location}, ${free} free slots`}
              aria-pressed={location === activeLocation}
              onClick={() => setActiveLocation(location)}
              className={`focus-visible:outline-accent min-h-11 shrink-0 rounded border px-2 text-[13px] tabular-nums focus-visible:outline-2 focus-visible:outline-offset-[-2px] ${location === activeLocation ? 'border-accent bg-accent/10 text-text-theme-primary' : 'border-border-theme bg-surface-base text-text-theme-secondary'}`}
            >
              {getLocationShorthand(location)} {free} free
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor={`${id}-location`}
            className="text-text-theme-secondary text-sm"
          >
            Location
          </label>
          <select
            id={`${id}-location`}
            value={activeLocation ?? ''}
            onChange={(event) => {
              const location = locations.find(
                (item) => item === event.target.value,
              );
              if (location) setActiveLocation(location);
            }}
            className="border-border-theme bg-surface-base text-text-theme-primary focus-visible:outline-accent min-h-11 min-w-0 flex-1 rounded border px-3 text-sm tabular-nums focus-visible:outline-2"
          >
            {summaries.map(({ location, count }) => (
              <option key={location} value={location}>
                {location} · {count} used
              </option>
            ))}
          </select>
        </div>
      </nav>
      <div className="py-2">
        {locations.map((location) => (
          <div key={location} hidden={location !== activeLocation}>
            {renderLocation(location, true)}
          </div>
        ))}
      </div>
    </div>
  );
}
