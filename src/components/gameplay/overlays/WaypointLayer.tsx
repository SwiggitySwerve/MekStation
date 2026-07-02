/**
 * WaypointLayer
 *
 * Per `tactical-movement-intent-composer` (tactical-map-interface delta, ADDED
 * requirement "Waypoint Composition Interaction", task 3.4): renders the
 * composed Locomotion Path as anchored legs with:
 *
 *  - a distinct marker at every Waypoint,
 *  - a Pivot Point indicator (with its facing-change MP) wherever travel
 *    direction changes at a waypoint,
 *  - a per-leg cost chip showing each leg's MP along the path (gated below
 *    `medium` zoom per the design open-question resolution).
 *
 * Markers, pivot indicators, and cost chips are NON-interactive except the pop
 * affordance on the LAST waypoint — clicking the last waypoint pops the final
 * leg (spec: "pop affordance is limited to the last waypoint"). The pop click is
 * routed through the same `onPopLastWaypoint` the map click handler uses, so the
 * pure-SVG layer stays presentational.
 *
 * The component is pure SVG and mounts inside the HexMapDisplay `<svg>` via the
 * `svgOverlayChildren` slot, inheriting the projection transform.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-map-interface/spec.md
 */

import React from 'react';

import type { ILocomotionLeg } from '@/types/gameplay';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';

/** Below this zoom the per-leg cost chips are hidden (design LOD gate). */
const COST_CHIP_MIN_ZOOM = 0.75;

export interface WaypointLayerProps {
  /** The composed Locomotion Path legs, in composition order. */
  readonly legs: readonly ILocomotionLeg[];
  /** Current map zoom — gates the per-leg cost chips below `medium`. */
  readonly zoom: number;
  /** Pop the final leg (fired when the last waypoint marker is clicked). */
  readonly onPopLastWaypoint?: () => void;
  /** Optional testid passthrough. */
  readonly testId?: string;
}

/**
 * The mid-path pixel of a leg — used to anchor its cost chip so chips don't
 * stack on the waypoint markers. Falls back to the destination when the leg has
 * a single-hex path.
 */
function legMidpointPixel(leg: ILocomotionLeg): { x: number; y: number } {
  const from = hexToPixel(leg.from.hex);
  const to = hexToPixel(leg.to.hex);
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function WaypointMarker({
  leg,
  isLast,
  onPopLastWaypoint,
}: {
  readonly leg: ILocomotionLeg;
  readonly isLast: boolean;
  readonly onPopLastWaypoint?: () => void;
}): React.ReactElement {
  const { x, y } = hexToPixel(leg.to.hex);
  const interactive = isLast && Boolean(onPopLastWaypoint);
  return (
    <g
      data-testid={`waypoint-marker-${leg.to.hex.q}-${leg.to.hex.r}`}
      data-waypoint-last={isLast ? 'true' : undefined}
      data-waypoint-interactive={interactive ? 'true' : undefined}
      className={interactive ? 'cursor-pointer' : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={
        interactive
          ? `Remove last waypoint at ${leg.to.hex.q}, ${leg.to.hex.r}`
          : undefined
      }
      onClick={interactive ? onPopLastWaypoint : undefined}
    >
      <circle
        cx={x}
        cy={y}
        r={isLast ? 11 : 8}
        fill={isLast ? '#2563eb' : '#1e293b'}
        stroke="#f8fafc"
        strokeWidth={2}
        fillOpacity={0.9}
      />
      {isLast && (
        // A small "×" glyph on the last waypoint signals the pop affordance
        // (non-color encoding for the interactive marker).
        <text
          x={x}
          y={y + 4}
          textAnchor="middle"
          fontSize={12}
          fontWeight={700}
          fill="#f8fafc"
          pointerEvents="none"
        >
          {'×'}
        </text>
      )}
    </g>
  );
}

function PivotIndicator({
  leg,
}: {
  readonly leg: ILocomotionLeg;
}): React.ReactElement | null {
  const facingChange = leg.to.facingChange;
  if (!facingChange || facingChange <= 0) return null;
  const { x, y } = hexToPixel(leg.to.hex);
  return (
    <g
      data-testid={`pivot-indicator-${leg.to.hex.q}-${leg.to.hex.r}`}
      data-pivot-facing-change={facingChange}
      pointerEvents="none"
    >
      {/* Rotation glyph + facing-change MP, offset above the waypoint marker. */}
      <text
        x={x}
        y={y - 16}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#0f172a"
        stroke="#f8fafc"
        strokeWidth={0.6}
        paintOrder="stroke"
      >
        {`↻ ${facingChange} MP`}
      </text>
    </g>
  );
}

function LegCostChip({
  leg,
}: {
  readonly leg: ILocomotionLeg;
}): React.ReactElement {
  const { x, y } = legMidpointPixel(leg);
  const label = `${leg.mpCost} MP`;
  const width = Math.max(30, label.length * 8);
  return (
    <g
      data-testid={`leg-cost-chip-${leg.to.hex.q}-${leg.to.hex.r}`}
      data-leg-mp={leg.mpCost}
      pointerEvents="none"
    >
      <rect
        x={x - width / 2}
        y={y - 10}
        width={width}
        height={18}
        rx={9}
        fill="#0f172a"
        fillOpacity={0.85}
      />
      <text
        x={x}
        y={y + 3}
        textAnchor="middle"
        fontSize={11}
        fontWeight={600}
        fill="#f8fafc"
      >
        {label}
      </text>
    </g>
  );
}

export function WaypointLayer({
  legs,
  zoom,
  onPopLastWaypoint,
  testId = 'waypoint-layer',
}: WaypointLayerProps): React.ReactElement | null {
  if (legs.length === 0) return null;
  const showCostChips = zoom >= COST_CHIP_MIN_ZOOM;
  const lastIndex = legs.length - 1;

  return (
    <g data-testid={testId} data-waypoint-count={legs.length}>
      {/* Anchored leg polylines (composed path spine). */}
      {legs.map((leg, index) => {
        const from = hexToPixel(leg.from.hex);
        const to = hexToPixel(leg.to.hex);
        return (
          <line
            key={`waypoint-leg-${index}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#2563eb"
            strokeWidth={3}
            strokeOpacity={0.7}
            strokeLinecap="round"
            pointerEvents="none"
          />
        );
      })}
      {showCostChips &&
        legs.map((leg, index) => (
          <LegCostChip key={`leg-chip-${index}`} leg={leg} />
        ))}
      {legs.map((leg, index) => (
        <PivotIndicator key={`leg-pivot-${index}`} leg={leg} />
      ))}
      {legs.map((leg, index) => (
        <WaypointMarker
          key={`leg-marker-${index}`}
          leg={leg}
          isLast={index === lastIndex}
          onPopLastWaypoint={onPopLastWaypoint}
        />
      ))}
    </g>
  );
}

export default WaypointLayer;
