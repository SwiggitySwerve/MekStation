import React, { useMemo } from 'react';

import type { ICombatRangeHex } from '@/types/gameplay';
import type {
  IHexCoordinate,
  IHexGrid,
} from '@/types/gameplay/HexGridInterfaces';
import type {
  LOSBlockerMetadata,
  LOSClassification,
  LOSOverlayState,
} from '@/utils/overlays/losClassifier';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { usePrefersReducedMotion } from '@/hooks/useReducedMotion';
import { hexEquals } from '@/utils/gameplay/hexMath';
import { classifyLOS } from '@/utils/overlays/losClassifier';

import {
  combatProjectionDataAttributes,
  combatProjectionSummary,
} from './LineOfSightOverlay.combatProjection';

const LOS_FADE_DURATION_MS = 180;

export interface LineOfSightOverlayProps {
  readonly origin: IHexCoordinate | null;
  readonly target: IHexCoordinate | null;
  readonly grid: IHexGrid | null;
  readonly enabled?: boolean;
  readonly fromElevation?: number;
  readonly toElevation?: number;
  readonly combatProjection?: ICombatRangeHex;
  readonly testId?: string;
}

interface LOSStyle {
  readonly stroke: string;
  readonly dash?: string;
}

const LOS_STYLES: Record<LOSOverlayState, LOSStyle> = {
  clear: { stroke: '#16a34a' },
  partial: { stroke: '#ca8a04', dash: '6,4' },
  blocked: { stroke: '#dc2626' },
};

function coordsEqual(
  left: IHexCoordinate | null | undefined,
  right: IHexCoordinate | null | undefined,
): boolean {
  if (!left || !right) return left === right;
  return hexEquals(left, right);
}

export function areLineOfSightOverlayPropsEqual(
  previous: LineOfSightOverlayProps,
  next: LineOfSightOverlayProps,
): boolean {
  return (
    coordsEqual(previous.origin, next.origin) &&
    coordsEqual(previous.target, next.target) &&
    previous.grid === next.grid &&
    previous.enabled === next.enabled &&
    previous.fromElevation === next.fromElevation &&
    previous.toElevation === next.toElevation &&
    previous.combatProjection === next.combatProjection &&
    previous.testId === next.testId
  );
}

function announcementFor(classification: LOSClassification): string {
  if (classification.state === 'clear') {
    return 'Line of sight clear';
  }

  const firstAnnotation = classification.blockerAnnotations[0];
  if (classification.state === 'partial') {
    return firstAnnotation
      ? `Line of sight partial: ${firstAnnotation.title}`
      : 'Line of sight partial';
  }

  return firstAnnotation
    ? `Line of sight blocked: ${firstAnnotation.title}`
    : 'Line of sight blocked';
}

function losStateLabel(state: LOSOverlayState): string {
  switch (state) {
    case 'clear':
      return 'LOS';
    case 'partial':
      return 'P-LOS';
    case 'blocked':
      return 'NO LOS';
  }
}

function CoverIcon({
  annotation,
}: {
  readonly annotation: LOSBlockerMetadata;
}): React.ReactElement {
  const { x, y } = hexToPixel(annotation.coord);
  const key = `${annotation.coord.q},${annotation.coord.r}`;

  return (
    <g
      data-testid={`los-annotation-cover-${key}`}
      data-icon="cover"
      aria-label={annotation.title}
    >
      <title>{annotation.title}</title>
      <path
        d={`M ${x} ${y - 12} L ${x - 10} ${y - 5} L ${x - 8} ${y + 8} Q ${x} ${y + 14} ${x + 8} ${y + 8} L ${x + 10} ${y - 5} Z`}
        fill="#fef3c7"
        stroke="#92400e"
        strokeWidth={1.5}
      />
      <line
        x1={x - 6}
        y1={y}
        x2={x + 6}
        y2={y}
        stroke="#92400e"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </g>
  );
}

function WallIcon({
  annotation,
}: {
  readonly annotation: LOSBlockerMetadata;
}): React.ReactElement {
  const { x, y } = hexToPixel(annotation.coord);
  const key = `${annotation.coord.q},${annotation.coord.r}`;

  return (
    <g
      data-testid={`los-annotation-wall-${key}`}
      data-icon="wall"
      aria-label={annotation.title}
    >
      <title>{annotation.title}</title>
      <rect
        x={x - 11}
        y={y - 10}
        width={22}
        height={20}
        rx={2}
        fill="#fee2e2"
        stroke="#991b1b"
        strokeWidth={1.5}
      />
      <line x1={x - 11} y1={y - 3} x2={x + 11} y2={y - 3} stroke="#991b1b" />
      <line x1={x - 11} y1={y + 4} x2={x + 11} y2={y + 4} stroke="#991b1b" />
      <line x1={x - 3} y1={y - 10} x2={x - 3} y2={y - 3} stroke="#991b1b" />
      <line x1={x + 5} y1={y - 3} x2={x + 5} y2={y + 4} stroke="#991b1b" />
      <line x1={x - 4} y1={y + 4} x2={x - 4} y2={y + 10} stroke="#991b1b" />
    </g>
  );
}

function BlockerAnnotation({
  annotation,
}: {
  readonly annotation: LOSBlockerMetadata;
}): React.ReactElement {
  if (annotation.icon === 'wall') {
    return <WallIcon annotation={annotation} />;
  }

  return <CoverIcon annotation={annotation} />;
}

function LOSStateBadge({
  classification,
  start,
  end,
  announcement,
  combatProjection,
}: {
  readonly classification: LOSClassification;
  readonly start: { readonly x: number; readonly y: number };
  readonly end: { readonly x: number; readonly y: number };
  readonly announcement: string;
  readonly combatProjection?: ICombatRangeHex;
}): React.ReactElement {
  const label = losStateLabel(classification.state);
  const x = (start.x + end.x) / 2;
  const y = (start.y + end.y) / 2 - 12;
  const width = label.length * 6 + 12;
  const combatProjectionAttributes =
    combatProjectionDataAttributes(combatProjection);

  return (
    <g
      data-testid="los-state-badge"
      data-state={classification.state}
      aria-label={announcement}
      {...combatProjectionAttributes}
    >
      <title>{announcement}</title>
      <rect
        x={x - width / 2}
        y={y - 8}
        width={width}
        height={14}
        rx={3}
        fill="#0f172a"
        fillOpacity={0.88}
        stroke={LOS_STYLES[classification.state].stroke}
        strokeWidth={1}
      />
      <text
        x={x}
        y={y + 2}
        textAnchor="middle"
        fontSize={8}
        fontWeight="bold"
        fill="#f8fafc"
      >
        {label}
      </text>
    </g>
  );
}

function LineOfSightOverlayComponent({
  origin,
  target,
  grid,
  enabled = true,
  fromElevation,
  toElevation,
  combatProjection,
  testId = 'line-of-sight-overlay',
}: LineOfSightOverlayProps): React.ReactElement {
  const prefersReducedMotion = usePrefersReducedMotion();
  const classification = useMemo(() => {
    if (!enabled || !origin || !target || !grid) return null;
    return classifyLOS(origin, target, grid, {
      fromElevation,
      toElevation,
    });
  }, [enabled, fromElevation, grid, origin, target, toElevation]);

  if (!classification || !origin || !target) {
    return (
      <g
        pointerEvents="none"
        data-testid={testId}
        aria-label="Line of sight overlay"
        aria-live="polite"
      />
    );
  }

  const style = LOS_STYLES[classification.state];
  const start = hexToPixel(origin);
  const end = hexToPixel(classification.lineEnd);
  const projectionSummary = combatProjectionSummary(combatProjection);
  const announcement = projectionSummary
    ? `${announcementFor(classification)}; ${projectionSummary}`
    : announcementFor(classification);
  const combatProjectionAttributes =
    combatProjectionDataAttributes(combatProjection);
  // Fade in line + annotations together on mount/target change. Reduced
  // motion users get the overlay rendered fully opaque without animation.
  // @spec openspec/changes/add-los-and-firing-arc-overlays/tasks.md §7.4
  const fadeStyle: React.CSSProperties | undefined = prefersReducedMotion
    ? undefined
    : {
        animation: `mks-los-fade-in ${LOS_FADE_DURATION_MS}ms ease-out`,
      };

  return (
    <g
      pointerEvents="none"
      data-testid={testId}
      data-fade-duration-ms={prefersReducedMotion ? 0 : LOS_FADE_DURATION_MS}
      aria-label={announcement}
      aria-live="polite"
      style={fadeStyle}
      {...combatProjectionAttributes}
    >
      <title>{announcement}</title>
      <style>{`@keyframes mks-los-fade-in { from { opacity: 0; } to { opacity: 1; } }`}</style>
      <line
        data-testid="los-line"
        data-state={classification.state}
        x1={start.x}
        y1={start.y}
        x2={end.x}
        y2={end.y}
        stroke={style.stroke}
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={style.dash}
        {...combatProjectionAttributes}
      />
      <LOSStateBadge
        classification={classification}
        start={start}
        end={end}
        announcement={announcement}
        combatProjection={combatProjection}
      />
      {classification.blockerAnnotations.map((annotation) => (
        <BlockerAnnotation
          key={`${annotation.icon}-${annotation.coord.q},${annotation.coord.r}`}
          annotation={annotation}
        />
      ))}
    </g>
  );
}

export const LineOfSightOverlay = React.memo(
  LineOfSightOverlayComponent,
  areLineOfSightOverlayPropsEqual,
);

export default LineOfSightOverlay;
