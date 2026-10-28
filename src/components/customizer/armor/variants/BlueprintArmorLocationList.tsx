/**
 * Compact per-location list beside the Blueprint biped diagram: Front, Rear
 * and Total for every location side by side, so torso rear armor reads
 * without finding it on the inset. Each row is a button that selects its
 * location and shares the plates' hover and selected states; a location
 * validation flags for low or critical armor carries the same icon as its
 * plates.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { ArmorLocationIssues } from '@/utils/armor/armorLocationIssues';

import { SeverityIcon } from '@/components/customizer/shared/BuildStatusLabel';
import { MechLocation } from '@/types/construction';

import { BLUEPRINT_FRONT_PLATES } from './BlueprintArmorDiagram.geometry';
import styles from './BlueprintArmorDiagram.module.css';
import { ARMOR_ISSUE_WORDS, plateValues } from './BlueprintArmorPlate';

/** Record-sheet order: head, torsos (with their rear), arms, legs. */
const LIST_ORDER: readonly MechLocation[] = [
  MechLocation.HEAD,
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
  MechLocation.LEFT_ARM,
  MechLocation.RIGHT_ARM,
  MechLocation.LEFT_LEG,
  MechLocation.RIGHT_LEG,
];

const CODES = new Map(
  BLUEPRINT_FRONT_PLATES.map((plate) => [plate.location, plate.code]),
);

interface BlueprintArmorLocationListProps {
  readonly armorData: readonly LocationArmorData[];
  readonly locationIssues: ArmorLocationIssues;
  readonly selectedLocation: MechLocation | null;
  readonly lit: MechLocation | null;
  readonly onSelect: (location: MechLocation) => void;
  readonly onHover: (location: MechLocation, active: boolean) => void;
}

export function BlueprintArmorLocationList({
  armorData,
  locationIssues,
  selectedLocation,
  lit,
  onSelect,
  onHover,
}: BlueprintArmorLocationListProps): React.ReactElement {
  return (
    <div
      className={styles.list}
      role="group"
      aria-label="Armor by location"
      data-testid="armor-location-list"
    >
      <div className={styles.listHeader} aria-hidden="true">
        <span>Location</span>
        <span>Front</span>
        <span>Rear</span>
        <span>Total</span>
      </div>
      {LIST_ORDER.map((location) => {
        const values = plateValues(location, armorData);
        const rear = values.hasRear ? `, rear ${values.rear}` : '';
        const issue = locationIssues[location];
        const flag = issue ? `, ${ARMOR_ISSUE_WORDS[issue]}` : '';
        return (
          <button
            key={location}
            type="button"
            className={[
              styles.listRow,
              lit === location ? styles.isLit : '',
              selectedLocation === location ? styles.isSelected : '',
            ].join(' ')}
            aria-pressed={selectedLocation === location}
            aria-label={`${location}: front ${values.front}${rear}, total ${values.total} of ${values.maximum}${flag}`}
            data-armor-list-location={location}
            onClick={() => onSelect(location)}
            onMouseEnter={() => onHover(location, true)}
            onMouseLeave={() => onHover(location, false)}
          >
            <span className={styles.listCode}>
              {CODES.get(location)}
              {issue && <SeverityIcon kind={issue} />}
            </span>
            <span>{values.front}</span>
            <span className={values.hasRear ? undefined : styles.listNone}>
              {values.hasRear ? values.rear : '—'}
            </span>
            <span className={styles.listTotal}>
              {values.total}
              <span className={styles.listMax}>{` / ${values.maximum}`}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
