import React, { useMemo } from 'react';

import type { ICombatRangeHex, IHexCoordinate } from '@/types/gameplay';
import type {
  ArcClassifierUnit,
  ArcMapBounds,
  UiFiringArc,
} from '@/utils/overlays/arcClassifier';

import {
  hexPath,
  hexToPixel,
} from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { coordToKey, hexEquals } from '@/utils/gameplay/hexMath';
import { classifyFiringArcHexes } from '@/utils/overlays/arcClassifier';

import {
  firingArcCombatProjectionAttributes,
  firingArcCombatProjectionSummary,
} from './FiringArcOverlay.combatProjection';

export interface FiringArcOverlayProps {
  readonly unit: ArcClassifierUnit | null;
  readonly hexes: readonly IHexCoordinate[];
  readonly maxRange: number;
  readonly mapHexes?: ArcMapBounds;
  readonly enabled?: boolean;
  readonly visibleArcs?: readonly UiFiringArc[];
  readonly combatProjectionLookup?: ReadonlyMap<string, ICombatRangeHex>;
  readonly zoom?: number;
  readonly labelZoomThreshold?: number;
  readonly testId?: string;
}

interface ArcStyle {
  readonly fill: string;
  readonly fillOpacity: number;
  readonly stroke: string;
  readonly label: string;
  readonly shortLabel: string;
}

const ARC_STYLES: Record<Exclude<UiFiringArc, 'out-of-arc'>, ArcStyle> = {
  front: {
    fill: '#22c55e',
    fillOpacity: 0.25,
    stroke: '#15803d',
    label: 'Front arc',
    shortLabel: 'FRONT',
  },
  'left-side': {
    fill: '#eab308',
    fillOpacity: 0.2,
    stroke: '#a16207',
    label: 'Left side arc',
    shortLabel: 'L ARC',
  },
  'right-side': {
    fill: '#eab308',
    fillOpacity: 0.2,
    stroke: '#a16207',
    label: 'Right side arc',
    shortLabel: 'R ARC',
  },
  rear: {
    fill: '#f43f5e',
    fillOpacity: 0.25,
    stroke: '#be123c',
    label: 'Rear arc',
    shortLabel: 'REAR',
  },
};

const DEFAULT_LABEL_ZOOM_THRESHOLD = 0.75;
const MAX_TEXT_LABELS_PER_ARC = 4;

function coordsEqual(
  left: IHexCoordinate | null | undefined,
  right: IHexCoordinate | null | undefined,
): boolean {
  if (!left || !right) return left === right;
  return hexEquals(left, right);
}

function coordListEqual(
  left: readonly IHexCoordinate[],
  right: readonly IHexCoordinate[],
): boolean {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  return left.every((coord, index) => hexEquals(coord, right[index]));
}

function arcListEqual(
  left: readonly UiFiringArc[] | undefined,
  right: readonly UiFiringArc[] | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return left === right;
  if (left.length !== right.length) return false;
  return left.every((arc, index) => arc === right[index]);
}

function isCoordinateBounds(
  bounds: ArcMapBounds,
): bounds is readonly IHexCoordinate[] {
  return Array.isArray(bounds);
}

function mapBoundsKeys(bounds: ArcMapBounds): readonly string[] {
  if (isCoordinateBounds(bounds)) {
    return bounds.map(coordToKey);
  }
  return Array.from(bounds);
}

function mapBoundsEqual(
  left: ArcMapBounds | undefined,
  right: ArcMapBounds | undefined,
): boolean {
  if (left === right) return true;
  if (!left || !right) return left === right;

  const leftKeys = mapBoundsKeys(left);
  const rightKeys = mapBoundsKeys(right);

  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key, index) => key === rightKeys[index]);
}

function unitsEqual(
  left: ArcClassifierUnit | null,
  right: ArcClassifierUnit | null,
): boolean {
  if (!left || !right) return left === right;
  return (
    coordsEqual(left.coord, right.coord) &&
    left.facing === right.facing &&
    left.unitId === right.unitId &&
    left.prone === right.prone
  );
}

export function areFiringArcOverlayPropsEqual(
  previous: FiringArcOverlayProps,
  next: FiringArcOverlayProps,
): boolean {
  return (
    unitsEqual(previous.unit, next.unit) &&
    coordListEqual(previous.hexes, next.hexes) &&
    previous.maxRange === next.maxRange &&
    previous.enabled === next.enabled &&
    previous.testId === next.testId &&
    previous.zoom === next.zoom &&
    previous.labelZoomThreshold === next.labelZoomThreshold &&
    previous.combatProjectionLookup === next.combatProjectionLookup &&
    mapBoundsEqual(previous.mapHexes, next.mapHexes) &&
    arcListEqual(previous.visibleArcs, next.visibleArcs)
  );
}

function ArcShape({
  arc,
  hex,
  testId,
}: {
  readonly arc: Exclude<UiFiringArc, 'out-of-arc'>;
  readonly hex: IHexCoordinate;
  readonly testId: string;
}): React.ReactElement {
  const { x, y } = hexToPixel(hex);

  if (arc === 'front') {
    return (
      <path
        d={`M ${x - 8} ${y + 4} L ${x} ${y - 6} L ${x + 8} ${y + 4}`}
        fill="none"
        stroke="#14532d"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        data-testid={testId}
      />
    );
  }

  if (arc === 'rear') {
    return (
      <line
        x1={x - 8}
        y1={y}
        x2={x + 8}
        y2={y}
        stroke="#881337"
        strokeWidth={2.5}
        strokeLinecap="round"
        data-testid={testId}
      />
    );
  }

  return (
    <circle
      cx={x}
      cy={y}
      r={3.5}
      fill="#713f12"
      fillOpacity={0.9}
      data-testid={testId}
    />
  );
}

function ArcTextBadge({
  hex,
  style,
}: {
  readonly hex: IHexCoordinate;
  readonly style: ArcStyle;
}): React.ReactElement {
  const { x, y } = hexToPixel(hex);
  const width = style.shortLabel.length * 6 + 10;
  const key = coordToKey(hex);

  return (
    <g
      data-testid={`firing-arc-label-${key}`}
      data-arc-label={style.shortLabel}
      aria-label={style.label}
    >
      <rect
        x={x - width / 2}
        y={y + 10}
        width={width}
        height={13}
        rx={3}
        fill="#0f172a"
        fillOpacity={0.86}
        stroke={style.stroke}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y + 19}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {style.shortLabel}
      </text>
    </g>
  );
}

function representativeLabelKeysForArc(
  arcHexes: readonly {
    readonly hex: IHexCoordinate;
    readonly arc: UiFiringArc;
    readonly distance: number;
  }[],
): readonly string[] {
  if (arcHexes.length <= MAX_TEXT_LABELS_PER_ARC) {
    return arcHexes.map(({ hex }) => coordToKey(hex));
  }

  const ordered = [...arcHexes].sort((left, right) => {
    if (left.distance !== right.distance) return left.distance - right.distance;
    return coordToKey(left.hex).localeCompare(coordToKey(right.hex));
  });
  const indexes = new Set<number>([
    0,
    Math.round((ordered.length - 1) / 3),
    Math.round(((ordered.length - 1) * 2) / 3),
    ordered.length - 1,
  ]);

  return Array.from(indexes)
    .sort((left, right) => left - right)
    .map((index) => coordToKey(ordered[index].hex));
}

function buildRepresentativeArcLabelKeySet({
  arcHexes,
  labelZoomThreshold,
  zoom,
}: {
  readonly arcHexes: readonly {
    readonly hex: IHexCoordinate;
    readonly arc: UiFiringArc;
    readonly distance: number;
  }[];
  readonly labelZoomThreshold: number;
  readonly zoom: number;
}): ReadonlySet<string> {
  if (zoom < labelZoomThreshold) return new Set();

  const labelsByArc = new Map<
    Exclude<UiFiringArc, 'out-of-arc'>,
    {
      readonly hex: IHexCoordinate;
      readonly arc: UiFiringArc;
      readonly distance: number;
    }[]
  >();
  for (const classification of arcHexes) {
    if (classification.arc === 'out-of-arc') continue;
    const arc = classification.arc;
    const labels = labelsByArc.get(arc) ?? [];
    labels.push(classification);
    labelsByArc.set(arc, labels);
  }

  return new Set(
    Array.from(labelsByArc.values()).flatMap(representativeLabelKeysForArc),
  );
}

function FiringArcOverlayComponent({
  unit,
  hexes,
  maxRange,
  mapHexes,
  enabled = true,
  visibleArcs,
  combatProjectionLookup,
  zoom = 1,
  labelZoomThreshold = DEFAULT_LABEL_ZOOM_THRESHOLD,
  testId = 'firing-arc-overlay',
}: FiringArcOverlayProps): React.ReactElement {
  const arcHexes = useMemo(() => {
    if (!enabled || !unit) return [];

    return classifyFiringArcHexes(unit, hexes, {
      mapHexes,
      maxRange,
      includeOrigin: false,
      visibleArcs,
    }).filter((classification) => classification.arc !== 'out-of-arc');
  }, [enabled, hexes, mapHexes, maxRange, unit, visibleArcs]);
  const representativeLabelKeys = useMemo(
    () =>
      buildRepresentativeArcLabelKeySet({
        arcHexes,
        labelZoomThreshold,
        zoom,
      }),
    [arcHexes, labelZoomThreshold, zoom],
  );

  return (
    <g
      pointerEvents="none"
      data-testid={testId}
      aria-label="Firing arc overlay"
    >
      {arcHexes.map(({ hex, arc }) => {
        const typedArc = arc as Exclude<UiFiringArc, 'out-of-arc'>;
        const style = ARC_STYLES[typedArc];
        const key = coordToKey(hex);
        const combatProjection = combatProjectionLookup?.get(key);
        const combatSummary =
          firingArcCombatProjectionSummary(combatProjection);
        const projectionAttributes =
          firingArcCombatProjectionAttributes(combatProjection);
        const title = combatSummary
          ? `${style.label} at (${hex.q}, ${hex.r}); ${combatSummary}`
          : `${style.label} at (${hex.q}, ${hex.r})`;
        const { x, y } = hexToPixel(hex);

        return (
          <g
            key={key}
            data-testid={`firing-arc-hex-${key}`}
            data-arc={typedArc}
            aria-label={title}
            {...projectionAttributes}
          >
            <title>{title}</title>
            <path
              d={hexPath(x, y)}
              fill={style.fill}
              fillOpacity={style.fillOpacity}
              stroke={style.stroke}
              strokeOpacity={0.35}
              strokeWidth={1}
              data-testid={`firing-arc-fill-${key}`}
              {...projectionAttributes}
            />
            <ArcShape
              arc={typedArc}
              hex={hex}
              testId={`firing-arc-shape-${typedArc}-${key}`}
            />
            {representativeLabelKeys.has(key) && (
              <ArcTextBadge hex={hex} style={style} />
            )}
          </g>
        );
      })}
    </g>
  );
}

export const FiringArcOverlay = React.memo(
  FiringArcOverlayComponent,
  areFiringArcOverlayPropsEqual,
);

export default FiringArcOverlay;
