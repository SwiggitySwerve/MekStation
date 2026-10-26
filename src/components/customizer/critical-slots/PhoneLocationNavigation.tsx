import React, { useEffect, useId, useRef, useState } from 'react';

import {
  getLocationAbbreviation,
  LOCATION_SLOT_COUNTS,
  MechLocation,
} from '@/types/construction';

import type { LocationData } from './criticalSlotTypes';

import styles from '../CustomizerWorkbench.module.css';

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
  const pills = useRef<Partial<Record<MechLocation, HTMLButtonElement | null>>>(
    {},
  );
  const defaultLocation = () =>
    locations.find((location) => getAssignableSlots(location).length > 0) ??
    locations[0];
  const [selection, setSelection] = useState(selectedEquipmentId);
  const [activeLocation, setActiveLocation] = useState(defaultLocation);
  if (selection !== selectedEquipmentId) {
    setSelection(selectedEquipmentId);
    setActiveLocation(defaultLocation());
  }
  useEffect(() => {
    pills.current[activeLocation]?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
    });
  }, [activeLocation]);

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
          role="tablist"
          aria-label="Location"
          className={styles.criticalLocationPills}
        >
          {summaries.map(({ location, count, free }, index) => (
            <button
              key={location}
              ref={(element) => {
                pills.current[location] = element;
              }}
              id={`${id}-location-${index}`}
              type="button"
              role="tab"
              aria-label={`${location} · ${count} used, ${free} free`}
              aria-selected={location === activeLocation}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={location === activeLocation ? 0 : -1}
              className={styles.criticalLocationPill}
              onClick={() => setActiveLocation(location)}
              onKeyDown={(event) => {
                let next: number;
                if (event.key === 'ArrowRight')
                  next = (index + 1) % locations.length;
                else if (event.key === 'ArrowLeft')
                  next = (index - 1 + locations.length) % locations.length;
                else if (event.key === 'Home') next = 0;
                else if (event.key === 'End') next = locations.length - 1;
                else return;
                event.preventDefault();
                const target = locations[next];
                setActiveLocation(target);
                pills.current[target]?.focus({ preventScroll: true });
              }}
            >
              {getLocationAbbreviation(location)} {count}
            </button>
          ))}
        </div>
      </nav>
      <div className="pt-1">
        {locations.map((location, index) => (
          <div
            key={location}
            id={`${id}-panel-${index}`}
            role="tabpanel"
            aria-labelledby={`${id}-location-${index}`}
            hidden={location !== activeLocation}
          >
            {renderLocation(location, true)}
          </div>
        ))}
      </div>
    </div>
  );
}
