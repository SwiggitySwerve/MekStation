import React, { useId, useRef, useState } from 'react';

import {
  getLocationAbbreviation,
  LOCATION_SLOT_COUNTS,
  MechLocation,
} from '@/types/construction';

import styles from '../CustomizerWorkbench.module.css';
import { countOccupiedEntries, type LocationData } from './criticalSlotTypes';

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

/** Locations per row in the phone selector (record-sheet order: LA LT HD CT / RT RA LL RL). */
const PILL_COLUMNS = 4;

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

  const summaries = locations.map((location) => {
    const data = getLocationData(location);
    // Count displayed occupied rows, including fixed systems, rather than
    // estimating availability from equipment sizes or construction rules.
    const used = data.entries.length
      ? countOccupiedEntries(data.entries)
      : data.slots.filter((slot) => slot.type !== 'empty').length;
    const total = LOCATION_SLOT_COUNTS[location];
    return {
      location,
      count: `${used} / ${total}`,
      summary: `${used} of ${total} used`,
    };
  });

  /** Index the arrow key moves to, or null when the key is not a move. */
  const nextIndex = (key: string, index: number): number | null => {
    const last = locations.length - 1;
    switch (key) {
      case 'ArrowRight':
        return (index + 1) % locations.length;
      case 'ArrowLeft':
        return (index - 1 + locations.length) % locations.length;
      case 'ArrowDown':
        return index + PILL_COLUMNS <= last ? index + PILL_COLUMNS : index;
      case 'ArrowUp':
        return index - PILL_COLUMNS >= 0 ? index - PILL_COLUMNS : index;
      case 'Home':
        return 0;
      case 'End':
        return last;
      default:
        return null;
    }
  };

  return (
    <div className="sm:hidden">
      <nav
        aria-label="Critical slot location shortcuts"
        className="bg-surface-deep"
      >
        <div
          role="tablist"
          aria-label="Location"
          className={styles.criticalLocationPills}
        >
          {summaries.map(({ location, count, summary }, index) => (
            <button
              key={location}
              ref={(element) => {
                pills.current[location] = element;
              }}
              id={`${id}-location-${index}`}
              type="button"
              role="tab"
              aria-label={`${location}, ${summary}`}
              aria-selected={location === activeLocation}
              aria-controls={`${id}-panel-${index}`}
              tabIndex={location === activeLocation ? 0 : -1}
              className={styles.criticalLocationPill}
              onClick={() => setActiveLocation(location)}
              onKeyDown={(event) => {
                const next = nextIndex(event.key, index);
                if (next === null) return;
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
      <div>
        {summaries.map(({ location, summary }, index) => (
          <div
            key={location}
            id={`${id}-panel-${index}`}
            role="tabpanel"
            aria-labelledby={`${id}-location-${index}`}
            hidden={location !== activeLocation}
          >
            <h3
              data-testid="phone-location-heading"
              className={styles.criticalLocationHeading}
            >
              {location} {'\u2014'} {summary}
            </h3>
            {renderLocation(location, true)}
          </div>
        ))}
      </div>
    </div>
  );
}
