/**
 * PhysicalAttackIntentArrow
 *
 * Per `add-physical-attack-phase-ui` task 7.1-7.5 + `tactical-map-interface`
 * delta ADDED requirement "Physical Attack Intent Arrows": renders a
 * directional arrow from the attacker hex center to the target hex
 * center when a physical-attack row is hovered OR declared.
 *
 * Variants (task 9.1 — colorblind-safe by shape + dash pattern):
 *  - `charge`: solid arrow, side-color stroke, chunky arrowhead.
 *  - `dfa`: dashed arc (lift + crash) — visually distinct from charge
 *    under simulated deuteranopia because the arc shape and dash
 *    pattern carry information, not just hue.
 *  - `push`: ghost-hex outline on the target's displaced destination;
 *    invalid destinations render in red with an "X" overlay.
 *
 * The component is pure SVG and positioned inside the HexMapDisplay's
 * `<svg>` root via `<g>` layering — the parent supplies the attacker
 * and target hex coordinates and the variant to render.
 *
 * @spec openspec/changes/add-physical-attack-phase-ui/specs/tactical-map-interface/spec.md
 */

import React from 'react';

import type { IHexCoordinate } from '@/types/gameplay';

import { hexToPixel } from '@/components/gameplay/HexMapDisplay/renderHelpers';
import { GameSide } from '@/types/gameplay';

export type PhysicalAttackIntentVariant = 'charge' | 'dfa' | 'push';

export interface PhysicalAttackIntentArrowProps {
  /** Attacker hex — arrow origin. */
  from: IHexCoordinate;
  /** Target hex — arrow destination (or displacement source for push). */
  to: IHexCoordinate;
  /** Variant — drives styling. */
  variant: PhysicalAttackIntentVariant;
  /** Attacker side — used by the `charge`/`dfa` variants to stroke
   *  the arrow in the attacker's side color. */
  side?: GameSide;
  /** Push-only: destination hex the target is displaced to. */
  pushDestination?: IHexCoordinate;
  /** Push-only: when false, destination renders red with "X". */
  pushDestinationValid?: boolean;
  /** Optional testid passthrough. */
  testId?: string;
}

/**
 * Side → stroke color mapping. Keeps the component self-contained so
 * callers don't have to thread theme tokens. Matches the side-color
 * palette already used by `UnitToken` (blue for Player, red for
 * Opponent).
 */
function sideStroke(side: GameSide | undefined): string {
  if (side === GameSide.Opponent) return '#dc2626';
  return '#2563eb';
}

/**
 * Per `add-physical-attack-phase-ui` task 7.1-7.3: arrow geometry
 * utility. Returns start/end pixel coordinates + a trimmed polyline
 * pulled slightly away from each hex center so the arrowhead doesn't
 * clip the unit token visual.
 */
function arrowGeometry(
  from: IHexCoordinate,
  to: IHexCoordinate,
): {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
} {
  const { x: sx, y: sy } = hexToPixel(from);
  const { x: tx, y: ty } = hexToPixel(to);
  const dx = tx - sx;
  const dy = ty - sy;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  // Pull start / end 18px off the hex centers so the arrowhead
  // doesn't overlap the unit tokens.
  const nx = dx / length;
  const ny = dy / length;
  const pad = 18;
  return {
    startX: sx + nx * pad,
    startY: sy + ny * pad,
    endX: tx - nx * pad,
    endY: ty - ny * pad,
  };
}

/**
 * Render an SVG arrowhead marker using a unique id keyed by variant +
 * side so multiple arrows on the map don't collide. Kept inline (not
 * pulled into a global <defs>) so the overlay is drop-in — mount it
 * anywhere in the HexMapDisplay SVG tree without needing to patch the
 * parent's defs.
 */
function ArrowheadMarker({
  id,
  color,
}: {
  id: string;
  color: string;
}): React.ReactElement {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 12 12"
        refX={10}
        refY={6}
        markerWidth={8}
        markerHeight={8}
        orient="auto-start-reverse"
      >
        <path d="M0,0 L12,6 L0,12 L3,6 Z" fill={color} />
      </marker>
    </defs>
  );
}

/**
 * Per task 7.2: charge intent — solid arrow from attacker to target,
 * stroked in the attacker's side color, with a thick chunky
 * arrowhead.
 */
function ChargeArrow(
  props: PhysicalAttackIntentArrowProps,
): React.ReactElement {
  const { from, to, side, testId } = props;
  const { startX, startY, endX, endY } = arrowGeometry(from, to);
  const color = sideStroke(side);
  const markerId = `charge-arrow-${side ?? 'player'}`;
  return (
    <g pointerEvents="none" data-testid={testId ?? 'intent-arrow-charge'}>
      <ArrowheadMarker id={markerId} color={color} />
      <line
        x1={startX}
        y1={startY}
        x2={endX}
        y2={endY}
        stroke={color}
        strokeWidth={3}
        strokeOpacity={0.85}
        markerEnd={`url(#${markerId})`}
      />
    </g>
  );
}

/**
 * Per task 7.3 + task 9.1: DFA intent — dashed arc (mid-point lifted
 * so the path reads as "up then down") + chunky arrowhead. Dash
 * pattern is intentionally long-short (8-4) to be distinguishable
 * from any future dashed style we add later.
 */
function DFAArrow(props: PhysicalAttackIntentArrowProps): React.ReactElement {
  const { from, to, side, testId } = props;
  const { startX, startY, endX, endY } = arrowGeometry(from, to);
  const color = sideStroke(side);
  const markerId = `dfa-arrow-${side ?? 'player'}`;
  // Arc control point: halfway between start and end, lifted 40px up
  // so the path reads as an arc. Lift is always "up" on the SVG
  // coordinate space (negative y) — visually clear regardless of the
  // attack direction.
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2 - 40;
  const path = `M ${startX} ${startY} Q ${midX} ${midY} ${endX} ${endY}`;
  return (
    <g pointerEvents="none" data-testid={testId ?? 'intent-arrow-dfa'}>
      <ArrowheadMarker id={markerId} color={color} />
      <path
        d={path}
        stroke={color}
        strokeWidth={3}
        strokeOpacity={0.85}
        strokeDasharray="8,4"
        fill="none"
        markerEnd={`url(#${markerId})`}
      />
    </g>
  );
}

/**
 * Per task 7.4 + spec scenario "Push ghost hex shows displacement":
 * push intent — ghost outline on the displaced destination hex. When
 * `pushDestinationValid === false`, renders red with an "X" overlay
 * so the player sees the attempted push would fail (off-map,
 * blocked).
 */
function PushGhost(props: PhysicalAttackIntentArrowProps): React.ReactElement {
  const { pushDestination, pushDestinationValid = true, testId } = props;
  if (!pushDestination)
    return <g data-testid={testId ?? 'intent-arrow-push'} />;
  const { x, y } = hexToPixel(pushDestination);
  // Flat-top hex vertex layout matching HexCell — six points around
  // the center at 30° increments starting at the right edge.
  const hexSize = 26;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = x + hexSize * Math.cos(angle);
    const py = y + hexSize * Math.sin(angle);
    points.push(`${px},${py}`);
  }
  const stroke = pushDestinationValid ? '#6366f1' : '#dc2626';
  return (
    <g pointerEvents="none" data-testid={testId ?? 'intent-arrow-push'}>
      <polygon
        points={points.join(' ')}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        strokeDasharray="4,3"
        strokeOpacity={0.9}
      />
      {!pushDestinationValid && (
        <g data-testid="intent-arrow-push-invalid">
          <line
            x1={x - 10}
            y1={y - 10}
            x2={x + 10}
            y2={y + 10}
            stroke="#dc2626"
            strokeWidth={3}
          />
          <line
            x1={x - 10}
            y1={y + 10}
            x2={x + 10}
            y2={y - 10}
            stroke="#dc2626"
            strokeWidth={3}
          />
        </g>
      )}
    </g>
  );
}

/**
 * Per tasks 7.1-7.5: the intent arrow dispatcher. Parents mount this
 * when a physical-attack row is hovered OR declared and unmount on
 * mouse-out / deselect.
 */
export function PhysicalAttackIntentArrow(
  props: PhysicalAttackIntentArrowProps,
): React.ReactElement {
  switch (props.variant) {
    case 'charge':
      return <ChargeArrow {...props} />;
    case 'dfa':
      return <DFAArrow {...props} />;
    case 'push':
      return <PushGhost {...props} />;
  }
}

export default PhysicalAttackIntentArrow;
