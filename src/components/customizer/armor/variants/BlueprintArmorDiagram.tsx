/**
 * Blueprint Armor Diagram
 *
 * The Standard biped silhouette: the record sheet's 'Mech drawn as a FRONT
 * view with the sheet's REAR-torso inset beside it (under it on a phone).
 * Coverage has one encoding, fill height: each front plate fills from the
 * bottom to points / location max in one neutral steel tone over an empty
 * well in the page navy, with a cream level line on any plate that is not
 * full.
 * Rear plates fill to the same level as their location, since front and rear
 * share one maximum. A location the unit's validation flags for low armor
 * takes the warning edge and icon (the error ones for critical armor) on its
 * plates and list row: the drawing's only status colour. Beside the views, a
 * compact list gives Front, Rear and Total per location; the unit totals live
 * in the tab's summary bar.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useId, useRef, useState } from 'react';

import type { ArmorLocationIssues } from '@/utils/armor/armorLocationIssues';

import { MechLocation } from '@/types/construction';

import type { ConfigurableArmorDiagramProps } from '../shared/ArmorVariantRenderHelpers';

import { customizerStyles as cs } from '../../styles';
import { DiagramHeader } from '../shared/DiagramHeader';
import {
  BLUEPRINT_CENTRE_LINE,
  BLUEPRINT_FRONT_PLATES,
  BLUEPRINT_FRONT_VIEWBOX,
  BLUEPRINT_GROUND_LINE,
  BLUEPRINT_REAR_PLATES,
  BLUEPRINT_REAR_VIEWBOX,
  type BlueprintPlate,
  type BlueprintView,
} from './BlueprintArmorDiagram.geometry';
import styles from './BlueprintArmorDiagram.module.css';
import { BlueprintArmorLocationList } from './BlueprintArmorLocationList';
import {
  BlueprintArmorPlate,
  plateKey,
  plateValues,
} from './BlueprintArmorPlate';

function ViewHeader({ children }: { children: string }): React.ReactElement {
  return (
    <div className={styles.viewHeader}>
      <h4 className={cs.text.subsection}>{children}</h4>
      <span className={styles.rule} aria-hidden="true" />
    </div>
  );
}

/** The key: a plate glyph filled to 60% with its level line, and F / R. */
function FillKey(): React.ReactElement {
  return (
    <div className={styles.key} data-testid="armor-fill-key">
      <span className={styles.keyItem}>
        <svg
          className={styles.keyGlyph}
          viewBox="0 0 16 20"
          width="16"
          height="20"
          aria-hidden="true"
        >
          <rect
            className={styles.keyWell}
            x="0.75"
            y="0.75"
            width="14.5"
            height="18.5"
            rx="1"
          />
          <rect
            className={styles.keyFill}
            x="0.75"
            y="8"
            width="14.5"
            height="11.25"
          />
          <line className={styles.keyLevel} x1="1" x2="15" y1="8.5" y2="8.5" />
          <rect
            className={styles.keyEdge}
            x="0.75"
            y="0.75"
            width="14.5"
            height="18.5"
            rx="1"
          />
        </svg>
        <span>Fill = Points of Max</span>
      </span>
      <span className={styles.keyItem}>
        <span>
          <b className={styles.keyLetter}>F</b> Front ·{' '}
          <b className={styles.keyLetter}>R</b> Rear
        </span>
      </span>
    </div>
  );
}

export interface BlueprintArmorDiagramProps extends ConfigurableArmorDiagramProps {
  /** Locations the unit's validation flags for low or critical armor. */
  readonly locationIssues?: ArmorLocationIssues;
}

export function BlueprintArmorDiagram({
  armorData,
  selectedLocation,
  onLocationClick,
  locationIssues = {},
  className = '',
}: BlueprintArmorDiagramProps): React.ReactElement {
  const [hovered, setHovered] = useState<MechLocation | null>(null);
  const [ring, setRing] = useState<{
    view: BlueprintView;
    location: MechLocation;
  } | null>(null);
  const plateRefs = useRef(new Map<string, SVGGElement>());
  const idBase = useId();

  const registerRef = (key: string, node: SVGGElement | null) => {
    if (node) plateRefs.current.set(key, node);
    else plateRefs.current.delete(key);
  };
  const lit = hovered ?? ring?.location ?? null;
  const editing = BLUEPRINT_FRONT_PLATES.some(
    (plate) => plate.location === selectedLocation,
  )
    ? selectedLocation
    : null;

  const renderPlate = (plate: BlueprintPlate) => {
    const { view, location } = plate;
    return (
      <BlueprintArmorPlate
        key={plateKey(view, location)}
        plate={plate}
        values={plateValues(location, armorData)}
        issue={locationIssues[location]}
        selected={selectedLocation === location}
        lit={lit === location}
        gradientId={`${idBase}-${view}-${plate.code}`}
        registerRef={registerRef}
        onSelect={() => onLocationClick(location)}
        // ArmorTab toggles a location off when it is chosen again, so
        // Escape closes the editor through the same callback.
        onClear={() => {
          if (selectedLocation) onLocationClick(selectedLocation);
        }}
        onMove={(target) =>
          plateRefs.current.get(plateKey(view, target))?.focus()
        }
        onHover={(active) =>
          setHovered((prev) =>
            active ? location : prev === location ? null : prev,
          )
        }
        onFocusRing={(visible) =>
          setRing((prev) =>
            visible
              ? { view, location }
              : prev?.view === view && prev.location === location
                ? null
                : prev,
          )
        }
      />
    );
  };

  const ringPlate = (view: BlueprintView) => {
    if (ring?.view !== view) return null;
    const plates =
      view === 'front' ? BLUEPRINT_FRONT_PLATES : BLUEPRINT_REAR_PLATES;
    const plate = plates.find((p) => p.location === ring.location);
    return plate ? (
      <path
        className={styles.ring}
        d={plate.ringPath}
        data-armor-focus-ring={plate.location}
      />
    ) : null;
  };

  return (
    <div
      className={`bg-surface-base border-border-theme @container flex flex-col rounded-lg border p-3 sm:p-4 ${className}`}
      data-armor-variant="clean-tech"
      data-armor-design="blueprint"
    >
      <DiagramHeader title="Armor Allocation" className="mb-2 sm:mb-3" />
      <div className={styles.views}>
        <div className={styles.frontView}>
          <ViewHeader>Front</ViewHeader>
          <svg
            className={styles.frontSvg}
            viewBox={BLUEPRINT_FRONT_VIEWBOX}
            role="group"
            aria-label="Front view"
          >
            <g aria-hidden="true">
              <line
                className={styles.centreLine}
                x1={BLUEPRINT_CENTRE_LINE.x}
                x2={BLUEPRINT_CENTRE_LINE.x}
                y1={BLUEPRINT_CENTRE_LINE.y1}
                y2={BLUEPRINT_CENTRE_LINE.y2}
              />
              <line
                className={styles.groundLine}
                x1={BLUEPRINT_GROUND_LINE.x1}
                x2={BLUEPRINT_GROUND_LINE.x2}
                y1={BLUEPRINT_GROUND_LINE.y}
                y2={BLUEPRINT_GROUND_LINE.y}
              />
            </g>
            {BLUEPRINT_FRONT_PLATES.map(renderPlate)}
            {ringPlate('front')}
          </svg>
        </div>
        <div className={styles.sideColumn}>
          <div className={styles.rearView}>
            <ViewHeader>Rear</ViewHeader>
            <div className={styles.rearRow}>
              <svg
                className={styles.rearSvg}
                viewBox={BLUEPRINT_REAR_VIEWBOX}
                role="group"
                aria-label="Rear view"
              >
                {BLUEPRINT_REAR_PLATES.map(renderPlate)}
                {ringPlate('rear')}
              </svg>
              <p
                className={`${styles.caption} ${editing ? styles.isEditing : ''}`}
                aria-live="polite"
                data-testid="armor-diagram-caption"
              >
                {editing
                  ? `Editing ${editing}`
                  : 'Select a location or row to edit'}
              </p>
            </div>
          </div>
          <BlueprintArmorLocationList
            armorData={armorData}
            locationIssues={locationIssues}
            selectedLocation={selectedLocation}
            lit={lit}
            onSelect={onLocationClick}
            onHover={(location, active) =>
              setHovered((prev) =>
                active ? location : prev === location ? null : prev,
              )
            }
          />
          <FillKey />
        </div>
      </div>
      <p className="sr-only">
        Armor locations are buttons. Tab to a location or move between locations
        with the arrow keys, then press Enter to edit its armor values. Press
        Escape to close the editor.
      </p>
    </div>
  );
}
