/**
 * One plate of the Blueprint biped armor diagram, front or rear inset, filled
 * from the bottom to the location's points / max with a level line when not
 * full (front and rear share one maximum, so both views fill to one level).
 * A location validation flags for low or critical armor takes the status edge
 * and icon. Either view is a button that selects its location.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';
import type { ArmorLocationIssue } from '@/utils/armor/armorLocationIssues';

import { MechLocation } from '@/types/construction';

import {
  BLUEPRINT_FISTS,
  BLUEPRINT_TYPE as TYPE,
  type BlueprintPlate,
  type BlueprintView,
  horizontalSpans,
} from './BlueprintArmorDiagram.geometry';
import {
  blueprintNeighbour,
  isBlueprintArrow,
} from './BlueprintArmorDiagram.keyboard';
import styles from './BlueprintArmorDiagram.module.css';

const TORSOS: ReadonlySet<MechLocation> = new Set([
  MechLocation.CENTER_TORSO,
  MechLocation.LEFT_TORSO,
  MechLocation.RIGHT_TORSO,
]);

export const plateKey = (view: BlueprintView, location: MechLocation): string =>
  `${view}:${location}`;

export interface PlateValues {
  readonly front: number;
  readonly rear: number;
  readonly total: number;
  readonly maximum: number;
  readonly hasRear: boolean;
  /** Allocated share of the location maximum, 0-1. */
  readonly ratio: number;
}

export function plateValues(
  location: MechLocation,
  armorData: readonly LocationArmorData[],
): PlateValues {
  const data = armorData.find((item) => item.location === location);
  const front = data?.current ?? 0;
  const hasRear = TORSOS.has(location);
  const rear = hasRear ? (data?.rear ?? 0) : 0;
  const total = front + rear;
  const maximum = data?.maximum ?? 0;
  const ratio =
    maximum > 0 && Number.isFinite(total)
      ? Math.min(1, Math.max(0, total / maximum))
      : 0;
  return { front, rear, total, maximum, hasRear, ratio };
}

/** Spoken after a flagged location's points: the issue the icon shows. */
export const ARMOR_ISSUE_WORDS: Readonly<Record<ArmorLocationIssue, string>> = {
  warning: 'low armor warning',
  error: 'critical armor error',
};

/** The plate's accessible name: location, points and max, then the split. */
export function blueprintPlateLabel(
  location: MechLocation,
  view: BlueprintView,
  values: PlateValues,
  issue?: ArmorLocationIssue,
): string {
  const side = view === 'rear' ? ' rear' : '';
  const split = values.hasRear
    ? `, front ${values.front}, rear ${values.rear}`
    : '';
  const flag = issue ? `, ${ARMOR_ISSUE_WORDS[issue]}` : '';
  return `${location}${side} armor: ${values.total} of ${values.maximum} points${split}${flag}`;
}

/** Icon size in viewBox units: about 13px at the views' scale. */
const ISSUE_ICON = 7;
const ISSUE_GAP = 1.2;

/**
 * The app's warning triangle or error circle, solid in its status colour with
 * a dark mark, drawn left of the plate code (centred on `cx`, `cy`). The icon
 * and code centre on the plate together, which keeps both clear of the
 * outline on the narrowest plate (the rear centre torso).
 */
function IssueIcon({
  issue,
  cx,
  cy,
}: {
  issue: ArmorLocationIssue;
  cx: number;
  cy: number;
}): React.ReactElement {
  const scale = ISSUE_ICON / 24;
  return (
    <g
      className={issue === 'error' ? styles.issueError : styles.issueWarning}
      transform={`translate(${cx - ISSUE_ICON / 2} ${cy - ISSUE_ICON / 2}) scale(${scale})`}
      data-armor-issue={issue}
      aria-hidden="true"
    >
      {issue === 'error' ? (
        <>
          <circle className={styles.issueShape} cx="12" cy="12" r="11" />
          <path className={styles.issueMark} d="m16 8-8 8M8 8l8 8" />
        </>
      ) : (
        <>
          <path className={styles.issueShape} d="m12 1.5 11 20H1L12 1.5Z" />
          <path className={styles.issueMark} d="M12 8.5v6" />
          <circle className={styles.issueDot} cx="12" cy="18" r="1.6" />
        </>
      )}
    </g>
  );
}

/** Half the drawn width of a two-letter plate code, in viewBox units. */
const CODE_HALF_WIDTH = TYPE.code * 0.8;

/** The cream level line across a plate at its fill edge, edge to edge. */
function LevelLine({
  plate,
  ratio,
}: {
  plate: BlueprintPlate;
  ratio: number;
}): React.ReactElement {
  const { y0, y1 } = plate.bounds;
  const y = Math.min(y1 - 0.4, Math.max(y0 + 0.4, y1 - ratio * (y1 - y0)));
  return (
    <g data-armor-level={plate.location}>
      {horizontalSpans(plate.points, y).map(([left, right]) => (
        <line
          key={left}
          className={styles.level}
          x1={left + 0.3}
          x2={right - 0.3}
          y1={y}
          y2={y}
        />
      ))}
    </g>
  );
}

interface BlueprintArmorPlateProps {
  readonly plate: BlueprintPlate;
  readonly values: PlateValues;
  /** Low (warning) or critical (error) armor flagged by validation. */
  readonly issue?: ArmorLocationIssue;
  readonly selected: boolean;
  readonly lit: boolean;
  readonly gradientId: string;
  readonly registerRef: (key: string, node: SVGGElement | null) => void;
  readonly onSelect: () => void;
  readonly onClear: () => void;
  readonly onMove: (target: MechLocation) => void;
  readonly onHover: (active: boolean) => void;
  readonly onFocusRing: (visible: boolean) => void;
}

export function BlueprintArmorPlate({
  plate,
  values,
  issue,
  selected,
  lit,
  gradientId,
  registerRef,
  onSelect,
  onClear,
  onMove,
  onHover,
  onFocusRing,
}: BlueprintArmorPlateProps): React.ReactElement {
  const { location, view, anchor } = plate;
  const isRear = view === 'rear';
  const [ax, ay] = anchor;
  const fist = isRear ? undefined : BLUEPRINT_FISTS[location];
  const lines = values.hasRear ? 3 : 2;
  const top = ay - ((lines - 1) * TYPE.gap) / 2;
  const codeY = isRear ? ay - (TYPE.gap * 0.8) / 2 : top - 0.5;
  const codeX = issue ? ax + (ISSUE_ICON + ISSUE_GAP) / 2 : ax;

  const handleKeyDown = (event: React.KeyboardEvent<SVGGElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    } else if (event.key === 'Escape') {
      onClear();
    } else if (isBlueprintArrow(event.key)) {
      const target = blueprintNeighbour(view, location, event.key);
      event.preventDefault();
      if (target) onMove(target);
    }
  };

  return (
    <g
      ref={(node) => registerRef(plateKey(view, location), node)}
      role="button"
      tabIndex={0}
      aria-label={blueprintPlateLabel(location, view, values, issue)}
      aria-pressed={selected}
      className={[
        styles.plate,
        isRear ? styles.rearPlate : styles.frontPlate,
        issue === 'warning' ? styles.isWarning : '',
        issue === 'error' ? styles.isError : '',
        lit ? styles.isLit : '',
        selected ? styles.isSelected : '',
      ].join(' ')}
      data-armor-view={view}
      data-armor-location={location}
      onClick={onSelect}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onPointerDown={() => onFocusRing(false)}
      onFocus={(event) => {
        let keyboard = true;
        try {
          keyboard = event.currentTarget.matches(':focus-visible');
        } catch {
          // Engines without :focus-visible treat every focus as keyboard focus.
        }
        onFocusRing(keyboard);
      }}
      onBlur={() => onFocusRing(false)}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className={styles.stopWell} />
          <stop offset={1 - values.ratio} className={styles.stopWell} />
          <stop offset={1 - values.ratio} className={styles.stopFill} />
          <stop offset="1" className={styles.stopFill} />
        </linearGradient>
      </defs>
      <path
        d={plate.path}
        fill={`url(#${gradientId})`}
        // The eight front plates are the drawing's location plates.
        data-armor-plate={isRear ? undefined : location}
        data-armor-fill={location}
        data-armor-fill-ratio={values.ratio}
      />
      {values.ratio < 1 && <LevelLine plate={plate} ratio={values.ratio} />}
      {fist && (
        <g aria-hidden="true">
          <path className={styles.fistArea} d={fist.hitArea} />
          <path className={styles.detail} d={fist.detail} />
        </g>
      )}
      <path className={styles.edge} d={plate.path} />
      {issue && (
        <IssueIcon
          issue={issue}
          cx={codeX - CODE_HALF_WIDTH - ISSUE_GAP - ISSUE_ICON / 2}
          cy={codeY - TYPE.code * 0.36}
        />
      )}
      {isRear ? (
        <>
          <text
            className={styles.code}
            x={codeX}
            y={codeY}
            fontSize={TYPE.code}
          >
            {plate.code}
          </text>
          {/* Same size, weight and tone as the front plates' "F n" line. */}
          <text
            className={styles.sub}
            x={ax}
            y={ay + (TYPE.gap * 0.8) / 2 + TYPE.small * 0.36}
            fontSize={TYPE.small}
          >
            <tspan
              data-armor-face="rear"
              data-armor-face-location={location}
            >{`R ${values.rear}`}</tspan>
          </text>
        </>
      ) : (
        <>
          <text
            className={styles.code}
            x={codeX}
            y={codeY}
            fontSize={TYPE.code}
          >
            {plate.code}
          </text>
          <text
            className={styles.value}
            x={ax}
            y={top + TYPE.gap + 0.5}
            fontSize={TYPE.value}
            data-armor-total-location={location}
          >
            {values.total}
            <tspan
              className={styles.max}
              fontSize={TYPE.small}
            >{` / ${values.maximum}`}</tspan>
          </text>
          {values.hasRear && (
            <text
              className={styles.sub}
              x={ax}
              y={top + 2 * TYPE.gap}
              fontSize={TYPE.small}
            >
              <tspan
                data-armor-face="front"
                data-armor-face-location={location}
              >{`F ${values.front}`}</tspan>
            </text>
          )}
        </>
      )}
    </g>
  );
}
